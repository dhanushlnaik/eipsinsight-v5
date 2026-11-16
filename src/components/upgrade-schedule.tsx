import { calculateForkSchedule, groupScheduleIntoPhases, FORK_SCHEDULE_CONFIGS, type SchedulePhase, type ScheduleMilestone } from "@/data/fork-schedule";

function fmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const PHASE_TOKEN: Record<string, string> = { scoping: "draft", development: "review", testnets: "last-call", mainnet: "final" };

/**
 * The projected roadmap for an upgrade still being assembled: scoping → devnets →
 * testnets → mainnet, computed backwards from the curated mainnet target. Locked
 * dates are real milestones that have happened; the rest are projections.
 * Renders nothing for upgrades with no schedule config.
 */
export function UpgradeSchedule({ slug }: { slug: string }) {
  const config = FORK_SCHEDULE_CONFIGS.find((c) => c.slug === slug);
  if (!config) return null;

  const today = new Date().toISOString().slice(0, 10);
  const phases = groupScheduleIntoPhases(calculateForkSchedule(config), today);
  const anyLocked = phases.some((p) => p.milestones.some((m) => m.locked));

  return (
    <div>
      <div className="space-y-8">
        {phases.map((phase) => (
          <Phase key={phase.id} phase={phase} today={today} />
        ))}
      </div>
      <p className="mt-6 text-xs text-ink-faint">
        Target mainnet {fmt(config.mainnetTarget)}.{" "}
        {anyLocked ? "Dates marked actual have happened; the rest are projected from the mainnet target and shift as the schedule firms up." : "All dates are projected from the mainnet target and shift as the schedule firms up."}
      </p>
    </div>
  );
}

function Phase({ phase, today }: { phase: SchedulePhase; today: string }) {
  const statusLabel = phase.status === "completed" ? "Done" : phase.status === "active" ? "In progress" : "Upcoming";
  const token = PHASE_TOKEN[phase.id] ?? "draft";
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="badge" data-token={phase.status === "active" ? token : phase.status === "completed" ? "final" : undefined} data-active={phase.status === "active"}>
          {phase.label}
        </span>
        <span className="eyebrow">{statusLabel}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <p className="mt-2 text-sm text-ink-muted">{phase.description}</p>
      {phase.milestones.length > 0 && (
        <ol className="mt-4 border-l border-border pl-5">
          {phase.milestones.map((m) => (
            <Milestone key={m.id} m={m} today={today} />
          ))}
        </ol>
      )}
    </div>
  );
}

function Milestone({ m, today }: { m: ScheduleMilestone; today: string }) {
  const past = m.date < today;
  return (
    <li className="relative pb-4 last:pb-0">
      <span
        className="absolute -left-[1.52rem] top-1 size-2.5 rounded-full ring-4 ring-paper"
        style={{ background: past ? "var(--brand)" : "var(--surface)", border: past ? "none" : "2px solid var(--border-strong)" }}
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className={`text-sm ${past ? "text-ink" : "text-ink-muted"}`}>{m.label}</span>
        {m.locked && <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-ink-faint">actual</span>}
      </div>
      <span className={`font-mono text-xs ${m.locked ? "text-ink-muted" : "text-ink-faint"}`}>{fmt(m.date)}{!m.locked && " · projected"}</span>
    </li>
  );
}
