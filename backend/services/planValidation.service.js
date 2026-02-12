/**
 * Plan Validation Service - Serviço de validação de limites e permissões de planos
 * Centraliza toda a lógica de validação de limites do plano antes de ações críticas
 */

import * as repo from '../db/repository.js';
import { getPlanPermissions, hasPermission } from '../utils/plans.js';
import { logger } from '../utils/logger.js';
import { usePostgreSQL, getDb } from '../config/appConfig.js';

/**
 * Obtém o plano de um subscriber
 */
async function getSubscriberPlan(subscriberEmail) {
  if (!subscriberEmail) return null;

  let subscriber = null;
  if (usePostgreSQL) {
    subscriber = await repo.getSubscriberByEmail(subscriberEmail);
  } else {
    const db = getDb();
    if (db?.subscribers) {
      subscriber = db.subscribers.find(s => (s.email || '').toLowerCase() === (subscriberEmail || '').toLowerCase());
    }
  }

  if (!subscriber) return null;

  // Se for plano custom, usar permissões customizadas
  if (subscriber.plan === 'custom') {
    return 'custom';
  }

  return subscriber.plan || 'free';
}

/**
 * Valida limite de produtos antes de criar/atualizar
 */
export async function validateProductsLimit(subscriberEmail, currentCount = null, isMaster = false) {
  if (isMaster) {
    return { valid: true, limit: -1, current: currentCount || 0, remaining: -1 };
  }

  if (!subscriberEmail) {
    // Se não tem subscriberEmail e não é master, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Email do assinante é obrigatório para validação de limite' };
  }

  const plan = await getSubscriberPlan(subscriberEmail);
  if (!plan) {
    // Se não encontrou o plano, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Assinante não encontrado' };
  }

  const permissions = getPlanPermissions(plan);
  const limit = permissions.products_limit;

  // -1 significa ilimitado
  if (limit === -1) {
    return { valid: true, limit: -1, current: currentCount || 0, remaining: -1 };
  }

  // Se não foi fornecido o count atual, buscar do banco
  if (currentCount === null) {
    if (usePostgreSQL) {
      const dishes = await repo.listEntitiesForSubscriber('Dish', subscriberEmail, null);
      currentCount = Array.isArray(dishes) ? dishes.length : 0;
    } else {
      const db = getDb();
      if (db?.entities?.Dish) {
        currentCount = db.entities.Dish.filter(d => 
          (d.owner_email || '').toLowerCase() === (subscriberEmail || '').toLowerCase()
        ).length;
      } else {
        currentCount = 0;
      }
    }
  }

  const remaining = limit - currentCount;
  const valid = currentCount < limit;

  if (!valid) {
    logger.warn(`Limite de produtos excedido para ${subscriberEmail}: ${currentCount}/${limit}`);
  }

  return { valid, limit, current: currentCount, remaining: Math.max(0, remaining) };
}

/**
 * Valida limite de pedidos por dia
 */
export async function validateOrdersPerDayLimit(subscriberEmail, isMaster = false) {
  if (isMaster) {
    return { valid: true, limit: -1, current: 0, remaining: -1 };
  }

  if (!subscriberEmail) {
    // Se não tem subscriberEmail e não é master, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Email do assinante é obrigatório para validação de limite' };
  }

  const plan = await getSubscriberPlan(subscriberEmail);
  if (!plan) {
    // Se não encontrou o plano, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Assinante não encontrado' };
  }

  const permissions = getPlanPermissions(plan);
  const limit = permissions.orders_per_day;

  // -1 significa ilimitado, null significa que não usa limite diário (usa mensal)
  if (limit === -1) {
    return { valid: true, limit: -1, current: 0, remaining: -1 };
  }
  
  if (limit === null || limit === undefined) {
    // Se não tem limite diário, usar validação mensal
    return await validateOrdersPerMonthLimit(subscriberEmail, isMaster);
  }

  // Contar pedidos do dia atual
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  let currentCount = 0;
  if (usePostgreSQL) {
    const orders = await repo.listEntitiesForSubscriber('Order', subscriberEmail, null);
    if (Array.isArray(orders)) {
      currentCount = orders.filter(order => {
        const orderDate = order.created_date || order.created_at;
        if (!orderDate) return false;
        const orderDateObj = new Date(orderDate);
        orderDateObj.setHours(0, 0, 0, 0);
        return orderDateObj.toISOString() === todayISO;
      }).length;
    }
  } else {
    const db = getDb();
    if (db?.entities?.Order) {
      currentCount = db.entities.Order.filter(order => {
        const orderDate = order.created_date || order.created_at;
        if (!orderDate) return false;
        const orderDateObj = new Date(orderDate);
        orderDateObj.setHours(0, 0, 0, 0);
        return orderDateObj.toISOString() === todayISO &&
               (order.owner_email || '').toLowerCase() === (subscriberEmail || '').toLowerCase();
      }).length;
    }
  }

  const remaining = limit - currentCount;
  const valid = currentCount < limit;

  if (!valid) {
    logger.warn(`Limite de pedidos por dia excedido para ${subscriberEmail}: ${currentCount}/${limit}`);
  }

  return { valid, limit, current: currentCount, remaining: Math.max(0, remaining) };
}

/**
 * Valida limite de pedidos por mês
 */
export async function validateOrdersPerMonthLimit(subscriberEmail, isMaster = false) {
  if (isMaster) {
    return { valid: true, limit: -1, current: 0, remaining: -1 };
  }

  if (!subscriberEmail) {
    // Se não tem subscriberEmail e não é master, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Email do assinante é obrigatório para validação de limite' };
  }

  const plan = await getSubscriberPlan(subscriberEmail);
  if (!plan) {
    // Se não encontrou o plano, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Assinante não encontrado' };
  }

  const permissions = getPlanPermissions(plan);
  const limit = permissions.orders_per_month;

  // -1 significa ilimitado
  if (limit === -1 || limit === null || limit === undefined) {
    return { valid: true, limit: -1, current: 0, remaining: -1 };
  }

  // Contar pedidos do mês atual
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  firstDayOfMonth.setHours(0, 0, 0, 0);
  const firstDayISO = firstDayOfMonth.toISOString();

  let currentCount = 0;
  if (usePostgreSQL) {
    const orders = await repo.listEntitiesForSubscriber('Order', subscriberEmail, null);
    if (Array.isArray(orders)) {
      currentCount = orders.filter(order => {
        const orderDate = order.created_date || order.created_at;
        if (!orderDate) return false;
        const orderDateObj = new Date(orderDate);
        return orderDateObj >= firstDayOfMonth;
      }).length;
    }
  } else {
    const db = getDb();
    if (db?.entities?.Order) {
      currentCount = db.entities.Order.filter(order => {
        const orderDate = order.created_date || order.created_at;
        if (!orderDate) return false;
        const orderDateObj = new Date(orderDate);
        return orderDateObj >= firstDayOfMonth &&
               (order.owner_email || '').toLowerCase() === (subscriberEmail || '').toLowerCase();
      }).length;
    }
  }

  const remaining = limit - currentCount;
  const valid = currentCount < limit;

  if (!valid) {
    logger.warn(`Limite de pedidos por mês excedido para ${subscriberEmail}: ${currentCount}/${limit}`);
  }

  return { valid, limit, current: currentCount, remaining: Math.max(0, remaining) };
}

/**
 * Valida limite de usuários/colaboradores
 */
export async function validateUsersLimit(subscriberEmail, currentCount = null, isMaster = false) {
  if (isMaster) {
    return { valid: true, limit: -1, current: currentCount || 0, remaining: -1 };
  }

  if (!subscriberEmail) {
    // Se não tem subscriberEmail e não é master, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Email do assinante é obrigatório para validação de limite' };
  }

  const plan = await getSubscriberPlan(subscriberEmail);
  if (!plan) {
    // Se não encontrou o plano, retornar erro de validação (não throw)
    return { valid: false, limit: 0, current: 0, remaining: 0, error: 'Assinante não encontrado' };
  }

  const permissions = getPlanPermissions(plan);
  const limit = permissions.users_limit;

  // -1 significa ilimitado
  if (limit === -1) {
    return { valid: true, limit: -1, current: currentCount || 0, remaining: -1 };
  }

  // Se não foi fornecido o count atual, buscar do banco
  if (currentCount === null) {
    if (usePostgreSQL) {
      const colaboradores = await repo.listColaboradores(subscriberEmail);
      currentCount = Array.isArray(colaboradores) ? colaboradores.length : 0;
    } else {
      const db = getDb();
      if (db?.users) {
        currentCount = db.users.filter(u => 
          (u.subscriber_email || '').toLowerCase() === (subscriberEmail || '').toLowerCase() &&
          (u.profile_role || '').trim()
        ).length;
      } else {
        currentCount = 0;
      }
    }
  }

  const remaining = limit - currentCount;
  const valid = currentCount < limit;

  if (!valid) {
    logger.warn(`Limite de usuários excedido para ${subscriberEmail}: ${currentCount}/${limit}`);
  }

  return { valid, limit, current: currentCount, remaining: Math.max(0, remaining) };
}

/**
 * Valida se o plano tem uma permissão específica
 */
export async function validatePermission(subscriberEmail, permission, isMaster = false) {
  if (isMaster) {
    return { valid: true, permission, plan: 'admin' };
  }

  if (!subscriberEmail) {
    throw new Error('Email do assinante é obrigatório para validação de permissão');
  }

  const plan = await getSubscriberPlan(subscriberEmail);
  if (!plan) {
    throw new Error('Assinante não encontrado');
  }

  const valid = hasPermission(plan, permission);

  return { valid, permission, plan };
}

/**
 * Valida múltiplos limites de uma vez (otimizado)
 */
export async function validateMultipleLimits(subscriberEmail, limitsToCheck = ['products', 'orders', 'users'], isMaster = false) {
  if (isMaster) {
    return {
      valid: true,
      products: { valid: true, limit: -1, current: 0, remaining: -1 },
      orders: { valid: true, limit: -1, current: 0, remaining: -1 },
      users: { valid: true, limit: -1, current: 0, remaining: -1 }
    };
  }

  const results = {};

  if (limitsToCheck.includes('products')) {
    results.products = await validateProductsLimit(subscriberEmail, null, isMaster);
  }

  if (limitsToCheck.includes('orders')) {
    // Tenta validar por dia primeiro, se não tiver limite diário, valida por mês
    const dayLimit = await validateOrdersPerDayLimit(subscriberEmail, isMaster);
    if (dayLimit.limit === null || dayLimit.limit === undefined) {
      results.orders = await validateOrdersPerMonthLimit(subscriberEmail, isMaster);
    } else {
      results.orders = dayLimit;
    }
  }

  if (limitsToCheck.includes('users')) {
    results.users = await validateUsersLimit(subscriberEmail, null, isMaster);
  }

  const allValid = Object.values(results).every(r => r.valid);

  return {
    valid: allValid,
    ...results
  };
}

/**
 * Obtém informações de limites do plano
 */
export async function getPlanLimitsInfo(subscriberEmail, isMaster = false) {
  if (isMaster) {
    return {
      plan: 'admin',
      limits: {
        products: -1,
        orders_per_day: -1,
        users: -1,
        history_days: -1
      },
      permissions: {}
    };
  }

  if (!subscriberEmail) {
    throw new Error('Email do assinante é obrigatório');
  }

  const plan = await getSubscriberPlan(subscriberEmail);
  if (!plan) {
    throw new Error('Assinante não encontrado');
  }

  const permissions = getPlanPermissions(plan);

  return {
    plan,
    limits: {
      products: permissions.products_limit || -1,
      orders_per_day: permissions.orders_per_day || -1,
      orders_per_month: permissions.orders_per_month || -1,
      users: permissions.users_limit || -1,
      history_days: permissions.orders_history_days || -1
    },
    permissions
  };
}
