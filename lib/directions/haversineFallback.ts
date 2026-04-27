// Pure haversine fallback used when the OSRM endpoint is unreachable
// (rate-limited public demo, offline, blocked by the user's network).
// Returns a 1-step "Head <compass> for <distance>" instruction so the
// directions sheet always has something to show, even if it's an estimate.

import {
  bearingDegrees,
  compassFromBearing,
  distanceMeters,
  formatDistance,
  formatDuration,
  walkingSeconds,
} from "@/lib/geo/distance";
import type { LngLat } from "@/lib/geo/geoBounds";
import type { RouteResult, RouteStep } from "@/lib/directions";

const COMPASS_LABEL: Record<string, string> = {
  N: "north",
  NE: "northeast",
  E: "east",
  SE: "southeast",
  S: "south",
  SW: "southwest",
  W: "west",
  NW: "northwest",
};

export function haversineRoute(from: LngLat, to: LngLat): RouteResult {
  const distance = distanceMeters(from, to);
  const bearing = bearingDegrees(from, to);
  const compass = compassFromBearing(bearing);
  const direction = COMPASS_LABEL[compass] ?? "ahead";
  const duration = walkingSeconds(distance);

  const step: RouteStep = {
    instruction: `Head ${direction} for ${formatDistance(distance)}`,
    distanceMeters: distance,
    durationSeconds: duration,
  };

  return {
    geometry: {
      type: "LineString",
      coordinates: [
        [from[0], from[1]],
        [to[0], to[1]],
      ],
    },
    distanceMeters: distance,
    durationSeconds: duration,
    distanceLabel: formatDistance(distance),
    durationLabel: formatDuration(duration),
    steps: [step],
    profile: "walking",
    fallback: true,
  };
}
