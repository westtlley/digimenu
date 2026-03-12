export const PRODUCTION_STATUS = {
  NEW: 'new',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  CANCELLED: 'cancelled',
};

export const DELIVERY_STATUS = {
  PENDING: 'pending',
  NOT_REQUIRED: 'not_required',
  WAITING_PICKUP: 'waiting_pickup',
  WAITING_DRIVER: 'waiting_driver',
  GOING_TO_STORE: 'going_to_store',
  ARRIVED_AT_STORE: 'arrived_at_store',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  ARRIVED_AT_CUSTOMER: 'arrived_at_customer',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const LEGACY_DELIVERY_FLOW_STATUSES = new Set([
  DELIVERY_STATUS.GOING_TO_STORE,
  DELIVERY_STATUS.ARRIVED_AT_STORE,
  DELIVERY_STATUS.PICKED_UP,
  DELIVERY_STATUS.OUT_FOR_DELIVERY,
  DELIVERY_STATUS.ARRIVED_AT_CUSTOMER,
  DELIVERY_STATUS.DELIVERED,
]);

const READY_FULFILLMENT_STATUSES = new Set([
  DELIVERY_STATUS.WAITING_DRIVER,
  DELIVERY_STATUS.WAITING_PICKUP,
  DELIVERY_STATUS.NOT_REQUIRED,
  DELIVERY_STATUS.PENDING,
]);

const PRODUCTION_STATUSES = new Set(Object.values(PRODUCTION_STATUS));
const DELIVERY_STATUSES = new Set(Object.values(DELIVERY_STATUS));

export function normalizeLower(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizeLegacyStatus(value) {
  const normalized = normalizeLower(value);
  if (normalized === 'delivering') {
    return DELIVERY_STATUS.OUT_FOR_DELIVERY;
  }
  return normalized || null;
}

function normalizeProductionStatus(value) {
  const normalized = normalizeLower(value);
  return PRODUCTION_STATUSES.has(normalized) ? normalized : null;
}

function normalizeDeliveryStatus(value) {
  const normalized = normalizeLower(value);
  return DELIVERY_STATUSES.has(normalized) ? normalized : null;
}

export function resolveOrderDeliveryMethod(order = {}) {
  return normalizeLower(
    order?.delivery_method ||
    order?.delivery_type ||
    order?.serving_type
  );
}

function isDeliveryMethod(method) {
  return method === 'delivery';
}

function isPickupMethod(method) {
  return method === 'pickup' || method === 'balcao';
}

function resolveReadyDeliveryStatus(deliveryMethod) {
  if (isDeliveryMethod(deliveryMethod)) {
    return DELIVERY_STATUS.WAITING_DRIVER;
  }
  if (isPickupMethod(deliveryMethod)) {
    return DELIVERY_STATUS.WAITING_PICKUP;
  }
  return DELIVERY_STATUS.NOT_REQUIRED;
}

function resolveInitialDeliveryStatus(deliveryMethod, productionStatus) {
  if (productionStatus === PRODUCTION_STATUS.CANCELLED) {
    return DELIVERY_STATUS.CANCELLED;
  }
  if (productionStatus === PRODUCTION_STATUS.READY) {
    return resolveReadyDeliveryStatus(deliveryMethod);
  }
  if (!deliveryMethod) {
    return DELIVERY_STATUS.NOT_REQUIRED;
  }
  if (isDeliveryMethod(deliveryMethod) || isPickupMethod(deliveryMethod)) {
    return DELIVERY_STATUS.PENDING;
  }
  return DELIVERY_STATUS.NOT_REQUIRED;
}

function mapLegacyStatusToAxes(legacyStatus, deliveryMethod) {
  switch (legacyStatus) {
    case PRODUCTION_STATUS.NEW:
    case PRODUCTION_STATUS.PENDING:
    case PRODUCTION_STATUS.ACCEPTED:
    case PRODUCTION_STATUS.PREPARING:
      return {
        production_status: legacyStatus,
        delivery_status: resolveInitialDeliveryStatus(deliveryMethod, legacyStatus),
      };
    case PRODUCTION_STATUS.READY:
      return {
        production_status: PRODUCTION_STATUS.READY,
        delivery_status: resolveReadyDeliveryStatus(deliveryMethod),
      };
    case DELIVERY_STATUS.GOING_TO_STORE:
    case DELIVERY_STATUS.ARRIVED_AT_STORE:
    case DELIVERY_STATUS.PICKED_UP:
    case DELIVERY_STATUS.OUT_FOR_DELIVERY:
    case DELIVERY_STATUS.ARRIVED_AT_CUSTOMER:
      return {
        production_status: PRODUCTION_STATUS.READY,
        delivery_status: legacyStatus,
      };
    case DELIVERY_STATUS.DELIVERED:
      return {
        production_status: PRODUCTION_STATUS.READY,
        delivery_status: DELIVERY_STATUS.DELIVERED,
      };
    case DELIVERY_STATUS.CANCELLED:
      return {
        production_status: PRODUCTION_STATUS.CANCELLED,
        delivery_status: DELIVERY_STATUS.CANCELLED,
      };
    default:
      return {
        production_status: PRODUCTION_STATUS.NEW,
        delivery_status: resolveInitialDeliveryStatus(deliveryMethod, PRODUCTION_STATUS.NEW),
      };
  }
}

export function deriveLegacyStatusFromAxes(order = {}) {
  const deliveryMethod = resolveOrderDeliveryMethod(order);
  const productionStatus = normalizeProductionStatus(order?.production_status) || PRODUCTION_STATUS.NEW;
  const deliveryStatus = normalizeDeliveryStatus(order?.delivery_status) || resolveInitialDeliveryStatus(deliveryMethod, productionStatus);

  if (productionStatus === PRODUCTION_STATUS.CANCELLED || deliveryStatus === DELIVERY_STATUS.CANCELLED) {
    return DELIVERY_STATUS.CANCELLED;
  }

  if (deliveryStatus === DELIVERY_STATUS.DELIVERED) {
    return DELIVERY_STATUS.DELIVERED;
  }

  if (LEGACY_DELIVERY_FLOW_STATUSES.has(deliveryStatus)) {
    return deliveryStatus;
  }

  if (productionStatus === PRODUCTION_STATUS.READY) {
    return PRODUCTION_STATUS.READY;
  }

  if (PRODUCTION_STATUSES.has(productionStatus)) {
    return productionStatus;
  }

  if (READY_FULFILLMENT_STATUSES.has(deliveryStatus)) {
    return PRODUCTION_STATUS.READY;
  }

  return PRODUCTION_STATUS.NEW;
}

export function decorateOrderEntity(order = null) {
  if (!order || typeof order !== 'object') return order;

  const deliveryMethod = resolveOrderDeliveryMethod(order);
  const legacyStatus = normalizeLegacyStatus(order?.status);

  let productionStatus = normalizeProductionStatus(order?.production_status);
  let deliveryStatus = normalizeDeliveryStatus(order?.delivery_status);

  if (!productionStatus || !deliveryStatus) {
    const fromLegacy = mapLegacyStatusToAxes(legacyStatus || PRODUCTION_STATUS.NEW, deliveryMethod);
    productionStatus = productionStatus || fromLegacy.production_status;
    deliveryStatus = deliveryStatus || fromLegacy.delivery_status;
  }

  const normalizedOrder = {
    ...order,
    production_status: productionStatus,
    delivery_status: deliveryStatus,
  };

  return {
    ...normalizedOrder,
    status: deriveLegacyStatusFromAxes(normalizedOrder),
  };
}

export function normalizeOrderForPersistence(nextData = {}, currentOrder = null) {
  const merged = {
    ...(currentOrder && typeof currentOrder === 'object' ? currentOrder : {}),
    ...(nextData && typeof nextData === 'object' ? nextData : {}),
  };

  const currentSnapshot = decorateOrderEntity(currentOrder || merged);
  const deliveryMethod = resolveOrderDeliveryMethod(merged);
  const legacyStatus = normalizeLegacyStatus(nextData?.status);

  let productionStatus = normalizeProductionStatus(nextData?.production_status) || currentSnapshot?.production_status;
  let deliveryStatus = normalizeDeliveryStatus(nextData?.delivery_status) || currentSnapshot?.delivery_status;

  if (legacyStatus) {
    const mapped = mapLegacyStatusToAxes(legacyStatus, deliveryMethod);
    productionStatus = mapped.production_status;
    deliveryStatus = mapped.delivery_status;
  }

  if (!productionStatus) {
    productionStatus = PRODUCTION_STATUS.NEW;
  }

  if (!deliveryStatus) {
    deliveryStatus = resolveInitialDeliveryStatus(deliveryMethod, productionStatus);
  }

  if (productionStatus === PRODUCTION_STATUS.READY && deliveryStatus === DELIVERY_STATUS.PENDING) {
    deliveryStatus = resolveReadyDeliveryStatus(deliveryMethod);
  }

  if (productionStatus === PRODUCTION_STATUS.CANCELLED) {
    deliveryStatus = DELIVERY_STATUS.CANCELLED;
  }

  if (LEGACY_DELIVERY_FLOW_STATUSES.has(deliveryStatus) || deliveryStatus === DELIVERY_STATUS.DELIVERED) {
    productionStatus = PRODUCTION_STATUS.READY;
  }

  const normalizedOrder = {
    ...merged,
    production_status: productionStatus,
    delivery_status: deliveryStatus,
  };

  return {
    ...normalizedOrder,
    status: deriveLegacyStatusFromAxes(normalizedOrder),
  };
}
