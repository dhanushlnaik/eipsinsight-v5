// Protocol call series metadata. Slugs match what the scheduler writes to
// protocol_calls.series. One-off calls arrive as `one-off-<issue>` and fall
// back to their stored display name. Ported from v4; colour classes dropped in
// favour of the ledger chip system.

export interface CallSeriesMeta {
  label: string;
  short: string;
  /** Rough grouping, used to cluster the series filter on the index. */
  group: "core" | "breakout" | "process" | "other";
}

export const CALL_SERIES: Record<string, CallSeriesMeta> = {
  acde: { label: "AllCoreDevs — Execution", short: "ACDE", group: "core" },
  acdc: { label: "AllCoreDevs — Consensus", short: "ACDC", group: "core" },
  acdt: { label: "AllCoreDevs — Testing", short: "ACDT", group: "core" },
  acdtcl: { label: "AllCoreDevs — Testing CL Breakout", short: "ACDT-CL", group: "core" },
  epbs: { label: "ePBS Breakout", short: "ePBS", group: "breakout" },
  bal: { label: "BAL Breakout", short: "BAL", group: "breakout" },
  focil: { label: "FOCIL Breakout", short: "FOCIL", group: "breakout" },
  price: { label: "Glamsterdam Repricings", short: "Repricing", group: "breakout" },
  tli: { label: "Trustless Log Index", short: "TLI", group: "breakout" },
  pqts: { label: "PQ Transaction Signatures", short: "PQTS", group: "breakout" },
  rpc: { label: "RPC Standards", short: "RPC", group: "breakout" },
  zkevm: { label: "L1-zkEVM Breakout", short: "zkEVM", group: "breakout" },
  etm: { label: "Encrypt The Mempool", short: "ETM", group: "breakout" },
  awd: { label: "AllWalletDevs", short: "AWD", group: "breakout" },
  pqi: { label: "PQ Interop", short: "PQI", group: "breakout" },
  fcr: { label: "Fast Confirmation Rule", short: "FCR", group: "breakout" },
  aa: { label: "Native Account Abstraction", short: "AA", group: "breakout" },
  p2p: { label: "P2P Networking", short: "P2P", group: "breakout" },
  ssz: { label: "SSZ Engine API", short: "SSZ", group: "breakout" },
  ethproofs: { label: "EthProofs", short: "EthProofs", group: "breakout" },
  eipip: { label: "EIP Improvement Process", short: "EIPIP", group: "process" },
  eipoh: { label: "EIP Editing Office Hours", short: "EIP OH", group: "process" },
};

export function isOneOffSeries(series: string): boolean {
  return series.startsWith("one-off-");
}

export function callSeriesLabel(series: string): string {
  if (isOneOffSeries(series)) return "One-off call";
  return CALL_SERIES[series]?.label ?? series.toUpperCase();
}

export function callSeriesShort(series: string): string {
  if (isOneOffSeries(series)) return "1-OFF";
  return CALL_SERIES[series]?.short ?? series.toUpperCase();
}

/** "AllCoreDevs — Execution #175", or the stored one-off name. */
export function callDisplayName(call: {
  series: string;
  call_number: string | null;
  display_name: string | null;
}): string {
  if (isOneOffSeries(call.series)) return call.display_name || "One-off call";
  const base = callSeriesLabel(call.series);
  return call.call_number ? `${base} #${call.call_number}` : base;
}
