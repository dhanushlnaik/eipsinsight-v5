import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { allUpgrades, type UpgradeSummary } from "@/data/upgrades";
import { InclusionLadder } from "@/components/inclusion-ladder";
import { getRecentUpgradeChanges } from "@/server/upgrade";
import { getCurrentPhase } from "@/data/fork-schedule";
import { bucketToken, ago } from "@/lib/format";
import { Badge } from "@/components/badge";

export const revalidate = 300;
export const metadata: Metadata = { title: "Network upgrades" };

function year(date: string | null): string {
  return date ? date.slice(0, 4) : "TBD";
}
function monthDay(date: string | null): string {
  if (!date) return "Planned";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "Planned" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** A small layer indicator: execution, consensus, or both. */
function Layers({ u }: { u: UpgradeSummary }) {
  const el = u.executionName || u.era !== "upcoming";
  const cl = u.consensusName;
  return (
    <span className="hidden items-center gap-1.5 sm:inline-flex">
      {el && <span className="badge badge-plain" data-token="execution-layer">EL</span>}
      {cl && <span className="badge badge-plain" data-token="consensus-layer">CL</span>}
    </span>
  );
}

function Mascot({ u, className = "" }: { u: UpgradeSummary; className?: string }) {
  if (!u.mascot) return null;
  return (
    <span className={`tip inline-flex items-center ${className}`} data-tip={`Mascot: ${u.mascot.name}${u.mascot.eip ? ` (EIP-${u.mascot.eip})` : ""}`} aria-label={`Mascot: ${u.mascot.name}`}>
      <span aria-hidden>{u.mascot.emoji}</span>
    </span>
  );
}

export default async function UpgradesPage() {
  const all = allUpgrades();
  const changes = await getRecentUpgradeChanges();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = all.filter((u) => u.era === "upcoming");
  const history = all.filter((u) => u.era !== "upcoming");
  const totalEips = history.reduce((s, u) => s + u.eipCount, 0);

  return (
    <main>
      <PageHead
        eyebrow="Protocol deployment"
        title="Network upgrades"
        lead={`Every Ethereum network upgrade from Frontier to today: ${history.length} shipped forks carrying ${totalEips.toLocaleString()} EIPs onto mainnet, and the ones still being assembled.`}
      />

      <div className="wrap space-y-16 pt-12">
        {/* ── On the horizon ─────────────────────────────────── */}
        {horizon.length > 0 && (
          <section>
            <div className="section-head">
              <p className="eyebrow">On the horizon</p>
              <h2 className="t-h2 mt-5 text-ink">Being assembled now</h2>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {horizon.map((u) => (
                <Link key={u.slug} href={`/upgrade/${u.slug}`} className="card tile group flex min-w-0 flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="t-h2 text-ink">{u.name}</h3>
                        {u.mascot && <span className="text-2xl" aria-hidden>{u.mascot.emoji}</span>}
                      </div>
                      {(u.executionName || u.consensusName) && (
                        <p className="mt-1 font-mono text-xs text-ink-faint">
                          {[u.executionName, u.consensusName].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="badge shrink-0" data-token={u.status === "Upcoming" ? "last-call" : "draft"}>{getCurrentPhase(u.slug, today)?.label ?? u.status}</span>
                  </div>
                  {u.tagline && <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">{u.tagline}</p>}
                  <div className="mt-5 flex items-center gap-3 border-t border-border pt-3 font-mono text-xs text-ink-faint">
                    {u.metaEip ? <span className="text-ink-muted">Meta EIP-{u.metaEip}</span> : <span>Scope forming</span>}
                    {u.headliners.length > 0 && <span>{u.headliners.length} headliner{u.headliners.length === 1 ? "" : "s"}</span>}
                    <ArrowUpRight className="tile-arrow ml-auto size-4" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── How EIPs get into an upgrade ───────────────────── */}
        <section>
          <div className="section-head">
            <p className="eyebrow">The inclusion process</p>
            <h2 className="t-h2 mt-5 text-ink">How an EIP gets into an upgrade</h2>
            <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">
              Candidates climb a ladder of commitment as client teams agree to build them. Each stage on an upgrade page uses these labels.
            </p>
          </div>
          <div className="mt-8">
            <InclusionLadder />
          </div>
        </section>

        {/* ── Recent changes ─────────────────────────────────── */}
        {changes.length > 0 && (
          <section>
            <div className="section-head">
              <p className="eyebrow">Live from the editorial data</p>
              <h2 className="t-h2 mt-5 text-ink">Recent inclusion changes</h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">
                The latest moves of EIPs between inclusion stages across all upgrades being assembled.
              </p>
            </div>
            <ul className="ledger mt-8 border-y border-border">
              {changes.map((c) => (
                <li key={`${c.slug}-${c.eip_number}-${c.changed_at}-${c.bucket}`} className="ledger-row px-2" data-token={bucketToken(c.bucket)}>
                  <Link href={`/eip/${c.eip_number}`} className="w-14 shrink-0 font-mono text-[0.8rem] font-medium text-ink transition-colors hover:text-brand-strong">EIP-{c.eip_number}</Link>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-ink-faint">moved in </span>
                    {c.slug ? <Link href={`/upgrade/${c.slug}`} className="text-ink transition-colors hover:text-brand-strong">{c.upgradeName ?? c.slug}</Link> : <span className="text-ink">{c.upgradeName}</span>}
                  </span>
                  <Badge value={c.bucket} tip={false} className="shrink-0 first-letter:uppercase" />
                  <span className="w-8 shrink-0 text-right font-mono text-[0.7rem] text-ink-faint">{ago(c.changed_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── History timeline ───────────────────────────────── */}
        <section>
          <div className="section-head">
            <p className="eyebrow">Shipped</p>
            <h2 className="t-h2 mt-5 text-ink">The upgrade history</h2>
          </div>

          <ol className="mt-8">
            {history.map((u, i) => {
              const showYear = i === 0 || year(u.date) !== year(history[i - 1].date);
              return (
                <li key={u.slug}>
                  {showYear && (
                    <div className="sticky top-[var(--header-h)] z-10 -mx-1 bg-paper/95 py-2 backdrop-blur-sm">
                      <span className="font-mono text-xs font-medium text-ink-faint">{year(u.date)}</span>
                    </div>
                  )}
                  <Link href={`/upgrade/${u.slug}`} className="ledger-row gap-4 rounded-md px-2" data-token="final">
                    <span className="w-12 shrink-0 font-mono text-[0.78rem] text-ink-faint">{monthDay(u.date)}</span>
                    <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
                      <span className="truncate font-serif text-[1.15rem] text-ink">{u.name}</span>
                      {u.mascot && <span className="shrink-0 text-base" aria-hidden>{u.mascot.emoji}</span>}
                      {(u.executionName || u.consensusName) && u.name !== u.executionName && (
                        <span className="hidden shrink-0 truncate font-mono text-xs text-ink-faint md:inline">{[u.executionName, u.consensusName].filter(Boolean).join(" · ")}</span>
                      )}
                    </span>
                    <Layers u={u} />
                    <span className="w-16 shrink-0 text-right font-mono text-[0.8rem] text-ink">
                      {u.eipCount > 0 ? <>{u.eipCount} <span className="text-ink-faint">EIP{u.eipCount === 1 ? "" : "s"}</span></> : <span className="text-ink-faint">—</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </main>
  );
}
