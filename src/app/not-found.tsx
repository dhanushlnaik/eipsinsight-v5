import Link from "next/link";
import { OpenPaletteButton } from "@/components/open-palette-button";

export default function NotFound() {
  return (
    <main className="wrap wrap-narrow py-20 sm:py-28">
      <p className="eyebrow">404</p>
      <h1 className="t-h1 mt-4 text-ink">
        Nothing is filed <span className="accent">under that.</span>
      </h1>
      <p className="t-lead mt-5 max-w-xl">
        The number may be wrong, or the proposal may live in a different repository. EIP-20 and ERC-20 are different addresses here.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <OpenPaletteButton className="btn btn-primary">Search for it</OpenPaletteButton>
        <Link href="/proposals" className="btn btn-outline">Browse all proposals</Link>
      </div>
    </main>
  );
}
