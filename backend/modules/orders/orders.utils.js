/**
 * Orders Utils - Funções auxiliares para módulo de pedidos
 */

import * as repo from '../../db/repository.js';
import { usePostgreSQL } from '../../config/appConfig.js';

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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'orders.utils.js:33',message:'[H1] No subscriber found, returning null (master users do not have slugs)',data:{slug},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
