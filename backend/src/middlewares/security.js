/**
 * Security Middlewares
 * Middlewares de segurança profissional
 */

import helmet from 'helmet';
import cors from 'cors';
import { logger } from '../utils/logger.js';
import { getEnv } from '../config/env.js';

/**
 * Configura Helmet para headers de segurança
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
    hsts: {
      maxAge: 31536000, // 1 ano
      includeSubDomains: true,
      preload: true
    }
  }));
  
  logger.info('✅ Helmet configurado');
}

/**
 * Configura CORS com validação de origens
 */
export function setupCors(app) {
  const frontendUrl = getEnv('FRONTEND_URL', 'http://localhost:5173');
  const corsOrigins = getEnv('CORS_ORIGINS', '');
  
  // Parse CORS_ORIGINS
  let allowedOrigins = [];
  if (corsOrigins) {
    allowedOrigins = corsOrigins.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    // Em desenvolvimento, permitir qualquer porta localhost
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins = [frontendUrl];
    } else {
      allowedOrigins = [
        frontendUrl,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ];
    }
  }

  app.use(cors({
    origin: (origin, callback) => {
      // Permitir requisições sem origin (ex: Postman, mobile apps)
      if (!origin) {
        return callback(null, true);
      }

      // Verificar se origin está na lista permitida
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn('🚫 Origem bloqueada pelo CORS:', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page']
  }));

  logger.info('✅ CORS configurado', { 
    allowedOrigins: allowedOrigins.filter(o => typeof o === 'string').length,
    regexPatterns: allowedOrigins.filter(o => o instanceof RegExp).length
  });
}

/**
 * Sanitização básica contra injection
 */
export function sanitizeInput(req, res, next) {
  // Sanitizar query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remover caracteres perigosos
        req.query[key] = req.query[key]
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      }
    });
  }

  // Sanitizar body (apenas strings)
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };
    sanitizeObject(req.body);
  }

  next();
}

/**
 * Sanitizar dados para logs (não expor informações sensíveis)
 */
export function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'password_hash',
    'token',
    'jwt',
    'secret',
    'api_key',
    'api_secret',
    'authorization',
    'cookie',
    'session'
  ];

  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  });

  return sanitized;
}

export default {
  setupHelmet,
  setupCors,
  sanitizeInput,
  sanitizeForLog
};
