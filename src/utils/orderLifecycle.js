export const ORDER_PRODUCTION_STATUS = {
  NEW: 'new',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  CANCELLED: 'cancelled',
};

export const ORDER_DELIVERY_STATUS = {
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

export const ACTIVE_DELIVERY_FLOW_STATUSES = new Set([
  ORDER_DELIVERY_STATUS.GOING_TO_STORE,
  ORDER_DELIVERY_STATUS.ARRIVED_AT_STORE,
  ORDER_DELIVERY_STATUS.PICKED_UP,
  ORDER_DELIVERY_STATUS.OUT_FOR_DELIVERY,
  ORDER_DELIVERY_STATUS.ARRIVED_AT_CUSTOMER,
]);

function normalizeLower(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (normalized === 'delivering') {
    return ORDER_DELIVERY_STATUS.OUT_FOR_DELIVERY;
  }
  return normalized || null;
}

function resolveOrderDeliveryMethod(order = {}) {
  return normalizeLower(order?.delivery_method || order?.delivery_type || order?.serving_type);
}

function resolveReadyDeliveryStatus(deliveryMethod) {
  if (deliveryMethod === 'delivery') return ORDER_DELIVERY_STATUS.WAITING_DRIVER;
  if (deliveryMethod === 'pickup' || deliveryMethod === 'balcao') return ORDER_DELIVERY_STATUS.WAITING_PICKUP;
  return ORDER_DELIVERY_STATUS.NOT_REQUIRED;
}

function resolveInitialDeliveryStatus(deliveryMethod, productionStatus) {
  if (productionStatus === ORDER_PRODUCTION_STATUS.CANCELLED) {
    return ORDER_DELIVERY_STATUS.CANCELLED;
  }
  if (productionStatus === ORDER_PRODUCTION_STATUS.READY) {
    return resolveReadyDeliveryStatus(deliveryMethod);
  }
  if (!deliveryMethod) return ORDER_DELIVERY_STATUS.NOT_REQUIRED;
  if (deliveryMethod === 'delivery' || deliveryMethod === 'pickup' || deliveryMethod === 'balcao') {
    return ORDER_DELIVERY_STATUS.PENDING;
  }
  return ORDER_DELIVERY_STATUS.NOT_REQUIRED;
}

export function getOrderProductionStatus(order = {}) {
  const explicit = normalizeLower(order?.production_status);
  if (explicit) return explicit;

  const legacyStatus = normalizeLower(order?.status);
  if (
    legacyStatus === ORDER_PRODUCTION_STATUS.NEW ||
    legacyStatus === ORDER_PRODUCTION_STATUS.PENDING ||
    legacyStatus === ORDER_PRODUCTION_STATUS.ACCEPTED ||
    legacyStatus === ORDER_PRODUCTION_STATUS.PREPARING ||
    legacyStatus === ORDER_PRODUCTION_STATUS.READY ||
    legacyStatus === ORDER_PRODUCTION_STATUS.CANCELLED
  ) {
    return legacyStatus;
  }

  if (legacyStatus === ORDER_DELIVERY_STATUS.CANCELLED) {
    return ORDER_PRODUCTION_STATUS.CANCELLED;
  }

  return ORDER_PRODUCTION_STATUS.READY;
}

export function getOrderDeliveryStatus(order = {}) {
  const explicit = normalizeLower(order?.delivery_status);
  if (explicit) return explicit;

  const deliveryMethod = resolveOrderDeliveryMethod(order);
  const legacyStatus = normalizeLower(order?.status);

  if (ACTIVE_DELIVERY_FLOW_STATUSES.has(legacyStatus) || legacyStatus === ORDER_DELIVERY_STATUS.DELIVERED) {
    return legacyStatus;
  }

  if (legacyStatus === ORDER_DELIVERY_STATUS.CANCELLED) {
    return ORDER_DELIVERY_STATUS.CANCELLED;
  }

  return resolveInitialDeliveryStatus(deliveryMethod, getOrderProductionStatus(order));
}

export function getOrderDisplayStatus(order = {}) {
  const productionStatus = getOrderProductionStatus(order);
  const deliveryStatus = getOrderDeliveryStatus(order);

  if (productionStatus === ORDER_PRODUCTION_STATUS.CANCELLED || deliveryStatus === ORDER_DELIVERY_STATUS.CANCELLED) {
    return ORDER_DELIVERY_STATUS.CANCELLED;
  }

  if (deliveryStatus === ORDER_DELIVERY_STATUS.DELIVERED) {
    return ORDER_DELIVERY_STATUS.DELIVERED;
  }

  if (ACTIVE_DELIVERY_FLOW_STATUSES.has(deliveryStatus)) {
    return deliveryStatus;
  }

  if (productionStatus === ORDER_PRODUCTION_STATUS.READY) {
    return ORDER_PRODUCTION_STATUS.READY;
  }

  return productionStatus || ORDER_PRODUCTION_STATUS.NEW;
}

export function isOrderCancelled(order = {}) {
  return getOrderDisplayStatus(order) === ORDER_DELIVERY_STATUS.CANCELLED;
}

export function isOrderDelivered(order = {}) {
  return getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.DELIVERED;
}

export function isOrderFinalized(order = {}) {
  return isOrderCancelled(order) || isOrderDelivered(order);
}

export function isOrderNewForGestor(order = {}) {
  const productionStatus = getOrderProductionStatus(order);
  return (
    productionStatus === ORDER_PRODUCTION_STATUS.NEW ||
    productionStatus === ORDER_PRODUCTION_STATUS.PENDING
  );
}

export function isOrderPreparationActive(order = {}) {
  const productionStatus = getOrderProductionStatus(order);
  return (
    productionStatus === ORDER_PRODUCTION_STATUS.NEW ||
    productionStatus === ORDER_PRODUCTION_STATUS.PENDING ||
    productionStatus === ORDER_PRODUCTION_STATUS.ACCEPTED ||
    productionStatus === ORDER_PRODUCTION_STATUS.PREPARING
  );
}

export function isOrderReadyForDispatch(order = {}) {
  const productionStatus = getOrderProductionStatus(order);
  const deliveryStatus = getOrderDeliveryStatus(order);

  if (productionStatus !== ORDER_PRODUCTION_STATUS.READY) {
    return false;
  }

  return (
    deliveryStatus === ORDER_DELIVERY_STATUS.PENDING ||
    deliveryStatus === ORDER_DELIVERY_STATUS.NOT_REQUIRED ||
    deliveryStatus === ORDER_DELIVERY_STATUS.WAITING_PICKUP ||
    deliveryStatus === ORDER_DELIVERY_STATUS.WAITING_DRIVER
  );
}

export function isOrderInDeliveryFlow(order = {}) {
  return ACTIVE_DELIVERY_FLOW_STATUSES.has(getOrderDeliveryStatus(order));
}

export function getGestorOrderColumn(order = {}) {
  if (isOrderFinalized(order)) {
    return 'done';
  }

  if (isOrderInDeliveryFlow(order)) {
    return 'delivery';
  }

  const productionStatus = getOrderProductionStatus(order);
  if (productionStatus === ORDER_PRODUCTION_STATUS.READY) {
    return 'ready';
  }
  if (productionStatus === ORDER_PRODUCTION_STATUS.PREPARING) {
    return 'preparing';
  }
  if (productionStatus === ORDER_PRODUCTION_STATUS.ACCEPTED) {
    return 'accepted';
  }
  return 'new';
}

export function matchesLegacyOrderStatusFilter(order = {}, legacyStatus = 'all') {
  if (!legacyStatus || legacyStatus === 'all') {
    return true;
  }

  switch (legacyStatus) {
    case ORDER_PRODUCTION_STATUS.NEW:
      return isOrderNewForGestor(order);
    case ORDER_PRODUCTION_STATUS.ACCEPTED:
      return getOrderProductionStatus(order) === ORDER_PRODUCTION_STATUS.ACCEPTED;
    case ORDER_PRODUCTION_STATUS.PREPARING:
      return getOrderProductionStatus(order) === ORDER_PRODUCTION_STATUS.PREPARING;
    case ORDER_PRODUCTION_STATUS.READY:
      return isOrderReadyForDispatch(order);
    case ORDER_DELIVERY_STATUS.OUT_FOR_DELIVERY:
      return isOrderInDeliveryFlow(order);
    case ORDER_DELIVERY_STATUS.DELIVERED:
      return isOrderDelivered(order);
    case ORDER_DELIVERY_STATUS.CANCELLED:
      return isOrderCancelled(order);
    default:
      return getOrderDisplayStatus(order) === legacyStatus;
  }
}
