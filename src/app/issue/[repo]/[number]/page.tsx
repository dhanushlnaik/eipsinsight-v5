import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ThreadView } from "@/components/thread-view";
import { getThread } from "@/server/thread";

export const revalidate = 300;

// Nothing is prebuilt, but every page is cached after its first visit and refreshed
// every five minutes, instead of hitting the database on each request.
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ repo: string; number: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { repo, number } = await params;
  const t = await getThread("issue", repo, Number(number));
  return { title: t ? `#${t.number} ${t.title}` : "Not found" };
}

export default async function Page({ params }: { params: Params }) {
  const { repo, number } = await params;
  const t = await getThread("issue", repo, Number(number));
  if (!t) notFound();
  return <ThreadView t={t} />;
}
