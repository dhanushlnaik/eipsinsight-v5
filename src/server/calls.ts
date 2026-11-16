import { query } from "@/lib/db";
import { cachedOr } from "@/lib/cache";
import { callDisplayName } from "@/data/call-series";

export interface CallSummary {
  series: string;
  number: string | null;
  displayName: string | null;
  date: string | null; // ISO yyyy-mm-dd
  videoUrl: string | null;
  hasTldr: boolean;
  hasTranscript: boolean;
  decisions: number;
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

export interface CallDetail {
  series: string;
  number: string | null;
  title: string;
  date: string | null;
  videoUrl: string | null;
  issueNumber: number | null;
  summary: string | null;
  decisions: CallMoment[];
  actionItems: CallAction[];
  targets: CallMoment[];
  decisionRefs: CallDecisionRef[];
  hasTranscript: boolean;
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
};

function toSummary(r: Row): CallSummary {
  const decisions = Array.isArray(r.tldr?.decisions) ? (r.tldr!.decisions as unknown[]).length : 0;
  return {
    series: r.series,
    number: r.call_number,
    displayName: r.display_name,
    date: iso(r.occurred_on),
    videoUrl: r.video_url,
    hasTldr: Boolean(r.has_tldr),
    hasTranscript: Boolean(r.has_transcript),
    decisions,
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
  ["v5-calls"],
  [],
);

/** The most recent calls, for the home page or a rail. */
export async function getRecentCalls(limit = 6): Promise<CallSummary[]> {
  return (await getCalls()).slice(0, limit);
}

export function getCall(series: string, number: string): Promise<CallDetail | null> {
  return cachedOr<CallDetail | null>(
    async () => {
      const rows = await query<Row>(
        `SELECT series, call_number, display_name, occurred_on, video_url,
                has_tldr, has_transcript, issue_number, tldr, key_decisions
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

      const kd = r.key_decisions && typeof r.key_decisions === "object" ? r.key_decisions : {};
      const decisionRefs: CallDecisionRef[] = asArray((kd as Record<string, unknown>).key_decisions).map((d) => ({
        text: str(d.original_text) ?? str(d.context) ?? "",
        eips: Array.isArray(d.eips) ? (d.eips as unknown[]).map(Number).filter((n) => Number.isFinite(n)) : [],
        type: str(d.type),
        ...parseStamp(d.timestamp),
      })).filter((d) => d.text && d.eips.length > 0);

      return {
        series: r.series,
        number: r.call_number,
        title: callDisplayName({ series: r.series, call_number: r.call_number, display_name: r.display_name }),
        date: iso(r.occurred_on),
        videoUrl: r.video_url,
        issueNumber: r.issue_number,
        summary: str(t.summary),
        decisions,
        actionItems,
        targets,
        decisionRefs,
        hasTranscript: Boolean(r.has_transcript),
      };
    },
    ["v5-call", series, number],
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
