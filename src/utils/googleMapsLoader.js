import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let mapsBootPromise = null;
let configuredKey = null;

function getApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
}

export async function ensureGoogleMapsLoaded() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY ausente no build');
  }

  if (mapsBootPromise && configuredKey === apiKey) {
    return mapsBootPromise;
  }

  configuredKey = apiKey;

  mapsBootPromise = (async () => {
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

    return { mapsLib, placesLib, geocodingLib };
  })();

  return mapsBootPromise;
}

export function getGoogleMapsApiKey() {
  return getApiKey();
}
