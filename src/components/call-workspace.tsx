"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock, ListChecks, Flag, Target, Sparkles, FileText, Youtube, MessageSquare } from "lucide-react";
import type { CallDetail, CallMoment } from "@/server/calls";

interface YTPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  getCurrentTime(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: { videoId: string; playerVars?: Record<string, number>; events?: { onReady?: () => void } }) => YTPlayer;
}
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

/** Load the YouTube IFrame API once, resolve when window.YT.Player exists. */
let ytReady: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve();
  if (ytReady) return ytReady;
  ytReady = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const poll = setInterval(() => {
      if ((window as YTWindow).YT?.Player) { clearInterval(poll); resolve(); }
    }, 200);
  });
  return ytReady;
}

/** A timestamp pill that seeks the embedded player (or links out when there is no embed). */
function Seek({ m, onSeek, href }: { m: Pick<CallMoment, "seconds" | "stamp">; onSeek: (s: number) => void; href: string | null }) {
  if (!m.stamp) return null;
  if (m.seconds == null) return <span className="shrink-0 font-mono text-[0.7rem] text-ink-faint">{m.stamp}</span>;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="chip shrink-0 gap-1 font-mono text-[0.7rem]" aria-label={`Watch at ${m.stamp}`}>
        <Clock className="size-3" /> {m.stamp}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => onSeek(m.seconds!)} className="chip shrink-0 gap-1 font-mono text-[0.7rem]" aria-label={`Jump to ${m.stamp}`}>
      <Clock className="size-3" /> {m.stamp}
    </button>
  );
}

function SectionTitle({ icon: Icon, children, count }: { icon: React.ElementType; children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-ink-muted" />
      <h2 className="t-h3 text-ink">{children}</h2>
      {count != null && <span className="font-mono text-xs text-ink-faint">{count}</span>}
    </div>
  );
}

export function CallWorkspace({ call }: { call: CallDetail }) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [now, setNow] = useState(0); // current playback seconds
  const embed = call.youtubeId;

  // Create the YouTube player once the API is ready.
  useEffect(() => {
    if (!embed || !mount.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    loadYouTubeApi().then(() => {
      if (cancelled || !mount.current) return;
      const YT = (window as YTWindow).YT!;
      player.current = new YT.Player(mount.current, {
        videoId: embed,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            timer = setInterval(() => {
              try { setNow(player.current?.getCurrentTime() ?? 0); } catch { /* not ready */ }
            }, 1000);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      player.current?.destroy?.();
      player.current = null;
    };
  }, [embed]);

  const seek = useCallback((seconds: number) => {
    const p = player.current;
    if (p?.seekTo) { p.seekTo(seconds, true); p.playVideo?.(); setNow(seconds); }
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("call-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // The moment currently playing: the latest timestamp at or before `now`.
  const allSeconds = useMemo(() => {
    const xs: number[] = [];
    for (const d of call.decisions) if (d.seconds != null) xs.push(d.seconds);
    for (const t of call.highlights) for (const h of t.items) if (h.seconds != null) xs.push(h.seconds);
    for (const a of call.actionItems) if (a.seconds != null) xs.push(a.seconds);
    for (const g of call.targets) if (g.seconds != null) xs.push(g.seconds);
    return xs.sort((a, b) => a - b);
  }, [call]);
  const activeSec = useMemo(() => {
    if (!embed || now <= 0) return null;
    let a: number | null = null;
    for (const s of allSeconds) { if (s <= now + 1) a = s; else break; }
    return a;
  }, [allSeconds, now, embed]);
  const isActive = (s: number | null) => s != null && s === activeSec;

  // The transcript follows playback on its own, finer timeline.
  const activeCue = useMemo(() => {
    if (!embed || now <= 0 || !call.transcript) return null;
    let a: number | null = null;
    for (const c of call.transcript) { if (c.seconds <= now + 1) a = c.seconds; else break; }
    return a;
  }, [call.transcript, now, embed]);

  const linkAt = (seconds: number | null) => {
    if (!call.videoUrl) return null;
    if (seconds == null) return call.videoUrl;
    const sep = call.videoUrl.includes("?") ? "&" : "?";
    return `${call.videoUrl}${sep}t=${seconds}s`;
  };
  const hrefFor = (seconds: number | null) => (embed ? null : linkAt(seconds));

  const hasBody =
    call.summary || call.highlights.length > 0 || call.decisions.length > 0 ||
    call.actionItems.length > 0 || call.targets.length > 0 || (call.transcript?.length ?? 0) > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ── Player column (sticky on desktop) ─────────────────── */}
      <div className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
        <div id="call-player" className="scroll-mt-[calc(var(--header-h)+1rem)]">
          {embed ? (
            <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black [&>iframe]:size-full">
              <div ref={mount} className="size-full" />
            </div>
          ) : (
            call.videoUrl && (
              <a href={call.videoUrl} target="_blank" rel="noreferrer" className="card tile flex aspect-video items-center justify-center gap-2 text-ink-muted">
                <Youtube className="size-5" /> Watch recording
              </a>
            )
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {call.videoUrl && (
              <a href={call.videoUrl} target="_blank" rel="noreferrer" className="btn inline-flex items-center gap-2 text-sm">
                <Youtube className="size-4" /> YouTube
              </a>
            )}
            {call.issueNumber != null && (
              <a href={`https://github.com/ethereum/pm/issues/${call.issueNumber}`} target="_blank" rel="noreferrer" className="btn inline-flex items-center gap-2 text-sm">
                <MessageSquare className="size-4" /> Agenda
              </a>
            )}
            {embed && <span className="ml-auto hidden font-mono text-[0.7rem] text-ink-faint sm:inline">Click any timestamp to jump</span>}
          </div>

          {call.eipsDiscussed.length > 0 && (
            <div className="mt-5">
              <p className="eyebrow mb-2">EIPs discussed</p>
              <div className="flex flex-wrap gap-1.5">
                {call.eipsDiscussed.map((n) => (
                  <Link key={n} href={`/eip/${n}`} className="chip font-mono text-[0.72rem] hover:border-ink">EIP-{n}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content column ────────────────────────────────────── */}
      <div className="min-w-0 space-y-10">
        {!hasBody && (
          <div className="card-quiet p-8 text-center text-sm text-ink-muted">No recap has been published for this call yet.</div>
        )}

        {call.summary && (
          <section>
            <SectionTitle icon={FileText}>Summary</SectionTitle>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-ink">{call.summary}</p>
          </section>
        )}

        {call.decisions.length > 0 && (
          <section>
            <SectionTitle icon={ListChecks} count={call.decisions.length}>Decisions</SectionTitle>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {call.decisions.map((d, i) => (
                <li key={i} className={`flex items-start gap-3 rounded px-1 py-3.5 transition-colors ${isActive(d.seconds) ? "bg-brand-soft" : ""}`}>
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  <p className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-ink">{d.text}</p>
                  <Seek m={d} onSeek={seek} href={hrefFor(d.seconds)} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {call.highlights.length > 0 && (
          <section>
            <SectionTitle icon={Sparkles} count={call.highlights.reduce((n, h) => n + h.items.length, 0)}>Highlights</SectionTitle>
            <div className="mt-4 space-y-6">
              {call.highlights.map((topic) => (
                <div key={topic.topic}>
                  <p className="eyebrow mb-2">{topic.topic}</p>
                  <ul className="space-y-1">
                    {topic.items.map((h, i) => (
                      <li key={i} className={`flex items-start gap-3 rounded-md px-1.5 py-1.5 transition-colors ${isActive(h.seconds) ? "bg-brand-soft" : ""}`}>
                        <p className="min-w-0 flex-1 text-[0.92rem] leading-relaxed text-ink-muted">{h.text}</p>
                        <Seek m={h} onSeek={seek} href={hrefFor(h.seconds)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {call.actionItems.length > 0 && (
          <section>
            <SectionTitle icon={Flag} count={call.actionItems.length}>Action items</SectionTitle>
            <ul className="mt-4 space-y-2.5">
              {call.actionItems.map((a, i) => (
                <li key={i} className={`card flex items-start gap-3 p-4 ${isActive(a.seconds) ? "ring-1 ring-brand" : ""}`}>
                  <div className="min-w-0 flex-1">
                    {a.owner && <p className="font-mono text-[0.72rem] uppercase tracking-wide text-ink-faint">{a.owner}</p>}
                    <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">{a.text}</p>
                  </div>
                  <Seek m={a} onSeek={seek} href={hrefFor(a.seconds)} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {call.targets.length > 0 && (
          <section>
            <SectionTitle icon={Target} count={call.targets.length}>Targets &amp; next up</SectionTitle>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {call.targets.map((t, i) => (
                <li key={i} className={`flex items-start gap-3 rounded px-1 py-3.5 transition-colors ${isActive(t.seconds) ? "bg-brand-soft" : ""}`}>
                  <p className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-ink">{t.text}</p>
                  <Seek m={t} onSeek={seek} href={hrefFor(t.seconds)} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {call.transcript && call.transcript.length > 0 && (
          <section>
            <SectionTitle icon={FileText} count={call.transcript.length}>Transcript</SectionTitle>
            <div className="mt-4 max-h-[32rem] overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {call.transcript.map((c, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => (embed ? seek(c.seconds) : undefined)}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2 ${activeCue === c.seconds ? "bg-brand-soft" : ""}`}
                    >
                      <span className="w-14 shrink-0 pt-0.5 font-mono text-[0.68rem] text-ink-faint">{c.stamp.replace(/\.\d+$/, "")}</span>
                      <span className="min-w-0 flex-1 text-[0.88rem] leading-relaxed">
                        {c.speaker && <span className="font-medium text-ink">{c.speaker}: </span>}
                        <span className="text-ink-muted">{c.text}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
