/**
 * Tratamento de Erros Centralizado
 * Middleware para tratamento consistente de erros
 */

import { sanitizeForLog } from './security.js';

/**
 * Middleware de tratamento de erros
 */
export function errorHandler(err, req, res, next) {
  // Log do erro (sanitizado)
  const errorLog = {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  
  console.error('❌ Erro:', sanitizeForLog(errorLog));
  
  // Erro de validação Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }
  
  // Erro de autenticação JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      code: 'EXPIRED_TOKEN'
    });
  }
  
  // Erro de banco de dados PostgreSQL
  if (err.code) {
    // Unique violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Registro já existe',
        code: 'DUPLICATE_ENTRY'
      });
    }
    
    // Foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({
        error: 'Referência inválida',
        code: 'FOREIGN_KEY_VIOLATION'
      });
    }
    
    // Not null violation
    if (err.code === '23502') {
      return res.status(400).json({
        error: 'Campo obrigatório não fornecido',
        code: 'NOT_NULL_VIOLATION'
      });
    }
  }
  
  // Erro de rate limit (já tratado pelo middleware)
  if (err.status === 429) {
    return res.status(429).json({
      error: err.message || 'Muitas requisições',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Erro genérico
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor'
    : err.message;
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
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
