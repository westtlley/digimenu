/**
 * Authentication Middleware
 * Middleware profissional de autenticação JWT
 */

import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { unauthorizedResponse } from '../utils/response.js';
import * as repo from '../../db/repository.js';

const JWT_SECRET = getEnv('JWT_SECRET');

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/api/health',
  '/api/upload-image',
  '/api/auth/login',
  '/api/auth/register',
  // /api/auth/me REMOVIDO - deve exigir autenticação
  '/api/auth/set-password',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/public/',
  '/api/entities/PaymentConfig',
  '/api/entities/MenuItem',
  '/api/entities/Category',
  '/api/entities/Subscriber',
  '/api/functions/registerCustomer',
  '/api/lgpd/request'
];

/**
 * Verifica se a rota é pública
 */
function isPublicRoute(path) {
  return publicRoutes.some(route => {
    if (route.endsWith('/')) {
      return path.startsWith(route);
    }
    return path === route || path.startsWith(route + '/');
  });
}

/**
 * Extrai token do header Authorization
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Middleware de autenticação
 */
export async function authenticate(req, res, next) {
  // Rotas públicas
  if (isPublicRoute(req.path)) {
    // Tentar autenticar se houver token (opcional)
    const token = extractToken(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await repo.getLoginUserByEmail(decoded.email);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Token inválido em rota pública - apenas ignorar
        logger.debug('Token inválido em rota pública:', { path: req.path });
      }
    }
    return next();
  }

  // Rotas protegidas - token obrigatório
  const token = extractToken(req);

  if (!token) {
    // Em TEST, sempre exigir token (não permitir fallback)
    if (process.env.NODE_ENV === 'test') {
      return unauthorizedResponse(res, 'Token de autenticação necessário');
    }
    
    // Em desenvolvimento (não test), permitir sem token como fallback
    if (process.env.NODE_ENV !== 'production') {
      const user = await repo.getUserByEmail('admin@digimenu.com');
      if (user) {
        req.user = user;
        logger.warn('⚠️ Modo desenvolvimento: autenticação bypassada');
        return next();
      }
    }
    
    return unauthorizedResponse(res, 'Token de autenticação necessário');
  }

  try {
    // Verificar e decodificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuário no banco
    const usePostgreSQL = !!process.env.DATABASE_URL;
    let user = null;
    
    if (usePostgreSQL) {
      user = await repo.getLoginUserByEmail(decoded.email);
      if (!user) {
        user = await repo.getUserByEmail(decoded.email);
      }
    }
    
    if (!user) {
      logger.warn('Usuário não encontrado para token:', { email: decoded.email });
      return unauthorizedResponse(res, 'Usuário não encontrado');
    }

    // Adicionar usuário à requisição
    req.user = user;
    
    // Log de autenticação (apenas em desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Usuário autenticado:', { 
        email: user.email, 
        id: user.id,
        is_master: user.is_master 
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expirado:', { path: req.path });
      return unauthorizedResponse(res, 'Token expirado');
    }
    
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Token inválido:', { path: req.path, error: error.message });
      return unauthorizedResponse(res, 'Token inválido');
    }

    logger.error('Erro na autenticação:', { error: error.message });
    return unauthorizedResponse(res, 'Erro na autenticação');
  }
}

/**
 * Gera token JWT
 */
export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verifica token JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw error;
  }
}

/**
 * Middleware opcional - autentica se houver token, mas não bloqueia
 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await repo.getLoginUserByEmail(decoded.email);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Token inválido - apenas ignorar
    }
  }
  
  next();
}

export default {
  authenticate,
  optionalAuth,
  generateToken,
  verifyToken,
  isPublicRoute
};
