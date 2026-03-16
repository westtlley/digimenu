import { getClient } from '../db/postgres.js';
import { decorateOrderEntity, normalizeOrderForPersistence } from '../utils/orderLifecycle.js';

const PAYMENT_METHODS = new Set(['dinheiro', 'pix', 'debito', 'credito', 'outro']);
const PAYMENT_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  debito: 'Débito',
  credito: 'Crédito',
  outro: 'Outro',
};

const normalizeLower = (value = '') => String(value || '').toLowerCase().trim();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;

const isMoneyEqual = (left, right) => Math.abs(roundMoney(left) - roundMoney(right)) <= 0.01;

function createHttpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function mapEntityRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    subscriber_id: row.subscriber_id ?? null,
    subscriber_email: row.subscriber_email ?? null,
    ...row.data,
    created_at: row.created_at,
    created_date: row.created_at || row?.data?.created_date,
    updated_at: row.updated_at,
  };
}

function buildTenantEntityWhere(emailParamRef, subscriberIdParamRef) {
  return `
    (
      (${subscriberIdParamRef}::int IS NOT NULL AND subscriber_id = ${subscriberIdParamRef})
      OR (
        ${emailParamRef} IS NOT NULL
        AND LOWER(TRIM(subscriber_email)) = LOWER(TRIM(${emailParamRef}))
      )
      OR (
        ${emailParamRef} IS NOT NULL
        AND subscriber_email IS NULL
        AND LOWER(TRIM(COALESCE(data->>'owner_email', data->>'subscriber_email', ''))) = LOWER(TRIM(${emailParamRef}))
      )
    )
  `;
}

function normalizePayments(payments = [], total) {
  if (!Array.isArray(payments) || payments.length === 0) {
    throw createHttpError(400, 'payments é obrigatório e deve conter ao menos um pagamento.', 'PAYMENTS_REQUIRED');
  }

  const normalized = payments.map((payment, index) => {
    const method = normalizeLower(payment?.method);
    if (!PAYMENT_METHODS.has(method)) {
      throw createHttpError(400, `Método de pagamento inválido na posição ${index + 1}.`, 'INVALID_PAYMENT_METHOD');
    }

    const amount = roundMoney(payment?.amount);
    if (amount <= 0) {
      throw createHttpError(400, `Valor do pagamento inválido na posição ${index + 1}.`, 'INVALID_PAYMENT_AMOUNT');
    }

    let tendered = payment?.tendered_amount == null ? amount : roundMoney(payment.tendered_amount);
    if (tendered <= 0) {
      throw createHttpError(400, `Valor recebido inválido na posição ${index + 1}.`, 'INVALID_TENDERED_AMOUNT');
    }

    if (method !== 'dinheiro') {
      tendered = amount;
    }

    const change = roundMoney(payment?.change || 0);
    if (change < 0) {
      throw createHttpError(400, `Troco inválido na posição ${index + 1}.`, 'INVALID_CHANGE_AMOUNT');
    }
    if (change > 0 && method !== 'dinheiro') {
      throw createHttpError(400, 'Somente pagamento em dinheiro pode conter troco.', 'CHANGE_ONLY_CASH');
    }

    return {
      method,
      methodLabel: PAYMENT_LABELS[method] || method,
      amount,
      tendered_amount: tendered,
      change,
    };
  });

  const paidTotal = roundMoney(normalized.reduce((sum, payment) => sum + payment.amount, 0));
  if (paidTotal + 0.01 < total) {
    throw createHttpError(400, 'Total dos pagamentos é menor que o total da venda.', 'PAYMENT_NOT_ENOUGH');
  }
  if (paidTotal - total > 0.01) {
    throw createHttpError(400, 'Total dos pagamentos não pode exceder o total da venda.', 'PAYMENT_EXCEEDS_TOTAL');
  }

  const cashPayments = normalized.filter((payment) => payment.method === 'dinheiro');
  const totalCashTendered = roundMoney(cashPayments.reduce((sum, payment) => sum + payment.tendered_amount, 0));
  const totalCashApplied = roundMoney(cashPayments.reduce((sum, payment) => sum + payment.amount, 0));
  const expectedChange = roundMoney(Math.max(0, totalCashTendered - totalCashApplied));
  const declaredChange = roundMoney(normalized.reduce((sum, payment) => sum + payment.change, 0));

  const paymentsWithChange = normalized.filter((payment) => payment.change > 0);
  if (paymentsWithChange.length > 1) {
    throw createHttpError(400, 'Apenas um pagamento em dinheiro pode conter troco.', 'MULTIPLE_CHANGE_PAYMENTS');
  }

  if (!isMoneyEqual(expectedChange, declaredChange)) {
    throw createHttpError(400, 'Troco informado é incompatível com o valor recebido em dinheiro.', 'INVALID_CHANGE_VALUE');
  }

  return {
    normalizedPayments: normalized,
    totalTendered: roundMoney(normalized.reduce((sum, payment) => sum + payment.tendered_amount, 0)),
    totalChange: declaredChange,
  };
}

function buildPaymentSummary(payments = []) {
  if (!Array.isArray(payments) || payments.length === 0) return '-';
  if (payments.length === 1) return payments[0].methodLabel;
  return `Misto (${payments.map((payment) => payment.methodLabel).join(' + ')})`;
}

function buildResumo(total, troco, payments = []) {
  const methods = payments.reduce((acc, payment) => {
    const method = payment.method || 'outro';
    acc[method] = roundMoney((acc[method] || 0) + roundMoney(payment.amount));
    return acc;
  }, {});

  return {
    total: roundMoney(total),
    troco: roundMoney(troco),
    metodos: methods,
  };
}

function generateOrderCode() {
  const base = String(Date.now()).slice(-8);
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `PDV${base}${suffix}`;
}

function generateProductionOrderCode() {
  const base = String(Date.now()).slice(-8);
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `BAL${base}${suffix}`;
}

function shouldCreateProductionOrder(payload = {}) {
  if (payload?.send_to_kitchen === true) return true;
  const mode = normalizeLower(payload?.production_mode);
  return mode === 'productive' || mode === 'producao' || mode === 'kitchen';
}

function mapSaleItemsToProduction(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const quantity = Math.max(1, toNumber(item?.quantity, 1));
      const unitPrice = roundMoney(
        item?.unit_price ??
        item?.price ??
        item?.totalPrice ??
        (toNumber(item?.total_price, 0) > 0 ? toNumber(item?.total_price, 0) / quantity : 0)
      );
      const totalPrice = roundMoney(item?.total_price ?? (unitPrice * quantity));
      const name = String(item?.name || item?.dish_name || item?.dish?.name || 'Item').trim();
      return {
        dish_id: item?.dish_id || item?.dish?.id || null,
        name: name || 'Item',
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        observations: item?.observations || item?.notes || '',
        selections: item?.selections || {},
      };
    })
    .filter((item) => item.quantity > 0 && item.total_price >= 0);
}

async function findExistingOrderByRequestId(client, ownerEmail, ownerSubscriberId, clientRequestId) {
  const result = await client.query(
    `
      SELECT id, subscriber_id, subscriber_email, data, created_at, updated_at
      FROM entities
      WHERE entity_type = 'PedidoPDV'
        AND data->>'client_request_id' = $2
        AND ${buildTenantEntityWhere('$1', '$3')}
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `,
    [ownerEmail, clientRequestId, ownerSubscriberId]
  );

  if (!result.rows.length) return null;
  return decorateOrderEntity(mapEntityRow(result.rows[0]));
}

async function findExistingProductionOrderByRequestId(client, ownerEmail, ownerSubscriberId, clientRequestId) {
  const result = await client.query(
    `
      SELECT id, subscriber_id, subscriber_email, data, created_at, updated_at
      FROM entities
      WHERE entity_type = 'Order'
        AND data->>'source' = 'pdv'
        AND data->>'pdv_client_request_id' = $2
        AND ${buildTenantEntityWhere('$1', '$3')}
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `,
    [ownerEmail, clientRequestId, ownerSubscriberId]
  );

  if (!result.rows.length) return null;
  return mapEntityRow(result.rows[0]);
}

async function listOrderOperations(client, ownerEmail, ownerSubscriberId, { id, order_code: orderCode, client_request_id: clientRequestId }) {
  const result = await client.query(
    `
      SELECT id, subscriber_id, subscriber_email, data, created_at, updated_at
      FROM entities
      WHERE entity_type = 'CaixaOperation'
        AND ${buildTenantEntityWhere('$1', '$5')}
        AND (
          data->>'pedido_pdv_entity_id' = $2
          OR data->>'pedido_pdv_id' = $3
          OR data->>'client_request_id' = $4
        )
      ORDER BY id ASC
    `,
    [ownerEmail, String(id), String(orderCode || ''), String(clientRequestId || ''), ownerSubscriberId]
  );

  return result.rows.map(mapEntityRow);
}

async function assertOpenCaixaForTenant(client, caixaId, ownerEmail, ownerSubscriberId) {
  const result = await client.query(
    `
      SELECT id, subscriber_id, subscriber_email, data, created_at, updated_at
      FROM entities
      WHERE entity_type = 'Caixa'
        AND id = $1
        AND ${buildTenantEntityWhere('$2', '$3')}
      FOR UPDATE
    `,
    [caixaId, ownerEmail, ownerSubscriberId]
  );

  if (!result.rows.length) {
    throw createHttpError(403, 'Caixa não encontrado para este estabelecimento.', 'CAIXA_NOT_FOUND');
  }

  const caixa = mapEntityRow(result.rows[0]);
  if (normalizeLower(caixa?.status) !== 'open') {
    throw createHttpError(409, 'Caixa informado não está aberto.', 'CAIXA_NOT_OPEN');
  }

  return caixa;
}

export async function finalizePdvSaleAtomic({ user, ownerEmail, ownerSubscriberId = null, payload = {} }) {
  if (!ownerEmail) {
    throw createHttpError(403, 'Contexto do assinante inválido para finalizar venda.', 'PDV_CAIXA_CONTEXT_REQUIRED');
  }

  const clientRequestId = String(payload.client_request_id || '').trim();
  if (!clientRequestId) {
    throw createHttpError(400, 'client_request_id é obrigatório.', 'CLIENT_REQUEST_ID_REQUIRED');
  }

  const caixaId = Number(payload.caixa_id);
  if (!Number.isFinite(caixaId)) {
    throw createHttpError(400, 'caixa_id inválido.', 'INVALID_CAIXA_ID');
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    throw createHttpError(400, 'A venda precisa conter ao menos um item.', 'ITEMS_REQUIRED');
  }

  const subtotal = roundMoney(payload.subtotal);
  const discount = roundMoney(payload.discount || 0);
  const total = roundMoney(payload.total);
  if (total <= 0) {
    throw createHttpError(400, 'total inválido para finalizar venda.', 'INVALID_TOTAL');
  }

  const { normalizedPayments, totalTendered, totalChange } = normalizePayments(payload.payments, total);
  const operatorEmail = normalizeLower(user?.email);
  const operatorName = payload.seller_name || user?.full_name || user?.name || '';
  const createProductionOrder = shouldCreateProductionOrder(payload);

  let transactionClient = null;
  try {
    transactionClient = await getClient();
    await transactionClient.query('BEGIN');

    const existingOrder = await findExistingOrderByRequestId(transactionClient, ownerEmail, ownerSubscriberId, clientRequestId);
    if (existingOrder) {
      const existingOperations = await listOrderOperations(transactionClient, ownerEmail, ownerSubscriberId, existingOrder);
      const existingProductionOrder = createProductionOrder
        ? await findExistingProductionOrderByRequestId(transactionClient, ownerEmail, ownerSubscriberId, clientRequestId)
        : null;
      await transactionClient.query('COMMIT');
      transactionClient.release();
      transactionClient = null;

      return {
        pedido_pdv: existingOrder,
        pedido_producao: existingProductionOrder,
        operacoes: existingOperations,
        resumo: buildResumo(existingOrder.total, existingOrder.change || 0, existingOrder.payments || existingOperations.map((operation) => ({
          method: operation.payment_method,
          amount: operation.amount,
        }))),
        idempotent: true,
      };
    }

    await assertOpenCaixaForTenant(transactionClient, caixaId, ownerEmail, ownerSubscriberId);

    const nowIso = new Date().toISOString();
    const orderCode = payload.order_code || generateOrderCode();
    const pedidoData = {
      owner_email: ownerEmail,
      subscriber_id: ownerSubscriberId,
      subscriber_email: ownerEmail,
      client_request_id: clientRequestId,
      order_code: orderCode,
      customer_name: payload.customer_name || 'Cliente Balcão',
      customer_phone: payload.customer_phone || '',
      customer_document: payload.customer_document || '',
      items,
      subtotal,
      discount,
      total,
      payment_method: buildPaymentSummary(normalizedPayments),
      payment_amount: totalTendered,
      change: totalChange,
      caixa_id: caixaId,
      seller_email: payload.seller_email || operatorEmail,
      seller_name: operatorName,
      payments: normalizedPayments,
      created_date: nowIso,
      ...(payload.pdv_terminal_id ? { pdv_terminal_id: payload.pdv_terminal_id } : {}),
      ...(payload.pdv_terminal_name ? { pdv_terminal_name: payload.pdv_terminal_name } : {}),
      ...(payload.pdv_session_id ? { pdv_session_id: payload.pdv_session_id } : {}),
    };

      const orderInsert = await transactionClient.query(
      `
        INSERT INTO entities (entity_type, data, subscriber_email, subscriber_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, subscriber_id, subscriber_email, data, created_at, updated_at
      `,
      ['PedidoPDV', JSON.stringify(pedidoData), ownerEmail, ownerSubscriberId]
    );
    const createdOrder = mapEntityRow(orderInsert.rows[0]);
    let createdProductionOrder = null;

    if (createProductionOrder) {
      const productionItems = mapSaleItemsToProduction(items);
      if (productionItems.length > 0) {
        const productionOrderData = normalizeOrderForPersistence({
          owner_email: ownerEmail,
          subscriber_id: ownerSubscriberId,
          subscriber_email: ownerEmail,
          source: 'pdv',
          source_ref_id: createdOrder.id,
          pdv_client_request_id: clientRequestId,
          pdv_order_code: orderCode,
          order_code: generateProductionOrderCode(),
          customer_name: payload.customer_name || 'Cliente Balcao',
          customer_phone: payload.customer_phone || '',
          customer_document: payload.customer_document || '',
          delivery_method: payload.delivery_method || 'pickup',
          serving_type: 'balcao',
          status: 'new',
          items: productionItems,
          subtotal,
          discount,
          delivery_fee: 0,
          total,
          payment_method: buildPaymentSummary(normalizedPayments),
          created_by: operatorEmail || payload.seller_email || null,
          created_date: nowIso,
          ...(payload.pdv_terminal_id ? { pdv_terminal_id: payload.pdv_terminal_id } : {}),
          ...(payload.pdv_terminal_name ? { pdv_terminal_name: payload.pdv_terminal_name } : {}),
          ...(payload.pdv_session_id ? { pdv_session_id: payload.pdv_session_id } : {}),
        });

        const productionInsert = await transactionClient.query(
          `
            INSERT INTO entities (entity_type, data, subscriber_email, subscriber_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, subscriber_id, subscriber_email, data, created_at, updated_at
          `,
          ['Order', JSON.stringify(productionOrderData), ownerEmail, ownerSubscriberId]
        );

        createdProductionOrder = decorateOrderEntity(mapEntityRow(productionInsert.rows[0]));
        createdOrder.production_order_entity_id = createdProductionOrder.id;
        createdOrder.production_order_code = createdProductionOrder.order_code;

        await transactionClient.query(
          `
            UPDATE entities
            SET data = data || $1::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE entity_type = 'PedidoPDV'
              AND id = $2
          `,
          [
            JSON.stringify({
              production_order_entity_id: createdProductionOrder.id,
              production_order_code: createdProductionOrder.order_code,
              production_mode: 'productive',
            }),
            Number(createdOrder.id),
          ]
        );
      }
    }

    if (payload.simulate_error === true && process.env.NODE_ENV !== 'production') {
      throw createHttpError(500, 'Falha simulada para teste de rollback.', 'PDV_SIMULATED_ERROR');
    }

    const createdOperations = [];
    for (const payment of normalizedPayments) {
      const operationData = {
        owner_email: ownerEmail,
        subscriber_id: ownerSubscriberId,
        subscriber_email: ownerEmail,
        client_request_id: clientRequestId,
        caixa_id: caixaId,
        type: 'venda_pdv',
        description: `PDV #${orderCode} - ${pedidoData.customer_name} (${payment.methodLabel})`,
        amount: payment.amount,
        payment_method: payment.method,
        payment_amount: payment.tendered_amount,
        change: payment.change || 0,
        pedido_pdv_id: orderCode,
        pedido_pdv_entity_id: createdOrder.id,
        operator: operatorEmail,
        date: nowIso,
      };

      const operationInsert = await transactionClient.query(
        `
          INSERT INTO entities (entity_type, data, subscriber_email, subscriber_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id, subscriber_id, subscriber_email, data, created_at, updated_at
        `,
        ['CaixaOperation', JSON.stringify(operationData), ownerEmail, ownerSubscriberId]
      );
      createdOperations.push(mapEntityRow(operationInsert.rows[0]));
    }

    await transactionClient.query('COMMIT');
    transactionClient.release();
    transactionClient = null;

    return {
      pedido_pdv: createdOrder,
      pedido_producao: createdProductionOrder,
      operacoes: createdOperations,
      resumo: buildResumo(total, totalChange, normalizedPayments),
      idempotent: false,
    };
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
