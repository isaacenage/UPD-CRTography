"use client";

import type { ReactNode } from "react";

type Props = {
  // Phase 1 wraps the existing single boolean toggle so we don't lose the
  // filter feature; Phase 3 swaps in <FilterChips /> with multi-state.
  children: ReactNode;
};

export default function ChipRow({ children }: Props) {
  return (
    <div
      className="sticky z-20 bg-paper/85 supports-[backdrop-filter]:bg-paper/70 backdrop-blur-md border-b border-gray-100"
      style={{ top: "calc(var(--safe-top) + 56px)" }}
      role="region"
      aria-label="Filters"
    >
      <div
        className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-none px-3 py-2"
        style={{
          paddingLeft: "max(var(--safe-left), 0.75rem)",
          paddingRight: "max(var(--safe-right), 0.75rem)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
