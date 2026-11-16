/** Human labels for the devnet series the scheduler scrapes from ethPandaOps. */
export const SERIES_LABELS: Record<string, string> = {
  glamsterdam: "Glamsterdam",
  bal: "Block-Level Access Lists (BAL)",
  epbs: "Enshrined PBS (ePBS)",
  focil: "FOCIL",
  bogota: "Bogotá / Hegotá",
  peerdas: "PeerDAS",
  fusaka: "Fusaka",
  pectra: "Pectra",
  dencun: "Dencun",
  perf: "Performance",
  eof: "EVM Object Format",
  frames: "Frames",
  berlinterop: "Berlin Interop",
  blob: "Blob",
};

export function seriesLabel(series: string): string {
  return SERIES_LABELS[series] ?? series.charAt(0).toUpperCase() + series.slice(1);
}

/** Order: the forks people are watching now first, then the rest alphabetically. */
export const SERIES_ORDER = ["glamsterdam", "bal", "epbs", "focil", "bogota", "peerdas", "fusaka", "pectra", "dencun"];
