// Tiny pub-sub bridge between shell components (LocateFab, SearchBar) and
// the Map component. Avoids prop-drilling refs through AppShell while
// staying outside React's render lifecycle. Single EventTarget instance.

type EventMap = {
  // Triggered by LocateFab — Map calls GeolocateControl.trigger().
  locate: undefined;
  // Triggered by HomeFab — Map fits to the full building extent.
  fitBuildings: undefined;
  // Triggered by SearchBar — Map flies to a feature by id.
  flyTo: { featureId: number };
  // Triggered by Map when geolocation settles — sheet uses for distance.
  userLocation: { lng: number; lat: number; accuracy: number } | null;
  // Routing protocol — page.tsx asks; Map (which owns the maplibre instance
  // and the lazy-loaded directions plugin) answers with one of the result
  // events. The requestId pairs requests with responses across re-renders.
  requestRoute: {
    requestId: string;
    from: readonly [number, number];
    to: readonly [number, number];
  };
  routeReady: {
    requestId: string;
    route: import("@/lib/directions").RouteResult;
  };
  routeError: { requestId: string; message: string };
  clearRoute: undefined;
  // Tells Map to start/stop following the user's location with easeTo.
  followMode: { active: boolean };
  // Triggered by Map for non-fatal errors (Phase 6 wires log).
  error: { source: string; message: string };
};

class MapBus {
  private readonly target: EventTarget;

  constructor() {
    this.target = new EventTarget();
  }

  dispatch<K extends keyof EventMap>(type: K, detail: EventMap[K]): void {
    this.target.dispatchEvent(new CustomEvent(type, { detail }));
  }

  on<K extends keyof EventMap>(
    type: K,
    handler: (detail: EventMap[K]) => void,
  ): () => void {
    const listener = (event: Event) => {
      const ce = event as CustomEvent<EventMap[K]>;
      handler(ce.detail);
    };
    this.target.addEventListener(type, listener);
    return () => this.target.removeEventListener(type, listener);
  }
}

export const mapBus = new MapBus();
