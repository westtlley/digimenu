const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

const createLoggedLoader = (label, importer) => {
  let inFlight = null;

  return async () => {
    if (!inFlight) {
      if (isDev) {
        console.info(`[ROUTE] ${label} import started`);
      }

      inFlight = importer()
        .then((mod) => {
          if (isDev) {
            console.info(`[ROUTE] ${label} import success`);
          }
          return mod;
        })
        .catch((error) => {
          if (isDev) {
            console.error(`[ROUTE] ${label} import failed`, error);
          }
          inFlight = null;
          throw error;
        });
    }

    return inFlight;
  };
};

export const loadAdminPage = createLoggedLoader('Admin', () => import('./Admin.jsx'));
export const loadPainelAssinantePage = createLoggedLoader('PainelAssinante', () => import('./PainelAssinante.jsx'));
export const loadColaboradorHomePage = createLoggedLoader('ColaboradorHome', () => import('./ColaboradorHome.jsx'));

