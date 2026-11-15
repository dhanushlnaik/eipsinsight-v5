import { cn } from "@/lib/utils";

/** How every section opens: an ink rule, a mono eyebrow, then a serif title. */
export function SectionHead({
  index,
  label,
  title,
  desc,
  action,
  id,
  className,
}: {
  index?: string;
  label: string;
  title: string;
  desc?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("section-head", className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">
          {index && <span className="text-ink">{index}</span>}
          {index && <span className="mx-1.5 text-border-strong">/</span>}
          {label}
        </p>
        {action}
      </div>
      <h2 id={id} className="t-h2 mt-6 text-ink">{title}</h2>
      {desc && <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">{desc}</p>}
    </div>
  );
}
