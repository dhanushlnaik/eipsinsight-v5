import { statusVar } from "@/components/status-meter";
import type { StatusEvent } from "@/server/entity";

const CANON = ["Draft", "Review", "Last Call", "Final"];
const TERMINAL = ["Living", "Stagnant", "Withdrawn", "Moved"];

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
/** A proposal's journey through the standard lifecycle, drawn as a connected stepper.
 *  A stage is "done" only when the proposal is currently PAST it, so a proposal that
 *  regressed (e.g. Review back to Draft) shows Draft as current, not Review as done. */
export function LifecycleTrack({ events, status }: { events: StatusEvent[]; status: string | null }) {
  const visited = new Map<string, string>(); // first time it entered a stage
  const lastSeen = new Map<string, string>(); // most recent time it entered a stage
  for (const ev of events) {
    const k = ev.to_status.toLowerCase();
    if (!visited.has(k)) visited.set(k, ev.changed_at);
    lastSeen.set(k, ev.changed_at);
  }
  const cur = (status ?? "").toLowerCase();

  let path: string[];
  if (cur === "living") {
    path = ["Draft", "Living"];
  } else {
    const terminal = TERMINAL.filter((t) => t.toLowerCase() === cur || visited.has(t.toLowerCase()));
    path = [...CANON, ...terminal.filter((t) => t !== "Living")];
  }

  const curPos = path.findIndex((l) => l.toLowerCase() === cur);

  const nodes = path.map((label, i) => {
    const k = label.toLowerCase();
    const current = i === curPos;
    const done = curPos >= 0 && i < curPos && visited.has(k);
    const on = current || done;
    return {
      label,
      current,
      done,
      on,
      everVisited: visited.has(k),
      date: current ? lastSeen.get(k) ?? null : done ? visited.get(k) ?? null : null,
    };
  });

  const check = (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="var(--paper)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
  );
  const dot = (n: (typeof nodes)[number], color: string) => (
    <span
      className="relative grid size-7 shrink-0 place-items-center rounded-full"
      style={{
        background: n.on ? color : "var(--surface)",
        border: n.on ? "none" : n.everVisited ? "2px dashed var(--border-strong)" : "2px solid var(--border-strong)",
        boxShadow: n.current ? `0 0 0 4px color-mix(in oklch, ${color} 22%, transparent)` : "none",
      }}
    >
      {n.done ? check : n.current ? <span className="size-2 rounded-full" style={{ background: "var(--paper)" }} /> : null}
    </span>
  );

  return (
    <>
      {/* Phone: a vertical track, so every stage is visible without scrolling sideways */}
      <ol className="sm:hidden">
        {nodes.map((n, i) => {
          const color = n.on ? statusVar(n.label) : "var(--border-strong)";
          const last = i === nodes.length - 1;
          return (
            <li key={n.label} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && <span className="absolute bottom-0 left-[0.8rem] top-7 w-[3px] rounded-full" style={{ background: nodes[i + 1].on ? statusVar(nodes[i + 1].label) : "var(--border)" }} />}
              {dot(n, color)}
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-0.5">
                <span className={`text-sm font-semibold ${n.on ? "text-ink" : "text-ink-faint"}`}>{n.label}</span>
                <span className="font-mono text-xs text-ink-faint">{n.date ? fmt(n.date) : n.current ? "current" : ""}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Tablet and up: the horizontal stepper */}
      <ol className="hidden items-start sm:flex">
        {nodes.map((n, i) => {
          const color = n.on ? statusVar(n.label) : "var(--border-strong)";
          const nextOn = nodes[i + 1]?.on;
          return (
            <li key={n.label} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className="h-[3px] flex-1 rounded-full" style={{ background: i === 0 ? "transparent" : n.on ? color : "var(--border)" }} />
                {dot(n, color)}
                <span className="h-[3px] flex-1 rounded-full" style={{ background: i === nodes.length - 1 ? "transparent" : nextOn ? statusVar(nodes[i + 1].label) : "var(--border)" }} />
              </div>
              <span className={`mt-3 text-sm font-semibold tracking-tight ${n.on ? "text-ink" : "text-ink-faint"}`}>{n.label}</span>
              <span className="mt-0.5 font-mono text-xs text-ink-faint">{n.date ? fmt(n.date) : n.current ? "current" : ""}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
