"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  // Reserved height when the sheet is in its "peek" snap. Read by LocateFab
  // via CSS var --sheet-peek so the FAB floats just above the sheet edge.
  peekHeight?: number;
};

// Phase 1 placeholder shell. Renders a non-interactive sheet at peek
// height with a drag handle and a children slot. Phase 2 replaces this
// with the full pointer-event-driven BottomSheet (snap points, drag,
// content router). The CSS var contract is preserved so LocateFab's
// position survives the swap.
export default function BottomSheetShell({ children, peekHeight = 120 }: Props) {
  return (
    <aside
      className="absolute left-0 right-0 bottom-0 z-30 bg-paper border-t border-gray-200 rounded-t-xl shadow-[0_-12px_40px_-16px_rgb(26_26_26_/_0.18)]"
      style={
        {
          height: `calc(${peekHeight}px + var(--safe-bottom))`,
          paddingBottom: "var(--safe-bottom)",
          ["--sheet-peek" as string]: `${peekHeight}px`,
        } as React.CSSProperties
      }
      role="complementary"
      aria-label="Building details"
    >
      <div className="grid place-items-center pt-2 pb-1" aria-hidden>
        <div className="w-12 h-1 rounded-full bg-gray-300" />
      </div>
      <div className="px-5 pt-1">{children}</div>
    </aside>
  );
}
