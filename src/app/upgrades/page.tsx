import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { getUpgradesList } from "@/server/stats";

export const revalidate = 300;
export const metadata: Metadata = { title: "Network upgrades" };

export default async function UpgradesPage() {
  const upgrades = await getUpgradesList();
  const tracked = upgrades.filter((u) => u.eips > 0);
  const rest = upgrades.filter((u) => u.eips === 0);

  return (
    <main>
      <PageHead
        eyebrow="Protocol deployment"
        title="Network upgrades"
        lead="Proposals reach mainnet inside network upgrades. Each one has a meta EIP and a list of what is included, scheduled, considered or declined."
      />

      <div className="wrap space-y-14 pt-12">
        {upgrades.length === 0 && <div className="card-quiet p-8 text-center text-sm text-ink-muted">Upgrade data is unavailable right now.</div>}

        {tracked.length > 0 && (
          <section>
            <div className="section-head flex items-baseline justify-between gap-4">
              <h2 className="t-h3 text-ink">With tracked composition</h2>
              <span className="font-mono text-xs text-ink-faint">{tracked.length}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {tracked.map((u) => (
                <Link key={u.slug} href={`/upgrade/${u.slug}`} className="card tile flex min-w-0 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="t-h2 min-w-0 text-ink">{u.name}</h3>
                    <ArrowUpRight className="tile-arrow mt-2 size-5 shrink-0" />
                  </div>
                  <div className="mt-8 flex items-center gap-3 border-t border-border pt-3 font-mono text-xs text-ink-faint">
                    {u.meta_eip ? <span className="text-ink-muted">Meta EIP-{u.meta_eip}</span> : <span>No meta EIP</span>}
                    <span className="ml-auto text-ink">{u.eips} EIPs tracked</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section>
            <div className="section-head flex items-baseline justify-between gap-4">
              <h2 className="t-h3 text-ink">{tracked.length > 0 ? "Other upgrades" : "All upgrades"}</h2>
              <span className="font-mono text-xs text-ink-faint">{rest.length}</span>
            </div>
            <div className="card ledger mt-5 overflow-hidden">
              {rest.map((u) => (
                <Link key={u.slug} href={`/upgrade/${u.slug}`} className="ledger-row">
                  <span className="min-w-0 flex-1 truncate font-serif text-[1.05rem] text-ink">{u.name}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-faint">{u.meta_eip ? `Meta EIP-${u.meta_eip}` : "No meta EIP"}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
