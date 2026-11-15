"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap wrap-narrow py-20 sm:py-28">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="t-h1 mt-4 text-ink">
        This page could not be <span className="accent">put together.</span>
      </h1>
      <p className="t-lead mt-5 max-w-xl">
        The data behind it did not answer in time. That is usually brief. Nothing you did caused it.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-outline">Back to the front page</Link>
      </div>
    </main>
  );
}
