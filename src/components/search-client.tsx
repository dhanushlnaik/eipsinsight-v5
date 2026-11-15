"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, X } from "lucide-react";
import { HitBody, hitToken, POPULAR } from "@/components/hit-row";
import { ResultGroups, groupHits } from "@/components/result-groups";
import { useSearch } from "@/lib/use-search";
import { SCOPES } from "@/lib/search-groups";
import { parseSwoop } from "@/lib/swoop";

/** The full search page. The query and the scope both live in the URL, so a search can be shared. */
export function SearchClient({ initialQ, initialType }: { initialQ: string; initialType: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [scopeKey, setScopeKey] = useState(SCOPES.some((s) => s.key === initialType) ? initialType : "all");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scope = SCOPES.find((s) => s.key === scopeKey) ?? SCOPES[0];
  const term = q.trim();
  const swoop = parseSwoop(q);
  const { hits, totals, loading, indexMissing, term: answered } = useSearch(q, scope.types);
  // Counts for every scope come from an unscoped query, so the chips can show what each holds.
  const overall = useSearch(q, []);
  const found = scope.key === "all" ? Object.values(totals).reduce((a, b) => a + b, 0) : totals[scope.key] ?? hits.length;

  const ordered = useMemo(() => (scope.key === "all" ? groupHits(hits).flatMap((g) => g.hits) : hits), [hits, scope.key]);
  const flat = useMemo(() => [...(swoop ? [swoop.url] : []), ...ordered.map((h) => h.url)], [swoop, ordered]);

  useEffect(() => setSel(0), [answered, scopeKey]);

  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      if (scope.key !== "all") params.set("type", scope.key);
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");
    }, 200);
    return () => clearTimeout(id);
  }, [term, scope.key]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const offset = swoop ? 1 : 0;

  return (
    <div>
      <div className="searchbox-field">
        <Search className="size-5 shrink-0 text-ink-faint" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anything across Ethereum standards"
          aria-label="Search"
          className="h-12 w-full min-w-0 bg-transparent text-[1.1rem] text-ink outline-none placeholder:text-ink-faint"
          spellCheck={false}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, Math.max(flat.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter" && flat[sel]) {
              router.push(flat[sel]);
            }
          }}
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-ink-faint" />}
        {q && (
          <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} aria-label="Clear search" className="mr-1.5 grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {SCOPES.map((s) => {
          const n = s.key === "all" ? Object.values(overall.totals).reduce((a, b) => a + b, 0) : overall.totals[s.key];
          return (
            <button key={s.key} type="button" onClick={() => setScopeKey(s.key)} className="chip shrink-0" data-active={scope.key === s.key} aria-pressed={scope.key === s.key}>
              {s.label}
              {term && n !== undefined && n > 0 && <span className="chip-n">{n.toLocaleString()}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {indexMissing ? (
          <p className="text-sm text-ink-muted">Search index not built yet, run <code className="font-mono text-xs">bun run db:init</code> then <code className="font-mono text-xs">bun run search:refresh</code>.</p>
        ) : !term ? (
          <div>
            <p className="text-sm text-ink-muted">Search proposals, people, upgrades, pull requests and issues. A bare number jumps straight to that proposal.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1">Popular</span>
              {POPULAR.map((p) => (
                <button key={p} type="button" onClick={() => setQ(p)} className="chip">{p}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="eyebrow mb-3">
              {loading && hits.length === 0 ? "Searching" : `${found.toLocaleString()} result${found === 1 ? "" : "s"}`}
              {scope.key !== "all" && found > hits.length && <span className="ml-2 normal-case tracking-normal">showing the top {hits.length}</span>}
            </p>
            <div ref={listRef} className="card overflow-hidden">
              {swoop && (
                <a href={swoop.url} data-i={0} onMouseEnter={() => setSel(0)} className="ledger-row border-b border-border" data-active={sel === 0}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand text-brand-ink"><ArrowRight className="size-4" /></span>
                  <span className="min-w-0 flex-1 text-[0.95rem] font-medium text-ink">Go to <span className="font-mono">{swoop.label}</span></span>
                  <kbd className="kbd">↵</kbd>
                </a>
              )}
              {hits.length === 0 ? (
                !swoop && (
                  <div className="px-5 py-12 text-center">
                    <p className="font-serif text-xl text-ink">{loading ? "Searching…" : "Nothing by that name"}</p>
                    {!loading && (
                      <p className="mt-1.5 text-sm text-ink-faint">
                        Try a number, a title, or a GitHub handle
                        {scope.key !== "all" && <>, or <button type="button" onClick={() => setScopeKey("all")} className="link">search everything</button></>}.
                      </p>
                    )}
                  </div>
                )
              ) : scope.key === "all" ? (
                <ResultGroups hits={hits} totals={totals} term={term} sel={sel} onSelect={setSel} onShowAll={setScopeKey} offset={offset} dense={false} />
              ) : (
                <ul className="ledger">
                  {hits.map((h, i) => (
                    <li key={`${h.entity_type}-${h.entity_id}`}>
                      <a href={h.url} data-i={i + offset} onMouseEnter={() => setSel(i + offset)} className="ledger-row" data-token={hitToken(h)} data-active={sel === i + offset}>
                        <HitBody hit={h} query={term} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
