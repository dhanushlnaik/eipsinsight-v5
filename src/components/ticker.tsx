import Link from "next/link";
import { statusVar } from "@/components/status-meter";
import { ago } from "@/lib/format";
import type { PulseItem } from "@/server/stats";

/** The strip above the header: the latest status changes drifting past. Pauses on hover. */
export function Ticker({ items }: { items: PulseItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="ticker" aria-label="Latest status changes">
      <span className="eyebrow z-10 flex shrink-0 items-center gap-2 border-r border-border bg-surface-2 pl-5 pr-4 sm:pl-8">
        <span className="live-dot" /> Live
      </span>
      <div className="ticker-window">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
              {items.map((p) => (
                <li key={`${p.kind}-${p.eip_number}-${p.changed_at}`}>
                  <Link
                    href={`/${p.kind}/${p.eip_number}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="group flex items-center gap-2 whitespace-nowrap px-5 text-[0.72rem] text-ink-muted transition-colors hover:text-ink"
                  >
                    <span className="size-1.5 rounded-[1px]" style={{ background: statusVar(p.to_status) }} />
                    <span className="font-mono font-medium text-ink">{p.kind.toUpperCase()}-{p.eip_number}</span>
                    <span className="max-w-[15rem] truncate">{p.title}</span>
                    <span className="font-mono text-ink-faint">
                      {p.from_status ? `${p.from_status} → ` : ""}
                      <span className="text-ink-muted group-hover:text-ink">{p.to_status}</span>
                    </span>
                    <span className="font-mono text-ink-faint">{ago(p.changed_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
