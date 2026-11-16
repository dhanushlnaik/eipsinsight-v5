// Authoritative EIP/ERC editor and reviewer rosters, ported from v4's
// governance-maintained list. The scheduler tags per-activity `role` values in
// contributor_activity heuristically (e.g. it marks very active triagers as
// EDITOR), which over-reports editorship. We gate the standing Editor and
// Reviewer badges on these lists so a profile only claims a role the person
// actually holds.

export const CANONICAL_EIP_EDITORS = [
  "lightclient",
  "SamWilsn",
  "xinbenlv",
  "g11tech",
  "jochem-brouwer",
  "axic",
  "Pandapip1",
  "gcolvin",
  "nconsigny",
  "yoavw",
  "CarlBeek",
  "adietrichs",
] as const;

export const CANONICAL_EIP_REVIEWERS = [
  "bomanaps",
  "Marchhill",
  "SkandaBhat",
  "advaita-saha",
  "nalepae",
  "daniellehrner",
  "jtraglia",
] as const;

const EDITORS_LOWER = new Set(CANONICAL_EIP_EDITORS.map((e) => e.toLowerCase()));
const REVIEWERS_LOWER = new Set(CANONICAL_EIP_REVIEWERS.map((r) => r.toLowerCase()));

export function isCanonicalEditor(actor: string): boolean {
  return EDITORS_LOWER.has(actor.toLowerCase());
}

export function isCanonicalReviewer(actor: string): boolean {
  return REVIEWERS_LOWER.has(actor.toLowerCase());
}
