/**
 * Orders Controller - Handlers de rotas de pedidos
 * Orquestra as requisições e chama o service apropriado
 */

import * as ordersService from './orders.service.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { agentLog } from '../../utils/agentLog.js';
import { usePostgreSQL } from '../../config/appConfig.js';
import { createdResponse, errorResponse, notFoundResponse } from '../../src/utils/response.js';

/**
 * Cria um pedido de mesa (público)
 */
export const createTableOrder = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return errorResponse(res, 'Requer PostgreSQL', 503, 'SERVICE_UNAVAILABLE');
  }

  try {
    const { slug } = req.body;
    agentLog({ location: 'orders.controller.js:22', message: '[H2] Creating table order', data: { slug, hasItems: !!req.body.items }, timestamp: Date.now() });
    const newOrder = await ordersService.createTableOrder(req.body, slug);
    agentLog({ location: 'orders.controller.js:25', message: '[H2] Order created successfully', data: { orderId: newOrder?.id, orderCode: newOrder?.order_code }, timestamp: Date.now() });
    return createdResponse(res, newOrder, 'Pedido criado com sucesso');
  } catch (error) {
    agentLog({ location: 'orders.controller.js:28', message: '[H2] Error creating order', data: { errorMessage: error.message, errorStack: error.stack?.substring(0, 200) }, timestamp: Date.now() });
    logger.error('❌ Erro ao criar pedido de mesa:', error);
    if (error.message === 'Slug obrigatório' || error.message.includes('obrigatórios')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    if (error.message === 'Link não encontrado' || error.message === 'Assinante não encontrado') {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes('Requer PostgreSQL')) {
      return errorResponse(res, error.message, 503, 'SERVICE_UNAVAILABLE');
    }
    return errorResponse(res, 'Erro ao criar pedido', 500, 'INTERNAL_ERROR');
  }
});

/**
 * Cria pedido de cardápio (entrega/retirada) - público por slug
 */
export const createCardapioOrder = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return errorResponse(res, 'Requer PostgreSQL', 503, 'SERVICE_UNAVAILABLE');
  }
  try {
    const { slug, ...orderData } = req.body;
    if (!slug || !String(slug).trim()) {
      return errorResponse(res, 'Slug obrigatório', 400, 'VALIDATION_ERROR');
    }
    const newOrder = await ordersService.createCardapioOrder({ ...orderData, slug }, slug);
    return createdResponse(res, newOrder, 'Pedido criado com sucesso');
  } catch (error) {
    logger.error('Erro ao criar pedido cardápio:', error);
    if (error.message === 'Slug obrigatório' || error.message.includes('obrigat')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    if (error.message === 'Link não encontrado' || error.message.includes('não encontrado')) {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes('Limite') || error.message.includes('excedido')) {
      return errorResponse(res, error.message, 402, 'LIMIT_EXCEEDED');
    }
    return errorResponse(res, error.message || 'Erro ao criar pedido', 500, 'INTERNAL_ERROR');
  }
});
