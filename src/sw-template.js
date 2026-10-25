/* Cache a versioned HTML shell with exactly its matching assets. */
const CACHE = "__CACHE__";
const SHELL = "__SHELL__";
const FILES = __FILES__;
const PREFIX = "imposteur-voile-";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          FILES.map(
            (file) =>
              new Request(new URL(file, self.registration.scope), {
                cache: "reload",
              }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  // Preserve previous assets for tabs already running a game. Never reload a tab.
  event.waitUntil(self.clients.claim());
});
async function cachedAsset(request) {
  const current = await caches.open(CACHE);
  const hit = await current.match(request);
  if (hit) return hit;
  for (const name of (await caches.keys()).filter(
    (k) => k.startsWith(PREFIX) && k !== CACHE,
  )) {
    const previous = await (await caches.open(name)).match(request);
    if (previous) return previous;
  }
  return fetch(request);
}
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) =>
          cache.match(new URL(SHELL, self.registration.scope).href),
        )
        .then(
          (hit) =>
            hit || fetch(new Request(event.request, { cache: "reload" })),
        ),
    );
  } else event.respondWith(cachedAsset(event.request));
});
