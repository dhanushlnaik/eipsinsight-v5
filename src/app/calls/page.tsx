import Link from "next/link";
import type { Metadata } from "next";
import { Youtube, ArrowUpRight, ListChecks } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { getRecentCalls, getCallSeriesOverview, type SeriesOverview } from "@/server/calls";
import { callSeriesShort } from "@/data/call-series";
import { ago } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Protocol calls",
  description: "AllCoreDevs and breakout call recaps: decisions, action items and recordings across every Ethereum core-dev call series.",
};

function monthDay(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function cadence(days: number | null): string {
  if (days == null) return "one call so far";
  if (days <= 9) return "meets ~weekly";
  if (days <= 18) return "meets ~biweekly";
  if (days <= 45) return "meets ~monthly";
  return "meets occasionally";
}

const GROUPS: { key: SeriesOverview["group"]; label: string; blurb: string }[] = [
  { key: "core", label: "All Core Devs", blurb: "The standing calls where execution, consensus and testing coordinate every upgrade." },
  { key: "breakout", label: "Breakout calls", blurb: "Focused working groups driving a single feature or EIP toward inclusion." },
  { key: "process", label: "Governance process", blurb: "How the EIP process itself is run and edited." },
  { key: "other", label: "One-off calls", blurb: "Single-topic sessions outside the regular series." },
];

/** A card for one call series: cadence, cadence and its latest headline decision. */
function SeriesCard({ s }: { s: SeriesOverview }) {
  return (
    <Link href={`/calls/${s.series}`} className="card tile group flex min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="chip">{s.short}</span>
          <h3 className="mt-2.5 truncate font-serif text-[1.15rem] text-ink">{s.label}</h3>
        </div>
        <ArrowUpRight className="tile-arrow mt-1 size-4 shrink-0" />
      </div>

      <p className="mt-1 font-mono text-[0.72rem] text-ink-faint">
        {s.count} call{s.count === 1 ? "" : "s"} · {cadence(s.cadenceDays)}
        {s.lastDate && <> · last {ago(s.lastDate)}</>}
      </p>

      {s.latest?.headline ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="eyebrow mb-1.5">Latest · {s.latest.title.replace(s.label, "").trim() || `#${s.latest.number}`}</p>
          <p className="line-clamp-3 text-[0.9rem] leading-relaxed text-ink-muted">{s.latest.headline}</p>
        </div>
      ) : (
        s.latest && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[0.85rem] text-ink-faint">Latest call {monthDay(s.latest.date)}{s.latest.videoUrl ? " · recording available" : ""}.</p>
          </div>
        )
      )}
    </Link>
  );
}

export default async function CallsPage() {
  const [recent, overview] = await Promise.all([getRecentCalls(4), getCallSeriesOverview()]);
  const totalCalls = overview.reduce((n, s) => n + s.count, 0);

  return (
    <main>
      <PageHead
        eyebrow="Core-dev governance"
        title="Protocol calls"
        lead={`AllCoreDevs and breakout calls, recapped. ${totalCalls.toLocaleString()} meetings across ${overview.length} series — browse by working group, or catch the latest decisions below.`}
      />

      <div className="wrap space-y-16 pt-12 pb-20">
        {/* ── Latest across all series ─────────────────────────── */}
        {recent.length > 0 && (
          <section>
            <div className="section-head flex items-baseline justify-between gap-4">
              <h2 className="t-h3 text-ink">Just in</h2>
              <span className="eyebrow">Newest recaps</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {recent.map((c) => (
                <Link
                  key={`${c.series}-${c.number}`}
                  href={c.number ? `/calls/${c.series}/${c.number}` : c.videoUrl ?? "#"}
                  className="card tile group flex flex-col p-5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="chip">{callSeriesShort(c.series)}</span>
                    <span className="font-mono text-[0.72rem] text-ink-faint">{monthDay(c.date)}</span>
                    {c.videoUrl && <Youtube className="ml-auto size-4 text-ink-faint" aria-label="Recording" />}
                  </div>
                  <h3 className="mt-3 font-serif text-[1.15rem] leading-snug text-ink">{c.title}</h3>
                  {c.headline && <p className="mt-2 line-clamp-2 text-[0.9rem] leading-relaxed text-ink-muted">{c.headline}</p>}
                  <p className="mt-auto flex items-center gap-1.5 pt-4 font-mono text-[0.72rem] text-ink-faint">
                    <ListChecks className="size-3.5" />
                    {c.decisions > 0 ? `${c.decisions} decision${c.decisions === 1 ? "" : "s"}` : "Recap"}
                    <ArrowUpRight className="tile-arrow ml-auto size-4" />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Browse by series ─────────────────────────────────── */}
        {GROUPS.map((g) => {
          const items = overview.filter((s) => s.group === g.key);
          if (items.length === 0) return null;
          return (
            <section key={g.key}>
              <div className="section-head">
                <p className="eyebrow">{items.length} series</p>
                <h2 className="t-h2 mt-3 text-ink">{g.label}</h2>
                <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">{g.blurb}</p>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => <SeriesCard key={s.series} s={s} />)}
              </div>
            </section>
          );
        })}

        {overview.length === 0 && (
          <div className="card-quiet p-8 text-center text-sm text-ink-muted">Call data is unavailable right now.</div>
        )}
      </div>
    </main>
  );
}
