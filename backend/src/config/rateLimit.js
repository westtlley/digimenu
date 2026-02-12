/**
 * Rate Limiting Configuration
 * Configuração profissional de rate limiting
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

/**
 * Rate limit para login (proteção contra brute force)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  handler: (req, res) => {
    logger.warn('Rate limit excedido para login:', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Rate limit geral para API
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisições por 15 minutos
  message: {
    error: 'Muitas requisições. Tente novamente mais tarde.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  skip: (req) => {
    // Não contar rotas públicas no limite geral
    const path = req.originalUrl || req.url || '';
    return path.includes('/api/auth/login') || 
           path.includes('/api/public/') ||
           path === '/api/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit excedido para API:', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente mais tarde.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Rate limit para criação de recursos
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 criações por minuto
  message: {
    error: 'Muitas criações. Aguarde um momento.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar ID do usuário se autenticado, senão IP
    return req.user?.id || req.ip || req.connection.remoteAddress;
  },
  handler: (req, res) => {
    logger.warn('Rate limit excedido para criação:', { 
      ip: req.ip, 
      userId: req.user?.id,
      path: req.path 
    });
    res.status(429).json({
      success: false,
      message: 'Muitas criações. Aguarde um momento.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  }
});

export default {
  loginLimiter,
  apiLimiter,
  createLimiter
};
