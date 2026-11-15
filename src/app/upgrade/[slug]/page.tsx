import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/page-head";
import { ProposalRow } from "@/components/proposal-row";
import { getUpgrade } from "@/server/upgrade";
import { bucketToken } from "@/lib/format";
import { meaningFor } from "@/lib/meanings";
import { tokenize } from "@/lib/utils";

export const revalidate = 300;

// Nothing is prebuilt, but every page is cached after its first visit and refreshed
// every five minutes, instead of hitting the database on each request.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const u = await getUpgrade(decodeURIComponent(slug));
  return { title: u ? u.name : "Not found" };
}

export default async function UpgradePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const u = await getUpgrade(decodeURIComponent(slug));
  if (!u) notFound();

  return (
    <main>
      <PageHead
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Link href="/upgrades" className="transition-colors hover:text-ink">Upgrades</Link>
            <ChevronRight className="size-3" />
            <span>Network upgrade</span>
          </span>
        }
        title={u.name}
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {u.metaEip && (
            <Link href={`/eip/${u.metaEip}`} className="chip font-mono">Meta EIP-{u.metaEip}</Link>
          )}
          {u.totalEips > 0 && <span className="font-mono text-xs text-ink-faint">{u.totalEips} EIPs tracked</span>}
        </div>

        {u.buckets.length > 1 && (
          <div className="mt-8 max-w-2xl">
            <div className="meter">
              {u.buckets.map((b) => (
                <span key={b.bucket} data-token={bucketToken(b.bucket)} style={{ width: `${(b.eips.length / u.totalEips) * 100}%`, background: "var(--token)" }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {u.buckets.map((b) => (
                <a key={b.bucket} href={`#${tokenize(b.bucket)}`} data-token={bucketToken(b.bucket)} className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink">
                  <span className="size-2 rounded-[2px]" style={{ background: "var(--token)" }} />
                  <span className="first-letter:uppercase">{b.bucket}</span>
                  <span className="font-mono text-ink-faint">{b.eips.length}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </PageHead>

      <div className="wrap pt-12">
        {u.buckets.length === 0 ? (
          <div className="card-quiet p-6 text-sm text-ink-muted">
            EIP composition is not tracked for this upgrade yet{u.metaEip ? <>. The <Link href={`/eip/${u.metaEip}`} className="link">meta EIP</Link> lists what it contains.</> : "."}
          </div>
        ) : (
          <div className="space-y-14">
            {u.buckets.map((b) => (
              <section key={b.bucket} id={tokenize(b.bucket)}>
                <div className="section-head flex items-baseline justify-between gap-4">
                  <h2 className="t-h3 text-ink first-letter:uppercase">{b.bucket}</h2>
                  <span className="font-mono text-xs text-ink-faint">{b.eips.length} EIP{b.eips.length === 1 ? "" : "s"}</span>
                </div>
                {meaningFor(b.bucket) && <p className="mt-1.5 text-sm text-ink-muted">{meaningFor(b.bucket)}</p>}
                <div className="card ledger mt-5 overflow-hidden" data-token={bucketToken(b.bucket)}>
                  {b.eips.map((e) => (
                    <ProposalRow key={e.eip_number} kind="eip" number={e.eip_number} title={e.title ?? "Untitled"} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
