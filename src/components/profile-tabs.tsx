"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { DataTable, type Column } from "@/components/data-table";
import { fmtDate } from "@/lib/format";
import { tokenize } from "@/lib/utils";
import type { AuthoredProposal, ProfilePR, ProfileReview } from "@/server/contributor";

function prNumberCell(repoShort: string, number: number) {
  return (
    <span className="font-mono text-[0.82rem]">
      <span className="text-ink-faint">{repoShort.toUpperCase()} </span>
      <span className="font-medium text-ink">#{number}</span>
    </span>
  );
}

const AUTHORED_COLS: Column<AuthoredProposal>[] = [
  { key: "number", header: "Proposal", width: "8rem", sortValue: (p) => p.number, render: (p) => <span className="font-mono text-[0.82rem]"><span className="text-ink-faint">{p.kind.toUpperCase()}-</span><span className="font-medium text-ink">{p.number}</span></span> },
  { key: "title", header: "Title", sortValue: (p) => p.title.toLowerCase(), render: (p) => <span className="block max-w-[34rem] truncate text-ink">{p.title}</span> },
];

const PR_COLS: Column<ProfilePR>[] = [
  { key: "number", header: "Pull request", width: "7.5rem", sortValue: (p) => p.number, render: (p) => prNumberCell(p.repoShort, p.number) },
  { key: "title", header: "Title", sortValue: (p) => p.title.toLowerCase(), render: (p) => <span className="block max-w-[28rem] truncate text-ink">{p.title}</span> },
  { key: "state", header: "State", width: "6.5rem", sortValue: (p) => p.state, render: (p) => <Badge value={p.state} tip={false} /> },
  { key: "reviews", header: "Reviews", width: "6rem", align: "right", hideBelow: "md", sortValue: (p) => p.reviews, render: (p) => <span className="font-mono text-xs text-ink-muted">{p.reviews}</span> },
  { key: "comments", header: "Comments", width: "6.5rem", align: "right", hideBelow: "lg", sortValue: (p) => p.comments, render: (p) => <span className="font-mono text-xs text-ink-muted">{p.comments}</span> },
  { key: "updated", header: "Updated", width: "7.5rem", align: "right", hideBelow: "sm", sortValue: (p) => p.updated ?? "", render: (p) => <span className="font-mono text-xs text-ink-faint">{p.updated ? fmtDate(p.updated) : "—"}</span> },
];

const REVIEW_COLS: Column<ProfileReview>[] = [
  { key: "number", header: "Pull request", width: "7.5rem", sortValue: (r) => r.number, render: (r) => prNumberCell(r.repoShort, r.number) },
  { key: "title", header: "Title", sortValue: (r) => (r.title ?? "").toLowerCase(), render: (r) => <span className="block max-w-[30rem] truncate text-ink">{r.title ?? `Pull request #${r.number}`}</span> },
  { key: "state", header: "Review", width: "9rem", sortValue: (r) => r.state, render: (r) => <Badge value={r.state.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())} tip={false} /> },
  { key: "at", header: "Reviewed", width: "7.5rem", align: "right", hideBelow: "sm", sortValue: (r) => r.at, render: (r) => <span className="font-mono text-xs text-ink-faint">{fmtDate(r.at)}</span> },
];

type TabKey = "authored" | "prs" | "reviews";

export function ProfileTabs({ authored, pullRequests, reviews }: { authored: AuthoredProposal[]; pullRequests: ProfilePR[]; reviews: ProfileReview[] }) {
  const allTabs: { key: TabKey; label: string; n: number }[] = [
    { key: "authored", label: "Authored", n: authored.length },
    { key: "prs", label: "Pull requests", n: pullRequests.length },
    { key: "reviews", label: "Reviews", n: reviews.length },
  ];
  const tabs = allTabs.filter((t) => t.n > 0);

  const [active, setActive] = useState<TabKey>(tabs[0]?.key ?? "authored");
  if (tabs.length === 0) return <div className="card-quiet p-8 text-center text-sm text-ink-muted">No contributions on record.</div>;

  return (
    <div>
      <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setActive(t.key)} className="chip shrink-0" data-active={active === t.key} aria-pressed={active === t.key}>
            {t.label} <span className="chip-n">{t.n.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {active === "authored" && (
        <DataTable rows={authored} columns={AUTHORED_COLS} initialSort={{ key: "number", dir: "desc" }} getHref={(p) => `/${p.kind}/${p.number}`} getKey={(p) => `${p.kind}-${p.number}`} emptyLabel="No authored proposals." />
      )}
      {active === "prs" && (
        <DataTable rows={pullRequests} columns={PR_COLS} initialSort={{ key: "updated", dir: "desc" }} getHref={(p) => `/pr/${p.repoShort}/${p.number}`} getKey={(p) => `${p.repoShort}-${p.number}`} rowToken={(p) => tokenize(p.state)} emptyLabel="No pull requests." />
      )}
      {active === "reviews" && (
        <DataTable rows={reviews} columns={REVIEW_COLS} initialSort={{ key: "at", dir: "desc" }} getHref={(r) => `/pr/${r.repoShort}/${r.number}`} getKey={(r) => `${r.repoShort}-${r.number}`} rowToken={(r) => tokenize(r.state)} emptyLabel="No reviews." />
      )}
    </div>
  );
}
