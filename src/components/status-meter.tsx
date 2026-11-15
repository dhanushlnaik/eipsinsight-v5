import { tokenize } from "@/lib/utils";
import type { StatusSlice } from "@/server/stats";

const VAR: Record<string, string> = {
  draft: "--c-draft",
  review: "--c-review",
  "last-call": "--c-lastcall",
  final: "--c-final",
  living: "--c-living",
  stagnant: "--c-stagnant",
  withdrawn: "--c-withdrawn",
  moved: "--c-moved",
};

export function statusVar(status: string): string {
  return `var(${VAR[tokenize(status)] ?? "--ink-faint"})`;
}

export function StatusMeter({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((s, x) => s + x.n, 0) || 1;
  return (
    <div>
      <div className="meter">
        {slices.map((s) => (
          <span
            key={s.status}
            title={`${s.status} · ${s.n}`}
            style={{ width: `${(s.n / total) * 100}%`, background: statusVar(s.status) }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {slices.map((s) => (
          <span key={s.status} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="size-2 rounded-full" style={{ background: statusVar(s.status) }} />
            {s.status}
            <span className="tnum font-mono text-ink-faint">{s.n.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
