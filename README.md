# UPD CRtography &middot; Hanap-Bidet (UPD Edition)

A mobile-first cartography of UP Diliman comfort rooms — bidet availability, gender access, condition, public usability, and walking directions from your current location. Built for students, staff, joggers, and visitors looking for clean, inclusive facilities on campus.

Data source: [Philippine Collegian](https://www.facebook.com/share/p/1HwxPg9ETt/).

---

## Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Tailwind CSS 4** (CSS-based `@theme` tokens)
- **MapLibre GL** v4 (raster basemap from OpenFreeMap Positron, GeoJSON overlay)
- **`@maplibre/maplibre-gl-directions`** (open-source walking-route plugin, OSRM-backed)
- **PWA** (web app manifest + service worker for offline shell + tile cache)

The visual identity follows the brand system in `.claude/zac-brand/` — UP heritage palette (maroon, forest green, gold, track orange) on warm-bone paper.

## Develop

```bash
npm install
cp .env.example .env.local   # optional — only if you want to override the OSRM endpoint
npm run dev
```

Open <http://localhost:3000>.

## Build

```bash
npm run build
npm start
```

## Walking-route backend (OSRM)

The directions feature uses any OSRM-compatible `/route/v1` endpoint. The default is the public OSRM demo (`https://router.project-osrm.org`), which is **fine for development but rate-limited and not for production**.

For production:

1. **Self-host OSRM** in Docker with a Luzon foot-profile extract (~30 MB pbf clipped to QC bbox). Cheapest option, ~$5/mo on Fly.io / Hetzner / Railway.
2. **Stadia Maps** OSRM-compatible routing (free non-commercial tier, sign up).
3. **MapTiler** Routing API (free tier with key in URL).

Set `NEXT_PUBLIC_OSRM_URL` in `.env.local`. All routing flows through `lib/directions.ts`, which is the only file that imports the plugin — swap is a single-file change.

If the endpoint is unreachable (offline, blocked, 503), the app silently falls back to a haversine bearing + distance estimate so the directions sheet still has something useful for joggers nearby.

## Project layout

```
app/                      # Next.js App Router pages, layout, manifest, icons
components/
  Map.tsx                 # MapLibre GL container — owns the map instance
  shell/                  # AppShell, TopBar, ChipRow, LocateFab, BottomSheetShell
  sheet/                  # BottomSheet (drag), BuildingDetail, EmptyState, SheetHandle
  search/                 # SearchBar (visualViewport-aware), FilterChips
  directions/             # DirectionsSheet, FollowModeOverlay
  geo/                    # PermissionExplainer
  legacy-overlay/         # Desktop-only sidebar fork (Title/Legend/Info)
  SwRegister.tsx          # Service-worker registration + update toast
lib/
  buildingFormat.ts       # Boundary parser for building feature properties
  filters.ts              # Filter model + MapLibre expression helpers
  searchBuildings.ts      # In-memory fuzzy search (no fuse.js)
  mapBus.ts               # Pub-sub bridge between shell and Map
  safeArea.ts             # Safe-area inset helpers
  geo/
    geoBounds.ts          # bbox + centroid for GeoJSON features
    distance.ts           # Haversine + bearing + display formatters
    follow.ts             # Reroute-on-deviation controller
  directions.ts           # MapLibre Directions plugin wrapper (sole import site)
  directions/
    haversineFallback.ts  # Offline fallback route
  dom/
    useMediaQuery.ts      # SSR-safe matchMedia hook
    useDebouncedValue.ts  # Generic debounce hook
public/
  data/                   # up-buildings.geojson (converted from legacy)
  icons/                  # PWA icons (SVG, scalable)
  sw.js                   # Service worker
legacy/                   # Original Leaflet implementation (safe to delete once verified)
.claude/zac-brand/        # Brand system reference
```

## Mobile / cross-browser notes

- **iOS Safari**: `viewportFit: "cover"` + `apple-mobile-web-app-status-bar-style: black-translucent` so the map can render under the Dynamic Island while UI chrome respects safe areas.
- **Android Chrome**: layout uses `100dvh` (dynamic viewport) — the URL bar collapse no longer pushes the bottom sheet off-screen.
- **In-app webviews** (Facebook iOS, Messenger Android): a `100%` body fallback covers older WebKit builds that don't support `dvh`.
- **PWA**: installable on Chrome/Edge/Samsung via the in-app prompt, and on iOS via Share → Add to Home Screen.
- **Offline**: app shell + last-viewed basemap tiles + the geojson are cached by the service worker. Routing is online-only with the haversine fallback.

## Legacy

The original Leaflet build lives in `legacy/`. It is preserved for reference and can be deleted once the Next.js version is verified in production.
