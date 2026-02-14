/**
 * Establishments Controller - Handlers de rotas de estabelecimentos/assinantes
 * Orquestra as requisições e chama o service apropriado
 */

import * as establishmentsService from './establishments.service.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { sanitizeForLog } from '../../middlewares/security.js';
import { requireMaster } from '../../middlewares/permissions.js';
import { successResponse, createdResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../../src/utils/response.js';

/**
 * Lista assinantes com paginação opcional (apenas master).
 * Query params: page, limit, orderBy, orderDir.
 * Sempre retorna 200 com { data: { subscribers, pagination? } } — nunca 204.
 */
export const listSubscribers = asyncHandler(async (req, res) => {
  const { page, limit, orderBy, orderDir } = req.query;
  const options = {};
  if (page != null) options.page = page;
  if (limit != null) options.limit = limit;
  if (orderBy != null) options.orderBy = orderBy;
  if (orderDir != null) options.orderDir = orderDir;

  try {
    const result = await establishmentsService.listSubscribers(options);

    if (result && typeof result === 'object' && result.data && result.pagination) {
      if (process.env.NODE_ENV !== 'production') {
        logger.log('📋 [BACKEND] getSubscribers - Retornando', result.data.length, 'de', result.pagination.total, 'assinantes');
      }
      return res.status(200).json({
        success: true,
        message: 'Lista de assinantes',
        data: {
          subscribers: Array.isArray(result.data) ? result.data : [],
          pagination: result.pagination
        }
      });
    }

    const subscribers = Array.isArray(result) ? result : [];
    if (process.env.NODE_ENV !== 'production') {
      logger.log('📋 [BACKEND] getSubscribers - Retornando', subscribers.length, 'assinantes');
    }
    return res.status(200).json({
      success: true,
      message: 'Lista de assinantes',
      data: { subscribers }
    });
  } catch (error) {
    logger.error('❌ [BACKEND] Erro em getSubscribers:', error);
    return errorResponse(res, 'Erro ao buscar assinantes', 500, 'INTERNAL_ERROR', { details: error.message });
  }
});

/**
 * Cria um novo assinante (apenas master)
 */
export const createSubscriber = asyncHandler(async (req, res) => {
  // Middleware requireMaster já verificou is_master

  try {
    const subscriber = await establishmentsService.createSubscriber(req.body);
    return res.status(201).json({
      success: true,
      message: 'Assinante criado com sucesso',
      data: {
        subscriber,
        setup_url: subscriber?.setup_url,
        password_token: subscriber?.password_token
      }
    });
  } catch (error) {
    logger.error('❌ Erro ao criar assinante:', sanitizeForLog({ error: error.message }));
    if (error.message.includes('Plano inválido') || error.message.includes('permissões definidas') || error.message.includes('obrigatório')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    return errorResponse(res, 'Erro ao criar assinante', 500, 'INTERNAL_ERROR', { details: error.message });
  }
});

/**
 * Atualiza um assinante existente
 */
export const updateSubscriber = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await establishmentsService.updateSubscriber(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Assinante atualizado com sucesso',
      data: updated
    });
  } catch (error) {
    logger.error('Erro em PUT /api/subscribers/:id:', sanitizeForLog({ error: error.message }));
    if (error.message.includes('não encontrado')) {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes('Só é possível editar')) {
      return forbiddenResponse(res, error.message);
    }
    return errorResponse(res, 'Erro interno no servidor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * Deleta um assinante por slug (apenas master)
 */
export const deleteSubscriberBySlug = asyncHandler(async (req, res) => {
  // Middleware requireMaster já verificou is_master

  const slug = req.query.slug || req.body.slug;
  if (!slug) {
    return res.status(400).json({ error: 'Parâmetro "slug" é obrigatório' });
  }

  try {
    const result = await establishmentsService.deleteSubscriberBySlug(slug);
    res.json(result);
  } catch (error) {
    logger.error('❌ Erro ao deletar subscriber:', sanitizeForLog({ error: error.message }));
    if (error.message.includes('requer PostgreSQL')) {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({
      error: 'Erro ao deletar subscriber',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Obtém informações de um plano
 */
export const getPlanInfo = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const planInfo = establishmentsService.getPlanInfoData(plan);
  res.json({ data: planInfo });
});

/**
 * Obtém lista de planos disponíveis
 */
export const getAvailablePlans = asyncHandler(async (req, res) => {
  const plansInfo = await establishmentsService.getAvailablePlans();
  res.json({ data: plansInfo });
});
