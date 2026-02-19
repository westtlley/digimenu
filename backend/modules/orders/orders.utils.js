/**
 * Orders Utils - Funções auxiliares para módulo de pedidos
 */

import * as repo from '../../db/repository.js';
import { usePostgreSQL } from '../../config/appConfig.js';
import { agentLog } from '../../utils/agentLog.js';

/**
 * Gera código único para pedido de mesa
 */
export function generateTableOrderCode(tableNumber) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MESA-${tableNumber || '?'}-${code}`;
}

/**
 * Gera código único para pedido de cardápio/entrega
 */
export function generateOrderCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Valida dados de pedido de cardápio (entrega/retirada)
 */
export function validateCardapioOrderData(orderData) {
  const errors = [];
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('Itens do pedido são obrigatórios');
  }
  const total = Number(orderData.total);
  if (isNaN(total) || total < 0) errors.push('Total inválido');
  if (!orderData.customer_name || !String(orderData.customer_name).trim()) {
    errors.push('Nome do cliente é obrigatório');
  }
  if (!orderData.customer_phone || String(orderData.customer_phone).replace(/\D/g, '').length < 10) {
    errors.push('Telefone válido é obrigatório');
  }
  if (orderData.delivery_method === 'delivery') {
    if (!orderData.address || !orderData.neighborhood) {
      errors.push('Endereço e bairro são obrigatórios para entrega');
    }
  }
  if (!orderData.payment_method || !String(orderData.payment_method).trim()) {
    errors.push('Forma de pagamento é obrigatória');
  }
  if (orderData.payment_method === 'dinheiro' && orderData.needs_change && (!orderData.change_amount || orderData.change_amount <= 0)) {
    errors.push('Informe o valor para troco');
  }
  return errors;
}

/**
 * Obtém subscriber ou master pelo slug
 */
export async function getSubscriberOrMasterBySlug(slug) {
  if (!usePostgreSQL) {
    return { subscriber: null, isMaster: false, subscriberEmail: null };
  }

  const subscriber = await repo.getSubscriberBySlug(slug);
  if (subscriber) {
    return { subscriber, isMaster: false, subscriberEmail: subscriber.email };
  }

  // Se não encontrou subscriber, não há master com slug (slug é apenas para subscribers)
  // CORREÇÃO H1: users não tem coluna slug, apenas subscribers. Remover busca inválida.
  agentLog({ location: 'orders.utils.js:33', message: '[H1] No subscriber found, returning null (master users do not have slugs)', data: { slug }, timestamp: Date.now() });

  return { subscriber: null, isMaster: false, subscriberEmail: null };
}

/**
 * Valida dados básicos de um pedido
 */
export function validateOrderData(orderData) {
  const errors = [];

  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('Itens do pedido são obrigatórios');
  }

  if (typeof orderData.total !== 'number' || orderData.total < 0) {
    errors.push('Total do pedido deve ser um número positivo');
  }

  return errors;
}
