import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, ExternalLink, ArrowUpRight, Boxes } from "lucide-react";
import { SectionHead } from "@/components/section-head";
import { Badge } from "@/components/badge";
import { ProposalRow } from "@/components/proposal-row";
import { getUpgradeDetail } from "@/server/upgrade";
import { bucketToken, fmtDate } from "@/lib/format";
import { meaningFor } from "@/lib/meanings";
import { tokenize } from "@/lib/utils";
import type { UpgradeEip } from "@/data/upgrades";
import { UpgradeSchedule } from "@/components/upgrade-schedule";
import { FORK_SCHEDULE_CONFIGS, getCurrentPhase } from "@/data/fork-schedule";
import { getDevnets } from "@/server/devnets";
import { seriesLabel } from "@/lib/devnet-series";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const u = await getUpgradeDetail(decodeURIComponent(slug));
  return u ? { title: `${u.name} upgrade`, description: u.tagline ?? u.description ?? undefined } : { title: "Not found" };
}

const LAYER_LABEL = { execution: "Execution layer", consensus: "Consensus layer" } as const;

export default async function UpgradePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const u = await getUpgradeDetail(decodeURIComponent(slug));
  if (!u) notFound();

  const forks = [u.executionName, u.consensusName].filter(Boolean).join(" · ");
  const series = new Set([u.slug, ...(u.devnetSeries ?? [])]);
  const devnets = u.status === "Live" ? [] : (await getDevnets()).filter((d) => series.has(d.series));
  const hasBuckets = u.buckets.length > 0;
  const hasSchedule = FORK_SCHEDULE_CONFIGS.some((c) => c.slug === u.slug);
  const phase = u.status !== "Live" ? getCurrentPhase(u.slug, new Date().toISOString().slice(0, 10)) : null;

  // Shipped EIPs grouped by layer; a single group collapses to one list.
  const byLayer: { key: string; label: string; eips: UpgradeEip[] }[] = (["execution", "consensus"] as const)
    .map((layer) => ({ key: layer, label: LAYER_LABEL[layer], eips: u.eips.filter((e) => e.layer === layer) }))
    .filter((g) => g.eips.length > 0);

  const record = [
    { k: u.status === "Live" ? "Activated" : u.date ? "Targeted" : "Status", v: u.date ? fmtDate(u.date) : u.status },
    { k: "Block", v: u.block ? u.block.toLocaleString() : "—", mono: true },
    { k: "Fork epoch", v: u.epoch != null ? u.epoch.toLocaleString() : "—", mono: true },
    { k: "EIPs", v: (u.eipCount || u.dbTotal || 0).toLocaleString() },
  ];

  const sections = [
    ...(u.headliners.length ? [{ id: "headliners", label: "Headliners" }] : []),
    ...(hasSchedule ? [{ id: "roadmap", label: "Roadmap" }] : []),
    ...(devnets.length ? [{ id: "devnets", label: "Devnets" }] : []),
    ...(u.earlyResults ? [{ id: "results", label: "Early results" }] : []),
    { id: "eips", label: "Included EIPs" },
    ...(u.nameOriginDetails || u.nameOrigin ? [{ id: "name", label: "The name" }] : []),
  ];
  const no = (id: string) => String(sections.findIndex((s) => s.id === id) + 1).padStart(2, "0");

  return (
    <main>
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="masthead masthead-shadow border-b border-border">
        <div className="wrap pt-7 sm:pt-9">
          <nav className="flex items-center gap-1.5 font-mono text-xs text-ink-faint" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-ink">Home</Link>
            <ChevronRight className="size-3" />
            <Link href="/upgrades" className="transition-colors hover:text-ink">Upgrades</Link>
            <ChevronRight className="size-3" />
            <span className="text-ink-muted">{u.name}</span>
          </nav>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span className="badge" data-token={u.status === "Live" ? "final" : u.status === "Upcoming" ? "last-call" : "draft"}>{u.status}</span>
            {u.executionName && <span className="badge badge-plain" data-token="execution-layer">Execution</span>}
            {u.consensusName && <span className="badge badge-plain" data-token="consensus-layer">Consensus</span>}
            {u.metaEip && (
              <Link href={`/eip/${u.metaEip}`} className="badge tip" data-token="meta" data-tip="The meta EIP that defines this upgrade.">Meta EIP-{u.metaEip}</Link>
            )}
          </div>

          <div className="mt-4 flex items-start gap-4">
            {u.mascot && (
              <span className="tip mt-1 hidden text-5xl leading-none sm:block" data-tip={`Mascot: ${u.mascot.name}`} aria-label={`Mascot: ${u.mascot.name}`}>
                <span aria-hidden>{u.mascot.emoji}</span>
              </span>
            )}
            <div className="min-w-0">
              <h1 className="t-h1 text-ink">
                {u.mascot && <span className="mr-2 text-3xl sm:hidden" aria-hidden>{u.mascot.emoji}</span>}
                {u.name}
              </h1>
              {forks && <p className="mt-1.5 font-mono text-sm text-ink-faint">{forks}{u.mascot ? <span className="ml-2 text-ink-muted">· {u.mascot.name}</span> : null}</p>}
            </div>
          </div>

          {(u.tagline || u.description) && <p className="t-lead mt-5 max-w-2xl">{u.tagline ?? u.description}</p>}

          {phase && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-muted">
              <span className="live-dot" /> Currently in <span className="font-medium text-ink">{phase.label}</span>, targeting {phase.targetYear}.
            </p>
          )}

          <dl className="mt-8 grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {record.map((f, i) => (
              <div key={f.k} className={`py-4 ${i % 2 === 1 ? "border-l border-border pl-4 sm:pl-6" : ""} ${i >= 2 ? "border-t border-border sm:border-t-0" : ""} ${i === 2 ? "sm:border-l sm:pl-6" : ""}`}>
                <dt className="eyebrow">{f.k}</dt>
                <dd className={`mt-1.5 truncate text-sm text-ink ${"mono" in f && f.mono ? "font-mono text-[0.8rem]" : ""}`}>{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="wrap space-y-16 pt-10 lg:pt-14">
        {/* Headliners */}
        {u.headliners.length > 0 && (
          <section id="headliners">
            <SectionHead index={no("headliners")} label="What it is for" title={u.headliners.length === 1 ? "The headliner" : "Headliners"} desc="The marquee changes this upgrade is built around." />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {u.headliners.map((h) => (
                <Link key={h.eip} href={`/eip/${h.eip}`} className="card tile group flex min-w-0 flex-col p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-brand-strong">EIP-{h.eip}</span>
                    <ArrowUpRight className="tile-arrow size-4" />
                  </div>
                  <h3 className="mt-2 font-serif text-[1.15rem] leading-tight text-ink">{h.title}</h3>
                  {h.note && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{h.note}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Roadmap (upcoming upgrades) */}
        {hasSchedule && (
          <section id="roadmap">
            <SectionHead index={no("roadmap")} label="The plan" title="Roadmap to mainnet" desc="Scoping, devnets, public testnets and the projected mainnet activation." />
            <div className="mt-8">
              <UpgradeSchedule slug={u.slug} />
            </div>
          </section>
        )}

        {/* Devnets */}
        {devnets.length > 0 && (
          <section id="devnets">
            <SectionHead
              index={no("devnets")}
              label="Where it is being tested"
              title="Devnets"
              desc="Short-lived networks client teams use to try this upgrade's EIPs before the public testnets."
              action={<Link href="/upgrade/devnets" className="eyebrow inline-flex items-center gap-1 transition-colors hover:text-ink">All devnets <ArrowUpRight className="size-3" /></Link>}
            />
            <div className="card ledger mt-8 overflow-hidden">
              {devnets.slice(0, 10).map((d) => (
                <Link key={d.id} href={`/upgrade/devnets/${d.id}`} className="ledger-row px-2" data-token={d.active ? "final" : d.canceled ? "withdrawn" : "draft"}>
                  <span className="w-16 shrink-0 font-mono text-[0.8rem] text-ink-faint">{d.number != null ? `Devnet ${d.number}` : "Devnet"}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="truncate text-[0.95rem] text-ink">{d.title ?? d.id}</span>
                    {d.series !== u.slug && <span className="badge badge-plain shrink-0">{seriesLabel(d.series)}</span>}
                    {d.active && <span className="badge shrink-0" data-token="final">Active</span>}
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-[0.8rem] text-ink">{d.eipCount} <span className="text-ink-faint">EIPs</span></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Early results (curated) */}
        {u.earlyResults && (
          <section id="results">
            <SectionHead index={no("results")} label="What shipped" title="Early results" desc={`Measured on ${u.earlyResults.network}, ${u.earlyResults.activatedAt}.`} />
            <p className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">{u.earlyResults.summary}</p>
            <div className="mt-6 space-y-4">
              {u.earlyResults.outcomes.map((o) => (
                <div key={o.eip} className="card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/eip/${o.eip}`} className="font-mono text-xs text-brand-strong hover:underline">EIP-{o.eip}</Link>
                    <span className="font-serif text-[1.05rem] text-ink">{o.name}</span>
                    <span className="badge badge-plain" data-token={o.layer === "EL" ? "execution-layer" : "consensus-layer"}>{o.layer}</span>
                  </div>
                  <p className="mt-2.5 text-sm text-ink-muted"><span className="font-medium text-ink">Intended.</span> {o.intended}</p>
                  <p className="mt-1.5 text-sm text-ink-muted"><span className="font-medium text-ink">Early result.</span> {o.earlyResult}</p>
                  {o.links && o.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {o.links.map((l) => (
                        <a key={l.href} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="link inline-flex items-center gap-1 text-xs">{l.label}{l.href.startsWith("http") && <ExternalLink className="size-3" />}</a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-faint">{u.earlyResults.caveat}</p>
          </section>
        )}

        {/* Included EIPs — live buckets if the scope is still forming, else the shipped set */}
        <section id="eips">
          <SectionHead
            index={no("eips")}
            label="Composition"
            title={hasBuckets ? "Proposed and included EIPs" : "Included EIPs"}
            desc={hasBuckets ? "Where each candidate stands in the inclusion process, live from the editorial data." : u.eipCount > 0 ? "Everything that shipped in this upgrade, by layer." : "Composition is not tracked for this upgrade yet."}
          />

          {hasBuckets ? (
            <div className="mt-8 space-y-10">
              {u.buckets.map((b) => (
                <div key={b.bucket}>
                  <div className="section-head flex items-baseline justify-between gap-4">
                    <h3 className="t-h3 text-ink first-letter:uppercase">{b.bucket}</h3>
                    <span className="font-mono text-xs text-ink-faint">{b.eips.length} EIP{b.eips.length === 1 ? "" : "s"}</span>
                  </div>
                  {meaningFor(b.bucket) && <p className="mt-1.5 text-sm text-ink-muted">{meaningFor(b.bucket)}</p>}
                  <div className="card ledger mt-5 overflow-hidden" data-token={bucketToken(b.bucket)}>
                    {b.eips.map((e) => (
                      <ProposalRow key={e.eip_number} kind="eip" number={e.eip_number} title={e.title ?? "Untitled"} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : byLayer.length > 0 ? (
            <div className="mt-8 space-y-10">
              {byLayer.map((g) => (
                <div key={g.key}>
                  <div className="section-head flex items-baseline justify-between gap-4">
                    <h3 className="t-h3 text-ink">{g.label}</h3>
                    <span className="font-mono text-xs text-ink-faint">{g.eips.length} EIP{g.eips.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="card ledger mt-5 overflow-hidden" data-token={g.key === "execution" ? "execution-layer" : "consensus-layer"}>
                    {g.eips.map((e) => (
                      <ProposalRow
                        key={e.number}
                        kind="eip"
                        number={e.number}
                        title={e.title}
                        meta={<span className="hidden shrink-0 sm:block"><Badge value={e.category} tip={false} /></span>}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-quiet mt-8 p-6 text-sm text-ink-muted">
              EIP composition is not tracked for this upgrade yet{u.metaEip ? <>. The <Link href={`/eip/${u.metaEip}`} className="link">meta EIP</Link> lists what it contains.</> : "."}
            </div>
          )}
        </section>

        {/* Name origin */}
        {(u.nameOriginDetails || u.nameOrigin) && (
          <section id="name">
            <SectionHead index={no("name")} label="Etymology" title="Where the name comes from" />
            <div className="card mt-8 p-6">
              {u.nameOriginDetails ? (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                  <div>
                    <p className="eyebrow" data-token="execution-layer">Execution</p>
                    <p className="mt-1.5 font-serif text-xl text-ink">{u.nameOriginDetails.elName}</p>
                    <p className="text-xs text-ink-faint">{u.nameOriginDetails.elHighlight}</p>
                  </div>
                  <span className="font-serif text-2xl text-ink-faint">+</span>
                  <div>
                    <p className="eyebrow" data-token="consensus-layer">Consensus</p>
                    <p className="mt-1.5 font-serif text-xl text-ink">{u.nameOriginDetails.clName}</p>
                    <p className="text-xs text-ink-faint">{u.nameOriginDetails.clHighlight}</p>
                  </div>
                  <span className="font-serif text-2xl text-ink-faint">=</span>
                  <p className="font-serif text-2xl text-brand-strong">{u.name}</p>
                </div>
              ) : null}
              {u.nameOrigin && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">{u.nameOrigin}</p>}
            </div>
          </section>
        )}

        {/* Specs */}
        {u.specsLinks.length > 0 && (
          <section className="border-t border-border pt-8">
            <p className="eyebrow mb-3">Specifications</p>
            <div className="flex flex-wrap gap-3">
              {u.specsLinks.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="btn btn-outline"><Boxes className="size-4" /> {l.label} <ExternalLink className="size-3.5 text-ink-faint" /></a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
