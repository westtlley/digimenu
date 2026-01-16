/**
 * Middleware de Verificação de Permissões
 * 
 * Verifica se o usuário tem permissão para acessar um recurso
 */

import { hasPermission, hasAccess, PLAN_PERMISSIONS, PLANS } from '../utils/plans.js';
import * as repo from '../db/repository.js';

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
  
  if (usePostgreSQL) {
    if (user?.subscriber_email) {
      subscriber = await repo.getSubscriberByEmail(user.subscriber_email);
    }
  } else if (db && db.subscribers && user?.subscriber_email) {
    subscriber = db.subscribers.find(s => s.email === user.subscriber_email);
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
  
  return subscriber.plan || PLANS.BASIC;
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
      const usePostgreSQL = !!process.env.DATABASE_URL;
      let db = null;
      if (!usePostgreSQL) {
        const persistence = await import('../db/persistence.js');
        db = persistence.loadDatabase();
      }
      
      const plan = await getUserPlan(user, usePostgreSQL, db);
      
      if (!plan) {
        return res.status(403).json({ 
          error: 'Assinatura não encontrada ou inativa',
          code: 'SUBSCRIPTION_INACTIVE'
        });
      }
      
      // Verificar permissão
      if (!hasPermission(plan, permission)) {
        return res.status(403).json({ 
          error: 'Permissão negada',
          code: 'PERMISSION_DENIED',
          required: permission,
          current_plan: plan
        });
      }
      
      // Adicionar plano ao request para uso posterior
      req.userPlan = plan;
      
      next();
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      res.status(500).json({ error: 'Erro ao verificar permissão' });
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
      const usePostgreSQL = !!process.env.DATABASE_URL;
      let db = null;
      if (!usePostgreSQL) {
        const persistence = await import('../db/persistence.js');
        db = persistence.loadDatabase();
      }
      
      const plan = await getUserPlan(user, usePostgreSQL, db);
      
      if (!plan) {
        return res.status(403).json({ 
          error: 'Assinatura não encontrada ou inativa',
          code: 'SUBSCRIPTION_INACTIVE'
        });
      }
      
      // Verificar acesso
      if (!hasAccess(plan, resource)) {
        return res.status(403).json({ 
          error: 'Acesso negado a este recurso',
          code: 'ACCESS_DENIED',
          required: resource,
          current_plan: plan
        });
      }
      
      // Adicionar plano ao request
      req.userPlan = plan;
      
      next();
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      res.status(500).json({ error: 'Erro ao verificar acesso' });
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
