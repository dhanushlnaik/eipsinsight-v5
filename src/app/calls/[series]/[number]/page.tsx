import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getCall } from "@/server/calls";
import { CallWorkspace } from "@/components/call-workspace";
import { callSeriesLabel, callSeriesShort } from "@/data/call-series";
import { fmtDate } from "@/lib/format";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ series: string; number: string }> }): Promise<Metadata> {
  const { series, number } = await params;
  const c = await getCall(decodeURIComponent(series), decodeURIComponent(number));
  if (!c) return { title: "Call not found" };
  const bits = [
    c.decisions.length > 0 ? `${c.decisions.length} decisions` : null,
    c.highlights.length > 0 ? "highlights" : null,
    c.transcript ? "transcript" : null,
    "recording",
  ].filter(Boolean);
  return { title: c.title, description: `Recap of ${c.title}: ${bits.join(", ")}.` };
}

export default async function CallPage({ params }: { params: Promise<{ series: string; number: string }> }) {
  const { series: rawSeries, number: rawNumber } = await params;
  const series = decodeURIComponent(rawSeries);
  const number = decodeURIComponent(rawNumber);
  const c = await getCall(series, number);
  if (!c) notFound();

  return (
    <main>
      <header className="masthead border-b border-border">
        <div className="wrap pt-10 pb-7 sm:pt-14">
          <p className="eyebrow flex items-center gap-1.5">
            <Link href="/calls" className="transition-colors hover:text-ink">Protocol calls</Link>
            <ChevronRight className="size-3" />
            <Link href={`/calls/${series}`} className="transition-colors hover:text-ink">{callSeriesShort(series)}</Link>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="chip">{callSeriesShort(series)}</span>
            {c.date && <span className="font-mono text-sm text-ink-muted">{fmtDate(c.date)}</span>}
          </div>
          <h1 className="t-h1 mt-3 text-ink">{c.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{callSeriesLabel(series)}</p>
        </div>
      </header>

      <div className="wrap pt-10 pb-20">
        <CallWorkspace call={c} />
      </div>
    </main>
  );
}
