"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft, ArrowRight } from "lucide-react";

export type SortDir = "asc" | "desc";

export interface Column<T> {
  key: string;
  header: string;
  /** Cell content. */
  render: (row: T) => React.ReactNode;
  /** Comparable value for sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  /** Hide below this breakpoint: "sm" | "md" | "lg". */
  hideBelow?: "sm" | "md" | "lg";
  /** Fixed column width (CSS), e.g. "5rem". */
  width?: string;
}

const HIDE: Record<string, string> = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };

/**
 * A themed, sortable, paginated table. Rows are keyboard-reachable through the
 * link in their first cell, and the whole row navigates on click. Sorting and
 * paging happen on the client over the rows it is given, so they are instant.
 */
export function DataTable<T>({
  rows,
  columns,
  initialSort,
  pageSize = 50,
  getHref,
  getKey,
  rowToken,
  emptyLabel = "Nothing to show.",
}: {
  rows: T[];
  columns: Column<T>[];
  initialSort?: { key: string; dir: SortDir };
  pageSize?: number;
  getHref: (row: T) => string;
  getKey: (row: T) => string;
  rowToken?: (row: T) => string | undefined;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const val = col.sortValue;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const slice = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key: string) => {
    setPage(1);
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "number" ? "desc" : "asc" }));
  };

  if (rows.length === 0) {
    return <div className="card-quiet p-8 text-center text-sm text-ink-muted">{emptyLabel}</div>;
  }

  return (
    <div>
      <div className="card scroll-quiet overflow-x-auto">
        <table className="dtable min-w-[36rem]">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const alignNum = c.align === "right";
                return (
                  <th key={c.key} className={`${alignNum ? "num" : ""} ${c.hideBelow ? HIDE[c.hideBelow] : ""}`} style={c.width ? { width: c.width } : undefined} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggleSort(c.key)}>
                        {c.header}
                        <span className="sort-caret">
                          {active ? sort!.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3" />}
                        </span>
                      </button>
                    ) : (
                      <span className="th-inner">{c.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => {
              const href = getHref(row);
              return (
                <tr
                  key={getKey(row)}
                  className="row-link"
                  data-token={rowToken?.(row)}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a")) return; // let real links win
                    router.push(href);
                  }}
                >
                  {columns.map((c, ci) => (
                    <td key={c.key} className={`${c.align === "right" ? "num" : ""} ${c.hideBelow ? HIDE[c.hideBelow] : ""}`}>
                      {ci === 0 ? (
                        <Link href={href} className="outline-none" tabIndex={0}>
                          {c.render(row)}
                        </Link>
                      ) : (
                        c.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="font-mono text-xs text-ink-faint">
          {sorted.length.toLocaleString()} row{sorted.length === 1 ? "" : "s"}
          {pages > 1 && <> · page {current} of {pages}</>}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="btn btn-outline h-9 px-3 disabled:opacity-40"><ArrowLeft className="size-4" /> Prev</button>
            <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="btn btn-outline h-9 px-3 disabled:opacity-40">Next <ArrowRight className="size-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
