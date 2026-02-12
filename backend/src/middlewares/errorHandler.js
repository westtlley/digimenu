/**
 * Global Error Handler
 * Tratamento global de erros profissional
 */

import { logger } from '../utils/logger.js';
import { sanitizeForLog } from './security.js';
import {
  errorResponse,
  validationResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  rateLimitResponse,
  internalErrorResponse
} from '../utils/response.js';

/**
 * Middleware de tratamento de erros
 */
export function errorHandler(err, req, res, next) {
  // Log do erro (sanitizado)
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

  // Erro de validação Zod
  if (err.name === 'ZodError') {
    logger.warn('Erro de validação Zod:', errorLog);
    return validationResponse(res, 'Dados inválidos', err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    })));
  }

  // Erro de autenticação JWT
  if (err.name === 'JsonWebTokenError') {
    logger.warn('Token JWT inválido:', errorLog);
    return unauthorizedResponse(res, 'Token inválido');
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn('Token JWT expirado:', errorLog);
    return unauthorizedResponse(res, 'Token expirado');
  }

  // Erro de banco de dados PostgreSQL
  if (err.code) {
    // Unique violation
    if (err.code === '23505') {
      logger.warn('Violação de unicidade:', errorLog);
      return conflictResponse(res, 'Registro já existe');
    }
    
    // Foreign key violation
    if (err.code === '23503') {
      logger.warn('Violação de chave estrangeira:', errorLog);
      return errorResponse(res, 'Referência inválida', 400, 'FOREIGN_KEY_VIOLATION');
    }
    
    // Not null violation
    if (err.code === '23502') {
      logger.warn('Violação de NOT NULL:', errorLog);
      return validationResponse(res, 'Campo obrigatório não fornecido');
    }
  }

  // Erro de rate limit
  if (err.status === 429 || err.statusCode === 429) {
    logger.warn('Rate limit excedido:', errorLog);
    return rateLimitResponse(res, err.message || 'Muitas requisições');
  }

  // Erro de autorização
  if (err.status === 403 || err.statusCode === 403) {
    logger.warn('Acesso negado:', errorLog);
    return forbiddenResponse(res, err.message || 'Acesso negado');
  }

  // Erro de autenticação
  if (err.status === 401 || err.statusCode === 401) {
    logger.warn('Não autorizado:', errorLog);
    return unauthorizedResponse(res, err.message || 'Não autorizado');
  }

  // Erro genérico (500)
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    // Log detalhado para erros 500
    logger.error('Erro interno do servidor:', errorLog);
    
    // Em produção, não expor detalhes
    const isDevelopment = process.env.NODE_ENV === 'development';
    return internalErrorResponse(
      res,
      isDevelopment ? err.message : 'Erro interno do servidor. Nossa equipe foi notificada.',
      isDevelopment
    );
  }

  // Erro 4xx
  logger.warn('Erro na requisição:', errorLog);
  return errorResponse(
    res,
    err.message || 'Erro na requisição',
    status,
    err.code || 'BAD_REQUEST',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
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
 * Classe de erro customizado
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

/**
 * Middleware para capturar erros não tratados
 */
export function notFoundHandler(req, res, next) {
  const error = new AppError(`Rota não encontrada: ${req.method} ${req.path}`, 404, 'NOT_FOUND');
  next(error);
}

export default {
  errorHandler,
  asyncHandler,
  AppError,
  notFoundHandler
};
