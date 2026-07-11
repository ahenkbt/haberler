/* Yektube v2 — offline app shell (production + preview) */
const CACHE = "yektube-v2-shell-v18";
const BASE = self.registration.scope;

const SHELL = ["index.html", "manifest.webmanifest", "yektube-icon.png", "yektube-logo.png", "offline.html"].map(
  (p) => new URL(p, BASE).href,
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Yektube", body: "Yeni içerik var.", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: new URL("yektube-icon.png", BASE).href,
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline", items: [] }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    if (/\.(ytimg\.com|youtube\.com|youtube-nocookie\.com)/.test(url.hostname)) {
      event.respondWith(
        caches.open(CACHE).then(async (cache) => {
          const cached = await cache.match(request);
          if (cached) return cached;
          try {
            const res = await fetch(request);
            if (res.ok) cache.put(request, res.clone());
            return res;
          } catch {
            return cached ?? Response.error();
          }
        }),
      );
    }
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.mode === "navigate") {
          caches.open(CACHE).then((c) => c.put(request, res.clone()));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const offline = await caches.match(new URL("offline.html", BASE).href);
          if (offline) return offline;
          const index = await caches.match(new URL("index.html", BASE).href);
          if (index) return index;
        }
        return Response.error();
      }),
  );
});
