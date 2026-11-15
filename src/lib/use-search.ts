"use client";

import { useEffect, useRef, useState } from "react";
import type { Hit } from "@/components/hit-row";

export interface SearchData {
  hits: Hit[];
  totals: Record<string, number>;
  indexMissing: boolean;
  /** The query these results answer. Lags `q` while a new request is in flight. */
  term: string;
}

const EMPTY: SearchData = { hits: [], totals: {}, indexMissing: false, term: "" };

// Results are kept for the session, so retyping or backspacing is instant.
const cache = new Map<string, SearchData>();
const CACHE_MAX = 120;

/**
 * Live search against /api/search. Debounced, cancels stale requests, answers
 * repeats from memory, and keeps the previous results on screen while the next
 * ones load so the list never flashes empty between keystrokes.
 */
export function useSearch(q: string, types: string[] = [], delay = 110) {
  const term = q.trim();
  const typeKey = types.join(",");
  const key = `${typeKey}|${term.toLowerCase()}`;
  const [data, setData] = useState<SearchData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (!term) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    const hit = cache.get(key);
    if (hit) {
      setData(hit);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const id = setTimeout(async () => {
      try {
        const tp = typeKey ? `&types=${typeKey}` : "";
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}${tp}`, { signal: ctrl.signal });
        const json = await res.json();
        const next: SearchData = { hits: json.hits ?? [], totals: json.totals ?? {}, indexMissing: Boolean(json.indexMissing), term };
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
        cache.set(key, next);
        if (!ctrl.signal.aborted) setData(next);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setData({ ...EMPTY, term });
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, delay);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [key, term, typeKey, delay]);

  return { ...data, loading };
}
