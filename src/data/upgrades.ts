import {
  rawData,
  eipTitles,
  upgradeDescriptions,
  upgradeMetaEIPs,
  pairedUpgradeNames,
  professionalColorMap,
  consensusSpecsLinks,
  executionSpecsLinks,
  type UpgradeData,
} from "@/data/network-upgrades";
import { upgradeRegistry, type UpgradeRegistryEntry, type UpgradeMascot } from "@/data/upgrade-registry";

/**
 * The curated network-upgrade history, unified.
 *
 * Two source shapes are reconciled here: `rawData` lists upgrades at the fork
 * level (Prague, Electra…) with the real EIPs, dates and blocks; the registry
 * lists them at the marketing level (Pectra…) with mascots, taglines and
 * headliners. This module groups the forks into the upgrade people name, pairs
 * the execution and consensus halves, resolves every EIP to a title + category,
 * and attaches the registry's narrative. The DB stays the source of truth for
 * the in-flight inclusion buckets (proposed / considered / declined); that is
 * merged in later, in `src/server/upgrade.ts`.
 */

export type UpgradeEra = "upcoming" | "pos" | "pow";

export interface UpgradeEip {
  number: number;
  title: string;
  category: string; // Core | Networking | Meta | Informational | ERC
  layer: "execution" | "consensus";
}

export interface UpgradeSummary {
  slug: string;
  name: string;
  status: string; // Live | Upcoming | Planning | Research
  date: string | null; // activation / target (YYYY-MM-DD)
  dateIsTarget: boolean; // true when the date is a projection, not shipped
  block: number | null;
  epoch: number | null;
  executionName: string | null;
  consensusName: string | null;
  metaEip: number | null;
  color: string | null;
  description: string | null;
  tagline: string | null;
  mascot: UpgradeMascot | null;
  nameOrigin: string | null;
  nameOriginDetails: UpgradeRegistryEntry["nameOriginDetails"] | null;
  headliners: NonNullable<UpgradeRegistryEntry["headliners"]>;
  earlyResults: UpgradeRegistryEntry["earlyResults"] | null;
  eipCount: number;
  eips: UpgradeEip[];
  specsLinks: { label: string; href: string }[];
  devnetSeries: string[];
  era: UpgradeEra;
}

const SENTINELS = new Set(["CONSENSUS", "NO-EIP"]);
const LIVE = new Set(["Live"]);

function eipNum(raw: string): number | null {
  const m = raw.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** fork name (Prague, Bellatrix…) → the marketing-level registry entry it belongs to. */
const registryByFork: Record<string, UpgradeRegistryEntry> = (() => {
  const map: Record<string, UpgradeRegistryEntry> = {};
  const entries = Object.values(upgradeRegistry);
  for (const e of entries) if (e.executionName) map[e.executionName] ??= e;
  for (const e of entries) if (e.consensusName) map[e.consensusName] ??= e;
  for (const e of entries) map[e.name] ??= e;
  return map;
})();

interface Accum {
  slug: string;
  name: string;
  reg: UpgradeRegistryEntry | null;
  date: string;
  el: UpgradeData | null;
  cl: UpgradeData | null;
}

const MERGE_BLOCK = 15537394; // Paris block; upgrades before it are proof-of-work era.

function buildList(): UpgradeSummary[] {
  // Fold the fork rows into one record per marketing upgrade, keyed by the slug the
  // registry gives it (so Prague + Electra both land on `pectra`, and the two halves
  // of The Merge land on `paris`). Fork rows with no registry keep their own slug.
  const acc = new Map<string, Accum>();
  for (const row of rawData) {
    const reg = registryByFork[row.upgrade] ?? null;
    const display = reg?.name ?? pairedUpgradeNames[row.date] ?? row.upgrade;
    const slug = reg?.slug ?? slugify(pairedUpgradeNames[row.date] ?? row.upgrade);
    const a = acc.get(slug) ?? { slug, name: display, reg, date: row.date, el: null, cl: null };
    if (row.type === "consensus" || row.type === "beacon_genesis") a.cl = row;
    else a.el = row;
    if (row.date < a.date) a.date = row.date; // The Merge shipped its CL half a few days earlier.
    acc.set(slug, a);
  }

  const seen = new Set<string>();
  const summaries: UpgradeSummary[] = [];

  for (const a of acc.values()) {
    seen.add(a.slug);
    const reg = a.reg;
    const elName = a.el?.upgrade ?? null;
    const clName = a.cl?.upgrade ?? null;

    const eips: UpgradeEip[] = [];
    const addEips = (src: UpgradeData | null, layer: "execution" | "consensus") => {
      for (const tok of src?.eips ?? []) {
        if (SENTINELS.has(tok)) continue;
        const n = eipNum(tok);
        if (n == null || eips.some((e) => e.number === n)) continue;
        const info = eipTitles[String(n)];
        eips.push({ number: n, title: info?.title ?? "Untitled", category: info?.category ?? "Core", layer });
      }
    };
    addEips(a.el, "execution");
    addEips(a.cl, "consensus");
    eips.sort((x, y) => x.number - y.number);

    const metaName = elName ?? a.name;
    const metaEip = eipNum(upgradeMetaEIPs[metaName] ?? upgradeMetaEIPs[a.name] ?? "") ?? null;
    const beforeMerge = (a.el?.blockNumber ?? Infinity) < MERGE_BLOCK && clName === null;

    summaries.push({
      slug: a.slug,
      name: reg?.name ?? a.name,
      status: reg?.status ?? "Live",
      date: a.date,
      dateIsTarget: false,
      block: a.el?.blockNumber ?? null,
      epoch: a.cl?.forkEpoch ?? null,
      executionName: reg?.executionName ?? elName,
      consensusName: reg?.consensusName ?? clName,
      metaEip,
      color: professionalColorMap[elName ?? ""] ?? professionalColorMap[clName ?? ""] ?? null,
      description: reg?.description ?? upgradeDescriptions[metaName] ?? upgradeDescriptions[a.name] ?? null,
      tagline: reg?.tagline ?? null,
      mascot: reg?.mascot ?? null,
      nameOrigin: reg?.nameOrigin ?? null,
      nameOriginDetails: reg?.nameOriginDetails ?? null,
      headliners: reg?.headliners ?? [],
      earlyResults: reg?.earlyResults ?? null,
      eipCount: eips.length,
      eips,
      specsLinks: specsFor(elName, clName),
      devnetSeries: reg?.devnetSeries ?? [],
      era: beforeMerge ? "pow" : "pos",
    });
  }

  // Registry upgrades with no fork history yet are the ones still being assembled. A Live
  // registry entry that never matched a fork is a redundant half (e.g. a standalone CL entry),
  // so it is skipped — only genuinely upcoming upgrades are added here.
  for (const reg of Object.values(upgradeRegistry)) {
    if (seen.has(reg.slug) || reg.status === "Live") continue;
    summaries.push({
      slug: reg.slug,
      name: reg.name,
      status: reg.status,
      date: reg.activationDate ?? null,
      dateIsTarget: !reg.activationDate,
      block: reg.activationBlock ?? null,
      epoch: reg.forkEpoch ?? null,
      executionName: reg.executionName ?? null,
      consensusName: reg.consensusName ?? null,
      metaEip: eipNum(upgradeMetaEIPs[reg.name] ?? "") ?? null,
      color: professionalColorMap[reg.executionName ?? ""] ?? null,
      description: reg.description,
      tagline: reg.tagline,
      mascot: reg.mascot ?? null,
      nameOrigin: reg.nameOrigin ?? null,
      nameOriginDetails: reg.nameOriginDetails ?? null,
      headliners: reg.headliners ?? [],
      earlyResults: reg.earlyResults ?? null,
      eipCount: 0,
      eips: [],
      specsLinks: specsFor(reg.executionName ?? null, reg.consensusName ?? null),
      devnetSeries: reg.devnetSeries ?? [],
      era: "upcoming",
    });
  }

  // Newest first; not-yet-shipped upgrades (no block, planning) float to the top.
  return summaries.sort((a, b) => {
    const au = LIVE.has(a.status) ? 0 : 1;
    const bu = LIVE.has(b.status) ? 0 : 1;
    if (au !== bu) return bu - au;
    return (b.date ?? "9999").localeCompare(a.date ?? "9999");
  });
}

function specsFor(elName: string | null, clName: string | null): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  if (elName && executionSpecsLinks[elName]) out.push({ label: `${elName} execution spec`, href: executionSpecsLinks[elName] });
  if (clName && consensusSpecsLinks[clName]) out.push({ label: `${clName} consensus spec`, href: consensusSpecsLinks[clName] });
  return out;
}

let cache: UpgradeSummary[] | null = null;

/** The full curated upgrade history, newest first, upcoming upgrades on top. */
export function allUpgrades(): UpgradeSummary[] {
  return (cache ??= buildList());
}

export function getUpgradeSummary(slug: string): UpgradeSummary | null {
  return allUpgrades().find((u) => u.slug === slug) ?? null;
}
