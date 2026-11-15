import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { getQueue, type WaitingOn } from "@/server/queue";

export const revalidate = 300;
export const metadata: Metadata = { title: "Editorial queue" };

const PAGE_SIZE = 50;
const DAY = 864e5;

const WAITING: { key: WaitingOn; label: string; note: string; token: string }[] = [
  { key: "editor", label: "Waiting on editors", note: "An editor needs to review or merge.", token: "review" },
  { key: "author", label: "Waiting on authors", note: "The author needs to respond or push changes.", token: "draft" },
  { key: "draft", label: "Draft", note: "Opened as a draft, not ready for review.", token: "stagnant" },
];
const REPOS = [
  { key: "eips", label: "EIPs" },
  { key: "ercs", label: "ERCs" },
  { key: "rips", label: "RIPs" },
];

type Params = { waiting?: string; repo?: string; ci?: string; page?: string };

function days(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / DAY));
}

function waitLabel(d: number | null): string {
  if (d == null) return "";
  if (d < 1) return "today";
  if (d < 60) return `${d}d`;
  if (d < 730) return `${Math.round(d / 30)}mo`;
  return `${Math.round(d / 365)}y`;
}

export default async function QueuePage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const all = await getQueue();
  const now = Date.now();

  const waiting = WAITING.find((w) => w.key === sp.waiting)?.key ?? "editor";
  const repo = REPOS.find((r) => r.key === sp.repo)?.key ?? null;
  const ciOnly = sp.ci === "failing";

  const inRepo = all.filter((q) => !repo || q.repoShort === repo);
  const count = (w: WaitingOn) => inRepo.filter((q) => q.waitingOn === w).length;
  const inState = inRepo.filter((q) => q.waitingOn === waiting);
  const ciCount = inState.filter((q) => q.ciFailing).length;
  const rows = ciOnly ? inState.filter((q) => q.ciFailing) : inState;
  const repoCount = (r: string) => all.filter((q) => q.waitingOn === waiting && q.repoShort === r).length;

  const waits = rows.map((q) => days(q.since, now)).filter((d): d is number => d != null).sort((a, b) => a - b);
  const median = waits.length ? waits[Math.floor(waits.length / 2)] : null;
  const longest = waits.length ? waits[waits.length - 1] : null;
  const over30 = waits.filter((d) => d > 30).length;

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current = WAITING.find((w) => w.key === waiting)!;

  const href = (patch: Partial<Record<keyof Params, string | null>>) => {
    const cur: Record<string, string | null> = { waiting: waiting === "editor" ? null : waiting, repo, ci: ciOnly ? "failing" : null, page: null, ...patch };
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(cur)) if (v) next[k] = v;
    const qs = new URLSearchParams(next).toString();
    return qs ? `/queue?${qs}` : "/queue";
  };

  const figures = [
    { k: "In this view", v: rows.length.toLocaleString() },
    { k: "Median wait", v: median == null ? "None" : waitLabel(median) },
    { k: "Longest wait", v: longest == null ? "None" : waitLabel(longest) },
    { k: "Over 30 days", v: over30.toLocaleString() },
  ];

  return (
    <main>
      <PageHead
        eyebrow="Editorial process"
        title="Editorial queue"
        lead="Every open pull request across the EIP, ERC and RIP repositories, by who it is waiting on. The longest waits come first."
      >
        <dl className="mt-9 grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {figures.map((f, i) => (
            <div key={f.k} className={`py-5 ${i % 2 === 1 ? "border-l border-border pl-4 sm:pl-6" : ""} ${i >= 2 ? "border-t border-border sm:border-t-0" : ""} ${i === 2 ? "sm:border-l sm:pl-6" : ""}`}>
              <dt className="eyebrow">{f.k}</dt>
              <dd className="mt-2 font-serif text-[1.7rem] leading-none text-ink tnum sm:text-[2rem]">{f.v}</dd>
            </div>
          ))}
        </dl>
      </PageHead>

      <div className="wrap pt-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="eyebrow w-12 shrink-0">State</span>
            <div className="no-scrollbar -mr-5 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-5 sm:mr-0 sm:flex-wrap sm:pr-0">
              {WAITING.map((w) => (
                <Link key={w.key} href={href({ waiting: w.key === "editor" ? null : w.key })} className="chip shrink-0" data-active={waiting === w.key} data-token={w.token}>
                  <span className="size-2 rounded-[2px]" style={{ background: "var(--token)" }} />
                  {w.label} <span className="chip-n">{count(w.key).toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="eyebrow w-12 shrink-0">Repo</span>
            <div className="no-scrollbar -mr-5 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-5 sm:mr-0 sm:flex-wrap sm:pr-0">
              <Link href={href({ repo: null })} className="chip shrink-0" data-active={!repo}>All</Link>
              {REPOS.map((r) => (
                <Link key={r.key} href={href({ repo: repo === r.key ? null : r.key })} className="chip shrink-0" data-active={repo === r.key}>
                  {r.label} <span className="chip-n">{repoCount(r.key).toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
          {(ciCount > 0 || ciOnly) && (
            <div className="flex items-center gap-3">
              <span className="eyebrow w-12 shrink-0">CI</span>
              <div className="flex flex-wrap gap-2">
                <Link href={href({ ci: ciOnly ? null : "failing" })} className="chip" data-active={ciOnly} data-token="withdrawn">
                  <span className="size-2 rounded-[2px]" style={{ background: "var(--token)" }} />
                  Required checks failing <span className="chip-n">{ciCount.toLocaleString()}</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="section-head mt-10 flex items-baseline justify-between gap-4">
          <h2 className="t-h3 text-ink">{current.label}</h2>
          <span className="text-sm text-ink-muted">{current.note}</span>
        </div>

        {waiting === "author" && ciCount > 0 && !ciOnly && (
          <p className="mt-4 text-sm text-ink-muted">
            {ciCount.toLocaleString()} of these were approved by reviewers but are held by failing required checks, so they wait on the author rather than the editors.
          </p>
        )}

        {shown.length === 0 ? (
          <div className="card-quiet mt-5 p-8 text-center text-sm text-ink-muted">
            {all.length === 0 ? "The queue is unavailable right now." : "Nothing is waiting here."}
          </div>
        ) : (
          <div className="card mt-5 overflow-hidden">
            <div className="eyebrow hidden items-center gap-4 border-b border-border px-4 py-2.5 sm:flex">
              <span className="w-[6.5rem]">Pull request</span>
              <span className="flex-1">Title</span>
              <span className="hidden w-32 md:block">Author</span>
              <span className="w-14 text-right">Waiting</span>
            </div>
            <div className="ledger">
              {shown.map((q) => {
                const d = days(q.since, now);
                return (
                  <Link key={`${q.repoShort}-${q.number}`} href={`/pr/${q.repoShort}/${q.number}`} className="ledger-row gap-4 px-4" data-token={current.token}>
                    <span className="w-[6.5rem] shrink-0 font-mono text-[0.78rem]">
                      <span className="text-ink-faint">{q.repoShort.toUpperCase()} </span>
                      <span className="font-medium text-ink">#{q.number}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] text-ink">{q.title}</span>
                      {(q.ciFailing || q.reason) && (
                        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-faint">
                          {q.ciFailing && (
                            <span className="badge shrink-0" data-token="withdrawn" title={q.failingChecks.length ? `Failing: ${q.failingChecks.join(", ")}` : "Required CI checks are failing"}>
                              CI failing
                            </span>
                          )}
                          {q.reason && <span className="truncate">{q.reason}</span>}
                        </span>
                      )}
                    </span>
                    <span className="hidden w-32 shrink-0 truncate text-sm text-ink-muted md:block">{q.author ?? ""}</span>
                    <span className={`w-14 shrink-0 text-right font-mono text-[0.8rem] ${d != null && d > 30 ? "font-medium text-ink" : "text-ink-muted"}`}>{waitLabel(d)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
            {page > 1 ? (
              <Link href={href({ page: page - 1 === 1 ? null : String(page - 1) })} className="btn btn-outline"><ArrowLeft className="size-4" /> Previous</Link>
            ) : <span />}
            <span className="font-mono text-xs text-ink-faint">Page {page} of {pages}</span>
            {page < pages ? (
              <Link href={href({ page: String(page + 1) })} className="btn btn-outline">Next <ArrowRight className="size-4" /></Link>
            ) : <span />}
          </nav>
        )}
      </div>
    </main>
  );
}
