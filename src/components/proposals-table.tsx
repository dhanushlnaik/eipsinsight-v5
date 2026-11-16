"use client";

import { Badge } from "@/components/badge";
import { DataTable, type Column } from "@/components/data-table";
import { STATUS_ORDER, fmtDate } from "@/lib/format";
import { tokenize } from "@/lib/utils";
import type { ProposalLite } from "@/server/proposals";

const statusRank = (s: string | null) => {
  const i = STATUS_ORDER.indexOf(s ?? "");
  return i < 0 ? 99 : i;
};

const COLUMNS: Column<ProposalLite>[] = [
  {
    key: "number",
    header: "Proposal",
    width: "8rem",
    sortValue: (p) => p.number,
    render: (p) => (
      <span className="font-mono text-[0.82rem]">
        <span className="text-ink-faint">{p.kind.toUpperCase()}-</span>
        <span className="font-medium text-ink">{p.number}</span>
      </span>
    ),
  },
  {
    key: "title",
    header: "Title",
    sortValue: (p) => p.title.toLowerCase(),
    render: (p) => <span className="block max-w-[32rem] truncate text-ink">{p.title}</span>,
  },
  {
    key: "track",
    header: "Track",
    width: "9rem",
    hideBelow: "md",
    sortValue: (p) => p.category || p.type || "~",
    render: (p) => {
      const t = p.category || p.type;
      return t ? <Badge value={t} tip={false} /> : <span className="text-ink-faint">—</span>;
    },
  },
  {
    key: "status",
    header: "Status",
    width: "8rem",
    sortValue: (p) => statusRank(p.status),
    render: (p) => (p.status ? <Badge value={p.status} tip={false} /> : <span className="text-ink-faint">—</span>),
  },
  {
    key: "created",
    header: "Created",
    width: "8rem",
    align: "right",
    hideBelow: "sm",
    sortValue: (p) => p.created_at ?? "",
    render: (p) => <span className="font-mono text-xs text-ink-faint">{p.created_at ? fmtDate(p.created_at) : "—"}</span>,
  },
];

export function ProposalsTable({ rows }: { rows: ProposalLite[] }) {
  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      initialSort={{ key: "number", dir: "desc" }}
      getHref={(p) => `/${p.kind}/${p.number}`}
      getKey={(p) => `${p.kind}-${p.number}`}
      rowToken={(p) => (p.status ? tokenize(p.status) : undefined)}
      emptyLabel="Nothing matches these filters."
    />
  );
}
