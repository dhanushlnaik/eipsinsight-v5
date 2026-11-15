import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ArrowDownUp } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { ProposalRow } from "@/components/proposal-row";
import { statusVar } from "@/components/status-meter";
import { getAllProposals } from "@/server/proposals";
import { STATUS_ORDER } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = { title: "Proposals" };

const PAGE_SIZE = 50;
const KINDS = [
  { key: "eip", label: "EIPs" },
  { key: "erc", label: "ERCs" },
  { key: "rip", label: "RIPs" },
];
const TRACKS = ["Core", "Networking", "Interface", "ERC", "RIP", "Meta", "Informational"];

type Params = { status?: string; kind?: string; track?: string; sort?: string; page?: string };

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const all = await getAllProposals();

  const status = STATUS_ORDER.find((s) => s.toLowerCase() === (sp.status ?? "").toLowerCase()) ?? null;
  const kind = KINDS.find((k) => k.key === (sp.kind ?? "").toLowerCase())?.key ?? null;
  const track = TRACKS.find((t) => t.toLowerCase() === (sp.track ?? "").toLowerCase()) ?? null;
  const asc = sp.sort === "asc";

  const trackOf = (p: (typeof all)[number]) => p.category || p.type;
  const matches = (p: (typeof all)[number], skip?: "status" | "kind" | "track") =>
    (skip === "status" || !status || p.status === status) &&
    (skip === "kind" || !kind || p.kind === kind) &&
    (skip === "track" || !track || trackOf(p) === track);

  const filtered = all.filter((p) => matches(p));
  if (!asc) filtered.reverse();

  // Each facet counts against the other active filters, so a count is what you get if you pick it.
  const count = <T,>(skip: "status" | "kind" | "track", get: (p: (typeof all)[number]) => T) => {
    const m = new Map<T, number>();
    for (const p of all) if (matches(p, skip)) m.set(get(p), (m.get(get(p)) ?? 0) + 1);
    return m;
  };
  const byStatus = count("status", (p) => p.status);
  const byKind = count("kind", (p) => p.kind);
  const byTrack = count("track", trackOf);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (patch: Partial<Record<keyof Params, string | null>>) => {
    const next: Record<string, string> = {};
    const cur: Record<string, string | null> = { status, kind, track, sort: asc ? "asc" : null, page: null, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) next[k] = v;
    const qs = new URLSearchParams(next).toString();
    return qs ? `/proposals?${qs}` : "/proposals";
  };
  const anyFilter = status || kind || track;

  return (
    <main>
      <PageHead
        eyebrow="The index"
        title="Proposals"
        lead="Every EIP, ERC and RIP on record. Narrow by repository, track or status. The counts show what each choice will return."
      />

      <div className="wrap pt-8">
        <div className="space-y-3">
          <FilterRow label="Kind">
            <Link href={href({ kind: null })} className="chip shrink-0" data-active={!kind}>All</Link>
            {KINDS.filter((k) => kind === k.key || all.some((p) => p.kind === k.key)).map((k) => (
              <Link key={k.key} href={href({ kind: kind === k.key ? null : k.key })} className="chip shrink-0" data-active={kind === k.key}>
                {k.label} <span className="chip-n">{(byKind.get(k.key as "eip") ?? 0).toLocaleString()}</span>
              </Link>
            ))}
          </FilterRow>
          <FilterRow label="Track">
            <Link href={href({ track: null })} className="chip shrink-0" data-active={!track}>All</Link>
            {TRACKS.map((t) => (
              <Link key={t} href={href({ track: track === t ? null : t })} className="chip shrink-0" data-active={track === t}>
                {t} <span className="chip-n">{(byTrack.get(t) ?? 0).toLocaleString()}</span>
              </Link>
            ))}
          </FilterRow>
          <FilterRow label="Status">
            <Link href={href({ status: null })} className="chip shrink-0" data-active={!status}>All</Link>
            {STATUS_ORDER.map((s) => (
              <Link key={s} href={href({ status: status === s ? null : s })} className="chip shrink-0" data-active={status === s}>
                <span className="size-2 rounded-[2px]" style={{ background: statusVar(s) }} />
                {s} <span className="chip-n">{(byStatus.get(s) ?? 0).toLocaleString()}</span>
              </Link>
            ))}
          </FilterRow>
        </div>

        <div className="section-head mt-10 flex items-center justify-between gap-4">
          <p className="eyebrow">
            <span className="text-ink">{filtered.length.toLocaleString()}</span> proposal{filtered.length === 1 ? "" : "s"}
            {anyFilter && (
              <Link href="/proposals" className="ml-3 underline underline-offset-2 transition-colors hover:text-ink">Clear filters</Link>
            )}
          </p>
          <Link href={href({ sort: asc ? null : "asc" })} className="eyebrow inline-flex items-center gap-1.5 transition-colors hover:text-ink">
            <ArrowDownUp className="size-3" /> {asc ? "Oldest first" : "Newest first"}
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="card-quiet mt-5 p-8 text-center text-sm text-ink-muted">
            {all.length === 0 ? "The proposal index is unavailable right now." : "Nothing matches these filters."}
            {all.length > 0 && <> <Link href="/proposals" className="link">Clear them</Link> to see everything.</>}
          </div>
        ) : (
          <div className="card ledger mt-5 overflow-hidden">
            {rows.map((p) => (
              <ProposalRow
                key={`${p.kind}-${p.number}`}
                kind={p.kind}
                number={p.number}
                title={p.title}
                status={p.status}
                meta={trackOf(p) ? <span className="eyebrow hidden w-28 shrink-0 text-right md:block">{trackOf(p)}</span> : undefined}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
            {page > 1 ? (
              <Link href={href({ page: page - 1 === 1 ? null : String(page - 1) })} className="btn btn-outline"><ArrowLeft className="size-4" /> Previous</Link>
            ) : <span />}
            <span className="font-mono text-xs text-ink-faint">Page {page} of {pages}</span>
            {page < pages ? (
              <Link href={href({ page: String(page + 1) })} className="btn btn-outline">Next <ArrowRight className="size-4" /></Link>
            ) : <span />}
          </nav>
        )}
      </div>
    </main>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow w-12 shrink-0">{label}</span>
      <div className="no-scrollbar -mr-5 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-5 sm:mr-0 sm:flex-wrap sm:pr-0">{children}</div>
    </div>
  );
}
