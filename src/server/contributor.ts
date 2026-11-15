import { query } from "@/lib/db";

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
  const [agg, roles, prCount, authoredEips, authoredRips, recent] = await Promise.all([
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
       LIMIT 30`,
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
  ]);

  const s = agg[0];
  const opened = prCount[0]?.opened ?? 0;
  const merged = prCount[0]?.merged ?? 0;
  const authored = [...authoredEips, ...authoredRips.filter((r) => !authoredEips.some((a) => a.kind === "rip" && a.number === r.number))];

  // No scores row AND no activity AND nothing authored or opened: not a real profile.
  if (!s?.total_score && roles.length === 0 && authored.length === 0 && opened === 0) return null;

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
    roles,
    authored,
    recent: recent.map((a) => ({ ...a, occurred_at: String(a.occurred_at) })),
  };
}
