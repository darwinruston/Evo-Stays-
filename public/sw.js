// Evo Stays service worker. Two jobs, deliberately small:
//
// 1. Show push alerts when the app isn't open, and open the right page when
//    one is tapped.
// 2. When a page can't load because there's no signal, show a plain
//    "you're offline" page instead of the browser's error.
//
// It does NOT cache the app's own pages or data: those are different for each
// signed-in person and change constantly, and showing someone a stale
// schedule is worse than telling them they're offline.

const CACHE = "evo-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // The offline page's own logo, so it still shows with no connection.
  if (new URL(event.request.url).pathname === "/icons/icon-192.png") {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

// Only ever follow a link on this site.
function safeUrl(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "Evo Stays";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      // The same tag replaces an earlier alert instead of stacking up.
      tag: typeof data.tag === "string" ? data.tag : undefined,
      data: { url: safeUrl(data.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Reuse a window that's already open on this site rather than adding another.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus().then(() => ("navigate" in client ? client.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
