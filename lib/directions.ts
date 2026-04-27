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

export type RouteResult = Readonly<{
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
  distanceLabel: string;
  durationLabel: string;
  steps: readonly RouteStep[];
  profile: "walking";
  fallback: boolean;
}>;

export type DirectionsService = {
  requestRoute(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<RouteResult>;
  clear(): void;
  destroy(): void;
};

const DEFAULT_OSRM = "https://router.project-osrm.org/route/v1";
const FOREST = "#014421";
const PAPER = "#F7F4EE";

const ROUTE_LINE_LAYER_PATTERNS = [
  "maplibre-gl-directions-routeline",
  "routeline",
];

function isRouteLineLayer(id: string): boolean {
  return ROUTE_LINE_LAYER_PATTERNS.some((p) => id.includes(p));
}

function isRouteCasingLayer(id: string): boolean {
  return id.includes("routeline-casing");
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

export async function createDirections(map: MapLibreMap): Promise<DirectionsService> {
  let plugin: PluginInstance | null = null;
  let pluginErrored = false;
  let lastFetchedRoutes: RouteRaw[] | null = null;

  // Lazy-load the plugin — keeps it out of the initial bundle so users
  // who never tap "Directions" don't pay for it.
  try {
    const mod = await import("@maplibre/maplibre-gl-directions");
    const Ctor = mod.default;
    const apiBase = process.env.NEXT_PUBLIC_OSRM_URL || DEFAULT_OSRM;
    plugin = new Ctor(map, {
      api: apiBase,
      profile: "walking",
      requestOptions: { overview: "full", steps: "true", geometries: "geojson" },
    } as unknown as ConstructorParameters<typeof Ctor>[1]) as unknown as PluginInstance;

    const onRoutes = (e: unknown) => {
      const payload = e as { data?: { routes?: RouteRaw[] } } | undefined;
      lastFetchedRoutes = payload?.data?.routes ?? null;
    };
    plugin?.on("fetchroutesend", onRoutes);

    // Brand the route line/casing layers after the plugin instantiates them.
    // Done on the next animation frame so the layers exist.
    requestAnimationFrame(() => {
      const layers = plugin?.configuration?.layers ?? [];
      for (const layer of layers) {
        if (!map.getLayer(layer.id)) continue;
        const type = (map.getLayer(layer.id) as unknown as { type?: string })?.type;
        if (type !== "line") continue;
        if (isRouteCasingLayer(layer.id)) {
          map.setPaintProperty(layer.id, "line-color", PAPER);
          map.setPaintProperty(layer.id, "line-width", 9);
          map.setPaintProperty(layer.id, "line-opacity", 0.95);
        } else if (isRouteLineLayer(layer.id)) {
          map.setPaintProperty(layer.id, "line-color", FOREST);
          map.setPaintProperty(layer.id, "line-width", 5);
          map.setPaintProperty(layer.id, "line-opacity", 0.9);
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
        paint: { "line-color": PAPER, "line-width": 9, "line-opacity": 0.95 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": FOREST,
          "line-width": 5,
          "line-opacity": 0.9,
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

  return {
    async requestRoute(from, to, signal) {
      // Always wipe any previous fallback overlay first.
      clearFallback();

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
                const parsed = rawToResult(lastFetchedRoutes[0]);
                resolve(parsed);
                return;
              }
              if (signal?.aborted) return;
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });

          if (result) return result;
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
    },

    destroy() {
      try {
        plugin?.destroy();
      } catch {
        // noop
      }
      clearFallback();
      plugin = null;
    },
  };
}
