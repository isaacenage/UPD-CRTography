<div align="center">

# UPD CRtography &middot; Hanap‑Bidet

### *A mobile‑first cartography of UP Diliman comfort rooms.*

**Bidet availability · Gender access · Condition · Public usability · Walking directions**

<br />

<a href="https://hanapbidet-upd.vercel.app">
  <img src="https://img.shields.io/badge/▸%20ACCESS%20IT%20HERE-7B1113?style=for-the-badge&logo=vercel&logoColor=F7F4EE&labelColor=7B1113" alt="Access Hanap-Bidet" height="48" />
</a>

<br /><br />

![Next.js](https://img.shields.io/badge/Next.js%2015-014421?style=flat-square&logo=nextdotjs&logoColor=F7F4EE)
![React](https://img.shields.io/badge/React%2019-7B1113?style=flat-square&logo=react&logoColor=F7F4EE)
![TypeScript](https://img.shields.io/badge/TypeScript-014421?style=flat-square&logo=typescript&logoColor=F7F4EE)
![Tailwind](https://img.shields.io/badge/Tailwind%204-D4A547?style=flat-square&logo=tailwindcss&logoColor=1A1A1A)
![MapLibre](https://img.shields.io/badge/MapLibre%20GL-F47E3F?style=flat-square&logo=maplibre&logoColor=1A1A1A)
![PWA](https://img.shields.io/badge/PWA-7B1113?style=flat-square&logo=pwa&logoColor=F7F4EE)

</div>

---

## What is Hanap‑Bidet?

Hanap‑Bidet ("find a bidet" in Filipino) is a quick, offline‑friendly map for **anyone on the UP Diliman campus** who needs a clean, inclusive comfort room — fast. Tap a building, see what's inside, get walking directions from where you're standing.

Data is sourced from the [Philippine Collegian](https://www.facebook.com/share/p/1HwxPg9ETt/) campus survey.

<table>
<tr>
<td width="50%" valign="top">

### Who benefits most

- **Students** rushing between classes
- **Joggers & runners** on the academic oval
- **Staff & faculty** in unfamiliar buildings
- **Visitors & guests** attending events
- **Menstruating users** needing a bidet or a private stall
- **Persons with disabilities** scouting accessible facilities ahead of time
- **Anyone** who has ever lost the lottery looking for a working CR

</td>
<td width="50%" valign="top">

### What you get

- Live map of UP Diliman buildings with comfort‑room data
- Filter by **bidet**, **gender access**, **condition**, **public access**
- One‑tap **walking directions** from your current location
- **Follow mode** that reroutes if you stray off path
- Works on phones, tablets, and desktops
- Installable as a **PWA** — opens like a native app, runs offline

</td>
</tr>
</table>

---

## How to use it

<div align="center">

| Step | Action |
| :--: | :----- |
| **1** | Open <a href="https://hanapbidet-upd.vercel.app"><b>hanapbidet‑upd.vercel.app</b></a> on your phone |
| **2** | Tap the locate button — grant location permission so the map can route from where you are |
| **3** | Use the **filter chips** at the top to narrow by bidet, gender, condition, or public access |
| **4** | Tap any building on the map (or search by name) to see its comfort‑room details |
| **5** | Hit **Directions** to get a turn‑by‑turn walking route. Stray off path? It reroutes |
| **6** | *(Optional)* Tap *Add to Home Screen* / *Install App* to use it offline like a native app |

</div>

---

## Privacy &middot; No login. No tracking. No data collection.

> **Hanap‑Bidet does not have user accounts, sign‑in, or any backend that stores who you are.**

- 🔒 **No login, ever.** There is no auth, no profiles, no email capture, no OAuth.
- 📍 **Your location stays on your device.** When you grant location permission, it's used only by the browser and the map in front of you. It is **never sent to a server we own**.
- 🍪 **No analytics, no cookies, no fingerprinting.** No Google Analytics, no ad networks, no behavioral tracking.
- 🧭 **Routing requests** are sent to a public OSRM endpoint to compute walking paths. They contain only the two coordinates being routed — no identifier tying them to you.
- 📦 **Offline cache** lives entirely in your browser's service worker storage. Clearing site data wipes it instantly.

The only personal datum the app ever touches is your live GPS coordinate, and it never leaves your phone.

---

## Terms of use

By using Hanap‑Bidet, you agree to the following:

1. **Informational only.** Comfort‑room data is community‑sourced and reflects conditions at the time of survey. Facilities change — a bidet today may be broken tomorrow. **Always verify on site.**
2. **No warranty.** The app is provided *as is*, without warranty of any kind. The author is not liable for inconvenience, missed classes, or any consequence of relying on the data.
3. **Walking directions are estimates.** Routes are computed from open street data and may not reflect closed corridors, construction, or restricted areas. Use common sense; obey campus signage.
4. **Respect the spaces.** This map points you to facilities meant to be shared. Leave them at least as clean as you found them.
5. **Non‑commercial.** Don't repackage the data or the app for paid services without permission.
6. **Attribution.** If you reference, fork, or build on this project, credit the author and the original [Philippine Collegian](https://www.facebook.com/share/p/1HwxPg9ETt/) data source.

---

## Made by

<div align="center">

### **Isaac Enage**

*Designed and built for the UP Diliman community.*

</div>

---

## Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Tailwind CSS 4** (CSS‑based `@theme` tokens)
- **MapLibre GL** v4 (raster basemap from OpenFreeMap Positron, GeoJSON overlay)
- **`@maplibre/maplibre-gl-directions`** (open‑source walking‑route plugin, OSRM‑backed)
- **PWA** (web app manifest + service worker for offline shell + tile cache)

The visual identity follows the brand system in `.claude/zac-brand/` — UP heritage palette (maroon, forest green, gold, track orange) on warm‑bone paper.

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

## Walking‑route backend (OSRM)

The directions feature uses any OSRM‑compatible `/route/v1` endpoint. The default is the public OSRM demo (`https://router.project-osrm.org`), which is **fine for development but rate‑limited and not for production**.

For production:

1. **Self‑host OSRM** in Docker with a Luzon foot‑profile extract (~30 MB pbf clipped to QC bbox). Cheapest option, ~$5/mo on Fly.io / Hetzner / Railway.
2. **Stadia Maps** OSRM‑compatible routing (free non‑commercial tier, sign up).
3. **MapTiler** Routing API (free tier with key in URL).

Set `NEXT_PUBLIC_OSRM_URL` in `.env.local`. All routing flows through `lib/directions.ts`, which is the only file that imports the plugin — swap is a single‑file change.

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

## Mobile / cross‑browser notes

- **iOS Safari**: `viewportFit: "cover"` + `apple-mobile-web-app-status-bar-style: black-translucent` so the map can render under the Dynamic Island while UI chrome respects safe areas.
- **Android Chrome**: layout uses `100dvh` (dynamic viewport) — the URL bar collapse no longer pushes the bottom sheet off‑screen.
- **In‑app webviews** (Facebook iOS, Messenger Android): a `100%` body fallback covers older WebKit builds that don't support `dvh`.
- **PWA**: installable on Chrome/Edge/Samsung via the in‑app prompt, and on iOS via Share → Add to Home Screen.
- **Offline**: app shell + last‑viewed basemap tiles + the geojson are cached by the service worker. Routing is online‑only with the haversine fallback.

## Legacy

The original Leaflet build lives in `legacy/`. It is preserved for reference and can be deleted once the Next.js version is verified in production.

---

<div align="center">

<a href="https://hanapbidet-upd.vercel.app">
  <img src="https://img.shields.io/badge/▸%20OPEN%20HANAP--BIDET-014421?style=for-the-badge&logoColor=F7F4EE&labelColor=014421" alt="Open Hanap-Bidet" height="44" />
</a>

<br /><br />

<sub>Built with care for UP Diliman · © Isaac Enage</sub>

</div>
