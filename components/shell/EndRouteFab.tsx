"use client";

type Props = {
  onEnd: () => void;
};

// Surfaces only while a route line is on the map. Sits directly above
// HomeFab so the user always finds the "stop navigating" affordance in
// the same corner the rest of the map controls live. The X glyph mirrors
// the close affordance used in the overlays so the meaning is obvious
// without copy.
export default function EndRouteFab({ onEnd }: Props) {
  return (
    <button
      type="button"
      onClick={onEnd}
      aria-label="End route and exit navigation"
      className="absolute z-20 right-3 grid place-items-center w-12 h-12 rounded-full bg-paper border border-maroon-300 text-maroon-600 dark:text-maroon-300 shadow-[0_10px_28px_-12px_rgb(26_26_26_/_0.35)] hover:bg-maroon-50 hover:border-maroon-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 transition-colors"
      style={{
        // Stack: LocateFab (56) + 12 + HomeFab (48) + 8 + this (48) — keep
        // in lockstep with HomeFab/LocateFab so the column reads as one.
        bottom:
          "calc(var(--safe-bottom) + var(--sheet-peek, 120px) + 12px + 56px + 8px + 48px + 8px)",
        right: "max(var(--safe-right), 0.75rem)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        aria-hidden
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  );
}
