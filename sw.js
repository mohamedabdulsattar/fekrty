const CACHE = "fekrty-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match("/index.html"));
    })
  );
});

// Push notifications
self.addEventListener("push", e => {
  const data = e.data ? e.data.json() : { title:"فكرتى", body:"تذكير بمهمة عاجلة!" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      dir: "rtl",
      lang: "ar",
      vibrate: [200, 100, 200],
      tag: "fekrty-reminder",
      actions: [
        { action: "open", title: "فتح التطبيق" },
        { action: "dismiss", title: "تجاهل" }
      ]
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "open" || !e.action) {
    e.waitUntil(clients.openWindow("/"));
  }
});
