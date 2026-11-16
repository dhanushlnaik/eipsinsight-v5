import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, ExternalLink } from "lucide-react";
import { SectionHead } from "@/components/section-head";
import { ProposalRow } from "@/components/proposal-row";
import { Badge } from "@/components/badge";
import { getDevnet, type ClientRow } from "@/server/devnets";
import { seriesLabel } from "@/lib/devnet-series";
import { fmtDate } from "@/lib/format";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = await getDevnet(decodeURIComponent(id));
  return d ? { title: `${d.title ?? d.id}` } : { title: "Not found" };
}

function ClientTable({ title, rows }: { title: string; rows: ClientRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <div className="card ledger overflow-hidden">
        {rows.map((c) => (
          <div key={c.client} className="ledger-row" data-token={c.ready === true ? "final" : c.ready === false ? "draft" : undefined}>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink capitalize">{c.client}</span>
            {c.version && <span className="shrink-0 font-mono text-xs text-ink-muted">{c.version}</span>}
            {c.ready != null && <span className="badge shrink-0" data-token={c.ready ? "final" : "draft"}>{c.ready ? "Ready" : "Pending"}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DevnetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getDevnet(decodeURIComponent(id));
  if (!d) notFound();

  const hasClients = d.elClients.length > 0 || d.clClients.length > 0;
  const record = [
    { k: "Series", v: seriesLabel(d.series) },
    { k: "Genesis", v: d.genesis ? fmtDate(d.genesis) : "Not set" },
    { k: "Status", v: d.active ? "Active" : d.canceled ? "Canceled" : "Concluded" },
    { k: "EIPs in scope", v: String(d.eipCount) },
  ];

  return (
    <main>
      <header className="masthead masthead-shadow border-b border-border">
        <div className="wrap pt-7 sm:pt-9">
          <nav className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-ink-faint" aria-label="Breadcrumb">
            <Link href="/upgrades" className="transition-colors hover:text-ink">Upgrades</Link>
            <ChevronRight className="size-3" />
            <Link href="/upgrade/devnets" className="transition-colors hover:text-ink">Devnets</Link>
            <ChevronRight className="size-3" />
            <span className="text-ink-muted">{d.id}</span>
          </nav>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {d.active && <span className="badge" data-token="final"><span className="live-dot" /> Active</span>}
            {d.canceled && <span className="badge" data-token="withdrawn">Canceled</span>}
            <Link href={`/upgrade/devnets#${d.series}`} className="badge" data-token="draft">{seriesLabel(d.series)}</Link>
            {d.number != null && <span className="badge badge-plain">Devnet {d.number}</span>}
          </div>

          <h1 className="t-h1 mt-4 text-ink">{d.title ?? d.id}</h1>
          {d.sameSpecAs && <p className="mt-2 text-sm text-ink-muted">Shares its spec with <Link href={`/upgrade/devnets/${d.sameSpecAs}`} className="link">{d.sameSpecAs}</Link>.</p>}

          <dl className="mt-8 grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {record.map((f, i) => (
              <div key={f.k} className={`py-4 ${i % 2 === 1 ? "border-l border-border pl-4 sm:pl-6" : ""} ${i >= 2 ? "border-t border-border sm:border-t-0" : ""} ${i === 2 ? "sm:border-l sm:pl-6" : ""}`}>
                <dt className="eyebrow">{f.k}</dt>
                <dd className="mt-1.5 truncate text-sm text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="wrap space-y-16 pt-10 lg:pt-14">
        {d.announcements.length > 0 && (
          <section>
            <SectionHead index="01" label="From the launch notes" title="What this devnet is testing" />
            <ul className="mt-8 space-y-3">
              {d.announcements.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <SectionHead index={d.announcements.length ? "02" : "01"} label="Scope" title={d.sectionTitle ?? "EIPs in this devnet"} desc="The proposals this devnet puts under test." />
          {d.eips.length === 0 ? (
            <p className="mt-6 text-sm text-ink-faint">No EIPs are listed for this devnet.</p>
          ) : (
            <div className="card ledger mt-8 overflow-hidden">
              {d.eips.map((e) => (
                <ProposalRow
                  key={e.number}
                  kind="eip"
                  number={e.number}
                  title={e.title ?? "Untitled"}
                  meta={e.status ? <span className="hidden shrink-0 font-mono text-[0.7rem] uppercase tracking-wide text-ink-faint sm:block">{e.status}</span> : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {hasClients && (
          <section>
            <SectionHead label="Client support" title="Which clients are ready" />
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <ClientTable title="Execution clients" rows={d.elClients} />
              <ClientTable title="Consensus clients" rows={d.clClients} />
            </div>
          </section>
        )}

        {(d.specLinks.length > 0 || d.sourceUrl) && (
          <section className="border-t border-border pt-8">
            <p className="eyebrow mb-3">References</p>
            <div className="flex flex-wrap gap-3">
              {d.specLinks.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="btn btn-outline">{l.label} <ExternalLink className="size-3.5 text-ink-faint" /></a>
              ))}
              {d.sourceUrl && <a href={d.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-outline">ethPandaOps page <ExternalLink className="size-3.5 text-ink-faint" /></a>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
