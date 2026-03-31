import {
  calculateDeliveryContext,
  normalizeDeliveryZone,
  normalizeNeighborhood,
} from './deliveryRules.js';

const VALID_ZONE_SOURCES = new Set(['manual', 'bulk', 'auto_generated']);

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function parseBooleanLike(value, fallback = true) {
  if (value === null || value === undefined || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'ativo', 'ativa', 'yes', 'sim'].includes(normalized)) return true;
  if (['0', 'false', 'inativo', 'inativa', 'no', 'nao'].includes(normalized)) return false;
  return fallback;
}

export function normalizeZoneSource(value, fallback = 'manual') {
  const normalized = String(value || fallback || 'manual')
    .trim()
    .toLowerCase();

  return VALID_ZONE_SOURCES.has(normalized) ? normalized : fallback;
}

export function buildDeliveryZonePayload(rawZone = {}, options = {}) {
  const defaultSource = normalizeZoneSource(options.defaultSource, 'manual');
  const {
    lineNumber,
    normalizedNeighborhood,
    conflicts,
    duplicatesWith,
    ...zoneLike
  } = rawZone || {};
  const normalizedZone = normalizeDeliveryZone(zoneLike) || {};
  const minOrderValueRaw = zoneLike?.min_order ?? zoneLike?.min_order_value;
  const minOrderValue = toNullableNumber(minOrderValueRaw);

  return {
    ...zoneLike,
    ...normalizedZone,
    neighborhood: normalizedZone.neighborhood,
    name: normalizedZone.neighborhood || normalizedZone.name || '',
    fee: roundMoney(toNumber(zoneLike?.fee ?? normalizedZone?.fee, 0)),
    min_order: minOrderValue === null ? null : roundMoney(minOrderValue),
    min_order_value: minOrderValue === null ? null : roundMoney(minOrderValue),
    is_active: zoneLike?.is_active !== false,
    source: normalizeZoneSource(zoneLike?.source, defaultSource),
  };
}

export function findEquivalentDeliveryZones(zones = [], neighborhood = '', options = {}) {
  const normalizedTarget = normalizeNeighborhood(neighborhood);
  const ignoredId = options.ignoreId == null ? null : String(options.ignoreId);

  if (!normalizedTarget) return [];

  return (Array.isArray(zones) ? zones : [])
    .map((zone) => buildDeliveryZonePayload(zone, {
      defaultSource: normalizeZoneSource(zone?.source, 'manual'),
    }))
    .filter((zone) => zone && normalizeNeighborhood(zone.neighborhood) === normalizedTarget)
    .filter((zone) => !ignoredId || String(zone.id || '') !== ignoredId);
}

export function findDuplicateZoneGroups(zones = []) {
  const groups = new Map();

  (Array.isArray(zones) ? zones : []).forEach((zone) => {
    const payload = buildDeliveryZonePayload(zone, {
      defaultSource: normalizeZoneSource(zone?.source, 'manual'),
    });
    const normalizedName = normalizeNeighborhood(payload?.neighborhood);
    if (!normalizedName) return;

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, []);
    }
    groups.get(normalizedName).push(payload);
  });

  return Array.from(groups.entries())
    .filter(([, groupZones]) => groupZones.length > 1)
    .map(([normalizedNeighborhood, groupZones]) => ({
      normalizedNeighborhood,
      zones: groupZones,
      labels: groupZones.map((zone) => zone.neighborhood),
    }));
}

export function parseBulkZonesInput(text = '', options = {}) {
  const lines = String(text || '').split(/\r?\n/);
  const defaults = {
    fee: toNumber(options.fee, 0),
    minOrder: toNullableNumber(options.minOrder),
    isActive: options.isActive !== false,
    source: normalizeZoneSource(options.source, 'bulk'),
  };
  const seen = new Map();
  const items = [];
  const duplicatesInInput = [];
  const invalidLines = [];

  lines.forEach((line, index) => {
    const rawLine = String(line || '').trim();
    if (!rawLine) return;

    const parts = rawLine.split(/[;|]/).map((part) => part.trim());
    const neighborhood = parts[0] || '';
    const normalizedName = normalizeNeighborhood(neighborhood);

    if (!normalizedName) {
      invalidLines.push({ lineNumber: index + 1, raw: rawLine });
      return;
    }

    if (seen.has(normalizedName)) {
      duplicatesInInput.push({
        lineNumber: index + 1,
        raw: rawLine,
        duplicatesWith: seen.get(normalizedName),
      });
      return;
    }

    const fee = parts[1] !== undefined && parts[1] !== '' ? toNumber(parts[1], defaults.fee) : defaults.fee;
    const minOrder = parts[2] !== undefined && parts[2] !== '' ? toNullableNumber(parts[2]) : defaults.minOrder;
    const isActive = parts[3] !== undefined ? parseBooleanLike(parts[3], defaults.isActive) : defaults.isActive;
    const item = buildDeliveryZonePayload({
      neighborhood,
      fee,
      min_order: minOrder,
      is_active: isActive,
      source: defaults.source,
    }, {
      defaultSource: defaults.source,
    });

    seen.set(normalizedName, {
      lineNumber: index + 1,
      neighborhood: item.neighborhood,
    });

    items.push({
      ...item,
      lineNumber: index + 1,
      normalizedNeighborhood: normalizedName,
    });
  });

  return {
    items,
    parsedCount: items.length,
    skippedCount: duplicatesInInput.length + invalidLines.length,
    duplicatesInInput,
    invalidLines,
  };
}

export function simulateDeliveryCoverage({
  neighborhood = '',
  subtotal = '',
  deliveryZones = [],
  store = null,
  customerLat = null,
  customerLng = null,
} = {}) {
  const ready = normalizeNeighborhood(neighborhood).length > 0;
  const numericSubtotal = toNullableNumber(subtotal);
  const deliveryContext = calculateDeliveryContext({
    deliveryMethod: 'delivery',
    neighborhood,
    deliveryZones,
    store,
    customerLat,
    customerLng,
  });

  if (!ready) {
    return {
      ...deliveryContext,
      ready: false,
      allowed: false,
      subtotal: numericSubtotal,
      subtotalProvided: numericSubtotal !== null,
      belowMinimumOrder: false,
      minimumOrderMet: true,
      decisionMessage: 'Informe um bairro para simular a cobertura.',
    };
  }

  const subtotalProvided = numericSubtotal !== null;
  const belowMinimumOrder =
    subtotalProvided &&
    Number(deliveryContext.minimumOrderValue || 0) > 0 &&
    numericSubtotal < Number(deliveryContext.minimumOrderValue || 0);

  let decisionMessage = deliveryContext.decisionSummary || 'Entrega permitida com a configuracao atual.';

  if (deliveryContext.blocked) {
    decisionMessage = deliveryContext.message || 'Ainda nao entregamos nesse bairro.';
  } else if (deliveryContext.missingRequiredCoordinates) {
    decisionMessage = 'Informe coordenadas para simular a entrega no modo por distancia.';
  } else if (belowMinimumOrder) {
    decisionMessage = 'Subtotal abaixo do pedido minimo configurado para essa entrega.';
  } else if (['manual_review', 'hybrid_manual_review'].includes(deliveryContext.deliveryRuleSource)) {
    decisionMessage = deliveryContext.message || 'Entrega depende de revisao manual.';
  }

  return {
    ...deliveryContext,
    ready: true,
    allowed: !deliveryContext.blocked && !deliveryContext.missingRequiredCoordinates && !belowMinimumOrder,
    subtotal: numericSubtotal,
    subtotalProvided,
    belowMinimumOrder,
    minimumOrderMet: !belowMinimumOrder,
    decisionMessage,
  };
}
