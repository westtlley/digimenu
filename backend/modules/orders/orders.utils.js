/**
 * Orders Utils - Funções auxiliares para módulo de pedidos
 */

export { getSubscriberOrMasterBySlug } from '../menus/menus.utils.js';

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
  if (!orderData.customer_name || !String(orderData.customer_name).trim()) {
    errors.push('Nome do cliente é obrigatório');
  }
  if (!orderData.customer_phone || String(orderData.customer_phone).replace(/\D/g, '').length < 10) {
    errors.push('Telefone válido é obrigatório');
  }
  if (orderData.delivery_method === 'delivery') {
    const hasAddress = !!String(orderData.address || '').trim();
    const hasStreetAndNumber = !!String(orderData.address_street || '').trim() && !!String(orderData.address_number || '').trim();
    if ((!hasAddress && !hasStreetAndNumber) || !orderData.neighborhood) {
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
