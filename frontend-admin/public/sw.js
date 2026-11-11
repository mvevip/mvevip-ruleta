/* Service worker del Admin de Marketing VIP.
 *  - Hace la aplicación instalable (PWA) y la abre rápido (caché de archivos estáticos).
 *  - Recibe las notificaciones push (VAPID) de cada lead nuevo y abre el Admin al tocarlas.
 * Las llamadas al API (/api/*) NUNCA se guardan en caché: los datos siempre son los del servidor. */

const VERSION = 'v1';
const STATIC_CACHE = `vip-admin-static-${VERSION}`;
const SCOPE_URL = new URL(self.registration.scope);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([
    new URL('icons/icon-192.png', SCOPE_URL).href,
    new URL('logotipo.png', SCOPE_URL).href
  ]).catch(() => {})));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('vip-admin-static-') && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // el API va siempre a la red

  // Páginas: red primero (siempre la versión nueva); sin conexión, la última guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(SCOPE_URL.href, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(SCOPE_URL.href).then((r) => r || Response.error()))
    );
    return;
  }

  // Archivos con huella (assets/*) e íconos: caché primero
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});

// ---------- Notificaciones push ----------
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Nuevo lead', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'Nuevo lead';
  const options = {
    body: data.body || '',
    icon: new URL('icons/icon-192.png', SCOPE_URL).href,
    badge: new URL('icons/badge-96.png', SCOPE_URL).href,
    tag: data.tag || 'vip-lead',
    renotify: true,
    timestamp: data.timestamp || Date.now(),
    data: { url: data.url || './#/leads' },
    vibrate: [120, 60, 120]
  };

  event.waitUntil((async () => {
    try {
      await self.registration.showNotification(title, options);
    } catch (e) {
      // Sin permiso de notificaciones no se muestra el aviso, pero el Admin abierto igual se actualiza
    }
    // Si el Admin está abierto, se le avisa para que actualice los listados al instante
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: 'NEW_LEAD', payload: data }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './#/leads', SCOPE_URL).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.startsWith(SCOPE_URL.href)) {
        await client.focus();
        client.navigate ? await client.navigate(target).catch(() => {}) : null;
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
