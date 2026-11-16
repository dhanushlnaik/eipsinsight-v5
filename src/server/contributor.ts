import { query } from "@/lib/db";
import { isCanonicalEditor, isCanonicalReviewer } from "@/data/eip-editors";

export interface AuthoredProposal {
  kind: "eip" | "erc" | "rip";
  number: number;
  title: string;
}

export interface Activity {
  pr_number: number | null;
  role: string | null;
  action_type: string | null;
  occurred_at: string;
  repo: string | null;
}

export interface ProfilePR {
  repoShort: string;
  number: number;
  title: string;
  state: "Open" | "Merged" | "Closed";
  reviews: number;
  comments: number;
  updated: string | null;
}

export interface ProfileReview {
  repoShort: string;
  number: number;
  title: string | null;
  state: string;
  at: string;
}

export interface RepoStat {
  repo: string;
  score: number;
  reviews: number;
  comments: number;
  commits: number;
}

export interface Contributor {
  actor: string;
  totalScore: number;
  commits: number;
  prsCreated: number;
  prsMerged: number;
  reviews: number;
  comments: number;
  firstActivity: string | null;
  lastActivity: string | null;
  roles: { role: string; n: number }[];
  authored: AuthoredProposal[];
  pullRequests: ProfilePR[];
  reviewsList: ProfileReview[];
  repos: RepoStat[];
  recent: Activity[];
}

const soft = async <T,>(run: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await run();
  } catch {
    return [];
  }
};

export async function getContributor(actor: string): Promise<Contributor | null> {
  // Match the handle exactly: "@sam" must not claim proposals written by "@samwilsn".
  const safeHandle = /^[A-Za-z0-9-]+$/.test(actor);
  const authorMatch = (col: string) => (safeHandle ? `${col} ~* ('@' || $1 || '([^A-Za-z0-9-]|$)')` : `${col} ILIKE '%@' || $1 || '%'`);

  // Independent reads, so they run together rather than one round trip after another.
  const [agg, roles, prCount, authoredEips, authoredRips, recent, prs, reviewRows, repoRows] = await Promise.all([
    query<{
      total_score: string | null;
      commits_count: string | null;
      prs_created: string | null;
      prs_merged: string | null;
      reviews_count: string | null;
      comments_count: string | null;
      first_activity: string | null;
      last_activity: string | null;
    }>(
      `SELECT
         sum(total_score)::int   AS total_score,
         sum(commits_count)::int AS commits_count,
         sum(prs_created)::int   AS prs_created,
         sum(prs_merged)::int    AS prs_merged,
         sum(reviews_count)::int AS reviews_count,
         sum(comments_count)::int AS comments_count,
         min(first_activity)     AS first_activity,
         max(last_activity)      AS last_activity
       FROM contributor_scores WHERE actor = $1`,
      [actor],
    ),
    query<{ role: string; n: number }>(
      `SELECT role, count(*)::int n FROM contributor_activity
       WHERE actor = $1 AND role IS NOT NULL GROUP BY role ORDER BY n DESC`,
      [actor],
    ),
    // contributor_scores leaves its PR counters at zero, so count them from the PRs themselves.
    soft(() =>
      query<{ opened: number; merged: number }>(
        `SELECT count(*)::int AS opened, count(merged_at)::int AS merged
         FROM pull_requests WHERE lower(author) = lower($1)`,
        [actor],
      ),
    ),
    query<AuthoredProposal>(
      `SELECT DISTINCT ON (e.id) e.eip_number AS number, e.title,
         CASE lower(split_part(r.name, '/', 2))
           WHEN 'ercs' THEN 'erc' WHEN 'rips' THEN 'rip' ELSE 'eip' END AS kind
       FROM eips e
       JOIN eip_snapshots s ON s.eip_id = e.id
       JOIN repositories r ON r.id = s.repository_id
       WHERE ${authorMatch("e.author")}
       ORDER BY e.id DESC
       LIMIT 60`,
      [actor],
    ),
    soft(() =>
      query<AuthoredProposal>(
        `SELECT rip_number AS number, title, 'rip'::text AS kind
         FROM rips WHERE title IS NOT NULL AND title <> '' AND ${authorMatch("author")}
         ORDER BY rip_number DESC LIMIT 10`,
        [actor],
      ),
    ),
    query<Activity>(
      `SELECT ca.pr_number, ca.role, ca.action_type, ca.occurred_at, r.name AS repo
       FROM contributor_activity ca
       LEFT JOIN repositories r ON r.id = ca.repository_id
       WHERE ca.actor = $1
       ORDER BY ca.occurred_at DESC
       LIMIT 12`,
      [actor],
    ),
    // Pull requests this person opened, newest first.
    soft(() =>
      query<{ pr_number: number; repo: string; title: string | null; state: string | null; merged_at: string | null; num_reviews: number | null; num_comments: number | null; updated_at: string | null }>(
        `SELECT pr.pr_number, r.name AS repo, pr.title, pr.state, pr.merged_at, pr.num_reviews, pr.num_comments, pr.updated_at
         FROM pull_requests pr JOIN repositories r ON r.id = pr.repository_id
         WHERE lower(pr.author) = lower($1)
         ORDER BY pr.updated_at DESC NULLS LAST LIMIT 250`,
        [actor],
      ),
    ),
    // Reviews this person submitted (latest per PR), newest first.
    soft(() =>
      query<{ pr_number: number; repo: string; title: string | null; review_state: string; submitted_at: string }>(
        `SELECT DISTINCT ON (rv.repository_id, rv.pr_number) rv.pr_number, r.name AS repo, pr.title, rv.review_state, rv.submitted_at
         FROM pr_reviews rv
         JOIN repositories r ON r.id = rv.repository_id
         LEFT JOIN pull_requests pr ON pr.pr_number = rv.pr_number AND pr.repository_id = rv.repository_id
         WHERE lower(rv.reviewer) = lower($1)
         ORDER BY rv.repository_id, rv.pr_number, rv.submitted_at DESC`,
        [actor],
      ),
    ),
    // Score split by repository.
    soft(() =>
      query<{ repo: string | null; total_score: number | null; reviews_count: number | null; comments_count: number | null; commits_count: number | null }>(
        `SELECT r.name AS repo, cs.total_score, cs.reviews_count, cs.comments_count, cs.commits_count
         FROM contributor_scores cs LEFT JOIN repositories r ON r.id = cs.repository_id
         WHERE cs.actor = $1 ORDER BY cs.total_score DESC NULLS LAST`,
        [actor],
      ),
    ),
  ]);

  const s = agg[0];
  const opened = prCount[0]?.opened ?? 0;
  const merged = prCount[0]?.merged ?? 0;
  const authored = [...authoredEips, ...authoredRips.filter((r) => !authoredEips.some((a) => a.kind === "rip" && a.number === r.number))];

  const repoShort = (name: string) => (name.split("/").pop() ?? "eips").toLowerCase();
  const pullRequests: ProfilePR[] = prs.map((r) => ({
    repoShort: repoShort(r.repo),
    number: r.pr_number,
    title: r.title?.trim() || `Pull request #${r.pr_number}`,
    state: r.merged_at ? "Merged" : (r.state ?? "").toLowerCase() === "open" ? "Open" : "Closed",
    reviews: r.num_reviews ?? 0,
    comments: r.num_comments ?? 0,
    updated: r.updated_at ? String(r.updated_at) : null,
  }));
  const reviewsList: ProfileReview[] = reviewRows
    .map((r) => ({ repoShort: repoShort(r.repo), number: r.pr_number, title: r.title?.trim() || null, state: r.review_state, at: String(r.submitted_at) }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 250);
  const repos: RepoStat[] = repoRows
    .filter((r) => r.repo)
    .map((r) => ({ repo: r.repo!, score: Number(r.total_score ?? 0), reviews: Number(r.reviews_count ?? 0), comments: Number(r.comments_count ?? 0), commits: Number(r.commits_count ?? 0) }));

  // No scores row AND no activity AND nothing authored or opened: not a real profile.
  if (!s?.total_score && roles.length === 0 && authored.length === 0 && opened === 0) return null;

  // The scheduler tags per-activity roles heuristically and over-reports EDITOR
  // (and REVIEWER) for very active triagers. Only surface those standing badges
  // when the actor is on the governance-maintained roster.
  const visibleRoles = roles.filter((r) => {
    if (r.role === "EDITOR") return isCanonicalEditor(actor);
    if (r.role === "REVIEWER") return isCanonicalReviewer(actor);
    return true;
  });

  return {
    actor,
    totalScore: Number(s?.total_score ?? 0),
    commits: Number(s?.commits_count ?? 0),
    prsCreated: Math.max(opened, Number(s?.prs_created ?? 0)),
    prsMerged: Math.max(merged, Number(s?.prs_merged ?? 0)),
    reviews: Number(s?.reviews_count ?? 0),
    comments: Number(s?.comments_count ?? 0),
    firstActivity: s?.first_activity ? String(s.first_activity) : null,
    lastActivity: s?.last_activity ? String(s.last_activity) : null,
    roles: visibleRoles,
    authored,
    pullRequests,
    reviewsList,
    repos,
    recent: recent.map((a) => ({ ...a, occurred_at: String(a.occurred_at) })),
  };
}
