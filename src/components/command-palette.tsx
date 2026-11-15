"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, FileText, Boxes, Users, GitPullRequest } from "lucide-react";
import { POPULAR } from "@/components/hit-row";
import { ResultGroups, groupHits } from "@/components/result-groups";
import { useSearch } from "@/lib/use-search";
import { parseSwoop } from "@/lib/swoop";

const JUMP = [
  { href: "/proposals", label: "Browse proposals", icon: FileText },
  { href: "/upgrades", label: "Network upgrades", icon: Boxes },
  { href: "/people", label: "People", icon: Users },
  { href: "/queue", label: "Editorial queue", icon: GitPullRequest },
];

/** Global ⌘K palette: the same search as the hero, reachable from every page. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const term = q.trim();
  const swoop = parseSwoop(q);
  const { hits, totals, loading, indexMissing, term: answered } = useSearch(open ? q : "");
  const flat = useMemo(() => [...(swoop ? [swoop.url] : []), ...groupHits(hits).flatMap((g) => g.hits.map((h) => h.url))], [swoop, hits]);

  useEffect(() => setSel(0), [answered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "") && !(e.target as HTMLElement)?.isContentEditable) {
        // "/" is the other universal search key. Ignore it while someone is typing.
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      document.body.style.overflow = "";
      setQ("");
      setSel(0);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[sel]) go(flat[sel]);
      else if (term) go(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[9vh] sm:pt-[14vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-[oklch(0.15_0.01_165/0.55)]" onClick={() => setOpen(false)} aria-hidden />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[0.75rem] border-[1.5px] border-ink bg-overlay shadow-[var(--shadow-overlay)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="size-5 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search proposals, people, pull requests"
            aria-label="Search"
            className="w-full bg-transparent text-[1.05rem] text-ink outline-none placeholder:text-ink-faint"
            spellCheck={false}
            autoComplete="off"
          />
          {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-ink-faint" /> : <kbd className="kbd">esc</kbd>}
        </div>

        {!term ? (
          <div className="px-5 py-5">
            <p className="eyebrow mb-3">Popular</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button key={p} type="button" onClick={() => setQ(p)} className="chip">{p}</button>
              ))}
            </div>
            <p className="eyebrow mb-1 mt-6">Jump to</p>
            <ul className="-mx-5">
              {JUMP.map((j) => (
                <li key={j.href}>
                  <button type="button" onClick={() => go(j.href)} className="ledger-row w-full px-5 py-2.5 text-sm text-ink">
                    <j.icon className="size-4 text-ink-faint" /> {j.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div ref={listRef} className="scroll-quiet max-h-[52vh] overflow-y-auto">
            {swoop && (
              <button type="button" data-i={0} onMouseEnter={() => setSel(0)} onClick={() => go(swoop.url)} className="ledger-row w-full px-5" data-active={sel === 0}>
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand text-brand-ink"><ArrowRight className="size-4" /></span>
                <span className="min-w-0 flex-1 text-left text-sm font-medium text-ink">Go to <span className="font-mono">{swoop.label}</span></span>
                <kbd className="kbd">↵</kbd>
              </button>
            )}
            {indexMissing ? (
              <p className="px-5 py-6 text-sm text-ink-muted">Search index not built yet.</p>
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
                onNavigate={() => setOpen(false)}
                onShowAll={(g) => go(`/search?q=${encodeURIComponent(term)}&type=${g}`)}
                offset={swoop ? 1 : 0}
                pad="px-5"
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border bg-surface-2 px-5 py-2.5 text-[0.7rem] text-ink-faint">
          <span className="hidden items-center gap-3 sm:flex">
            <span><kbd className="kbd">↑↓</kbd> move</span>
            <span><kbd className="kbd">↵</kbd> open</span>
          </span>
          {term ? (
            <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(term)}`)} className="ml-auto inline-flex items-center gap-1 font-medium text-ink-muted transition-colors hover:text-ink">
              See everything for “{term}” <ArrowRight className="size-3" />
            </button>
          ) : (
            <span className="ml-auto">Type a number to jump straight to a proposal</span>
          )}
        </div>
      </div>
    </div>
  );
}
