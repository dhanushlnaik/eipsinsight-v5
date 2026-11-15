import { query, IndexMissingError } from "@/lib/db";

export type EntityType = "eip" | "erc" | "rip" | "pr" | "issue" | "contributor" | "upgrade" | "blog";

export type { GroupKey } from "@/lib/search-groups";
import type { GroupKey } from "@/lib/search-groups";

export interface SearchHit {
  entity_type: EntityType;
  entity_id: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  url: string;
  group: GroupKey;
  rank: number;
}

export interface SearchResult {
  hits: SearchHit[];
  /** How many rows matched in each group, including the ones not returned. */
  totals: Partial<Record<GroupKey, number>>;
  indexMissing: boolean;
  took_ms: number;
}

const GROUP_SQL = `CASE
  WHEN entity_type IN ('eip','erc','rip') THEN 'proposal'
  ELSE entity_type END`;

// Proposals first, then the things people look up by name, then the long tail.
const GROUP_ORDER_SQL = `CASE grp
  WHEN 'proposal' THEN 0 WHEN 'upgrade' THEN 1 WHEN 'contributor' THEN 2
  WHEN 'pr' THEN 3 WHEN 'issue' THEN 4 ELSE 5 END`;

/** LIKE treats % and _ as wildcards; a search for "100%" should not match everything. */
function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * The universal "find anything" primitive: one query over `search_entities`.
 *
 * Matching: full-text first, with a substring and a trigram match on the title as
 * the net for partial words and typos.
 *
 * Ranking, strongest signal first: the query IS this record's number, the title is
 * exactly the query, the title starts with it, the title contains it, then full-text
 * rank and trigram similarity as tie-breakers.
 *
 * Order: groups keep a fixed order (proposals, upgrades, people, pull requests,
 * issues) unless one holds an exact hit, in which case it leads. Searching a
 * handle shows the person before the proposals that mention them.
 *
 * Shape: with no type filter, each group returns a short preview so one busy group
 * (pull requests) can never crowd out the rest. With a filter, that group gets the
 * whole page.
 */
export async function search(q: string, opts: { types?: EntityType[]; limit?: number } = {}): Promise<SearchResult> {
  const started = Date.now();
  // "@vbuterin" and "#9145" are how people write handles and PR numbers; the sigil is not part of the name.
  const term = q.trim().replace(/^[@#]+/, "").trim();
  if (!term) return { hits: [], totals: {}, indexMissing: false, took_ms: 0 };

  const typeFilter = opts.types?.length ? opts.types : null;
  const pageSize = Math.min(opts.limit ?? 40, 60);
  const digits = term.match(/^(?:eip|erc|rip|pr|issue)?[\s#-]*(\d{1,6})$/i)?.[1] ?? null;
  const like = likeEscape(term);

  try {
    const rows = await query<SearchHit & { group_total: number }>(
      `
      WITH matched AS (
        SELECT entity_type, entity_id, title, subtitle, status, url, updated_at,
               ${GROUP_SQL} AS grp,
               (
                 CASE WHEN $4::text IS NOT NULL AND (entity_id = $4 OR entity_id LIKE '%-' || $4) THEN 4 ELSE 0 END
                 + CASE
                     WHEN lower(title) = lower($1) THEN 2
                     WHEN title ILIKE $5 || '%' THEN 0.9
                     WHEN title ILIKE '%' || $5 || '%' THEN 0.5
                     ELSE 0 END
                 + ts_rank(fts, tsq)
                 + similarity(title, $1) * 0.6
               ) AS rank
        FROM search_entities, websearch_to_tsquery('english', $1) AS tsq
        WHERE ($3::text[] IS NULL OR entity_type = ANY($3))
          AND (
            fts @@ tsq
            OR title ILIKE '%' || $5 || '%'
            OR title % $1
            OR ($4::text IS NOT NULL AND (entity_id = $4 OR entity_id LIKE '%-' || $4))
          )
      ),
      ranked AS (
        SELECT *,
               row_number() OVER (PARTITION BY grp ORDER BY rank DESC, updated_at DESC) AS rn,
               count(*) OVER (PARTITION BY grp)::int AS group_total,
               max(rank) OVER (PARTITION BY grp) AS grp_best
        FROM matched
      )
      SELECT entity_type, entity_id, title, subtitle, status, url, grp AS "group", rank, group_total
      FROM ranked
      WHERE rn <= CASE
        WHEN $3::text[] IS NOT NULL THEN $2
        WHEN grp = 'proposal' THEN 7 WHEN grp = 'pr' THEN 5
        WHEN grp = 'contributor' THEN 4 WHEN grp = 'issue' THEN 4 ELSE 3 END
      -- A group holding an exact hit (the name or number that was typed) leads; otherwise the fixed order.
      ORDER BY (grp_best >= 2) DESC, ${GROUP_ORDER_SQL}, rank DESC, updated_at DESC
      `,
      [term, pageSize, typeFilter, digits, like],
    );

    const totals: Partial<Record<GroupKey, number>> = {};
    const hits = rows.map(({ group_total, ...h }) => {
      totals[h.group] = group_total;
      return { ...h, rank: Number(h.rank) };
    });
    return { hits, totals, indexMissing: false, took_ms: Date.now() - started };
  } catch (err) {
    if (err instanceof IndexMissingError) {
      return { hits: [], totals: {}, indexMissing: true, took_ms: Date.now() - started };
    }
    throw err;
  }
}
