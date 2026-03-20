/**
 * Menus helpers used by public menu and slug login routes.
 */

import * as repo from '../../db/repository.js';
import { usePostgreSQL, getDb } from '../../config/appConfig.js';

function normalizeSlugValue(slug) {
  return String(slug || '').trim().toLowerCase();
}

function sortEntityItems(items = [], orderBy = null) {
  const list = Array.isArray(items) ? [...items] : [];
  if (!orderBy) {
    return list.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
  }

  const direction = String(orderBy).startsWith('-') ? -1 : 1;
  const field = String(orderBy).replace(/^-/, '');

  return list.sort((a, b) => {
    const aValue = a?.[field];
    const bValue = b?.[field];
    const aNumber = Number(aValue);
    const bNumber = Number(bValue);

    if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
      return (aNumber - bNumber) * direction;
    }

    const aText = String(aValue ?? '');
    const bText = String(bValue ?? '');
    return aText.localeCompare(bText, 'pt-BR', { numeric: true }) * direction;
  });
}

function filterJsonEntities(entityMap = {}, entityType, predicate, orderBy = null) {
  const items = Array.isArray(entityMap?.[entityType]) ? entityMap[entityType].filter(predicate) : [];
  return sortEntityItems(items, orderBy);
}

/**
 * Resolve a subscriber or master account by public slug.
 */
export async function getSubscriberOrMasterBySlug(slug) {
  const normalizedSlug = normalizeSlugValue(slug);

  if (!normalizedSlug) {
    return { subscriber: null, isMaster: false, subscriberEmail: null, subscriberId: null };
  }

  if (!usePostgreSQL) {
    const db = getDb();
    const subscribers = Array.isArray(db?.subscribers) ? db.subscribers : [];
    const users = Array.isArray(db?.users) ? db.users : [];

    const subscriber = subscribers.find((item) => normalizeSlugValue(item?.slug) === normalizedSlug) || null;
    if (subscriber) {
      return {
        subscriber,
        isMaster: false,
        subscriberEmail: subscriber.email || null,
        subscriberId: subscriber.id ?? null,
      };
    }

    const master = users.find(
      (item) => item?.is_master === true && normalizeSlugValue(item?.slug) === normalizedSlug
    ) || null;

    if (master) {
      return { subscriber: null, isMaster: true, subscriberEmail: null, subscriberId: null };
    }

    return { subscriber: null, isMaster: false, subscriberEmail: null, subscriberId: null };
  }

  const subscriber = await repo.getSubscriberBySlug(normalizedSlug);
  if (subscriber) {
    return {
      subscriber,
      isMaster: false,
      subscriberEmail: subscriber.email,
      subscriberId: subscriber.id ?? null,
    };
  }

  const { query } = await import('../../db/postgres.js');
  const masterResult = await query(
    'SELECT id, email, slug FROM users WHERE slug = $1 AND is_master = TRUE',
    [normalizedSlug]
  );

  if (masterResult.rows.length > 0) {
    return { subscriber: null, isMaster: true, subscriberEmail: null, subscriberId: null };
  }

  return { subscriber: null, isMaster: false, subscriberEmail: null, subscriberId: null };
}

function buildJsonMenuEntities(entities, predicate) {
  return {
    storeList: filterJsonEntities(entities, 'Store', predicate, null),
    dishes: filterJsonEntities(entities, 'Dish', predicate, 'order'),
    categories: filterJsonEntities(entities, 'Category', predicate, 'order'),
    complementGroups: filterJsonEntities(entities, 'ComplementGroup', predicate, 'order'),
    combos: filterJsonEntities(entities, 'Combo', predicate, null),
    pizzaSizes: filterJsonEntities(entities, 'PizzaSize', predicate, 'order'),
    pizzaFlavors: filterJsonEntities(entities, 'PizzaFlavor', predicate, 'order'),
    pizzaEdges: filterJsonEntities(entities, 'PizzaEdge', predicate, null),
    pizzaExtras: filterJsonEntities(entities, 'PizzaExtra', predicate, null),
    pizzaCategories: filterJsonEntities(entities, 'PizzaCategory', predicate, 'order'),
    beverageCategories: filterJsonEntities(entities, 'BeverageCategory', predicate, 'order'),
    deliveryZones: filterJsonEntities(entities, 'DeliveryZone', predicate, null),
    coupons: filterJsonEntities(entities, 'Coupon', predicate, null),
    promotions: filterJsonEntities(entities, 'Promotion', predicate, null),
    tables: filterJsonEntities(entities, 'Table', predicate, 'table_number'),
    loyaltyConfigs: filterJsonEntities(entities, 'LoyaltyConfig', predicate, null),
    loyaltyRewards: filterJsonEntities(entities, 'LoyaltyReward', predicate, null),
  };
}

/**
 * Load all menu entities for a subscriber or master public slug.
 */
export async function getMenuEntities(subscriberEmail, isMaster) {
  if (!usePostgreSQL) {
    const db = getDb();
    const entities = db?.entities || {};

    if (isMaster) {
      return buildJsonMenuEntities(entities, (item) => !item?.owner_email);
    }

    const subscribers = Array.isArray(db?.subscribers) ? db.subscribers : [];
    const subscriber = subscribers.find(
      (item) => String(item?.email || '').toLowerCase().trim() === String(subscriberEmail || '').toLowerCase().trim()
    ) || null;
    const altEmail = String(subscriber?.linked_user_email || '').toLowerCase().trim();
    const normalizedEmail = String(subscriberEmail || '').toLowerCase().trim();

    return buildJsonMenuEntities(entities, (item) => {
      const owner = String(item?.owner_email || '').toLowerCase().trim();
      return !owner || owner === normalizedEmail || (!!altEmail && owner === altEmail);
    });
  }

  const { query } = await import('../../db/postgres.js');

  if (isMaster) {
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
      loyaltyRewards,
    ] = await Promise.all([
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Store' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Dish' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Category' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'ComplementGroup' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Combo' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaSize' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaFlavor' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaEdge' AND subscriber_email IS NULL`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaExtra' AND subscriber_email IS NULL`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaCategory' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'BeverageCategory' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'DeliveryZone' AND subscriber_email IS NULL`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Coupon' AND subscriber_email IS NULL`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Promotion' AND subscriber_email IS NULL`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Table' AND subscriber_email IS NULL ORDER BY (data->>'table_number')::int NULLS LAST, created_at ASC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'LoyaltyConfig' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'LoyaltyReward' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then((r) =>
        r.rows.map((row) => ({ id: row.id.toString(), ...row.data }))
      ),
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
      loyaltyRewards,
    };
  }

  let altEmail = null;
  try {
    const sub = await repo.getSubscriberByEmail(subscriberEmail);
    altEmail = sub?.linked_user_email || null;
  } catch {
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
    loyaltyRewards,
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
    repo.listEntitiesForSubscriber('LoyaltyReward', subscriberEmail, null, altEmail),
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
    loyaltyRewards,
  };
}

/**
 * Normalize store data for public menu pages.
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
