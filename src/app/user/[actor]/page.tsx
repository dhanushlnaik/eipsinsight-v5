import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Github } from "lucide-react";
import { Badge } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { ProfileTabs } from "@/components/profile-tabs";
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
      <header className="masthead border-b border-border">
        <div className="wrap pt-10 sm:pt-14">
          <p className="eyebrow flex items-center gap-1.5">
            <Link href="/people" className="transition-colors hover:text-ink">Contributors</Link>
            <ChevronRight className="size-3" />
            <span>Contributor</span>
          </p>

          <div className="mt-6 flex items-center gap-5">
            <Avatar handle={actor} label={actor} px={88} className="size-[72px] shrink-0 sm:size-[88px]" />
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

      <div className="wrap space-y-12 pt-12">
        {/* Span of activity + per-repo split */}
        <section>
          <p className="eyebrow">Active {fmtDate(c.firstActivity)} to {fmtDate(c.lastActivity)}</p>
          {c.repos.length > 1 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.repos.map((r) => (
                <div key={r.repo} className="card p-4">
                  <p className="truncate font-mono text-xs text-ink-faint">{r.repo}</p>
                  <p className="mt-1.5 font-serif text-[1.5rem] leading-none text-ink tnum">{r.score.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-ink-muted">{r.reviews.toLocaleString()} reviews · {r.comments.toLocaleString()} comments · {r.commits.toLocaleString()} commits</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contributions: sortable, tabbed */}
        <section>
          <div className="section-head">
            <h2 className="t-h3 text-ink">Contributions</h2>
            <p className="mt-2 text-sm text-ink-muted">Everything {c.actor} has authored, opened and reviewed. Click a column to sort.</p>
          </div>
          <div className="mt-6">
            <ProfileTabs authored={c.authored} pullRequests={c.pullRequests} reviews={c.reviewsList} />
          </div>
        </section>

        {/* Recent activity timeline */}
        {c.recent.length > 0 && (
          <section>
            <div className="section-head">
              <h2 className="t-h3 text-ink">Recent activity</h2>
            </div>
            <ul className="ledger mt-5 border-y border-border">
              {c.recent.map((a, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink-muted"><span className="capitalize text-ink">{(a.action_type ?? "activity").replace(/_/g, " ")}</span>{a.repo ? ` · ${a.repo}` : ""}</span>
                  {a.pr_number && a.repo && (
                    <Link href={`/pr/${a.repo.split("/").pop()!.toLowerCase()}/${a.pr_number}`} className="link shrink-0 font-mono text-[0.8rem]">#{a.pr_number}</Link>
                  )}
                  <span className="shrink-0 font-mono text-xs text-ink-faint">{fmtDate(a.occurred_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
