import type { Metadata } from "next";
import { PageHead } from "@/components/page-head";
import { CallsList } from "@/components/calls-list";
import { getCalls } from "@/server/calls";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Protocol calls",
  description: "AllCoreDevs and breakout call recaps: decisions, action items and recordings across every Ethereum core-dev call series.",
};

export default async function CallsPage() {
  const calls = await getCalls();
  const withVideo = calls.filter((c) => c.videoUrl).length;
  const seriesCount = new Set(calls.map((c) => c.series)).size;

  return (
    <main>
      <PageHead
        eyebrow="Core-dev governance"
        title="Protocol calls"
        lead={`AllCoreDevs and breakout calls, recapped: ${calls.length.toLocaleString()} meetings across ${seriesCount} series, with the decisions and action items from each, and ${withVideo.toLocaleString()} recordings.`}
      />

      <div className="wrap pt-12">
        {calls.length === 0 ? (
          <div className="card-quiet p-8 text-center text-sm text-ink-muted">Call data is unavailable right now.</div>
        ) : (
          <CallsList calls={calls} />
        )}
      </div>
    </main>
  );
}
