"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/** Keeps the long part of the spec hidden until the reader asks for it.
 *  Following a link to a heading inside it opens it first, so "on this page" links always land. */
export function CollapsibleSpec({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !ref.current) return;
      const target = document.getElementById(id);
      if (target && ref.current.contains(target)) {
        setOpen(true);
        requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return (
    <div>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-outline mt-6 w-full max-w-[46rem]">
          Show full specification <ChevronDown className="size-4" />
        </button>
      )}
      <div ref={ref} className={open ? "mt-2" : "hidden"}>{children}</div>
      {open && (
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline mt-8">
          <ChevronUp className="size-4" /> Collapse specification
        </button>
      )}
    </div>
  );
}
