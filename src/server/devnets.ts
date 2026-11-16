import { query } from "@/lib/db";
import { cachedOr } from "@/lib/cache";

export interface DevnetEip {
  number: number;
  title: string | null;
  status: string | null;
  url: string | null;
}

export interface ClientRow {
  client: string;
  version: string | null;
  ready: boolean | null;
}

export interface DevnetSummary {
  id: string;
  series: string;
  number: number | null;
  title: string | null;
  active: boolean;
  canceled: boolean;
  genesis: string | null; // ISO date, or null
  sameSpecAs: string | null;
  eipCount: number;
}

export interface DevnetDetail extends DevnetSummary {
  sectionTitle: string | null;
  eips: DevnetEip[];
  elClients: ClientRow[];
  clClients: ClientRow[];
  specLinks: { label: string; href: string }[];
  announcements: string[];
  sourceUrl: string | null;
}

function toDate(unix: unknown): string | null {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

function parseEips(v: unknown): DevnetEip[] {
  return asArray(v)
    .map((e): DevnetEip | null => {
      const o = e as Record<string, unknown>;
      const number = Number(o?.number);
      if (!Number.isFinite(number)) return null;
      return {
        number,
        title: typeof o.title === "string" ? o.title : null,
        status: typeof o.status === "string" ? o.status : null,
        url: typeof o.url === "string" ? o.url : null,
      };
    })
    .filter((e): e is DevnetEip => e !== null)
    .sort((a, b) => a.number - b.number);
}

/** Client-support matrices come in a few shapes; flatten to {client, version, ready}. */
function parseClients(v: unknown): ClientRow[] {
  const obj = asObject(v);
  const clients = asArray(obj.clients);
  if (clients.length > 0) {
    return clients.map((c) => {
      const o = c as Record<string, unknown>;
      return {
        client: String(o.name ?? o.client ?? o.id ?? "Unknown"),
        version: typeof o.version === "string" ? o.version : null,
        ready: typeof o.ready === "boolean" ? o.ready : typeof o.supported === "boolean" ? o.supported : null,
      };
    });
  }
  // Fallback: a plain map of client → version/status.
  return Object.entries(obj)
    .filter(([k]) => k !== "matrix" && k !== "clients")
    .map(([client, val]) => ({
      client,
      version: typeof val === "string" ? val : null,
      ready: typeof val === "boolean" ? val : null,
    }));
}

const SENTENCE = /[.!?]\s|$/;
function cleanAnnouncements(v: unknown): string[] {
  return asArray(v)
    .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    .map((a) => a.replace(/\*\*/g, "").replace(/`([^`]*)`/g, "$1").replace(/\s+/g, " ").trim())
    // Drop entries that are really markdown tables or hex dumps, not prose.
    .filter((a) => (a.match(/\|/g)?.length ?? 0) < 4 && !/0x[0-9a-f]{20,}/i.test(a) && a.length < 600)
    .map((a) => (a.length > 320 ? a.slice(0, 320).replace(/\s+\S*$/, "") + "…" : a))
    .slice(0, 5);
}

const ROW = `id, series, devnet_number, title, active, canceled, genesis_time, same_spec_as, eip_section_title`;

function summary(r: Record<string, unknown>, eipCount: number): DevnetSummary {
  return {
    id: String(r.id),
    series: String(r.series),
    number: r.devnet_number != null ? Number(r.devnet_number) : null,
    title: typeof r.title === "string" ? r.title : null,
    active: Boolean(r.active),
    canceled: Boolean(r.canceled),
    genesis: toDate(r.genesis_time),
    sameSpecAs: typeof r.same_spec_as === "string" ? r.same_spec_as : null,
    eipCount,
  };
}

/** Every devnet, grouped-friendly (flat list, newest series activity first). Read-only. */
export const getDevnets = cachedOr<DevnetSummary[]>(
  async () => {
    const rows = await query<Record<string, unknown>>(
      `SELECT ${ROW}, coalesce(jsonb_array_length(CASE WHEN jsonb_typeof(eips::jsonb) = 'array' THEN eips::jsonb ELSE '[]'::jsonb END), 0) AS eip_count
       FROM devnet_specs
       ORDER BY active DESC, series, devnet_number DESC NULLS LAST`,
    );
    return rows.map((r) => summary(r, Number(r.eip_count ?? 0)));
  },
  ["v5-devnets"],
  [],
);

export function getDevnet(id: string): Promise<DevnetDetail | null> {
  return cachedOr<DevnetDetail | null>(
    async () => {
      const rows = await query<Record<string, unknown>>(
        `SELECT ${ROW}, eips, el_client_support, cl_client_support, spec_references, announcements, source_url
         FROM devnet_specs WHERE id = $1 LIMIT 1`,
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      const eips = parseEips(r.eips);
      const specs = asObject(r.spec_references);
      const specLinks: { label: string; href: string }[] = [];
      if (typeof specs.executionSpecs === "string") specLinks.push({ label: "Execution spec", href: specs.executionSpecs });
      if (typeof specs.consensusSpecs === "string") specLinks.push({ label: "Consensus spec", href: specs.consensusSpecs });
      return {
        ...summary(r, eips.length),
        sectionTitle: typeof r.eip_section_title === "string" ? r.eip_section_title : null,
        eips,
        elClients: parseClients(r.el_client_support),
        clClients: parseClients(r.cl_client_support),
        specLinks,
        announcements: cleanAnnouncements(r.announcements),
        sourceUrl: typeof r.source_url === "string" ? r.source_url : null,
      };
    },
    ["v5-devnet", id],
    null,
  )();
}

/** The active devnet for a fork series (e.g. "glamsterdam"), if one is live. */
export async function getActiveDevnet(series: string): Promise<DevnetSummary | null> {
  const all = await getDevnets();
  return all.find((d) => d.series === series && d.active) ?? all.find((d) => d.series === series) ?? null;
}
