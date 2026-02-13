/**
 * Tratamento de Erros Centralizado
 * Middleware para tratamento consistente de erros
 * ✅ MELHORADO: Logs claros para erros 500, mensagens úteis para erros 400
 */

import { sanitizeForLog } from './security.js';
import { logger } from '../utils/logger.js';
import { agentLog } from '../utils/agentLog.js';

/**
 * Middleware de tratamento de erros
 */
export function errorHandler(err, req, res, next) {
  // Log do erro (sanitizado) - sempre logar para debug
  const errorLog = {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.email || 'anonymous',
    timestamp: new Date().toISOString(),
    body: req.body ? sanitizeForLog(req.body) : undefined,
    query: req.query ? sanitizeForLog(req.query) : undefined
  };
  
  // ✅ Log detalhado para erros 500 (críticos)
  if (!err.status || err.status >= 500) {
    logger.error('❌ [ERROR_HANDLER] Erro 500:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      user: req.user?.email || 'anonymous',
      body: req.body ? sanitizeForLog(req.body) : undefined
    });
  } else {
    // Log de warning para erros 400 (validação)
    logger.warn('⚠️ [ERROR_HANDLER] Erro de validação:', {
      status: err.status,
      message: err.message,
      path: req.path,
      method: req.method,
      user: req.user?.email || 'anonymous'
    });
  }
  
  // Erro de validação Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      message: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }
  
  // Erro de autenticação JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      message: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado',
      message: 'Token expirado',
      code: 'EXPIRED_TOKEN'
    });
  }
  
  // Erro de banco de dados PostgreSQL
  if (err.code) {
    // Unique violation
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Registro já existe',
        message: 'Registro já existe',
        code: 'DUPLICATE_ENTRY'
      });
    }

    // Foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Referência inválida',
        message: 'Referência inválida',
        code: 'FOREIGN_KEY_VIOLATION'
      });
    }

    // Not null violation
    if (err.code === '23502') {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório não fornecido',
        message: 'Campo obrigatório não fornecido',
        code: 'NOT_NULL_VIOLATION'
      });
    }
  }
  
  // Erro de rate limit (já tratado pelo middleware)
  if (err.status === 429) {
    const rateMsg = err.message || 'Muitas requisições';
    return res.status(429).json({
      success: false,
      error: rateMsg,
      message: rateMsg,
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Erro genérico (500)
  const status = err.status || err.statusCode || 500;

  agentLog({
    location: 'errorHandler.js',
    message: '[H5] Error handler processing',
    data: { status, errorMessage: err.message, path: req.path, method: req.method, errorName: err.name, errorCode: err.code, errorStack: err.stack?.substring(0, 300) },
    timestamp: Date.now()
  });

  // Mensagens claras para erros 500
  if (status >= 500) {
    const msg = process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor. Nossa equipe foi notificada e está trabalhando para resolver.'
      : err.message || 'Erro interno do servidor';

    return res.status(status).json({
      success: false,
      error: msg,
      message: msg,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          stack: err.stack,
          ...err.details,
          path: req.path,
          method: req.method
        }
      })
    });
  }

  // Mensagens úteis para erros 400
  const msg = err.message || 'Erro na requisição';
  res.status(status).json({
    success: false,
    error: msg,
    message: msg,
    code: err.code || 'BAD_REQUEST',
    ...(process.env.NODE_ENV === 'development' && {
      details: {
        stack: err.stack,
        ...err.details
      }
    })
  });
}

/**
 * Wrapper para async handlers (evita try/catch em cada rota)
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Criar erro customizado
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}
