import { db } from "@/lib/db";
import { cachedOr } from "@/lib/cache";

export interface Stats {
  eips: number;
  openPRs: number;
  contributors: number;
  upgrades: number;
}

export interface StatusSlice {
  status: string;
  n: number;
}

export interface PulseItem {
  eip_number: number;
  kind: "eip" | "erc" | "rip";
  title: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
}

export interface UpgradeCard {
  slug: string;
  name: string;
  meta_eip: number | null;
  eips: number;
  created_at: string | null;
}

export const getUpgradesList = cachedOr<UpgradeCard[]>(
  async () => {
    const r = await db.query<UpgradeCard>(
      `SELECT u.slug, u.name, u.meta_eip, u.created_at,
         (SELECT count(*)::int FROM upgrade_composition_current c WHERE c.upgrade_id = u.id) AS eips
       FROM upgrades u
       WHERE u.slug IS NOT NULL
       ORDER BY u.created_at DESC
       LIMIT 40`,
    );
    return r.rows.map((x) => ({ ...x, created_at: x.created_at ? String(x.created_at) : null }));
  },
  ["v5-upgrades-list-2"],
  [],
);

/** Headline counters, real, straight from the shared DB. Read-only. */
export const getStats = cachedOr<Stats>(
  async () => {
    // One round trip for all four counters. A missing `rips` table must not zero the rest.
    const r = await db.query<Stats>(
      `SELECT
         (SELECT count(*) FROM eips)::int
           + coalesce((SELECT count(*) FROM rips WHERE title IS NOT NULL AND title <> ''), 0)::int AS eips,
         (SELECT count(*) FROM pull_requests WHERE lower(state) = 'open')::int AS "openPRs",
         (SELECT count(DISTINCT actor) FROM contributor_scores)::int AS contributors,
         (SELECT count(*) FROM upgrades)::int AS upgrades`,
    );
    return r.rows[0];
  },
  ["v5-stats-2"],
  { eips: 0, openPRs: 0, contributors: 0, upgrades: 0 },
);

export const getStatusDistribution = cachedOr<StatusSlice[]>(
  async () => {
    const r = await db.query<StatusSlice>(
      `SELECT status, count(*)::int n FROM eip_snapshots
       WHERE status IS NOT NULL GROUP BY status ORDER BY n DESC`,
    );
    return r.rows;
  },
  ["v5-status-dist"],
  [],
);

export const getPulse = cachedOr<PulseItem[]>(
  async () => {
    const r = await db.query<PulseItem>(
      `SELECT e.eip_number, e.title, se.from_status, se.to_status, se.changed_at,
         CASE lower(split_part(r.name, '/', 2))
           WHEN 'ercs' THEN 'erc' WHEN 'rips' THEN 'rip' ELSE 'eip' END AS kind
       FROM eip_status_events se
       JOIN eips e ON e.id = se.eip_id
       JOIN repositories r ON r.id = se.repository_id
       WHERE se.to_status IS NOT NULL AND e.title IS NOT NULL
       ORDER BY se.changed_at DESC
       LIMIT 8`,
    );
    return r.rows.map((x) => ({ ...x, changed_at: String(x.changed_at) }));
  },
  ["v5-pulse-2"],
  [],
);
