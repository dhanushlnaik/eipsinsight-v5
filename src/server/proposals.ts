import { cachedOr } from "@/lib/cache";
import { query } from "@/lib/db";

export interface ProposalLite {
  number: number;
  kind: "eip" | "erc" | "rip";
  title: string;
  status: string | null;
  type: string | null;
  category: string | null;
  created_at: string | null;
}

export interface TopContributor {
  actor: string;
  score: number;
  prs: number;
  reviews: number;
  comments: number;
  last_activity: string | null;
}

/** Every proposal, one row each (latest snapshot wins), ordered by number.
 *  Read-only. Small enough to cache whole and filter in memory. */
export const getAllProposals = cachedOr<ProposalLite[]>(
  async () => {
      const rows = await query<ProposalLite>(
        `SELECT DISTINCT ON (e.id)
           e.eip_number AS number,
           coalesce(e.title, 'Untitled') AS title,
           s.status, s.type, s.category, e.created_at,
           CASE lower(split_part(r.name, '/', 2))
             WHEN 'ercs' THEN 'erc' WHEN 'rips' THEN 'rip' ELSE 'eip' END AS kind
         FROM eips e
         JOIN eip_snapshots s ON s.eip_id = e.id
         JOIN repositories r ON r.id = s.repository_id
         ORDER BY e.id, s.updated_at DESC NULLS LAST`,
      );
      // RIPs live in their own table. If it is missing or empty, the rest still stands.
      let rips: ProposalLite[] = [];
      try {
        rips = await query<ProposalLite>(
          `SELECT rip_number AS number, coalesce(title, 'Untitled') AS title, status,
                  NULL::text AS type, 'RIP'::text AS category, created_at, 'rip'::text AS kind
           FROM rips WHERE title IS NOT NULL AND title <> ''`,
        );
      } catch {
        // no rips table
      }
      const seen = new Set(rows.map((r) => `${r.kind}-${r.number}`));
      return [...rows, ...rips.filter((r) => !seen.has(`rip-${r.number}`))]
        .map((r) => ({ ...r, created_at: r.created_at ? String(r.created_at) : null }))
        .sort((a, b) => a.number - b.number);
  },
  ["v5-all-proposals"],
  [],
);

/** Contributors ranked by total score. Automation accounts are left out. */
export const getTopContributors = cachedOr<TopContributor[]>(
  async () => {
      const rows = await query<TopContributor>(
        `SELECT actor,
           coalesce(sum(total_score), 0)::int   AS score,
           coalesce(sum(prs_created), 0)::int   AS prs,
           coalesce(sum(reviews_count), 0)::int AS reviews,
           coalesce(sum(comments_count), 0)::int AS comments,
           max(last_activity) AS last_activity
         FROM contributor_scores
         WHERE actor IS NOT NULL AND actor <> ''
           AND actor NOT ILIKE '%bot%' AND actor NOT ILIKE '%[bot]'
         GROUP BY actor
         ORDER BY score DESC
         LIMIT 60`,
      );
      return rows.map((r) => ({ ...r, last_activity: r.last_activity ? String(r.last_activity) : null }));
  },
  ["v5-top-contributors"],
  [],
);
