/* Static files only. No game state or secret words are persisted here. */
const CACHE = "__CACHE__";
const FILES = __FILES__;
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          FILES.map((file) => new URL(file, self.registration.scope).href),
        ),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("imposteur-voile-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  if (event.request.mode === "navigate") {
    // Keep each shell paired with its precached assets until the next activation.
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) =>
          cache.match(new URL("index.html", self.registration.scope).href),
        )
        .then((hit) => hit || fetch(event.request)),
    );
  } else {
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) => cache.match(event.request))
        .then((hit) => hit || fetch(event.request)),
    );
  }
});
