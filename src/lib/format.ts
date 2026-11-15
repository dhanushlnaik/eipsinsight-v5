export const STATUS_ORDER = ["Draft", "Review", "Last Call", "Final", "Living", "Stagnant", "Withdrawn", "Moved"];

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtMonth(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Compact relative time: 12m, 3h, 5d, 2mo, 1y. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const day = 864e5;
  if (d < 36e5) return `${Math.max(1, Math.round(d / 6e4))}m`;
  if (d < day) return `${Math.round(d / 36e5)}h`;
  if (d < 30 * day) return `${Math.round(d / day)}d`;
  if (d < 365 * day) return `${Math.round(d / (30 * day))}mo`;
  return `${Math.round(d / (365 * day))}y`;
}

/** Upgrade inclusion bucket to a status-colour token. */
export function bucketToken(bucket: string): string {
  const l = bucket.toLowerCase();
  if (l.includes("declin")) return "withdrawn";
  if (l.includes("includ") || l.includes("schedul")) return "final";
  if (l.includes("propos")) return "draft";
  return "review";
}
