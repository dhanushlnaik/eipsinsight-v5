import { Check, Minus, ChevronRight } from "lucide-react";
import type { Curation, EnterpriseImpact } from "@/server/entity";

/** The plain-language overview: what it does, and the benefits and tradeoffs. */
export function PlainLanguage({ c }: { c: Curation }) {
  const hasLists = c.benefits.length > 0 || c.tradeoffs.length > 0;
  return (
    <div>
      {c.laymanSummary && <p className="max-w-2xl text-[1.05rem] leading-relaxed text-ink-muted">{c.laymanSummary}</p>}
      {hasLists && (
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {c.benefits.length > 0 && (
            <div>
              <p className="eyebrow mb-3" data-token="final"><span className="text-[var(--c-final)]">Benefits</span></p>
              <ul className="space-y-2.5">
                {c.benefits.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--c-final)]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.tradeoffs.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Tradeoffs</p>
              <ul className="space-y-2.5">
                {c.tradeoffs.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-muted">
                    <Minus className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Who a proposal affects, one card per stakeholder group. */
export function Stakeholders({ c }: { c: Curation }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {c.stakeholders.map((s) => (
        <div key={s.key} className="card p-5">
          <p className="font-serif text-[1.05rem] text-ink">{s.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.description}</p>
        </div>
      ))}
    </div>
  );
}

const TIER_TOKEN: Record<string, string> = { high: "withdrawn", significant: "last-call", moderate: "review", limited: "draft", low: "draft", none: "draft" };

/** The enterprise / institutional readiness brief. */
export function Enterprise({ e }: { e: EnterpriseImpact }) {
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Impact tier</span>
        {e.tier && <span className="badge first-letter:uppercase" data-token={TIER_TOKEN[e.tier.toLowerCase()] ?? "review"}>{e.tier}</span>}
      </div>
      {e.summary && <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">{e.summary}</p>}
      {e.readiness && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="eyebrow mb-2">What to do</p>
          <p className="text-sm leading-relaxed text-ink-muted">{e.readiness}</p>
        </div>
      )}
      {e.organizations.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="eyebrow mb-3">Who should pay attention</p>
          <ul className="space-y-3">
            {e.organizations.map((o, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                {o.role && <span className="font-medium text-ink">{o.role}</span>}
                {o.level && <span className="badge badge-plain" data-token={TIER_TOKEN[o.level.toLowerCase()] ?? "review"}>{o.level}</span>}
                {o.why && <span className="w-full text-ink-muted">{o.why}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Frequently asked questions, as a native accordion (works without JS). */
export function Faqs({ c }: { c: Curation }) {
  return (
    <div className="card divide-y divide-border overflow-hidden">
      {c.faq.map((f, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2">
            <ChevronRight className="size-4 shrink-0 text-ink-faint transition-transform group-open:rotate-90" />
            <span className="text-[0.95rem] font-medium text-ink">{f.question}</span>
          </summary>
          <div className="px-5 pb-4 pl-12 text-sm leading-relaxed text-ink-muted">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}
