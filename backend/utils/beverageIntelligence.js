import { query } from '../db/postgres.js';
import * as repo from '../db/repository.js';
import { getDb, getSaveDatabaseDebounced, usePostgreSQL } from '../config/appConfig.js';
import {
  buildBeverageDecisionReasons,
  buildBeverageDecisionSnapshot,
  buildBeverageFinalScore,
  calculateBeverageMarginMetrics,
} from './beverageDecisionEngine.js';

export const BEVERAGE_TRACKING_EVENT_NAMES = [
  'beverage_suggested',
  'beverage_clicked',
  'beverage_added',
  'beverage_rejected',
  'beverage_upgraded',
  'add_to_cart',
  'upsell_shown',
  'upsell_accepted',
  'upsell_rejected',
  'upsell_skipped',
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDecimal = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
};

const normalizeInteger = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const normalizeText = (value, maxLength = 255) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeEmail = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
};

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 120);

const normalizeArray = (value) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => normalizeText(item, 120))
        .filter(Boolean)
    )
  );
};

const buildTenantKey = ({ subscriberId = null, subscriberEmail = null } = {}) => {
  const normalizedId = normalizeInteger(subscriberId);
  if (normalizedId != null) {
    return `sid:${normalizedId}`;
  }

  const normalizedEmail = normalizeEmail(subscriberEmail);
  if (normalizedEmail) {
    return `sem:${normalizedEmail}`;
  }

  return null;
};

const getBeverageIdFromProps = (properties = {}) =>
  normalizeText(
    properties?.beverage_id ??
      properties?.dish_id ??
      properties?.product_id ??
      properties?.id,
    120
  );

const getContextFromProps = (properties = {}) =>
  normalizeText(
    properties?.product_context ??
      properties?.context ??
      properties?.product_type ??
      properties?.primary_context,
    80
  );

const isBeverageSource = (properties = {}) =>
  String(properties?.source || '')
    .trim()
    .toLowerCase()
    .includes('beverage');

const safeRate = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

function makeEmptyPerformanceEntry() {
  return {
    beverage_id: null,
    suggested: 0,
    clicked: 0,
    added: 0,
    rejected: 0,
    upgraded: 0,
    revenue_generated: 0,
    upgrade_revenue_generated: 0,
    contexts: {},
    last_event_at: null,
    source: 'heuristic',
  };
}

function upsertContextCount(entry, contextKey) {
  const safeContext = normalizeText(contextKey, 80);
  if (!safeContext) return;
  entry.contexts[safeContext] = toNumber(entry.contexts[safeContext], 0) + 1;
}

function accumulatePerformanceEvent(targetMap, beverageId, patch = {}) {
  const safeId = normalizeText(beverageId, 120);
  if (!safeId) return;

  const current = targetMap.get(safeId) || { ...makeEmptyPerformanceEntry(), beverage_id: safeId };
  current.suggested += toNumber(patch.suggested, 0);
  current.clicked += toNumber(patch.clicked, 0);
  current.added += toNumber(patch.added, 0);
  current.rejected += toNumber(patch.rejected, 0);
  current.upgraded += toNumber(patch.upgraded, 0);
  current.revenue_generated += toNumber(patch.revenue_generated, 0);
  current.upgrade_revenue_generated += toNumber(patch.upgrade_revenue_generated, 0);
  current.source = patch.source || current.source || 'heuristic';

  if (patch.context) {
    upsertContextCount(current, patch.context);
  }

  if (patch.created_at) {
    const createdAt = new Date(patch.created_at).toISOString();
    if (!current.last_event_at || new Date(createdAt) > new Date(current.last_event_at)) {
      current.last_event_at = createdAt;
    }
  }

  targetMap.set(safeId, current);
}

async function ensureStrategyTable() {
  if (!usePostgreSQL) return;

  await query(`
    CREATE TABLE IF NOT EXISTS beverage_strategy (
      id SERIAL PRIMARY KEY,
      tenant_key VARCHAR(300) NOT NULL,
      subscriber_id INTEGER,
      subscriber_email VARCHAR(255),
      beverage_id VARCHAR(120) NOT NULL,
      tags JSONB DEFAULT '[]'::jsonb,
      contexts JSONB DEFAULT '[]'::jsonb,
      linked_categories JSONB DEFAULT '[]'::jsonb,
      linked_products JSONB DEFAULT '[]'::jsonb,
      upsell_enabled BOOLEAN DEFAULT FALSE,
      priority INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_beverage_strategy_tenant_beverage
    ON beverage_strategy(tenant_key, beverage_id);
    CREATE INDEX IF NOT EXISTS idx_beverage_strategy_subscriber_id
    ON beverage_strategy(subscriber_id);
    CREATE INDEX IF NOT EXISTS idx_beverage_strategy_subscriber_email
    ON beverage_strategy(subscriber_email);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS beverage_metrics (
      id SERIAL PRIMARY KEY,
      tenant_key VARCHAR(300) NOT NULL,
      subscriber_id INTEGER,
      subscriber_email VARCHAR(255),
      beverage_id VARCHAR(120) NOT NULL,
      cost NUMERIC(10,2),
      automation_disabled BOOLEAN DEFAULT FALSE,
      fixed_as_primary BOOLEAN DEFAULT FALSE,
      manual_priority INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_beverage_metrics_tenant_beverage
    ON beverage_metrics(tenant_key, beverage_id);
    CREATE INDEX IF NOT EXISTS idx_beverage_metrics_subscriber_id
    ON beverage_metrics(subscriber_id);
    CREATE INDEX IF NOT EXISTS idx_beverage_metrics_subscriber_email
    ON beverage_metrics(subscriber_email);
  `);
}

async function resolveSubscriberBySlug(slug) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  if (usePostgreSQL) {
    const subscriber = await repo.getSubscriberBySlug(normalizedSlug);
    if (subscriber?.email) {
      return {
        id: normalizeInteger(subscriber.id),
        email: normalizeEmail(subscriber.email),
      };
    }
    return null;
  }

  const db = getDb();
  const subscriber = (db?.subscribers || []).find(
    (item) => normalizeSlug(item?.slug) === normalizedSlug
  );

  return subscriber?.email
    ? {
        id: normalizeInteger(subscriber.id),
        email: normalizeEmail(subscriber.email),
      }
    : null;
}

async function resolveSubscriberById(subscriberId) {
  const safeId = normalizeInteger(subscriberId);
  if (safeId == null) return null;

  if (usePostgreSQL) {
    const result = await query(
      'SELECT id, email FROM subscribers WHERE id = $1 LIMIT 1',
      [safeId]
    );
    const row = result.rows[0];
    return row?.email
      ? {
          id: normalizeInteger(row.id),
          email: normalizeEmail(row.email),
        }
      : null;
  }

  const db = getDb();
  const subscriber = (db?.subscribers || []).find(
    (item) => normalizeInteger(item?.id) === safeId
  );
  return subscriber?.email
    ? {
        id: safeId,
        email: normalizeEmail(subscriber.email),
      }
    : null;
}

async function resolveSubscriberByEmail(subscriberEmail) {
  const safeEmail = normalizeEmail(subscriberEmail);
  if (!safeEmail) return null;

  const subscriber = await repo.getSubscriberByEmail(safeEmail);
  return subscriber?.email
    ? {
        id: normalizeInteger(subscriber.id),
        email: normalizeEmail(subscriber.email),
      }
    : null;
}

export async function resolveBeverageTenantScope({
  user = null,
  subscriberId = null,
  subscriberEmail = null,
  slug = null,
} = {}) {
  let effectiveSubscriberId = null;
  let effectiveSubscriberEmail = null;

  if (user?.is_master === true) {
    effectiveSubscriberId = normalizeInteger(subscriberId);
    effectiveSubscriberEmail = normalizeEmail(subscriberEmail);
  }

  if (effectiveSubscriberId == null && effectiveSubscriberEmail) {
    const resolved = await resolveSubscriberByEmail(effectiveSubscriberEmail);
    effectiveSubscriberId = resolved?.id ?? null;
    effectiveSubscriberEmail = resolved?.email ?? effectiveSubscriberEmail;
  }

  if (effectiveSubscriberId != null && !effectiveSubscriberEmail) {
    const resolved = await resolveSubscriberById(effectiveSubscriberId);
    effectiveSubscriberEmail = resolved?.email ?? null;
  }

  if (!effectiveSubscriberEmail && !effectiveSubscriberId && slug) {
    const resolved = await resolveSubscriberBySlug(slug);
    effectiveSubscriberId = resolved?.id ?? null;
    effectiveSubscriberEmail = resolved?.email ?? null;
  }

  if (!effectiveSubscriberEmail) {
    effectiveSubscriberEmail = normalizeEmail(user?.subscriber_email || user?.email);
  }

  if (effectiveSubscriberId == null && effectiveSubscriberEmail) {
    const resolved = await resolveSubscriberByEmail(effectiveSubscriberEmail);
    effectiveSubscriberId = resolved?.id ?? null;
    effectiveSubscriberEmail = resolved?.email ?? effectiveSubscriberEmail;
  }

  return {
    subscriberId: effectiveSubscriberId,
    subscriberEmail: effectiveSubscriberEmail,
    tenantKey: buildTenantKey({
      subscriberId: effectiveSubscriberId,
      subscriberEmail: effectiveSubscriberEmail,
    }),
  };
}

function normalizeStrategyEntry(input = {}) {
  const tags = normalizeArray(input.tags);
  const contexts = normalizeArray(input.contexts);
  const linkedCategoryIds = normalizeArray(input.linkedCategoryIds || input.linked_categories);
  const linkedDishIds = normalizeArray(input.linkedDishIds || input.linked_products);
  const preparedForUpsell = input.preparedForUpsell === true;
  const moreOrdered = input.moreOrdered === true;
  const comboReady = input.comboReady === true;
  const prioritySeed =
    toNumber(input.priority, 0) ||
    (preparedForUpsell ? 35 : 0) +
      (moreOrdered ? 20 : 0) +
      (comboReady ? 15 : 0) +
      (tags.includes('premium') ? 10 : 0) +
      (tags.includes('alta_margem') ? 8 : 0);

  return {
    tags,
    packaging: normalizeText(input.packaging, 40) || '',
    contexts,
    linkedCategoryIds,
    linkedDishIds,
    preparedForUpsell,
    moreOrdered,
    comboReady,
    priority: clamp(Math.round(prioritySeed), 0, 999),
  };
}

function isMeaningfulStrategy(entry = {}) {
  return (
    normalizeArray(entry.tags).length > 0 ||
    normalizeArray(entry.contexts).length > 0 ||
    normalizeArray(entry.linkedCategoryIds).length > 0 ||
    normalizeArray(entry.linkedDishIds).length > 0 ||
    entry.preparedForUpsell === true ||
    entry.moreOrdered === true ||
    entry.comboReady === true ||
    Boolean(normalizeText(entry.packaging, 40)) ||
    toNumber(entry.priority, 0) > 0
  );
}

export function normalizeBeverageStrategySnapshot(rawValue = {}) {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [beverageId, value]) => {
    const safeId = normalizeText(beverageId, 120);
    if (!safeId || !value || typeof value !== 'object') {
      return accumulator;
    }

    accumulator[safeId] = normalizeStrategyEntry(value);
    return accumulator;
  }, {});
}

function normalizeMetricsEntry(input = {}) {
  return {
    cost: normalizeDecimal(input.cost),
    automation_disabled: input.automation_disabled === true || input.automationDisabled === true,
    fixed_as_primary: input.fixed_as_primary === true || input.fixedAsPrimary === true,
    manual_priority: clamp(Math.round(toNumber(input.manual_priority ?? input.manualPriority, 0)), 0, 999),
  };
}

function isMeaningfulMetrics(entry = {}) {
  return (
    entry.cost != null ||
    entry.automation_disabled === true ||
    entry.fixed_as_primary === true ||
    toNumber(entry.manual_priority, 0) > 0
  );
}

export function normalizeBeverageMetricsSnapshot(rawValue = {}) {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [beverageId, value]) => {
    const safeId = normalizeText(beverageId, 120);
    if (!safeId || !value || typeof value !== 'object') {
      return accumulator;
    }

    accumulator[safeId] = normalizeMetricsEntry(value);
    return accumulator;
  }, {});
}

async function listStoredStrategies(scope) {
  if (!scope?.tenantKey) return {};

  if (usePostgreSQL) {
    await ensureStrategyTable();
    const result = await query(
      `
      SELECT beverage_id, tags, contexts, linked_categories, linked_products, upsell_enabled, priority, metadata
      FROM beverage_strategy
      WHERE tenant_key = $1
      ORDER BY priority DESC, updated_at DESC, beverage_id ASC
      `,
      [scope.tenantKey]
    );

    return result.rows.reduce((accumulator, row) => {
      const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      accumulator[String(row.beverage_id)] = normalizeStrategyEntry({
        tags: row.tags,
        contexts: row.contexts,
        linkedCategoryIds: row.linked_categories,
        linkedDishIds: row.linked_products,
        preparedForUpsell: metadata.preparedForUpsell ?? row.upsell_enabled,
        moreOrdered: metadata.moreOrdered === true,
        comboReady: metadata.comboReady === true,
        packaging: metadata.packaging || '',
        priority: row.priority,
      });
      return accumulator;
    }, {});
  }

  const db = getDb();
  const rows = Array.isArray(db?.beverage_strategy) ? db.beverage_strategy : [];
  return rows
    .filter((row) => String(row?.tenant_key || '') === String(scope.tenantKey))
    .reduce((accumulator, row) => {
      accumulator[String(row.beverage_id)] = normalizeStrategyEntry({
        tags: row.tags,
        contexts: row.contexts,
        linkedCategoryIds: row.linked_categories,
        linkedDishIds: row.linked_products,
        preparedForUpsell: row?.metadata?.preparedForUpsell ?? row?.upsell_enabled,
        moreOrdered: row?.metadata?.moreOrdered === true,
        comboReady: row?.metadata?.comboReady === true,
        packaging: row?.metadata?.packaging || '',
        priority: row.priority,
      });
      return accumulator;
    }, {});
}

async function listStoredMetrics(scope) {
  if (!scope?.tenantKey) return {};

  if (usePostgreSQL) {
    await ensureStrategyTable();
    const result = await query(
      `
      SELECT beverage_id, cost, automation_disabled, fixed_as_primary, manual_priority, metadata
      FROM beverage_metrics
      WHERE tenant_key = $1
      ORDER BY fixed_as_primary DESC, manual_priority DESC, updated_at DESC, beverage_id ASC
      `,
      [scope.tenantKey]
    );

    return result.rows.reduce((accumulator, row) => {
      accumulator[String(row.beverage_id)] = normalizeMetricsEntry({
        cost: row.cost,
        automation_disabled: row.automation_disabled,
        fixed_as_primary: row.fixed_as_primary,
        manual_priority: row.manual_priority,
        ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
      });
      return accumulator;
    }, {});
  }

  const db = getDb();
  const rows = Array.isArray(db?.beverage_metrics) ? db.beverage_metrics : [];
  return rows
    .filter((row) => String(row?.tenant_key || '') === String(scope.tenantKey))
    .reduce((accumulator, row) => {
      accumulator[String(row.beverage_id)] = normalizeMetricsEntry(row);
      return accumulator;
    }, {});
}

export async function saveBeverageStrategySnapshot({ scope, strategies = {} } = {}) {
  if (!scope?.tenantKey) {
    throw new Error('Escopo de tenant nao resolvido para salvar estrategia de bebidas.');
  }

  const normalizedMap = normalizeBeverageStrategySnapshot(strategies);
  const meaningfulEntries = Object.entries(normalizedMap)
    .filter(([, entry]) => isMeaningfulStrategy(entry))
    .map(([beverageId, entry]) => ({
      beverage_id: beverageId,
      tags: entry.tags,
      contexts: entry.contexts,
      linked_categories: entry.linkedCategoryIds,
      linked_products: entry.linkedDishIds,
      upsell_enabled: entry.preparedForUpsell === true,
      priority: toNumber(entry.priority, 0),
      metadata: {
        packaging: entry.packaging || '',
        preparedForUpsell: entry.preparedForUpsell === true,
        moreOrdered: entry.moreOrdered === true,
        comboReady: entry.comboReady === true,
      },
    }));

  if (usePostgreSQL) {
    await ensureStrategyTable();
    await query('BEGIN');
    try {
      if (meaningfulEntries.length > 0) {
        await query(
          `
          DELETE FROM beverage_strategy
          WHERE tenant_key = $1
            AND beverage_id <> ALL($2::text[])
          `,
          [scope.tenantKey, meaningfulEntries.map((entry) => String(entry.beverage_id))]
        );
      } else {
        await query('DELETE FROM beverage_strategy WHERE tenant_key = $1', [scope.tenantKey]);
      }

      for (const entry of meaningfulEntries) {
        await query(
          `
          INSERT INTO beverage_strategy (
            tenant_key,
            subscriber_id,
            subscriber_email,
            beverage_id,
            tags,
            contexts,
            linked_categories,
            linked_products,
            upsell_enabled,
            priority,
            metadata,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (tenant_key, beverage_id)
          DO UPDATE SET
            subscriber_id = EXCLUDED.subscriber_id,
            subscriber_email = EXCLUDED.subscriber_email,
            tags = EXCLUDED.tags,
            contexts = EXCLUDED.contexts,
            linked_categories = EXCLUDED.linked_categories,
            linked_products = EXCLUDED.linked_products,
            upsell_enabled = EXCLUDED.upsell_enabled,
            priority = EXCLUDED.priority,
            metadata = EXCLUDED.metadata,
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            scope.tenantKey,
            scope.subscriberId,
            scope.subscriberEmail,
            entry.beverage_id,
            JSON.stringify(entry.tags),
            JSON.stringify(entry.contexts),
            JSON.stringify(entry.linked_categories),
            JSON.stringify(entry.linked_products),
            entry.upsell_enabled,
            entry.priority,
            JSON.stringify(entry.metadata),
          ]
        );
      }

      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } else {
    const db = getDb();
    if (!Array.isArray(db.beverage_strategy)) {
      db.beverage_strategy = [];
    }

    db.beverage_strategy = db.beverage_strategy.filter(
      (row) => String(row?.tenant_key || '') !== String(scope.tenantKey)
    );

    meaningfulEntries.forEach((entry, index) => {
      db.beverage_strategy.push({
        id: `${scope.tenantKey}:${entry.beverage_id}:${index}`,
        tenant_key: scope.tenantKey,
        subscriber_id: scope.subscriberId,
        subscriber_email: scope.subscriberEmail,
        ...entry,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    const saveDatabaseDebounced = getSaveDatabaseDebounced();
    if (typeof saveDatabaseDebounced === 'function') {
      saveDatabaseDebounced(db);
    }
  }

  return listStoredStrategies(scope);
}

export async function saveBeverageMetricsSnapshot({ scope, metrics = {} } = {}) {
  if (!scope?.tenantKey) {
    throw new Error('Escopo de tenant nao resolvido para salvar metricas de bebidas.');
  }

  const normalizedMap = normalizeBeverageMetricsSnapshot(metrics);
  const meaningfulEntries = Object.entries(normalizedMap)
    .filter(([, entry]) => isMeaningfulMetrics(entry))
    .map(([beverageId, entry]) => ({
      beverage_id: beverageId,
      cost: normalizeDecimal(entry.cost),
      automation_disabled: entry.automation_disabled === true,
      fixed_as_primary: entry.fixed_as_primary === true,
      manual_priority: toNumber(entry.manual_priority, 0),
      metadata: {},
    }));

  if (usePostgreSQL) {
    await ensureStrategyTable();
    await query('BEGIN');
    try {
      if (meaningfulEntries.length > 0) {
        await query(
          `
          DELETE FROM beverage_metrics
          WHERE tenant_key = $1
            AND beverage_id <> ALL($2::text[])
          `,
          [scope.tenantKey, meaningfulEntries.map((entry) => String(entry.beverage_id))]
        );
      } else {
        await query('DELETE FROM beverage_metrics WHERE tenant_key = $1', [scope.tenantKey]);
      }

      for (const entry of meaningfulEntries) {
        await query(
          `
          INSERT INTO beverage_metrics (
            tenant_key,
            subscriber_id,
            subscriber_email,
            beverage_id,
            cost,
            automation_disabled,
            fixed_as_primary,
            manual_priority,
            metadata,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT (tenant_key, beverage_id)
          DO UPDATE SET
            subscriber_id = EXCLUDED.subscriber_id,
            subscriber_email = EXCLUDED.subscriber_email,
            cost = EXCLUDED.cost,
            automation_disabled = EXCLUDED.automation_disabled,
            fixed_as_primary = EXCLUDED.fixed_as_primary,
            manual_priority = EXCLUDED.manual_priority,
            metadata = EXCLUDED.metadata,
            updated_at = CURRENT_TIMESTAMP
          `,
          [
            scope.tenantKey,
            scope.subscriberId,
            scope.subscriberEmail,
            entry.beverage_id,
            entry.cost,
            entry.automation_disabled,
            entry.fixed_as_primary,
            entry.manual_priority,
            JSON.stringify(entry.metadata),
          ]
        );
      }

      await query('COMMIT');
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } else {
    const db = getDb();
    if (!Array.isArray(db.beverage_metrics)) {
      db.beverage_metrics = [];
    }

    db.beverage_metrics = db.beverage_metrics.filter(
      (row) => String(row?.tenant_key || '') !== String(scope.tenantKey)
    );

    meaningfulEntries.forEach((entry, index) => {
      db.beverage_metrics.push({
        id: `${scope.tenantKey}:${entry.beverage_id}:${index}`,
        tenant_key: scope.tenantKey,
        subscriber_id: scope.subscriberId,
        subscriber_email: scope.subscriberEmail,
        ...entry,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    const saveDatabaseDebounced = getSaveDatabaseDebounced();
    if (typeof saveDatabaseDebounced === 'function') {
      saveDatabaseDebounced(db);
    }
  }

  return listStoredMetrics(scope);
}

async function listTenantBeverages(scope) {
  if (!scope?.subscriberEmail) return [];

  if (usePostgreSQL) {
    const rows = await repo.listEntitiesForSubscriber('Dish', scope.subscriberEmail, null);
    return Array.isArray(rows)
      ? rows.filter((item) => item?.product_type === 'beverage')
      : [];
  }

  const db = getDb();
  const dishes = Array.isArray(db?.entities?.Dish) ? db.entities.Dish : [];
  return dishes.filter((item) => {
    const ownerEmail = normalizeEmail(item?.owner_email || item?.subscriber_email);
    return ownerEmail === normalizeEmail(scope.subscriberEmail) && item?.product_type === 'beverage';
  });
}

async function listAnalyticsRows(scope, days = 45) {
  const safeDays = clamp(toNumber(days, 45), 1, 120);

  if (usePostgreSQL) {
    const whereParts = ["created_at >= NOW() - ($1 * INTERVAL '1 day')"];
    const params = [safeDays];

    if (scope?.subscriberId != null) {
      params.push(scope.subscriberId);
      whereParts.push(`subscriber_id = $${params.length}`);
    } else if (scope?.subscriberEmail) {
      params.push(scope.subscriberEmail);
      whereParts.push(`LOWER(TRIM(subscriber_email)) = LOWER(TRIM($${params.length}))`);
    } else {
      return [];
    }

    params.push(BEVERAGE_TRACKING_EVENT_NAMES);
    const result = await query(
      `
      SELECT event_name, properties, created_at
      FROM analytics_events
      WHERE ${whereParts.join(' AND ')}
        AND event_name = ANY($${params.length})
      ORDER BY created_at DESC
      `,
      params
    );

    return Array.isArray(result.rows) ? result.rows : [];
  }

  const db = getDb();
  const rows = Array.isArray(db?.analytics_events) ? db.analytics_events : [];
  const sinceTs = Date.now() - (safeDays * 24 * 60 * 60 * 1000);
  return rows.filter((row) => {
    const createdAt = new Date(row?.created_at || 0).getTime();
    const eventName = String(row?.event_name || '');
    const sameSubscriber =
      (scope?.subscriberId != null && normalizeInteger(row?.subscriber_id) === scope.subscriberId) ||
      (scope?.subscriberId == null &&
        normalizeEmail(row?.subscriber_email) === normalizeEmail(scope?.subscriberEmail));
    return createdAt >= sinceTs && sameSubscriber && BEVERAGE_TRACKING_EVENT_NAMES.includes(eventName);
  });
}

function estimateMarginSignal({ beverage = {}, strategy = {} }) {
  let signal = 42;
  const price = toNumber(beverage?.price, 0);
  const volume = toNumber(beverage?.volume_ml, 0);
  const tags = normalizeArray(strategy.tags);
  const packaging = normalizeText(strategy.packaging, 40) || '';
  const type = normalizeText(beverage?.beverage_type, 40) || 'industrial';

  if (tags.includes('alta_margem')) signal += 26;
  if (tags.includes('premium')) signal += 14;
  if (type === 'industrial') signal += 8;
  if (type === 'natural') signal -= 4;
  if (volume >= 900) signal += 6;
  if (packaging === '2l') signal += 8;
  if (packaging === 'lata') signal += 4;
  if (price >= 10) signal += 6;
  if (price >= 16) signal += 4;

  return clamp(Math.round(signal), 20, 100);
}

function buildPerformanceMaps(rows = []) {
  const specificMap = new Map();
  const fallbackMap = new Map();

  rows.forEach((row) => {
    const eventName = String(row?.event_name || '').trim().toLowerCase();
    const properties = row?.properties && typeof row.properties === 'object' ? row.properties : {};
    const beverageId = getBeverageIdFromProps(properties);
    const context = getContextFromProps(properties);
    const createdAt = row?.created_at || null;

    if (eventName === 'beverage_suggested') {
      accumulatePerformanceEvent(specificMap, beverageId, {
        suggested: 1,
        context,
        created_at: createdAt,
        source: 'tracked',
      });
      return;
    }

    if (eventName === 'beverage_clicked') {
      accumulatePerformanceEvent(specificMap, beverageId, {
        clicked: 1,
        context,
        created_at: createdAt,
        source: 'tracked',
      });
      return;
    }

    if (eventName === 'beverage_added') {
      accumulatePerformanceEvent(specificMap, beverageId, {
        added: 1,
        revenue_generated:
          toNumber(properties?.added_value, 0) ||
          toNumber(properties?.beverage_price, 0) ||
          toNumber(properties?.item_total, 0),
        context,
        created_at: createdAt,
        source: 'tracked',
      });
      return;
    }

    if (eventName === 'beverage_rejected') {
      accumulatePerformanceEvent(specificMap, beverageId, {
        rejected: 1,
        context,
        created_at: createdAt,
        source: 'tracked',
      });
      return;
    }

    if (eventName === 'beverage_upgraded') {
      accumulatePerformanceEvent(specificMap, beverageId, {
        upgraded: 1,
        added: 1,
        revenue_generated:
          toNumber(properties?.added_value, 0) ||
          toNumber(properties?.delta_price, 0) ||
          toNumber(properties?.beverage_price, 0),
        upgrade_revenue_generated:
          toNumber(properties?.delta_price, 0) ||
          toNumber(properties?.added_value, 0),
        context,
        created_at: createdAt,
        source: 'tracked',
      });
      return;
    }

    if (eventName === 'add_to_cart' && String(properties?.product_type || '').toLowerCase() === 'beverage') {
      accumulatePerformanceEvent(fallbackMap, beverageId, {
        added: 1,
        revenue_generated:
          toNumber(properties?.item_total, 0) * Math.max(1, toNumber(properties?.quantity, 1)),
        context,
        created_at: createdAt,
        source: 'fallback',
      });
      return;
    }

    if (eventName === 'upsell_accepted' && isBeverageSource(properties)) {
      accumulatePerformanceEvent(fallbackMap, beverageId, {
        suggested: 1,
        added: 1,
        revenue_generated:
          toNumber(properties?.offer_price, 0) ||
          toNumber(properties?.item_total, 0),
        context,
        created_at: createdAt,
        source: 'fallback',
      });
      return;
    }

    if (eventName === 'upsell_shown' && isBeverageSource(properties)) {
      const ids = Array.isArray(properties?.dish_ids)
        ? properties.dish_ids
        : [properties?.dish_id];
      ids.forEach((id) => {
        accumulatePerformanceEvent(fallbackMap, id, {
          suggested: 1,
          context,
          created_at: createdAt,
          source: 'fallback',
        });
      });
      return;
    }

    if ((eventName === 'upsell_rejected' || eventName === 'upsell_skipped') && isBeverageSource(properties)) {
      const ids = Array.isArray(properties?.dish_ids)
        ? properties.dish_ids
        : [properties?.dish_id];
      ids.forEach((id) => {
        accumulatePerformanceEvent(fallbackMap, id, {
          suggested: 1,
          rejected: 1,
          context,
          created_at: createdAt,
          source: 'fallback',
        });
      });
    }
  });

  return { specificMap, fallbackMap };
}

function buildPerformanceSnapshot({ beverages = [], strategies = {}, metrics = {}, rows = [] }) {
  const beverageMap = new Map(
    (Array.isArray(beverages) ? beverages : [])
      .filter((beverage) => beverage?.id)
      .map((beverage) => [String(beverage.id), beverage])
  );
  const { specificMap, fallbackMap } = buildPerformanceMaps(rows);

  const merged = {};
  const allIds = new Set([
    ...Array.from(beverageMap.keys()),
    ...Array.from(specificMap.keys()),
    ...Array.from(fallbackMap.keys()),
  ]);

  const provisionalList = Array.from(allIds).map((beverageId) => {
    const beverage = beverageMap.get(String(beverageId)) || null;
    const strategy = strategies?.[beverageId] || {};
    const metricEntry = metrics?.[beverageId] || {};
    const sourceEntry = specificMap.get(String(beverageId)) || fallbackMap.get(String(beverageId)) || {
      ...makeEmptyPerformanceEntry(),
      beverage_id: String(beverageId),
    };

    const suggested = toNumber(sourceEntry.suggested, 0);
    const clicked = toNumber(sourceEntry.clicked, 0);
    const added = toNumber(sourceEntry.added, 0);
    const upgraded = toNumber(sourceEntry.upgraded, 0);
    const rejected = toNumber(sourceEntry.rejected, 0);
    const revenueGenerated = Number(toNumber(sourceEntry.revenue_generated, 0).toFixed(2));
    const marginSignal = estimateMarginSignal({ beverage, strategy });
    const marginMetrics = calculateBeverageMarginMetrics({
      price: beverage?.price,
      cost: metricEntry?.cost,
      estimatedMarginSignal: marginSignal,
    });

    return {
      beverage_id: String(beverageId),
      beverage_name: beverage?.name || 'Bebida',
      beverage_price: toNumber(beverage?.price, 0),
      suggested,
      clicked,
      added,
      rejected,
      upgraded,
      revenue_generated: revenueGenerated,
      upgrade_revenue_generated: Number(toNumber(sourceEntry.upgrade_revenue_generated, 0).toFixed(2)),
      acceptance_rate: safeRate(added, suggested),
      click_rate: safeRate(clicked, suggested),
      rejection_rate: safeRate(rejected, suggested),
      upgrade_rate: safeRate(upgraded, added || suggested),
      margin_signal: marginSignal,
      ...marginMetrics,
      context_counts: sourceEntry.contexts || {},
      top_context:
        Object.entries(sourceEntry.contexts || {}).sort((left, right) => right[1] - left[1])[0]?.[0] || null,
      last_event_at: sourceEntry.last_event_at || null,
      source: sourceEntry.source || 'heuristic',
      metrics: {
        ...normalizeMetricsEntry(metricEntry),
      },
      strategy,
      beverage,
    };
  });

  const maxRevenue = provisionalList.reduce(
    (highest, entry) => Math.max(highest, toNumber(entry.revenue_generated, 0)),
    0
  );

  const finalizedList = provisionalList.map((entry) => {
    const revenueWeight = maxRevenue > 0 ? (toNumber(entry.revenue_generated, 0) / maxRevenue) * 100 : 0;
    const recommendationScore = Number(
      (
        entry.acceptance_rate * 0.42 +
        entry.click_rate * 0.16 +
        entry.upgrade_rate * 0.1 +
        revenueWeight * 0.2 +
        entry.margin_signal * 0.12
      ).toFixed(2)
    );
    const finalScore = buildBeverageFinalScore({
      beverage: entry.beverage,
      strategy: entry.strategy,
      metrics: entry.metrics,
      performance: entry,
      marginMetrics: entry,
      revenueWeight,
    });

    const confidence = clamp(
      Math.round(
        Math.min(
          100,
          toNumber(entry.suggested, 0) * 8 +
            toNumber(entry.added, 0) * 10 +
            toNumber(entry.clicked, 0) * 4
        )
      ),
      0,
      100
    );
    const decisionReasons = buildBeverageDecisionReasons({
      beverage: entry.beverage,
      strategy: entry.strategy,
      metrics: entry.metrics,
      performance: entry,
      marginMetrics: entry,
      finalScore,
    });

    return {
      ...entry,
      recommendation_score: recommendationScore,
      confidence,
      final_score: finalScore,
      decision_reasons: decisionReasons,
    };
  });

  const decisionSummary = buildBeverageDecisionSnapshot(finalizedList);
  const abCandidateIds = new Set(decisionSummary.ab_candidate_ids || []);
  const sortedForPriority = [...finalizedList].sort(
    (left, right) => toNumber(right.final_score, 0) - toNumber(left.final_score, 0)
  );
  const priorityMap = new Map(sortedForPriority.map((entry, index) => [entry.beverage_id, index + 1]));

  const enrichedList = finalizedList.map((entry) => {
    const decisionState =
      entry.metrics?.automation_disabled === true
        ? 'manual_only'
        : entry.metrics?.fixed_as_primary === true
          ? 'fixed'
          : toNumber(entry.acceptance_rate, 0) < 8 && toNumber(entry.suggested, 0) >= 6
            ? 'cooldown'
            : priorityMap.get(entry.beverage_id) <= 3
              ? 'promoted'
              : 'normal';

    return {
      ...entry,
      auto_priority: priorityMap.get(entry.beverage_id) || null,
      decision_state: decisionState,
      ab_test_candidate: abCandidateIds.has(entry.beverage_id),
      automation_disabled: entry.metrics?.automation_disabled === true,
      fixed_as_primary: entry.metrics?.fixed_as_primary === true,
      manual_priority: toNumber(entry.metrics?.manual_priority, 0),
    };
  });

  enrichedList.forEach((entry) => {
    const { beverage, strategy, metrics: internalMetrics, ...publicEntry } = entry;
    merged[entry.beverage_id] = publicEntry;
  });

  const totalSuggested = enrichedList.reduce((sum, entry) => sum + toNumber(entry.suggested, 0), 0);
  const totalAdded = enrichedList.reduce((sum, entry) => sum + toNumber(entry.added, 0), 0);
  const totalRevenueGenerated = Number(
    enrichedList.reduce((sum, entry) => sum + toNumber(entry.revenue_generated, 0), 0).toFixed(2)
  );
  const totalMarginCoverage = enrichedList.filter((entry) => entry.margin_source === 'real').length;

  const topAcceptance = [...enrichedList]
    .filter((entry) => entry.suggested > 0 || entry.added > 0)
    .sort((left, right) => right.acceptance_rate - left.acceptance_rate || right.confidence - left.confidence)
    .slice(0, 5)
    .map((entry) => serializePerformanceEntry(entry, false));

  const topRevenue = [...enrichedList]
    .filter((entry) => entry.revenue_generated > 0)
    .sort((left, right) => right.revenue_generated - left.revenue_generated)
    .slice(0, 5)
    .map((entry) => serializePerformanceEntry(entry, false));

  const underexposedHighMargin = [...enrichedList]
    .filter((entry) => entry.profitability_signal >= 68 && entry.suggested <= 2)
    .sort((left, right) => right.profitability_signal - left.profitability_signal || right.recommendation_score - left.recommendation_score)
    .slice(0, 5)
    .map((entry) => serializePerformanceEntry(entry, false));

  const opportunities = [];

  underexposedHighMargin.forEach((entry) => {
    opportunities.push({
      id: `high-margin:${entry.beverage_id}`,
      severity: 'important',
      title: `${entry.beverage_name} tem boa margem e pouca exposicao`,
      description: 'Vale subir essa bebida nas sugestoes e nos contextos certos para melhorar lucro sem mexer no cardapio inteiro.',
      impact: `${entry.margin_source === 'real' ? 'Margem real' : 'Rentabilidade estimada'} ${entry.profitability_signal}/100 com apenas ${entry.suggested} sugestao(oes).`,
      beverage_id: entry.beverage_id,
      actionId: 'improve-weak-beverages',
      actionLabel: 'Dar mais exposicao',
    });
  });

  enrichedList
    .filter((entry) => entry.suggested >= 4 && entry.acceptance_rate < 8)
    .sort((left, right) => left.acceptance_rate - right.acceptance_rate)
    .slice(0, 3)
    .forEach((entry) => {
      opportunities.push({
        id: `review:${entry.beverage_id}`,
        severity: 'critical',
        title: `${entry.beverage_name} aparece, mas converte pouco`,
        description: 'Esse item esta sendo mostrado mais do que deveria para a resposta real do cliente.',
        impact: `Aceitacao em ${entry.acceptance_rate}% com ${entry.suggested} exibicoes.`,
        beverage_id: entry.beverage_id,
        actionId: 'activate-basic-upsell',
        actionLabel: 'Revisar bebida principal',
      });
    });

  enrichedList
    .filter((entry) => entry.acceptance_rate >= 18 && entry.suggested <= 6)
    .sort((left, right) => right.acceptance_rate - left.acceptance_rate)
    .slice(0, 3)
    .forEach((entry) => {
      opportunities.push({
        id: `promote:${entry.beverage_id}`,
        severity: 'opportunity',
        title: `${entry.beverage_name} tem resposta boa e pode vender mais`,
        description: 'A bebida ja mostrou aceitacao acima da media. O proximo passo e aparecer mais nos fluxos certos.',
        impact: `Aceitacao em ${entry.acceptance_rate}% com score ${entry.recommendation_score}.`,
        beverage_id: entry.beverage_id,
        actionId: 'link-suggested-beverages',
        actionLabel: 'Promover melhor',
      });
    });

  if (totalMarginCoverage < enrichedList.filter((entry) => entry.beverage_price > 0).length) {
    opportunities.push({
      id: 'margin-coverage',
      severity: 'important',
      title: 'Ainda faltam custos para liberar margem real no motor',
      description: 'Sem custo cadastrado, o sistema continua funcionando, mas depende de estimativa para parte das bebidas.',
      impact: `${totalMarginCoverage} bebida(s) ja usam margem real e ${Math.max(0, enrichedList.length - totalMarginCoverage)} ainda estao no fallback.`,
      actionId: 'prepare-beverages',
      actionLabel: 'Completar custos',
    });
  }

  return {
    performance_by_beverage: merged,
    performance_summary: {
      total_beverages_with_data: enrichedList.filter((entry) => entry.suggested > 0 || entry.added > 0).length,
      total_suggested: totalSuggested,
      total_added: totalAdded,
      total_revenue_generated: totalRevenueGenerated,
      module_acceptance_rate: safeRate(totalAdded, totalSuggested),
      top_acceptance: topAcceptance,
      top_revenue: topRevenue,
      underexposed_high_margin: underexposedHighMargin,
      real_margin_coverage: totalMarginCoverage,
      learning_state:
        totalSuggested >= 10
          ? 'aprendendo_com_dados'
          : totalSuggested > 0
            ? 'dados_iniciais'
            : 'fallback_heuristico',
    },
    opportunities: opportunities.slice(0, 8),
    decision_summary: decisionSummary,
  };
}

function sanitizePublicPerformanceMap(rawValue = {}) {
  return Object.entries(rawValue || {}).reduce((accumulator, [beverageId, entry]) => {
    if (!entry || typeof entry !== 'object') return accumulator;
    const {
      cost,
      margin_value,
      margin_percentage,
      decision_reasons,
      ...safeEntry
    } = entry;
    accumulator[String(beverageId)] = safeEntry;
    return accumulator;
  }, {});
}

function serializePerformanceEntry(entry = {}, includeSensitive = false) {
  const { beverage, strategy, metrics: internalMetrics, ...nextEntry } = entry || {};
  if (includeSensitive) {
    return nextEntry;
  }

  const { cost, margin_value, margin_percentage, decision_reasons, ...safeEntry } = nextEntry;
  return safeEntry;
}

function sanitizePublicDecisionSummary(summary = {}) {
  return {
    primary_beverage_id: summary?.primary_beverage_id || null,
    secondary_beverage_id: summary?.secondary_beverage_id || null,
    active_ab_test: summary?.active_ab_test === true,
    ab_candidate_ids: Array.isArray(summary?.ab_candidate_ids) ? summary.ab_candidate_ids : [],
    score_gap: toNumber(summary?.score_gap, 0),
  };
}

export async function getBeverageIntelligenceSnapshot({
  scope,
  days = 45,
  includeSensitive = true,
} = {}) {
  const safeScope = scope?.tenantKey ? scope : await resolveBeverageTenantScope(scope || {});
  if (!safeScope?.tenantKey) {
    return {
      strategy_data: {},
      performance_by_beverage: {},
      performance_summary: {
        total_beverages_with_data: 0,
        total_suggested: 0,
        total_added: 0,
        total_revenue_generated: 0,
        module_acceptance_rate: 0,
        top_acceptance: [],
        top_revenue: [],
        underexposed_high_margin: [],
        real_margin_coverage: 0,
        learning_state: 'fallback_heuristico',
      },
      metrics_by_beverage: {},
      decision_summary: {
        primary_beverage_id: null,
        primary_beverage_name: null,
        primary_reason: null,
        secondary_beverage_id: null,
        secondary_beverage_name: null,
        active_ab_test: false,
        ab_candidate_ids: [],
        score_gap: 0,
        automated_count: 0,
        fixed_count: 0,
        automation_disabled_count: 0,
        decision_log: [],
      },
      opportunities: [],
      generated_at: new Date().toISOString(),
    };
  }

  const [strategyData, metricsData, beverages, analyticsRows] = await Promise.all([
    listStoredStrategies(safeScope),
    listStoredMetrics(safeScope),
    listTenantBeverages(safeScope),
    listAnalyticsRows(safeScope, days),
  ]);

  const performance = buildPerformanceSnapshot({
    beverages,
    strategies: strategyData,
    metrics: metricsData,
    rows: analyticsRows,
  });

  const performanceByBeverage = includeSensitive
    ? performance.performance_by_beverage
    : sanitizePublicPerformanceMap(performance.performance_by_beverage);

  return {
    strategy_data: strategyData,
    performance_by_beverage: performanceByBeverage,
    performance_summary: performance.performance_summary,
    metrics_by_beverage: includeSensitive ? metricsData : {},
    decision_summary: includeSensitive
      ? performance.decision_summary
      : sanitizePublicDecisionSummary(performance.decision_summary),
    opportunities: performance.opportunities,
    generated_at: new Date().toISOString(),
  };
}
