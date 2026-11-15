import { unstable_cache } from "next/cache";

/**
 * Cache a read for five minutes, but never cache a failure.
 *
 * The loader is allowed to throw. A throw is caught OUTSIDE the cache, so the
 * fallback is returned for that one request and the next request tries again.
 * (Catching inside would store the empty fallback and show zeros for five
 * minutes after the database comes back.)
 */
export function cachedOr<T>(load: () => Promise<T>, key: string[], fallback: T, revalidate = 300): () => Promise<T> {
  const cached = unstable_cache(load, key, { revalidate });
  return async () => {
    try {
      return await cached();
    } catch {
      return fallback;
    }
  };
}
