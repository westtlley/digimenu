/**
 * Rate Limiting Middleware
 * Proteção contra brute force e abuso de API
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limit para login (5 tentativas por 15 minutos)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false,
  // Usar IP do cliente
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  // Handler customizado
  handler: (req, res) => {
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Rate limit geral para API (100 requisições por 15 minutos)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições
  message: {
    error: 'Muitas requisições. Tente novamente mais tarde.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Muitas requisições. Tente novamente mais tarde.',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Rate limit para criação de recursos (10 por minuto)
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 criações
  message: {
    error: 'Muitas criações. Aguarde um momento.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  }
});
