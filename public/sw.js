/* OkurLab service worker — çevrimdışı uygulama kabuğu ve sesli okuma varlıkları.
 *
 * Stratejiler (classify() ile seçilir):
 *  - page    : sayfa gezinmeleri ve RSC yükleri → ağ öncelikli, çevrimdışıyken önbellek, olmazsa /offline
 *  - static  : /_next/static/* (içeriği hash'li) → önbellek öncelikli
 *  - asset   : /piper/*, pdf.js çalışanları, ikonlar → eskiyi göster, arkada yenile
 *  - cdn     : jsDelivr üzerindeki WASM çalışma zamanları (Piper/ONNX) → önbellek öncelikli
 *  - bypass  : /api, Supabase, Hugging Face modelleri ve POST istekleri → hiç dokunulmaz
 *
 * Ses modelleri (.onnx) çalışan tarafından OPFS/CacheStorage'a yazılır; burada önbelleğe alınmaz.
 */

const VERSION = "v1";
const PAGE_CACHE = `okurlab-pages-${VERSION}`;
const STATIC_CACHE = `okurlab-static-${VERSION}`;
const ASSET_CACHE = `okurlab-assets-${VERSION}`;
const CDN_CACHE = `okurlab-cdn-${VERSION}`;
const CURRENT_CACHES = [PAGE_CACHE, STATIC_CACHE, ASSET_CACHE, CDN_CACHE];

const OFFLINE_URL = "/offline";
const PRECACHE_PAGES = [
  "/",
  "/library",
  "/drills",
  "/speed-test",
  "/community",
  OFFLINE_URL,
];
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/okurlab-logo.svg",
  "/piper/piper-worker.mjs",
  "/piper/piper-phonemize.mjs",
  "/piper/ort.wasm.min.mjs",
  "/pdf.min.mjs",
  "/pdf.worker.min.mjs",
];

const CDN_HOSTS = ["cdn.jsdelivr.net"];

/** İsteği bir stratejiye eşler. Saf fonksiyondur; testlerde doğrudan çağrılır. */
function classify(request, origin) {
  if (request.method !== "GET") return "bypass";
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return "bypass";
  }

  if (url.origin !== origin) {
    return CDN_HOSTS.includes(url.hostname) ? "cdn" : "bypass";
  }

  const path = url.pathname;
  if (path.startsWith("/api/")) return "bypass";
  if (path === "/sw.js") return "bypass";
  if (path.startsWith("/_next/static/")) return "static";
  if (path.startsWith("/_next/")) return "bypass";
  if (
    path.startsWith("/piper/") ||
    /^\/pdf(\.worker)?(\.min)?\.mjs$/.test(path) ||
    /\.(svg|png|ico|webmanifest|pdf|md)$/.test(path)
  ) {
    return "asset";
  }
  return "page";
}

async function putIfOk(cacheName, request, response) {
  if (response && response.ok && response.type !== "opaque") {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    await putIfOk(PAGE_CACHE, request, response);
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw err;
  }
}

async function cacheFirst(cacheName, request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  return putIfOk(cacheName, request, response);
}

async function staleWhileRevalidate(cacheName, request, event) {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then((response) => putIfOk(cacheName, request, response))
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const fresh = await refresh;
  if (fresh) return fresh;
  throw new Error("Çevrimdışı ve önbellekte yok: " + request.url);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGE_CACHE);
      const assets = await caches.open(ASSET_CACHE);
      // Biri başarısız olsa bile (ör. kurulum sırasında çevrimdışı) kalan kaynaklar önbelleğe alınır.
      await Promise.all([
        ...PRECACHE_PAGES.map((url) => pages.add(url).catch(() => undefined)),
        ...PRECACHE_ASSETS.map((url) => assets.add(url).catch(() => undefined)),
      ]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("okurlab-") && !CURRENT_CACHES.includes(n))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const strategy = classify(event.request, self.location.origin);
  if (strategy === "bypass") return;

  if (strategy === "page") {
    event.respondWith(networkFirstPage(event.request));
  } else if (strategy === "static") {
    event.respondWith(cacheFirst(STATIC_CACHE, event.request));
  } else if (strategy === "cdn") {
    event.respondWith(cacheFirst(CDN_CACHE, event.request));
  } else {
    event.respondWith(staleWhileRevalidate(ASSET_CACHE, event.request, event));
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names.filter((n) => n.startsWith("okurlab-")).map((n) => caches.delete(n))
          )
        )
    );
  }
});

// Test ortamı için dışa açılır (tarayıcıda zararsızdır).
self.__okurlabSw = { classify, CURRENT_CACHES, VERSION };
