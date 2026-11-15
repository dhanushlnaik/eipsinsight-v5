import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, ExternalLink, Github, BookOpen, ArrowUpRight } from "lucide-react";
import { EditorialPRs } from "@/components/editorial-prs";
import { SectionHead } from "@/components/section-head";
import { Badge } from "@/components/badge";
import { CopyLink } from "@/components/copy-link";
import { LifecycleTrack } from "@/components/lifecycle-track";
import { UpgradeProgression } from "@/components/upgrade-progression";
import { DependencyGraph } from "@/components/dependency-graph";
import { MarkdownContent } from "@/components/markdown-content";
import { CollapsibleSpec } from "@/components/collapsible-spec";
import { tokenize } from "@/lib/utils";
import { fmtDate, bucketToken } from "@/lib/format";
import { STATUS_MEANING, meaningFor } from "@/lib/meanings";
import { getEntity, findKind, type Kind } from "@/server/entity";

export const revalidate = 300;

// Nothing is prebuilt, but every page is cached after its first visit and refreshed
// every five minutes, instead of hitting the database on each request.
export function generateStaticParams() {
  return [];
}

const KINDS: Kind[] = ["eip", "erc", "rip"];

function parseParams(kind: string, number: string): { kind: Kind; n: number } | null {
  const k = kind.toLowerCase();
  const n = Number(number);
  if (!KINDS.includes(k as Kind) || !Number.isInteger(n) || n < 0) return null;
  return { kind: k as Kind, n };
}


// Split the spec into the Abstract (shown first) and everything after it (collapsed).
function splitSpec(content: string): { head: string; rest: string } {
  const abs = content.match(/##\s*Abstract/i);
  if (!abs || abs.index == null) return { head: content, rest: "" };
  const afterAbs = content.slice(abs.index + abs[0].length);
  const nextRel = afterAbs.search(/\n#{1,2}\s/);
  if (nextRel === -1) return { head: content, rest: "" };
  const splitAt = abs.index + abs[0].length + nextRel;
  return { head: content.slice(0, splitAt).trim(), rest: content.slice(splitAt).trim() };
}

function rawBase(githubUrl: string | null): string | undefined {
  if (!githubUrl) return undefined;
  return githubUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace(/\/[^/]+$/, "/");
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string; number: string }> }): Promise<Metadata> {
  const { kind, number } = await params;
  const p = parseParams(kind, number);
  if (!p) return { title: "Not found" };
  const e = await getEntity(p.kind, p.n);
  return e ? { title: `${p.kind.toUpperCase()}-${e.number}: ${e.title}`, description: e.description ?? e.abstract ?? undefined } : { title: "Not found" };
}

export default async function EntityPage({ params }: { params: Promise<{ kind: string; number: string }> }) {
  const { kind, number } = await params;
  const p = parseParams(kind, number);
  if (!p) notFound();
  const e = await getEntity(p.kind, p.n);
  if (!e) {
    // A number can live under another prefix: ERC-20 and ERC-721 predate the ERCs repository
    // and are filed as EIPs. Send the reader to wherever the proposal actually is.
    const actual = await findKind(p.n);
    if (actual && actual !== p.kind) redirect(`/${actual}/${p.n}`);
    notFound();
  }

  const label = `${p.kind.toUpperCase()}-${e.number}`;
  const typeLabel = e.type ? (e.category ? `${e.type}: ${e.category}` : e.type) : e.category;
  const typeTip = [e.type ? meaningFor(e.type) : null, e.category ? meaningFor(e.category) : null].filter(Boolean).join(" ") || undefined;
  const hasRel = e.requires.length > 0 || e.requiredBy.length > 0;
  const hasGov = e.editorialPRs.length > 0 || e.meetings.length > 0;
  const statusMeaning = e.status ? STATUS_MEANING[e.status.toLowerCase()] : null;
  const lead = e.description ?? e.abstract;
  const h2s = e.headings.filter((h) => h.depth === 2);

  const statusColor = e.status ? `var(--c-${tokenize(e.status).replace("last-call", "lastcall")})` : "var(--border-strong)";
  const { head: specHead, rest: specRest } = e.content ? splitSpec(e.content) : { head: "", rest: "" };

  const nav = [
    { id: "lifecycle", label: "Lifecycle" },
    ...(e.upgrades.length ? [{ id: "upgrade", label: "Upgrade" }] : []),
    ...(hasGov ? [{ id: "governance", label: "Governance" }] : []),
    ...(hasRel ? [{ id: "dependencies", label: "Dependencies" }] : []),
    ...(e.content ? [{ id: "specification", label: "Specification" }] : []),
  ];

  // Sections are numbered in the order they actually appear on this proposal.
  const no = (id: string) => String(nav.findIndex((n) => n.id === id) + 1).padStart(2, "0");

  return (
    <main>
      {/* ── Masthead: the document's identity ───────────────────── */}
      <header className="relative overflow-hidden border-b border-border bg-surface">
        <div className="wrap">
          <div className="relative overflow-hidden pb-8 pt-7 sm:pt-9">
          <span aria-hidden className="ghost-numeral absolute -bottom-12 right-0 hidden md:block">{e.number}</span>
          <div className="relative">
          <nav className="flex items-center gap-1.5 font-mono text-xs text-ink-faint" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-ink">Home</Link>
            <ChevronRight className="size-3" />
            <Link href="/proposals" className="transition-colors hover:text-ink">Proposals</Link>
            <ChevronRight className="size-3" />
            <span className="text-ink-muted">{label}</span>
          </nav>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {e.status && <Badge value={e.status} />}
            {typeLabel && <span className={`badge badge-plain ${typeTip ? "tip" : ""}`} data-token={tokenize(e.type ?? e.category ?? "")} data-tip={typeTip}>{typeLabel}</span>}
            {e.layer && <Badge value={e.layer} plain />}
            {e.upgrades[0] && (
              <Link href={`/upgrade/${e.upgrades[0].slug}`} className="badge tip" data-token={bucketToken(e.upgrades[0].bucket)} data-tip={`${e.upgrades[0].name}, ${meaningFor(e.upgrades[0].bucket) ?? e.upgrades[0].bucket}`}>
                {e.upgrades[0].name.split("/")[0]} · {e.upgrades[0].bucket}
              </Link>
            )}
          </div>

          <h1 className="t-h1 mt-4 max-w-4xl text-ink">
            <span className="text-brand-strong">{label}:</span> {e.title}
          </h1>

          {lead && <p className="t-lead mt-5 max-w-2xl">{lead}</p>}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            {e.authors.length > 0 ? (
              <div className="flex items-center gap-3">
                <span className="eyebrow">Authors</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {e.authors.map((a, i) =>
                    a.handle ? (
                      <Link key={i} href={`/user/${a.handle}`} className="tip inline-flex" data-tip={`${a.name} · @${a.handle}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://github.com/${a.handle}.png?size=56`} alt={a.name} width={28} height={28} className="size-7 rounded-full border border-border bg-surface-2 object-cover transition-colors hover:border-ink" />
                      </Link>
                    ) : (
                      <span key={i} className="tip grid size-7 place-items-center rounded-full border border-border bg-surface-2 text-[0.65rem] font-semibold text-ink-faint" data-tip={a.name}>{a.name.charAt(0)}</span>
                    ),
                  )}
                </div>
              </div>
            ) : <span />}
            <div className="flex items-center gap-2">
              <a href={e.officialUrl} target="_blank" rel="noreferrer" className="btn btn-outline h-9 bg-surface px-3"><BookOpen className="size-4" /> Official page</a>
              {e.githubUrl && <a href={e.githubUrl} target="_blank" rel="noreferrer" title="View source on GitHub" aria-label="View source on GitHub" className="icon-btn bg-surface"><Github className="size-4" /></a>}
              <CopyLink />
            </div>
          </div>

          </div>
          </div>

          {/* record strip */}
          <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {[
              { k: "Created", v: fmtDate(e.created_at) },
              { k: "Last updated", v: fmtDate(e.updated_at) },
              { k: "Requires", v: e.requires.length ? `${e.requires.length} proposal${e.requires.length === 1 ? "" : "s"}` : "Nothing" },
              { k: "Source", v: e.repo, mono: true },
            ].map((f, i) => (
              <div key={f.k} className={`py-4 ${i % 2 === 1 ? "border-l border-border pl-4 sm:pl-6" : ""} ${i >= 2 ? "border-t border-border sm:border-t-0" : ""} ${i === 2 ? "sm:border-l sm:pl-6" : ""}`}>
                <dt className="eyebrow">{f.k}</dt>
                <dd className={`mt-1.5 truncate text-sm text-ink ${f.mono ? "font-mono text-[0.8rem]" : ""}`}>{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* ── Phone: section jump bar ─────────────────────────────── */}
      <nav className="sticky top-[var(--header-h)] z-30 border-b border-border bg-paper lg:hidden" aria-label="On this page">
        <div className="wrap no-scrollbar flex gap-2 overflow-x-auto py-2.5">
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="chip shrink-0">{n.label}</a>
          ))}
        </div>
      </nav>

      <div className="wrap grid gap-x-14 pt-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:pt-14">
        <article className="min-w-0 space-y-16">
          {statusMeaning && (
            <p className="flex items-start gap-3 border-l-2 bg-surface-2 py-3 pl-4 pr-4 text-sm text-ink-muted" style={{ borderColor: statusColor }}>
              <span className="font-semibold text-ink">{e.status}</span>
              <span>{statusMeaning}</span>
            </p>
          )}

          {/* Lifecycle */}
          <section id="lifecycle">
            <SectionHead index={no("lifecycle")} label="Standards process" title="Lifecycle" desc="What has happened to this proposal inside the EIP process." />
            {e.events.length === 0 ? (
              <p className="mt-6 text-sm text-ink-faint">
                {p.kind === "rip" ? "Status history is not tracked for RIPs yet. The current status is shown above." : "No recorded status changes."}
              </p>
            ) : (
              <>
                <div className="card mt-8 px-5 py-7 sm:px-6">
                  <LifecycleTrack events={e.events} status={e.status} />
                </div>
                <details className="group mt-4">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                    <ChevronRight className="size-4 transition-transform group-open:rotate-90" /> Full history ({e.events.length} change{e.events.length === 1 ? "" : "s"})
                  </summary>
                  <ol className="mt-5 border-l border-border pl-6">
                    {e.events.map((ev, i) => {
                      const ci = (s: string | null) => (s ? ["draft", "review", "last call", "final"].indexOf(s.toLowerCase()) : -1);
                      const regressed = ev.from_status != null && ci(ev.to_status) >= 0 && ci(ev.from_status) > ci(ev.to_status);
                      return (
                        <li key={i} className="relative pb-6 last:pb-0">
                          <span className="absolute -left-[1.68rem] top-1.5 size-2.5 rounded-[2px] ring-4 ring-paper" style={{ background: `var(--c-${tokenize(ev.to_status).replace("last-call", "lastcall")})` }} />
                          <div className="flex flex-wrap items-center gap-2">
                            {ev.from_status ? (
                              <>
                                <span className="text-sm text-ink-faint">{ev.from_status}</span>
                                <span className="text-ink-faint">→</span>
                                <Badge value={ev.to_status} />
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-ink-faint">Created as</span>
                                <Badge value={ev.to_status} />
                              </>
                            )}
                            {regressed && <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-ink-faint">regressed</span>}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-xs text-ink-faint">
                            <span>{fmtDate(ev.changed_at)}</span>
                            {ev.pr_number && <a href={`https://github.com/${e.repo}/pull/${ev.pr_number}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-ink">PR #{ev.pr_number} <ExternalLink className="size-3" /></a>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              </>
            )}
          </section>

          {/* Upgrade inclusion (distinct from lifecycle) */}
          {e.upgrades.length > 0 && (
            <section id="upgrade">
              <SectionHead index={no("upgrade")} label="Network deployment" title="Upgrade inclusion" desc="Where this proposal sits in the network upgrade process, which is separate from its standards lifecycle." />
              <div className="mt-8 space-y-3">
                {e.upgrades.map((u) => (
                  <div key={u.slug} className="card p-5">
                    <Link href={`/upgrade/${u.slug}`} className="group mb-4 flex items-center justify-between gap-3">
                      <span className="t-h3 text-ink">{u.name}</span>
                      <span className="eyebrow inline-flex items-center gap-1 transition-colors group-hover:text-ink">Upgrade page <ArrowUpRight className="size-3" /></span>
                    </Link>
                    <UpgradeProgression bucket={u.bucket} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Governance & editorial */}
          {hasGov && (
            <section id="governance">
              <SectionHead index={no("governance")} label="Editorial and governance" title="Discussion and edits" desc="The core developer calls where this proposal came up, and the pull requests that touched it." />

              {e.meetings.length > 0 && (
                <div className="mt-8">
                  <h3 className="eyebrow mb-3">Discussed in calls</h3>
                  <ul className="card ledger overflow-hidden">
                    {e.meetings.map((m, i) => (
                      <li key={i}>
                        <a href={m.url} target="_blank" rel="noreferrer" className="ledger-row group items-start">
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.95rem] font-medium text-ink">{m.title}</span>
                            {m.snippet && <span className="mt-1.5 line-clamp-2 block border-l border-border-strong pl-3 text-sm italic leading-relaxed text-ink-muted">“{m.snippet.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim()}”</span>}
                            <span className="mt-1.5 block font-mono text-xs text-ink-faint">{m.mentionedBy ? `${m.mentionedBy} · ` : ""}{fmtDate(m.date)}</span>
                          </span>
                          <ExternalLink className="mt-1 size-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {e.editorialPRs.length > 0 && (
                <div className="mt-9">
                  <h3 className="eyebrow mb-3">Pull requests</h3>
                  <EditorialPRs prs={e.editorialPRs} repo={e.repo} isFinal={e.status?.toLowerCase() === "final"} />
                </div>
              )}
            </section>
          )}

          {/* Dependencies */}
          {hasRel && (
            <section id="dependencies">
              <SectionHead
                index={no("dependencies")}
                label="Relationships"
                title="Dependencies"
                desc={<>Builds on <span className="font-medium text-ink">{e.requires.length}</span> and is depended on by <span className="font-medium text-ink">{e.requiredBy.length}</span>. Select any proposal to open it.</>}
              />
              <div className="card mt-8 p-4 sm:p-5">
                <DependencyGraph label={label} requires={e.requires.map((r) => ({ kind: p.kind, number: r }))} requiredBy={e.requiredBy} />
              </div>
            </section>
          )}

          {/* Full specification */}
          {e.content && (
            <section id="specification">
              <SectionHead index={no("specification")} label="Source text" title="Specification" desc="The full proposal, rendered from its source file." />
              <div className="mt-8">
                <MarkdownContent content={specHead} baseUrl={rawBase(e.githubUrl)} />
                {specRest && (
                  <CollapsibleSpec>
                    <MarkdownContent content={specRest} baseUrl={rawBase(e.githubUrl)} />
                  </CollapsibleSpec>
                )}
              </div>
            </section>
          )}
        </article>

        {/* ── Rail: on this page ──────────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)]">
            <p className="eyebrow">On this page</p>
            <nav className="scroll-quiet mt-4 max-h-[70vh] overflow-y-auto border-l border-border">
              {nav.map((n) => (
                <div key={n.id}>
                  <a href={`#${n.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink">{n.label}</a>
                  {n.id === "specification" &&
                    h2s.map((h) => (
                      <a key={h.slug} href={`#${h.slug}`} className="-ml-px block truncate border-l border-transparent py-1 pl-7 text-[0.8rem] text-ink-faint transition-colors hover:border-ink hover:text-ink">{h.text}</a>
                    ))}
                </div>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </main>
  );
}
