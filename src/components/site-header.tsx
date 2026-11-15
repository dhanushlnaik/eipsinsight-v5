import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchTrigger } from "@/components/search-trigger";
import { NavLinks } from "@/components/nav-links";
import { Ticker } from "@/components/ticker";
import { getPulse, getStats } from "@/server/stats";
import { getQueue } from "@/server/queue";

function compact(n: number): string {
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/** Mounted once in the root layout. A live ticker that scrolls away, then the sticky bar:
 *  logo, segmented nav with live counts, search, theme. Solid paper, no blur. */
export async function SiteHeader() {
  const [pulse, stats, queue] = await Promise.all([getPulse(), getStats(), getQueue()]);
  const waitingOnEditors = queue.filter((q) => q.waitingOn === "editor").length;
  const counts = {
    "/proposals": stats.eips ? compact(stats.eips) : null,
    "/upgrades": stats.upgrades ? compact(stats.upgrades) : null,
    "/people": stats.contributors ? compact(stats.contributors) : null,
    "/queue": waitingOnEditors ? compact(waitingOnEditors) : null,
  };

  return (
    <>
      <Ticker items={pulse} />
      <header className="sticky top-0 z-40 border-b border-border bg-paper">
        <div className="wrap flex h-[var(--header-h)] items-center gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr]">
          <Link href="/" className="shrink-0 justify-self-start transition-opacity hover:opacity-80" aria-label="EIPsInsight home">
            <Logo />
          </Link>
          <NavLinks counts={counts} />
          <div className="ml-auto flex items-center gap-2 justify-self-end">
            <SearchTrigger />
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}
