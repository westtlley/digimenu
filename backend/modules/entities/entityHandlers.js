import { sanitizeForLog } from '../../middlewares/security.js';
import {
  validateOrdersPerDayLimit,
  validateProductsLimit,
} from '../../services/planValidation.service.js';
import { validateOrderAxisTransition } from '../../services/orderStatusValidation.service.js';
import {
  decorateOrderEntity,
  normalizeOrderForPersistence,
} from '../../utils/orderLifecycle.js';
import { normalizeEntityName } from './entityAccessConfig.js';

function findLocalSubscriberByEmail(db, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;
  return db?.subscribers?.find(
    (subscriber) => String(subscriber?.email || '').trim().toLowerCase() === normalizedEmail
  ) || null;
}

async function findSubscriberByEmail({ repo, db, usePostgreSQL }, email) {
  if (!email) return null;
  if (usePostgreSQL) {
    return repo.getSubscriberByEmail(email);
  }
  return findLocalSubscriberByEmail(db, email);
}

async function findScopedUserSubscriber({ repo, db, usePostgreSQL }, req) {
  const subscriberEmail =
    req.user?._contextForSubscriber || req.user?.subscriber_email || req.user?.email;
  if (!subscriberEmail) return null;

  if (usePostgreSQL) {
    if (req.user?._contextForSubscriberId) {
      return repo.getSubscriberById(req.user._contextForSubscriberId);
    }
    return repo.getSubscriberByEmail(subscriberEmail);
  }

  return findLocalSubscriberByEmail(db, subscriberEmail);
}

function buildPagination(page, limit) {
  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 50,
  };
}

function sortItems(items, orderBy) {
  if (!orderBy) return items;

  const desc = orderBy.startsWith('-');
  const field = desc ? orderBy.replace(/^-/, '') : orderBy;
  const getValue = (item) => {
    const value = item[field] ?? item.created_at ?? item.created_date;
    return value ? new Date(value).getTime() : 0;
  };

  return [...items].sort((a, b) => {
    const aVal = getValue(a);
    const bVal = getValue(b);
    if (aVal < bVal) return desc ? 1 : -1;
    if (aVal > bVal) return desc ? -1 : 1;
    return 0;
  });
}

function applyMemoryFilters(items, filters = {}) {
  if (Object.keys(filters).length === 0) return items;
  return items.filter((item) =>
    Object.entries(filters).every(([key, value]) =>
      (value === 'null' || value === null)
        ? (item[key] === null || item[key] === undefined)
        : item[key] == value
    )
  );
}

function paginateItems(items, pagination) {
  const total = items.length;
  const start = (pagination.page - 1) * pagination.limit;
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    items: items.slice(start, start + pagination.limit),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  };
}

export function createEntityHandlers({
  repo,
  db,
  usePostgreSQL,
  saveDatabaseDebounced,
  applyRequestedTenantScope,
  enforceEntityReadAccess,
  enforceEntityWriteAccess,
  parseSubscriberPermissionMap,
  applyBasicScopeToEntityResult,
  applyBasicScopeFilterToItems,
  enforceOrderOperationalStatusContract,
  upsertComandaProductionOrder,
  emitOrderCreated,
  emitOrderUpdate,
  emitComandaCreated,
  emitComandaUpdate,
  emitTableUpdate,
}) {
  async function listEntities(req, res) {
    try {
      const { entity } = req.params;
      const entityNorm = normalizeEntityName(entity);
      const shouldTraceEntity = entityNorm === 'dish' || entityNorm === 'category';
      const { order_by, as_subscriber, as_subscriber_id, page, limit, ...filters } = req.query;
      const scopedTenant = await applyRequestedTenantScope(req, {
        subscriberId: as_subscriber_id,
        subscriberEmail: as_subscriber,
      });
      if (shouldTraceEntity) {
        console.log('[ENTITY_LIST_DIAG] request', {
          entity: entityNorm,
          as_subscriber: as_subscriber || null,
          as_subscriber_id: as_subscriber_id || null,
          scopedTenant,
          user: {
            email: req.user?.email || null,
            subscriber_email: req.user?.subscriber_email || null,
            subscriber_id: req.user?.subscriber_id ?? null,
            is_master: req.user?.is_master === true,
            profile_role: req.user?.profile_role || null,
            context_subscriber: req.user?._contextForSubscriber || null,
            context_subscriber_id: req.user?._contextForSubscriberId ?? null,
          },
          filters,
        });
      }
      const entityReadGuard = await enforceEntityReadAccess(req, res, entity, {
        owner_email: filters.owner_email || scopedTenant?.subscriberEmail || as_subscriber,
      });
      if (!entityReadGuard.allowed) return;

      const pagination = buildPagination(page, limit);
      let result;

      if (usePostgreSQL) {
        // No PostgreSQL, o tenant scoping do repositório já usa subscriber_id/subscriber_email
        // e ainda cobre owner_email legado como compatibilidade. Forçar owner_email aqui
        // volta a esconder registros antigos que pertencem ao assinante, mas ficaram com
        // owner_email divergente ou nulo após as migrações.
        result = await repo.listEntities(entity, filters, order_by, req.user || null, pagination);
      } else if (db && db.entities) {
        let items = db.entities[entity] || [];
        if (req.user?.is_master && as_subscriber) {
          items = items.filter((item) => item.owner_email === as_subscriber);
        } else if (req.user?.is_master || !req.user) {
          items = items.filter((item) => !item.owner_email);
        } else {
          const subscriber = db.subscribers?.find((item) => item.email === req.user.email);
          items = subscriber
            ? items.filter((item) => !item.owner_email || item.owner_email === subscriber.email)
            : [];
        }

        items = applyMemoryFilters(items, filters);
        items = sortItems(items, order_by);
        result = paginateItems(items, pagination);
      } else {
        return res.status(500).json({ error: 'Banco de dados nao inicializado' });
      }

      if (!req.user?.is_master && entityReadGuard?.subscriber && (entityNorm === 'dish' || entityNorm === 'combo')) {
        const permissionMap =
          entityReadGuard.permissionMap || parseSubscriberPermissionMap(entityReadGuard.subscriber);
        result = applyBasicScopeToEntityResult(entityNorm, result, permissionMap);
      }

      if (shouldTraceEntity) {
        const itemCount = Array.isArray(result?.items)
          ? result.items.length
          : Array.isArray(result)
            ? result.length
            : 0;
        const sampleItems = Array.isArray(result?.items)
          ? result.items.slice(0, 3)
          : Array.isArray(result)
            ? result.slice(0, 3)
            : [];
        console.log('[ENTITY_LIST_DIAG] result', {
          entity: entityNorm,
          count: itemCount,
          sample: sampleItems.map((item) => ({
            id: item?.id ?? null,
            name: item?.name ?? null,
            category_id: item?.category_id ?? null,
            product_type: item?.product_type ?? null,
            owner_email: item?.owner_email ?? null,
            subscriber_email: item?.subscriber_email ?? null,
          })),
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Erro ao listar entidades:', sanitizeForLog({ error: error.message }));
      throw error;
    }
  }

  async function getEntityById(req, res) {
    try {
      const { entity, id } = req.params;
      const entityNorm = normalizeEntityName(entity);
      const asSub = req.query.as_subscriber;
      const asSubId = req.query.as_subscriber_id;
      const scopedTenant = await applyRequestedTenantScope(req, {
        subscriberId: asSubId,
        subscriberEmail: asSub,
      });
      const entityReadGuard = await enforceEntityReadAccess(req, res, entity, {
        owner_email: scopedTenant?.subscriberEmail || asSub || req.query.owner_email,
      });
      if (!entityReadGuard.allowed) return;

      let item;
      if (usePostgreSQL) {
        item = await repo.getEntityById(entity, id, req.user);
      } else if (db?.entities?.[entity]) {
        const items = db.entities[entity];
        item =
          items.find(
            (entry) =>
              (entry.id === id || entry.id === String(id)) &&
              (!asSub || entry.owner_email === asSub)
          ) || null;
      } else {
        item = null;
      }

      if (!item) return res.status(404).json({ error: 'Entidade nao encontrada' });

      if (!req.user?.is_master && entityReadGuard?.subscriber && (entityNorm === 'dish' || entityNorm === 'combo')) {
        const permissionMap =
          entityReadGuard.permissionMap || parseSubscriberPermissionMap(entityReadGuard.subscriber);
        const filtered = applyBasicScopeFilterToItems(entityNorm, [item], permissionMap);
        if (!filtered.length) {
          return res.status(404).json({ error: 'Entidade nao encontrada' });
        }
      }

      res.json(item);
    } catch (error) {
      console.error('Erro ao obter entidade:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }

  async function createEntity(req, res) {
    const { entity } = req.params;
    const entityNorm = String(entity).toLowerCase();
    let data = { ...req.body };
    const asSub = data.as_subscriber || req.query.as_subscriber;
    const asSubId = data.as_subscriber_id || req.query.as_subscriber_id;
    const createOpts = {};
    const scopedTenant = await applyRequestedTenantScope(req, {
      subscriberId: asSubId,
      subscriberEmail: asSub,
    });

    delete data.as_subscriber;
    delete data.as_subscriber_id;

    if (scopedTenant?.subscriberEmail) {
      data.owner_email = data.owner_email || scopedTenant.subscriberEmail;
      createOpts.forSubscriberEmail = scopedTenant.subscriberEmail;
      createOpts.forSubscriberId = scopedTenant.subscriberId || null;
    }

    if (!req.user?.is_master) {
      const subscriber = await findScopedUserSubscriber({ repo, db, usePostgreSQL }, req);
      if (subscriber) {
        if (!data.owner_email) data.owner_email = subscriber.email;
        createOpts.forSubscriberEmail = subscriber.email;
        createOpts.forSubscriberId = subscriber.id;
      }
    }

    if (data.owner_email && !createOpts.forSubscriberEmail) {
      const ownerSubscriber = await findSubscriberByEmail(
        { repo, db, usePostgreSQL },
        data.owner_email
      );
      if (ownerSubscriber) {
        createOpts.forSubscriberEmail = ownerSubscriber.email;
        createOpts.forSubscriberId = ownerSubscriber.id;
      } else if (entityNorm === 'order') {
        return res.status(400).json({
          error:
            'owner_email nao e um assinante valido. Pedido do cardapio por link precisa do dono do cardapio.',
        });
      }
    }

    const entityCreateGuard = await enforceEntityWriteAccess(req, res, entity, 'POST', data);
    if (!entityCreateGuard.allowed) return;
    data = entityCreateGuard.sanitizedPayload;

    if (entityNorm === 'order') {
      data = normalizeOrderForPersistence(data);
    }

    if (entityNorm === 'dish' && !req.user?.is_master) {
      const subscriberEmail =
        createOpts.forSubscriberEmail || data.owner_email || req.user?.subscriber_email || req.user?.email;
      if (subscriberEmail) {
        const productLimit = await validateProductsLimit(subscriberEmail, null, req.user?.is_master);
        if (!productLimit.valid) {
          return res.status(403).json({
            error: productLimit.error || 'Limite de produtos excedido.',
            code: 'PRODUCT_LIMIT_EXCEEDED',
            limit: productLimit.limit,
            current: productLimit.current,
          });
        }
      }
    }

    if (entityNorm === 'order' && !req.user?.is_master) {
      const subscriberEmail =
        createOpts.forSubscriberEmail || data.owner_email || req.user?.subscriber_email || req.user?.email;
      if (subscriberEmail) {
        const orderLimit = await validateOrdersPerDayLimit(subscriberEmail, req.user?.is_master);
        if (!orderLimit.valid) {
          return res.status(403).json({
            error: orderLimit.error || 'Limite de pedidos por dia excedido.',
            code: 'ORDER_LIMIT_EXCEEDED',
            limit: orderLimit.limit,
            current: orderLimit.current,
          });
        }
      }
    }

    if (String(entity) === 'Comanda' && !(data.code && String(data.code).trim())) {
      const owner = createOpts.forSubscriberEmail || data.owner_email || null;
      data.code =
        usePostgreSQL && repo.getNextComandaCode
          ? await repo.getNextComandaCode(owner)
          : 'C-001';
    }

    let newItem;
    if (usePostgreSQL) {
      newItem = await repo.createEntity(entity, data, req.user, createOpts);
    } else if (db && db.entities) {
      if (!db.entities[entity]) db.entities[entity] = [];
      const now = new Date().toISOString();
      newItem =
        entityNorm === 'order'
          ? decorateOrderEntity({
              id: String(Date.now()),
              ...data,
              created_at: now,
              created_date: now,
              updated_at: now,
            })
          : {
              id: String(Date.now()),
              ...data,
              created_at: now,
              created_date: now,
              updated_at: now,
            };
      db.entities[entity].push(newItem);
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco de dados nao inicializado' });
    }

    if (entityNorm === 'comanda') {
      try {
        await upsertComandaProductionOrder(
          newItem,
          req.user,
          createOpts.forSubscriberEmail || data.owner_email || null
        );
      } catch (bridgeError) {
        console.error(
          'Erro ao sincronizar comanda na fila de producao:',
          bridgeError?.message || bridgeError
        );
      }
    }

    if (entityNorm === 'order') emitOrderCreated(newItem);
    else if (entityNorm === 'comanda') emitComandaCreated(newItem);

    console.log(`[${entity}] Item criado:`, newItem.id);
    res.status(201).json(newItem);
  }

  async function updateEntity(req, res) {
    const { entity, id } = req.params;
    const entityNorm = String(entity).toLowerCase();
    let data = req.body;
    const asSub = req.query.as_subscriber;
    const asSubId = req.query.as_subscriber_id;

    await applyRequestedTenantScope(req, {
      subscriberId: asSubId,
      subscriberEmail: asSub,
    });

    const entityUpdateGuard = await enforceEntityWriteAccess(req, res, entity, 'PUT', data);
    if (!entityUpdateGuard.allowed) return;
    data = entityUpdateGuard.sanitizedPayload;

    if (entityNorm === 'subscriber') {
      const idVal = /^\d+$/.test(String(id)) ? parseInt(id, 10) : id;
      const updated = usePostgreSQL
        ? await repo.updateSubscriber(idVal, data)
        : (() => {
            const index = db?.subscribers?.findIndex((subscriber) => subscriber.id == idVal);
            if (index < 0) throw new Error('Assinante nao encontrado');
            const existing = db.subscribers[index];
            const merged = {
              ...existing,
              ...data,
              send_whatsapp_commands:
                data.send_whatsapp_commands ?? existing.whatsapp_auto_enabled,
            };
            db.subscribers[index] = merged;
            if (saveDatabaseDebounced) saveDatabaseDebounced(db);
            return {
              ...merged,
              send_whatsapp_commands: merged.whatsapp_auto_enabled,
            };
          })();
      return res.json(updated);
    }

    if (entityNorm === 'order') {
      const currentOrder = usePostgreSQL
        ? await repo.getEntityById('Order', id, req.user)
        : db?.entities?.Order?.find((item) => item.id === id || item.id === String(id));
      data = normalizeOrderForPersistence(data, currentOrder || {});

      if (currentOrder) {
        const validation = validateOrderAxisTransition(currentOrder, data, {
          isMaster: req.user?.is_master,
          userRole: req.user?.profile_role || req.user?.role,
        });
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: validation.message,
            message: validation.message,
            code: 'INVALID_STATUS_TRANSITION',
          });
        }

        const contractOk = await enforceOrderOperationalStatusContract(
          req,
          res,
          currentOrder,
          data
        );
        if (!contractOk) return;
      }
    }

    let updatedItem;
    if (usePostgreSQL) {
      updatedItem = await repo.updateEntity(entity, id, data, req.user);
      if (!updatedItem) return res.status(404).json({ error: 'Entidade nao encontrada' });
    } else if (db?.entities) {
      const items = db.entities[entity] || [];
      const index = items.findIndex(
        (item) =>
          (item.id === id || item.id === String(id)) &&
          (!asSub || item.owner_email === asSub)
      );
      if (index === -1) return res.status(404).json({ error: 'Entidade nao encontrada' });
      updatedItem =
        entityNorm === 'order'
          ? decorateOrderEntity({
              ...items[index],
              ...data,
              id: items[index].id,
              updated_at: new Date().toISOString(),
            })
          : {
              ...items[index],
              ...data,
              id: items[index].id,
              updated_at: new Date().toISOString(),
            };
      items[index] = updatedItem;
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco de dados nao inicializado' });
    }

    if (entityNorm === 'comanda') {
      try {
        await upsertComandaProductionOrder(
          updatedItem,
          req.user,
          updatedItem?.owner_email || updatedItem?.subscriber_email || null
        );
      } catch (bridgeError) {
        console.error(
          'Erro ao sincronizar atualizacao de comanda na producao:',
          bridgeError?.message || bridgeError
        );
      }
    }

    if (entityNorm === 'order') emitOrderUpdate(updatedItem);
    else if (entityNorm === 'comanda') emitComandaUpdate(updatedItem);
    else if (entityNorm === 'table') emitTableUpdate(updatedItem);

    console.log(`[${entity}] Item atualizado:`, id);
    res.json(updatedItem);
  }

  async function deleteEntity(req, res) {
    const { entity, id } = req.params;
    const asSub = req.query.as_subscriber;
    const asSubId = req.query.as_subscriber_id;

    await applyRequestedTenantScope(req, {
      subscriberId: asSubId,
      subscriberEmail: asSub,
    });

    const entityDeleteGuard = await enforceEntityWriteAccess(req, res, entity, 'DELETE', {});
    if (!entityDeleteGuard.allowed) return;

    let deleted = false;
    if (usePostgreSQL) {
      deleted = await repo.deleteEntity(entity, id, req.user);
    } else if (db?.entities) {
      const items = db.entities[entity] || [];
      const index = items.findIndex(
        (item) =>
          (item.id === id || item.id === String(id)) &&
          (!asSub || item.owner_email === asSub)
      );
      if (index === -1) return res.status(404).json({ error: 'Entidade nao encontrada' });
      items.splice(index, 1);
      deleted = true;
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco de dados nao inicializado' });
    }

    if (!deleted) return res.status(404).json({ error: 'Entidade nao encontrada' });

    console.log(`[${entity}] Item deletado:`, id);
    res.json({ success: true });
  }

  return {
    createEntity,
    deleteEntity,
    getEntityById,
    listEntities,
    updateEntity,
  };
}
