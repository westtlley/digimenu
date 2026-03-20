/**
 * Menus helpers used by public menu and slug login routes.
 */

import * as repo from '../../db/repository.js';
import { usePostgreSQL, getDb } from '../../config/appConfig.js';

function normalizeSlugValue(slug) {
  return String(slug || '').trim().toLowerCase();
}

function normalizeEmailValue(email) {
  return String(email || '').trim().toLowerCase();
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

function buildSlugLookupResult({
  subscriber = null,
  isMaster = false,
  subscriberEmail = null,
  subscriberId = null,
  source = 'none',
  attemptedSources = [],
  fallbackUsed = false,
  missReason = null,
} = {}) {
  return {
    subscriber,
    isMaster,
    subscriberEmail,
    subscriberId,
    source,
    attemptedSources,
    fallbackUsed,
    missReason,
  };
}

function buildEmptyMenuEntities(meta = {}) {
  return {
    storeList: [],
    dishes: [],
    categories: [],
    complementGroups: [],
    combos: [],
    pizzaSizes: [],
    pizzaFlavors: [],
    pizzaEdges: [],
    pizzaExtras: [],
    pizzaCategories: [],
    beverageCategories: [],
    deliveryZones: [],
    coupons: [],
    promotions: [],
    tables: [],
    loyaltyConfigs: [],
    loyaltyRewards: [],
    source: 'none',
    attemptedSources: [],
    fallbackUsed: false,
    missReason: null,
    ...meta,
  };
}

function hasValidMenuEntities(entities = {}) {
  const collections = [
    entities.storeList,
    entities.dishes,
    entities.categories,
    entities.complementGroups,
    entities.combos,
    entities.pizzaSizes,
    entities.pizzaFlavors,
    entities.pizzaEdges,
    entities.pizzaExtras,
    entities.pizzaCategories,
    entities.beverageCategories,
    entities.deliveryZones,
    entities.coupons,
    entities.promotions,
    entities.tables,
    entities.loyaltyConfigs,
    entities.loyaltyRewards,
  ];

  return collections.some((items) => Array.isArray(items) && items.length > 0);
}

function buildJsonEntityPredicate(subscriberEmail, isMaster, entities) {
  if (isMaster) {
    return (item) => !item?.owner_email;
  }

  const db = getDb();
  const subscribers = Array.isArray(db?.subscribers) ? db.subscribers : [];
  const subscriber = subscribers.find(
    (item) => normalizeEmailValue(item?.email) === normalizeEmailValue(subscriberEmail)
  ) || null;
  const altEmail = normalizeEmailValue(subscriber?.linked_user_email);
  const normalizedEmail = normalizeEmailValue(subscriberEmail);

  return (item) => {
    const owner = normalizeEmailValue(item?.owner_email);
    if (!owner) {
      return true;
    }
    return owner === normalizedEmail || (!!altEmail && owner === altEmail);
  };
}

function loadJsonMenuEntities(subscriberEmail, isMaster) {
  const db = getDb();
  const entities = db?.entities || {};
  const predicate = buildJsonEntityPredicate(subscriberEmail, isMaster, entities);
  return buildJsonMenuEntities(entities, predicate);
}

async function resolveJsonSubscriberOrMasterBySlug(slug) {
  const db = getDb();
  const subscribers = Array.isArray(db?.subscribers) ? db.subscribers : [];
  const users = Array.isArray(db?.users) ? db.users : [];

  const subscriber = subscribers.find((item) => normalizeSlugValue(item?.slug) === slug) || null;
  if (subscriber) {
    return buildSlugLookupResult({
      subscriber,
      isMaster: false,
      subscriberEmail: subscriber.email || null,
      subscriberId: subscriber.id ?? null,
      source: 'json',
      attemptedSources: ['json'],
    });
  }

  const master = users.find(
    (item) => item?.is_master === true && normalizeSlugValue(item?.slug) === slug
  ) || null;

  if (master) {
    return buildSlugLookupResult({
      subscriber: null,
      isMaster: true,
      subscriberEmail: null,
      subscriberId: null,
      source: 'json',
      attemptedSources: ['json'],
    });
  }

  return buildSlugLookupResult({
    source: 'none',
    attemptedSources: ['json'],
    missReason: 'json-miss',
  });
}

async function resolvePostgresSubscriberOrMasterBySlug(slug) {
  const subscriber = await repo.getSubscriberBySlug(slug);
  if (subscriber) {
    return buildSlugLookupResult({
      subscriber,
      isMaster: false,
      subscriberEmail: subscriber.email || null,
      subscriberId: subscriber.id ?? null,
      source: 'postgres',
      attemptedSources: ['postgres'],
    });
  }

  const { query } = await import('../../db/postgres.js');
  const masterResult = await query(
    'SELECT id, email, slug FROM users WHERE slug IS NOT NULL AND LOWER(TRIM(slug)) = $1 AND is_master = TRUE',
    [slug]
  );

  if (masterResult.rows.length > 0) {
    return buildSlugLookupResult({
      subscriber: null,
      isMaster: true,
      subscriberEmail: null,
      subscriberId: null,
      source: 'postgres',
      attemptedSources: ['postgres'],
    });
  }

  return buildSlugLookupResult({
    source: 'none',
    attemptedSources: ['postgres'],
    missReason: 'postgres-miss',
  });
}

/**
 * Resolve a subscriber or master account by public slug.
 */
export async function getSubscriberOrMasterBySlug(slug) {
  const normalizedSlug = normalizeSlugValue(slug);

  if (!normalizedSlug) {
    return buildSlugLookupResult({ missReason: 'invalid-slug' });
  }

  if (!usePostgreSQL) {
    return resolveJsonSubscriberOrMasterBySlug(normalizedSlug);
  }

  const postgresResult = await resolvePostgresSubscriberOrMasterBySlug(normalizedSlug);
  if (postgresResult.subscriber || postgresResult.isMaster) {
    return postgresResult;
  }

  const jsonResult = await resolveJsonSubscriberOrMasterBySlug(normalizedSlug);
  if (jsonResult.subscriber || jsonResult.isMaster) {
    return {
      ...jsonResult,
      source: 'json',
      attemptedSources: ['postgres', 'json'],
      fallbackUsed: true,
      missReason: postgresResult.missReason || 'postgres-miss',
    };
  }

  return buildSlugLookupResult({
    source: 'none',
    attemptedSources: ['postgres', 'json'],
    fallbackUsed: true,
    missReason: 'postgres-miss-and-json-miss',
  });
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
  const loadJsonEntitiesResult = () => {
    const jsonEntities = loadJsonMenuEntities(subscriberEmail, isMaster);
    return {
      ...jsonEntities,
      source: 'json',
      attemptedSources: ['json'],
      fallbackUsed: false,
      missReason: hasValidMenuEntities(jsonEntities) ? null : 'json-empty',
    };
  };

  if (!usePostgreSQL) {
    return loadJsonEntitiesResult();
  }

  const { query } = await import('../../db/postgres.js');

  let postgresEntities;
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

    postgresEntities = {
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
  } else {
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

    postgresEntities = {
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

  if (hasValidMenuEntities(postgresEntities)) {
    return {
      ...postgresEntities,
      source: 'postgres',
      attemptedSources: ['postgres'],
      fallbackUsed: false,
      missReason: null,
    };
  }

  const jsonEntities = loadJsonMenuEntities(subscriberEmail, isMaster);
  if (hasValidMenuEntities(jsonEntities)) {
    return {
      ...jsonEntities,
      source: 'json',
      attemptedSources: ['postgres', 'json'],
      fallbackUsed: true,
      missReason: 'postgres-empty',
    };
  }

  return buildEmptyMenuEntities({
    ...postgresEntities,
    source: 'none',
    attemptedSources: ['postgres', 'json'],
    fallbackUsed: true,
    missReason: 'postgres-empty-and-json-empty',
  });
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
