import {
  loadAdminPage,
  loadPainelAssinantePage,
  loadColaboradorHomePage,
} from '@/pages/protectedRouteLoaders';

const preloaders = [
  {
    match: (target) => target.includes('/admin'),
    load: loadAdminPage,
  },
  {
    match: (target) => target.includes('painelassinante'),
    load: loadPainelAssinantePage,
  },
  {
    match: (target) => target.includes('/colaborador'),
    load: loadColaboradorHomePage,
  },
];

export async function preloadProtectedRoute(targetUrl) {
  const normalizedTarget = String(targetUrl || '').toLowerCase();
  const preloader = preloaders.find((item) => item.match(normalizedTarget));
  if (!preloader) return;
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.info('[PRELOAD] route target', normalizedTarget);
  }
  await preloader.load();
}

export default preloadProtectedRoute;
