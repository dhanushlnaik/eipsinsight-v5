"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface RailItem {
  id: string;
  label: string;
  sub?: boolean;
}

/**
 * The "On this page" rail: anchor links with scrollspy. A single indicator bar
 * slides to the section currently in view as the reader scrolls, and clicks
 * scroll there smoothly (native, via CSS `scroll-behavior`). Links stay real
 * anchors so the hash updates and the collapsed spec still reveals on jump.
 */
export function OnThisPage({ items }: { items: RailItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [bar, setBar] = useState<{ top: number; height: number; show: boolean }>({ top: 0, height: 0, show: false });

  // Scrollspy: the active section is the last one whose top has crossed a line
  // just below the sticky header. rAF-throttled so scrolling stays smooth.
  useEffect(() => {
    const ids = items.map((i) => i.id);
    let raf = 0;
    const compute = () => {
      raf = 0;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 60;
      const line = headerH * 16 + 96; // --header-h is in rem
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - line <= 0) current = id;
        else break;
      }
      // Near the very bottom, make the last item active so the end of the page lights up.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) current = ids[ids.length - 1] ?? current;
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    compute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  // Slide the indicator to the active link.
  useLayoutEffect(() => {
    const el = linkRefs.current[active];
    if (el) setBar({ top: el.offsetTop, height: el.offsetHeight, show: true });
  }, [active, items]);

  return (
    <nav ref={navRef} className="scroll-quiet relative mt-4 max-h-[70vh] overflow-y-auto border-l border-border" aria-label="On this page">
      <span
        aria-hidden
        className="absolute left-0 w-0.5 rounded-full bg-ink transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{ top: bar.top, height: bar.height, opacity: bar.show ? 1 : 0 }}
      />
      {items.map((n) => (
        <a
          key={n.id}
          ref={(el) => {
            linkRefs.current[n.id] = el;
          }}
          href={`#${n.id}`}
          aria-current={active === n.id ? "location" : undefined}
          className={`-ml-px block border-l border-transparent transition-colors ${n.sub ? "truncate py-1 pl-7 text-[0.8rem]" : "py-1.5 pl-4 text-sm"} ${
            active === n.id ? "text-ink" : n.sub ? "text-ink-faint hover:text-ink" : "text-ink-muted hover:text-ink"
          }`}
        >
          {n.label}
        </a>
      ))}
    </nav>
  );
}
