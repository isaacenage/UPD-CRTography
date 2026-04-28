"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
} from "maplibre-gl";
import { mapBus } from "@/lib/mapBus";
import { parseBuildingProps, type BuildingProps } from "@/lib/buildingFormat";
import {
  bboxOfFeature,
  bboxOfFeatures,
  centroidOfFeature,
  type LngLat,
} from "@/lib/geo/geoBounds";
import { toMaplibreFilter, applies, type Filters } from "@/lib/filters";
import type { DirectionsService } from "@/lib/directions";
import { log } from "@/lib/log";
import { COLOR } from "@/lib/theme";
import { useTheme, type Theme } from "@/lib/theme/context";
import type { Contribution } from "@/lib/contributions/types";

const SOURCE_ID = "up-buildings";
const FILL_LAYER = "up-buildings-fill";
const LINE_LAYER = "up-buildings-line";
const LABEL_LAYER = "up-buildings-label";

// Separate source/layer for user-contributed building points so they're
// visually distinct from the canonical polygons and so the dev can tell
// at a glance which markers haven't been folded into the dataset yet.
const CONTRIB_SOURCE_ID = "up-contributions";
const CONTRIB_HALO_LAYER = "up-contributions-halo";
const CONTRIB_POINT_LAYER = "up-contributions-point";
const CONTRIB_LABEL_LAYER = "up-contributions-label";

const COLOR_INK = COLOR.ink;
const COLOR_PAPER = COLOR.paper;
const COLOR_MAROON_500 = COLOR.maroon500;
const COLOR_FOREST_500 = COLOR.forest500;

// OpenFreeMap publishes Positron, Bright, and Liberty — but its dark
// sibling is unreliable (the previously-used /styles/dark either 404s or
// returns an unstyled canvas, which is what was being misread as
// "basemap initialized as dark"). For the dark variant we point at
// CARTO's hosted dark-matter style, which is publicly available and uses
// a compatible vector schema; the overlay layers we re-add post-setStyle
// don't depend on basemap-specific source ids.
const BASEMAP_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const BASEMAP_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function basemapUrlFor(theme: Theme): string {
  return theme === "dark" ? BASEMAP_DARK : BASEMAP_LIGHT;
}

export type Selection = Readonly<{
  building: BuildingProps;
  centroid: LngLat | null;
}>;

type Props = {
  filters: Filters;
  selectedId: number | null;
  onSelect: (selection: Selection | null) => void;
  contributions: readonly Contribution[];
};

function contributionsToFC(
  items: readonly Contribution[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: items.map((c) => ({
      type: "Feature",
      properties: {
        id: c.id,
        name: c.buildingName,
        gender: c.gender,
        access: c.access,
        status: c.status,
      },
      geometry: {
        type: "Point",
        coordinates: [c.longitude, c.latitude],
      },
    })),
  };
}

function escapeHtmlSimple(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Map({ filters, selectedId, onSelect, contributions }: Props) {
  const { theme } = useTheme();
  const themeRef = useRef<Theme>(theme);
  // Capture the boot theme synchronously so the mount effect uses the
  // value at the moment of mount, not a stale closure if React batches
  // the first render with a theme update.
  const bootThemeRef = useRef<Theme>(theme);
  bootThemeRef.current = theme;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayReadyRef = useRef(false);
  const applyFilterRef = useRef<(() => void) | null>(null);
  const reAddOverlaysRef = useRef<(() => void) | null>(null);
  const directionsServiceRef = useRef<DirectionsService | null>(null);
  const directionsLoadingRef = useRef(false);
  const routeAbortRef = useRef<AbortController | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const lastSelectedIdRef = useRef<number | null>(null);
  // Use globalThis.Map explicitly — `Map` in this file is the React
  // component (default export), so unqualified `new Map()` would be a
  // type-error.
  const featuresByIdRef = useRef<globalThis.Map<number, GeoJSON.Feature>>(
    new globalThis.Map(),
  );
  const datasetRef = useRef<GeoJSON.FeatureCollection | null>(null);
  // Seed from the prop so the map's `load` handler — which calls
  // addContributionLayers(contributionsRef.current) at the end of its
  // initial setup — sees the correct data even when the prop arrived
  // before the map finished mounting/loading. Subsequent prop changes
  // are propagated by the useEffect further down.
  const contributionsRef = useRef<GeoJSON.FeatureCollection>(
    contributionsToFC(contributions),
  );
  const buildingsBboxRef = useRef<readonly [readonly [number, number], readonly [number, number]] | null>(null);
  const onSelectRef = useRef(onSelect);

  // Keep the latest onSelect closure available without re-mounting the map.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Boot the basemap with the resolved theme so the initial paint matches
    // the UI (no flash, no swap-on-mount). The theme-change effect below
    // returns early on first run because themeRef and theme already match;
    // it only fires on subsequent toggles.
    const bootTheme = bootThemeRef.current;
    themeRef.current = bootTheme;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapUrlFor(bootTheme),
      center: [121.0685, 14.6537],
      zoom: 15.5,
      minZoom: 14,
      maxZoom: 20,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    // Pinch / scroll handle zoom on touch and desktop respectively — a
    // dedicated +/- control adds chrome the user doesn't need. The Home
    // FAB (mapBus 'fitBuildings') replaces the "reset view" affordance.
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      showUserLocation: true,
      trackUserLocation: false,
    });
    geolocateRef.current = geolocate;
    map.addControl(geolocate, "top-right");
    geolocate.on("geolocate", (position) => {
      const coords = (position as GeolocationPosition).coords;
      mapBus.dispatch("userLocation", {
        lng: coords.longitude,
        lat: coords.latitude,
        accuracy: coords.accuracy,
      });
    });
    geolocate.on("error", () => {
      mapBus.dispatch("userLocation", null);
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://isaacenage.xyz/" target="_blank" rel="noopener">&copy; 2025 Zaxus</a>',
      }),
      "bottom-right",
    );

    const offLocate = mapBus.on("locate", () => {
      geolocateRef.current?.trigger();
    });

    const offFlyTo = mapBus.on("flyTo", ({ featureId }) => {
      flyToFeature(featureId);
    });

    const offFitBuildings = mapBus.on("fitBuildings", () => {
      const bbox = buildingsBboxRef.current;
      if (!bbox) return;
      const reduced = prefersReducedMotion();
      map.fitBounds(
        [
          [bbox[0][0], bbox[0][1]],
          [bbox[1][0], bbox[1][1]],
        ],
        {
          padding: 80,
          maxZoom: 17,
          duration: reduced ? 0 : 700,
          essential: true,
        },
      );
    });

    // Lazy directions service — created on first requestRoute event so
    // the directions plugin (and OSRM-derived parsing code) is excluded
    // from the initial bundle on map load. Lifted to refs so the
    // theme-change effect can tear it down (its plugin layers don't
    // survive a setStyle).
    const offRequestRoute = mapBus.on("requestRoute", async ({ requestId, from, to }) => {
      try {
        if (!directionsServiceRef.current && !directionsLoadingRef.current) {
          directionsLoadingRef.current = true;
          const { createDirections } = await import("@/lib/directions");
          directionsServiceRef.current = await createDirections(map);
          directionsLoadingRef.current = false;
        }
        if (!directionsServiceRef.current) {
          mapBus.dispatch("routeError", { requestId, message: "Directions unavailable" });
          return;
        }
        routeAbortRef.current?.abort();
        routeAbortRef.current = new AbortController();
        const route = await directionsServiceRef.current.requestRoute(
          from,
          to,
          routeAbortRef.current.signal,
        );
        mapBus.dispatch("routeReady", { requestId, route });
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Routing failed";
        mapBus.dispatch("routeError", { requestId, message });
      }
    });

    const offClearRoute = mapBus.on("clearRoute", () => {
      routeAbortRef.current?.abort();
      routeAbortRef.current = null;
      directionsServiceRef.current?.clear();
    });

    // Follow mode: while active, pan camera to each user-location fix.
    let followOff: (() => void) | null = null;
    const offFollowMode = mapBus.on("followMode", ({ active }) => {
      if (active) {
        if (followOff) return;
        followOff = mapBus.on("userLocation", (loc) => {
          if (!loc) return;
          map.easeTo({
            center: [loc.lng, loc.lat],
            zoom: Math.max(map.getZoom(), 17.5),
            duration: 600,
            essential: true,
          });
        });
      } else {
        followOff?.();
        followOff = null;
      }
    });

    map.on("error", (e) => {
      const err = (e as { error?: unknown })?.error;
      const message = err instanceof Error ? err.message : "MapLibre runtime error";
      log.error("map", message, err);
    });

    function flyToFeature(featureId: number) {
      const feature = featuresByIdRef.current.get(featureId);
      if (!feature) return;
      const center = centroidOfFeature(feature);
      if (!center) return;

      // Push the map up so the feature stays visible above the half-snap sheet.
      const reduced = prefersReducedMotion();
      const yOffset = -Math.round(window.innerHeight * 0.18);
      map.flyTo({
        center: [center[0], center[1]],
        zoom: Math.max(map.getZoom(), 17),
        offset: [0, yOffset],
        speed: 1.2,
        curve: 1.4,
        animate: !reduced,
        essential: true,
      });

      const props = parseBuildingProps(feature.properties, featureId);
      onSelectRef.current({ building: props, centroid: center });
    }

    // Adds (or re-adds) our overlay source + layers on top of whatever
    // basemap style is currently loaded. Idempotent; safe to call after a
    // map.setStyle() once `styledata` has fired.
    function addOverlays(data: GeoJSON.FeatureCollection) {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data,
          promoteId: undefined,
        });
      }

      if (!map.getLayer(FILL_LAYER)) {
        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": [
              "match",
              ["get", "Has Bidet?"],
              "Yes",
              COLOR_FOREST_500,
              "None",
              COLOR_MAROON_500,
              COLOR_MAROON_500,
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.95,
              ["boolean", ["feature-state", "hover"], false],
              0.9,
              0.78,
            ],
          },
        });
      }

      if (!map.getLayer(LINE_LAYER)) {
        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            // Outline color flips with the theme so building edges stay
            // legible on the dark basemap.
            "line-color": themeRef.current === "dark" ? COLOR_PAPER : COLOR_INK,
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              2.5,
              0.75,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              1,
              0.55,
            ],
          },
        });
      }

      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            // Phase 6 prepends ✓/✗ glyphs at higher zoom.
            "text-field": [
              "case",
              [">=", ["zoom"], 17],
              [
                "concat",
                ["case", ["==", ["get", "Has Bidet?"], "Yes"], "✓ ", "✗ "],
                ["get", "Acronym"],
              ],
              ["get", "Acronym"],
            ],
            "text-font": ["Noto Sans Bold"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 15, 9, 18, 12],
            "text-letter-spacing": 0.08,
            "text-transform": "uppercase",
            "text-allow-overlap": false,
            "text-padding": 2,
            "symbol-placement": "point",
          },
          paint: {
            "text-color": COLOR_PAPER,
            "text-halo-color": COLOR_INK,
            "text-halo-width": 1.2,
            "text-halo-blur": 0.4,
          },
        });
      }
    }

    function addContributionLayers(data: GeoJSON.FeatureCollection) {
      if (!map.getSource(CONTRIB_SOURCE_ID)) {
        map.addSource(CONTRIB_SOURCE_ID, {
          type: "geojson",
          data,
        });
      } else {
        const src = map.getSource(CONTRIB_SOURCE_ID) as GeoJSONSource;
        src.setData(data);
      }

      // Soft halo first so the inner dot stays legible against the fill.
      if (!map.getLayer(CONTRIB_HALO_LAYER)) {
        map.addLayer({
          id: CONTRIB_HALO_LAYER,
          type: "circle",
          source: CONTRIB_SOURCE_ID,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              10,
              18,
              22,
            ],
            "circle-color": COLOR_FOREST_500,
            "circle-opacity": 0.18,
            "circle-stroke-width": 0,
          },
        });
      }

      if (!map.getLayer(CONTRIB_POINT_LAYER)) {
        map.addLayer({
          id: CONTRIB_POINT_LAYER,
          type: "circle",
          source: CONTRIB_SOURCE_ID,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              5,
              18,
              9,
            ],
            "circle-color": COLOR_FOREST_500,
            "circle-stroke-color": COLOR_PAPER,
            "circle-stroke-width": 2,
          },
        });
      }

      if (!map.getLayer(CONTRIB_LABEL_LAYER)) {
        map.addLayer({
          id: CONTRIB_LABEL_LAYER,
          type: "symbol",
          source: CONTRIB_SOURCE_ID,
          layout: {
            "text-field": [
              "concat",
              "+ ",
              ["coalesce", ["get", "name"], "User contribution"],
            ],
            "text-font": ["Noto Sans Bold"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 18, 12],
            "text-letter-spacing": 0.06,
            "text-transform": "uppercase",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-allow-overlap": false,
            "text-padding": 2,
          },
          paint: {
            "text-color": COLOR_PAPER,
            "text-halo-color": COLOR_FOREST_500,
            "text-halo-width": 1.4,
            "text-halo-blur": 0.4,
          },
        });
      }
    }

    // Stash so the theme-change effect can rehydrate overlays after
    // setStyle without re-fetching the GeoJSON.
    reAddOverlaysRef.current = () => {
      if (datasetRef.current) addOverlays(datasetRef.current);
      addContributionLayers(contributionsRef.current);
    };

    map.on("load", async () => {
      try {
        const res = await fetch("/data/up-buildings.geojson");
        if (!res.ok) throw new Error(`geojson fetch ${res.status}`);
        const data = (await res.json()) as GeoJSON.FeatureCollection;

        if (Array.isArray(data?.features)) {
          for (let i = 0; i < data.features.length; i++) {
            if (data.features[i].id === undefined) {
              data.features[i].id = i;
            }
          }
        }

        // Index for flyToFeature + selection lookup.
        const index = new globalThis.Map<number, GeoJSON.Feature>();
        for (const f of data.features) {
          if (typeof f.id === "number") index.set(f.id, f);
        }
        featuresByIdRef.current = index;
        datasetRef.current = data;

        addOverlays(data);
        // Render any contributions that arrived via mapBus before the
        // basemap finished loading.
        addContributionLayers(contributionsRef.current);

        // Frame the building extent on first load + remember the bbox
        // so the Home FAB can re-fit on demand.
        const bbox = bboxOfFeatures(data.features);
        if (bbox) {
          buildingsBboxRef.current = bbox;
          map.fitBounds(
            [
              [bbox[0][0], bbox[0][1]],
              [bbox[1][0], bbox[1][1]],
            ],
            { padding: 80, duration: 0, maxZoom: 17 },
          );
        }

        overlayReadyRef.current = true;
        applyFilterRef.current?.();
      } catch (err) {
        log.error("map", "Failed to load buildings GeoJSON", err);
      }
    });

    return () => {
      offLocate();
      offFlyTo();
      offFitBuildings();
      offRequestRoute();
      offClearRoute();
      offFollowMode();
      followOff?.();
      followOff = null;
      routeAbortRef.current?.abort();
      routeAbortRef.current = null;
      directionsServiceRef.current?.destroy();
      directionsServiceRef.current = null;
      overlayReadyRef.current = false;
      geolocateRef.current = null;
      featuresByIdRef.current.clear();
      datasetRef.current = null;
      reAddOverlaysRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the contributions prop to the live source. The mount-time seed of
  // contributionsRef handles the first paint; this effect handles every
  // subsequent change (and is the only path that runs after submit). If the
  // map's `load` handler hasn't installed the source yet, updating the ref
  // is enough — the load handler reads it on its way out.
  useEffect(() => {
    const fc = contributionsToFC(contributions);
    contributionsRef.current = fc;
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(CONTRIB_SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(fc);
  }, [contributions]);

  // Swap the basemap when the theme changes. setStyle wipes everything we
  // added (buildings + directions plugin layers), so we tear down the
  // directions service (next route request rebuilds it) and re-add the
  // building overlay layers once the new style finishes parsing.
  useEffect(() => {
    if (themeRef.current === theme) return;
    const map = mapRef.current;
    if (!map) {
      themeRef.current = theme;
      return;
    }
    themeRef.current = theme;

    routeAbortRef.current?.abort();
    routeAbortRef.current = null;
    try {
      directionsServiceRef.current?.destroy();
    } catch {
      // noop
    }
    directionsServiceRef.current = null;
    mapBus.dispatch("clearRoute", undefined);

    overlayReadyRef.current = false;

    // setStyle with diff:false is a full style replacement — every source
    // and layer (including ours) is wiped. We poll 'styledata' instead of
    // listening once: 'styledata' can fire mid-transition (e.g., from old
    // style teardown) before the new Style is ready, and isStyleLoaded()
    // is the only reliable signal that addSource/addLayer will stick.
    // Layer-keyed click delegations live on the Map (not the Style) and
    // check getLayer(id) at click time, so they re-bind automatically once
    // the new FILL_LAYER is added.
    const tryReAdd = () => {
      if (!map.isStyleLoaded()) return;
      map.off("styledata", tryReAdd);
      map.off("idle", tryReAdd);
      reAddOverlaysRef.current?.();
      applyFilterRef.current?.();
      const sel = lastSelectedIdRef.current;
      if (sel !== null && map.getSource(SOURCE_ID)) {
        map.setFeatureState({ source: SOURCE_ID, id: sel }, { selected: true });
      }
      overlayReadyRef.current = true;
    };
    map.on("styledata", tryReAdd);
    // Belt-and-braces: idle is guaranteed to fire once the new style is
    // settled, even if no styledata event surfaces an isStyleLoaded()=true.
    map.on("idle", tryReAdd);
    map.setStyle(basemapUrlFor(theme), { diff: false });
  }, [theme]);

  // Contribution-point click → ephemeral popup. Doesn't drive the bottom
  // sheet (those rows aren't part of the canonical dataset yet) but lets
  // the user verify what they submitted and lets a dev cross-check pins
  // before approving them.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let activePopup: maplibregl.Popup | null = null;

    const onContribClick = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
    ) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = (f.properties ?? {}) as Record<string, string>;
      const name = escapeHtmlSimple(props.name ?? "User contribution");
      const gender = escapeHtmlSimple(props.gender ?? "");
      const access = escapeHtmlSimple(props.access ?? "");
      const status = escapeHtmlSimple(props.status ?? "pending");
      const html = `
        <div style="padding:10px 12px;font-family:var(--font-sans);min-width:180px">
          <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--color-forest-500)">User contribution · ${status}</div>
          <div style="font-weight:700;margin-top:4px;color:var(--color-ink)">${name}</div>
          <div style="font-size:11px;color:var(--color-gray-600);margin-top:4px">${gender}${gender && access ? " · " : ""}${access}</div>
        </div>`;
      activePopup?.remove();
      activePopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    };

    let registered = false;
    const tryRegister = () => {
      if (registered || !map.getLayer(CONTRIB_POINT_LAYER)) return;
      map.on("click", CONTRIB_POINT_LAYER, onContribClick);
      registered = true;
    };
    tryRegister();
    if (!registered) map.on("idle", tryRegister);

    return () => {
      map.off("idle", tryRegister);
      if (registered) map.off("click", CONTRIB_POINT_LAYER, onContribClick);
      activePopup?.remove();
      activePopup = null;
    };
  }, []);

  // Click → set selection (sheet renders detail; Map flies to feature).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
    ) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = typeof f.id === "number" ? f.id : null;
      if (id === null) return;
      const props = parseBuildingProps(f.properties, id);
      const feature = featuresByIdRef.current.get(id) ?? f;
      const centroid = centroidOfFeature(feature as GeoJSON.Feature);

      onSelectRef.current({ building: props, centroid });

      const reduced = prefersReducedMotion();
      const yOffset = -Math.round(window.innerHeight * 0.18);
      const target = centroid ?? [e.lngLat.lng, e.lngLat.lat];
      map.flyTo({
        center: [target[0], target[1]],
        zoom: Math.max(map.getZoom(), 17),
        offset: [0, yOffset],
        speed: 1.2,
        curve: 1.4,
        animate: !reduced,
        essential: true,
      });
    };

    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    let registered = false;
    const tryRegister = () => {
      if (registered || !map.getLayer(FILL_LAYER)) return;
      map.on("click", FILL_LAYER, onClick);
      map.on("mouseenter", FILL_LAYER, onEnter);
      map.on("mouseleave", FILL_LAYER, onLeave);
      registered = true;
    };

    tryRegister();
    if (!registered) map.on("idle", tryRegister);

    return () => {
      map.off("idle", tryRegister);
      if (registered) {
        map.off("click", FILL_LAYER, onClick);
        map.off("mouseenter", FILL_LAYER, onEnter);
        map.off("mouseleave", FILL_LAYER, onLeave);
      }
    };
  }, []);

  // Reflect the controlled selection as a feature-state outline.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (!map.getSource(SOURCE_ID)) return;
      const prev = lastSelectedIdRef.current;
      if (prev !== null && prev !== selectedId) {
        map.setFeatureState({ source: SOURCE_ID, id: prev }, { selected: false });
      }
      if (selectedId !== null) {
        map.setFeatureState({ source: SOURCE_ID, id: selectedId }, { selected: true });
      }
      lastSelectedIdRef.current = selectedId;
    };

    if (overlayReadyRef.current) {
      apply();
    } else {
      map.once("idle", apply);
    }
  }, [selectedId]);

  // Filter expression — apply when ready, otherwise stash for the load handler.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (!map.getLayer(FILL_LAYER)) return;
      const filter = toMaplibreFilter(filters);
      map.setFilter(FILL_LAYER, filter);
      map.setFilter(LINE_LAYER, filter);
      map.setFilter(LABEL_LAYER, filter);
    };

    applyFilterRef.current = apply;
    if (overlayReadyRef.current) apply();
  }, [filters]);

  // Live count of features matching the current filter, for screen readers.
  const visibleCount = useVisibleCount(filters);

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 touch-pan-x touch-pan-y"
        role="application"
        aria-label="Interactive map of UP Diliman comfort rooms"
        style={{ width: "100%", height: "100%" }}
      />
      <span className="sr-only" aria-live="polite">
        {visibleCount === null
          ? "Loading buildings"
          : `${visibleCount} building${visibleCount === 1 ? "" : "s"} shown`}
      </span>
    </>
  );
}

function useVisibleCount(filters: Filters): number | null {
  const cacheRef = useRef<readonly GeoJSON.Feature[] | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const compute = (features: readonly GeoJSON.Feature[]) => {
      let n = 0;
      for (const f of features) {
        const props = parseBuildingProps(
          f.properties,
          typeof f.id === "number" ? f.id : 0,
        );
        if (applies(props, filters)) n += 1;
      }
      if (!cancelled) setCount(n);
    };

    if (cacheRef.current) {
      compute(cacheRef.current);
      return;
    }

    fetch("/data/up-buildings.geojson")
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        if (cancelled || !Array.isArray(data?.features)) return;
        cacheRef.current = data.features;
        compute(data.features);
      })
      .catch(() => {
        // Keeping count null is acceptable if the fetch fails — the rest
        // of the app uses the same endpoint and surfaces its own errors.
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return count;
}

// Re-set source data (kept for future use)
export function _refreshSource(map: MapLibreMap, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
  src?.setData(data);
}

// Re-export so consumers (search) can hint flyTo without importing geo libs.
export { bboxOfFeature };
