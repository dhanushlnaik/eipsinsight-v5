/**
 * Create the v5-owned search index (table + pg_trgm + indexes).
 * Run once: `bun run db:init`
 *
 * SAFE on the shared DB — it only CREATEs a new table/extension/indexes,
 * never touches a scheduler-owned table. Reads DATABASE_URL from .env.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required (check .env)");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

const sql = readFileSync(join(process.cwd(), "prisma", "sql", "001_search_entities.sql"), "utf8");

try {
  await pool.query(sql);
  const reg = await pool.query("SELECT to_regclass('public.search_entities') AS t");
  if (reg.rows[0]?.t) {
    console.log("✓ search_entities created (+ pg_trgm + indexes). Now run: bun run search:refresh");
  } else {
    console.log("⚠ ran without error but table not found — check the output above");
  }
} catch (err) {
  console.error("✗ init failed:", (err as Error).message);
  console.error("  If it's a permissions error on CREATE EXTENSION pg_trgm, run that line as a DB superuser first.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
