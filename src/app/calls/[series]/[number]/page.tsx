import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Youtube, MessageSquare, ListChecks, Flag, Target, Clock } from "lucide-react";
import { getCall, videoAt, type CallMoment } from "@/server/calls";
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
  return {
    title: c.title,
    description: c.decisions.length > 0 ? `${c.decisions.length} decisions and ${c.actionItems.length} action items from ${c.title}.` : undefined,
  };
}

/** A timestamp that jumps into the recording, or plain text when there is no video. */
function Stamp({ url, m }: { url: string | null; m: CallMoment }) {
  if (!m.stamp) return null;
  const href = videoAt(url, m.seconds);
  if (!href || m.seconds == null) return <span className="shrink-0 font-mono text-[0.7rem] text-ink-faint">{m.stamp}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="chip shrink-0 gap-1 font-mono text-[0.7rem]" aria-label={`Watch at ${m.stamp}`}>
      <Clock className="size-3" /> {m.stamp}
    </a>
  );
}

export default async function CallPage({ params }: { params: Promise<{ series: string; number: string }> }) {
  const { series: rawSeries, number: rawNumber } = await params;
  const series = decodeURIComponent(rawSeries);
  const number = decodeURIComponent(rawNumber);
  const c = await getCall(series, number);
  if (!c) notFound();

  const hasBody = c.summary || c.decisions.length > 0 || c.actionItems.length > 0 || c.targets.length > 0 || c.decisionRefs.length > 0;

  return (
    <main>
      <header className="masthead border-b border-border">
        <div className="wrap pt-10 sm:pt-14">
          <p className="eyebrow flex items-center gap-1.5">
            <Link href="/calls" className="transition-colors hover:text-ink">Protocol calls</Link>
            <ChevronRight className="size-3" />
            <span>{callSeriesShort(series)}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="chip">{callSeriesShort(series)}</span>
            {c.date && <span className="font-mono text-sm text-ink-muted">{fmtDate(c.date)}</span>}
          </div>
          <h1 className="t-h1 mt-3 text-ink">{c.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{callSeriesLabel(series)}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {c.videoUrl && (
              <a href={c.videoUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
                <Youtube className="size-4" /> Watch recording
              </a>
            )}
            {c.issueNumber != null && (
              <a href={`https://github.com/ethereum/pm/issues/${c.issueNumber}`} target="_blank" rel="noreferrer" className="btn inline-flex items-center gap-2">
                <MessageSquare className="size-4" /> Agenda issue
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="wrap space-y-12 pt-12 pb-20">
        {!hasBody && (
          <div className="card-quiet p-8 text-center text-sm text-ink-muted">
            No recap has been published for this call yet.{c.videoUrl ? " The recording is linked above." : ""}
          </div>
        )}

        {c.summary && (
          <section>
            <p className="eyebrow">Summary</p>
            <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-ink">{c.summary}</p>
          </section>
        )}

        {c.decisions.length > 0 && (
          <section>
            <div className="section-head flex items-center gap-2">
              <ListChecks className="size-4 text-ink-muted" />
              <h2 className="t-h3 text-ink">Decisions</h2>
            </div>
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {c.decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-3 py-3.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  <p className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-ink">{d.text}</p>
                  <Stamp url={c.videoUrl} m={d} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.decisionRefs.length > 0 && (
          <section>
            <div className="section-head">
              <p className="eyebrow">Proposals discussed</p>
              <h2 className="t-h3 mt-2 text-ink">EIPs referenced in decisions</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {c.decisionRefs.map((d, i) => (
                <div key={i} className="card p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {d.eips.map((n) => (
                      <Link key={n} href={`/eip/${n}`} className="chip font-mono text-[0.72rem] hover:border-ink">EIP-{n}</Link>
                    ))}
                    {d.type && <span className="font-mono text-[0.68rem] uppercase tracking-wide text-ink-faint">{d.type.replace(/_/g, " ")}</span>}
                  </div>
                  <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ink-muted">{d.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {c.actionItems.length > 0 && (
          <section>
            <div className="section-head flex items-center gap-2">
              <Flag className="size-4 text-ink-muted" />
              <h2 className="t-h3 text-ink">Action items</h2>
            </div>
            <ul className="mt-5 space-y-2.5">
              {c.actionItems.map((a, i) => (
                <li key={i} className="card flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    {a.owner && <p className="font-mono text-[0.72rem] uppercase tracking-wide text-ink-faint">{a.owner}</p>}
                    <p className="mt-1 text-[0.95rem] leading-relaxed text-ink">{a.text}</p>
                  </div>
                  <Stamp url={c.videoUrl} m={a} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.targets.length > 0 && (
          <section>
            <div className="section-head flex items-center gap-2">
              <Target className="size-4 text-ink-muted" />
              <h2 className="t-h3 text-ink">Targets &amp; next up</h2>
            </div>
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {c.targets.map((t, i) => (
                <li key={i} className="flex items-start gap-3 py-3.5">
                  <p className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-ink">{t.text}</p>
                  <Stamp url={c.videoUrl} m={t} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
