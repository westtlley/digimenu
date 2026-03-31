import { calculateDistance, calculateDeliveryFeeByDistance } from './distanceUtils.js';

const VALID_PRICING_MODES = new Set(['zone', 'distance', 'hybrid']);
const VALID_CHECKOUT_ADDRESS_MODES = new Set(['text_only', 'map_optional', 'map_required']);
const VALID_OUTSIDE_AREA_BEHAVIORS = new Set(['block', 'fallback_store_fee', 'allow_manual_review']);
const VALID_HYBRID_STRATEGIES = new Set([
  'zone_only',
  'zone_then_distance',
  'zone_then_block',
  'zone_then_store_fee',
]);

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

  return pricingMode === 'distance' ? 'fallback_store_fee' : 'block';
}

export function resolveDeliveryHybridStrategy(store = null) {
  const rawStrategy = String(store?.delivery_hybrid_strategy || '')
    .trim()
    .toLowerCase();

  return VALID_HYBRID_STRATEGIES.has(rawStrategy) ? rawStrategy : 'zone_then_distance';
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
  const hybridStrategy = resolveDeliveryHybridStrategy(store);
  const matchedZone = findMatchingDeliveryZone(deliveryZones, neighborhood);
  const storeDefaultFee = roundMoney(toNumber(store?.delivery_fee, 0));
  const storeMinimumOrder = getStoreMinimumOrder(store);
  const zoneMinimumOrder = getZoneMinimumOrder(matchedZone);
  const zoneResolvedMinimumOrder = Math.max(storeMinimumOrder, zoneMinimumOrder);
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
  const canCalculateDistance = hasCustomerCoordinates && hasStoreCoordinates;
  const hasZoneInput = hasNeighborhood;
  const pendingZoneReason = hasZoneInput ? 'no_active_zone' : 'missing_neighborhood';
  const distanceFailureReason = !hasCustomerCoordinates
    ? 'missing_customer_coordinates'
    : !hasStoreCoordinates
      ? 'missing_store_coordinates'
      : null;

  const buildDecisionPath = (...steps) => steps.filter(Boolean);

  const buildResult = (overrides = {}) => ({
    deliveryMethod,
    pricingModeConfigured,
    checkoutAddressMode,
    outsideAreaBehavior,
    hybridStrategy: pricingModeConfigured === 'hybrid' ? hybridStrategy : null,
    matchedZone,
    matchedZoneId: matchedZone?.id ? String(matchedZone.id) : null,
    matchedZoneName: getDeliveryZoneDisplayName(matchedZone) || null,
    deliveryFeeModeApplied: deliveryMethod === 'delivery' ? pricingModeConfigured : 'pickup',
    deliveryFee: 0,
    deliveryFeeApplied: 0,
    distanceKm: null,
    minimumOrderValue: storeMinimumOrder,
    hasCustomerCoordinates,
    hasStoreCoordinates,
    requiresCoordinates,
    missingRequiredCoordinates: requiresCoordinates && !hasCustomerCoordinates,
    blocked: false,
    blockReason: null,
    message: null,
    deliveryRuleSource: deliveryMethod === 'delivery' ? 'pending' : 'pickup',
    zoneAttempted: false,
    zoneMatched: false,
    zoneFailureReason: null,
    distanceAttempted: false,
    distanceCalculated: false,
    distanceFailureReason: null,
    fallbackAttempted: false,
    fallbackReason: null,
    decisionPath: [],
    decisionSummary: deliveryMethod === 'delivery'
      ? 'Aguardando dados para calcular a entrega.'
      : 'Retirada sem taxa de entrega.',
    ...overrides,
  });

  const baseResult = buildResult();

  if (deliveryMethod !== 'delivery') {
    return baseResult;
  }

  const applyDistance = ({ deliveryFeeModeApplied, deliveryRuleSource, decisionPath, decisionSummary }) => {
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

    return buildResult({
      deliveryFeeModeApplied,
      deliveryFee,
      deliveryFeeApplied: deliveryFee,
      distanceKm: Number(distanceKm.toFixed(3)),
      deliveryRuleSource,
      distanceAttempted: true,
      distanceCalculated: true,
      decisionPath,
      decisionSummary,
      zoneAttempted: pricingModeConfigured === 'hybrid',
      zoneMatched: pricingModeConfigured === 'hybrid' ? false : Boolean(matchedZone),
      zoneFailureReason: pricingModeConfigured === 'hybrid' ? pendingZoneReason : null,
    });
  };

  const applyZone = ({ deliveryFeeModeApplied, deliveryRuleSource, decisionPath, decisionSummary }) => {
    const deliveryFee = roundMoney(toNumber(matchedZone?.fee, 0));

    return buildResult({
      deliveryFeeModeApplied,
      deliveryFee,
      deliveryFeeApplied: deliveryFee,
      deliveryRuleSource,
      minimumOrderValue: zoneResolvedMinimumOrder,
      zoneAttempted: true,
      zoneMatched: true,
      decisionPath,
      decisionSummary,
    });
  };

  const applyFallback = ({
    behavior,
    deliveryRuleSource,
    message,
    blockReason = null,
    decisionPath,
    decisionSummary,
    zoneAttempted = pricingModeConfigured === 'zone' || pricingModeConfigured === 'hybrid',
    zoneFailureReason = zoneAttempted && !matchedZone ? pendingZoneReason : null,
    distanceAttempted = pricingModeConfigured === 'distance' || pricingModeConfigured === 'hybrid',
    distanceFailure = distanceAttempted ? distanceFailureReason : null,
  }) => {
    if (behavior === 'block') {
      return buildResult({
        blocked: true,
        blockReason: blockReason || 'outside_area',
        message,
        deliveryFeeModeApplied: 'fallback',
        deliveryRuleSource,
        zoneAttempted,
        zoneMatched: false,
        zoneFailureReason,
        distanceAttempted,
        distanceFailureReason: distanceFailure,
        fallbackAttempted: true,
        fallbackReason: 'block',
        decisionPath,
        decisionSummary,
      });
    }

    if (behavior === 'allow_manual_review') {
      return buildResult({
        deliveryFee: storeDefaultFee,
        deliveryFeeApplied: storeDefaultFee,
        deliveryFeeModeApplied: 'fallback',
        deliveryRuleSource,
        message,
        zoneAttempted,
        zoneMatched: false,
        zoneFailureReason,
        distanceAttempted,
        distanceFailureReason: distanceFailure,
        fallbackAttempted: true,
        fallbackReason: 'manual_review',
        decisionPath,
        decisionSummary,
      });
    }

    return buildResult({
      deliveryFee: storeDefaultFee,
      deliveryFeeApplied: storeDefaultFee,
      deliveryFeeModeApplied: 'fallback',
      deliveryRuleSource,
      message,
      zoneAttempted,
      zoneMatched: false,
      zoneFailureReason,
      distanceAttempted,
      distanceFailureReason: distanceFailure,
      fallbackAttempted: true,
      fallbackReason: 'fallback_store_fee',
      decisionPath,
      decisionSummary,
    });
  };

  if (!hasNeighborhood) {
    if (pricingModeConfigured === 'distance' && canCalculateDistance) {
      return applyDistance({
        deliveryFeeModeApplied: 'distance',
        deliveryRuleSource: 'distance',
        decisionPath: buildDecisionPath('distance:calculated'),
        decisionSummary: 'Frete calculado pela distancia.',
      });
    }

    if (pricingModeConfigured === 'hybrid' && hybridStrategy === 'zone_then_distance' && canCalculateDistance) {
      return applyDistance({
        deliveryFeeModeApplied: 'hybrid_distance',
        deliveryRuleSource: 'hybrid_distance',
        decisionPath: buildDecisionPath('zone:missing_neighborhood', 'distance:calculated'),
        decisionSummary: 'Frete calculado pela distancia apos falta de bairro no modo hibrido.',
      });
    }

    if (pricingModeConfigured === 'distance') {
      return applyFallback({
        behavior: 'fallback_store_fee',
        deliveryRuleSource: 'distance_fallback_store_fee',
        message: 'Aguardando coordenadas para calcular por distancia. Aplicando a taxa padrao da loja.',
        decisionPath: buildDecisionPath('distance:missing_coordinates', 'fallback:store_fee'),
        decisionSummary: 'Modo distancia sem coordenadas. Aplicando taxa padrao da loja.',
        zoneAttempted: false,
        distanceAttempted: true,
      });
    }

    return buildResult({
      deliveryFee: storeDefaultFee,
      deliveryFeeApplied: storeDefaultFee,
      deliveryFeeModeApplied: pricingModeConfigured === 'hybrid' ? 'hybrid' : 'zone',
      deliveryRuleSource: pricingModeConfigured === 'hybrid' ? 'pending_hybrid_resolution' : 'pending_zone_match',
      zoneAttempted: pricingModeConfigured === 'zone' || pricingModeConfigured === 'hybrid',
      zoneMatched: false,
      zoneFailureReason: 'missing_neighborhood',
      distanceAttempted: pricingModeConfigured === 'hybrid',
      distanceFailureReason: pricingModeConfigured === 'hybrid' ? distanceFailureReason : null,
      decisionPath: pricingModeConfigured === 'hybrid'
        ? buildDecisionPath('zone:missing_neighborhood', 'distance:missing_coordinates')
        : buildDecisionPath('zone:missing_neighborhood'),
      decisionSummary: pricingModeConfigured === 'hybrid'
        ? 'Aguardando bairro ou coordenadas para o modo hibrido.'
        : 'Aguardando bairro para resolver a taxa por zona.',
    });
  }

  if (pricingModeConfigured === 'zone') {
    if (matchedZone) {
      return applyZone({
        deliveryFeeModeApplied: 'zone',
        deliveryRuleSource: 'zone',
        decisionPath: buildDecisionPath('zone:matched'),
        decisionSummary: 'Frete calculado pelo bairro.',
      });
    }

    if (outsideAreaBehavior === 'block') {
      return applyFallback({
        behavior: 'block',
        deliveryRuleSource: 'outside_area_blocked',
        message: 'Ainda nao entregamos nesse bairro.',
        blockReason: 'outside_area',
        decisionPath: buildDecisionPath('zone:no_active_zone', 'fallback:block'),
        decisionSummary: 'Bairro fora das zonas ativas. Pedido bloqueado.',
      });
    }

    if (outsideAreaBehavior === 'allow_manual_review') {
      return applyFallback({
        behavior: 'allow_manual_review',
        deliveryRuleSource: 'manual_review',
        message: 'Entrega neste bairro precisa de revisao manual.',
        decisionPath: buildDecisionPath('zone:no_active_zone', 'fallback:manual_review'),
        decisionSummary: 'Bairro fora das zonas ativas. Entrega marcada para revisao manual.',
      });
    }

    return applyFallback({
      behavior: 'fallback_store_fee',
      deliveryRuleSource: 'fallback_store_fee',
      message: 'Bairro fora das zonas ativas. Aplicando a taxa padrao da loja.',
      decisionPath: buildDecisionPath('zone:no_active_zone', 'fallback:store_fee'),
      decisionSummary: 'Bairro fora das zonas ativas. Aplicando a taxa padrao da loja.',
    });
  }

  if (pricingModeConfigured === 'hybrid') {
    if (matchedZone) {
      return applyZone({
        deliveryFeeModeApplied: 'hybrid_zone',
        deliveryRuleSource: 'hybrid_zone',
        decisionPath: buildDecisionPath('zone:matched'),
        decisionSummary: 'Modo hibrido resolveu o frete pelo bairro.',
      });
    }

    if (hybridStrategy === 'zone_then_distance' && canCalculateDistance) {
      return applyDistance({
        deliveryFeeModeApplied: 'hybrid_distance',
        deliveryRuleSource: 'hybrid_distance',
        decisionPath: buildDecisionPath('zone:no_active_zone', 'distance:calculated'),
        decisionSummary: 'Modo hibrido resolveu o frete pela distancia apos falha da zona.',
      });
    }

    const hybridFallbackBehavior =
      hybridStrategy === 'zone_then_block'
        ? 'block'
        : hybridStrategy === 'zone_then_store_fee'
          ? 'fallback_store_fee'
          : outsideAreaBehavior;

    const hybridFallbackPath = buildDecisionPath(
      'zone:no_active_zone',
      hybridStrategy === 'zone_then_distance'
        ? (distanceFailureReason ? `distance:${distanceFailureReason}` : 'distance:unavailable')
        : `strategy:${hybridStrategy}`,
      hybridFallbackBehavior === 'block'
        ? 'fallback:block'
        : hybridFallbackBehavior === 'allow_manual_review'
          ? 'fallback:manual_review'
          : 'fallback:store_fee'
    );

    if (hybridFallbackBehavior === 'block') {
      return applyFallback({
        behavior: 'block',
        deliveryRuleSource: 'hybrid_outside_area_blocked',
        message: 'Nao foi possivel resolver a entrega por bairro ou distancia.',
        blockReason: 'hybrid_unresolved',
        decisionPath: hybridFallbackPath,
        decisionSummary: 'Modo hibrido nao encontrou zona nem distancia valida. Pedido bloqueado.',
      });
    }

    if (hybridFallbackBehavior === 'allow_manual_review') {
      return applyFallback({
        behavior: 'allow_manual_review',
        deliveryRuleSource: 'hybrid_manual_review',
        message: 'Entrega precisa de revisao manual apos falha de zona e distancia.',
        decisionPath: hybridFallbackPath,
        decisionSummary: 'Modo hibrido caiu para revisao manual.',
      });
    }

    return applyFallback({
      behavior: 'fallback_store_fee',
      deliveryRuleSource: 'hybrid_fallback_store_fee',
      message: 'Modo hibrido sem zona nem distancia valida. Aplicando a taxa padrao da loja.',
      decisionPath: hybridFallbackPath,
      decisionSummary: 'Modo hibrido aplicou a taxa padrao da loja como fallback.',
    });
  }

  if (canCalculateDistance) {
    return applyDistance({
      deliveryFeeModeApplied: 'distance',
      deliveryRuleSource: 'distance',
      decisionPath: buildDecisionPath('distance:calculated'),
      decisionSummary: 'Frete calculado pela distancia.',
    });
  }

  if (matchedZone) {
    return applyZone({
      deliveryFeeModeApplied: 'zone',
      deliveryRuleSource: 'distance_fallback_zone',
      decisionPath: buildDecisionPath('distance:missing_coordinates', 'zone:matched'),
      decisionSummary: 'Modo distancia sem coordenadas validas. Aplicando a zona como fallback.',
    });
  }

  return applyFallback({
    behavior: 'fallback_store_fee',
    deliveryRuleSource: 'distance_fallback_store_fee',
    message: 'Modo distancia sem coordenadas validas. Aplicando a taxa padrao da loja.',
    decisionPath: buildDecisionPath('distance:missing_coordinates', 'fallback:store_fee'),
    decisionSummary: 'Modo distancia sem coordenadas validas. Aplicando a taxa padrao da loja.',
    zoneAttempted: false,
    distanceAttempted: true,
  });
}
