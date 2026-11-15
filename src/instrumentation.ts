/**
 * Keeps the search index fresh without a server cron.
 *
 * When SEARCH_REFRESH_MINUTES is set (production), the app refreshes
 * search_entities on that interval from inside its own process. It is off by
 * default, so local dev servers never write to the shared database.
 *
 * The refresh is an idempotent upsert, so it is safe if two instances overlap,
 * and a failed run is simply retried on the next tick.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const minutes = Number(process.env.SEARCH_REFRESH_MINUTES);
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  const g = globalThis as unknown as { __searchRefreshTimer?: ReturnType<typeof setInterval> };
  if (g.__searchRefreshTimer) return; // already scheduled in this process

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const { Pool } = await import("pg");
  const { refreshSearchIndex } = await import("@/server/refresh-search");
  // Its own single connection: the first build can run longer than the page pool's query limit.
  const db = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const report = await refreshSearchIndex(db);
      const total = Object.values(report.counts).reduce((a, b) => a + b, 0);
      console.log(`[search] index refreshed in ${report.ms}ms (${total} rows)`);
    } catch (err) {
      console.error("[search] index refresh failed:", (err as Error).message);
    } finally {
      running = false;
    }
  };

  const every = Math.max(1, minutes) * 60_000;
  g.__searchRefreshTimer = setInterval(tick, every);
  g.__searchRefreshTimer.unref?.();
  // First run shortly after boot, once the server is taking requests.
  setTimeout(tick, 20_000).unref?.();
  console.log(`[search] index refresh scheduled every ${Math.max(1, minutes)} min`);
}
