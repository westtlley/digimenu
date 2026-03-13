/**
 * Order Status Validation Service
 * Valida transicoes de status de pedidos por eixo operacional.
 */

import { logger } from '../utils/logger.js';
import {
  decorateOrderEntity,
  normalizeOrderForPersistence,
  PRODUCTION_STATUS,
  DELIVERY_STATUS,
  resolveOrderDeliveryMethod,
} from '../utils/orderLifecycle.js';

export const ORDER_STATUSES = {
  NEW: PRODUCTION_STATUS.NEW,
  PENDING: PRODUCTION_STATUS.PENDING,
  ACCEPTED: PRODUCTION_STATUS.ACCEPTED,
  PREPARING: PRODUCTION_STATUS.PREPARING,
  READY: PRODUCTION_STATUS.READY,
  GOING_TO_STORE: DELIVERY_STATUS.GOING_TO_STORE,
  ARRIVED_AT_STORE: DELIVERY_STATUS.ARRIVED_AT_STORE,
  PICKED_UP: DELIVERY_STATUS.PICKED_UP,
  OUT_FOR_DELIVERY: DELIVERY_STATUS.OUT_FOR_DELIVERY,
  ARRIVED_AT_CUSTOMER: DELIVERY_STATUS.ARRIVED_AT_CUSTOMER,
  DELIVERING: 'delivering',
  DELIVERED: DELIVERY_STATUS.DELIVERED,
  CANCELLED: DELIVERY_STATUS.CANCELLED,
};

const FINAL_PRODUCTION_STATUSES = new Set([
  PRODUCTION_STATUS.CANCELLED,
]);

const FINAL_DELIVERY_STATUSES = new Set([
  DELIVERY_STATUS.DELIVERED,
  DELIVERY_STATUS.CANCELLED,
]);

const DELIVERY_FLOW_STATUSES = new Set([
  DELIVERY_STATUS.GOING_TO_STORE,
  DELIVERY_STATUS.ARRIVED_AT_STORE,
  DELIVERY_STATUS.PICKED_UP,
  DELIVERY_STATUS.OUT_FOR_DELIVERY,
  DELIVERY_STATUS.ARRIVED_AT_CUSTOMER,
]);

const DELIVERY_WAITING_STATUSES = new Set([
  DELIVERY_STATUS.PENDING,
  DELIVERY_STATUS.WAITING_DRIVER,
  DELIVERY_STATUS.WAITING_PICKUP,
  DELIVERY_STATUS.NOT_REQUIRED,
]);

const PRODUCTION_TRANSITIONS = {
  [PRODUCTION_STATUS.NEW]: [PRODUCTION_STATUS.ACCEPTED, PRODUCTION_STATUS.PREPARING, PRODUCTION_STATUS.READY, PRODUCTION_STATUS.CANCELLED],
  [PRODUCTION_STATUS.PENDING]: [PRODUCTION_STATUS.ACCEPTED, PRODUCTION_STATUS.PREPARING, PRODUCTION_STATUS.READY, PRODUCTION_STATUS.CANCELLED],
  [PRODUCTION_STATUS.ACCEPTED]: [PRODUCTION_STATUS.PREPARING, PRODUCTION_STATUS.READY, PRODUCTION_STATUS.CANCELLED],
  [PRODUCTION_STATUS.PREPARING]: [PRODUCTION_STATUS.READY, PRODUCTION_STATUS.CANCELLED],
  [PRODUCTION_STATUS.READY]: [PRODUCTION_STATUS.CANCELLED],
  [PRODUCTION_STATUS.CANCELLED]: [],
};

const DELIVERY_TRANSITIONS = {
  [DELIVERY_STATUS.PENDING]: [DELIVERY_STATUS.WAITING_DRIVER, DELIVERY_STATUS.WAITING_PICKUP, DELIVERY_STATUS.NOT_REQUIRED, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.NOT_REQUIRED]: [DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.WAITING_PICKUP]: [DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.WAITING_DRIVER]: [
    DELIVERY_STATUS.GOING_TO_STORE,
    DELIVERY_STATUS.PICKED_UP,
    DELIVERY_STATUS.OUT_FOR_DELIVERY,
    DELIVERY_STATUS.DELIVERED,
    DELIVERY_STATUS.CANCELLED,
  ],
  [DELIVERY_STATUS.GOING_TO_STORE]: [DELIVERY_STATUS.ARRIVED_AT_STORE, DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.ARRIVED_AT_STORE]: [DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.PICKED_UP]: [DELIVERY_STATUS.OUT_FOR_DELIVERY, DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.OUT_FOR_DELIVERY]: [DELIVERY_STATUS.ARRIVED_AT_CUSTOMER, DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.ARRIVED_AT_CUSTOMER]: [DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.CANCELLED],
  [DELIVERY_STATUS.DELIVERED]: [],
  [DELIVERY_STATUS.CANCELLED]: [],
};

function normalizeLegacyStatus(status) {
  const normalized = String(status || '').toLowerCase().trim();
  if (normalized === ORDER_STATUSES.DELIVERING) {
    return ORDER_STATUSES.OUT_FOR_DELIVERY;
  }
  return normalized || null;
}

function validateAxisTransition(currentStatus, nextStatus, transitions, finalStatuses, axisLabel) {
  if (!nextStatus || currentStatus === nextStatus) {
    return { valid: true };
  }

  if (finalStatuses.has(currentStatus)) {
    return {
      valid: false,
      message: `${axisLabel} ja esta finalizado em "${currentStatus}" e nao pode retroceder.`,
    };
  }

  const allowedTransitions = transitions[currentStatus] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    return {
      valid: false,
      message: `Transicao invalida em ${axisLabel}: "${currentStatus}" -> "${nextStatus}". Permitidas: ${allowedTransitions.join(', ') || 'nenhuma'}`,
    };
  }

  return { valid: true };
}

export function validateProductionStatusTransition(currentStatus, newStatus, options = {}) {
  if (options.isMaster) {
    return { valid: true };
  }

  return validateAxisTransition(
    String(currentStatus || '').toLowerCase().trim(),
    String(newStatus || '').toLowerCase().trim(),
    PRODUCTION_TRANSITIONS,
    FINAL_PRODUCTION_STATUSES,
    'producao'
  );
}

export function validateDeliveryStatusTransition(currentStatus, newStatus, options = {}) {
  if (options.isMaster) {
    return { valid: true };
  }

  return validateAxisTransition(
    String(currentStatus || '').toLowerCase().trim(),
    String(newStatus || '').toLowerCase().trim(),
    DELIVERY_TRANSITIONS,
    FINAL_DELIVERY_STATUSES,
    'entrega'
  );
}

export function validateOrderAxisTransition(currentOrder, nextPayloadOrOrder, options = {}) {
  const { isMaster = false } = options;
  if (isMaster) {
    return { valid: true };
  }

  const currentSnapshot = decorateOrderEntity(currentOrder || {});
  const nextSnapshot = normalizeOrderForPersistence(nextPayloadOrOrder || {}, currentSnapshot);

  const currentProductionStatus = currentSnapshot.production_status;
  const nextProductionStatus = nextSnapshot.production_status;
  const currentDeliveryStatus = currentSnapshot.delivery_status;
  const nextDeliveryStatus = nextSnapshot.delivery_status;
  const deliveryMethod = resolveOrderDeliveryMethod(nextSnapshot);

  const productionValidation = validateProductionStatusTransition(currentProductionStatus, nextProductionStatus, options);
  if (!productionValidation.valid) {
    return productionValidation;
  }

  const deliveryValidation = validateDeliveryStatusTransition(currentDeliveryStatus, nextDeliveryStatus, options);
  if (!deliveryValidation.valid) {
    return deliveryValidation;
  }

  if (DELIVERY_FLOW_STATUSES.has(nextDeliveryStatus) && nextProductionStatus !== PRODUCTION_STATUS.READY) {
    return {
      valid: false,
      message: `Transicao invalida: pedido nao pode entrar em entrega com production_status "${nextProductionStatus}".`,
    };
  }

  if (nextDeliveryStatus === DELIVERY_STATUS.DELIVERED && nextProductionStatus !== PRODUCTION_STATUS.READY) {
    return {
      valid: false,
      message: 'Entrega nao pode ser concluida antes da producao estar pronta.',
    };
  }

  if (DELIVERY_FLOW_STATUSES.has(nextDeliveryStatus) && deliveryMethod !== 'delivery') {
    return {
      valid: false,
      message: `Status de entrega "${nextDeliveryStatus}" exige delivery_method "delivery".`,
    };
  }

  if (nextDeliveryStatus === DELIVERY_STATUS.WAITING_DRIVER && deliveryMethod !== 'delivery') {
    return {
      valid: false,
      message: 'waiting_driver so e valido para pedidos delivery.',
    };
  }

  if (nextDeliveryStatus === DELIVERY_STATUS.WAITING_PICKUP && !['pickup', 'balcao'].includes(deliveryMethod)) {
    return {
      valid: false,
      message: 'waiting_pickup so e valido para retirada/balcao.',
    };
  }

  if (
    nextDeliveryStatus === DELIVERY_STATUS.NOT_REQUIRED &&
    ['delivery', 'pickup', 'balcao'].includes(deliveryMethod) &&
    nextProductionStatus === PRODUCTION_STATUS.READY
  ) {
    return {
      valid: false,
      message: 'Pedido pronto com metodo operacional precisa de estado de entrega/retirada coerente.',
    };
  }

  return {
    valid: true,
    currentOrder: currentSnapshot,
    nextOrder: nextSnapshot,
    productionChanged: currentProductionStatus !== nextProductionStatus,
    deliveryChanged: currentDeliveryStatus !== nextDeliveryStatus,
  };
}

export function validateStatusTransition(currentStatus, newStatus, options = {}) {
  if (options.isMaster) {
    return { valid: true };
  }

  const current = normalizeLegacyStatus(currentStatus);
  const next = normalizeLegacyStatus(newStatus);

  if (!current || !next) {
    return {
      valid: false,
      message: `Status invalido: "${next || current || 'vazio'}".`,
    };
  }

  const currentSnapshot = decorateOrderEntity({ status: current, delivery_method: options.deliveryMethod });
  const nextSnapshot = normalizeOrderForPersistence({ status: next, delivery_method: options.deliveryMethod }, currentSnapshot);

  return validateOrderAxisTransition(currentSnapshot, nextSnapshot, options);
}

export function getValidNextStatuses(currentStatus) {
  const current = normalizeLegacyStatus(currentStatus);
  if (!current) return [];

  const currentSnapshot = decorateOrderEntity({ status: current });
  const nextProductionStatuses = PRODUCTION_TRANSITIONS[currentSnapshot.production_status] || [];
  const nextDeliveryStatuses = DELIVERY_TRANSITIONS[currentSnapshot.delivery_status] || [];
  return Array.from(new Set([
    ...nextProductionStatuses,
    ...nextDeliveryStatuses,
  ]));
}

export function isFinalStatus(status) {
  const normalized = normalizeLegacyStatus(status);
  return normalized === DELIVERY_STATUS.DELIVERED || normalized === DELIVERY_STATUS.CANCELLED;
}

export function validateAndLogTransition(orderId, currentStatus, newStatus, options = {}) {
  const validation = validateStatusTransition(currentStatus, newStatus, options);

  if (validation.valid) {
    logger.info(`Transicao de status valida: Pedido ${orderId}`, {
      from: currentStatus,
      to: newStatus,
      userRole: options.userRole || 'unknown',
    });
  } else {
    logger.warn(`Transicao de status invalida: Pedido ${orderId}`, {
      from: currentStatus,
      to: newStatus,
      reason: validation.message,
      userRole: options.userRole || 'unknown',
    });
  }

  return validation;
}
