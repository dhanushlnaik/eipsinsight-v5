"use client";

import { useState } from "react";

// GitHub username rules: 1–39 chars, alphanumeric or single hyphens, no leading/trailing hyphen.
const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

function initialsOf(s: string): string {
  const parts = s.replace(/[^a-zA-Z]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const letters = (parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] ?? s).slice(0, 2)).toUpperCase();
  return letters || "?";
}

/**
 * A contributor avatar. Uses the GitHub profile image when `handle` is a valid
 * GitHub username; otherwise (e.g. a git commit author name like "Greg Colvin")
 * or when the image fails to load, it falls back to initials so the avatar is
 * never a broken image.
 */
export function Avatar({ handle, label, px = 28, className = "" }: { handle: string | null | undefined; label?: string | null; px?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const valid = !!handle && HANDLE.test(handle);
  const box = `rounded-full border border-border bg-surface-2 ${className}`;

  if (valid && !failed) {
    return (
      <img
        src={`https://github.com/${handle}.png?size=${Math.min(px * 2, 460)}`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${box} object-cover`}
      />
    );
  }
  return (
    <span className={`${box} grid shrink-0 place-items-center text-ink-faint`} aria-hidden>
      <span className="font-medium leading-none" style={{ fontSize: Math.max(9, Math.round(px * 0.36)) }}>
        {initialsOf(label || handle || "?")}
      </span>
    </span>
  );
}
