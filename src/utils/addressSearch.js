export const SAO_LUIS_MA_CENTER = { lat: -2.53874, lng: -44.28251 };

export function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toLatLng(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;

  const lat = toFiniteNumber(candidate.lat ?? candidate.latitude);
  const lng = toFiniteNumber(candidate.lng ?? candidate.longitude);

  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function resolveMapCenter(...candidates) {
  for (const candidate of candidates) {
    const coords = toLatLng(candidate);
    if (coords) return coords;
  }

  return { ...SAO_LUIS_MA_CENTER };
}

export function createLocationBias(center, radiusMeters = 30000) {
  const resolvedCenter = resolveMapCenter(center);
  const normalizedRadius = toFiniteNumber(radiusMeters) ?? 30000;

  return {
    center: resolvedCenter,
    radius: Math.max(5000, Math.round(normalizedRadius)),
  };
}

export function buildNominatimViewbox(center, radiusKm = 35) {
  const resolvedCenter = resolveMapCenter(center);
  const normalizedRadius = Math.max(1, toFiniteNumber(radiusKm) ?? 35);
  const latDelta = normalizedRadius / 111;
  const cosine = Math.cos((resolvedCenter.lat * Math.PI) / 180);
  const safeCosine = Math.abs(cosine) < 0.01 ? 0.01 : Math.abs(cosine);
  const lngDelta = normalizedRadius / (111 * safeCosine);

  const left = resolvedCenter.lng - lngDelta;
  const right = resolvedCenter.lng + lngDelta;
  const top = resolvedCenter.lat + latDelta;
  const bottom = resolvedCenter.lat - latDelta;

  return `${left},${top},${right},${bottom}`;
}

function readComponentValue(component, preferShort = false) {
  if (!component) return '';

  const longValue = component.longText ?? component.long_name ?? '';
  const shortValue = component.shortText ?? component.short_name ?? '';

  return preferShort ? (shortValue || longValue) : (longValue || shortValue);
}

export function getAddressComponent(components, types, options = {}) {
  const list = Array.isArray(components) ? components : [];
  const expectedTypes = Array.isArray(types) ? types : [types];

  for (const type of expectedTypes) {
    const component = list.find((item) => Array.isArray(item?.types) && item.types.includes(type));
    if (component) {
      return readComponentValue(component, options.preferShort === true);
    }
  }

  return '';
}

export function extractAddressDataFromComponents({ components, formattedAddress = '' }) {
  const street =
    getAddressComponent(components, ['route', 'street_address']) ||
    getAddressComponent(components, ['premise', 'point_of_interest']);
  const number = getAddressComponent(components, 'street_number');
  const neighborhood = getAddressComponent(components, [
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'administrative_area_level_4',
    'administrative_area_level_3',
  ]);
  const city = getAddressComponent(components, [
    'locality',
    'administrative_area_level_2',
    'postal_town',
    'administrative_area_level_3',
  ]);
  const state = getAddressComponent(components, 'administrative_area_level_1', { preferShort: true });
  const cep = getAddressComponent(components, 'postal_code');
  const complement = getAddressComponent(components, ['subpremise', 'premise']);
  const fullAddress =
    formattedAddress ||
    [street, number, neighborhood, city, state].filter(Boolean).join(', ');

  return {
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    cep: formatCEP(cep),
    fullAddress,
  };
}

export function extractAddressData(source) {
  return extractAddressDataFromComponents({
    components: source?.addressComponents ?? source?.address_components ?? [],
    formattedAddress:
      source?.formattedAddress ??
      source?.formatted_address ??
      source?.display_name ??
      source?.fullAddress ??
      '',
  });
}

export function extractAddressDataFromNominatim(source) {
  const address = source?.address || {};

  return {
    street: address.road || address.pedestrian || address.footway || address.path || '',
    number: address.house_number || '',
    complement: '',
    neighborhood:
      address.suburb ||
      address.neighbourhood ||
      address.city_district ||
      address.quarter ||
      '',
    city:
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county ||
      '',
    state: address.state_code || address.state || '',
    cep: formatCEP(address.postcode || ''),
    fullAddress: source?.display_name || '',
  };
}

export function formatCEP(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
