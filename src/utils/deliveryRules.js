import { calculateDistance, calculateDeliveryFeeByDistance } from './distanceUtils.js';

const VALID_PRICING_MODES = new Set(['zone', 'distance']);
const VALID_CHECKOUT_ADDRESS_MODES = new Set(['text_only', 'map_optional', 'map_required']);
const VALID_OUTSIDE_AREA_BEHAVIORS = new Set(['block', 'fallback_store_fee', 'allow_manual_review']);

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  return toNumber(value, null);
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

export function normalizeNeighborhood(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/.,;:()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolveDeliveryPricingMode(store = null) {
  const rawMode = String(store?.delivery_pricing_mode || store?.delivery_fee_mode || '')
    .trim()
    .toLowerCase();

  return VALID_PRICING_MODES.has(rawMode) ? rawMode : 'zone';
}

export function resolveCheckoutAddressMode(store = null) {
  const pricingMode = resolveDeliveryPricingMode(store);
  if (pricingMode === 'distance') {
    return 'map_required';
  }

  const rawMode = String(store?.checkout_address_mode || '')
    .trim()
    .toLowerCase();

  return VALID_CHECKOUT_ADDRESS_MODES.has(rawMode) ? rawMode : 'map_optional';
}

export function resolveOutsideAreaBehavior(store = null) {
  const pricingMode = resolveDeliveryPricingMode(store);
  const rawBehavior = String(store?.delivery_outside_area_behavior || '')
    .trim()
    .toLowerCase();

  if (VALID_OUTSIDE_AREA_BEHAVIORS.has(rawBehavior)) {
    return rawBehavior;
  }

  return pricingMode === 'zone' ? 'block' : 'fallback_store_fee';
}

export function getDeliveryZoneNeighborhood(zone = null) {
  return String(zone?.neighborhood || zone?.name || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDeliveryZoneDisplayName(zone = null) {
  return getDeliveryZoneNeighborhood(zone);
}

export function normalizeDeliveryZone(zone = null) {
  if (!zone || typeof zone !== 'object') return null;

  const neighborhood = getDeliveryZoneNeighborhood(zone);
  const minOrderRaw =
    zone?.min_order ??
    zone?.min_order_value ??
    null;
  const minOrder =
    minOrderRaw === null || minOrderRaw === undefined || minOrderRaw === ''
      ? null
      : roundMoney(toNumber(minOrderRaw, 0));

  return {
    ...zone,
    neighborhood,
    name: String(zone?.name || neighborhood || '').trim(),
    fee: roundMoney(toNumber(zone?.fee, 0)),
    min_order: minOrder,
    min_order_value: minOrder,
    is_active: zone?.is_active !== false,
  };
}

export function normalizeDeliveryZones(zones = []) {
  if (!Array.isArray(zones)) return [];
  return zones
    .map((zone) => normalizeDeliveryZone(zone))
    .filter(Boolean);
}

export function findMatchingDeliveryZone(zones = [], neighborhood = '') {
  const normalizedNeighborhood = normalizeNeighborhood(neighborhood);
  if (!normalizedNeighborhood) return null;

  return normalizeDeliveryZones(zones).find((zone) => (
    zone?.is_active !== false &&
    normalizeNeighborhood(getDeliveryZoneNeighborhood(zone)) === normalizedNeighborhood
  )) || null;
}

export function getStoreMinimumOrder(store = null) {
  return roundMoney(toNumber(
    store?.min_order_value ??
      store?.min_order ??
      store?.min_order_price ??
      store?.delivery_min_order ??
      0,
    0
  ));
}

export function getZoneMinimumOrder(zone = null) {
  return roundMoney(toNumber(zone?.min_order ?? zone?.min_order_value ?? 0, 0));
}

export function calculateDeliveryContext({
  deliveryMethod = 'pickup',
  neighborhood = '',
  deliveryZones = [],
  store = null,
  customerLat = null,
  customerLng = null,
} = {}) {
  const pricingModeConfigured = resolveDeliveryPricingMode(store);
  const checkoutAddressMode = resolveCheckoutAddressMode(store);
  const outsideAreaBehavior = resolveOutsideAreaBehavior(store);
  const matchedZone = findMatchingDeliveryZone(deliveryZones, neighborhood);
  const storeDefaultFee = roundMoney(toNumber(store?.delivery_fee, 0));
  const storeMinimumOrder = getStoreMinimumOrder(store);
  const zoneMinimumOrder = getZoneMinimumOrder(matchedZone);
  const minimumOrderValue = Math.max(storeMinimumOrder, zoneMinimumOrder);
  const hasNeighborhood = normalizeNeighborhood(neighborhood).length > 0;
  const customerLatitude = toNullableNumber(customerLat);
  const customerLongitude = toNullableNumber(customerLng);
  const storeLatitude = toNullableNumber(store?.latitude);
  const storeLongitude = toNullableNumber(store?.longitude);
  const hasCustomerCoordinates =
    Number.isFinite(customerLatitude) &&
    Number.isFinite(customerLongitude);
  const hasStoreCoordinates =
    Number.isFinite(storeLatitude) &&
    Number.isFinite(storeLongitude);
  const requiresCoordinates =
    deliveryMethod === 'delivery' &&
    checkoutAddressMode === 'map_required';

  const result = {
    deliveryMethod,
    pricingModeConfigured,
    deliveryFeeModeApplied: deliveryMethod === 'delivery' ? pricingModeConfigured : 'pickup',
    checkoutAddressMode,
    outsideAreaBehavior,
    matchedZone,
    matchedZoneId: matchedZone?.id ? String(matchedZone.id) : null,
    matchedZoneName: getDeliveryZoneDisplayName(matchedZone) || null,
    deliveryFee: 0,
    deliveryFeeApplied: 0,
    distanceKm: null,
    minimumOrderValue,
    hasCustomerCoordinates,
    hasStoreCoordinates,
    requiresCoordinates,
    missingRequiredCoordinates: requiresCoordinates && !hasCustomerCoordinates,
    blocked: false,
    blockReason: null,
    message: null,
    deliveryRuleSource: deliveryMethod === 'delivery' ? 'pending' : 'pickup',
  };

  if (deliveryMethod !== 'delivery') {
    return result;
  }

  if (
    pricingModeConfigured === 'distance' &&
    hasCustomerCoordinates &&
    hasStoreCoordinates
  ) {
    const distanceKm = calculateDistance(
      storeLatitude,
      storeLongitude,
      customerLatitude,
      customerLongitude
    );

    const deliveryFee = roundMoney(calculateDeliveryFeeByDistance(distanceKm, {
      baseFee: toNumber(store?.delivery_base_fee, 0),
      pricePerKm: toNumber(store?.delivery_price_per_km, 0),
      minFee: toNumber(store?.delivery_min_fee, 0),
      maxFee: store?.delivery_max_fee == null ? null : toNumber(store.delivery_max_fee, null),
      freeDeliveryDistance: store?.delivery_free_distance == null ? null : toNumber(store.delivery_free_distance, null),
    }));

    return {
      ...result,
      deliveryFeeModeApplied: 'distance',
      deliveryFee: deliveryFee,
      deliveryFeeApplied: deliveryFee,
      distanceKm: Number(distanceKm.toFixed(3)),
      deliveryRuleSource: 'distance',
    };
  }

  if (matchedZone) {
    const deliveryFee = roundMoney(toNumber(matchedZone?.fee, 0));

    return {
      ...result,
      deliveryFeeModeApplied: 'zone',
      deliveryFee: deliveryFee,
      deliveryFeeApplied: deliveryFee,
      deliveryRuleSource: pricingModeConfigured === 'distance' ? 'distance_fallback_zone' : 'zone',
    };
  }

  if (!hasNeighborhood) {
    return {
      ...result,
      deliveryFee: storeDefaultFee,
      deliveryFeeApplied: storeDefaultFee,
      deliveryRuleSource: pricingModeConfigured === 'distance' ? 'distance_fallback_store_fee' : 'pending_zone_match',
      deliveryFeeModeApplied: pricingModeConfigured === 'distance' ? 'fallback' : 'zone',
    };
  }

  if (pricingModeConfigured === 'zone') {
    if (outsideAreaBehavior === 'block') {
      return {
        ...result,
        blocked: true,
        blockReason: 'outside_area',
        message: 'Ainda nao entregamos nesse bairro.',
        deliveryRuleSource: 'outside_area_blocked',
      };
    }

    if (outsideAreaBehavior === 'allow_manual_review') {
      return {
        ...result,
        deliveryFee: storeDefaultFee,
        deliveryFeeApplied: storeDefaultFee,
        deliveryFeeModeApplied: 'fallback',
        deliveryRuleSource: 'manual_review',
        message: 'Entrega neste bairro precisa de revisao manual.',
      };
    }

    return {
      ...result,
      deliveryFee: storeDefaultFee,
      deliveryFeeApplied: storeDefaultFee,
      deliveryFeeModeApplied: 'fallback',
      deliveryRuleSource: 'fallback_store_fee',
      message: 'Bairro fora das zonas ativas. Aplicando a taxa padrao da loja.',
    };
  }

  return {
    ...result,
    deliveryFee: storeDefaultFee,
    deliveryFeeApplied: storeDefaultFee,
    deliveryFeeModeApplied: 'fallback',
    deliveryRuleSource: 'distance_fallback_store_fee',
  };
}
