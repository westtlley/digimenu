/**
 * Tratamento de Erros Centralizado
 * Middleware para tratamento consistente de erros
 * ✅ MELHORADO: Logs claros para erros 500, mensagens úteis para erros 400
 */

import { sanitizeForLog } from './security.js';
import { logger } from '../utils/logger.js';

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
      message: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
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
        message: 'Registro já existe',
        code: 'DUPLICATE_ENTRY'
      });
    }
    
    // Foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Referência inválida',
        code: 'FOREIGN_KEY_VIOLATION'
      });
    }
    
    // Not null violation
    if (err.code === '23502') {
      return res.status(400).json({
        success: false,
        message: 'Campo obrigatório não fornecido',
        code: 'NOT_NULL_VIOLATION'
      });
    }
  }
  
  // Erro de rate limit (já tratado pelo middleware)
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: err.message || 'Muitas requisições',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  // Erro genérico (500)
  const status = err.status || err.statusCode || 500;
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.js:118',message:'[H5] Error handler processing',data:{status,errorMessage:err.message,path:req.path,method:req.method,errorName:err.name,errorCode:err.code,errorStack:err.stack?.substring(0,300)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  
  // ✅ Mensagens claras para erros 500
  if (status >= 500) {
    // Em produção, não expor detalhes do erro
    const message = process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor. Nossa equipe foi notificada e está trabalhando para resolver.'
      : err.message || 'Erro interno do servidor';
    
    return res.status(status).json({
      success: false,
      message,
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
  
  // ✅ Mensagens úteis para erros 400
  res.status(status).json({
    success: false,
    message: err.message || 'Erro na requisição',
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
