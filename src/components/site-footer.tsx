import Link from "next/link";
import { Logo } from "@/components/logo";

const EXPLORE = [
  { href: "/proposals", label: "Proposals" },
  { href: "/upgrades", label: "Network upgrades" },
  { href: "/people", label: "People" },
  { href: "/queue", label: "Editorial queue" },
  { href: "/search", label: "Search" },
];

const SOURCES = [
  { href: "https://eips.ethereum.org", label: "eips.ethereum.org" },
  { href: "https://ercs.ethereum.org", label: "ercs.ethereum.org" },
  { href: "https://github.com/ethereum/EIPs", label: "ethereum/EIPs" },
  { href: "https://github.com/ethereum/ERCs", label: "ethereum/ERCs" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 pb-[4.5rem] sm:pb-0">
      <div className="wrap">
        <div className="grid gap-10 border-t border-ink py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              An observatory for Ethereum Improvement Proposals: every standard, pull request, contributor and upgrade in one index.
            </p>
          </div>
          <div>
            <p className="eyebrow">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {EXPLORE.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-ink-muted transition-colors hover:text-ink">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Sources</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SOURCES.map((l) => (
                <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer" className="font-mono text-[0.8rem] text-ink-muted transition-colors hover:text-ink">{l.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-5 text-xs text-ink-faint">
          <span>EIPsInsight, the Ethereum standards observatory</span>
          <span className="font-mono">Pages refresh every five minutes</span>
        </div>
      </div>
    </footer>
  );
}
