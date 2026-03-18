import { normalizeLower } from '../../utils/orderLifecycle.js';

const COMANDA_PRODUCTION_SYNCABLE_STATUS = new Set(['open']);
const ORDER_FINAL_STATUSES = new Set(['delivered', 'cancelled']);
const COMANDA_ORDER_CANCELLABLE_STATUSES = new Set(['new', 'accepted']);

const roundMoneyValue = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

function buildScopedUserForOwner(user, ownerEmail) {
  if (!user) return null;
  if (user?.is_master && ownerEmail) {
    return { ...user, _contextForSubscriber: ownerEmail };
  }
  return user;
}

function mapComandaItemsToOrderItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const quantity = Math.max(1, Number(item?.quantity) || 1);
      const unitPrice = roundMoneyValue(item?.unit_price ?? 0);
      const totalPrice = roundMoneyValue(item?.total_price ?? (unitPrice * quantity));
      const name = String(item?.dish_name || item?.name || 'Item').trim();
      return {
        dish_id: item?.dish_id || null,
        name: name || 'Item',
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        observations: item?.observations || '',
      };
    })
    .filter((item) => item.quantity > 0);
}

export function createComandaOrderBridge({
  repo,
  db,
  usePostgreSQL,
  emitOrderCreated,
  emitOrderUpdate,
  saveDatabaseDebounced,
}) {
  async function findComandaProductionOrder(comandaId, ownerEmail, scopedUser) {
    if (!comandaId) return null;

    if (usePostgreSQL) {
      const list = await repo.listEntities(
        'Order',
        { source: 'comanda', source_ref_id: String(comandaId) },
        '-created_date',
        scopedUser,
        { page: 1, limit: 1 }
      );
      return Array.isArray(list?.items) ? (list.items[0] || null) : null;
    }

    const orders = Array.isArray(db?.entities?.Order) ? db.entities.Order : [];
    const ownerNorm = normalizeLower(ownerEmail);
    return orders.find((order) =>
      normalizeLower(order?.source) === 'comanda' &&
      String(order?.source_ref_id || '') === String(comandaId) &&
      normalizeLower(order?.owner_email || order?.subscriber_email) === ownerNorm
    ) || null;
  }

  async function upsertComandaProductionOrder(comanda, reqUser, forcedOwnerEmail = null) {
    if (!comanda || typeof comanda !== 'object') return;

    const ownerEmail = normalizeLower(
      forcedOwnerEmail ||
      comanda?.owner_email ||
      comanda?.subscriber_email ||
      reqUser?.subscriber_email ||
      reqUser?.email
    );

    if (!ownerEmail) return;

    const scopedUser = buildScopedUserForOwner(reqUser, ownerEmail);
    const comandaStatus = normalizeLower(comanda?.status || 'open');
    const items = mapComandaItemsToOrderItems(comanda?.items || []);
    const total = roundMoneyValue(items.reduce((sum, item) => sum + roundMoneyValue(item.total_price), 0));
    const canSync = COMANDA_PRODUCTION_SYNCABLE_STATUS.has(comandaStatus) && items.length > 0;

    const linkedOrder = await findComandaProductionOrder(comanda.id, ownerEmail, scopedUser);
    const linkedStatus = normalizeLower(linkedOrder?.status || '');

    if (
      comandaStatus === 'cancelled' &&
      linkedOrder &&
      !ORDER_FINAL_STATUSES.has(linkedStatus) &&
      COMANDA_ORDER_CANCELLABLE_STATUSES.has(linkedStatus)
    ) {
      let cancelledOrder = null;
      if (usePostgreSQL) {
        cancelledOrder = await repo.updateEntity('Order', linkedOrder.id, {
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        }, scopedUser);
      } else {
        const idx = (db?.entities?.Order || []).findIndex((order) => String(order?.id) === String(linkedOrder.id));
        if (idx >= 0) {
          db.entities.Order[idx] = {
            ...db.entities.Order[idx],
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          cancelledOrder = db.entities.Order[idx];
          if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
        }
      }
      if (cancelledOrder) {
        emitOrderUpdate(cancelledOrder);
      }
      return;
    }

    if (
      comandaStatus === 'cancelled' &&
      linkedOrder &&
      !ORDER_FINAL_STATUSES.has(linkedStatus) &&
      !COMANDA_ORDER_CANCELLABLE_STATUSES.has(linkedStatus)
    ) {
      return;
    }

    if (!canSync) return;

    const nowIso = new Date().toISOString();
    const basePayload = {
      owner_email: ownerEmail,
      subscriber_email: ownerEmail,
      source: 'comanda',
      source_ref_id: String(comanda.id),
      comanda_id: String(comanda.id),
      order_code: `CMD-${String(comanda.code || comanda.id)}`,
      delivery_method: 'dine_in',
      table_id: comanda.table_id || null,
      table_number: comanda.table_number || comanda.table_name || null,
      table_name: comanda.table_name || comanda.table_number || null,
      customer_name: comanda.customer_name || 'Cliente Mesa',
      customer_phone: comanda.customer_phone || '',
      observations: comanda.observations || null,
      items,
      subtotal: total,
      discount: 0,
      delivery_fee: 0,
      total,
      created_by: comanda.created_by || reqUser?.email || null,
    };

    if (!linkedOrder) {
      let createdOrder = null;
      if (usePostgreSQL) {
        createdOrder = await repo.createEntity('Order', {
          ...basePayload,
          status: 'new',
          created_date: nowIso,
        }, scopedUser, { forSubscriberEmail: ownerEmail });
      } else {
        const now = new Date().toISOString();
        createdOrder = {
          id: String(Date.now()),
          ...basePayload,
          status: 'new',
          created_date: now,
          created_at: now,
          updated_at: now,
        };
        if (!db.entities.Order) db.entities.Order = [];
        db.entities.Order.push(createdOrder);
        if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
      }
      emitOrderCreated(createdOrder);
      return;
    }

    if (ORDER_FINAL_STATUSES.has(linkedStatus)) return;

    let updatedOrder = null;
    const keepStatus = linkedOrder.status || 'new';
    if (usePostgreSQL) {
      updatedOrder = await repo.updateEntity('Order', linkedOrder.id, {
        ...basePayload,
        status: keepStatus,
        created_date: linkedOrder.created_date || linkedOrder.created_at || nowIso,
      }, scopedUser);
    } else {
      const idx = (db?.entities?.Order || []).findIndex((order) => String(order?.id) === String(linkedOrder.id));
      if (idx >= 0) {
        db.entities.Order[idx] = {
          ...db.entities.Order[idx],
          ...basePayload,
          status: keepStatus,
          updated_at: new Date().toISOString(),
        };
        updatedOrder = db.entities.Order[idx];
        if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
      }
    }

    if (updatedOrder) {
      emitOrderUpdate(updatedOrder);
    }
  }

  return {
    upsertComandaProductionOrder,
  };
}
