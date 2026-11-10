// Caches the app so it works in a roof space with no signal.
// Bump VERSION whenever you change any file so phones pick up the update.
const VERSION = "gwc-v7";
const WAIT_MS = 3000; // on weak signal, give up on the network after this and use the saved copy
const FILES = ["./", "index.html", "app.js", "decode.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first so updates show up, but never wait more than WAIT_MS on weak signal:
// after that the saved copy opens, and the network answer (if it comes) updates the cache.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const saved = () => caches.match(req, { ignoreSearch: true })
    .then(r => r || (req.mode === "navigate" ? caches.match("index.html") : undefined));
  const net = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  const slow = new Promise(r => setTimeout(r, WAIT_MS)).then(saved);
  e.respondWith(
    Promise.race([net, slow])
      .then(r => r || net)
      .catch(() => saved().then(r => r || Response.error()))
  );
});
