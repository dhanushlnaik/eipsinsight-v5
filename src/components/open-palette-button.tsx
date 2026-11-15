"use client";

/** Any button that opens the global command palette. */
export function OpenPaletteButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("open-command-palette"))}>
      {children}
    </button>
  );
}
