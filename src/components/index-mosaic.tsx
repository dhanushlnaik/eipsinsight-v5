"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { tokenize } from "@/lib/utils";
import { statusVar } from "@/components/status-meter";

export interface MosaicItem {
  n: number;
  k: string;
  t: string;
  s: string | null;
}

/**
 * The Index: every proposal as one square, in number order, coloured by status.
 * Hover reads a square out, the legend isolates a status, a click opens the proposal.
 */
export function IndexMosaic({ items, legend }: { items: MosaicItem[]; legend: { status: string; n: number }[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const h = hover != null ? items[hover] : null;
  const active = filter ? legend.find((l) => tokenize(l.status) === filter) : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {legend.map((l) => {
          const token = tokenize(l.status);
          return (
            <button
              key={l.status}
              type="button"
              className="chip"
              data-active={filter === token}
              aria-pressed={filter === token}
              onClick={() => setFilter(filter === token ? null : token)}
            >
              <span className="size-2 rounded-[2px]" style={{ background: statusVar(l.status) }} />
              {l.status}
              <span className="chip-n">{l.n.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex min-h-6 items-center gap-3 text-sm" aria-live="polite">
        {h ? (
          <>
            <span className="shrink-0 font-mono text-[0.8rem] font-medium text-ink">{h.k.toUpperCase()}-{h.n}</span>
            <span className="min-w-0 truncate text-ink-muted">{h.t}</span>
            {h.s && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
                <span className="size-2 rounded-[2px]" style={{ background: statusVar(h.s) }} />
                {h.s}
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-faint">
            One square per proposal, in number order. <span className="hidden sm:inline">Hover to read one, click to open it.</span>
            <span className="sm:hidden">Tap one to open it.</span>
          </span>
        )}
      </div>

      <div
        className="mosaic mt-3"
        data-filter={filter ?? undefined}
        onMouseOver={(e) => {
          const i = (e.target as HTMLElement).dataset.i;
          if (i != null) setHover(Number(i));
        }}
        onMouseLeave={() => setHover(null)}
        onFocus={(e) => {
          const i = (e.target as HTMLElement).dataset.i;
          if (i != null) setHover(Number(i));
        }}
      >
        {items.map((p, i) => (
          <a
            key={`${p.k}-${p.n}`}
            href={`/${p.k}/${p.n}`}
            data-i={i}
            data-token={p.s ? tokenize(p.s) : undefined}
            aria-label={`${p.k.toUpperCase()}-${p.n}`}
            className="mosaic-cell"
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4 text-sm">
        <span className="font-mono text-xs text-ink-faint">{items.length.toLocaleString()} proposals</span>
        <Link
          href={active ? `/proposals?status=${encodeURIComponent(active.status)}` : "/proposals"}
          className="inline-flex items-center gap-1.5 font-medium text-ink transition-colors hover:text-brand-strong"
        >
          {active ? `Browse ${active.n.toLocaleString()} ${active.status}` : "Browse all proposals"} <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
