"use client";

import { Search } from "lucide-react";

const open = () => window.dispatchEvent(new Event("open-command-palette"));

/** Header control that opens the global command palette: a field on desktop, an icon on phones. */
export function SearchTrigger() {
  return (
    <>
      <button
        type="button"
        onClick={open}
        className="hidden h-9 w-48 items-center gap-2.5 rounded-md border border-border bg-surface px-3 text-sm text-ink-faint transition-colors hover:border-ink hover:text-ink-muted md:flex lg:w-64"
        aria-label="Open search"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search anything</span>
        <kbd className="kbd">⌘K</kbd>
      </button>
      <button type="button" onClick={open} className="icon-btn md:hidden" aria-label="Open search">
        <Search className="size-4" />
      </button>
    </>
  );
}
