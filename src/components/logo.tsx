import { cn } from "@/lib/utils";

/** A refined take on the EIPsInsight mark: ascending bars with a rising trend arrow. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden>
      {/* ascending bars */}
      <g fill="var(--brand)">
        <rect x="3.5" y="19" width="4" height="8.5" rx="1.3" opacity="0.4" />
        <rect x="10" y="14.5" width="4" height="13" rx="1.3" opacity="0.6" />
        <rect x="16.5" y="10.5" width="4" height="17" rx="1.3" opacity="0.4" />
      </g>
      {/* rising trend line */}
      <path d="M3.5 21.5 L11 15.8 L17.5 18.4 L26.8 8.4" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* arrowhead */}
      <path d="M20.6 8.5 L26.9 8.3 L26.7 14.6" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <LogoMark />
      {!compact && (
        <span className="font-serif text-[1.3rem] font-semibold leading-none tracking-[-0.01em] text-ink">
          EIPs<span className="text-brand-strong">Insight</span>
        </span>
      )}
    </span>
  );
}
