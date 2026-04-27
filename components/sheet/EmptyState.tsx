"use client";

import { useState } from "react";
import InstallPrompt from "@/components/pwa/InstallPrompt";

type Props = {
  totalCount: number;
  bidetCount: number;
  publicCount: number;
};

export default function EmptyState({ totalCount, bidetCount, publicCount }: Props) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="pt-1">
      <div className="font-mono text-[10px] tracking-widest uppercase text-maroon-600 font-medium">
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

      <button
        type="button"
        onClick={() => setAboutOpen((o) => !o)}
        className="mt-3 text-xs font-mono tracking-widest uppercase text-maroon-600 underline underline-offset-2 hover:text-maroon-700"
        aria-expanded={aboutOpen}
      >
        {aboutOpen ? "Hide about" : "About this map"}
      </button>

      <InstallPrompt />

      {aboutOpen ? (
        <div className="mt-2 text-xs text-gray-700 leading-relaxed space-y-2 border-t border-gray-100 pt-3">
          <p>
            A guide to comfort rooms across UP Diliman, highlighting{" "}
            <span className="font-medium text-ink">bidet availability</span>,
            gender access, and accessibility for students, staff, and visitors.
          </p>
          <p className="text-[11px] text-gray-500">
            Primary data:{" "}
            <a
              href="https://www.facebook.com/share/p/1HwxPg9ETt/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-maroon-500 hover:text-maroon-600 underline underline-offset-2"
            >
              Philippine Collegian
            </a>
            .
          </p>
        </div>
      ) : null}
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
      ? "text-forest-500"
      : accent === "gold"
        ? "text-gold-600"
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
