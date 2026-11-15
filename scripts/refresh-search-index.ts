/**
 * Refresh the v5 search index from scheduler-owned tables.
 * Run: `bun run search:refresh`
 *
 * Writes ONLY to search_entities. Pure SELECT against every other table.
 * In production the app runs this itself on a schedule when
 * SEARCH_REFRESH_MINUTES is set (see src/instrumentation.ts), so this
 * script is for the first build and for refreshing by hand.
 */
import { Pool } from "pg";
import { refreshSearchIndex } from "../src/server/refresh-search";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required (check .env)");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10_000,
  ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

try {
  const report = await refreshSearchIndex(pool);
  console.log(`✓ search index refreshed in ${report.ms}ms`);
  for (const [type, n] of Object.entries(report.counts)) console.log(`  ${type.padEnd(12)} ${n}`);
} catch (err) {
  console.error("✗ refresh failed:", (err as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
