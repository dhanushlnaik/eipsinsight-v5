import { SearchClient } from "@/components/search-client";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q, type } = await searchParams;

  return (
    <main className="wrap wrap-narrow py-10 sm:py-14">
      <p className="eyebrow">One index, every entity</p>
      <h1 className="t-h1 mb-8 mt-4 text-ink">Search</h1>
      <SearchClient initialQ={q ?? ""} initialType={type ?? "all"} />
    </main>
  );
}
