// Sole import site of @maplibre/maplibre-gl-directions. Swapping the
// plugin (or the OSRM provider) is a single-file change.
//
// The plugin draws and manages its own MapLibre layers; this wrapper
// exposes a small async surface (init / requestRoute / clear / destroy)
// and falls back to a pure-JS haversine line if OSRM is unreachable.
//
// Endpoint policy: defaults to https://router.project-osrm.org for dev.
// For production swap NEXT_PUBLIC_OSRM_URL to a self-hosted instance
// (Docker + osrm-backend) or a hosted tier (Stadia, MapTiler).

import type { Map as MapLibreMap } from "maplibre-gl";
import {
  formatDistance,
  formatDuration,
} from "@/lib/geo/distance";
import type { LngLat } from "@/lib/geo/geoBounds";
import { haversineRoute } from "@/lib/directions/haversineFallback";

export type RouteStep = Readonly<{
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}>;

export type ShortestVariant = Readonly<{
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
  distanceLabel: string;
  durationLabel: string;
}>;

export type RouteResult = Readonly<{
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
  distanceLabel: string;
  durationLabel: string;
  steps: readonly RouteStep[];
  profile: "driving" | "walking";
  fallback: boolean;
  // Optional second route — restriction-free shortest road-following path
  // (continue_straight=false, alternatives=true). Omitted when the second
  // OSRM call fails or when its distance is within 1% of the legal route.
  shortest?: ShortestVariant;
}>;

export type DirectionsService = {
  requestRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<RouteResult>;
  clear(): void;
  destroy(): void;
};

const DEFAULT_OSRM = "https://router.project-osrm.org/route/v1";
// Brand red used by the generated line and the waypoint outlines.
const ROUTE_RED = "#DC2626";
const ROUTE_WHITE = "#FFFFFF";

function isRouteCasingLayer(id: string): boolean {
  return id.includes("routeline-casing");
}

function isRouteLineLayer(id: string): boolean {
  // Match any routeline layer (primary or alt), but exclude casing — that's
  // handled separately so it can sit underneath as the white halo.
  return id.includes("routeline") && !id.includes("casing");
}

function isWaypointCasingLayer(id: string): boolean {
  // Outer ring of each waypoint marker (start + end pin).
  return id.includes("waypoint") && id.includes("casing");
}

function isWaypointFillLayer(id: string): boolean {
  // Inner solid circle of each waypoint marker.
  return id.includes("waypoint") && !id.includes("casing");
}

// Loose duck-typed shape: the plugin's real type has protected fields the
// public API exposes via methods, but for our (write-once + 4 calls)
// integration this minimal interface is enough. The cast through unknown
// in createDirections keeps the type-checker honest.
type PluginInstance = {
  setWaypoints(points: ReadonlyArray<LngLat>): void;
  clear(): void;
  destroy(): void;
  on(event: string, handler: (e: unknown) => void): void;
  off(event: string, handler: (e: unknown) => void): void;
  configuration?: { layers?: ReadonlyArray<{ id: string }> };
};

type LegRaw = {
  duration?: number;
  distance?: number;
  steps?: ReadonlyArray<StepRaw>;
};

type StepRaw = {
  maneuver?: { type?: string; modifier?: string };
  name?: string;
  distance?: number;
  duration?: number;
};

type RouteRaw = {
  geometry?: GeoJSON.LineString;
  distance?: number;
  duration?: number;
  legs?: ReadonlyArray<LegRaw>;
};

function describeStep(step: StepRaw): string {
  const m = step.maneuver?.type ?? "";
  const mod = step.maneuver?.modifier ?? "";
  const name = step.name ? ` onto ${step.name}` : "";
  switch (m) {
    case "depart":
      return `Head ${mod || "out"}${name}`;
    case "arrive":
      return "Arrive at destination";
    case "turn":
      return `Turn ${mod || "ahead"}${name}`;
    case "continue":
      return `Continue${mod ? ` ${mod}` : ""}${name}`;
    case "roundabout":
      return `Take the roundabout${name}`;
    case "fork":
      return `Keep ${mod || "ahead"} at the fork${name}`;
    default:
      if (mod) return `${capitalize(mod)}${name}`;
      return `Continue${name}`;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function rawToResult(raw: RouteRaw): RouteResult | null {
  if (!raw?.geometry || raw.geometry.type !== "LineString") return null;
  const distance = Number.isFinite(raw.distance) ? Number(raw.distance) : 0;
  const duration = Number.isFinite(raw.duration) ? Number(raw.duration) : 0;
  const steps: RouteStep[] = [];
  for (const leg of raw.legs ?? []) {
    for (const step of leg.steps ?? []) {
      steps.push({
        instruction: describeStep(step),
        distanceMeters: Number(step.distance ?? 0),
        durationSeconds: Number(step.duration ?? 0),
      });
    }
  }
  return {
    geometry: raw.geometry,
    distanceMeters: distance,
    durationSeconds: duration,
    distanceLabel: formatDistance(distance),
    durationLabel: formatDuration(duration),
    steps,
    profile: "walking",
    fallback: false,
  };
}

// Direct OSRM HTTP call bypassing the plugin so we can pass relaxed
// params the plugin's configuration doesn't expose. Used to compute the
// second "true shortest road-following" variant the user can compare
// against the legal walking route.
async function fetchShortestVariant(
  apiBase: string,
  from: LngLat,
  to: LngLat,
  signal?: AbortSignal,
): Promise<ShortestVariant | null> {
  const path = `walking/${from[0]},${from[1]};${to[0]},${to[1]}`;
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
    alternatives: "true",
    continue_straight: "false",
  });
  const url = `${apiBase}/${path}?${params.toString()}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { routes?: RouteRaw[] };
    const shortest = pickShortestRoute(json.routes ?? []);
    if (!shortest?.geometry || shortest.geometry.type !== "LineString") return null;
    const distance = Number.isFinite(shortest.distance) ? Number(shortest.distance) : 0;
    const duration = Number.isFinite(shortest.duration) ? Number(shortest.duration) : 0;
    return {
      geometry: shortest.geometry,
      distanceMeters: distance,
      durationSeconds: duration,
      distanceLabel: formatDistance(distance),
      durationLabel: formatDuration(duration),
    };
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") throw err;
    return null;
  }
}

// True if the two routes are close enough that drawing both would be
// visual noise — within 1 % distance and same coordinate count. The
// shortest variant is dropped when this returns true.
function shortestMatchesLegal(legal: RouteResult, shortest: ShortestVariant): boolean {
  const sameCount =
    legal.geometry.coordinates.length === shortest.geometry.coordinates.length;
  if (!sameCount) return false;
  const denom = Math.max(1, legal.distanceMeters);
  const ratio = Math.abs(legal.distanceMeters - shortest.distanceMeters) / denom;
  return ratio < 0.01;
}

// OSRM may return alternatives — pick the one with the smallest distance
// so the user gets the literal shortest legal path, not the fastest.
function pickShortestRoute(routes: ReadonlyArray<RouteRaw>): RouteRaw | null {
  if (!routes || routes.length === 0) return null;
  let best = routes[0];
  let bestDist = Number.isFinite(best?.distance) ? Number(best!.distance) : Infinity;
  for (let i = 1; i < routes.length; i++) {
    const r = routes[i];
    const d = Number.isFinite(r?.distance) ? Number(r!.distance) : Infinity;
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  return best ?? null;
}

export async function createDirections(map: MapLibreMap): Promise<DirectionsService> {
  let plugin: PluginInstance | null = null;
  let pluginErrored = false;
  let lastFetchedRoutes: RouteRaw[] | null = null;
  const apiBase = process.env.NEXT_PUBLIC_OSRM_URL || DEFAULT_OSRM;

  // Lazy-load the plugin — keeps it out of the initial bundle so users
  // who never tap "Directions" don't pay for it.
  try {
    const mod = await import("@maplibre/maplibre-gl-directions");
    const Ctor = mod.default;
    plugin = new Ctor(map, {
      api: apiBase,
      // Walking profile so the route follows pedestrian-accessible paths.
      // On UP Diliman the Academic Oval (Roxas Ave) is one-way for vehicles
      // but freely walkable; the driving profile forced detours around it,
      // which is wrong for a foot-traffic app.
      profile: "walking",
      requestOptions: {
        overview: "full",
        steps: "true",
        geometries: "geojson",
        // Ask for alternatives so we can post-pick the shortest by distance.
        // OSRM's walking profile minimizes time, which usually matches
        // shortest, but alternatives + post-sort is a free safety net.
        alternatives: "true",
      },
    } as unknown as ConstructorParameters<typeof Ctor>[1]) as unknown as PluginInstance;

    const onRoutes = (e: unknown) => {
      const payload = e as { data?: { routes?: RouteRaw[] } } | undefined;
      lastFetchedRoutes = payload?.data?.routes ?? null;
    };
    plugin?.on("fetchroutesend", onRoutes);

    // Brand the route line + waypoint markers once layers exist. Called on
    // next animation frame because the plugin adds layers in its constructor
    // tail, after we get the instance back.
    requestAnimationFrame(() => {
      const layers = plugin?.configuration?.layers ?? [];
      for (const layer of layers) {
        if (!map.getLayer(layer.id)) continue;
        const type = (map.getLayer(layer.id) as unknown as { type?: string })?.type;
        if (type === "line") {
          if (isRouteCasingLayer(layer.id)) {
            // White casing sits under the red line so the route reads
            // clearly on both light and dark basemaps.
            map.setPaintProperty(layer.id, "line-color", ROUTE_WHITE);
            map.setPaintProperty(layer.id, "line-width", 9);
            map.setPaintProperty(layer.id, "line-opacity", 1);
          } else if (isRouteLineLayer(layer.id)) {
            map.setPaintProperty(layer.id, "line-color", ROUTE_RED);
            map.setPaintProperty(layer.id, "line-width", 5);
            map.setPaintProperty(layer.id, "line-opacity", 1);
          }
        } else if (type === "circle") {
          if (isWaypointCasingLayer(layer.id)) {
            // Outer ring → red. The visible "thick outline" of the marker.
            map.setPaintProperty(layer.id, "circle-color", ROUTE_RED);
            map.setPaintProperty(layer.id, "circle-radius", 11);
            map.setPaintProperty(layer.id, "circle-opacity", 1);
          } else if (isWaypointFillLayer(layer.id)) {
            // Inner fill → white. The visible "white circle" of the marker.
            map.setPaintProperty(layer.id, "circle-color", ROUTE_WHITE);
            map.setPaintProperty(layer.id, "circle-radius", 7);
            map.setPaintProperty(layer.id, "circle-opacity", 1);
          }
        }
      }
    });
  } catch {
    pluginErrored = true;
  }

  function drawFallback(result: RouteResult): void {
    const sourceId = "fallback-route";
    const lineId = "fallback-route-line";
    const casingId = "fallback-route-casing";
    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: result.geometry,
    };
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as unknown as { setData(d: unknown): void }).setData(data);
    } else {
      map.addSource(sourceId, { type: "geojson", data });
      map.addLayer({
        id: casingId,
        type: "line",
        source: sourceId,
        paint: { "line-color": ROUTE_WHITE, "line-width": 9, "line-opacity": 1 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": ROUTE_RED,
          "line-width": 5,
          "line-opacity": 1,
          "line-dasharray": [1.5, 1.5],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
    }
  }

  function clearFallback(): void {
    for (const id of ["fallback-route-line", "fallback-route-casing"]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource("fallback-route")) map.removeSource("fallback-route");
  }

  // Second polyline for the restriction-free shortest variant. Drawn
  // beneath the legal route (the user's primary read) using a dashed
  // brand maroon so it's visually distinct without inventing a new color.
  function drawShortest(geometry: GeoJSON.LineString): void {
    const sourceId = "shortest-route";
    const lineId = "shortest-route-line";
    const casingId = "shortest-route-casing";
    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry,
    };
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as unknown as { setData(d: unknown): void }).setData(data);
      return;
    }
    map.addSource(sourceId, { type: "geojson", data });
    map.addLayer({
      id: casingId,
      type: "line",
      source: sourceId,
      paint: { "line-color": ROUTE_WHITE, "line-width": 7, "line-opacity": 0.9 },
      layout: { "line-cap": "round", "line-join": "round" },
    });
    map.addLayer({
      id: lineId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#7B1113",
        "line-width": 4,
        "line-opacity": 0.95,
        "line-dasharray": [2, 1.5],
      },
      layout: { "line-cap": "round", "line-join": "round" },
    });
  }

  function clearShortest(): void {
    for (const id of ["shortest-route-line", "shortest-route-casing"]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource("shortest-route")) map.removeSource("shortest-route");
  }

  return {
    async requestRoute(from, to, signal) {
      // Always wipe any previous overlays first.
      clearFallback();
      clearShortest();

      if (plugin && !pluginErrored) {
        try {
          lastFetchedRoutes = null;
          plugin.setWaypoints([from, to]);

          // Wait for fetchroutesend or 4s timeout (whichever first), and
          // honor the AbortSignal.
          const result = await new Promise<RouteResult | null>((resolve, reject) => {
            const timeout = setTimeout(() => resolve(null), 4500);
            const onAbort = () => {
              clearTimeout(timeout);
              reject(new DOMException("Aborted", "AbortError"));
            };
            signal?.addEventListener("abort", onAbort, { once: true });
            const tick = () => {
              if (lastFetchedRoutes && lastFetchedRoutes.length > 0) {
                clearTimeout(timeout);
                signal?.removeEventListener("abort", onAbort);
                const shortest = pickShortestRoute(lastFetchedRoutes);
                resolve(shortest ? rawToResult(shortest) : null);
                return;
              }
              if (signal?.aborted) return;
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });

          if (result) {
            // Fire the restriction-free shortest call after the legal route
            // resolves. Sequential (not parallel with the plugin) because
            // the plugin owns its own fetch and we don't want to compete
            // for the public OSRM demo's rate limit. Failures are swallowed
            // — legal route still ships.
            const shortest = await fetchShortestVariant(apiBase, from, to, signal);
            if (shortest && !shortestMatchesLegal(result, shortest)) {
              drawShortest(shortest.geometry);
              return { ...result, shortest };
            }
            return result;
          }
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") {
            throw err;
          }
          // Drop to fallback below.
        }
      }

      const fallback = haversineRoute(from, to);
      drawFallback(fallback);
      return fallback;
    },

    clear() {
      try {
        plugin?.clear();
      } catch {
        // noop
      }
      clearFallback();
      clearShortest();
    },

    destroy() {
      try {
        plugin?.destroy();
      } catch {
        // noop
      }
      clearFallback();
      clearShortest();
      plugin = null;
    },
  };
}
