const CACHE_NAME = "kinclongin-static-v2";
const isLocalhost =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.endsWith(".local");

// Jika di localhost / development, nonaktifkan SW dan bersihkan cache agar tidak mengganggu HMR & hydration
if (isLocalhost) {
  self.addEventListener("install", () => {
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
  });
} else {
  const STATIC_ASSETS = [
    "/",
    "/pos/antrean",
    "/pos/daftar-baru",
    "/layar-cuci",
    "/icons/icon-192x192.svg",
    "/icons/icon-512x512.svg",
    "/logoipsum.svg",
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
    if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
      return;
    }

    // Strategi Network-First dengan fallback cache untuk aset statis & halaman
    // Hindari Cache-First buta pada _next/static agar tidak terjadi hydration mismatch saat deploy baru
    if (
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2|woff|ttf)$/)
    ) {
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
            const cachedResponse = await caches.match(request);
            if (cachedResponse) return cachedResponse;
            return Response.error();
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
          const fallback = await caches.match("/pos/antrean");
          return fallback || Response.error();
        })
    );
  });
}
