"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, FileText, Boxes, Users, GitPullRequest, X } from "lucide-react";
import { Badge } from "@/components/badge";
import { POPULAR } from "@/components/hit-row";
import { ResultGroups, groupHits } from "@/components/result-groups";
import { useSearch } from "@/lib/use-search";
import { SCOPES } from "@/lib/search-groups";
import { parseSwoop } from "@/lib/swoop";
import { tokenize } from "@/lib/utils";

export interface Movement {
  kind: string;
  number: number;
  title: string;
  to_status: string;
  when: string;
}

const JUMP = [
  { href: "/proposals", label: "Browse all proposals", icon: FileText },
  { href: "/upgrades", label: "Network upgrades", icon: Boxes },
  { href: "/people", label: "People", icon: Users },
  { href: "/queue", label: "Editorial queue", icon: GitPullRequest },
];

const EXAMPLES = ["4844", "account abstraction", "Pectra", "ERC-20", "vbuterin", "blob"];

/**
 * The hero search. Focus opens a panel that hangs off the field as one surface:
 * suggestions first, then grouped live results. A bare number jumps straight to
 * that proposal. Arrow keys move, Enter opens, Escape closes.
 */
export function CommandBar({ movements = [] }: { movements?: Movement[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [scope, setScope] = useState(0);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [example, setExample] = useState(EXAMPLES[0]);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const term = q.trim();
  const swoop = parseSwoop(q);
  const { hits, totals, loading, indexMissing, term: answered } = useSearch(q, SCOPES[scope].types);
  const found = Object.values(totals).reduce((a, b) => a + b, 0);

  // Keyboard order: the "Go to" row, then every result in group order.
  const flat = useMemo(() => [...(swoop ? [swoop.url] : []), ...groupHits(hits).flatMap((g) => g.hits.map((h) => h.url))], [swoop, hits]);

  // New results: put the cursor back on the best match.
  useEffect(() => setSel(0), [answered, scope]);

  // Close when the reader clicks anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // While idle, the placeholder types out things you could search for.
  useEffect(() => {
    if (q || open) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0;
    let chars = EXAMPLES[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const w = EXAMPLES[word];
      if (deleting) {
        chars -= 1;
        setExample(w.slice(0, chars));
        if (chars === 0) {
          deleting = false;
          word = (word + 1) % EXAMPLES.length;
          timer = setTimeout(tick, 300);
          return;
        }
        timer = setTimeout(tick, 30);
      } else {
        chars += 1;
        setExample(EXAMPLES[word].slice(0, chars));
        if (chars === EXAMPLES[word].length) {
          deleting = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 75);
      }
    };
    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const submit = () => {
    if (flat[sel]) router.push(flat[sel]);
    else if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSel((s) => Math.min(s + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const pick = (value: string) => {
    setQ(value);
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={boxRef} className="searchbox w-full" data-open={open}>
      <div className="searchbox-field">
        <Search className="size-5 shrink-0 text-ink-faint" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            // On a phone, bring the box to the top so the panel has room above the keyboard.
            if (window.innerWidth < 640) boxRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
          }}
          onKeyDown={onKeyDown}
          placeholder={open ? "Search proposals, people, upgrades" : `Try “${example}”`}
          aria-label="Search proposals, people and upgrades"
          role="combobox"
          aria-expanded={open}
          aria-controls="hero-search-panel"
          className="h-12 w-full min-w-0 bg-transparent text-[1.1rem] text-ink outline-none placeholder:text-ink-faint"
          spellCheck={false}
          autoComplete="off"
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-ink-faint" />}
        {q && !loading && (
          <button type="button" onClick={() => pick("")} aria-label="Clear search" className="grid size-7 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink">
            <X className="size-4" />
          </button>
        )}
        {!q && <kbd className="kbd hidden shrink-0 sm:inline-flex">⌘K</kbd>}
        <button type="button" onClick={submit} className="btn btn-primary h-12 shrink-0 px-3.5 sm:px-5" aria-label="Search">
          <span className="hidden sm:inline">Search</span>
          <ArrowRight className="size-4" />
        </button>
      </div>

      {open && (
        <div id="hero-search-panel" className="searchbox-panel text-left">
          {!term ? (
            /* ── Nothing typed yet: somewhere to start ── */
            <div className="stagger grid sm:grid-cols-[1fr_1.15fr]">
              <div className="p-5">
                <p className="eyebrow">Popular searches</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {POPULAR.map((p) => (
                    <button key={p} type="button" onClick={() => pick(p)} className="chip">{p}</button>
                  ))}
                </div>
                <p className="eyebrow mt-6">Jump to</p>
                <ul className="-mx-2 mt-2">
                  {JUMP.map((j) => (
                    <li key={j.href}>
                      <Link href={j.href} className="group flex items-center gap-3 rounded-md px-2 py-2 text-sm text-ink transition-colors hover:bg-surface-2">
                        <j.icon className="size-4 text-ink-faint" />
                        {j.label}
                        <ArrowRight className="ml-auto size-3.5 text-transparent transition-colors group-hover:text-ink-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {movements.length > 0 && (
                <div className="border-t border-border p-5 sm:border-l sm:border-t-0">
                  <p className="eyebrow flex items-center gap-2"><span className="live-dot" /> Just changed</p>
                  <ul className="ledger -mx-2 mt-2">
                    {movements.slice(0, 5).map((m) => (
                      <li key={`${m.kind}-${m.number}-${m.when}`}>
                        <Link href={`/${m.kind}/${m.number}`} className="ledger-row gap-3 px-2 py-2" data-token={tokenize(m.to_status)}>
                          <span className="w-10 shrink-0 font-mono text-[0.78rem] font-medium text-ink">{m.number}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{m.title}</span>
                          <Badge value={m.to_status} tip={false} className="shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* ── Typing: scope, instant jump, grouped results ── */
            <>
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5">
                {SCOPES.map((s, n) => (
                  <button key={s.key} type="button" onClick={() => setScope(n)} className="chip h-7 shrink-0 text-xs" data-active={scope === n} aria-pressed={scope === n}>
                    {s.label}
                  </button>
                ))}
                <span className="ml-auto shrink-0 pl-3 font-mono text-[0.68rem] text-ink-faint">
                  {loading && hits.length === 0 ? "searching" : `${found.toLocaleString()} result${found === 1 ? "" : "s"}`}
                </span>
              </div>

              <div ref={listRef} className="scroll-quiet max-h-[min(26rem,55vh)] overflow-y-auto">
                {swoop && (
                  <Link href={swoop.url} data-i={0} onMouseEnter={() => setSel(0)} className="ledger-row px-4" data-active={sel === 0}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand text-brand-ink"><ArrowRight className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.95rem] font-medium text-ink">Go to <span className="font-mono">{swoop.label}</span></span>
                      <span className="block text-xs text-ink-faint">Jump straight to this proposal</span>
                    </span>
                    <kbd className="kbd">↵</kbd>
                  </Link>
                )}

                {indexMissing ? (
                  <p className="px-5 py-6 text-sm text-ink-muted">
                    Search index not built yet. Run <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">bun run search:refresh</code>.
                  </p>
                ) : hits.length === 0 ? (
                  !swoop && (
                    <div className="px-5 py-10 text-center">
                      <p className="font-serif text-lg text-ink">{loading ? "Searching…" : "Nothing by that name"}</p>
                      {!loading && <p className="mt-1 text-sm text-ink-faint">Try a number, a title, or a GitHub handle.</p>}
                    </div>
                  )
                ) : (
                  <ResultGroups
                    hits={hits}
                    totals={totals}
                    term={term}
                    sel={sel}
                    onSelect={setSel}
                    offset={swoop ? 1 : 0}
                    onShowAll={(g) => router.push(`/search?q=${encodeURIComponent(term)}&type=${g}`)}
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-2 px-4 py-2.5 text-[0.7rem] text-ink-faint">
                <span className="hidden items-center gap-3 sm:flex">
                  <span><kbd className="kbd">↑↓</kbd> move</span>
                  <span><kbd className="kbd">↵</kbd> open</span>
                  <span><kbd className="kbd">esc</kbd> close</span>
                </span>
                <Link href={`/search?q=${encodeURIComponent(term)}`} className="ml-auto inline-flex items-center gap-1 font-medium text-ink-muted transition-colors hover:text-ink">
                  See everything for “{term}” <ArrowRight className="size-3" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
