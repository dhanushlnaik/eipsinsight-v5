const STAGES = [
  { short: "PFI", title: "Proposed", token: "draft", desc: "Put forward for this upgrade, still under initial review by client teams." },
  { short: "CFI", title: "Considered", token: "review", desc: "Client teams are positive; implementation may begin, but inclusion is not yet guaranteed." },
  { short: "SFI", title: "Scheduled", token: "last-call", desc: "Client teams have agreed to implement it for the devnets. Very likely to ship." },
  { short: "Incl.", title: "Included", token: "final", desc: "Part of the activated upgrade on mainnet." },
];

/** The ladder an EIP climbs to get into an upgrade, with Declined as the branch off it. */
export function InclusionLadder() {
  return (
    <div className="card p-5 sm:p-6">
      <ol className="grid gap-3 sm:grid-cols-4">
        {STAGES.map((s, i) => (
          <li key={s.short} className="relative">
            <div className="flex items-center gap-2">
              <span className="badge" data-token={s.token}>{s.short}</span>
              <span className="font-serif text-[1.05rem] text-ink">{s.title}</span>
              {i < STAGES.length - 1 && <span aria-hidden className="ml-auto hidden text-ink-faint sm:inline">→</span>}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{s.desc}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
        <span className="badge shrink-0" data-token="withdrawn">DFI</span>
        <p className="text-xs leading-relaxed text-ink-muted">
          <span className="font-medium text-ink">Declined.</span> Proposed but not taken for this upgrade. It can be reconsidered for a later one.
        </p>
      </div>
    </div>
  );
}
