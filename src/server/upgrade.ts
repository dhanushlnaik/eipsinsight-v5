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
