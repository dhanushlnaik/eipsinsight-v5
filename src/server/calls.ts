import { query } from "@/lib/db";
import { cachedOr } from "@/lib/cache";
import { getAllProposals } from "@/server/proposals";
import { CALL_SERIES, callDisplayName, callSeriesLabel, callSeriesShort, isOneOffSeries, type CallSeriesMeta } from "@/data/call-series";

export interface CallSummary {
  series: string;
  number: string | null;
  displayName: string | null;
  date: string | null; // ISO yyyy-mm-dd
  videoUrl: string | null;
  hasTldr: boolean;
  hasTranscript: boolean;
  decisions: number;
  /** The first decision of the call, as a one-line headline. */
  headline: string | null;
  title: string;
}

export interface CallMoment {
  text: string;
  /** Seconds into the recording, if a timestamp was parsed. */
  seconds: number | null;
  stamp: string | null; // original "HH:MM:SS"
}

export interface CallAction extends CallMoment {
  owner: string | null;
}

export interface CallDecisionRef {
  text: string;
  eips: number[];
  type: string | null;
  seconds: number | null;
  stamp: string | null;
}

export interface HighlightTopic {
  topic: string;
  items: CallMoment[];
}

/** One timestamped moment that referenced a proposal, tagged by where it came from. */
export interface LabeledMoment extends CallMoment {
  label: string;
}

/** A proposal named on a call, with every moment it came up. */
export interface CallEipMention {
  number: number;
  kind: "eip" | "erc" | "rip";
  title: string | null;
  onAgenda: boolean;
  discussed: boolean;
  moments: LabeledMoment[];
}

/** An item from the call's published agenda. */
export interface AgendaItem {
  number: number;
  kind: "eip" | "erc" | "rip";
  title: string | null;
  mentionedBy: string | null;
  snippet: string | null;
  url: string | null;
}

export interface TranscriptCue {
  seconds: number;
  stamp: string;
  speaker: string | null;
  text: string;
}

export interface CallDetail {
  series: string;
  number: string | null;
  title: string;
  date: string | null;
  videoUrl: string | null;
  youtubeId: string | null;
  issueNumber: number | null;
  summary: string | null;
  decisions: CallMoment[];
  actionItems: CallAction[];
  targets: CallMoment[];
  highlights: HighlightTopic[];
  decisionRefs: CallDecisionRef[];
  eipsDiscussed: number[];
  eipMentions: CallEipMention[];
  agenda: AgendaItem[];
  transcript: TranscriptCue[] | null;
  hasTranscript: boolean;
}

/** Tidy a raw agenda snippet: drop markdown noise, URLs and GitHub refs. */
function cleanSnippet(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*`>]+/g, " ")
    .replace(/issues?\/\d+#?\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 2 ? s : null;
}

/** Pull "EIP-1234" / "ERC 20" / "RIP-7212" references out of free text. */
function extractRefs(text: string): { kind: "eip" | "erc" | "rip"; number: number }[] {
  const out: { kind: "eip" | "erc" | "rip"; number: number }[] = [];
  const re = /\b(EIP|ERC|RIP)[-\s]?(\d{1,5})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ kind: m[1].toLowerCase() as "eip" | "erc" | "rip", number: Number(m[2]) });
  }
  return out;
}

/** Extract an 11-char YouTube id from the common URL shapes. */
export function youtubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return m ? m[1] : null;
}

const TOPIC_ACRONYMS = new Set([
  "pq", "ai", "el", "cl", "dc", "eip", "erc", "rip", "tls", "api", "rpc", "mev",
  "da", "zk", "zkevm", "evm", "ssz", "bls", "kzg", "pbs", "epbs", "focil", "aa",
  "pqts", "pqi", "eof", "acd", "acde", "acdc", "acdt", "p2p", "l1", "l2", "eth",
]);

/** Prettify a highlight topic slug like "pq_ai_landscape" → "PQ AI landscape". */
function prettyTopic(slug: string): string {
  const words = slug.replace(/[_-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return slug;
  return words
    .map((w, i) => {
      if (TOPIC_ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    })
    .join(" ");
}

/** Parse an inline WEBVTT transcript into speaker-tagged, seekable cues. */
function parseVtt(vtt: string | null): TranscriptCue[] | null {
  if (!vtt || !/-->/.test(vtt)) return null;
  const cues: TranscriptCue[] = [];
  const blocks = vtt.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    const tIdx = lines.findIndex((l) => l.includes("-->"));
    if (tIdx === -1) continue;
    const start = lines[tIdx].split("-->")[0].trim();
    const { seconds, stamp } = parseStamp(start.replace(/\.\d+$/, ""));
    if (seconds == null) continue;
    const body = lines.slice(tIdx + 1).join(" ").trim();
    if (!body) continue;
    const colon = body.indexOf(":");
    const speaker = colon > 0 && colon < 32 ? body.slice(0, colon).trim() : null;
    const text = speaker ? body.slice(colon + 1).trim() : body;
    cues.push({ seconds, stamp: stamp ?? start, speaker, text });
  }
  return cues.length ? cues : null;
}

/** "01:12:30" or "12:30" → seconds. */
function parseStamp(v: unknown): { seconds: number | null; stamp: string | null } {
  if (typeof v !== "string") return { seconds: null, stamp: null };
  const m = v.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return { seconds: null, stamp: v };
  const h = m[1] ? Number(m[1]) : 0;
  const mins = Number(m[2]);
  const secs = Number(m[3]);
  return { seconds: h * 3600 + mins * 60 + secs, stamp: v };
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : [];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function iso(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

type Row = {
  series: string;
  call_number: string | null;
  display_name: string | null;
  occurred_on: string | null;
  video_url: string | null;
  has_tldr: boolean | null;
  has_transcript: boolean | null;
  issue_number: number | null;
  tldr: Record<string, unknown> | null;
  key_decisions: Record<string, unknown> | null;
  transcript_vtt: string | null;
};

function toSummary(r: Row): CallSummary {
  const dec = Array.isArray(r.tldr?.decisions) ? (r.tldr!.decisions as Record<string, unknown>[]) : [];
  const headline = str(dec[0]?.decision) ?? str(r.tldr?.summary);
  return {
    series: r.series,
    number: r.call_number,
    displayName: r.display_name,
    date: iso(r.occurred_on),
    videoUrl: r.video_url,
    hasTldr: Boolean(r.has_tldr),
    hasTranscript: Boolean(r.has_transcript),
    decisions: dec.length,
    headline,
    title: callDisplayName({ series: r.series, call_number: r.call_number, display_name: r.display_name }),
  };
}

/** Every call, newest first. Read-only. */
export const getCalls = cachedOr<CallSummary[]>(
  async () => {
    const rows = await query<Row>(
      `SELECT series, call_number, display_name, occurred_on, video_url,
              has_tldr, has_transcript, issue_number, tldr
       FROM protocol_calls
       ORDER BY occurred_on DESC NULLS LAST`,
    );
    return rows.map(toSummary);
  },
  // Bump the key suffix when CallSummary's shape changes, so a warm cache from an
  // older shape (e.g. before `headline`) is invalidated instead of served stale.
  ["v5-calls-2"],
  [],
);

/** The most recent calls, for the home page or a rail. */
export async function getRecentCalls(limit = 6): Promise<CallSummary[]> {
  return (await getCalls()).slice(0, limit);
}

export interface SeriesOverview {
  series: string;
  label: string;
  short: string;
  group: CallSeriesMeta["group"];
  count: number;
  firstDate: string | null;
  lastDate: string | null;
  /** Median days between consecutive calls, or null when there is only one. */
  cadenceDays: number | null;
  /** The most recent call in the series. */
  latest: CallSummary | null;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000));
}

const GROUP_ORDER: CallSeriesMeta["group"][] = ["core", "breakout", "process", "other"];

/** Every series, with cadence and its latest call — the browse-by-series view. */
export async function getCallSeriesOverview(): Promise<SeriesOverview[]> {
  const calls = await getCalls();
  const bySeries = new Map<string, CallSummary[]>();
  for (const c of calls) {
    const arr = bySeries.get(c.series) ?? [];
    arr.push(c);
    bySeries.set(c.series, arr);
  }

  const rows: SeriesOverview[] = [];
  for (const [series, list] of bySeries) {
    // getCalls() is already sorted newest-first.
    const dated = list.filter((c) => c.date).map((c) => c.date!) as string[];
    const gaps: number[] = [];
    for (let i = 0; i < dated.length - 1; i++) gaps.push(daysBetween(dated[i], dated[i + 1]));
    const meta = CALL_SERIES[series];
    rows.push({
      series,
      label: callSeriesLabel(series),
      short: callSeriesShort(series),
      group: isOneOffSeries(series) ? "other" : meta?.group ?? "other",
      count: list.length,
      firstDate: dated.length ? dated[dated.length - 1] : null,
      lastDate: dated.length ? dated[0] : null,
      cadenceDays: median(gaps),
      latest: list[0] ?? null,
    });
  }

  return rows.sort((a, b) => {
    const g = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    if (g !== 0) return g;
    return (b.lastDate ?? "").localeCompare(a.lastDate ?? "");
  });
}

/** All calls in one series, newest first. */
export async function getSeriesCalls(series: string): Promise<CallSummary[]> {
  return (await getCalls()).filter((c) => c.series === series);
}

export function getCall(series: string, number: string): Promise<CallDetail | null> {
  return cachedOr<CallDetail | null>(
    async () => {
      const rows = await query<Row>(
        `SELECT series, call_number, display_name, occurred_on, video_url,
                has_tldr, has_transcript, issue_number, tldr, key_decisions, transcript_vtt
         FROM protocol_calls
         WHERE series = $1 AND call_number = $2
         LIMIT 1`,
        [series, number],
      );
      const r = rows[0];
      if (!r) return null;
      const t = r.tldr ?? {};

      const decisions: CallMoment[] = asArray(t.decisions).map((d) => ({
        text: str(d.decision) ?? "",
        ...parseStamp(d.timestamp),
      })).filter((d) => d.text);

      const actionItems: CallAction[] = asArray(t.action_items).map((a) => ({
        text: str(a.action) ?? "",
        owner: str(a.owner),
        ...parseStamp(a.timestamp),
      })).filter((a) => a.text);

      const targets: CallMoment[] = asArray(t.targets).map((g) => ({
        text: str(g.target) ?? "",
        ...parseStamp(g.timestamp),
      })).filter((g) => g.text);

      // Highlights arrive grouped by topic: { topic_slug: [{highlight, timestamp}] }.
      const rawHighlights = t.highlights && typeof t.highlights === "object" && !Array.isArray(t.highlights)
        ? (t.highlights as Record<string, unknown>)
        : {};
      const highlights: HighlightTopic[] = Object.entries(rawHighlights)
        .map(([topic, items]) => ({
          topic: prettyTopic(topic),
          items: asArray(items).map((h) => ({ text: str(h.highlight) ?? "", ...parseStamp(h.timestamp) })).filter((h) => h.text),
        }))
        .filter((h) => h.items.length > 0);

      const kd = r.key_decisions && typeof r.key_decisions === "object" ? r.key_decisions : {};
      const decisionRefs: CallDecisionRef[] = asArray((kd as Record<string, unknown>).key_decisions).map((d) => ({
        text: str(d.original_text) ?? str(d.context) ?? "",
        eips: Array.isArray(d.eips) ? (d.eips as unknown[]).map(Number).filter((n) => Number.isFinite(n)) : [],
        type: str(d.type),
        ...parseStamp(d.timestamp),
      })).filter((d) => d.text && d.eips.length > 0);

      const eipsDiscussed = [...new Set(decisionRefs.flatMap((d) => d.eips))].sort((a, b) => a - b);

      // ── By-EIP index: every moment that named a proposal, grouped by it ──
      // Title + canonical kind come from our own proposals data ("better data").
      const [proposals, agendaRows] = await Promise.all([
        getAllProposals(),
        query<{ eip_number: number; mentioned_by: string | null; snippet: string | null; source_url: string | null }>(
          `SELECT eip_number, mentioned_by, snippet, source_url
           FROM pm_agenda_eips WHERE series = $1 AND call_number = $2
           ORDER BY eip_number`,
          [series, number],
        ).catch(() => []),
      ]);
      const byNumber = new Map<number, { title: string; kind: "eip" | "erc" | "rip" }>();
      for (const p of proposals) if (!byNumber.has(p.number)) byNumber.set(p.number, { title: p.title, kind: p.kind as "eip" | "erc" | "rip" });
      const lookup = (num: number, hinted: "eip" | "erc" | "rip") => {
        const hit = byNumber.get(num);
        return { title: hit?.title ?? null, kind: hit?.kind ?? hinted };
      };

      const labeled: LabeledMoment[] = [
        ...decisions.map((d) => ({ ...d, label: "Decision" })),
        ...highlights.flatMap((h) => h.items.map((it) => ({ ...it, label: h.topic }))),
        ...actionItems.map((a) => ({ text: a.text, seconds: a.seconds, stamp: a.stamp, label: "Action" })),
        ...targets.map((g) => ({ ...g, label: "Target" })),
      ];
      const mentions = new Map<number, CallEipMention>();
      const touch = (num: number, hinted: "eip" | "erc" | "rip") => {
        if (!mentions.has(num)) {
          const { title, kind } = lookup(num, hinted);
          mentions.set(num, { number: num, kind, title, onAgenda: false, discussed: false, moments: [] });
        }
        return mentions.get(num)!;
      };
      for (const mo of labeled) {
        for (const ref of extractRefs(mo.text)) {
          const e = touch(ref.number, ref.kind);
          e.moments.push(mo);
          if (mo.label === "Decision") e.discussed = true;
        }
      }
      for (const n of eipsDiscussed) touch(n, "eip").discussed = true;

      const agendaByEip = new Map<number, { mentioned_by: string | null; snippet: string | null; source_url: string | null }>();
      for (const a of agendaRows) {
        touch(a.eip_number, "eip").onAgenda = true;
        if (!agendaByEip.has(a.eip_number)) agendaByEip.set(a.eip_number, a);
      }

      const eipMentions = [...mentions.values()]
        .map((e) => ({ ...e, discussed: e.discussed || e.moments.length >= 2 }))
        .sort((a, b) => Number(b.discussed) - Number(a.discussed) || b.moments.length - a.moments.length || a.number - b.number);

      const agenda: AgendaItem[] = [...agendaByEip.entries()].map(([num, a]) => {
        const { title, kind } = lookup(num, "eip");
        return { number: num, kind, title, mentionedBy: a.mentioned_by, snippet: cleanSnippet(a.snippet), url: a.source_url };
      }).sort((a, b) => a.number - b.number);

      return {
        series: r.series,
        number: r.call_number,
        title: callDisplayName({ series: r.series, call_number: r.call_number, display_name: r.display_name }),
        date: iso(r.occurred_on),
        videoUrl: r.video_url,
        youtubeId: youtubeId(r.video_url),
        issueNumber: r.issue_number,
        summary: str(t.summary),
        decisions,
        actionItems,
        targets,
        highlights,
        decisionRefs,
        eipsDiscussed,
        eipMentions,
        agenda,
        transcript: parseVtt(r.transcript_vtt),
        hasTranscript: Boolean(r.has_transcript),
      };
    },
    ["v5-call-4", series, number],
    null,
  )();
}

/** Append a &t=NNNs deep link to a YouTube URL so a timestamp jumps into the video. */
export function videoAt(url: string | null, seconds: number | null): string | null {
  if (!url) return null;
  if (seconds == null) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${seconds}s`;
}
