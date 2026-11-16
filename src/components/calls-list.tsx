"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Youtube, ListChecks } from "lucide-react";
import type { CallSummary } from "@/server/calls";
import { callSeriesShort } from "@/data/call-series";
import { ago } from "@/lib/format";

function monthDay(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function year(date: string | null): string {
  return date ? date.slice(0, 4) : "—";
}

export function CallsList({ calls }: { calls: CallSummary[] }) {
  const [series, setSeries] = useState<string | null>(null);

  // Series filter chips, ordered by how many calls each has.
  const seriesOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of calls) counts.set(c.series, (counts.get(c.series) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ series: s, n }));
  }, [calls]);

  const shown = useMemo(() => (series ? calls.filter((c) => c.series === series) : calls), [calls, series]);

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setSeries(null)}
          data-active={series === null}
          aria-pressed={series === null}
          className="chip shrink-0"
        >
          All <span className="chip-n">{calls.length}</span>
        </button>
        {seriesOptions.map((o) => (
          <button
            key={o.series}
            type="button"
            onClick={() => setSeries(o.series)}
            data-active={series === o.series}
            aria-pressed={series === o.series}
            className="chip shrink-0"
          >
            {callSeriesShort(o.series)} <span className="chip-n">{o.n}</span>
          </button>
        ))}
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="ledger">
          {shown.map((c, i) => {
            const showYear = i === 0 || year(c.date) !== year(shown[i - 1].date);
            const href = c.number ? `/calls/${c.series}/${c.number}` : c.videoUrl ?? "#";
            const external = !c.number;
            const Row = (
              <>
                <span className="w-12 shrink-0 font-mono text-[0.78rem] text-ink-faint">{monthDay(c.date)}</span>
                <span className="w-16 shrink-0">
                  <span className="chip">{callSeriesShort(c.series)}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.95rem] text-ink">{c.title}</span>
                {c.decisions > 0 && (
                  <span className="hidden w-24 shrink-0 items-center justify-end gap-1.5 font-mono text-[0.75rem] text-ink-faint sm:flex">
                    <ListChecks className="size-3.5" /> {c.decisions} decision{c.decisions === 1 ? "" : "s"}
                  </span>
                )}
                {c.videoUrl && <Youtube className="size-4 shrink-0 text-ink-faint" aria-label="Recording available" />}
                <span className="hidden w-10 shrink-0 text-right font-mono text-[0.7rem] text-ink-faint md:block">{ago(c.date)}</span>
              </>
            );
            return (
              <div key={`${c.series}-${c.number ?? i}`}>
                {showYear && (
                  <div className="sticky top-[var(--header-h)] z-10 border-b border-border bg-paper/95 px-4 py-1.5 backdrop-blur-sm">
                    <span className="font-mono text-xs font-medium text-ink-faint">{year(c.date)}</span>
                  </div>
                )}
                {external ? (
                  <a href={href} target="_blank" rel="noreferrer" className="ledger-row gap-3 px-4">{Row}</a>
                ) : (
                  <Link href={href} className="ledger-row gap-3 px-4">{Row}</Link>
                )}
              </div>
            );
          })}
        </div>
        {shown.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-muted">No calls in this series.</div>
        )}
      </div>
    </div>
  );
}
