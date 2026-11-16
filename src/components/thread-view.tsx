import Link from "next/link";
import { ChevronRight, Github, GitPullRequest, CircleDot } from "lucide-react";
import { Badge } from "@/components/badge";
import { CopyLink } from "@/components/copy-link";
import { Avatar } from "@/components/avatar";
import { SectionHead } from "@/components/section-head";
import { ProposalRow } from "@/components/proposal-row";
import { MarkdownContent } from "@/components/markdown-content";
import { fmtDate, ago } from "@/lib/format";
import type { Thread } from "@/server/thread";

const humanize = (s: string) => {
  const t = s.replace(/[_-]+/g, " ").trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** A pull request or an issue: what it is, what it touches, who reviewed it, what it says. */
export function ThreadView({ t }: { t: Thread }) {
  const isPr = t.kind === "pr";
  const noun = isPr ? "Pull request" : "Issue";
  const Icon = isPr ? GitPullRequest : CircleDot;
  const ended = t.merged_at ?? t.closed_at;

  const record = [
    { k: "Opened", v: fmtDate(t.created_at) },
    t.state === "Open" ? { k: "Last activity", v: fmtDate(t.updated_at) } : { k: t.state, v: fmtDate(ended ?? t.updated_at) },
    isPr
      ? { k: "Size", v: t.commits != null || t.files != null ? `${t.commits ?? 0} commit${t.commits === 1 ? "" : "s"}, ${t.files ?? 0} file${t.files === 1 ? "" : "s"}` : "Not recorded" }
      : { k: "Repository", v: t.repo, mono: true },
    { k: "Discussion", v: `${t.comments} comment${t.comments === 1 ? "" : "s"}${isPr && t.reviewCount ? `, ${t.reviewCount} review${t.reviewCount === 1 ? "" : "s"}` : ""}` },
  ];

  const sections = [
    ...(t.proposals.length ? [{ id: "proposals", label: "Proposals" }] : []),
    ...(t.reviews.length ? [{ id: "reviews", label: "Reviews" }] : []),
    { id: "description", label: "Description" },
  ];
  const no = (id: string) => String(sections.findIndex((s) => s.id === id) + 1).padStart(2, "0");

  return (
    <main>
      <header className="masthead masthead-shadow border-b border-border">
        <div className="wrap">
          <div className="relative overflow-hidden pb-8 pt-7 sm:pt-9">
            <span aria-hidden className="ghost-numeral absolute -bottom-12 right-0 hidden md:block">{t.number}</span>
            <div className="relative">
              <nav className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-ink-faint" aria-label="Breadcrumb">
                <Link href="/" className="transition-colors hover:text-ink">Home</Link>
                <ChevronRight className="size-3" />
                <Link href={isPr ? "/queue" : "/search?type=issue"} className="transition-colors hover:text-ink">{isPr ? "Pull requests" : "Issues"}</Link>
                <ChevronRight className="size-3" />
                <span className="text-ink-muted">{t.repo} #{t.number}</span>
              </nav>

              <div className="mt-7 flex flex-wrap items-center gap-2">
                <Badge value={t.state} />
                <span className="badge badge-plain"><Icon className="size-3" /> {noun}</span>
                {t.labels.slice(0, 8).map((l) => (
                  <span key={l} className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.68rem] text-ink-muted">{l}</span>
                ))}
              </div>

              <h1 className="t-h1 mt-4 max-w-4xl text-ink">
                <span className="text-brand-strong">#{t.number}</span> {t.title}
              </h1>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
                {t.author ? (
                  <Link href={`/user/${t.author}`} className="group flex items-center gap-3">
                    <Avatar handle={t.author} label={t.author} px={28} className="size-7" />
                    <span className="text-sm text-ink-muted">
                      Opened by <span className="font-medium text-ink underline decoration-border-strong underline-offset-4 group-hover:decoration-ink">{t.author}</span>
                      {t.created_at && <span className="text-ink-faint"> · {ago(t.created_at)} ago</span>}
                    </span>
                  </Link>
                ) : <span />}
                <div className="flex items-center gap-2">
                  <a href={t.githubUrl} target="_blank" rel="noreferrer" className="btn btn-outline h-9 bg-surface px-3"><Github className="size-4" /> View on GitHub</a>
                  <CopyLink />
                </div>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {record.map((f, i) => (
              <div key={f.k} className={`py-4 ${i % 2 === 1 ? "border-l border-border pl-4 sm:pl-6" : ""} ${i >= 2 ? "border-t border-border sm:border-t-0" : ""} ${i === 2 ? "sm:border-l sm:pl-6" : ""}`}>
                <dt className="eyebrow">{f.k}</dt>
                <dd className={`mt-1.5 truncate text-sm text-ink ${"mono" in f && f.mono ? "font-mono text-[0.8rem]" : ""}`}>{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="wrap wrap-narrow space-y-16 pt-10 lg:pt-14">
        {t.waiting && (
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-[var(--c-review)] bg-surface-2 py-3 pl-4 pr-4 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{humanize(t.waiting.state)}</span>
            {t.waiting.since && <span>since {fmtDate(t.waiting.since)}</span>}
            {t.waiting.reason && <span className="text-ink-faint">{t.waiting.reason}</span>}
            {t.waiting.failingChecks.length > 0 && (
              <span className="basis-full text-ink-muted">
                Required checks failing:{" "}
                {t.waiting.failingChecks.map((c, i) => (
                  <span key={c}>{i > 0 && ", "}<span className="font-mono text-[0.8rem] text-ink">{c}</span></span>
                ))}
                . <a href={`${t.githubUrl}/checks`} target="_blank" rel="noreferrer" className="link">See the checks</a>
              </span>
            )}
          </p>
        )}

        {t.proposals.length > 0 && (
          <section id="proposals">
            <SectionHead index={no("proposals")} label="Scope" title={isPr ? "Proposals this touches" : "Proposals this mentions"} />
            <div className="card ledger mt-8 overflow-hidden">
              {t.proposals.map((p) => (
                <ProposalRow key={`${p.kind}-${p.number}`} kind={p.kind} number={p.number} title={p.title ?? "Untitled"} status={p.status} />
              ))}
            </div>
          </section>
        )}

        {t.reviews.length > 0 && (
          <section id="reviews">
            <SectionHead index={no("reviews")} label="Review" title="Who reviewed it" desc="The latest review from each reviewer." />
            <ul className="card ledger mt-8 overflow-hidden">
              {t.reviews.map((r) => (
                <li key={r.reviewer}>
                  <Link href={`/user/${r.reviewer}`} className="ledger-row">
                    <Avatar handle={r.reviewer} label={r.reviewer} px={28} className="size-7 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium text-ink">{r.reviewer}</span>
                    <Badge value={humanize(r.state)} tip={false} className="shrink-0" />
                    <span className="hidden w-24 shrink-0 text-right font-mono text-xs text-ink-faint sm:block">{fmtDate(r.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="description">
          <SectionHead index={no("description")} label="In the author's words" title="Description" />
          <div className="mt-8">
            {t.body ? (
              <MarkdownContent content={t.body} baseUrl={`https://github.com/${t.repo}/blob/master/`} trusted={false} />
            ) : (
              <div className="card-quiet p-6 text-sm text-ink-muted">
                No description was recorded for this {noun.toLowerCase()}. <a href={t.githubUrl} target="_blank" rel="noreferrer" className="link">Read it on GitHub</a>.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
