/**
 * Middleware de Verificação de Permissões
 * 
 * Verifica se o usuário tem permissão para acessar um recurso
 */

import { hasPermission, hasAccess, PLAN_PERMISSIONS, PLANS } from '../utils/plans.js';
import * as repo from '../db/repository.js';
import { usePostgreSQL, getDb } from '../config/appConfig.js';

/**
 * Verifica se uma permissão customizada está presente
 * Formato: { "dashboard": ["view"], "orders": ["view", "create"] }
 */
function checkCustomPermission(customPerms, permission) {
  if (!customPerms || typeof customPerms !== 'object') {
    return false;
  }
  
  // Dividir permissão em módulo e ação (ex: "dashboard_view" -> ["dashboard", "view"])
  const parts = permission.split('_');
  if (parts.length < 2) {
    return false;
  }
  
  const module = parts[0];
  const action = parts.slice(1).join('_');
  
  // Verificar se o módulo existe e tem a ação
  if (customPerms[module] && Array.isArray(customPerms[module])) {
    return customPerms[module].includes(action);
  }
  
  return false;
}

/**
 * Obtém o plano do usuário atual
 */
async function getUserPlan(user, usePostgreSQL, db) {
  // Se for admin master, retorna plano admin
  if (user?.is_master) {
    return PLANS.ADMIN;
  }
  
  // Buscar assinante do usuário
  let subscriber = null;
  
  // Para colaboradores, usar subscriber_email do usuário
  const subscriberEmail = user?.subscriber_email || user?.email;
  
  if (usePostgreSQL) {
    if (subscriberEmail) {
      subscriber = await repo.getSubscriberByEmail(subscriberEmail);
    }
  } else if (db && db.subscribers && subscriberEmail) {
    subscriber = db.subscribers.find(s => (s.email || '').toLowerCase() === (subscriberEmail || '').toLowerCase());
  }
  
  // Se não tem assinante, retorna null (sem acesso)
  if (!subscriber) {
    return null;
  }
  
  // Verificar se assinante está ativo
  if (subscriber.status !== 'active') {
    return null;
  }
  
  // Verificar se assinatura não expirou
  if (subscriber.expires_at && new Date(subscriber.expires_at) < new Date()) {
    return null;
  }
  
  const plan = subscriber.plan || PLANS.BASIC;
  
  // Se for plano custom, retornar 'custom' (permissões vêm do campo permissions)
  if (plan === 'custom') {
    return 'custom';
  }
  
  return plan;
}

/**
 * Middleware para verificar permissão específica
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      // Admin master sempre tem acesso
      if (user.is_master) {
        return next();
      }
      
      // Obter plano do usuário
      const db = getDb();
      const plan = await getUserPlan(user, usePostgreSQL, db);
      
      if (!plan) {
        return res.status(403).json({ 
          error: 'Assinatura não encontrada ou inativa',
          code: 'SUBSCRIPTION_INACTIVE'
        });
      }
      
      // Verificar permissão
      if (!hasPermission(plan, permission)) {
        const { forbiddenResponse } = await import('../src/utils/response.js');
        return forbiddenResponse(res, 'Permissão negada');
      }
      
      // Adicionar plano ao request para uso posterior
      req.userPlan = plan;
      
      next();
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      const { errorResponse } = await import('../src/utils/response.js');
      return errorResponse(res, 'Erro ao verificar permissão', 500, 'INTERNAL_ERROR');
    }
  };
}

/**
 * Middleware para verificar acesso a um recurso
 */
export function requireAccess(resource) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      // Admin master sempre tem acesso
      if (user.is_master) {
        return next();
      }
      
      // Obter plano do usuário
      const db = getDb();
      const plan = await getUserPlan(user, usePostgreSQL, db);
      
      if (!plan) {
        const { forbiddenResponse } = await import('../src/utils/response.js');
        return forbiddenResponse(res, 'Assinatura não encontrada ou inativa');
      }
      
      // Verificar acesso
      if (!hasAccess(plan, resource)) {
        const { forbiddenResponse } = await import('../src/utils/response.js');
        return forbiddenResponse(res, 'Acesso negado a este recurso');
      }
      
      // Adicionar plano ao request
      req.userPlan = plan;
      
      next();
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      const { errorResponse } = await import('../src/utils/response.js');
      return errorResponse(res, 'Erro ao verificar acesso', 500, 'INTERNAL_ERROR');
    }
  };
}

/**
 * Middleware para verificar se é admin master
 */
export function requireMaster() {
  return (req, res, next) => {
    if (!req.user || !req.user.is_master) {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores master.',
        code: 'MASTER_ONLY'
      });
    }
    next();
  };
}

/**
 * Helper para obter plano do usuário (para uso em rotas)
 */
export async function getUserPlanHelper(user, usePostgreSQL, db) {
  return await getUserPlan(user, usePostgreSQL, db);
}
