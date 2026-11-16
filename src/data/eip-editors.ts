// Authoritative EIP/ERC editor and reviewer rosters, ported from v4's
// governance-maintained list. The scheduler tags per-activity `role` values in
// contributor_activity heuristically (e.g. it marks very active triagers as
// EDITOR), which over-reports editorship. We gate the standing Editor and
// Reviewer badges on these lists so a profile only claims a role the person
// actually holds.

// The current EIP editors, per EIP-1 "EIP Editors" (ethereum/EIPs). Kept to the
// standing roster, not emeritus editors (axic, Pandapip1, gcolvin, …) or
// breakout-call leads, so the Editor badge means someone who actually merges
// proposals today. xinbenlv also serves as the ERC editor.
export const CANONICAL_EIP_EDITORS = [
  "lightclient",
  "SamWilsn",
  "xinbenlv",
  "g11tech",
  "jochem-brouwer",
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
