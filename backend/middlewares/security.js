/**
 * Middlewares de segurança adicionais
 * Helmet.js, CSRF protection, etc.
 */

import helmet from 'helmet';
import { sanitizeMiddleware } from '../utils/sanitize.js';

/**
 * Configurar Helmet para headers de segurança
 */
export function setupHelmet(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Permitir Cloudinary e outros
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));
}

/**
 * Validar JWT_SECRET
 */
export function validateJWTSecret() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET é obrigatório em produção!');
    }
    console.warn('⚠️ JWT_SECRET não configurado, usando padrão (NÃO USE EM PRODUÇÃO)');
    return 'default-secret-change-in-production';
  }
  
  if (secret.length < 32) {
    console.warn('⚠️ JWT_SECRET muito curto, recomendado mínimo 32 caracteres');
  }
  
  return secret;
}

/**
 * Sanitizar dados para logs (remover informações sensíveis)
 */
export function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some(s => lowerKey.includes(s))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Rate limiting por IP (complementar ao express-rate-limit)
 */
export function createIPRateLimit(windowMs, max) {
  const requests = new Map();
  
  setInterval(() => {
    requests.clear();
  }, windowMs);
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    const record = requests.get(ip);
    
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
      return next();
    }
    
    if (record.count >= max) {
      return res.status(429).json({
        error: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

/**
 * Validar origem da requisição
 */
export function validateOrigin(req, res, next) {
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : [process.env.FRONTEND_URL || 'http://localhost:5173'];
  
  const origin = req.headers.origin;
  
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origem não permitida' });
  }
  
  next();
}

export default {
  setupHelmet,
  validateJWTSecret,
  sanitizeForLog,
  createIPRateLimit,
  validateOrigin,
  sanitizeMiddleware
};
