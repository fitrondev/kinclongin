const CACHE_NAME = "kinclongin-static-v1";
const STATIC_ASSETS = [
  "/",
  "/pos/queue",
  "/pos/new",
  "/kiosk/washer",
  "/logo.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Service Worker: gagal pre-cache beberapa berkas:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Jangan sentuh API routes atau Server Actions POST
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Strategi Cache-First untuk aset statis (fonts, images, scripts)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2|woff|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategi Network-First dengan fallback cache untuk navigasi halaman
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback antrean jika rute halaman tidak tersedia saat offline
        const fallback = await caches.match("/pos/queue");
        return fallback || Response.error();
      })
  );
});
