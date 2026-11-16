/** Result groups, in the order they are shown. Every entity type belongs to exactly one.
 *  Shared by the server query and every search surface. */
export const GROUPS = [
  { key: "proposal", label: "Proposals", types: ["eip", "erc", "rip"] },
  { key: "upgrade", label: "Upgrades", types: ["upgrade"] },
  { key: "contributor", label: "Contributors", types: ["contributor"] },
  { key: "pr", label: "Pull requests", types: ["pr"] },
  { key: "issue", label: "Issues", types: ["issue"] },
  { key: "blog", label: "Articles", types: ["blog"] },
] as const;

export type GroupKey = (typeof GROUPS)[number]["key"];

/** The scopes a reader can narrow a search to. `types` empty means everything. */
export const SCOPES: { key: string; label: string; types: string[] }[] = [
  { key: "all", label: "Everything", types: [] },
  { key: "proposal", label: "Proposals", types: ["eip", "erc", "rip"] },
  { key: "contributor", label: "Contributors", types: ["contributor"] },
  { key: "upgrade", label: "Upgrades", types: ["upgrade"] },
  { key: "pr", label: "Pull requests", types: ["pr"] },
  { key: "issue", label: "Issues", types: ["issue"] },
];
