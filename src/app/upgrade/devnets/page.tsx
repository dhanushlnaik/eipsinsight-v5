import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, ExternalLink } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { getDevnets, type DevnetSummary } from "@/server/devnets";
import { seriesLabel, SERIES_ORDER } from "@/lib/devnet-series";
import { fmtDate } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = { title: "Devnets" };

function DevnetRow({ d }: { d: DevnetSummary }) {
  return (
    <Link href={`/upgrade/devnets/${d.id}`} className="ledger-row px-2" data-token={d.active ? "final" : d.canceled ? "withdrawn" : "draft"}>
      <span className="w-16 shrink-0 font-mono text-[0.8rem] text-ink-faint">
        {d.number != null ? `Devnet ${d.number}` : "Devnet"}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="truncate text-[0.95rem] text-ink">{d.title ?? d.id}</span>
        {d.active && <span className="badge shrink-0" data-token="final">Active</span>}
        {d.canceled && <span className="badge shrink-0" data-token="withdrawn">Canceled</span>}
      </span>
      {d.genesis && <span className="hidden shrink-0 font-mono text-xs text-ink-faint sm:inline">{fmtDate(d.genesis)}</span>}
      <span className="w-16 shrink-0 text-right font-mono text-[0.8rem] text-ink">
        {d.sameSpecAs ? <span className="text-ink-faint">= {d.sameSpecAs.split("-").pop()}</span> : <>{d.eipCount} <span className="text-ink-faint">EIP{d.eipCount === 1 ? "" : "s"}</span></>}
      </span>
    </Link>
  );
}

export default async function DevnetsPage() {
  const all = await getDevnets();
  const bySeries = new Map<string, DevnetSummary[]>();
  for (const d of all) {
    if (!bySeries.has(d.series)) bySeries.set(d.series, []);
    bySeries.get(d.series)!.push(d);
  }
  const order = [...SERIES_ORDER.filter((s) => bySeries.has(s)), ...[...bySeries.keys()].filter((s) => !SERIES_ORDER.includes(s)).sort()];
  const active = all.filter((d) => d.active);

  return (
    <main>
      <PageHead
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Link href="/upgrades" className="transition-colors hover:text-ink">Upgrades</Link>
            <ChevronRight className="size-3" />
            <span>Devnets</span>
          </span>
        }
        title="Devnets"
        lead="Short-lived test networks where client teams try out an upgrade's EIPs before the public testnets. Specs are scraped from ethPandaOps."
      >
        {active.length > 0 && (
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Live now</span>
            {active.map((d) => (
              <Link key={d.id} href={`/upgrade/devnets/${d.id}`} className="chip" data-token="final">
                <span className="live-dot" /> {seriesLabel(d.series)} {d.number != null ? `#${d.number}` : ""}
              </Link>
            ))}
          </div>
        )}
      </PageHead>

      <div className="wrap space-y-12 pt-12">
        {all.length === 0 ? (
          <div className="card-quiet p-8 text-center text-sm text-ink-muted">
            No devnet specs are synced right now. The scheduler populates them from{" "}
            <a href="https://ethpandaops.io" target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">ethPandaOps <ExternalLink className="size-3" /></a>.
          </div>
        ) : (
          order.map((series) => {
            const entries = bySeries.get(series)!;
            return (
              <section key={series} id={series}>
                <div className="section-head flex items-baseline justify-between gap-4">
                  <h2 className="t-h3 text-ink">{seriesLabel(series)}</h2>
                  <span className="font-mono text-xs text-ink-faint">{entries.length} devnet{entries.length === 1 ? "" : "s"}</span>
                </div>
                <div className="card ledger mt-5 overflow-hidden">
                  {entries.map((d) => (
                    <DevnetRow key={d.id} d={d} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
