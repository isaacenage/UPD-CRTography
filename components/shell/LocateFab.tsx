"use client";

import { mapBus } from "@/lib/mapBus";

// Floats above the bottom sheet, bottom-right. Driven through `mapBus` so
// the shell doesn't need a ref into the Map component — Map subscribes to
// the "locate" event and calls geolocateControl.trigger() internally.
export default function LocateFab() {
  return (
    <button
      type="button"
      onClick={() => mapBus.dispatch("locate", undefined)}
      aria-label="Show my location on the map"
      className="absolute z-20 right-3 grid place-items-center w-14 h-14 rounded-full bg-paper border border-gray-200 text-maroon-600 shadow-[0_10px_28px_-12px_rgb(26_26_26_/_0.35)] hover:bg-maroon-50 hover:border-maroon-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 transition-colors"
      style={{
        bottom: "calc(var(--safe-bottom) + var(--sheet-peek, 120px) + 12px)",
        right: "max(var(--safe-right), 0.75rem)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
      </svg>
    </button>
  );
}
