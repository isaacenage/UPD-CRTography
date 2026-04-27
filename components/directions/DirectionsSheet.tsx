"use client";

import { formatDistance, formatDuration } from "@/lib/geo/distance";
import type { RouteResult } from "@/lib/directions";
import type { BuildingProps } from "@/lib/buildingFormat";
import { bidetAccent } from "@/lib/buildingFormat";

type Props = {
  destination: BuildingProps;
  route: RouteResult;
  followMode: boolean;
  currentStepIndex: number;
  onStart: () => void;
  onEnd: () => void;
};

export default function DirectionsSheet({
  destination,
  route,
  followMode,
  currentStepIndex,
  onStart,
  onEnd,
}: Props) {
  const accent = bidetAccent(destination);

  return (
    <div className="pt-1">
      <header className="rounded-sm overflow-hidden -mx-1" style={{ background: accent.color }}>
        <div className="px-4 py-3 text-paper">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-85 font-medium">
            Walking &middot; To
          </div>
          <h2 className="mt-1 text-base font-bold leading-tight tracking-tight">
            {destination.name}
          </h2>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="ETA" value={route.durationLabel} accent="forest" />
        <Stat label="Distance" value={route.distanceLabel} />
      </div>

      {route.fallback ? (
        <div className="mt-3 rounded-sm border border-gold-300 bg-[rgb(245,215,138,0.18)] px-3 py-2 text-[11px] text-gray-700 font-mono tracking-widest uppercase">
          Estimate only &middot; routing offline
        </div>
      ) : null}

      {!followMode ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-3 w-full bg-forest-500 hover:bg-forest-600 text-paper rounded-sm py-3.5 min-h-[52px] font-bold tracking-wide text-sm flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-500"
        >
          Start
        </button>
      ) : (
        <div className="mt-3 text-[11px] text-gray-600 font-mono tracking-widest uppercase">
          Following &middot; keep your screen on
        </div>
      )}

      <ol className="mt-4 space-y-2 border-t border-gray-100 pt-3" aria-label="Walking steps">
        {route.steps.map((step, i) => {
          const active = i === currentStepIndex && followMode;
          return (
            <li
              key={i}
              className={[
                "flex items-start gap-3 rounded-sm px-3 py-2 border",
                active
                  ? "bg-forest-50 border-forest-200"
                  : "bg-paper border-gray-100",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "shrink-0 grid place-items-center w-6 h-6 rounded-full font-mono text-[10px] font-bold",
                  active ? "bg-forest-500 text-paper" : "bg-gray-100 text-gray-500",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={["text-sm leading-snug", active ? "text-ink font-medium" : "text-ink"].join(" ")}>
                  {step.instruction}
                </p>
                <p className="mt-0.5 font-mono text-[10px] tracking-widest uppercase text-gray-500">
                  {formatDistance(step.distanceMeters)}
                  {step.durationSeconds > 0 ? <> &middot; {formatDuration(step.durationSeconds)}</> : null}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onEnd}
        className="mt-4 w-full rounded-sm border border-gray-200 bg-paper hover:bg-maroon-50 hover:border-maroon-300 text-ink py-2.5 text-xs font-mono tracking-widest uppercase min-h-[44px]"
      >
        End route
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "forest";
}) {
  const accentClass = accent === "forest" ? "text-forest-500" : "text-ink";
  return (
    <div className="rounded-sm border border-gray-200 bg-paper px-3 py-2">
      <div className={`font-bold text-lg leading-none ${accentClass}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] tracking-widest uppercase text-gray-500">
        {label}
      </div>
    </div>
  );
}
