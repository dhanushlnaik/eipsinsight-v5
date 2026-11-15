import Link from "next/link";
import { Badge } from "@/components/badge";
import { tokenize } from "@/lib/utils";

/** One proposal as a ledger line: mono call number, title, optional meta, status. */
export function ProposalRow({
  kind,
  number,
  title,
  status,
  meta,
}: {
  kind: string;
  number: number;
  title: string;
  status?: string | null;
  meta?: React.ReactNode;
}) {
  return (
    <Link href={`/${kind}/${number}`} className="ledger-row" data-token={status ? tokenize(status) : undefined}>
      <span className="w-[4.9rem] shrink-0 font-mono text-[0.8rem] sm:w-[5.6rem]">
        <span className="text-ink-faint">{kind.toUpperCase()}-</span>
        <span className="font-medium text-ink">{number}</span>
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.95rem] text-ink">{title}</span>
      {meta}
      {status && <Badge value={status} tip={false} className="shrink-0" />}
    </Link>
  );
}
