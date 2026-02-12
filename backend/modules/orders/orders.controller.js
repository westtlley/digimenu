/**
 * Orders Controller - Handlers de rotas de pedidos
 * Orquestra as requisições e chama o service apropriado
 */

import * as ordersService from './orders.service.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';
import { logger } from '../../utils/logger.js';
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'orders.controller.js:22',message:'[H2] Creating table order',data:{slug,hasItems:!!req.body.items},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const newOrder = await ordersService.createTableOrder(req.body, slug);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'orders.controller.js:25',message:'[H2] Order created successfully',data:{orderId:newOrder?.id,orderCode:newOrder?.order_code},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return createdResponse(res, newOrder, 'Pedido criado com sucesso');
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'orders.controller.js:28',message:'[H2] Error creating order',data:{errorMessage:error.message,errorStack:error.stack?.substring(0,200)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    logger.error('❌ Erro ao criar pedido de mesa:', error);
    if (error.message === 'Slug obrigatório' || error.message.includes('obrigatórios')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    if (error.message === 'Link não encontrado') {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes('Requer PostgreSQL')) {
      return errorResponse(res, error.message, 503, 'SERVICE_UNAVAILABLE');
    }
    return errorResponse(res, 'Erro ao criar pedido', 500, 'INTERNAL_ERROR');
  }
});
