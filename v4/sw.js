/* ========================================
   TASK WALLET v4 — service worker
   Opens instantly and works offline. Serves the cached copy first and
   refreshes it in the background, so a new version shows on the next open.
   Bump CACHE when shipping changes.
   ======================================== */
const CACHE = 'task-wallet-v4.0.0';
const ASSETS = [
    './',
    './index.html',
    './css/app.css',
    './js/util.js',
    './js/parser.js',
    './js/store.js',
    './js/life.js',
    './js/app.js',
    './manifest.webmanifest',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    e.respondWith(caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const fresh = fetch(req)
            .then((res) => {
                if (res.ok) cache.put(req, res.clone());
                return res;
            })
            .catch(() => cached);
        if (cached) {
            e.waitUntil(fresh);
            return cached;
        }
        return fresh;
    }));
});

// Tapping a reminder opens (or focuses) the app.
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        const open = list.find((c) => 'focus' in c);
        return open ? open.focus() : self.clients.openWindow('./?tab=tasks');
    }));
});
