// DigiMenu service worker de desativacao.
// Objetivo: remover o worker legado que cacheava HTML de rotas privadas
// e podia manter clientes presos em shells antigos apos deploy.

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

async function notifyClientsAndReload() {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  clients.forEach((client) => {
    client.postMessage({ type: 'DIGIMENU_SW_DISABLED' });
    client.navigate(client.url);
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(clearAllCaches());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await clearAllCaches();
    await self.registration.unregister();
    await notifyClientsAndReload();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
