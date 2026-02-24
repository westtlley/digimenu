/**
 * Menus Utils - Funções auxiliares para módulo de menus
 */

import * as repo from '../../db/repository.js';
import { usePostgreSQL, getDb } from '../../config/appConfig.js';

/**
 * Obtém subscriber ou master pelo slug
 */
export async function getSubscriberOrMasterBySlug(slug) {
  if (!usePostgreSQL) {
    return { subscriber: null, isMaster: false, subscriberEmail: null };
  }

  // Tentar buscar subscriber primeiro
  let subscriber = await repo.getSubscriberBySlug(slug);
  let isMaster = false;
  let subscriberEmail = null;

  if (subscriber) {
    subscriberEmail = subscriber.email;
  } else {
    // Se não encontrou subscriber, buscar usuário master pelo slug
    const { query } = await import('../../db/postgres.js');
    const masterResult = await query(
      'SELECT id, email, slug FROM users WHERE slug = $1 AND is_master = TRUE',
      [slug]
    );

    if (masterResult.rows.length > 0) {
      isMaster = true;
      subscriberEmail = null; // Master usa subscriber_email = NULL
    } else {
      return { subscriber: null, isMaster: false, subscriberEmail: null };
    }
  }

  return { subscriber, isMaster, subscriberEmail };
}

/**
 * Busca todas as entidades relacionadas ao menu para um subscriber/master
 */
export async function getMenuEntities(subscriberEmail, isMaster) {
  if (!usePostgreSQL) {
    throw new Error('Cardápio por link requer PostgreSQL');
  }

  const { query } = await import('../../db/postgres.js');

  if (isMaster) {
    // Para master, buscar entidades com subscriber_email IS NULL
    const [
      storeList,
      dishes,
      categories,
      complementGroups,
      combos,
      pizzaSizes,
      pizzaFlavors,
      pizzaEdges,
      pizzaExtras,
      pizzaCategories,
      beverageCategories,
      deliveryZones,
      coupons,
      promotions,
      tables,
      loyaltyConfigs,
      loyaltyRewards
    ] = await Promise.all([
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Store' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Dish' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Category' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'ComplementGroup' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Combo' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaSize' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaFlavor' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaEdge' AND subscriber_email IS NULL`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaExtra' AND subscriber_email IS NULL`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaCategory' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'BeverageCategory' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'DeliveryZone' AND subscriber_email IS NULL`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Coupon' AND subscriber_email IS NULL`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Promotion' AND subscriber_email IS NULL`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Table' AND subscriber_email IS NULL ORDER BY (data->>'table_number')::int NULLS LAST, created_at ASC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'LoyaltyConfig' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'LoyaltyReward' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then(r =>
        r.rows.map(row => ({ id: row.id.toString(), ...row.data }))
      )
    ]);

    return {
      storeList,
      dishes,
      categories,
      complementGroups,
      combos,
      pizzaSizes,
      pizzaFlavors,
      pizzaEdges,
      pizzaExtras,
      pizzaCategories,
      beverageCategories,
      deliveryZones,
      coupons,
      promotions,
      tables,
      loyaltyConfigs,
      loyaltyRewards
    };
  } else {
    // Para subscriber, usar a função existente
    // Compatibilidade: algumas contas acessam o painel via linked_user_email.
    // Se entidades foram salvas com subscriber_email = linked_user_email, precisamos buscar também por esse email.
    let altEmail = null;
    try {
      const sub = await repo.getSubscriberByEmail(subscriberEmail);
      altEmail = sub?.linked_user_email || null;
    } catch (e) {
      altEmail = null;
    }

    const [
      storeList,
      dishes,
      categories,
      complementGroups,
      combos,
      pizzaSizes,
      pizzaFlavors,
      pizzaEdges,
      pizzaExtras,
      pizzaCategories,
      beverageCategories,
      deliveryZones,
      coupons,
      promotions,
      tables,
      loyaltyConfigs,
      loyaltyRewards
    ] = await Promise.all([
      repo.listEntitiesForSubscriber('Store', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('Dish', subscriberEmail, 'order', altEmail),
      repo.listEntitiesForSubscriber('Category', subscriberEmail, 'order', altEmail),
      repo.listEntitiesForSubscriber('ComplementGroup', subscriberEmail, 'order', altEmail),
      repo.listEntitiesForSubscriber('Combo', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('PizzaSize', subscriberEmail, 'order', altEmail),
      repo.listEntitiesForSubscriber('PizzaFlavor', subscriberEmail, 'order', altEmail),
      repo.listEntitiesForSubscriber('PizzaEdge', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('PizzaExtra', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('PizzaCategory', subscriberEmail, 'order', altEmail),
      repo.listEntitiesForSubscriber('BeverageCategory', subscriberEmail, 'order', altEmail),
      repo.listEntitiesForSubscriber('DeliveryZone', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('Coupon', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('Promotion', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('Table', subscriberEmail, 'table_number', altEmail),
      repo.listEntitiesForSubscriber('LoyaltyConfig', subscriberEmail, null, altEmail),
      repo.listEntitiesForSubscriber('LoyaltyReward', subscriberEmail, null, altEmail)
    ]);

    return {
      storeList,
      dishes,
      categories,
      complementGroups,
      combos,
      pizzaSizes,
      pizzaFlavors,
      pizzaEdges,
      pizzaExtras,
      pizzaCategories,
      beverageCategories,
      deliveryZones,
      coupons,
      promotions,
      tables,
      loyaltyConfigs,
      loyaltyRewards
    };
  }
}

/**
 * Normaliza dados da loja para o cardápio público
 */
export function normalizeStoreData(rawStore) {
  const store = Array.isArray(rawStore) && rawStore[0] ? rawStore[0] : {};
  
  return {
    name: 'Loja',
    is_open: true,
    ...store,
    name: store.name || 'Loja',
    theme_primary_color: store.theme_primary_color || store.primary_color,
    theme_secondary_color: store.theme_secondary_color || store.secondary_color,
    theme_accent_color: store.theme_accent_color || store.accent_color,
    theme_header_bg: store.theme_header_bg,
    theme_header_text: store.theme_header_text,
  };
}
