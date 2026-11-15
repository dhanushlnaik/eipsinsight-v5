"use client";

import { useState } from "react";
import { ArrowUpRight, GitMerge, GitPullRequest, GitPullRequestClosed } from "lucide-react";
import type { EditorialPR } from "@/server/entity";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type Filter = "all" | "edits" | "mentions" | "open" | "merged";

export function EditorialPRs({ prs, repo, isFinal }: { prs: EditorialPR[]; repo: string; isFinal: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visible, setVisible] = useState(5);

  const counts = {
    all: prs.length,
    edits: prs.filter((p) => p.edits).length,
    mentions: prs.filter((p) => !p.edits).length,
    open: prs.filter((p) => p.state === "open").length,
    merged: prs.filter((p) => p.merged).length,
  };

  const allTabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "edits", label: "Edits this proposal" },
    { key: "mentions", label: "Mentions" },
    { key: "open", label: "Open" },
    { key: "merged", label: "Merged" },
  ];
  const tabs = allTabs.filter((t) => counts[t.key] > 0);

  const match = (p: EditorialPR) =>
    filter === "all" ? true
    : filter === "edits" ? p.edits
    : filter === "mentions" ? !p.edits
    : filter === "open" ? p.state === "open"
    : p.merged;

  const filtered = prs.filter(match);
  const shown = filtered.slice(0, visible);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setFilter(t.key);
              setVisible(5);
            }}
            className="chip"
            data-active={filter === t.key}
            aria-pressed={filter === t.key}
          >
            {t.label} <span className="chip-n">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <ul className="card ledger overflow-hidden">
        {shown.map((pr) => {
          const Icon = pr.merged ? GitMerge : pr.state === "closed" ? GitPullRequestClosed : GitPullRequest;
          const tone = pr.merged ? "var(--c-moved)" : pr.state === "closed" ? "var(--c-withdrawn)" : "var(--c-final)";
          return (
            <li key={`${pr.repo}-${pr.pr_number}`}>
              <a href={`/pr/${(pr.repo || repo).split("/").pop()!.toLowerCase()}/${pr.pr_number}`} className="ledger-row group" style={{ "--token": tone } as React.CSSProperties}>
                <Icon className="size-4 shrink-0" style={{ color: tone }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm text-ink">{pr.title}</span>
                    {pr.edits && (
                      <span className="shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-ink-faint" title="The PR title references this proposal, so it edits it directly.">
                        edits
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-ink-faint"><span className="font-mono">#{pr.pr_number}</span>{pr.author ? ` · ${pr.author}` : ""} · {pr.merged ? "merged" : pr.state} · {fmtDate(pr.updated_at)}</span>
                </span>
                <ArrowUpRight className="size-3.5 shrink-0 text-transparent group-hover:text-ink-faint" />
              </a>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-faint">No pull requests match this filter.</li>}
      </ul>

      {filtered.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 10)}
          className="btn btn-outline mt-3 w-full"
        >
          Show more ({filtered.length - visible} left)
        </button>
      )}

      {isFinal && (
        <p className="mt-3 text-xs text-ink-faint">Edits to a Final proposal are routine editorial maintenance, not a sign the standard is still under review.</p>
      )}
    </div>
  );
}
