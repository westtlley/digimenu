import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let mapsBootPromise = null;
let configuredKey = null;
let googleMapsAuthFailed = false;
let authFailureHandlerInstalled = false;
const authFailureListeners = new Set();
const GOOGLE_MAPS_AUTH_ERROR = 'Google Maps indisponivel neste ambiente.';

function getApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
}

function notifyAuthFailure(error) {
  authFailureListeners.forEach((listener) => {
    try {
      listener(error);
    } catch (listenerError) {
      console.error('Erro ao notificar falha do Google Maps:', listenerError);
    }
  });
}

function markGoogleMapsAuthFailure(message = GOOGLE_MAPS_AUTH_ERROR) {
  googleMapsAuthFailed = true;
  mapsBootPromise = null;
  notifyAuthFailure(new Error(message));
}

function installGoogleMapsAuthFailureHandler() {
  if (typeof window === 'undefined' || authFailureHandlerInstalled) return;

  const previousHandler = typeof window.gm_authFailure === 'function'
    ? window.gm_authFailure
    : null;

  window.gm_authFailure = () => {
    markGoogleMapsAuthFailure();

    if (previousHandler) {
      previousHandler();
    }
  };

  authFailureHandlerInstalled = true;
}

export async function ensureGoogleMapsLoaded() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY ausente no build');
  }

  installGoogleMapsAuthFailureHandler();

  if (configuredKey !== apiKey) {
    configuredKey = apiKey;
    googleMapsAuthFailed = false;
    mapsBootPromise = null;
  }

  if (googleMapsAuthFailed) {
    throw new Error(GOOGLE_MAPS_AUTH_ERROR);
  }

  if (mapsBootPromise && configuredKey === apiKey) {
    return mapsBootPromise;
  }

  mapsBootPromise = (async () => {
    try {
      setOptions({
        apiKey,
        version: 'weekly',
        language: 'pt-BR',
        region: 'BR',
      });

      const [mapsLib, placesLib, geocodingLib] = await Promise.all([
        importLibrary('maps'),
        importLibrary('places'),
        importLibrary('geocoding'),
      ]);

      if (googleMapsAuthFailed) {
        throw new Error(GOOGLE_MAPS_AUTH_ERROR);
      }

      return { mapsLib, placesLib, geocodingLib };
    } catch (error) {
      mapsBootPromise = null;
      throw error;
    }
  })();

  return mapsBootPromise;
}

export function getGoogleMapsApiKey() {
  return getApiKey();
}

export function canUseGoogleMaps() {
  return Boolean(getApiKey()) && !googleMapsAuthFailed;
}

export function onGoogleMapsAuthFailure(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  authFailureListeners.add(listener);

  if (googleMapsAuthFailed) {
    listener(new Error(GOOGLE_MAPS_AUTH_ERROR));
  }

  return () => {
    authFailureListeners.delete(listener);
  };
}
