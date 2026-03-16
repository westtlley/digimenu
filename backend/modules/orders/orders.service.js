/**
 * Orders Service - Lógica de negócio de pedidos
 * Centraliza toda a lógica de gerenciamento de pedidos
 */

import * as repo from '../../db/repository.js';
import { logger } from '../../utils/logger.js';
import { generateTableOrderCode, generateOrderCode, validateOrderData, validateCardapioOrderData, getSubscriberOrMasterBySlug } from './orders.utils.js';
import { emitOrderCreated } from '../../services/websocket.js';
import { usePostgreSQL, getDb, getSaveDatabaseDebounced } from '../../config/appConfig.js';
import { getClient } from '../../db/postgres.js';
import { getPlanPermissions } from '../../utils/plans.js';
import { normalizePlanPresetKey } from '../../utils/planPresetsForContext.js';
import { decorateOrderEntity, normalizeOrderForPersistence } from '../../utils/orderLifecycle.js';

function normalizeNeighborhood(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function parsePermissions(rawPermissions) {
  if (!rawPermissions) return {};
  if (typeof rawPermissions === 'object') return rawPermissions;
  try {
    return JSON.parse(rawPermissions);
  } catch {
    return {};
  }
}

function resolveOrderLimits(plan, rawPermissions) {
  const normalizedPlan = normalizePlanPresetKey(plan, { defaultPlan: 'basic' }) || 'basic';
  if (normalizedPlan === 'custom') {
    const base = getPlanPermissions('ultra') || {};
    const custom = parsePermissions(rawPermissions);
    return {
      limitDay: custom.orders_per_day ?? base.orders_per_day ?? null,
      limitMonth: custom.orders_per_month ?? base.orders_per_month ?? null,
    };
  }

  const permissions = getPlanPermissions(normalizedPlan) || {};
  return {
    limitDay: permissions.orders_per_day ?? null,
    limitMonth: permissions.orders_per_month ?? null,
  };
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (degrees) => degrees * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cria um pedido de mesa (público)
 */
export async function createTableOrder(orderData, slug) {
  if (!usePostgreSQL) {
    throw new Error('Requer PostgreSQL');
  }

  const normalizedSlug = (slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!normalizedSlug) {
    throw new Error('Slug obrigatório');
  }

  // Buscar subscriber ou master pelo slug
  const { subscriber, isMaster, subscriberEmail } = await getSubscriberOrMasterBySlug(normalizedSlug);
  const subscriberId = subscriber?.id ?? null;
  
  if (!subscriber && !isMaster) {
    throw new Error('Link não encontrado');
  }

  // ✅ VALIDAÇÃO ATÔMICA DE LIMITE DE PEDIDOS (PROTEÇÃO CONTRA RACE CONDITIONS)
  // Usar transação PostgreSQL para garantir atomicidade entre validação e criação
  let transactionClient = null;
  try {
    if (!isMaster && subscriberEmail) {
      transactionClient = await getClient();
      await transactionClient.query('BEGIN');

      // Validar limite dentro da transação (lock pessimista)
      const subscriberResult = await transactionClient.query(`
        SELECT plan, permissions FROM subscribers WHERE email = $1
      `, [subscriberEmail]);

      if (subscriberResult.rows.length === 0) {
        await transactionClient.query('ROLLBACK');
        throw new Error('Assinante não encontrado');
      }

      const subscriberRow = subscriberResult.rows[0];
      const { limitDay, limitMonth } = resolveOrderLimits(subscriberRow.plan, subscriberRow.permissions);

      if (limitDay === null || limitDay === undefined) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const countResult = await transactionClient.query(`
          SELECT COUNT(*) as count
          FROM entities
          WHERE entity_type = 'Order'
            AND (
              ($3::int IS NOT NULL AND subscriber_id = $3)
              OR subscriber_email = $1
            )
            AND created_at >= $2
        `, [subscriberEmail, firstDayOfMonth.toISOString(), subscriberId]);

        const currentCount = parseInt(countResult.rows[0].count);

        if (limitMonth !== -1 && limitMonth !== null && limitMonth !== undefined && currentCount >= limitMonth) {
          await transactionClient.query('ROLLBACK');
          throw new Error(
            `Limite de pedidos por mês excedido. Você já criou ${currentCount} pedidos este mês. ` +
            `Seu plano permite ${limitMonth} pedidos por mês. ` +
            `Faça upgrade do plano para aumentar o limite.`
          );
        }
      } else if (limitDay !== -1) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const countResult = await transactionClient.query(`
          SELECT COUNT(*) as count
          FROM entities
          WHERE entity_type = 'Order'
            AND (
              ($3::int IS NOT NULL AND subscriber_id = $3)
              OR subscriber_email = $1
            )
            AND DATE(created_at) = DATE($2)
        `, [subscriberEmail, today.toISOString(), subscriberId]);

        const currentCount = parseInt(countResult.rows[0].count);

        if (currentCount >= limitDay) {
          await transactionClient.query('ROLLBACK');
          throw new Error(
            `Limite de pedidos por dia excedido. Você já criou ${currentCount} pedidos hoje. ` +
            `Seu plano permite ${limitDay} pedidos por dia. ` +
            `Faça upgrade do plano para aumentar o limite.`
          );
        }
      }
    }

    // Validar dados do pedido
    const validationErrors = validateOrderData(orderData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Preparar dados do pedido
    const tableNumber = orderData.table_number;
    const tableId = orderData.table_id;
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const total = Number(orderData.total) || 0;
    const customerName = orderData.customer_name || '';
    const customerPhone = (orderData.customer_phone || '').replace(/\D/g, '');
    const customerEmail = orderData.customer_email || '';
    const observations = orderData.observations || '';

    const order_code = generateTableOrderCode(tableNumber);

    const finalOrderData = normalizeOrderForPersistence({
      order_code,
      items,
      total,
      table_id: tableId,
      table_number: tableNumber,
      delivery_type: 'table',
      source: 'public',
      status: 'new',
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      observations: observations || null,
      created_date: new Date().toISOString()
    });

    let newOrder;

    if (transactionClient) {
      const result = await transactionClient.query(`
        INSERT INTO entities (entity_type, data, subscriber_email, subscriber_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, subscriber_id, subscriber_email, data, created_at, updated_at
      `, [
        'Order',
        JSON.stringify(finalOrderData),
        subscriberEmail,
        subscriberId
      ]);

      const row = result.rows[0];
      newOrder = decorateOrderEntity({
        id: row.id.toString(),
        subscriber_id: row.subscriber_id ?? subscriberId,
        subscriber_email: row.subscriber_email ?? subscriberEmail,
        ...finalOrderData,
        created_at: row.created_at,
        created_date: row.created_at || finalOrderData.created_date,
        updated_at: row.updated_at
      });

      await transactionClient.query('COMMIT');
      transactionClient.release();
      transactionClient = null;
    } else {
      newOrder = await repo.createEntity('Order', finalOrderData, null, {
        forSubscriberEmail: subscriberEmail,
        forSubscriberId: subscriberId,
      });
    }

    if (typeof emitOrderCreated === 'function') {
      emitOrderCreated(newOrder);
    }

    logger.info(`✅ Pedido de mesa criado: ${order_code}`, {
      table_number: tableNumber,
      subscriber_email: subscriberEmail || 'master',
      items_count: items.length
    });

    return newOrder;
  } catch (error) {
    if (transactionClient) {
      await transactionClient.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (transactionClient) {
      transactionClient.release();
      transactionClient = null;
    }
  }
}

/**
 * Cria pedido de cardápio (entrega ou retirada) - rota pública por slug
 */
export async function createCardapioOrder(orderData, slug) {
  if (!usePostgreSQL) throw new Error('Requer PostgreSQL');

  const normalizedSlug = (slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!normalizedSlug) throw new Error('Slug obrigatório');

  const { subscriber, subscriberEmail } = await getSubscriberOrMasterBySlug(normalizedSlug);
  const subscriberId = subscriber?.id ?? null;
  if (!subscriber) throw new Error('Link não encontrado');

  const validationErrors = validateCardapioOrderData(orderData);
  if (validationErrors.length > 0) throw new Error(validationErrors.join(', '));

  const [stores, deliveryZones] = await Promise.all([
    repo.listEntitiesForSubscriber('Store', subscriberEmail, null),
    repo.listEntitiesForSubscriber('DeliveryZone', subscriberEmail, null)
  ]);
  const store = Array.isArray(stores) && stores[0] ? stores[0] : {};
  const zones = Array.isArray(deliveryZones) ? deliveryZones : [];

  const deliveryMethod = orderData.delivery_method || 'pickup';
  const neighborhood = orderData.neighborhood || null;
  const customerLat = toNumber(orderData.customer_latitude, null);
  const customerLng = toNumber(orderData.customer_longitude, null);

  let matchedZone = null;
  let calculatedDeliveryFee = 0;

  if (deliveryMethod === 'delivery') {
    const isDistanceMode = store?.delivery_fee_mode === 'distance';
    const storeLat = toNumber(store?.latitude, null);
    const storeLng = toNumber(store?.longitude, null);

    if (
      isDistanceMode &&
      Number.isFinite(customerLat) &&
      Number.isFinite(customerLng) &&
      Number.isFinite(storeLat) &&
      Number.isFinite(storeLng)
    ) {
      const distanceKm = calculateDistanceKm(storeLat, storeLng, customerLat, customerLng);
      const baseFee = toNumber(store?.delivery_base_fee, 0);
      const pricePerKm = toNumber(store?.delivery_price_per_km, 0);
      const minFee = toNumber(store?.delivery_min_fee, 0);
      const maxFee = store?.delivery_max_fee == null ? null : toNumber(store.delivery_max_fee, null);
      const freeDistance = store?.delivery_free_distance == null ? null : toNumber(store.delivery_free_distance, null);

      if (freeDistance != null && distanceKm <= freeDistance) {
        calculatedDeliveryFee = 0;
      } else {
        let fee = baseFee + (distanceKm * pricePerKm);
        if (fee < minFee) fee = minFee;
        if (maxFee != null && fee > maxFee) fee = maxFee;
        calculatedDeliveryFee = roundMoney(fee);
      }
    } else {
      const neighborhoodKey = normalizeNeighborhood(neighborhood);
      matchedZone = zones.find(
        (z) => normalizeNeighborhood(z?.neighborhood) === neighborhoodKey && z?.is_active
      ) || null;
      calculatedDeliveryFee = roundMoney(
        matchedZone ? toNumber(matchedZone.fee, 0) : toNumber(store?.delivery_fee, 0)
      );
    }
  }

  const subtotal = roundMoney(toNumber(orderData.subtotal, 0));
  const discount = roundMoney(toNumber(orderData.discount, 0));
  const storeMinOrder = toNumber(
    store?.min_order_value ?? store?.min_order ?? store?.min_order_price ?? store?.delivery_min_order ?? 0,
    0
  );
  const zoneMinOrder = toNumber(matchedZone?.min_order ?? matchedZone?.min_order_value, 0);
  const minimumOrderValue = Math.max(storeMinOrder, zoneMinOrder);

  if (deliveryMethod === 'delivery' && minimumOrderValue > 0 && subtotal < minimumOrderValue) {
    throw new Error(`Pedido mínimo para entrega é R$ ${minimumOrderValue.toFixed(2)}`);
  }

  const total = roundMoney(Math.max(0, subtotal - discount + calculatedDeliveryFee));

  const order_code = generateOrderCode();
  const finalOrderData = normalizeOrderForPersistence({
    order_code,
    customer_name: (orderData.customer_name || '').trim(),
    customer_phone: String(orderData.customer_phone || '').replace(/\D/g, ''),
    customer_email: orderData.customer_email || null,
    created_by: orderData.created_by || orderData.customer_email || null,
    delivery_method: deliveryMethod,
    address: orderData.address || null,
    address_street: orderData.address_street || null,
    address_number: orderData.address_number || null,
    address_complement: orderData.address_complement || null,
    neighborhood: orderData.neighborhood || null,
    payment_method: orderData.payment_method || 'pix',
    needs_change: !!orderData.needs_change,
    change_amount: orderData.needs_change && orderData.change_amount ? parseFloat(orderData.change_amount) : null,
    customer_latitude: Number.isFinite(customerLat) ? customerLat : null,
    customer_longitude: Number.isFinite(customerLng) ? customerLng : null,
    items: Array.isArray(orderData.items) ? orderData.items : [],
    subtotal,
    delivery_fee: calculatedDeliveryFee,
    discount,
    total,
    status: 'new',
    source: 'public',
    created_date: new Date().toISOString(),
    owner_email: subscriberEmail
  });

  let transactionClient = null;
  try {
    if (subscriberEmail) {
      transactionClient = await getClient();
      await transactionClient.query('BEGIN');

      const subResult = await transactionClient.query('SELECT plan, permissions FROM subscribers WHERE email = $1', [subscriberEmail]);
      if (subResult.rows.length === 0) {
        await transactionClient.query('ROLLBACK');
        throw new Error('Assinante não encontrado');
      }
      const subscriberRow = subResult.rows[0];
      const { limitDay, limitMonth } = resolveOrderLimits(subscriberRow.plan, subscriberRow.permissions);

      if (limitDay !== -1 && limitDay != null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const countResult = await transactionClient.query(
          `SELECT COUNT(*) as count
           FROM entities
           WHERE entity_type = 'Order'
             AND (
               ($3::int IS NOT NULL AND subscriber_id = $3)
               OR subscriber_email = $1
             )
             AND DATE(created_at) = DATE($2)`,
          [subscriberEmail, today.toISOString(), subscriberId]
        );
        const currentCount = parseInt(countResult.rows[0].count);
        if (currentCount >= limitDay) {
          await transactionClient.query('ROLLBACK');
          throw new Error(`Limite de pedidos do dia excedido (${limitDay}/dia). Faça upgrade para aumentar.`);
        }
      }
      if (limitMonth !== -1 && limitMonth != null) {
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const countResult = await transactionClient.query(
          `SELECT COUNT(*) as count
           FROM entities
           WHERE entity_type = 'Order'
             AND (
               ($3::int IS NOT NULL AND subscriber_id = $3)
               OR subscriber_email = $1
             )
             AND created_at >= $2`,
          [subscriberEmail, firstDay.toISOString(), subscriberId]
        );
        const currentCount = parseInt(countResult.rows[0].count);
        if (currentCount >= limitMonth) {
          await transactionClient.query('ROLLBACK');
          throw new Error(`Limite de pedidos do mês excedido (${limitMonth}/mês).`);
        }
      }
    }

    let newOrder;
    if (transactionClient) {
      const insertResult = await transactionClient.query(
        `INSERT INTO entities (entity_type, data, subscriber_email, subscriber_id) VALUES ($1, $2, $3, $4) RETURNING id, subscriber_id, subscriber_email, data, created_at, updated_at`,
        ['Order', JSON.stringify(finalOrderData), subscriberEmail, subscriberId]
      );
      const row = insertResult.rows[0];
      newOrder = decorateOrderEntity({
        id: row.id.toString(),
        subscriber_id: row.subscriber_id ?? subscriberId,
        subscriber_email: row.subscriber_email ?? subscriberEmail,
        ...finalOrderData,
        created_at: row.created_at,
      });
    } else {
      newOrder = await repo.createEntity('Order', finalOrderData, null, {
        forSubscriberEmail: subscriberEmail,
        forSubscriberId: subscriberId,
      });
    }

    if (transactionClient) {
      await transactionClient.query('COMMIT');
      transactionClient.release();
      transactionClient = null;
    }

    if (typeof emitOrderCreated === 'function') emitOrderCreated(newOrder);
    logger.info(`Pedido cardápio criado: ${order_code}`, { subscriber_email: subscriberEmail });
    return newOrder;
  } catch (err) {
    if (transactionClient) {
      await transactionClient.query('ROLLBACK').catch(() => {});
      transactionClient.release();
      transactionClient = null;
    }
    throw err;
  }
}
