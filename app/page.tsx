"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import AppShell from "@/components/shell/AppShell";
import BottomSheet, { type SheetSnap } from "@/components/sheet/BottomSheet";
import EmptyState from "@/components/sheet/EmptyState";
import BuildingDetail from "@/components/sheet/BuildingDetail";
import DirectionsSheet from "@/components/directions/DirectionsSheet";
import FollowModeOverlay from "@/components/directions/FollowModeOverlay";
import PermissionExplainer, {
  hasShownLocationExplainer,
} from "@/components/geo/PermissionExplainer";
import SearchBar from "@/components/search/SearchBar";
import FilterChips from "@/components/search/FilterChips";
import TitleCard from "@/components/legacy-overlay/TitleCard";
import Legend from "@/components/legacy-overlay/Legend";
import InfoPanel from "@/components/legacy-overlay/InfoPanel";
import type { Selection } from "@/components/Map";
import { centroidOfFeature, type LngLat } from "@/lib/geo/geoBounds";
import { DEFAULT_FILTERS, type Filters } from "@/lib/filters";
import type { RouteResult } from "@/lib/directions";
import { mapBus } from "@/lib/mapBus";
import MapErrorBoundary from "@/components/MapErrorBoundary";
import MapSkeleton from "@/components/MapSkeleton";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

type DatasetState = Readonly<{
  features: readonly GeoJSON.Feature[];
  total: number;
  bidet: number;
  public: number;
}>;

const EMPTY_DATASET: DatasetState = { features: [], total: 0, bidet: 0, public: 0 };

function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>(EMPTY_DATASET);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/up-buildings.geojson")
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        if (cancelled || !Array.isArray(data?.features)) return;
        let bidet = 0;
        let pub = 0;
        for (let i = 0; i < data.features.length; i++) {
          const f = data.features[i];
          if (f.id === undefined) f.id = i;
          const p = (f.properties ?? {}) as Record<string, unknown>;
          if (String(p["Has Bidet?"] ?? "").toLowerCase() === "yes") bidet += 1;
          if (String(p.Access ?? "").toLowerCase() === "public") pub += 1;
        }
        setState({
          features: data.features,
          total: data.features.length,
          bidet,
          public: pub,
        });
      })
      .catch(() => {
        // Empty dataset is a safe default — UI shows zero stats.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

type UserLocation = { lng: number; lat: number; accuracy: number } | null;

export default function Page() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [aboutOpen, setAboutOpen] = useState(false);
  const dataset = useDataset();

  // Routing state
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [followMode, setFollowMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  // Pending = user pressed "Directions" but we're still resolving location.
  const [pendingDestination, setPendingDestination] = useState<LngLat | null>(null);
  const requestIdRef = useRef<string | null>(null);

  // mapBus subscriptions
  useEffect(() => {
    const offLoc = mapBus.on("userLocation", setUserLocation);
    const offReady = mapBus.on("routeReady", ({ requestId, route: r }) => {
      if (requestIdRef.current !== requestId) return;
      setRoute(r);
      setSnap("half");
      setCurrentStepIndex(0);
    });
    const offErr = mapBus.on("routeError", ({ requestId }) => {
      if (requestIdRef.current !== requestId) return;
      // Service guarantees a haversine fallback at this point — only true
      // failures hit here. Drop pending state quietly.
      setPendingDestination(null);
    });
    return () => {
      offLoc();
      offReady();
      offErr();
    };
  }, []);

  // Once geolocation resolves while a directions request is pending, fire.
  useEffect(() => {
    if (!pendingDestination || !userLocation) return;
    const requestId = `r-${Date.now()}`;
    requestIdRef.current = requestId;
    mapBus.dispatch("requestRoute", {
      requestId,
      from: [userLocation.lng, userLocation.lat],
      to: pendingDestination,
    });
    setPendingDestination(null);
  }, [pendingDestination, userLocation]);

  // Follow mode controller — wired only while followMode is on.
  useEffect(() => {
    if (!followMode || !route) return;
    // The map is mounted by then (route exists); subscribe through mapBus.
    // startFollow needs a map ref — but we only need it for easeTo, which
    // we re-implement here directly via mapBus.userLocation since the page
    // can't reach the map ref. Trade-off: follow camera moves come from
    // userLocation events. Reroute is also dispatched through mapBus.
    let cancelled = false;
    const off = mapBus.on("userLocation", (loc) => {
      if (cancelled || !loc || !selected?.centroid) return;
      // Step progression — proportion of route line user has traversed.
      const points = route.geometry.coordinates;
      if (points.length === 0) return;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const [lng, lat] = points[i] as [number, number];
        const dx = lng - loc.lng;
        const dy = lat - loc.lat;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          bestIdx = i;
        }
      }
      const proportion = bestIdx / Math.max(1, points.length - 1);
      const expectedStep = Math.min(
        route.steps.length - 1,
        Math.floor(proportion * route.steps.length),
      );
      setCurrentStepIndex(expectedStep);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [followMode, route, selected]);

  const handleSelect = useCallback(
    (next: Selection | null) => {
      // Switching buildings while a route is up: tear down the route too.
      if (route) {
        setRoute(null);
        setFollowMode(false);
        mapBus.dispatch("clearRoute", undefined);
      }
      setSelected(next);
      setSnap(next ? "half" : "peek");
    },
    [route],
  );

  const handleDismiss = useCallback(() => {
    if (route) {
      setRoute(null);
      setFollowMode(false);
      mapBus.dispatch("clearRoute", undefined);
    }
    setSelected(null);
  }, [route]);

  const handleSearchPick = useCallback(
    (hit: { feature: GeoJSON.Feature; building: Selection["building"] }) => {
      if (route) {
        setRoute(null);
        setFollowMode(false);
        mapBus.dispatch("clearRoute", undefined);
      }
      const centroid = centroidOfFeature(hit.feature);
      setSelected({ building: hit.building, centroid });
      setSnap("half");
    },
    [route],
  );

  const handleRequestDirections = useCallback(() => {
    if (!selected?.centroid) return;
    const dest = selected.centroid;

    // 1. Soft prompt the first time (per browser, via localStorage).
    if (!hasShownLocationExplainer()) {
      setPendingDestination(dest);
      setExplainerOpen(true);
      return;
    }

    // 2. Need a fresh location? trigger geolocation; the pending effect fires.
    if (!userLocation) {
      setPendingDestination(dest);
      mapBus.dispatch("locate", undefined);
      return;
    }

    // 3. We have everything — request the route now.
    const requestId = `r-${Date.now()}`;
    requestIdRef.current = requestId;
    mapBus.dispatch("requestRoute", {
      requestId,
      from: [userLocation.lng, userLocation.lat],
      to: dest,
    });
  }, [selected, userLocation]);

  const handleStartFollow = useCallback(() => {
    setFollowMode(true);
    setSnap("peek");
    mapBus.dispatch("followMode", { active: true });
    // Continuous tracking while following — flip on then off when ending.
    mapBus.dispatch("locate", undefined);
  }, []);

  const handleEndRoute = useCallback(() => {
    setRoute(null);
    setFollowMode(false);
    mapBus.dispatch("followMode", { active: false });
    mapBus.dispatch("clearRoute", undefined);
    setSnap("half");
  }, []);

  const sheetContent = useMemo(() => {
    if (route && selected) {
      return (
        <DirectionsSheet
          destination={selected.building}
          route={route}
          followMode={followMode}
          currentStepIndex={currentStepIndex}
          onStart={handleStartFollow}
          onEnd={handleEndRoute}
        />
      );
    }
    if (selected) {
      return (
        <BuildingDetail
          building={selected.building}
          centroid={selected.centroid}
          onRequestDirections={handleRequestDirections}
          directionsReady
        />
      );
    }
    return (
      <EmptyState
        totalCount={dataset.total}
        bidetCount={dataset.bidet}
        publicCount={dataset.public}
        onOpenAbout={() => setAboutOpen(true)}
      />
    );
  }, [
    route,
    selected,
    followMode,
    currentStepIndex,
    dataset,
    handleRequestDirections,
    handleStartFollow,
    handleEndRoute,
  ]);

  return (
    <>
      {followMode && route ? (
        <FollowModeOverlay
          route={route}
          currentStepIndex={currentStepIndex}
          onStop={handleEndRoute}
        />
      ) : null}

      <AppShell
        map={
          <MapErrorBoundary>
            <Map
              filters={filters}
              selectedId={selected?.building.id ?? null}
              onSelect={handleSelect}
            />
          </MapErrorBoundary>
        }
        searchSlot={
          <SearchBar features={dataset.features} onPick={handleSearchPick} />
        }
        chipSlot={<FilterChips filters={filters} onChange={setFilters} />}
        bottomSheet={
          <BottomSheet
            snap={snap}
            onSnapChange={setSnap}
            onDismiss={handleDismiss}
          >
            {sheetContent}
          </BottomSheet>
        }
        infoPanel={
          <InfoPanel open={aboutOpen} onOpenChange={setAboutOpen} />
        }
        desktopSidebar={
          <div className="flex flex-col gap-3 pointer-events-auto">
            <TitleCard />
            <div className="self-start flex items-end gap-3">
              <InfoPanel open={aboutOpen} onOpenChange={setAboutOpen} />
              <Legend />
            </div>
          </div>
        }
      />

      <PermissionExplainer
        open={explainerOpen}
        onAccept={() => {
          setExplainerOpen(false);
          mapBus.dispatch("locate", undefined);
          // pendingDestination stays set; the effect fires once userLocation lands.
        }}
        onDecline={() => {
          setExplainerOpen(false);
          setPendingDestination(null);
        }}
      />
    </>
  );
}
