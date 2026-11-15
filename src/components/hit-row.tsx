import { FileText, GitPullRequest, CircleDot, User, Boxes, Newspaper } from "lucide-react";
import { Badge } from "@/components/badge";
import { tokenize } from "@/lib/utils";

export type Hit = {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  url: string;
  group?: string;
};

export const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  eip: { label: "EIP", icon: FileText },
  erc: { label: "ERC", icon: FileText },
  rip: { label: "RIP", icon: FileText },
  pr: { label: "Pull request", icon: GitPullRequest },
  issue: { label: "Issue", icon: CircleDot },
  contributor: { label: "Person", icon: User },
  upgrade: { label: "Upgrade", icon: Boxes },
  blog: { label: "Article", icon: Newspaper },
};

export const POPULAR = ["EIP-4844", "ERC-20", "Account Abstraction", "Pectra", "EIP-7702"];

/** Marks the part of a title that matches what was typed. */
export function Highlight({ text, query }: { text: string; query?: string }) {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="hl">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** The inside of one search result line. Shared by the hero bar, the palette and /search. */
export function HitBody({ hit, dense = false, query }: { hit: Hit; dense?: boolean; query?: string }) {
  const meta = TYPE_META[hit.entity_type] ?? { label: hit.entity_type, icon: FileText };
  const Icon = meta.icon;
  return (
    <>
      <span className={`grid shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-ink-muted ${dense ? "size-8" : "size-9"}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className={`truncate font-medium text-ink ${dense ? "text-sm" : "text-[0.95rem]"}`}><Highlight text={hit.title} query={query} /></span>
          {hit.status && <Badge value={hit.status} tip={false} className="shrink-0" />}
        </span>
        {hit.subtitle && <span className="block truncate text-xs text-ink-faint">{hit.subtitle}</span>}
      </span>
      <span className="eyebrow hidden shrink-0 sm:block">{meta.label}</span>
    </>
  );
}

export function hitToken(hit: Hit): string | undefined {
  return hit.status ? tokenize(hit.status) : undefined;
}
