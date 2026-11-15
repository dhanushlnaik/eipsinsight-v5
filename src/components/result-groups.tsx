"use client";

import Link from "next/link";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import { GROUPS } from "@/lib/search-groups";
import { HitBody, hitToken, type Hit } from "@/components/hit-row";

function groupOf(h: Hit): string {
  return h.group ?? (["eip", "erc", "rip"].includes(h.entity_type) ? "proposal" : h.entity_type);
}

const LABEL: Record<string, string> = Object.fromEntries(GROUPS.map((g) => [g.key, g.label]));

/** Hits bucketed by group, in the order the server ranked the groups.
 *  Flattening this gives the keyboard order. */
export function groupHits(hits: Hit[]) {
  const buckets = new Map<string, Hit[]>();
  for (const h of hits) {
    const k = groupOf(h);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(h);
  }
  return [...buckets.entries()].map(([key, list]) => ({ key, label: LABEL[key] ?? key, hits: list }));
}

/**
 * Grouped search results: a sticky label and total per group, rows as ledger lines,
 * and a way to see the rest when a group has more than its preview.
 * `offset` is the keyboard index of the first row (1 when a "Go to" row sits above).
 */
export function ResultGroups({
  hits,
  totals,
  term,
  sel,
  onSelect,
  onNavigate,
  onShowAll,
  offset = 0,
  dense = true,
  pad = "px-4",
}: {
  hits: Hit[];
  totals: Record<string, number>;
  term: string;
  sel?: number;
  onSelect?: (i: number) => void;
  onNavigate?: () => void;
  onShowAll?: (group: string) => void;
  offset?: number;
  dense?: boolean;
  pad?: string;
}) {
  let i = offset;
  return (
    <>
      {groupHits(hits).map((g) => {
        const total = totals[g.key] ?? g.hits.length;
        return (
          <section key={g.key}>
            <div className={`eyebrow sticky top-0 z-10 flex items-center justify-between gap-3 border-y border-border bg-surface-2 py-1.5 ${pad}`}>
              <span>
                {g.label} <span className="ml-1 text-ink-muted">{total.toLocaleString()}</span>
              </span>
              {onShowAll && total > g.hits.length && (
                <button type="button" onClick={() => onShowAll(g.key)} className="eyebrow inline-flex items-center gap-1 transition-colors hover:text-ink">
                  Show all <ArrowRight className="size-3" />
                </button>
              )}
            </div>
            {g.hits.map((h) => {
              const idx = i++;
              const active = sel === idx;
              return (
                <Link
                  key={`${h.entity_type}-${h.entity_id}`}
                  href={h.url}
                  data-i={idx}
                  onMouseEnter={onSelect ? () => onSelect(idx) : undefined}
                  onClick={onNavigate}
                  className={`ledger-row ${pad} ${dense ? "py-2.5" : ""}`}
                  data-token={hitToken(h)}
                  data-active={active}
                >
                  <HitBody hit={h} dense={dense} query={term} />
                  {sel !== undefined && <CornerDownLeft className={`hidden size-3.5 shrink-0 sm:block ${active ? "text-ink-muted" : "text-transparent"}`} />}
                </Link>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
