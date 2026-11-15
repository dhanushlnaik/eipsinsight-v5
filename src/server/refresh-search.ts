import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";

export interface RefreshReport {
  ms: number;
  counts: Record<string, number>;
}

/**
 * Rebuild the search index from the scheduler's tables.
 * Writes ONLY to search_entities; everything else is read with plain SELECTs.
 * Used by `bun run search:refresh` and by the in-app schedule (src/instrumentation.ts).
 */
export async function refreshSearchIndex(pool: Pool, root = process.cwd()): Promise<RefreshReport> {
  const sql = readFileSync(join(root, "prisma", "sql", "002_refresh_search.sql"), "utf8");
  const started = Date.now();
  await pool.query(sql);
  const { rows } = await pool.query<{ entity_type: string; n: number }>(
    "SELECT entity_type, count(*)::int AS n FROM search_entities GROUP BY entity_type ORDER BY entity_type",
  );
  return { ms: Date.now() - started, counts: Object.fromEntries(rows.map((r) => [r.entity_type, r.n])) };
}
