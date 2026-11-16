import { query } from "@/lib/db";

export interface UpgradeEip {
  eip_number: number;
  title: string | null;
}

export interface Upgrade {
  slug: string;
  name: string;
  metaEip: number | null;
  createdAt: string | null;
  buckets: { bucket: string; eips: UpgradeEip[] }[];
  totalEips: number;
}

// Canonical ordering of inclusion buckets, furthest along first. Bucket names vary in
// case and wording ("scheduled", "Scheduled for Inclusion"), so rank by keyword.
function bucketRank(bucket: string): number {
  const l = bucket.toLowerCase();
  if (l.includes("declin")) return 4;
  if (l.includes("includ")) return 0;
  if (l.includes("schedul")) return 1;
  if (l.includes("consider")) return 2;
  if (l.includes("propos")) return 3;
  return 5;
}

export async function getUpgrade(slug: string): Promise<Upgrade | null> {
  const rows = await query<{ id: number; slug: string; name: string; meta_eip: number | null; created_at: string | null }>(
    `SELECT id, slug, name, meta_eip, created_at FROM upgrades WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  const u = rows[0];
  if (!u) return null;

  const comp = await query<{ eip_number: number; bucket: string; title: string | null }>(
    `SELECT c.eip_number, c.bucket,
       (SELECT e.title FROM eips e WHERE e.eip_number = c.eip_number ORDER BY e.id LIMIT 1) AS title
     FROM upgrade_composition_current c
     WHERE c.upgrade_id = $1
     ORDER BY c.eip_number`,
    [u.id],
  );

  const byBucket = new Map<string, UpgradeEip[]>();
  for (const r of comp) {
    const b = r.bucket || "Other";
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push({ eip_number: r.eip_number, title: r.title });
  }
  const buckets = [...byBucket.entries()]
    .map(([bucket, eips]) => ({ bucket, eips }))
    .sort((a, b) => bucketRank(a.bucket) - bucketRank(b.bucket));

  return {
    slug: u.slug,
    name: u.name,
    metaEip: u.meta_eip,
    createdAt: u.created_at ? String(u.created_at) : null,
    buckets,
    totalEips: comp.length,
  };
}

// ── v5 unified detail: curated history + live DB inclusion buckets ──────────
import { getUpgradeSummary, type UpgradeSummary } from "@/data/upgrades";
import { cachedOr } from "@/lib/cache";

export interface UpgradeDetail extends UpgradeSummary {
  /** Live inclusion buckets from the scheduler, for upgrades whose scope is still forming. */
  buckets: { bucket: string; eips: UpgradeEip[] }[];
  dbTotal: number;
}

/** DB composition for a slug, tolerant of the DB being down or the slug being absent. */
async function dbComposition(slug: string): Promise<{ buckets: UpgradeDetail["buckets"]; total: number }> {
  try {
    const u = await getUpgrade(slug);
    if (u) return { buckets: u.buckets, total: u.totalEips };
  } catch {
    // DB unreachable — the curated data still renders.
  }
  return { buckets: [], total: 0 };
}

/**
 * One upgrade, everything we have: the curated facts, mascot and headliners from
 * the static history, plus the live inclusion buckets from the database for
 * upgrades still being assembled. Cached for five minutes; never caches a miss.
 */
export function getUpgradeDetail(slug: string): Promise<UpgradeDetail | null> {
  const summary = getUpgradeSummary(slug);
  if (!summary) return Promise.resolve(null);
  return cachedOr<UpgradeDetail | null>(
    async () => {
      const { buckets, total } = await dbComposition(slug);
      return { ...summary, buckets, dbTotal: total };
    },
    ["v5-upgrade-detail-2", slug],
    { ...summary, buckets: [], dbTotal: 0 },
  )();
}

export interface UpgradeChange {
  slug: string | null;
  upgradeName: string | null;
  eip_number: number;
  bucket: string;
  changed_at: string;
}

/** The most recent EIP inclusion-bucket changes across all upgrades, newest first. */
export const getRecentUpgradeChanges = cachedOr<UpgradeChange[]>(
  async () => {
    const rows = await query<{ slug: string | null; name: string | null; eip_number: number; bucket: string; changed_at: string }>(
      `SELECT u.slug, u.name, e.eip_number, e.bucket, e.commit_date AS changed_at
       FROM upgrade_composition_events e
       JOIN upgrades u ON u.id = e.upgrade_id
       WHERE e.eip_number IS NOT NULL AND e.bucket IS NOT NULL AND e.commit_date IS NOT NULL
         AND coalesce(e.event_type, '') <> 'removed'
       ORDER BY e.commit_date DESC
       LIMIT 12`,
    );
    return rows.map((r) => ({ slug: r.slug, upgradeName: r.name, eip_number: r.eip_number, bucket: r.bucket, changed_at: String(r.changed_at) }));
  },
  ["v5-upgrade-changes"],
  [],
);
