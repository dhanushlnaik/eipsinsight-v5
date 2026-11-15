const STAGES = ["Proposed", "Considered", "Scheduled", "Included"];

function stageIndex(bucket: string): number {
  const l = bucket.toLowerCase();
  if (l.includes("includ")) return 3;
  if (l.includes("schedul")) return 2;
  if (l.includes("consider")) return 1;
  if (l.includes("propos")) return 0;
  return -1; // declined / unknown
}

/** Where a proposal sits in a network upgrade's inclusion process (not the same as its EIP lifecycle). */
export function UpgradeProgression({ bucket }: { bucket: string }) {
  const declined = bucket.toLowerCase().includes("declin");
  const cur = stageIndex(bucket);

  if (declined) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 text-ink-muted">
          {STAGES.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="text-ink-faint line-through decoration-ink-faint/50">{s}</span>
              {i < STAGES.length - 1 && <span className="text-border-strong">→</span>}
            </span>
          ))}
        </span>
        <span className="badge tip ml-1" data-token="withdrawn" data-tip="Not included in this upgrade.">Declined</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
      {STAGES.map((s, i) => {
        const done = i <= cur;
        const isCur = i === cur;
        return (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="grid size-4 place-items-center rounded-full text-[0.55rem] font-bold"
              style={{
                background: done ? "var(--brand)" : "var(--surface-2)",
                color: done ? "var(--brand-ink)" : "transparent",
                border: done ? "none" : "1.5px solid var(--border-strong)",
                boxShadow: isCur ? "0 0 0 3px color-mix(in oklch, var(--brand) 22%, transparent)" : "none",
              }}
            >
              {done && i < cur ? "✓" : ""}
            </span>
            <span className={done ? "font-medium text-ink" : "text-ink-faint"}>{s}</span>
            {i < STAGES.length - 1 && <span className={`mx-1 ${i < cur ? "text-brand" : "text-border-strong"}`}>→</span>}
          </span>
        );
      })}
    </div>
  );
}
