import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Github } from "lucide-react";
import { Badge } from "@/components/badge";
import { ProposalRow } from "@/components/proposal-row";
import { getContributor } from "@/server/contributor";
import { fmtDate } from "@/lib/format";

export const revalidate = 300;

// Nothing is prebuilt, but every page is cached after its first visit and refreshed
// every five minutes, instead of hitting the database on each request.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ actor: string }> }): Promise<Metadata> {
  const { actor } = await params;
  return { title: `@${decodeURIComponent(actor)}` };
}

export default async function ContributorPage({ params }: { params: Promise<{ actor: string }> }) {
  const { actor: raw } = await params;
  const actor = decodeURIComponent(raw);
  const c = await getContributor(actor);
  if (!c) notFound();

  const stats = [
    { label: "Score", value: c.totalScore },
    { label: "PRs opened", value: c.prsCreated },
    { label: "PRs merged", value: c.prsMerged },
    { label: "Reviews", value: c.reviews },
    { label: "Comments", value: c.comments },
    { label: "Commits", value: c.commits },
  ];

  return (
    <main>
      <header className="masthead masthead-shadow border-b border-border">
        <div className="wrap pt-10 sm:pt-14">
          <p className="eyebrow flex items-center gap-1.5">
            <Link href="/people" className="transition-colors hover:text-ink">People</Link>
            <ChevronRight className="size-3" />
            <span>Contributor</span>
          </p>

          <div className="mt-6 flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://github.com/${actor}.png?size=176`} alt="" width={88} height={88} className="size-[72px] shrink-0 rounded-full border border-border bg-surface-2 object-cover sm:size-[88px]" />
            <div className="min-w-0">
              <h1 className="t-h1 truncate text-ink">{actor}</h1>
              <a href={`https://github.com/${actor}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-mono text-sm text-ink-muted transition-colors hover:text-ink">
                <Github className="size-4" /> github.com/{actor}
              </a>
            </div>
          </div>

          {c.roles.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1">Roles</span>
              {c.roles.map((r) => (
                <Badge key={r.role} value={r.role.charAt(0) + r.role.slice(1).toLowerCase()} />
              ))}
            </div>
          )}

          <dl className="mt-9 grid grid-cols-3 border-t border-border lg:grid-cols-6">
            {stats.map((s, i) => (
              <div key={s.label} className={`py-5 ${i % 3 !== 0 ? "border-l border-border pl-4 sm:pl-6" : ""} ${i >= 3 ? "border-t border-border lg:border-t-0" : ""} ${i === 3 ? "lg:border-l lg:pl-6" : ""}`}>
                <dt className="eyebrow">{s.label}</dt>
                <dd className="mt-2 font-serif text-[1.6rem] leading-none text-ink tnum sm:text-[1.9rem]">{s.value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="wrap grid gap-x-14 gap-y-12 pt-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0">
          <div className="section-head flex items-baseline justify-between gap-4">
            <h2 className="t-h3 text-ink">Authored proposals</h2>
            <span className="font-mono text-xs text-ink-faint">{c.authored.length}</span>
          </div>
          {c.authored.length === 0 ? (
            <p className="mt-5 text-sm text-ink-faint">No authored proposals on record.</p>
          ) : (
            <div className="card ledger mt-5 overflow-hidden">
              {c.authored.map((a) => (
                <ProposalRow key={`${a.kind}-${a.number}`} kind={a.kind} number={a.number} title={a.title} />
              ))}
            </div>
          )}
        </section>

        <aside className="min-w-0">
          <div className="section-head">
            <h2 className="t-h3 text-ink">Activity</h2>
          </div>
          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">First seen</dt>
              <dd className="font-mono text-[0.8rem] text-ink">{fmtDate(c.firstActivity)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Last active</dt>
              <dd className="font-mono text-[0.8rem] text-ink">{fmtDate(c.lastActivity)}</dd>
            </div>
          </dl>

          {c.recent.length > 0 && (
            <>
              <p className="eyebrow mt-8">Recent</p>
              <ul className="ledger mt-3 border-y border-border">
                {c.recent.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 py-2.5 text-sm">
                    <span className="min-w-0 truncate capitalize text-ink-muted">{(a.action_type ?? "").replace(/_/g, " ")}</span>
                    {a.pr_number && a.repo && (
                      <Link href={`/pr/${a.repo.split("/").pop()!.toLowerCase()}/${a.pr_number}`} className="link shrink-0 font-mono text-[0.8rem]">#{a.pr_number}</Link>
                    )}
                    <span className="ml-auto shrink-0 font-mono text-xs text-ink-faint">{fmtDate(a.occurred_at)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
