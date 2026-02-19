/**
 * Orders Service - Lógica de negócio de pedidos
 * Centraliza toda a lógica de gerenciamento de pedidos
 */

import * as repo from '../../db/repository.js';
import { logger } from '../../utils/logger.js';
import { generateTableOrderCode, generateOrderCode, validateOrderData, validateCardapioOrderData, getSubscriberOrMasterBySlug } from './orders.utils.js';
import { emitOrderCreated } from '../../services/websocket.js';
import { usePostgreSQL, getDb, getSaveDatabaseDebounced } from '../../config/appConfig.js';
import { validateOrdersPerDayLimit, validateOrdersPerMonthLimit } from '../../services/planValidation.service.js';
import { getClient } from '../../db/postgres.js';

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
        SELECT plan FROM subscribers WHERE email = $1
      `, [subscriberEmail]);

      if (subscriberResult.rows.length === 0) {
        await transactionClient.query('ROLLBACK');
        throw new Error('Assinante não encontrado');
      }

      const plan = subscriberResult.rows[0].plan;
      const { getPlanPermissions } = await import('../../utils/plans.js');
      const permissions = getPlanPermissions(plan);
      const limitDay = permissions.orders_per_day;
      const limitMonth = permissions.orders_per_month;

      if (limitDay === null || limitDay === undefined) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        firstDayOfMonth.setHours(0, 0, 0, 0);

        const countResult = await transactionClient.query(`
          SELECT COUNT(*) as count
          FROM entities
          WHERE entity_type = 'Order'
            AND subscriber_email = $1
            AND created_at >= $2
        `, [subscriberEmail, firstDayOfMonth.toISOString()]);

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
            AND subscriber_email = $1
            AND DATE(created_at) = DATE($2)
        `, [subscriberEmail, today.toISOString()]);

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

    const finalOrderData = {
      order_code,
      items,
      total,
      table_id: tableId,
      table_number: tableNumber,
      delivery_type: 'table',
      status: 'new',
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      observations: observations || null,
      created_date: new Date().toISOString()
    };

    let newOrder;

    if (transactionClient) {
      const result = await transactionClient.query(`
        INSERT INTO entities (entity_type, data, subscriber_email)
        VALUES ($1, $2, $3)
        RETURNING id, data, created_at, updated_at
      `, [
        'Order',
        JSON.stringify(finalOrderData),
        subscriberEmail
      ]);

      const row = result.rows[0];
      newOrder = {
        id: row.id.toString(),
        ...finalOrderData,
        created_at: row.created_at,
        created_date: row.created_at || finalOrderData.created_date,
        updated_at: row.updated_at
      };

      await transactionClient.query('COMMIT');
      transactionClient.release();
      transactionClient = null;
    } else {
      newOrder = await repo.createEntity('Order', finalOrderData, null, {
        forSubscriberEmail: subscriberEmail
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
  if (!subscriber) throw new Error('Link não encontrado');

  const validationErrors = validateCardapioOrderData(orderData);
  if (validationErrors.length > 0) throw new Error(validationErrors.join(', '));

  const order_code = generateOrderCode();
  const finalOrderData = {
    order_code,
    customer_name: (orderData.customer_name || '').trim(),
    customer_phone: String(orderData.customer_phone || '').replace(/\D/g, ''),
    customer_email: orderData.customer_email || null,
    created_by: orderData.created_by || orderData.customer_email || null,
    delivery_method: orderData.delivery_method || 'pickup',
    address: orderData.address || null,
    address_street: orderData.address_street || null,
    address_number: orderData.address_number || null,
    address_complement: orderData.address_complement || null,
    neighborhood: orderData.neighborhood || null,
    payment_method: orderData.payment_method || 'pix',
    needs_change: !!orderData.needs_change,
    change_amount: orderData.needs_change && orderData.change_amount ? parseFloat(orderData.change_amount) : null,
    items: Array.isArray(orderData.items) ? orderData.items : [],
    subtotal: Number(orderData.subtotal) || 0,
    delivery_fee: Number(orderData.delivery_fee) || 0,
    discount: Number(orderData.discount) || 0,
    total: Number(orderData.total) || 0,
    status: 'new',
    created_date: new Date().toISOString(),
    owner_email: subscriberEmail
  };

  let transactionClient = null;
  try {
    if (subscriberEmail) {
      transactionClient = await getClient();
      await transactionClient.query('BEGIN');

      const { validateOrdersPerDayLimit, validateOrdersPerMonthLimit } = await import('../../services/planValidation.service.js');
      const { getPlanPermissions } = await import('../../utils/plans.js');
      const subResult = await transactionClient.query('SELECT plan FROM subscribers WHERE email = $1', [subscriberEmail]);
      if (subResult.rows.length === 0) {
        await transactionClient.query('ROLLBACK');
        throw new Error('Assinante não encontrado');
      }
      const plan = subResult.rows[0].plan;
      const permissions = getPlanPermissions(plan);
      const limitDay = permissions.orders_per_day;
      const limitMonth = permissions.orders_per_month;

      if (limitDay !== -1 && limitDay != null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const countResult = await transactionClient.query(
          `SELECT COUNT(*) as count FROM entities WHERE entity_type = 'Order' AND subscriber_email = $1 AND DATE(created_at) = DATE($2)`,
          [subscriberEmail, today.toISOString()]
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
          `SELECT COUNT(*) as count FROM entities WHERE entity_type = 'Order' AND subscriber_email = $1 AND created_at >= $2`,
          [subscriberEmail, firstDay.toISOString()]
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
        `INSERT INTO entities (entity_type, data, subscriber_email) VALUES ($1, $2, $3) RETURNING id, data, created_at, updated_at`,
        ['Order', JSON.stringify(finalOrderData), subscriberEmail]
      );
      const row = insertResult.rows[0];
      newOrder = { id: row.id.toString(), ...finalOrderData, created_at: row.created_at };
    } else {
      newOrder = await repo.createEntity('Order', finalOrderData, null, { forSubscriberEmail: subscriberEmail });
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
