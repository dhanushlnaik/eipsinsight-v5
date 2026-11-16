"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock, ListChecks, Flag, Target, Sparkles, FileText, Youtube, MessageSquare, MessagesSquare, Boxes, CalendarDays } from "lucide-react";
import type { CallDetail, CallMoment, LabeledMoment, CallEipMention, AgendaItem, TranscriptCue, ChatMessage } from "@/server/calls";

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

function Heading({ id, icon: Icon, children, count }: { id: string; icon: React.ElementType; children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 scroll-mt-[calc(var(--header-h)+1.5rem)]" id={id}>
      <Icon className="size-4 text-ink-muted" />
      <h2 className="t-h3 text-ink">{children}</h2>
      {count != null && <span className="font-mono text-xs text-ink-faint">{count}</span>}
    </div>
  );
}

export function CallWorkspace({ call, transcript, chat }: { call: CallDetail; transcript: TranscriptCue[] | null; chat: ChatMessage[] | null }) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [now, setNow] = useState(0);
  const embed = call.youtubeId;

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

  const activeCue = useMemo(() => {
    if (!embed || now <= 0 || !transcript) return null;
    let a: number | null = null;
    for (const c of transcript) { if (c.seconds <= now + 1) a = c.seconds; else break; }
    return a;
  }, [transcript, now, embed]);

  const linkAt = (seconds: number | null) => {
    if (!call.videoUrl) return null;
    if (seconds == null) return call.videoUrl;
    const sep = call.videoUrl.includes("?") ? "&" : "?";
    return `${call.videoUrl}${sep}t=${seconds}s`;
  };
  const hrefFor = (seconds: number | null) => (embed ? null : linkAt(seconds));

  // The sections present, in reading order — drives the contents rail and scroll-spy.
  const sections = useMemo(() => {
    const s: { id: string; label: string; n?: number }[] = [];
    if (call.summary) s.push({ id: "tldr", label: "TL;DR" });
    if (call.decisions.length) s.push({ id: "decisions", label: "Decisions", n: call.decisions.length });
    if (call.eipMentions.length) s.push({ id: "eips", label: "By EIP", n: call.eipMentions.length });
    if (call.highlights.length) s.push({ id: "highlights", label: "Highlights", n: call.highlights.reduce((n, h) => n + h.items.length, 0) });
    if (call.actionItems.length) s.push({ id: "actions", label: "Action items", n: call.actionItems.length });
    if (call.targets.length) s.push({ id: "targets", label: "Targets", n: call.targets.length });
    if (call.agenda.length) s.push({ id: "agenda", label: "Agenda", n: call.agenda.length });
    if (transcript?.length) s.push({ id: "transcript", label: "Transcript", n: transcript.length });
    if (chat?.length) s.push({ id: "chat", label: "Chat", n: chat.length });
    return s;
  }, [call, transcript, chat]);

  // Scroll-spy: the active entry is the last section whose heading has passed
  // the trigger line below the sticky header.
  const [activeId, setActiveId] = useState<string>("");
  useEffect(() => {
    if (sections.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const trigger = (document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0) + 120;
      let best = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= trigger) best = s.id;
      }
      setActiveId(best);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sections]);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (sections.length === 0) {
    return <div className="card-quiet p-8 text-center text-sm text-ink-muted">No recap has been published for this call yet.</div>;
  }

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ── Player + contents rail (sticky on desktop) ────────── */}
      <aside className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
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
                <MessageSquare className="size-4" /> Agenda issue
              </a>
            )}
          </div>
        </div>

        {/* Contents rail — a quiet, persistent jump list with scroll-spy. */}
        <nav className="mt-6 hidden border-l border-border lg:block" aria-label="On this call">
          <p className="eyebrow mb-2 pl-4">On this call</p>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              aria-current={activeId === s.id ? "true" : undefined}
              className={`-ml-px flex w-full items-center gap-2 border-l-2 py-1.5 pl-4 text-left text-sm transition-colors ${
                activeId === s.id ? "border-brand font-medium text-ink" : "border-transparent text-ink-faint hover:text-ink-muted"
              }`}
            >
              <span className="flex-1 truncate">{s.label}</span>
              {s.n != null && <span className="font-mono text-[0.7rem] text-ink-faint">{s.n}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── One continuous recap ──────────────────────────────── */}
      <div className="min-w-0 space-y-12">
        {call.summary && (
          <section>
            <Heading id="tldr" icon={FileText}>TL;DR</Heading>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-ink">{call.summary}</p>
          </section>
        )}

        {call.decisions.length > 0 && (
          <section>
            <Heading id="decisions" icon={ListChecks} count={call.decisions.length}>Decisions</Heading>
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

        {call.eipMentions.length > 0 && (
          <section>
            <Heading id="eips" icon={Boxes} count={call.eipMentions.length}>By EIP</Heading>
            <p className="mt-2 text-sm text-ink-muted">Every proposal named on this call, with each moment it came up.</p>
            <div className="mt-4 space-y-3">
              {call.eipMentions.map((e) => <EipCard key={`${e.kind}-${e.number}`} e={e} isActive={isActive} seek={seek} hrefFor={hrefFor} />)}
            </div>
          </section>
        )}

        {call.highlights.length > 0 && (
          <section>
            <Heading id="highlights" icon={Sparkles} count={call.highlights.reduce((n, h) => n + h.items.length, 0)}>Highlights</Heading>
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
            <Heading id="actions" icon={Flag} count={call.actionItems.length}>Action items</Heading>
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
            <Heading id="targets" icon={Target} count={call.targets.length}>Targets &amp; next up</Heading>
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

        {call.agenda.length > 0 && (
          <section>
            <Heading id="agenda" icon={CalendarDays} count={call.agenda.length}>Agenda</Heading>
            <p className="mt-2 text-sm text-ink-muted">Proposals scheduled on the published agenda.</p>
            <div className="mt-4 space-y-3">
              {call.agenda.map((a) => <AgendaRow key={`${a.kind}-${a.number}`} a={a} />)}
            </div>
          </section>
        )}

        {transcript && transcript.length > 0 && (
          <section>
            <Heading id="transcript" icon={FileText} count={transcript.length}>Transcript</Heading>
            <div className="mt-4 rounded-lg border border-border">
              <ul className="max-h-[34rem] divide-y divide-border overflow-y-auto">
                {transcript.map((c, i) => (
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

        {chat && chat.length > 0 && (
          <section>
            <Heading id="chat" icon={MessagesSquare} count={chat.length}>Chat</Heading>
            <div className="mt-4 rounded-lg border border-border">
              <ul className="max-h-[34rem] space-y-3 overflow-y-auto p-4">
                {chat.map((m, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-14 shrink-0 pt-0.5 font-mono text-[0.68rem] text-ink-faint">{m.time ? m.time.replace(/\.\d+$/, "") : ""}</span>
                    <div className="min-w-0 flex-1">
                      {m.author && <span className="font-medium text-ink">{m.author}</span>}
                      <p className="text-[0.9rem] leading-relaxed text-ink-muted">{m.text}</p>
                    </div>
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

function EipCard({ e, isActive, seek, hrefFor }: {
  e: CallEipMention;
  isActive: (s: number | null) => boolean;
  seek: (s: number) => void;
  hrefFor: (s: number | null) => string | null;
}) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/${e.kind}/${e.number}`} className="font-mono text-[0.85rem] font-medium text-ink transition-colors hover:text-brand-strong">{e.kind.toUpperCase()}-{e.number}</Link>
        {e.title && <span className="min-w-0 flex-1 truncate text-[0.9rem] text-ink-muted">{e.title}</span>}
        <span className={`badge badge-plain shrink-0 ${e.discussed ? "" : "opacity-70"}`} data-token={e.discussed ? "final" : "draft"}>
          {e.discussed ? "Discussed" : "Mentioned"}
        </span>
        {e.onAgenda && <span className="badge badge-plain shrink-0" data-token="review">On agenda</span>}
      </div>
      {e.moments.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {e.moments.map((m, i) => (
            <li key={i} className={`flex items-start gap-3 rounded px-1 py-1.5 transition-colors ${isActive(m.seconds) ? "bg-brand-soft" : ""}`}>
              <span className="mt-0.5 shrink-0 font-mono text-[0.6rem] uppercase tracking-wide text-ink-faint">{m.label}</span>
              <p className="min-w-0 flex-1 text-[0.88rem] leading-relaxed text-ink-muted">{m.text}</p>
              <Seek m={m} onSeek={seek} href={hrefFor(m.seconds)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AgendaRow({ a }: { a: AgendaItem }) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <Link href={`/${a.kind}/${a.number}`} className="shrink-0 font-mono text-[0.8rem] font-medium text-ink transition-colors hover:text-brand-strong">{a.kind.toUpperCase()}-{a.number}</Link>
      <div className="min-w-0 flex-1">
        {a.title && <p className="text-[0.92rem] text-ink">{a.title}</p>}
        {a.mentionedBy && <p className="mt-0.5 font-mono text-[0.7rem] text-ink-faint">raised by @{a.mentionedBy}</p>}
        {a.snippet && <p className="mt-1.5 line-clamp-2 text-[0.82rem] leading-relaxed text-ink-faint">{a.snippet}</p>}
      </div>
      {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-[0.7rem] text-ink-faint underline-offset-2 hover:text-ink hover:underline">source</a>}
    </div>
  );
}
