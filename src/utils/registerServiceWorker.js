// Registrar Service Worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registrado com sucesso:', registration.scope);

          // Verificar atualizações periodicamente
          setInterval(() => {
            registration.update();
          }, 60000); // A cada minuto

          // Listener de atualização
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  console.log('[SW] Nova versão disponível');
                  if (window.confirm('Nova versão disponível! Deseja atualizar?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Erro ao registrar Service Worker:', error);
        });

      // Listener de mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMANDAS') {
          console.log('[SW] Mensagem de sincronização recebida');
          // Disparar evento customizado para componentes ouvirem
          window.dispatchEvent(new CustomEvent('sync-comandas'));
        }
      });
    });
  } else {
    console.warn('[SW] Service Worker não suportado neste navegador');
  }
}
