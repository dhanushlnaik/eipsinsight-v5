/** Instant "swoop": a bare number (or EIP-123 / ERC-20) jumps straight to that page, no DB wait. */
export function parseSwoop(raw: string): { url: string; label: string } | null {
  const m = raw.trim().match(/^(eip|erc|rip)?[\s-]*?(\d{1,6})$/i);
  if (!m) return null;
  const kind = (m[1]?.toLowerCase() as "eip" | "erc" | "rip") || "eip";
  return { url: `/${kind}/${m[2]}`, label: `${kind.toUpperCase()}-${m[2]}` };
}
