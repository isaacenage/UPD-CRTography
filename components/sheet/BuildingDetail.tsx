"use client";

import { useEffect, useMemo, useState } from "react";
import {
  accessLabel,
  bidetAccent,
  type BuildingProps,
} from "@/lib/buildingFormat";
import { distanceMeters, formatDistance } from "@/lib/geo/distance";
import { mapBus } from "@/lib/mapBus";

type UserLocation = { lng: number; lat: number; accuracy: number } | null;

type Props = {
  building: BuildingProps;
  centroid: readonly [number, number] | null;
  // Phase 4 wires this to start the directions flow.
  onRequestDirections?: () => void;
  // Phase 4 sets a flag for whether routing dependency has loaded yet.
  directionsReady?: boolean;
};

export default function BuildingDetail({
  building,
  centroid,
  onRequestDirections,
  directionsReady = false,
}: Props) {
  const accent = bidetAccent(building);
  const [userLocation, setUserLocation] = useState<UserLocation>(null);

  // Subscribe to live user location dispatched by the Map's GeolocateControl.
  useEffect(() => {
    return mapBus.on("userLocation", (loc) => setUserLocation(loc));
  }, []);

  const distance = useMemo(() => {
    if (!userLocation || !centroid) return null;
    return distanceMeters([userLocation.lng, userLocation.lat], centroid);
  }, [userLocation, centroid]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `Hanap-Bidet · ${building.name}`,
          text: `${accent.label} · ${building.acronym} (${building.name}) on the UP Diliman comfort room atlas.`,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        })
        .catch(() => {
          // User dismissed or browser refused — silent.
        });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  const reportHref = useMemo(() => {
    const subject = encodeURIComponent(
      `[Hanap-Bidet] Report: ${building.acronym || building.name}`,
    );
    const body = encodeURIComponent(
      `Building: ${building.name}\nAcronym: ${building.acronym}\nCurrent record: ${building.bidetRaw || "—"} / ${building.accessRaw || "—"}\n\nWhat's wrong / what to update:\n`,
    );
    return `mailto:hello@isaacenage.xyz?subject=${subject}&body=${body}`;
  }, [building]);

  return (
    <div className="pt-1">
      <header
        className="rounded-sm overflow-hidden -mx-1"
        style={{ background: accent.color }}
      >
        <div className="px-4 py-3 text-paper">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-85 font-medium">
            {accent.label}
            {building.acronym ? <> &middot; {building.acronym}</> : null}
          </div>
          <h2 className="mt-1 text-lg font-bold leading-tight tracking-tight">
            {building.name}
          </h2>
        </div>
      </header>

      {distance !== null ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-100 border border-gray-200 px-3 py-1">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-forest-500" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-gray-700">
            {formatDistance(distance)} away
          </span>
        </div>
      ) : (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-paper border border-gray-200 px-3 py-1">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
            Locate to see distance
          </span>
        </div>
      )}

      <ul className="mt-3 grid grid-cols-1 gap-2">
        <Badge label="Has Bidet" value={accent.label} accent={accent.color} symbol={accent.symbol} />
        <Badge label="Gender" value={building.gender} />
        <Badge label="Access" value={accessLabel(building)} />
      </ul>

      <button
        type="button"
        disabled={!onRequestDirections || !directionsReady}
        onClick={() => onRequestDirections?.()}
        className="mt-4 w-full bg-forest-500 hover:bg-forest-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-paper rounded-sm py-3.5 min-h-[52px] font-bold tracking-wide text-sm flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-500"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          aria-hidden
        >
          <path d="M12 2 4 12l8 10 8-10z" />
          <path d="M9 14v-3h6v3" />
        </svg>
        {directionsReady ? "Get directions" : "Directions (loading…)"}
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="rounded-sm border border-gray-200 bg-paper hover:bg-maroon-50 hover:border-maroon-300 text-ink py-2.5 text-xs font-mono tracking-widest uppercase transition-colors min-h-[44px]"
        >
          Share
        </button>
        <a
          href={reportHref}
          className="grid place-items-center rounded-sm border border-gray-200 bg-paper hover:bg-maroon-50 hover:border-maroon-300 text-ink py-2.5 text-xs font-mono tracking-widest uppercase transition-colors min-h-[44px]"
        >
          Report
        </a>
      </div>

      <div className="mt-4 rounded-sm bg-gray-100 border border-gray-200 aspect-[4/3] grid place-items-center text-gray-400 text-xs font-mono tracking-widest uppercase">
        Photo · coming soon
      </div>
    </div>
  );
}

function Badge({
  label,
  value,
  accent,
  symbol,
}: {
  label: string;
  value: string;
  accent?: string;
  symbol?: "check" | "cross" | "question";
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-sm border border-gray-200 bg-paper px-3 py-2.5">
      <span className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
        {label}
      </span>
      <span className="flex items-center gap-2 text-sm font-medium text-ink text-right">
        {symbol ? (
          <span
            aria-hidden
            className="grid place-items-center w-5 h-5 rounded-full text-paper text-[11px] font-bold"
            style={{ background: accent ?? "var(--color-gray-400)" }}
          >
            {symbol === "check" ? "✓" : symbol === "cross" ? "✗" : "?"}
          </span>
        ) : null}
        <span>{value}</span>
      </span>
    </li>
  );
}
