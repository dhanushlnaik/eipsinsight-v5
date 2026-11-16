import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Youtube, ListChecks, ArrowUpRight } from "lucide-react";
import { getSeriesCalls } from "@/server/calls";
import { callSeriesLabel, callSeriesShort, isOneOffSeries } from "@/data/call-series";
import { fmtDate } from "@/lib/format";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ series: string }> }): Promise<Metadata> {
  const { series } = await params;
  return { title: `${callSeriesLabel(decodeURIComponent(series))} calls` };
}

function monthDay(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function year(date: string | null): string {
  return date ? date.slice(0, 4) : "—";
}

export default async function SeriesPage({ params }: { params: Promise<{ series: string }> }) {
  const { series: raw } = await params;
  const series = decodeURIComponent(raw);
  const calls = await getSeriesCalls(series);
  if (calls.length === 0) notFound();

  const label = callSeriesLabel(series);
  const withVideo = calls.filter((c) => c.videoUrl).length;
  const span = [calls[calls.length - 1]?.date, calls[0]?.date].filter(Boolean) as string[];

  return (
    <main>
      <header className="masthead border-b border-border">
        <div className="wrap pt-10 pb-8 sm:pt-14">
          <p className="eyebrow flex items-center gap-1.5">
            <Link href="/calls" className="transition-colors hover:text-ink">Protocol calls</Link>
            <ChevronRight className="size-3" />
            <span>{callSeriesShort(series)}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="chip">{callSeriesShort(series)}</span>
          </div>
          <h1 className="t-h1 mt-3 text-ink">{label}</h1>
          <p className="mt-3 font-mono text-sm text-ink-muted">
            {calls.length} call{calls.length === 1 ? "" : "s"}
            {span.length === 2 && <> · {fmtDate(span[0])} – {fmtDate(span[1])}</>}
            {withVideo > 0 && <> · {withVideo} recording{withVideo === 1 ? "" : "s"}</>}
          </p>
        </div>
      </header>

      <div className="wrap pt-12 pb-20">
        <ol className="relative border-l border-border pl-0">
          {calls.map((c, i) => {
            const showYear = i === 0 || year(c.date) !== year(calls[i - 1].date);
            const href = c.number ? `/calls/${c.series}/${c.number}` : c.videoUrl ?? "#";
            const external = !c.number;
            const Inner = (
              <div className="card tile group ml-6 flex-1 p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[0.8rem] font-medium text-ink">
                    {isOneOffSeries(series) ? c.title : `#${c.number}`}
                  </span>
                  <span className="font-mono text-[0.72rem] text-ink-faint">{c.date ? fmtDate(c.date) : ""}</span>
                  {c.videoUrl && <Youtube className="ml-auto size-4 text-ink-faint" aria-label="Recording" />}
                  <ArrowUpRight className={`tile-arrow size-4 ${c.videoUrl ? "" : "ml-auto"}`} />
                </div>
                {c.headline && <p className="mt-2.5 line-clamp-2 text-[0.92rem] leading-relaxed text-ink-muted">{c.headline}</p>}
                {c.decisions > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 font-mono text-[0.72rem] text-ink-faint">
                    <ListChecks className="size-3.5" /> {c.decisions} decision{c.decisions === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            );
            return (
              <li key={`${c.series}-${c.number ?? i}`} className="relative">
                {showYear && (
                  <div className="mb-3 ml-6 mt-2 first:mt-0">
                    <span className="font-mono text-xs font-medium text-ink-faint">{year(c.date)}</span>
                  </div>
                )}
                <div className="relative flex items-stretch pb-4">
                  {/* node on the spine */}
                  <span className="absolute -left-[5px] top-6 size-2.5 rounded-full border-2 border-paper bg-brand" aria-hidden />
                  {external ? (
                    <a href={href} target="_blank" rel="noreferrer" className="flex flex-1">{Inner}</a>
                  ) : (
                    <Link href={href} className="flex flex-1">{Inner}</Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
