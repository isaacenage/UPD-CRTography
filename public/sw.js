// Hanap-Bidet service worker — manual implementation, no Workbox.
//
// Caching strategies:
//   - App shell + icons + manifest      → cache-first, precached on install
//   - /data/up-buildings.geojson        → stale-while-revalidate
//   - OpenFreeMap style.json + tiles    → stale-while-revalidate (capped)
//   - OSRM /route/v1                    → network-only (never cached)
//   - Same-origin Next chunks (/_next/) → stale-while-revalidate
//
// Bump CACHE_VERSION on every deploy that changes shell/data behavior so
// old caches are evicted on activate.

const CACHE_VERSION = "hb-v2";
const SHELL_CACHE = `hb-shell-${CACHE_VERSION}`;
const DATA_CACHE = `hb-data-${CACHE_VERSION}`;
const TILE_CACHE = `hb-tiles-${CACHE_VERSION}`;
const NEXT_CACHE = `hb-next-${CACHE_VERSION}`;

const SHELL_PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icons/logo.svg",
];

const TILE_HOSTS = ["tiles.openfreemap.org"];
const ROUTE_HOSTS = [
  "router.project-osrm.org",
  // Self-hosted endpoints can be matched by URL path; see fetch handler.
];

const TILE_CACHE_MAX = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Use addAll-with-individual-requests so a single 404 doesn't void the
      // entire precache (the page route may be missing in some prerender
      // configurations).
      await Promise.all(
        SHELL_PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // Best-effort precache.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const ours = new Set([SHELL_CACHE, DATA_CACHE, TILE_CACHE, NEXT_CACHE]);
      await Promise.all(
        names
          .filter((name) => name.startsWith("hb-") && !ours.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isTileRequest(url) {
  return TILE_HOSTS.includes(url.hostname);
}

function isRouteRequest(url) {
  if (ROUTE_HOSTS.includes(url.hostname)) return true;
  // Path-based heuristic for self-hosted OSRM behind a custom domain.
  return url.pathname.startsWith("/route/v1") || url.pathname.includes("/osrm/");
}

function isDataRequest(url) {
  return url.pathname === "/data/up-buildings.geojson";
}

function isNextChunk(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isShellNavigation(req) {
  return req.mode === "navigate" || (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));
}

async function staleWhileRevalidate(cacheName, request, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (res) => {
      if (res && res.ok) {
        await cache.put(request, res.clone());
        if (typeof maxEntries === "number") trimCache(cacheName, maxEntries);
      }
      return res;
    })
    .catch(() => null);
  return cached ?? (await network) ?? Response.error();
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Routing responses are intentionally not cached — too dynamic.
  if (isRouteRequest(url)) return;

  if (isTileRequest(url)) {
    event.respondWith(staleWhileRevalidate(TILE_CACHE, req, TILE_CACHE_MAX));
    return;
  }

  if (isDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(DATA_CACHE, req));
    return;
  }

  if (isNextChunk(url)) {
    event.respondWith(staleWhileRevalidate(NEXT_CACHE, req));
    return;
  }

  // Navigation requests: try network, fall back to the cached shell ("/")
  // so the app at least shells up offline. Last-mile data still requires
  // network if not previously cached.
  if (isShellNavigation(req)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put("/", fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const fallback = (await cache.match("/")) ?? (await cache.match(req));
          return fallback ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Same-origin assets (icons etc.): cache-first, fallback to network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        } catch {
          return Response.error();
        }
      })(),
    );
  }
});
