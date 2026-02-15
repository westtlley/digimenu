/**
 * Generic Entities Routes
 * Rotas genéricas de entidades (compatibilidade com código existente)
 * Estas rotas serão migradas gradualmente para módulos específicos
 */

import express from 'express';
import * as repo from '../../db/repository.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { logger } from '../utils/logger.js';
import { successResponse, errorResponse, createdResponse, notFoundResponse } from '../utils/response.js';
import { agentLog } from '../../utils/agentLog.js';
import { validateProductsLimit, validateOrdersPerDayLimit } from '../../services/planValidation.service.js';
import { validateStatusTransition } from '../../services/orderStatusValidation.service.js';
import { emitOrderCreated, emitOrderUpdate, emitComandaCreated } from '../../services/websocket.js';

const router = express.Router();

// Helper para verificar se usa PostgreSQL
const usePostgreSQL = () => !!process.env.DATABASE_URL;

/**
 * Listar entidades
 */
router.get('/:entity', asyncHandler(async (req, res) => {
  const { entity } = req.params;
  const { order, page = 1, limit = 50, as_subscriber, ...filters } = req.query;
  
  // ✅ Configurar contexto para master atuando como assinante
  if (req.user?.is_master && as_subscriber) {
    req.user._contextForSubscriber = as_subscriber;
    logger.info(`🔍 [GET /:entity] Master atuando como assinante: ${as_subscriber}`);
  }
  
  logger.info(`🔍 [GET /:entity] entity=${entity}, as_subscriber=${as_subscriber}, is_master=${req.user?.is_master}, user_email=${req.user?.email}`);
  
  let items = [];
  
  if (usePostgreSQL()) {
    // ✅ Corrigir ordem dos parâmetros: (entityType, filters, orderBy, user, pagination)
    items = await repo.listEntities(entity, filters, order, req.user);
    logger.info(`🔍 [GET /:entity] Retornou ${items.length} items de ${entity}`);
  } else {
    // Fallback JSON - manter compatibilidade
    const { getDb } = await import('../../config/appConfig.js');
    const db = getDb();
    if (db?.entities?.[entity]) {
      items = db.entities[entity];
    }
  }
  
  // Aplicar filtros
  if (Object.keys(filters).length > 0) {
    items = items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === 'null' || value === null) {
          return item[key] === null || item[key] === undefined;
        }
        return item[key] == value;
      });
    });
  }
  
  // Ordenar
  if (order) {
    const orderField = order.startsWith('-') ? order.slice(1) : order;
    const direction = order.startsWith('-') ? -1 : 1;
    items.sort((a, b) => {
      const aVal = a[orderField];
      const bVal = b[orderField];
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
  }
  
  // Paginação
  const total = items.length;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;
  const paginatedItems = items.slice(start, end);
  
  return successResponse(res, {
    items: paginatedItems,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  });
}));

/**
 * Obter entidade por ID
 */
router.get('/:entity/:id', asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const asSub = req.query.as_subscriber;
  
  if (req.user?.is_master && asSub) {
    req.user._contextForSubscriber = asSub;
  }
  
  const item = await repo.getEntityById(entity, id, req.user);
  
  if (!item) {
    return notFoundResponse(res, 'Entidade não encontrada');
  }
  
  return successResponse(res, item);
}));

/**
 * Criar entidade
 */
router.post('/:entity', asyncHandler(async (req, res) => {
  const { entity } = req.params;
  let data = { ...req.body };
  const asSub = data.as_subscriber || req.query.as_subscriber;
  let createOpts = {};
  
  // Configurar contexto para master
  if (req.user?.is_master && asSub) {
    req.user._contextForSubscriber = asSub;
    delete data.as_subscriber;
    data.owner_email = asSub;
    createOpts.forSubscriberEmail = asSub;
  }
  
  // Configurar subscriber para não-master
  if (!req.user?.is_master) {
    const subEmail = req.user?.subscriber_email || req.user?.email;
    let subscriber = null;
    
    if (usePostgreSQL()) {
      subscriber = await repo.getSubscriberByEmail(subEmail);
    } else {
      const appConfig = await import('../../config/appConfig.js');
      const db = appConfig.getDb();
      subscriber = db?.subscribers?.find(s => (s.email || '').toLowerCase() === (subEmail || '').toLowerCase());
    }
    
    if (subscriber) {
      if (!data.owner_email) data.owner_email = subscriber.email;
      createOpts.forSubscriberEmail = subscriber.email;
    }
  }
  
  // Validar limite de produtos
  if (String(entity).toLowerCase() === 'dish' && !req.user?.is_master) {
    const subscriberEmail = createOpts.forSubscriberEmail || data.owner_email || (req.user?.subscriber_email || req.user?.email);
    agentLog({ location: 'entities.routes.js:144', message: '[H2] Validating product limit', data: { entity, subscriberEmail, isMaster: req.user?.is_master }, timestamp: Date.now() });
    if (subscriberEmail) {
      try {
        const productLimit = await validateProductsLimit(subscriberEmail, null, req.user?.is_master);
        agentLog({ location: 'entities.routes.js:149', message: '[H2] Product limit validation result', data: { valid: productLimit.valid, limit: productLimit.limit, current: productLimit.current, error: productLimit.error }, timestamp: Date.now() });
        if (!productLimit.valid) {
          return errorResponse(res, 
            productLimit.error || `Limite de produtos excedido. Você já tem ${productLimit.current} produto(s). Seu plano permite ${productLimit.limit} produto(s).`,
            403,
            'PRODUCT_LIMIT_EXCEEDED',
            { limit: productLimit.limit, current: productLimit.current }
          );
        }
      } catch (error) {
        agentLog({ location: 'entities.routes.js:157', message: '[H2] Error validating product limit', data: { errorMessage: error.message, errorStack: error.stack?.substring(0, 200) }, timestamp: Date.now() });
        logger.error('Erro ao validar limite de produtos:', error);
        return errorResponse(res, 'Erro ao validar limite de produtos', 500, 'VALIDATION_ERROR');
      }
    }
  }
  
  // Validar limite de pedidos
  if (String(entity).toLowerCase() === 'order' && !req.user?.is_master) {
    const subscriberEmail = createOpts.forSubscriberEmail || data.owner_email || (req.user?.subscriber_email || req.user?.email);
    if (subscriberEmail) {
      try {
        const orderLimit = await validateOrdersPerDayLimit(subscriberEmail, req.user?.is_master);
        if (!orderLimit.valid) {
          return errorResponse(res,
            orderLimit.error || `Limite de pedidos por dia excedido. Você já criou ${orderLimit.current} pedido(s) hoje. Seu plano permite ${orderLimit.limit} pedido(s) por dia.`,
            403,
            'ORDER_LIMIT_EXCEEDED',
            { limit: orderLimit.limit, current: orderLimit.current }
          );
        }
      } catch (error) {
        logger.error('Erro ao validar limite de pedidos:', error);
        return errorResponse(res, 'Erro ao validar limite de pedidos', 500, 'VALIDATION_ERROR');
      }
    }
  }
  
  // Criar entidade
  let newItem;
  agentLog({ location: 'entities.routes.js:177', message: '[H1] Creating entity', data: { entity, subscriberEmail: createOpts.forSubscriberEmail || data.owner_email || req.user?.subscriber_email, usePostgreSQL: usePostgreSQL() }, timestamp: Date.now() });
  try {
    if (usePostgreSQL()) {
      newItem = await repo.createEntity(entity, data, req.user, createOpts);
      agentLog({ location: 'entities.routes.js:181', message: '[H1] Entity created successfully', data: { entity, newItemId: newItem?.id }, timestamp: Date.now() });
    } else {
      const { getDb, getSaveDatabaseDebounced } = await import('../../config/appConfig.js');
      const db = getDb();
      const saveDatabaseDebounced = getSaveDatabaseDebounced();
      
      if (db && db.entities) {
        if (!db.entities[entity]) db.entities[entity] = [];
        const now = new Date().toISOString();
        newItem = {
          id: String(Date.now()),
          ...data,
          created_at: now,
          created_date: now,
          updated_at: now
        };
        db.entities[entity].push(newItem);
        if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
      } else {
        return errorResponse(res, 'Banco de dados não inicializado', 500);
      }
    }
  } catch (error) {
    agentLog({ location: 'entities.routes.js:199', message: '[H1] Error creating entity', data: { entity, errorMessage: error.message, errorStack: error.stack?.substring(0, 200) }, timestamp: Date.now() });
    logger.error(`❌ Erro ao criar ${entity}:`, error);
    throw error; // Re-throw para o errorHandler
  }
  
  // Emitir eventos WebSocket (não bloqueante - não deve falhar a criação)
  agentLog({ location: 'entities.routes.js:234', message: '[H2] Before WebSocket emit', data: { entity, newItemId: newItem?.id }, timestamp: Date.now() });
  try {
    if (String(entity).toLowerCase() === 'order') {
      emitOrderCreated(newItem);
    } else if (String(entity).toLowerCase() === 'comanda') {
      emitComandaCreated(newItem);
    }
  } catch (wsError) {
    agentLog({ location: 'entities.routes.js:240', message: '[H2] WebSocket error caught', data: { entity, errorMessage: wsError.message }, timestamp: Date.now() });
    // Log mas não falhar a criação por causa do WebSocket
    logger.warn(`⚠️ Erro ao emitir evento WebSocket para ${entity}:`, wsError.message);
  }
  
  logger.info(`✅ [${entity}] Item criado:`, { id: newItem.id });

  agentLog({ location: 'entities.routes.js:254', message: '[H2] Before createdResponse', data: { entity, newItemId: newItem?.id, newItemKeys: Object.keys(newItem || {}), newItemType: typeof newItem, hasCircular: JSON.stringify(newItem).includes('"[Circular]"') }, timestamp: Date.now() });
  try {
    // Tentar serializar newItem para verificar se há problema
    JSON.stringify(newItem);
    return createdResponse(res, newItem);
  } catch (responseError) {
    agentLog({ location: 'entities.routes.js:260', message: '[H2] Error serializing or sending response', data: { entity, errorMessage: responseError.message, errorStack: responseError.stack?.substring(0, 200), errorName: responseError.name }, timestamp: Date.now() });
    logger.error(`❌ Erro ao enviar resposta de criação para ${entity}:`, responseError);
    throw responseError; // Re-throw para o errorHandler
  }
}));

/**
 * Atualizar entidade
 */
router.put('/:entity/:id', asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const data = req.body;
  const asSub = req.query.as_subscriber;
  
  if (req.user?.is_master && asSub) {
    req.user._contextForSubscriber = asSub;
  }
  
  // Validar transição de status para pedidos
  if (String(entity).toLowerCase() === 'order' && data.status) {
    agentLog({ location: 'entities.routes.js:237', message: '[H4] Validating order status transition', data: { orderId: id, newStatus: data.status, userRole: req.user?.profile_role, isMaster: req.user?.is_master }, timestamp: Date.now() });

    // Verificar permissão para alterar status (apenas admin, gestor_pedidos ou master)
    agentLog({ location: 'entities.routes.js:255', message: '[H3] Checking permission for status change', data: { isMaster: req.user?.is_master, profileRole: req.user?.profile_role, userId: req.user?.id }, timestamp: Date.now() });
    if (!req.user?.is_master) {
      const allowedRoles = ['admin', 'gestor_pedidos'];
      const userRole = req.user?.profile_role;
      if (!allowedRoles.includes(userRole)) {
        agentLog({ location: 'entities.routes.js:260', message: '[H3] Permission denied for status change', data: { userRole, allowedRoles }, timestamp: Date.now() });
        return errorResponse(res, 'Acesso negado. Apenas administradores e gestores de pedidos podem alterar o status.', 403, 'PERMISSION_DENIED');
      }
    }
    
    const oldOrder = await repo.getEntityById(entity, id, req.user);
    if (oldOrder && oldOrder.status !== data.status) {
      const validation = validateStatusTransition(oldOrder.status, data.status, { isMaster: req.user?.is_master, userRole: req.user?.profile_role });
      agentLog({ location: 'entities.routes.js:250', message: '[H4] Status transition validation result', data: { oldStatus: oldOrder.status, newStatus: data.status, valid: validation.valid, message: validation.message }, timestamp: Date.now() });
      if (!validation.valid) {
        return errorResponse(res, validation.message, 400, 'INVALID_STATUS_TRANSITION');
      }
    }
  }
  
  const updated = await repo.updateEntity(entity, id, data, req.user);
  
  if (!updated) {
    return notFoundResponse(res, 'Entidade não encontrada');
  }
  
  // Emitir eventos WebSocket
  if (String(entity).toLowerCase() === 'order') {
    emitOrderUpdate(updated);
  }
  
  return successResponse(res, updated, 'Recurso atualizado com sucesso');
}));

/**
 * Deletar entidade
 */
router.delete('/:entity/:id', asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const asSub = req.query.as_subscriber;
  
  if (req.user?.is_master && asSub) {
    req.user._contextForSubscriber = asSub;
  }
  
  const deleted = await repo.deleteEntity(entity, id, req.user);
  
  if (!deleted) {
    return notFoundResponse(res, 'Entidade não encontrada');
  }
  
  return successResponse(res, null, 'Recurso deletado com sucesso');
}));

export default router;
