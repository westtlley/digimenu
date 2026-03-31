/**
 * Orders Service - Lógica de negócio de pedidos
 * Centraliza toda a lógica de gerenciamento de pedidos
 */

import * as repo from '../../db/repository.js';
import { logger } from '../../utils/logger.js';
import { generateTableOrderCode, generateOrderCode, validateOrderData, validateCardapioOrderData, getSubscriberOrMasterBySlug } from './orders.utils.js';
import { getMenuEntities } from '../menus/menus.utils.js';
import { emitOrderCreated } from '../../services/websocket.js';
import { usePostgreSQL, getDb } from '../../config/appConfig.js';
import { getClient } from '../../db/postgres.js';
import { getPlanPermissions } from '../../utils/plans.js';
import { normalizePlanPresetKey } from '../../utils/planPresetsForContext.js';
import { decorateOrderEntity, normalizeOrderForPersistence } from '../../utils/orderLifecycle.js';
import {
  findOpenCaixaForTenant,
  getStoreOperationalSettings,
  normalizeOperationalDayCutoffTime,
  resolveOperationalDate,
  getShiftOperationalContext,
} from '../caixa/operationalShift.js';
import { calculateDeliveryContext } from '../../../src/utils/deliveryRules.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function normalizeId(value) {
  return String(value ?? '').trim();
}

function getPositiveQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? Math.max(1, Math.round(quantity)) : 1;
}

function buildEntityMap(items = []) {
  return new Map(
    (Array.isArray(items) ? items : [])
      .filter(Boolean)
      .map((item) => [normalizeId(item.id), item])
      .filter(([id]) => id)
  );
}

function buildComplementOptionMap(groups = []) {
  return new Map(
    (Array.isArray(groups) ? groups : [])
      .filter(Boolean)
      .map((group) => {
        const options = new Map(
          (Array.isArray(group.options) ? group.options : [])
            .filter((option) => option?.is_active !== false)
            .map((option) => [normalizeId(option.id), option])
            .filter(([id]) => id)
        );
        return [normalizeId(group.id), { ...group, optionsById: options }];
      })
      .filter(([id]) => id)
  );
}

function findSelectedOption(selection, optionsById) {
  const optionId = normalizeId(selection?.id ?? selection);
  if (!optionId) return null;
  return optionsById.get(optionId) || null;
}

function calculateComplementSelectionsTotal(dish, selections, complementGroupsById) {
  const links = Array.isArray(dish?.complement_groups) ? dish.complement_groups : [];
  let total = 0;

  for (const linkedGroup of links) {
    const groupId = normalizeId(linkedGroup?.group_id);
    if (!groupId) continue;

    const group = complementGroupsById.get(groupId);
    if (!group) continue;

    const maxSelection = Math.max(1, Number(group.max_selection) || 1);
    const isRequired = linkedGroup?.is_required === true;
    const rawSelection = selections?.[groupId];

    if (maxSelection === 1) {
      if (!rawSelection) {
        if (isRequired) {
          throw new Error(`Complemento obrigatório ausente em "${dish?.name || 'item'}"`);
        }
        continue;
      }

      const option = findSelectedOption(rawSelection, group.optionsById);
      if (!option) {
        throw new Error(`Complemento inválido em "${dish?.name || 'item'}"`);
      }
      total += toNumber(option.price, 0);
      continue;
    }

    const selectedOptions = Array.isArray(rawSelection)
      ? rawSelection.filter(Boolean)
      : rawSelection
        ? [rawSelection]
        : [];

    if (isRequired && selectedOptions.length === 0) {
      throw new Error(`Complemento obrigatório ausente em "${dish?.name || 'item'}"`);
    }

    if (selectedOptions.length > maxSelection) {
      throw new Error(`Quantidade de complementos inválida em "${dish?.name || 'item'}"`);
    }

    selectedOptions.forEach((selection) => {
      const option = findSelectedOption(selection, group.optionsById);
      if (!option) {
        throw new Error(`Complemento inválido em "${dish?.name || 'item'}"`);
      }
      total += toNumber(option.price, 0);
    });
  }

  return roundMoney(total);
}

function resolveDishReference(item, dishesById) {
  const dishId = normalizeId(item?.dish?.id ?? item?.id);
  return dishesById.get(dishId) || null;
}

function calculateRegularItemPrice(item, context) {
  const dish = resolveDishReference(item, context.dishesById);
  if (!dish) {
    throw new Error('Item do pedido não encontrado no cardápio');
  }

  const complementTotal = calculateComplementSelectionsTotal(
    dish,
    item?.selections || {},
    context.complementGroupsById
  );
  const unitPrice = roundMoney(toNumber(dish.price, 0) + complementTotal);
  const quantity = getPositiveQuantity(item?.quantity);

  return {
    ...item,
    dish: item?.dish ? { ...item.dish, id: dish.id, name: dish.name, product_type: dish.product_type, price: dish.price } : dish,
    quantity,
    unitPrice,
    totalPrice: unitPrice,
    lineTotal: roundMoney(unitPrice * quantity),
  };
}

function calculatePizzaItemPrice(item, context) {
  const dish = resolveDishReference(item, context.dishesById);
  const sizeId = normalizeId(item?.size?.id ?? item?.selections?.size?.id);
  const size = context.pizzaSizesById.get(sizeId);
  const rawFlavors = Array.isArray(item?.flavors)
    ? item.flavors
    : Array.isArray(item?.selections?.flavors)
      ? item.selections.flavors
      : [];
  const flavors = rawFlavors
    .map((flavor) => context.pizzaFlavorsById.get(normalizeId(flavor?.id ?? flavor)))
    .filter(Boolean);

  if (!dish || !size || flavors.length === 0) {
    throw new Error('Pizza com configuração inválida no pedido');
  }

  const hasPremium = flavors.some((flavor) => String(flavor?.category || '').toLowerCase() === 'premium');
  let unitPrice = toNumber(hasPremium ? size.price_premium : size.price_tradicional, 0);

  const edgeId = normalizeId(item?.edge?.id ?? item?.selections?.edge?.id);
  if (edgeId && edgeId !== 'none') {
    const edge = context.pizzaEdgesById.get(edgeId);
    if (!edge) {
      throw new Error('Borda inválida no pedido');
    }
    unitPrice += toNumber(edge.price, 0);
  }

  const extras = Array.isArray(item?.extras)
    ? item.extras
    : Array.isArray(item?.selections?.extras)
      ? item.selections.extras
      : [];

  extras.forEach((extra) => {
    const resolvedExtra = context.pizzaExtrasById.get(normalizeId(extra?.id ?? extra));
    if (!resolvedExtra) {
      throw new Error('Extra de pizza inválido no pedido');
    }
    unitPrice += toNumber(resolvedExtra.price, 0);
  });

  const quantity = getPositiveQuantity(item?.quantity);
  const roundedUnitPrice = roundMoney(unitPrice);

  return {
    ...item,
    dish: item?.dish ? { ...item.dish, id: dish.id, name: dish.name, product_type: dish.product_type, price: dish.price } : dish,
    quantity,
    unitPrice: roundedUnitPrice,
    totalPrice: roundedUnitPrice,
    lineTotal: roundMoney(roundedUnitPrice * quantity),
  };
}

function calculateComboComplementTotal(comboGroups, context) {
  const groups = Array.isArray(comboGroups) ? comboGroups : [];
  let total = 0;

  groups.forEach((group) => {
    const items = Array.isArray(group?.items) ? group.items : [];
    items.forEach((groupItem) => {
      const dish = context.dishesById.get(normalizeId(groupItem?.dish_id));
      if (!dish) {
        throw new Error('Item de combo inválido no pedido');
      }

      const instances = Array.isArray(groupItem?.instances) && groupItem.instances.length > 0
        ? groupItem.instances
        : Array.from({ length: getPositiveQuantity(groupItem?.quantity) }, () => groupItem);

      instances.forEach((instance) => {
        total += calculateComplementSelectionsTotal(
          dish,
          instance?.selections || groupItem?.selections || {},
          context.complementGroupsById
        );
      });
    });
  });

  return roundMoney(total);
}

function calculateComboItemPrice(item, context) {
  const comboId = normalizeId(
    item?.selections?.combo_id ||
    String(item?.dish?.id || '').replace(/^combo_/, '')
  );
  const combo = context.combosById.get(comboId);

  if (!combo) {
    throw new Error('Combo inválido no pedido');
  }

  const complementsTotal = calculateComboComplementTotal(item?.selections?.combo_groups, context);
  const quantity = getPositiveQuantity(item?.quantity);
  const unitPrice = roundMoney(toNumber(combo.combo_price, 0) + complementsTotal);

  return {
    ...item,
    quantity,
    unitPrice,
    totalPrice: unitPrice,
    lineTotal: roundMoney(unitPrice * quantity),
  };
}

function normalizeOrderItems(items, context) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Itens do pedido são obrigatórios');
  }

  return items.map((item) => {
    const productType = String(item?.dish?.product_type || item?.product_type || '').toLowerCase();
    const isCombo = productType === 'combo' || Array.isArray(item?.selections?.combo_groups);
    const isPizza = productType === 'pizza' || item?.size || item?.selections?.size || item?.flavors || item?.selections?.flavors;

    if (isCombo) return calculateComboItemPrice(item, context);
    if (isPizza) return calculatePizzaItemPrice(item, context);
    return calculateRegularItemPrice(item, context);
  });
}

function calculateCouponDiscount({ subtotal, couponCode, coupons = [] }) {
  const code = String(couponCode || '').trim().toUpperCase();
  if (!code) return { discount: 0, coupon: null };

  const coupon = (Array.isArray(coupons) ? coupons : []).find((currentCoupon) => {
    if (!currentCoupon?.code) return false;
    return String(currentCoupon.code).trim().toUpperCase() === code;
  });

  if (!coupon || coupon.is_active === false) {
    return { discount: 0, coupon: null };
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { discount: 0, coupon: null };
  }

  const maxUses = Number(coupon.max_uses || 0);
  const currentUses = Number(coupon.current_uses || 0);
  if (maxUses > 0 && currentUses >= maxUses) {
    return { discount: 0, coupon: null };
  }

  const minOrderValue = toNumber(coupon.min_order_value, 0);
  if (minOrderValue > 0 && subtotal < minOrderValue) {
    return { discount: 0, coupon: null };
  }

  const discount = String(coupon.discount_type || '').toLowerCase() === 'percentage'
    ? subtotal * (toNumber(coupon.discount_value, 0) / 100)
    : Math.min(toNumber(coupon.discount_value, 0), subtotal);

  return {
    discount: roundMoney(discount),
    coupon,
  };
}

const LOYALTY_TIER_DISCOUNTS = {
  bronze: 0,
  silver: 5,
  gold: 10,
  platinum: 15,
};

function calculateValidatedLoyaltyDiscount({ subtotal, requestedDiscount, loyaltyTier, loyaltyConfigs = [] }) {
  const loyaltyConfig = Array.isArray(loyaltyConfigs) ? loyaltyConfigs[0] : null;
  if (loyaltyConfig?.is_active !== true) return 0;

  const tierKey = String(loyaltyTier || 'bronze').toLowerCase();
  const tierDiscount = LOYALTY_TIER_DISCOUNTS[tierKey] ?? 0;
  if (tierDiscount <= 0) return 0;

  const maxDiscount = roundMoney(subtotal * (tierDiscount / 100));
  return roundMoney(Math.min(Math.max(0, toNumber(requestedDiscount, 0)), maxDiscount));
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

    const storeSettings = await getStoreOperationalSettings({
      repo,
      db: getDb(),
      usePostgreSQL,
      ownerEmail: subscriberEmail,
      ownerSubscriberId: subscriberId,
    });
    const operationalDate = resolveOperationalDate(
      new Date(),
      storeSettings.cutoffTime,
      storeSettings.timeZone
    );
    const openShift = await findOpenCaixaForTenant({
      repo,
      db: getDb(),
      usePostgreSQL,
      ownerEmail: subscriberEmail,
      ownerSubscriberId: subscriberId,
    });
    const shiftContext = openShift
      ? getShiftOperationalContext(openShift, storeSettings, new Date())
      : null;

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
      created_date: new Date().toISOString(),
      operational_date: shiftContext?.operationalDate || operationalDate,
      operational_day_cutoff_time: shiftContext?.cutoffTime || storeSettings.cutoffTime,
      operational_timezone: shiftContext?.timeZone || storeSettings.timeZone,
      ...(openShift?.id ? { shift_id: String(openShift.id) } : {}),
      ...(shiftContext?.turnLabel ? { turn_label: shiftContext.turnLabel } : {}),
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

  const { subscriber, isMaster, subscriberEmail } = await getSubscriberOrMasterBySlug(normalizedSlug);
  const subscriberId = subscriber?.id ?? null;
  if (!subscriber && !isMaster) throw new Error('Link não encontrado');

  const validationErrors = validateCardapioOrderData(orderData);
  if (validationErrors.length > 0) throw new Error(validationErrors.join(', '));

  const menuEntities = await getMenuEntities(subscriberEmail, isMaster);
  const store = Array.isArray(menuEntities?.storeList) && menuEntities.storeList[0] ? menuEntities.storeList[0] : {};
  const zones = Array.isArray(menuEntities?.deliveryZones) ? menuEntities.deliveryZones : [];
  const coupons = Array.isArray(menuEntities?.coupons) ? menuEntities.coupons : [];
  const loyaltyConfigs = Array.isArray(menuEntities?.loyaltyConfigs) ? menuEntities.loyaltyConfigs : [];
  const pricingContext = {
    dishesById: buildEntityMap(menuEntities?.dishes),
    complementGroupsById: buildComplementOptionMap(menuEntities?.complementGroups),
    combosById: buildEntityMap(menuEntities?.combos),
    pizzaSizesById: buildEntityMap(menuEntities?.pizzaSizes),
    pizzaFlavorsById: buildEntityMap(menuEntities?.pizzaFlavors),
    pizzaEdgesById: buildEntityMap(menuEntities?.pizzaEdges),
    pizzaExtrasById: buildEntityMap(menuEntities?.pizzaExtras),
  };

  const deliveryMethod = orderData.delivery_method || 'pickup';
  const neighborhood = orderData.neighborhood || null;
  const customerLat = toNumber(orderData.customer_latitude ?? orderData.latitude, null);
  const customerLng = toNumber(orderData.customer_longitude ?? orderData.longitude, null);
  const customerCep = String(orderData.cep || orderData.zipcode || '').trim() || null;
  const deliveryContext = calculateDeliveryContext({
    deliveryMethod,
    neighborhood,
    deliveryZones: zones,
    store,
    customerLat,
    customerLng,
  });
  const matchedZone = deliveryContext.matchedZone;
  const calculatedDeliveryFee = roundMoney(deliveryContext.deliveryFee);

  if (deliveryMethod === 'delivery') {
    if (deliveryContext.missingRequiredCoordinates) {
      throw new Error('Selecione seu endereco no mapa para calcular a entrega.');
    }

    if (deliveryContext.blocked) {
      throw new Error(deliveryContext.message || 'Ainda nao entregamos nesse bairro.');
    }
  }

  const normalizedItems = normalizeOrderItems(orderData.items, pricingContext);
  const subtotal = roundMoney(normalizedItems.reduce((sum, item) => sum + toNumber(item.lineTotal, 0), 0));
  const { discount: couponDiscount, coupon: validatedCoupon } = calculateCouponDiscount({
    subtotal,
    couponCode: orderData.coupon_code,
    coupons,
  });
  const loyaltyDiscount = calculateValidatedLoyaltyDiscount({
    subtotal,
    requestedDiscount: orderData.loyalty_discount,
    loyaltyTier: orderData.loyalty_tier,
    loyaltyConfigs,
  });
  const discount = roundMoney(Math.min(subtotal, couponDiscount + loyaltyDiscount));
  const minimumOrderValue = toNumber(deliveryContext.minimumOrderValue, 0);

  if (deliveryMethod === 'delivery' && minimumOrderValue > 0 && subtotal < minimumOrderValue) {
    throw new Error(`Pedido mínimo para entrega é R$ ${minimumOrderValue.toFixed(2)}`);
  }

  const total = roundMoney(Math.max(0, subtotal - discount + calculatedDeliveryFee));

  const operationalCutoffTime = normalizeOperationalDayCutoffTime(store?.operational_day_cutoff_time);
  const operationalTimeZone = String(
    store?.operational_timezone || process.env.OPERATIONAL_TIMEZONE || 'America/Sao_Paulo'
  ).trim() || 'America/Sao_Paulo';
  const operationalDate = resolveOperationalDate(new Date(), operationalCutoffTime, operationalTimeZone);
  const openShift = await findOpenCaixaForTenant({
    repo,
    db: getDb(),
    usePostgreSQL,
    ownerEmail: subscriberEmail,
    ownerSubscriberId: subscriberId,
  });
  const shiftContext = openShift
    ? getShiftOperationalContext(openShift, {
        cutoffTime: operationalCutoffTime,
        timeZone: operationalTimeZone,
      }, new Date())
    : null;
  const order_code = generateOrderCode();
  const clientRequestId = String(orderData.client_request_id || '').trim() || null;
  const finalOrderData = normalizeOrderForPersistence({
    order_code,
    client_request_id: clientRequestId,
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
    cep: customerCep,
    zipcode: customerCep,
    payment_method: orderData.payment_method || 'pix',
    needs_change: !!orderData.needs_change,
    change_amount: orderData.needs_change && orderData.change_amount ? parseFloat(orderData.change_amount) : null,
    latitude: Number.isFinite(customerLat) ? customerLat : null,
    longitude: Number.isFinite(customerLng) ? customerLng : null,
    customer_latitude: Number.isFinite(customerLat) ? customerLat : null,
    customer_longitude: Number.isFinite(customerLng) ? customerLng : null,
    delivery_zone_id: deliveryContext.matchedZoneId,
    delivery_zone_name: deliveryContext.matchedZoneName,
    delivery_fee_mode_applied: deliveryContext.deliveryFeeModeApplied,
    delivery_fee_applied: calculatedDeliveryFee,
    distance_km: Number.isFinite(deliveryContext.distanceKm) ? deliveryContext.distanceKm : null,
    delivery_rule_source: deliveryContext.deliveryRuleSource,
    delivery_hybrid_strategy_applied: deliveryContext.hybridStrategy || null,
    delivery_decision_path: Array.isArray(deliveryContext.decisionPath) ? deliveryContext.decisionPath : [],
    delivery_decision_summary: deliveryContext.decisionSummary || null,
    items: normalizedItems,
    subtotal,
    delivery_fee: calculatedDeliveryFee,
    discount,
    coupon_code: validatedCoupon?.code || null,
    loyalty_discount: loyaltyDiscount,
    loyalty_tier: String(orderData.loyalty_tier || 'bronze').toLowerCase(),
    total,
    status: 'new',
    source: 'public',
    created_date: new Date().toISOString(),
    owner_email: subscriberEmail,
    operational_date: shiftContext?.operationalDate || operationalDate,
    operational_day_cutoff_time: shiftContext?.cutoffTime || operationalCutoffTime,
    operational_timezone: shiftContext?.timeZone || operationalTimeZone,
    ...(openShift?.id ? { shift_id: String(openShift.id) } : {}),
    ...(shiftContext?.turnLabel ? { turn_label: shiftContext.turnLabel } : {}),
  });

  let transactionClient = null;
  try {
    transactionClient = await getClient();
    await transactionClient.query('BEGIN');

    if (clientRequestId) {
      await transactionClient.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `public-order:${normalizedSlug}:${clientRequestId}`,
      ]);

      const existingResult = await transactionClient.query(
        `SELECT id, subscriber_id, subscriber_email, data, created_at, updated_at
         FROM entities
         WHERE entity_type = 'Order'
           AND data->>'client_request_id' = $1
           AND (
             ($2::int IS NOT NULL AND subscriber_id = $2)
             OR ($3::text IS NOT NULL AND subscriber_email = $3)
             OR ($2::int IS NULL AND $3::text IS NULL AND subscriber_id IS NULL AND subscriber_email IS NULL)
           )
         ORDER BY created_at DESC
         LIMIT 1`,
        [clientRequestId, subscriberId, subscriberEmail]
      );

      if (existingResult.rows[0]) {
        const existingOrderRow = existingResult.rows[0];
        await transactionClient.query('COMMIT');
        transactionClient.release();
        transactionClient = null;
        return decorateOrderEntity({
          id: existingOrderRow.id.toString(),
          subscriber_id: existingOrderRow.subscriber_id ?? subscriberId,
          subscriber_email: existingOrderRow.subscriber_email ?? subscriberEmail,
          ...(existingOrderRow.data || {}),
          created_at: existingOrderRow.created_at,
          updated_at: existingOrderRow.updated_at,
        });
      }
    }

    if (subscriberEmail) {
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

    const insertResult = await transactionClient.query(
      `INSERT INTO entities (entity_type, data, subscriber_email, subscriber_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, subscriber_id, subscriber_email, data, created_at, updated_at`,
      ['Order', JSON.stringify(finalOrderData), subscriberEmail, subscriberId]
    );
    const row = insertResult.rows[0];
    const newOrder = decorateOrderEntity({
      id: row.id.toString(),
      subscriber_id: row.subscriber_id ?? subscriberId,
      subscriber_email: row.subscriber_email ?? subscriberEmail,
      ...finalOrderData,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });

    await transactionClient.query('COMMIT');
    transactionClient.release();
    transactionClient = null;

    if (typeof emitOrderCreated === 'function') emitOrderCreated(newOrder);
    logger.info(`Pedido cardápio criado: ${order_code}`, {
      subscriber_email: subscriberEmail || 'master',
      slug: normalizedSlug,
      subtotal,
      total,
    });
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
