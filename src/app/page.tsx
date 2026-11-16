import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { CommandBar } from "@/components/command-bar";
import { OpenPaletteButton } from "@/components/open-palette-button";
import { Badge } from "@/components/badge";
import { CountUp } from "@/components/count-up";
import { SectionHead } from "@/components/section-head";
import { IndexMosaic } from "@/components/index-mosaic";
import { getStats, getPulse } from "@/server/stats";
import { allUpgrades } from "@/data/upgrades";
import { getAllProposals } from "@/server/proposals";
import { STATUS_ORDER, ago } from "@/lib/format";
import { tokenize } from "@/lib/utils";

export const revalidate = 300;

const TRACKS = ["Core", "Networking", "Interface", "ERC", "RIP", "Meta", "Informational"];

export default async function Home() {
  const [stats, pulse, proposals] = await Promise.all([getStats(), getPulse(), getAllProposals()]);
  const upgrades = allUpgrades();

  const statusCount = new Map<string, number>();
  const trackCount = new Map<string, number>();
  const kindCount = new Map<string, number>();
  for (const p of proposals) {
    if (p.status) statusCount.set(p.status, (statusCount.get(p.status) ?? 0) + 1);
    const track = p.category || p.type;
    if (track) trackCount.set(track, (trackCount.get(track) ?? 0) + 1);
    kindCount.set(p.kind, (kindCount.get(p.kind) ?? 0) + 1);
  }
  const legend = STATUS_ORDER.filter((s) => statusCount.has(s)).map((s) => ({ status: s, n: statusCount.get(s)! }));
  const tracks = TRACKS.filter((t) => trackCount.has(t)).map((t) => ({ track: t, n: trackCount.get(t)! }));
  const total = proposals.length || stats.eips;
  // Upgrades whose composition we track lead; the rest follow, newest first.
  const featured = upgrades.slice(0, 6); // upcoming first, then newest shipped

  const figures = [
    { label: "Proposals", value: total, note: "EIPs, ERCs and RIPs", href: "/proposals" },
    { label: "Open pull requests", value: stats.openPRs, note: "in the editorial queue", href: "/queue" },
    { label: "People", value: stats.contributors, note: "authors, editors, reviewers", href: "/people" },
    { label: "Network upgrades", value: stats.upgrades, note: "shipped and planned", href: "/upgrades" },
  ];

  const movements = pulse.map((p) => ({ kind: p.kind, number: p.eip_number, title: p.title, to_status: p.to_status, when: p.changed_at }));

  return (
    <main>
      {/* ── Hero: a framed plate with the search as its one object ── */}
      <section className="border-b border-border">
        <div className="wrap">
          <div className="relative sm:border-x sm:border-border">
            <div className="pb-14 pt-14 text-center sm:px-10 sm:pb-20 sm:pt-24">
              <Link href="/proposals" className="rise chip mx-auto h-8 gap-2.5 rounded-full pl-3 pr-3.5 font-mono text-[0.72rem]">
                <span className="live-dot" />
                Tracking {total.toLocaleString()} proposals
                <ArrowRight className="size-3 text-ink-faint" />
              </Link>
              <h1 className="rise t-display mx-auto mt-7 max-w-4xl text-ink" style={{ animationDelay: "50ms" }}>
                The entire Ethereum standards universe, <span className="accent">searchable.</span>
              </h1>
              <p className="rise t-lead mx-auto mt-6 max-w-xl" style={{ animationDelay: "100ms" }}>
                Every proposal, pull request, contributor and network upgrade in one index. Type a number and you are there.
              </p>
              <div className="rise relative z-20 mx-auto mt-10 max-w-2xl" style={{ animationDelay: "150ms" }}>
                <CommandBar movements={movements} />
              </div>
              <div className="rise mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[0.72rem] text-ink-faint" style={{ animationDelay: "200ms" }}>
                <span>Try a number</span>
                {["4844", "7702", "1559", "20", "721"].map((n) => (
                  <Link key={n} href={`/eip/${n}`} className="text-ink-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
                    {n}
                  </Link>
                ))}
              </div>
            </div>

            {/* figures: the base of the plate */}
            <div className="grid grid-cols-2 border-t border-border lg:grid-cols-4">
              {figures.map((f, i) => {
                const inner = (
                  <>
                    <p className="eyebrow flex items-center justify-between gap-2">
                      {f.label}
                      {f.href && <ArrowUpRight className="size-3.5 text-ink-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-strong" />}
                    </p>
                    <p className="t-figure mt-4 text-ink"><CountUp to={f.value} /></p>
                    <p className="mt-2 text-xs text-ink-faint">{f.note}</p>
                  </>
                );
                const cls = `group block py-7 pr-4 transition-colors sm:px-8 lg:py-8 ${f.href ? "hover:bg-surface" : ""} ${i % 2 === 1 ? "border-l border-border pl-5" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`;
                return f.href ? (
                  <Link key={f.label} href={f.href} className={cls}>{inner}</Link>
                ) : (
                  <div key={f.label} className={cls}>{inner}</div>
                );
              })}
            </div>
            <span className="crop -bottom-[5px] -left-[5px] hidden sm:block" />
            <span className="crop -bottom-[5px] -right-[5px] hidden sm:block" />
          </div>
        </div>
      </section>

      {/* ── The index: the whole process as one picture ─────────── */}
      {proposals.length > 0 && (
        <section className="border-b border-border bg-surface">
          <div className="wrap">
            <div className="relative py-14 sm:border-x sm:border-border sm:px-10 sm:py-16">
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
                <div>
                  <p className="eyebrow"><span className="text-ink">01</span><span className="mx-1.5 text-border-strong">/</span>The index</p>
                  <h2 className="t-h2 mt-5 text-ink">Every proposal, at a glance</h2>
                </div>
                <p className="max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
                  One square per proposal, oldest to newest. Pick a status to isolate it and see where the Finals cluster and where the Drafts pile up.
                </p>
              </div>
              <div className="mt-9">
                <IndexMosaic items={proposals.map((p) => ({ n: p.number, k: p.kind, t: p.title, s: p.status }))} legend={legend} />
              </div>
              <span className="crop -bottom-[5px] -left-[5px] hidden sm:block" />
              <span className="crop -bottom-[5px] -right-[5px] hidden sm:block" />
            </div>
          </div>
        </section>
      )}

      <div className="wrap space-y-24 pt-20">
        {/* ── 02 Latest movements ──────────────────────────────── */}
        {pulse.length > 0 && (
          <section>
            <SectionHead
              index="02"
              label="Latest movements"
              title="What just changed"
              desc="The most recent status changes across the EIP, ERC and RIP repositories."
              action={
                <Link href="/proposals" className="eyebrow inline-flex items-center gap-1 transition-colors hover:text-ink">
                  All proposals <ArrowRight className="size-3" />
                </Link>
              }
            />
            <ul className="mt-8 grid gap-x-14 border-t border-border md:grid-cols-2">
              {pulse.map((p) => (
                <li key={`${p.kind}-${p.eip_number}-${p.changed_at}`} className="min-w-0 border-b border-border">
                  <Link href={`/${p.kind}/${p.eip_number}`} className="ledger-row px-2 py-3.5" data-token={tokenize(p.to_status)}>
                    <span className="w-[4.9rem] shrink-0 font-mono text-[0.8rem]">
                      <span className="text-ink-faint">{p.kind.toUpperCase()}-</span>
                      <span className="font-medium text-ink">{p.eip_number}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.95rem] text-ink">{p.title}</span>
                    {p.from_status && <span className="hidden shrink-0 font-mono text-[0.7rem] text-ink-faint lg:inline">{p.from_status} →</span>}
                    <Badge value={p.to_status} tip={false} className="shrink-0" />
                    <span className="w-7 shrink-0 text-right font-mono text-[0.7rem] text-ink-faint">{ago(p.changed_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── 03 Network upgrades ──────────────────────────────── */}
        {upgrades.length > 0 && (
          <section>
            <SectionHead
              index="03"
              label="Protocol deployment"
              title="Network upgrades"
              desc="The hard forks that carry proposals onto mainnet, and what each one is made of."
              action={
                <Link href="/upgrades" className="eyebrow inline-flex items-center gap-1 transition-colors hover:text-ink">
                  All upgrades <ArrowRight className="size-3" />
                </Link>
              }
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((u) => (
                <Link key={u.slug} href={`/upgrade/${u.slug}`} className="card tile flex min-w-0 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="t-h3 min-w-0 truncate text-ink">{u.name}</h3>
                      {u.mascot && <span className="shrink-0 text-lg" aria-hidden>{u.mascot.emoji}</span>}
                    </div>
                    <span className="badge shrink-0" data-token={u.status === "Live" ? "final" : u.status === "Upcoming" ? "last-call" : "draft"}>{u.status}</span>
                  </div>
                  {u.tagline && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{u.tagline}</p>}
                  <div className="mt-auto flex items-center gap-3 border-t border-border pt-3 font-mono text-xs text-ink-faint">
                    <span className="text-ink-muted">{u.date ? u.date.slice(0, 4) : "Planned"}</span>
                    <span className="ml-auto">{u.eipCount > 0 ? `${u.eipCount} EIPs` : u.metaEip ? `Meta EIP-${u.metaEip}` : "Scope forming"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 04 Browse ────────────────────────────────────────── */}
        {proposals.length > 0 && (
          <section>
            <SectionHead index="04" label="Ways in" title="Browse the standards" desc="Not sure what to search for? Start from a track, or from the stage a proposal has reached." />
            <div className="mt-8 grid gap-x-14 gap-y-10 lg:grid-cols-2">
              <div className="min-w-0">
                <p className="eyebrow">By track</p>
                <ul className="ledger mt-3 border-y border-border">
                  {tracks.map((t) => (
                    <li key={t.track}>
                      <Link href={`/proposals?track=${encodeURIComponent(t.track)}`} className="ledger-row px-2" data-token={tokenize(t.track)}>
                        <Badge value={t.track} tip={false} />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{TRACK_NOTE[t.track]}</span>
                        <span className="font-mono text-[0.8rem] text-ink">{t.n.toLocaleString()}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <p className="eyebrow">By status</p>
                <ul className="ledger mt-3 border-y border-border">
                  {legend.map((s) => (
                    <li key={s.status}>
                      <Link href={`/proposals?status=${encodeURIComponent(s.status)}`} className="ledger-row px-2" data-token={tokenize(s.status)}>
                        <Badge value={s.status} tip={false} />
                        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-[2px] bg-surface-2">
                          <span className="block h-full rounded-[2px]" style={{ width: `${Math.max(1.5, (s.n / total) * 100)}%`, background: "var(--token)" }} />
                        </span>
                        <span className="w-12 text-right font-mono text-[0.8rem] text-ink">{s.n.toLocaleString()}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ── Closing: the fastest way in ──────────────────────── */}
        <section className="section-head">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 pt-10">
            <h2 className="t-h1 max-w-2xl text-ink">
              Know the number? <span className="accent">Just type it.</span>
            </h2>
            <OpenPaletteButton className="btn btn-primary h-12 px-5 text-[0.95rem]">
              <Search className="size-4" /> Search anything <kbd className="kbd ml-1 border-brand-ink/25 bg-transparent text-brand-ink">⌘K</kbd>
            </OpenPaletteButton>
          </div>
        </section>
      </div>
    </main>
  );
}

const TRACK_NOTE: Record<string, string> = {
  Core: "Consensus changes that need a fork",
  Networking: "devp2p and the wire protocol",
  Interface: "Client APIs and RPC",
  ERC: "Application-level standards",
  RIP: "Rollup improvement proposals",
  Meta: "Process and governance",
  Informational: "Guidelines, non-binding",
};
