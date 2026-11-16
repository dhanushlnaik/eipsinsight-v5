"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Boxes, Users, Search } from "lucide-react";

const NAV = [
  { href: "/proposals", label: "Proposals", icon: FileText, match: ["/proposals", "/eip", "/erc", "/rip"] },
  { href: "/upgrades", label: "Upgrades", icon: Boxes, match: ["/upgrades", "/upgrade"] },
  { href: "/people", label: "People", icon: Users, match: ["/people", "/user"] },
];

// Shown in the desktop header only: the phone tab bar has room for four destinations and search.
const DESKTOP_NAV = [
  ...NAV,
  { href: "/queue", label: "Queue", icon: FileText, match: ["/queue", "/pr", "/issue"] },
];

function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

/** Desktop: a segmented control in the middle of the header. The current section inverts to ink. */
export function NavLinks({ counts = {} }: { counts?: Record<string, string | null> }) {
  const pathname = usePathname();
  return (
    <nav className="nav-seg no-scrollbar hidden max-w-full overflow-x-auto sm:flex" aria-label="Primary">
      {DESKTOP_NAV.map((n) => {
        const active = isActive(pathname, n.match);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
            {n.label}
            {counts[n.href] && <span className="nav-n hidden lg:inline">{counts[n.href]}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phone: a fixed tab bar within thumb reach. Search opens the command palette. */
export function TabBar() {
  const pathname = usePathname();
  const item = "flex flex-1 flex-col items-center justify-center gap-1 text-[0.62rem] font-medium";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[3.6rem] border-t border-border bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Primary">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`${item} ${pathname === "/" ? "text-ink" : "text-ink-faint"}`}>
        <Home className="size-[1.15rem]" /> Home
      </Link>
      {NAV.map((n) => {
        const active = isActive(pathname, n.match);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`${item} ${active ? "text-ink" : "text-ink-faint"}`}>
            <n.icon className="size-[1.15rem]" /> {n.label}
          </Link>
        );
      })}
      <button type="button" onClick={() => window.dispatchEvent(new Event("open-command-palette"))} className={`${item} ${pathname === "/search" ? "text-ink" : "text-ink-faint"}`}>
        <Search className="size-[1.15rem]" /> Search
      </button>
    </nav>
  );
}
