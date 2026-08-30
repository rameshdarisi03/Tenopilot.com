// Service Worker for TenoPilot.com PWA Standalone App
// Cache Version v2: Strictly caches static branding assets and prevents stale dynamic HTML caching
const CACHE_NAME = "tenopilot-pwa-v2";
const ASSETS_TO_CACHE = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Purging legacy PWA cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Dynamic pages & API endpoints MUST ALWAYS be real-time network requests
  if (
    url.pathname.startsWith("/p/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/home" ||
    url.pathname === "/welcome" ||
    url.pathname === "/login" ||
    url.pathname === "/signup"
  ) {
    return; // Pass through directly to browser network
  }

  // Network-first with static cache fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
