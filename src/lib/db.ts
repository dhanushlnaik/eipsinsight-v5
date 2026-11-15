import { Pool } from "pg";

// Read-only pool against the SHARED Postgres (owned by the scheduler).
// v5 only ever SELECTs from scheduler tables; the one table it owns is
// `search_entities`. Keep the pool tiny, same PgBouncer constraints as v4.
const globalForDb = globalThis as unknown as { __eipPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  return new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 20_000,
    // Fail fast when the database is unreachable or a query runs away, so pages fall
    // back to their empty states instead of hanging the request.
    // (Both limits are client-side: PgBouncer rejects statement_timeout as a startup parameter.)
    connectionTimeoutMillis: 6_000,
    query_timeout: 20_000,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

export const db = globalForDb.__eipPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__eipPool = db;

export class IndexMissingError extends Error {}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    const res = await db.query(sql, params);
    return res.rows as T[];
  } catch (err) {
    // 42P01 = undefined_table → the search index hasn't been created yet.
    if (err && typeof err === "object" && "code" in err && err.code === "42P01") {
      throw new IndexMissingError("search_entities table not found");
    }
    throw err;
  }
}
