// Service Worker para modo offline
const CACHE_NAME = 'digimenu-garcom-v2';
const OFFLINE_URL = '/offline.html';

// Recursos estáticos para cache (não cachear /assets/ para evitar layout quebrado)
const STATIC_ASSETS = [
  '/',
  '/Garcom',
  '/offline.html',
  '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Erro ao cachear recursos:', err);
      })
  );
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET e para APIs
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Nunca usar cache para /assets/ (JS/CSS do app) — evita layout quebrado
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Retornar do cache se disponível
        if (response) {
          return response;
        }

        // Tentar buscar da rede
        return fetch(request)
          .then((response) => {
            // Não cachear /assets/ (JS/CSS) para evitar servir HTML por engano
            if (response && response.status === 200 && !url.pathname.startsWith('/assets/')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // Se offline e for navegação, retornar página offline
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronização em background:', event.tag);
  if (event.tag === 'sync-comandas') {
    event.waitUntil(syncComandas());
  }
});

// Função de sincronização de comandas
async function syncComandas() {
  try {
    // Notificar cliente para sincronizar
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMANDAS'
      });
    });
  } catch (error) {
    console.error('[SW] Erro na sincronização:', error);
  }
}

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
