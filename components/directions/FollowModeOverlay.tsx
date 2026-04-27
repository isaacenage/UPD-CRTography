"use client";

import { mapBus } from "@/lib/mapBus";
import { formatDistance } from "@/lib/geo/distance";
import type { RouteResult } from "@/lib/directions";

type Props = {
  route: RouteResult;
  currentStepIndex: number;
  onStop: () => void;
};

// Top-of-screen banner shown only during follow mode. Mirrors the active
// step from the directions sheet so the user doesn't have to expand the
// sheet to keep walking. Sits above the chip row using safe-area top.
export default function FollowModeOverlay({ route, currentStepIndex, onStop }: Props) {
  const step = route.steps[currentStepIndex] ?? route.steps[0];
  if (!step) return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 bg-forest-500 text-white shadow-[0_12px_24px_-12px_rgb(1,68,33,0.5)]"
      style={{ paddingTop: "var(--safe-top)" }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{
          paddingLeft: "max(var(--safe-left), 1rem)",
          paddingRight: "max(var(--safe-right), 1rem)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] tracking-widest uppercase opacity-80">
            {formatDistance(step.distanceMeters)} &middot; Step {currentStepIndex + 1} of {route.steps.length}
          </p>
          <p className="text-sm font-medium leading-snug truncate">{step.instruction}</p>
        </div>
        <button
          type="button"
          onClick={() => mapBus.dispatch("locate", undefined)}
          aria-label="Recenter map on you"
          className="shrink-0 rounded-sm border border-white/40 px-2.5 py-1.5 text-[10px] font-mono tracking-widest uppercase hover:bg-white/10 min-h-[36px] min-w-[36px]"
        >
          Recenter
        </button>
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop following the route"
          className="shrink-0 rounded-sm bg-white text-forest-700 px-3 py-1.5 text-[10px] font-mono tracking-widest uppercase hover:bg-gold-300 min-h-[36px]"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
