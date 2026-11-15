"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? "Copied!" : "Copy link"}
      aria-label="Copy link"
      onClick={() => {
        try {
          navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {}
      }}
      className="icon-btn bg-surface"
    >
      {copied ? <Check className="size-4 text-brand-strong" /> : <Link2 className="size-4" />}
    </button>
  );
}
