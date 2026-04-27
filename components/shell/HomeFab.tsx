"use client";

import { mapBus } from "@/lib/mapBus";

// Sits above LocateFab and re-fits the camera to the campus building
// extent. Pinch / scroll handle zoom interactively, so this replaces the
// MapLibre +/- NavigationControl with a single "show me everything" tap.
export default function HomeFab() {
  return (
    <button
      type="button"
      onClick={() => mapBus.dispatch("fitBuildings", undefined)}
      aria-label="Show all buildings on the map"
      className="absolute z-20 right-3 grid place-items-center w-12 h-12 rounded-full bg-paper border border-gray-200 text-maroon-600 shadow-[0_10px_28px_-12px_rgb(26_26_26_/_0.35)] hover:bg-maroon-50 hover:border-maroon-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500 transition-colors"
      style={{
        // Stack above LocateFab (56px tall + 12px gap).
        bottom: "calc(var(--safe-bottom) + var(--sheet-peek, 120px) + 12px + 56px + 8px)",
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
        className="w-5 h-5"
        aria-hidden
      >
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    </button>
  );
}
