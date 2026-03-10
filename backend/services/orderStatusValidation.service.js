/**
 * Order Status Validation Service
 * Valida transicoes de status de pedidos.
 */

import { logger } from '../utils/logger.js';

/**
 * Status possiveis de um pedido.
 */
export const ORDER_STATUSES = {
  NEW: 'new',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  GOING_TO_STORE: 'going_to_store',
  ARRIVED_AT_STORE: 'arrived_at_store',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  ARRIVED_AT_CUSTOMER: 'arrived_at_customer',
  // Alias legado mantido por compatibilidade com dados antigos.
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

function normalizeOrderStatus(status) {
  const normalized = (status || '').toLowerCase().trim();
  // Compatibilidade com status legado.
  if (normalized === ORDER_STATUSES.DELIVERING) {
    return ORDER_STATUSES.OUT_FOR_DELIVERY;
  }
  return normalized;
}

/**
 * Mapa de transicoes validas de status.
 * Formato: { fromStatus: [toStatus1, toStatus2, ...] }
 */
const VALID_TRANSITIONS = {
  [ORDER_STATUSES.NEW]: [
    ORDER_STATUSES.ACCEPTED,
    ORDER_STATUSES.PREPARING,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.PENDING]: [
    ORDER_STATUSES.ACCEPTED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.ACCEPTED]: [
    ORDER_STATUSES.PREPARING,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.PREPARING]: [
    ORDER_STATUSES.READY,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.READY]: [
    ORDER_STATUSES.GOING_TO_STORE,
    ORDER_STATUSES.PICKED_UP,
    ORDER_STATUSES.OUT_FOR_DELIVERY,
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.GOING_TO_STORE]: [
    ORDER_STATUSES.ARRIVED_AT_STORE,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.ARRIVED_AT_STORE]: [
    ORDER_STATUSES.PICKED_UP,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.PICKED_UP]: [
    ORDER_STATUSES.OUT_FOR_DELIVERY,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.OUT_FOR_DELIVERY]: [
    ORDER_STATUSES.ARRIVED_AT_CUSTOMER,
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.ARRIVED_AT_CUSTOMER]: [
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  // Compatibilidade com registros legados.
  [ORDER_STATUSES.DELIVERING]: [
    ORDER_STATUSES.ARRIVED_AT_CUSTOMER,
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.DELIVERED]: [
    // Pedido entregue nao pode mudar de status (final)
  ],
  [ORDER_STATUSES.CANCELLED]: [
    // Pedido cancelado nao pode mudar de status (final)
  ]
};

/**
 * Status finais (nao podem ser alterados).
 */
const FINAL_STATUSES = [
  ORDER_STATUSES.DELIVERED,
  ORDER_STATUSES.CANCELLED
];

/**
 * Valida se uma transicao de status e permitida.
 * @param {string} currentStatus - Status atual do pedido
 * @param {string} newStatus - Novo status desejado
 * @param {object} options - Opcoes de validacao
 * @param {boolean} options.isMaster - Se o usuario e master (bypass de validacao)
 * @param {string} options.userRole - Role do usuario (para validacoes especificas)
 * @returns {object} - { valid: boolean, message?: string }
 */
export function validateStatusTransition(currentStatus, newStatus, options = {}) {
  const { isMaster = false } = options;

  // Master pode fazer qualquer transicao (bypass)
  if (isMaster) {
    return { valid: true };
  }

  // Normalizar status
  const current = normalizeOrderStatus(currentStatus);
  const next = normalizeOrderStatus(newStatus);

  // Se nao mudou, e valido (mas nao faz sentido)
  if (current === next) {
    return { valid: true, message: 'Status nao foi alterado' };
  }

  // Verificar se status atual e final
  if (FINAL_STATUSES.includes(current)) {
    return {
      valid: false,
      message: `Pedido com status "${current}" nao pode ser alterado. Status finais: ${FINAL_STATUSES.join(', ')}`
    };
  }

  // Verificar se novo status e valido
  if (!Object.values(ORDER_STATUSES).includes(next)) {
    return {
      valid: false,
      message: `Status invalido: "${next}". Status validos: ${Object.values(ORDER_STATUSES).join(', ')}`
    };
  }

  // Verificar se a transicao e permitida
  const allowedTransitions = VALID_TRANSITIONS[current] || [];
  if (!allowedTransitions.includes(next)) {
    return {
      valid: false,
      message: `Transicao invalida: "${current}" -> "${next}". ` +
               `Transicoes permitidas de "${current}": ${allowedTransitions.join(', ') || 'nenhuma'}`
    };
  }

  return { valid: true };
}

/**
 * Obtem todas as transicoes validas a partir de um status.
 * @param {string} currentStatus - Status atual
 * @returns {string[]} - Array de status validos para transicao
 */
export function getValidNextStatuses(currentStatus) {
  const current = normalizeOrderStatus(currentStatus);
  return VALID_TRANSITIONS[current] || [];
}

/**
 * Verifica se um status e final (nao pode ser alterado).
 * @param {string} status - Status a verificar
 * @returns {boolean}
 */
export function isFinalStatus(status) {
  const normalized = normalizeOrderStatus(status);
  return FINAL_STATUSES.includes(normalized);
}

/**
 * Valida e aplica transicao de status com logging.
 * @param {string} orderId - ID do pedido
 * @param {string} currentStatus - Status atual
 * @param {string} newStatus - Novo status
 * @param {object} options - Opcoes de validacao
 * @returns {object} - { valid: boolean, message?: string }
 */
export function validateAndLogTransition(orderId, currentStatus, newStatus, options = {}) {
  const validation = validateStatusTransition(currentStatus, newStatus, options);

  if (validation.valid) {
    logger.info(`Transicao de status valida: Pedido ${orderId}`, {
      from: currentStatus,
      to: newStatus,
      userRole: options.userRole || 'unknown'
    });
  } else {
    logger.warn(`Transicao de status invalida: Pedido ${orderId}`, {
      from: currentStatus,
      to: newStatus,
      reason: validation.message,
      userRole: options.userRole || 'unknown'
    });
  }

  return validation;
}
