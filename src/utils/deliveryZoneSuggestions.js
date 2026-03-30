import {
  SAO_LUIS_MA_CENTER,
  extractAddressDataFromNominatim,
  toFiniteNumber,
} from './addressSearch.js';
import { buildDeliveryZonePayload, findEquivalentDeliveryZones } from './deliveryZoneAdmin.js';
import { calculateDistance } from './distanceUtils.js';
import { normalizeNeighborhood } from './deliveryRules.js';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const DEFAULT_RADIUS_KM = 6;
const DEFAULT_MAX_SUGGESTIONS = 24;

function toRoundedDistance(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toStringValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeFreeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildNominatimHeaders() {
  return {
    Accept: 'application/json',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  };
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: buildNominatimHeaders(),
  });

  if (!response?.ok) {
    throw new Error(`Falha ao consultar fonte publica (${response?.status || 'n/a'}).`);
  }

  return response.json();
}

function getStoreContextText(store = null) {
  return normalizeFreeText([
    store?.name,
    store?.address,
    store?.city,
    store?.state,
  ].filter(Boolean).join(' '));
}

function hasSaoLuisContext(store = null) {
  const context = getStoreContextText(store);
  return (
    context.includes('sao luis') ||
    context.includes('sao luis ma') ||
    context.includes('maranhao')
  );
}

function movePoint(center, distanceKm, bearingDegrees) {
  const lat = Number(center?.lat);
  const lng = Number(center?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const radians = (bearingDegrees * Math.PI) / 180;
  const latDelta = (distanceKm / 111) * Math.cos(radians);
  const cosine = Math.cos((lat * Math.PI) / 180);
  const safeCosine = Math.abs(cosine) < 0.01 ? 0.01 : Math.abs(cosine);
  const lngDelta = (distanceKm / (111 * safeCosine)) * Math.sin(radians);

  return {
    lat: lat + latDelta,
    lng: lng + lngDelta,
  };
}

export function buildNeighborhoodSamplingPoints(center, radiusKm = DEFAULT_RADIUS_KM) {
  const normalizedRadius = Math.max(1.5, Number(radiusKm) || DEFAULT_RADIUS_KM);
  const innerRadius = Math.max(0.8, Math.min(normalizedRadius * 0.45, normalizedRadius));
  const middleRadius = Math.max(innerRadius, Math.min(normalizedRadius * 0.72, normalizedRadius));
  const points = [
    { lat: center.lat, lng: center.lng, sampleDistanceKm: 0, ring: 'center' },
  ];

  [0, 90, 180, 270].forEach((bearing) => {
    const point = movePoint(center, innerRadius, bearing);
    if (!point) return;
    points.push({ ...point, sampleDistanceKm: innerRadius, ring: 'inner' });
  });

  [45, 135, 225, 315].forEach((bearing) => {
    const point = movePoint(center, middleRadius, bearing);
    if (!point) return;
    points.push({ ...point, sampleDistanceKm: middleRadius, ring: 'middle' });
  });

  [0, 90, 180, 270].forEach((bearing) => {
    const point = movePoint(center, normalizedRadius, bearing);
    if (!point) return;
    points.push({ ...point, sampleDistanceKm: normalizedRadius, ring: 'outer' });
  });

  return points;
}

function buildSearchUrl(query) {
  return (
    `${NOMINATIM_BASE_URL}/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=br` +
    `&q=${encodeURIComponent(query)}`
  );
}

function buildReverseUrl(point) {
  return (
    `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&addressdetails=1&zoom=16` +
    `&lat=${encodeURIComponent(point.lat)}` +
    `&lon=${encodeURIComponent(point.lng)}`
  );
}

function buildOriginFromCoordinates(store = null) {
  const latitude = toFiniteNumber(store?.latitude);
  const longitude = toFiniteNumber(store?.longitude);

  if (latitude == null || longitude == null) return null;

  return {
    ready: true,
    center: { lat: latitude, lng: longitude },
    source: 'store_coordinates',
    label: 'Coordenadas da loja',
    confidence: 'high',
    city: '',
    state: '',
  };
}

function buildFallbackOrigin(store = null) {
  if (!hasSaoLuisContext(store)) return null;

  return {
    ready: true,
    center: { ...SAO_LUIS_MA_CENTER },
    source: 'demo_context_fallback',
    label: 'Contexto local Sao Luis/MA',
    confidence: 'low',
    city: 'Sao Luis',
    state: 'MA',
  };
}

export async function resolveStoreSuggestionOrigin({ store = null, fetchImpl = fetch } = {}) {
  const coordinatesOrigin = buildOriginFromCoordinates(store);
  if (coordinatesOrigin) return coordinatesOrigin;

  const storeAddress = toStringValue(store?.address);
  if (storeAddress) {
    try {
      const searchResults = await fetchJson(fetchImpl, buildSearchUrl(`${storeAddress}, Brasil`));
      const firstResult = Array.isArray(searchResults) ? searchResults[0] : null;
      const latitude = toFiniteNumber(firstResult?.lat);
      const longitude = toFiniteNumber(firstResult?.lon);

      if (latitude != null && longitude != null) {
        const addressData = extractAddressDataFromNominatim(firstResult);
        return {
          ready: true,
          center: { lat: latitude, lng: longitude },
          source: 'store_address_geocode',
          label: 'Endereco da loja geocodificado',
          confidence: 'medium',
          city: addressData.city || '',
          state: addressData.state || '',
          fullAddress: addressData.fullAddress || storeAddress,
        };
      }
    } catch (error) {
      const fallbackOrigin = buildFallbackOrigin(store);
      if (fallbackOrigin) {
        return {
          ...fallbackOrigin,
          warning: error?.message || 'Falha ao geocodificar o endereco da loja.',
        };
      }

      return {
        ready: false,
        reason: 'origin_lookup_failed',
        message: 'Nao foi possivel localizar a loja para sugerir bairros agora.',
        error: error?.message || null,
      };
    }
  }

  const fallbackOrigin = buildFallbackOrigin(store);
  if (fallbackOrigin) return fallbackOrigin;

  return {
    ready: false,
    reason: 'missing_store_origin',
    message: 'Cadastre endereco ou coordenadas da loja antes de buscar bairros da regiao.',
  };
}

function buildCandidateFromReverseResult(result, origin) {
  const latitude = toFiniteNumber(result?.lat);
  const longitude = toFiniteNumber(result?.lon);
  if (latitude == null || longitude == null) return null;

  const addressData = extractAddressDataFromNominatim(result);
  const neighborhood = toStringValue(addressData.neighborhood);
  const normalizedNeighborhood = normalizeNeighborhood(neighborhood);

  if (!normalizedNeighborhood) return null;

  const distanceKm = calculateDistance(
    origin.center.lat,
    origin.center.lng,
    latitude,
    longitude
  );

  return {
    id: normalizedNeighborhood,
    neighborhood,
    normalizedNeighborhood,
    city: toStringValue(addressData.city || origin.city || ''),
    state: toStringValue(addressData.state || origin.state || ''),
    latitude,
    longitude,
    distanceKm: toRoundedDistance(distanceKm),
    suggestionSource: 'nominatim_reverse_sample',
    suggestionOrigin: origin.source,
    suggestionOriginLabel: origin.label,
    displayLabel: [neighborhood, [addressData.city || origin.city, addressData.state || origin.state].filter(Boolean).join('/')]
      .filter(Boolean)
      .join(' - '),
  };
}

function sortCandidates(left, right) {
  const leftDistance = Number.isFinite(left?.distanceKm) ? left.distanceKm : Number.MAX_SAFE_INTEGER;
  const rightDistance = Number.isFinite(right?.distanceKm) ? right.distanceKm : Number.MAX_SAFE_INTEGER;

  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }

  return String(left?.neighborhood || '').localeCompare(String(right?.neighborhood || ''), 'pt-BR');
}

function buildTokenSet(value) {
  return new Set(
    normalizeNeighborhood(value)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  );
}

function areProbablyEquivalentNeighborhoods(left, right) {
  const normalizedLeft = normalizeNeighborhood(left);
  const normalizedRight = normalizeNeighborhood(right);

  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return false;
  }

  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return Math.min(normalizedLeft.length, normalizedRight.length) >= 5;
  }

  const leftTokens = buildTokenSet(normalizedLeft);
  const rightTokens = buildTokenSet(normalizedRight);
  const smallerTokenCount = Math.min(leftTokens.size, rightTokens.size);
  if (smallerTokenCount < 2) return false;

  let overlapCount = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlapCount += 1;
  });

  return overlapCount / smallerTokenCount >= 0.75;
}

export function findProbableDuplicateZones(zones = [], neighborhood = '', options = {}) {
  const ignoredId = options.ignoreId == null ? null : String(options.ignoreId);
  if (!normalizeNeighborhood(neighborhood)) return [];

  return (Array.isArray(zones) ? zones : [])
    .filter((zone) => !ignoredId || String(zone?.id || '') !== ignoredId)
    .filter((zone) => areProbablyEquivalentNeighborhoods(zone?.neighborhood || zone?.name || '', neighborhood));
}

export function classifyNeighborhoodSuggestions(candidates = [], existingZones = []) {
  const classified = (Array.isArray(candidates) ? candidates : []).map((candidate) => {
    const exactMatches = findEquivalentDeliveryZones(existingZones, candidate.neighborhood);
    const probableMatches =
      exactMatches.length === 0
        ? findProbableDuplicateZones(existingZones, candidate.neighborhood)
        : [];

    let status = 'new';
    let statusReason = 'Sugestao nova pronta para criacao em lote.';

    if (exactMatches.length > 0) {
      status = 'already_registered';
      statusReason = 'Ja existe uma zona equivalente cadastrada para esse bairro.';
    } else if (probableMatches.length > 0) {
      status = 'probable_duplicate';
      statusReason = 'Existe uma cobertura muito parecida. Revise antes de criar.';
    }

    return {
      ...candidate,
      status,
      statusReason,
      exactMatches,
      probableMatches,
      selectable: status === 'new',
    };
  });

  return classified.sort((left, right) => {
    const statusWeight = {
      new: 0,
      probable_duplicate: 1,
      already_registered: 2,
    };
    const byStatus = (statusWeight[left.status] ?? 99) - (statusWeight[right.status] ?? 99);
    if (byStatus !== 0) return byStatus;
    return sortCandidates(left, right);
  });
}

export function summarizeNeighborhoodSuggestions(suggestions = []) {
  const summary = {
    total: 0,
    selectable: 0,
    new: 0,
    already_registered: 0,
    probable_duplicate: 0,
  };

  (Array.isArray(suggestions) ? suggestions : []).forEach((suggestion) => {
    summary.total += 1;
    if (suggestion?.selectable) summary.selectable += 1;

    if (suggestion?.status && Object.prototype.hasOwnProperty.call(summary, suggestion.status)) {
      summary[suggestion.status] += 1;
    }
  });

  return summary;
}

export async function fetchNeighborhoodSuggestionCandidates({
  store = null,
  fetchImpl = fetch,
  radiusKm = DEFAULT_RADIUS_KM,
  maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
} = {}) {
  const origin = await resolveStoreSuggestionOrigin({ store, fetchImpl });
  if (!origin?.ready || !origin?.center) {
    return {
      ready: false,
      origin,
      suggestions: [],
      summary: summarizeNeighborhoodSuggestions([]),
    };
  }

  const samplingPoints = buildNeighborhoodSamplingPoints(origin.center, radiusKm);
  const responses = await Promise.allSettled(
    samplingPoints.map((point) => fetchJson(fetchImpl, buildReverseUrl(point)))
  );

  const byNeighborhood = new Map();

  responses.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    const candidate = buildCandidateFromReverseResult(result.value, origin);
    if (!candidate?.normalizedNeighborhood) return;

    const current = byNeighborhood.get(candidate.normalizedNeighborhood);
    if (!current || sortCandidates(candidate, current) < 0) {
      byNeighborhood.set(candidate.normalizedNeighborhood, candidate);
    }
  });

  const suggestions = Array.from(byNeighborhood.values())
    .sort(sortCandidates)
    .slice(0, Math.max(1, Number(maxSuggestions) || DEFAULT_MAX_SUGGESTIONS));

  return {
    ready: true,
    origin,
    suggestions,
    summary: summarizeNeighborhoodSuggestions(suggestions),
    sampledPoints: samplingPoints.length,
    message:
      suggestions.length > 0
        ? null
        : 'Nao encontramos bairros candidatos com confianca ao redor da loja.',
  };
}

export function buildAutoGeneratedZonePayloads({
  suggestions = [],
  selectedIds = [],
  defaults = {},
} = {}) {
  const selectedIdSet = new Set((Array.isArray(selectedIds) ? selectedIds : []).map((id) => String(id)));
  const createdAt = defaults.generatedAt || new Date().toISOString();

  return (Array.isArray(suggestions) ? suggestions : [])
    .filter((suggestion) => selectedIdSet.has(String(suggestion.id)))
    .filter((suggestion) => suggestion?.selectable)
    .map((suggestion) => buildDeliveryZonePayload({
      neighborhood: suggestion.neighborhood,
      fee: defaults.fee,
      min_order: defaults.min_order,
      is_active: defaults.is_active !== false,
      source: 'auto_generated',
      notes: toStringValue(defaults.notes),
      source_metadata: {
        generated_at: createdAt,
        suggestion_source: suggestion.suggestionSource,
        suggestion_origin: suggestion.suggestionOrigin,
        suggestion_origin_label: suggestion.suggestionOriginLabel,
        distance_km: suggestion.distanceKm,
        city: suggestion.city || '',
        state: suggestion.state || '',
      },
    }, {
      defaultSource: 'auto_generated',
    }));
}
