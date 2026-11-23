/* Service Worker für "Rechnen mit Funkel": legt die App auf dem Gerät ab, damit sie auch ohne Netz startet.
   Die Version wird beim Bauen (build.py) aus dem Inhalt berechnet; neue Version = alter Speicher wird gelöscht. */
'use strict';
const VERSION = 'ba52653474';
const CACHE = 'funkel-' + VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon-48.png', 'icon.svg'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('funkel-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Sofort aus dem Speicher antworten und im Hintergrund die frische Fassung holen (gilt beim nächsten Start). */
function staleWhileRevalidate(req, opts) {
  return caches.open(CACHE).then((cache) =>
    cache.match(req, opts).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
        return res;
      }).catch(() => null);
      return hit || net.then((res) => res || Response.error());
    })
  );
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // Jede Seitenadresse der App führt zur einen Startseite (Offline-Start, auch mit angehängtem ?utm= usw.)
      e.respondWith(
        staleWhileRevalidate(new Request(new URL('index.html', self.registration.scope).href), { ignoreSearch: true })
          .then((res) => (res && res.ok ? res : caches.match('index.html')))
      );
      return;
    }
    e.respondWith(staleWhileRevalidate(req, { ignoreSearch: true }));
    return;
  }
  if (FONT_HOSTS.includes(url.hostname)) e.respondWith(staleWhileRevalidate(req));
});
