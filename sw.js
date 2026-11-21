// Netwerk eerst, cache als terugval: altijd de nieuwste versie, maar werkt ook offline.
// Verhoog VERSIE (en de ?v= in index.html en js/*.js) bij elke nieuwe versie van de app.
const VERSIE = 3;
const CACHE = `noodpakket-v${VERSIE}`;
const BESTANDEN = [
  "./", "index.html", `css/style.css?v=${VERSIE}`, `js/app.js?v=${VERSIE}`, `js/datum.js?v=${VERSIE}`,
  `js/kluis.js?v=${VERSIE}`, `js/klaar.js?v=${VERSIE}`, `js/gids.js?v=${VERSIE}`, "manifest.webmanifest", "icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(BESTANDEN.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // cache: "no-cache" laat de browser altijd bij de server navragen of er een nieuwere versie is,
  // zodat een nieuwe pagina nooit met een oud script uit de browsercache draait.
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" })
      .then((res) => {
        if (res.ok) {
          const kopie = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match(e.request, { ignoreSearch: true })))
  );
});
