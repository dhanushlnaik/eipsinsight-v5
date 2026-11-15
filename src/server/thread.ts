import { unstable_cache } from "next/cache";
import { query } from "@/lib/db";

export type ThreadKind = "pr" | "issue";
export type ThreadState = "Open" | "Merged" | "Closed";

export interface LinkedProposal {
  kind: "eip" | "erc" | "rip";
  number: number;
  title: string | null;
  status: string | null;
}

export interface Review {
  reviewer: string;
  state: string;
  at: string;
}

export interface Thread {
  kind: ThreadKind;
  repoShort: string;
  repo: string;
  number: number;
  title: string;
  author: string | null;
  state: ThreadState;
  created_at: string | null;
  updated_at: string | null;
  closed_at: string | null;
  merged_at: string | null;
  labels: string[];
  comments: number;
  commits: number | null;
  files: number | null;
  reviewCount: number | null;
  body: string | null;
  proposals: LinkedProposal[];
  reviews: Review[];
  /** Editorial queue state for an open PR, e.g. who it is waiting on. */
  waiting: { state: string; since: string | null; reason: string | null; failingChecks: string[] } | null;
  githubUrl: string;
}

const REPOS = ["eips", "ercs", "rips"];
const str = (v: unknown) => (v == null ? null : String(v));

/** A sub-query that fails (a table the scheduler has not created yet) must not take the page down. */
async function soft<T>(run: () => Promise<T[]>): Promise<T[]> {
  try {
    return await run();
  } catch {
    return [];
  }
}

const KIND_SQL = `CASE lower(split_part(r2.name, '/', 2)) WHEN 'ercs' THEN 'erc' WHEN 'rips' THEN 'rip' ELSE 'eip' END`;

async function fetchPull(repoShort: string, number: number): Promise<Thread | null> {
  const rows = await query<{
    repository_id: number; repo: string; title: string | null; author: string | null; state: string | null;
    merged_at: string | null; closed_at: string | null; updated_at: string | null; created_at: string | null;
    labels: string[] | null; num_comments: number | null; num_commits: number | null; num_files: number | null;
    num_reviews: number | null; body: string | null;
  }>(
    `SELECT pr.repository_id, r.name AS repo, pr.title, pr.author, pr.state, pr.merged_at, pr.closed_at,
            pr.updated_at, pr.created_at, pr.labels, pr.num_comments, pr.num_commits, pr.num_files,
            pr.num_reviews, left(pr.body, 20000) AS body
     FROM pull_requests pr
     JOIN repositories r ON r.id = pr.repository_id
     WHERE pr.pr_number = $1 AND lower(split_part(r.name, '/', 2)) = $2
     LIMIT 1`,
    [number, repoShort],
  );
  const row = rows[0];
  if (!row) return null;

  const [proposals, reviews, gov] = await Promise.all([
    soft(() =>
      query<LinkedProposal>(
        `SELECT pe.eip_number AS number, e.title, s.status, ${KIND_SQL} AS kind
         FROM pull_request_eips pe
         LEFT JOIN eips e ON e.eip_number = pe.eip_number
         LEFT JOIN eip_snapshots s ON s.eip_id = e.id
         LEFT JOIN repositories r2 ON r2.id = s.repository_id
         WHERE pe.pr_number = $1 AND pe.repository_id = $2
         ORDER BY pe.eip_number
         LIMIT 40`,
        [number, row.repository_id],
      ),
    ),
    soft(() =>
      query<{ reviewer: string; review_state: string; submitted_at: string }>(
        `SELECT DISTINCT ON (reviewer) reviewer, review_state, submitted_at
         FROM pr_reviews
         WHERE pr_number = $1 AND repository_id = $2
         ORDER BY reviewer, submitted_at DESC`,
        [number, row.repository_id],
      ),
    ),
    soft(() =>
      query<{ current_state: string; waiting_since: string | null; reason: string | null; failing_checks?: string[] | null; has_failing_required_checks?: boolean | null }>(
        `SELECT * FROM pr_governance_state
         WHERE pr_number = $1 AND repository_id = $2 LIMIT 1`,
        [number, row.repository_id],
      ),
    ),
  ]);

  const state: ThreadState = row.merged_at ? "Merged" : (row.state ?? "").toLowerCase() === "open" ? "Open" : "Closed";

  return {
    kind: "pr",
    repoShort,
    repo: row.repo,
    number,
    title: row.title?.trim() || `Pull request #${number}`,
    author: row.author,
    state,
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    closed_at: str(row.closed_at),
    merged_at: str(row.merged_at),
    labels: row.labels ?? [],
    comments: row.num_comments ?? 0,
    commits: row.num_commits,
    files: row.num_files,
    reviewCount: row.num_reviews,
    body: row.body?.trim() || null,
    proposals,
    reviews: reviews
      .map((r) => ({ reviewer: r.reviewer, state: r.review_state, at: String(r.submitted_at) }))
      .sort((a, b) => b.at.localeCompare(a.at)),
    waiting: state === "Open" && gov[0] ? {
            state: gov[0].current_state,
            since: str(gov[0].waiting_since),
            reason: gov[0].reason,
            failingChecks: gov[0].has_failing_required_checks ? gov[0].failing_checks ?? [] : [],
          } : null,
    githubUrl: `https://github.com/${row.repo}/pull/${number}`,
  };
}

async function fetchIssue(repoShort: string, number: number): Promise<Thread | null> {
  const rows = await query<{
    repository_id: number; repo: string; title: string | null; author: string | null; state: string | null;
    closed_at: string | null; updated_at: string | null; created_at: string | null;
    labels: string[] | null; num_comments: number | null; body: string | null;
  }>(
    `SELECT i.repository_id, r.name AS repo, i.title, i.author, i.state, i.closed_at, i.updated_at,
            i.created_at, i.labels, i.num_comments, left(i.body, 20000) AS body
     FROM issues i
     JOIN repositories r ON r.id = i.repository_id
     WHERE i.issue_number = $1 AND lower(split_part(r.name, '/', 2)) = $2
     LIMIT 1`,
    [number, repoShort],
  );
  const row = rows[0];
  if (!row) return null;

  const proposals = await soft(() =>
    query<LinkedProposal>(
      `SELECT ie.eip_number AS number, e.title, s.status, ${KIND_SQL} AS kind
       FROM issue_eips ie
       LEFT JOIN eips e ON e.eip_number = ie.eip_number
       LEFT JOIN eip_snapshots s ON s.eip_id = e.id
       LEFT JOIN repositories r2 ON r2.id = s.repository_id
       WHERE ie.issue_number = $1 AND ie.repository_id = $2
       ORDER BY ie.eip_number
       LIMIT 40`,
      [number, row.repository_id],
    ),
  );

  return {
    kind: "issue",
    repoShort,
    repo: row.repo,
    number,
    title: row.title?.trim() || `Issue #${number}`,
    author: row.author,
    state: (row.state ?? "").toLowerCase() === "open" ? "Open" : "Closed",
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    closed_at: str(row.closed_at),
    merged_at: null,
    labels: row.labels ?? [],
    comments: row.num_comments ?? 0,
    commits: null,
    files: null,
    reviewCount: null,
    body: row.body?.trim() || null,
    proposals,
    reviews: [],
    waiting: null,
    githubUrl: `https://github.com/${row.repo}/issues/${number}`,
  };
}

/** One pull request or issue with what it touches. Read-only, cached for five minutes. */
export function getThread(kind: ThreadKind, repoShort: string, number: number): Promise<Thread | null> {
  const repo = repoShort.toLowerCase();
  if (!REPOS.includes(repo) || !Number.isInteger(number) || number <= 0) return Promise.resolve(null);
  return unstable_cache(() => (kind === "pr" ? fetchPull(repo, number) : fetchIssue(repo, number)), ["v5-thread", kind, repo, String(number)], {
    revalidate: 300,
  })();
}
