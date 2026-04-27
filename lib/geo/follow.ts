// Camera follow + reroute-on-deviation logic for navigation mode.
// Pure controller — owns no DOM, returns a teardown. Subscribes to the
// mapBus userLocation stream rather than the raw GeolocateControl event
// so the rest of the app sees the same coordinates.

import { distanceMeters } from "@/lib/geo/distance";
import { mapBus } from "@/lib/mapBus";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { LngLat } from "@/lib/geo/geoBounds";
import type { RouteResult } from "@/lib/directions";

const DEVIATION_M = 40; // meters off route before reroute is considered
const REROUTE_DEBOUNCE_MS = 5000;
const STEP_ADVANCE_M = 25;

export type FollowOptions = Readonly<{
  map: MapLibreMap;
  route: RouteResult;
  onReroute: (from: LngLat) => void;
  onStepAdvance: (stepIndex: number) => void;
  onComplete: () => void;
}>;

function nearestPointOnLine(
  user: LngLat,
  line: GeoJSON.Position[],
): { distance: number; index: number } {
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < line.length; i++) {
    const p = line[i];
    const d = distanceMeters(user, [p[0], p[1]] as LngLat);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return { distance: bestDist, index: bestIdx };
}

export function startFollow(opts: FollowOptions): () => void {
  const { map, route, onReroute, onStepAdvance, onComplete } = opts;
  const linePoints = route.geometry.coordinates;

  let lastReroute = 0;
  let consecutiveOff = 0;
  let stepIndex = 0;
  let stopped = false;

  const off = mapBus.on("userLocation", (loc) => {
    if (stopped || !loc) return;
    const user: LngLat = [loc.lng, loc.lat];

    // Camera follow — center on user, keep current zoom + bearing.
    map.easeTo({ center: [user[0], user[1]], duration: 600, essential: true });

    if (linePoints.length === 0) return;

    const { distance, index } = nearestPointOnLine(user, linePoints as GeoJSON.Position[]);

    // Step progression: each route step roughly maps to a chunk of the line.
    // For a coarse but useful update, advance stepIndex when user passes the
    // proportional cutoff for the next step.
    if (route.steps.length > 1) {
      const proportion = index / Math.max(1, linePoints.length - 1);
      const expectedStep = Math.min(
        route.steps.length - 1,
        Math.floor(proportion * route.steps.length),
      );
      if (expectedStep !== stepIndex) {
        stepIndex = expectedStep;
        onStepAdvance(stepIndex);
      }
    }

    // Off-route detection: require two consecutive fixes past the deviation
    // threshold + a debounce window so a single jittery GPS sample doesn't
    // trigger a reroute storm.
    if (distance > DEVIATION_M) {
      consecutiveOff += 1;
      const now = Date.now();
      if (consecutiveOff >= 2 && now - lastReroute > REROUTE_DEBOUNCE_MS) {
        lastReroute = now;
        consecutiveOff = 0;
        onReroute(user);
      }
    } else {
      consecutiveOff = 0;
    }

    // Arrival: within 15 m of the final coordinate.
    const last = linePoints[linePoints.length - 1] as [number, number];
    const distToEnd = distanceMeters(user, [last[0], last[1]] as LngLat);
    if (distToEnd <= STEP_ADVANCE_M) {
      stopped = true;
      onComplete();
    }
  });

  return () => {
    stopped = true;
    off();
  };
}
