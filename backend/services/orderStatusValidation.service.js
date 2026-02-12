/**
 * Order Status Validation Service
 * Valida transições de status de pedidos, garantindo que apenas transições válidas sejam permitidas
 */

import { logger } from '../utils/logger.js';

/**
 * Status possíveis de um pedido
 */
export const ORDER_STATUSES = {
  NEW: 'new',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * Mapa de transições válidas de status
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
    ORDER_STATUSES.DELIVERING,
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.DELIVERING]: [
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED
  ],
  [ORDER_STATUSES.DELIVERED]: [
    // Pedido entregue não pode mudar de status (final)
  ],
  [ORDER_STATUSES.CANCELLED]: [
    // Pedido cancelado não pode mudar de status (final)
  ]
};

/**
 * Status finais (não podem ser alterados)
 */
const FINAL_STATUSES = [
  ORDER_STATUSES.DELIVERED,
  ORDER_STATUSES.CANCELLED
];

/**
 * Valida se uma transição de status é permitida
 * @param {string} currentStatus - Status atual do pedido
 * @param {string} newStatus - Novo status desejado
 * @param {object} options - Opções de validação
 * @param {boolean} options.isMaster - Se o usuário é master (bypass de validação)
 * @param {string} options.userRole - Role do usuário (para validações específicas)
 * @returns {object} - { valid: boolean, message?: string }
 */
export function validateStatusTransition(currentStatus, newStatus, options = {}) {
  const { isMaster = false, userRole = null } = options;

  // Master pode fazer qualquer transição (bypass)
  if (isMaster) {
    return { valid: true };
  }

  // Normalizar status
  const current = (currentStatus || '').toLowerCase().trim();
  const next = (newStatus || '').toLowerCase().trim();

  // Se não mudou, é válido (mas não faz sentido)
  if (current === next) {
    return { valid: true, message: 'Status não foi alterado' };
  }

  // Verificar se status atual é final
  if (FINAL_STATUSES.includes(current)) {
    return {
      valid: false,
      message: `Pedido com status "${current}" não pode ser alterado. Status finais: ${FINAL_STATUSES.join(', ')}`
    };
  }

  // Verificar se novo status é válido
  if (!Object.values(ORDER_STATUSES).includes(next)) {
    return {
      valid: false,
      message: `Status inválido: "${next}". Status válidos: ${Object.values(ORDER_STATUSES).join(', ')}`
    };
  }

  // Verificar se a transição é permitida
  const allowedTransitions = VALID_TRANSITIONS[current] || [];
  if (!allowedTransitions.includes(next)) {
    return {
      valid: false,
      message: `Transição inválida: "${current}" → "${next}". ` +
               `Transições permitidas de "${current}": ${allowedTransitions.join(', ') || 'nenhuma'}`
    };
  }

  // Validações específicas por role (se necessário)
  if (next === ORDER_STATUSES.CANCELLED) {
    // Apenas gerente ou dono pode cancelar (validação adicional pode ser feita no controller)
    // Por enquanto, permitimos se a transição é válida
  }

  return { valid: true };
}

/**
 * Obtém todas as transições válidas a partir de um status
 * @param {string} currentStatus - Status atual
 * @returns {string[]} - Array de status válidos para transição
 */
export function getValidNextStatuses(currentStatus) {
  const current = (currentStatus || '').toLowerCase().trim();
  return VALID_TRANSITIONS[current] || [];
}

/**
 * Verifica se um status é final (não pode ser alterado)
 * @param {string} status - Status a verificar
 * @returns {boolean}
 */
export function isFinalStatus(status) {
  const normalized = (status || '').toLowerCase().trim();
  return FINAL_STATUSES.includes(normalized);
}

/**
 * Valida e aplica transição de status com logging
 * @param {string} orderId - ID do pedido
 * @param {string} currentStatus - Status atual
 * @param {string} newStatus - Novo status
 * @param {object} options - Opções de validação
 * @returns {object} - { valid: boolean, message?: string }
 */
export function validateAndLogTransition(orderId, currentStatus, newStatus, options = {}) {
  const validation = validateStatusTransition(currentStatus, newStatus, options);

  if (validation.valid) {
    logger.info(`✅ Transição de status válida: Pedido ${orderId}`, {
      from: currentStatus,
      to: newStatus,
      userRole: options.userRole || 'unknown'
    });
  } else {
    logger.warn(`❌ Transição de status inválida: Pedido ${orderId}`, {
      from: currentStatus,
      to: newStatus,
      reason: validation.message,
      userRole: options.userRole || 'unknown'
    });
  }

  return validation;
}
