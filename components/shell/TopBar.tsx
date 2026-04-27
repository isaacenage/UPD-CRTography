"use client";

import type { ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";

type Props = {
  // Slot for the search input. Phase 3 fills it with <SearchBar />; Phase 1
  // shows a placeholder that visually matches the eventual search bar so
  // the layout doesn't jump when search lands.
  searchSlot?: ReactNode;
};

export default function TopBar({ searchSlot }: Props) {
  return (
    <header
      className="sticky top-0 z-30 bg-paper/85 supports-[backdrop-filter]:bg-paper/70 backdrop-blur-md border-b border-gray-200"
      // isolate prevents iOS stacking-context bugs with the blurred bg
      style={{ paddingTop: "var(--safe-top)", isolation: "isolate" }}
    >
      <div
        className="flex items-center gap-3 px-3 py-2"
        style={{
          paddingLeft: "max(var(--safe-left), 0.75rem)",
          paddingRight: "max(var(--safe-right), 0.75rem)",
        }}
      >
        <div className="shrink-0 flex flex-col leading-none">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-maroon-600 dark:text-maroon-300 font-medium">
            UPD
          </span>
          <span className="font-bold tracking-tight text-ink text-base mt-0.5">
            Hanap-Bidet
          </span>
        </div>
        <div className="flex-1 min-w-0">{searchSlot ?? <SearchPlaceholder />}</div>
        <ThemeToggle />
      </div>
    </header>
  );
}

function SearchPlaceholder() {
  return (
    <div
      aria-hidden
      className="h-10 w-full rounded-sm bg-paper border border-gray-200 px-3 flex items-center text-xs font-mono uppercase tracking-widest text-gray-400"
    >
      Search buildings &middot;&middot;&middot;
    </div>
  );
}
