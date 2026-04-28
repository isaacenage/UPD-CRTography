"use client";

import Link from "next/link";
import InstallPrompt from "@/components/pwa/InstallPrompt";

type Props = {
  totalCount: number;
  bidetCount: number;
  publicCount: number;
  // Opens the shared global About panel — single source of truth lives in
  // the page so selecting a building no longer hides this entry point.
  onOpenAbout?: () => void;
};

export default function EmptyState({
  totalCount,
  bidetCount,
  publicCount,
  onOpenAbout,
}: Props) {
  return (
    <div className="pt-1">
      <div className="font-mono text-[10px] tracking-widest uppercase text-maroon-600 dark:text-maroon-300 font-medium">
        UP Diliman &middot; Comfort Room Atlas
      </div>
      <h2 className="mt-1 text-lg font-bold tracking-tight text-ink leading-tight">
        Tap a building to begin
      </h2>
      <p className="mt-1 text-xs text-gray-600 leading-relaxed">
        Search by name or acronym, filter by access, then get walking directions
        from your location.
      </p>

      <ul className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Buildings" value={totalCount} />
        <Stat label="With bidet" value={bidetCount} accent="forest" />
        <Stat label="Public" value={publicCount} accent="gold" />
      </ul>

      {onOpenAbout ? (
        <button
          type="button"
          onClick={onOpenAbout}
          className="mt-3 text-xs font-mono tracking-widest uppercase text-maroon-600 dark:text-maroon-300 underline underline-offset-2 hover:text-maroon-700 dark:hover:text-maroon-200"
        >
          About this map
        </button>
      ) : null}

      <InstallPrompt />

      <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 text-[11px] font-mono tracking-widest uppercase">
        <Link
          href="/terms"
          className="text-gray-500 hover:text-maroon-600 dark:hover:text-maroon-300 underline underline-offset-2"
        >
          Terms
        </Link>
        <Link
          href="/privacy"
          className="text-gray-500 hover:text-maroon-600 dark:hover:text-maroon-300 underline underline-offset-2"
        >
          Privacy
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "forest" | "gold";
}) {
  const accentClass =
    accent === "forest"
      ? "text-forest-500 dark:text-forest-300"
      : accent === "gold"
        ? "text-gold-600 dark:text-gold-300"
        : "text-ink";
  return (
    <li className="rounded-sm border border-gray-200 bg-paper px-3 py-2">
      <div className={`font-bold text-lg leading-none ${accentClass}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] tracking-widest uppercase text-gray-500">
        {label}
      </div>
    </li>
  );
}
