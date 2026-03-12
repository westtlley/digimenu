async function unregisterExistingServiceWorkers() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return [];
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  return registrations;
}

// Service worker legado desativado.
// Mantemos a funcao para compatibilidade, mas ela apenas limpa registros antigos.
export async function registerServiceWorker() {
  try {
    const registrations = await unregisterExistingServiceWorkers();
    if (registrations.length > 0) {
      console.info('[SW] Registros antigos removidos:', registrations.length);
    }
    return null;
  } catch (error) {
    console.error('[SW] Erro ao limpar service workers legados:', error);
    return null;
  }
}
