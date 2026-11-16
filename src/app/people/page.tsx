import Link from "next/link";
import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { Avatar } from "@/components/avatar";
import { getTopContributors } from "@/server/proposals";
import { ago } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = { title: "Contributors" };

export default async function PeoplePage() {
  const people = await getTopContributors();

  return (
    <main>
      <PageHead
        eyebrow="Contributors"
        title="Contributors"
        lead="The authors, editors and reviewers who move Ethereum standards forward, ranked by contribution score across the EIP, ERC and RIP repositories."
      />

      <div className="wrap pt-12">
        <div className="section-head flex items-baseline justify-between gap-4">
          <h2 className="t-h3 text-ink">Most active</h2>
          <Link href="/search" className="eyebrow transition-colors hover:text-ink">Find someone by name</Link>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">Ranked by reviews and comments on the EIP, ERC and RIP repositories. Score is a weighted roll-up of that activity.</p>

        {people.length === 0 ? (
          <div className="card-quiet mt-5 p-8 text-center text-sm text-ink-muted">Contributor data is unavailable right now.</div>
        ) : (
          <div className="card mt-5 overflow-hidden">
            <div className="eyebrow flex items-center gap-4 border-b border-border px-4 py-2.5">
              <span className="w-7 text-right">#</span>
              <span className="flex-1">Contributor</span>
              <span className="w-16 text-right">Reviews</span>
              <span className="hidden w-20 text-right sm:block">Comments</span>
              <span className="hidden w-16 text-right md:block">Active</span>
              <span className="w-20 text-right">
                <span className="tip cursor-help border-b border-dotted border-border" data-tip="A weighted total of commits, pull requests, reviews and comments across the EIP, ERC and RIP repositories." tabIndex={0}>Score</span>
              </span>
            </div>
            <div className="ledger">
              {people.map((p, i) => (
                <Link key={p.actor} href={`/user/${p.actor}`} className="ledger-row gap-4 px-4">
                  <span className="w-7 shrink-0 text-right font-mono text-xs text-ink-faint">{i + 1}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar handle={p.actor} label={p.actor} px={28} className="size-7 shrink-0" />
                    <span className="truncate text-[0.95rem] font-medium text-ink">{p.actor}</span>
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-[0.85rem] font-medium text-ink">{p.reviews.toLocaleString()}</span>
                  <span className="hidden w-20 shrink-0 text-right font-mono text-[0.8rem] text-ink-muted sm:block">{p.comments.toLocaleString()}</span>
                  <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-ink-faint md:block">{p.last_activity ? ago(p.last_activity) : ""}</span>
                  <span className="w-20 shrink-0 text-right font-mono text-[0.8rem] text-ink-faint">{p.score.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
