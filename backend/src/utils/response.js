/**
 * API Response Standard
 * Padrão de resposta da API
 */

/**
 * Resposta de sucesso
 */
export function successResponse(res, data = null, message = 'Operação realizada com sucesso', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

/**
 * Resposta de erro
 */
export function errorResponse(res, message = 'Erro na operação', statusCode = 400, code = null, details = null) {
  const response = {
    success: false,
    message,
    ...(code && { code }),
    ...(details && { details })
  };

  return res.status(statusCode).json(response);
}

/**
 * Resposta de criação (201)
 */
export function createdResponse(res, data = null, message = 'Recurso criado com sucesso') {
  return successResponse(res, data, message, 201);
}

/**
 * Resposta de atualização (200)
 */
export function updatedResponse(res, data = null, message = 'Recurso atualizado com sucesso') {
  return successResponse(res, data, message, 200);
}

/**
 * Resposta de deleção (200)
 */
export function deletedResponse(res, message = 'Recurso deletado com sucesso') {
  return successResponse(res, null, message, 200);
}

/**
 * Resposta de não encontrado (404)
 */
export function notFoundResponse(res, message = 'Recurso não encontrado') {
  return errorResponse(res, message, 404, 'NOT_FOUND');
}

/**
 * Resposta de não autorizado (401)
 */
export function unauthorizedResponse(res, message = 'Não autorizado') {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
}

/**
 * Resposta de proibido (403)
 */
export function forbiddenResponse(res, message = 'Acesso negado') {
  return errorResponse(res, message, 403, 'FORBIDDEN');
}

/**
 * Resposta de validação (400)
 */
export function validationResponse(res, message = 'Dados inválidos', details = null) {
  return errorResponse(res, message, 400, 'VALIDATION_ERROR', details);
}

/**
 * Resposta de conflito (409)
 */
export function conflictResponse(res, message = 'Conflito na operação') {
  return errorResponse(res, message, 409, 'CONFLICT');
}

/**
 * Resposta de limite excedido (429)
 */
export function rateLimitResponse(res, message = 'Muitas requisições') {
  return errorResponse(res, message, 429, 'RATE_LIMIT_EXCEEDED');
}

/**
 * Resposta de erro interno (500)
 */
export function internalErrorResponse(res, message = 'Erro interno do servidor', isDevelopment = false) {
  return errorResponse(res, message, 500, 'INTERNAL_SERVER_ERROR', 
    isDevelopment ? { stack: new Error().stack } : null
  );
}

export default {
  successResponse,
  errorResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationResponse,
  conflictResponse,
  rateLimitResponse,
  internalErrorResponse
};
