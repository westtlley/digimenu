/**
 * Sistema básico de analytics
 * Rastreia métricas de negócio e uso do sistema.
 */
import { query } from '../db/postgres.js';
import { getDb, getSaveDatabaseDebounced, usePostgreSQL } from '../config/appConfig.js';

const COMMERCIAL_EVENT_NAMES = [
  'product_view',
  'add_to_cart',
  'checkout_started',
  'order_completed',
  'upsell_shown',
  'upsell_accepted',
  'upsell_rejected',
  'combo_clicked',
  'combo_added'
];

const normalizeEventName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .slice(0, 100);

const normalizeString = (value, maxLength = 255) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeProperties = (properties) => {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return {};
  }
  return properties;
};

const toNumber = (value) => Number(value || 0);
const safeRate = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

const getProductField = (properties = {}, ...keys) => {
  for (const key of keys) {
    const value = properties?.[key];
    if (value != null && String(value).trim() !== '') {
      return String(value);
    }
  }
  return null;
};

function trackEventJsonFallback(eventRow) {
  const db = getDb();
  if (!db) return;

  if (!Array.isArray(db.analytics_events)) {
    db.analytics_events = [];
  }

  db.analytics_events.push({
    id: Date.now().toString(),
    event_name: eventRow.event_name,
    event_category: eventRow.event_category || null,
    subscriber_email: eventRow.subscriber_email || null,
    slug: eventRow.slug || null,
    session_id: eventRow.session_id || null,
    path: eventRow.path || null,
    user_id: eventRow.user_id || null,
    properties: eventRow.properties || {},
    created_at: new Date().toISOString()
  });

  const save = getSaveDatabaseDebounced();
  if (typeof save === 'function') {
    save(db);
  }
}

/**
 * Registrar evento de analytics
 * @param {string} eventName
 * @param {object} properties
 * @param {string|number|null} userId
 * @param {object} context
 */
export async function trackEvent(eventName, properties = {}, userId = null, context = {}) {
  const safeEventName = normalizeEventName(eventName);
  if (!safeEventName) return;

  const safeProperties = normalizeProperties(properties);
  const row = {
    event_name: safeEventName,
    event_category: normalizeString(context.eventCategory || context.category, 60),
    subscriber_email: normalizeString(context.subscriberEmail, 255),
    slug: normalizeString(context.slug, 120),
    session_id: normalizeString(context.sessionId, 120),
    path: normalizeString(context.path, 500),
    user_id: userId != null ? String(userId) : null,
    properties: safeProperties
  };

  try {
    if (usePostgreSQL) {
      await query(
        `INSERT INTO analytics_events
          (event_name, event_category, subscriber_email, slug, session_id, path, user_id, properties, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, CURRENT_TIMESTAMP)`,
        [
          row.event_name,
          row.event_category,
          row.subscriber_email,
          row.slug,
          row.session_id,
          row.path,
          row.user_id,
          JSON.stringify(row.properties || {})
        ]
      );
      return;
    }

    trackEventJsonFallback(row);
  } catch (error) {
    // Não bloquear a aplicação se analytics falhar
    console.debug('Analytics event not tracked:', safeEventName, error?.message || error);
  }
}

/**
 * Obter métricas de um período
 */
export async function getMetrics(startDate, endDate, subscriberEmail = null) {
  try {
    if (!usePostgreSQL) {
      const db = getDb();
      const list = Array.isArray(db?.analytics_events) ? db.analytics_events : [];
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const scope = list.filter((row) => {
        const created = new Date(row.created_at || 0).getTime();
        const sameSubscriber = !subscriberEmail || String(row.subscriber_email || '').toLowerCase() === String(subscriberEmail).toLowerCase();
        return created >= start && created <= end && sameSubscriber;
      });

      const map = new Map();
      scope.forEach((row) => {
        const date = new Date(row.created_at).toISOString().slice(0, 10);
        const key = `${row.event_name}:${date}`;
        map.set(key, {
          event_name: row.event_name,
          count: String((Number(map.get(key)?.count || 0) + 1)),
          date
        });
      });

      return Array.from(map.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }

    const conditions = ['created_at >= $1', 'created_at <= $2'];
    const params = [startDate, endDate];

    if (subscriberEmail) {
      conditions.push('LOWER(TRIM(subscriber_email)) = LOWER(TRIM($3))');
      params.push(subscriberEmail);
    }

    const sql = `
      SELECT
        event_name,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM analytics_events
      WHERE ${conditions.join(' AND ')}
      GROUP BY event_name, DATE(created_at)
      ORDER BY date DESC, count DESC
    `;

    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    return [];
  }
}

/**
 * Dashboard de métricas principais
 */
export async function getDashboardMetrics(subscriberEmail = null) {
  try {
    // Última semana
    const since = new Date();
    since.setDate(since.getDate() - 7);

    if (!usePostgreSQL) {
      const db = getDb();
      const list = Array.isArray(db?.analytics_events) ? db.analytics_events : [];
      const sinceTs = since.getTime();
      const filtered = list.filter((row) => {
        const created = new Date(row.created_at || 0).getTime();
        const sameSubscriber = !subscriberEmail || String(row.subscriber_email || '').toLowerCase() === String(subscriberEmail).toLowerCase();
        return created >= sinceTs && sameSubscriber;
      });

      const map = new Map();
      filtered.forEach((row) => {
        const key = row.event_name;
        if (!map.has(key)) {
          map.set(key, {
            event_name: key,
            total: 0,
            days: new Set(),
            first_occurrence: row.created_at,
            last_occurrence: row.created_at
          });
        }
        const entry = map.get(key);
        entry.total += 1;
        entry.days.add(new Date(row.created_at).toISOString().slice(0, 10));
        if (new Date(row.created_at) < new Date(entry.first_occurrence)) entry.first_occurrence = row.created_at;
        if (new Date(row.created_at) > new Date(entry.last_occurrence)) entry.last_occurrence = row.created_at;
      });

      return Array.from(map.values())
        .map((entry) => ({
          event_name: entry.event_name,
          total: String(entry.total),
          days_active: String(entry.days.size),
          first_occurrence: entry.first_occurrence,
          last_occurrence: entry.last_occurrence
        }))
        .sort((a, b) => Number(b.total) - Number(a.total))
        .slice(0, 20);
    }

    const conditions = subscriberEmail ? ['LOWER(TRIM(subscriber_email)) = LOWER(TRIM($1))'] : [];
    const params = subscriberEmail ? [subscriberEmail] : [];
    conditions.push(`created_at >= $${params.length + 1}`);
    params.push(since);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT
        event_name,
        COUNT(*) as total,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
      FROM analytics_events
      ${whereClause}
      GROUP BY event_name
      ORDER BY total DESC
      LIMIT 20
    `;

    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    return [];
  }
}

function buildCommercialDashboardFromRows(rows) {
  const totals = {
    product_view: 0,
    add_to_cart: 0,
    checkout_started: 0,
    order_completed: 0,
    upsell_shown: 0,
    upsell_accepted: 0,
    upsell_rejected: 0,
    combo_clicked: 0,
    combo_added: 0
  };

  const productViews = new Map();
  const productAdds = new Map();
  const comboActions = new Map();

  rows.forEach((row) => {
    const eventName = String(row.event_name || '');
    if (!Object.prototype.hasOwnProperty.call(totals, eventName)) return;

    totals[eventName] += 1;
    const props = normalizeProperties(row.properties);

    if (eventName === 'product_view') {
      const productId = getProductField(props, 'dish_id', 'product_id', 'id') || 'unknown';
      const productName = getProductField(props, 'dish_name', 'product_name', 'name') || 'Item sem nome';
      const key = `${productId}::${productName}`;
      productViews.set(key, {
        product_id: productId,
        product_name: productName,
        views: (productViews.get(key)?.views || 0) + 1
      });
    }

    if (eventName === 'add_to_cart') {
      const productId = getProductField(props, 'dish_id', 'product_id', 'id') || 'unknown';
      const productName = getProductField(props, 'dish_name', 'product_name', 'name') || 'Item sem nome';
      const key = `${productId}::${productName}`;
      productAdds.set(key, {
        product_id: productId,
        product_name: productName,
        adds: (productAdds.get(key)?.adds || 0) + 1
      });
    }

    if (eventName === 'combo_clicked' || eventName === 'combo_added') {
      const comboId = getProductField(props, 'combo_id', 'dish_id', 'product_id', 'id') || 'combo_unknown';
      const comboName = getProductField(props, 'combo_name', 'dish_name', 'product_name', 'name') || 'Combo';
      const key = `${comboId}::${comboName}`;
      const current = comboActions.get(key) || { combo_id: comboId, combo_name: comboName, clicks: 0, adds: 0 };
      if (eventName === 'combo_clicked') current.clicks += 1;
      if (eventName === 'combo_added') current.adds += 1;
      comboActions.set(key, current);
    }
  });

  const topViewedProducts = Array.from(productViews.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const topAddedProducts = Array.from(productAdds.values())
    .sort((a, b) => b.adds - a.adds)
    .slice(0, 8);

  const topCombos = Array.from(comboActions.values())
    .map((combo) => ({
      ...combo,
      add_rate: safeRate(combo.adds, combo.clicks)
    }))
    .sort((a, b) => (b.clicks + b.adds) - (a.clicks + a.adds))
    .slice(0, 8);

  const views = toNumber(totals.product_view);
  const adds = toNumber(totals.add_to_cart);
  const checkoutStarted = toNumber(totals.checkout_started);
  const ordersCompleted = toNumber(totals.order_completed);
  const upsellShown = toNumber(totals.upsell_shown);
  const upsellAccepted = toNumber(totals.upsell_accepted);
  const upsellRejected = toNumber(totals.upsell_rejected);
  const comboClicked = toNumber(totals.combo_clicked);
  const comboAdded = toNumber(totals.combo_added);

  return {
    totals: {
      product_views: views,
      add_to_cart: adds,
      checkout_started: checkoutStarted,
      order_completed: ordersCompleted,
      upsell_shown: upsellShown,
      upsell_accepted: upsellAccepted,
      upsell_rejected: upsellRejected,
      combo_clicked: comboClicked,
      combo_added: comboAdded
    },
    rates: {
      view_to_cart: safeRate(adds, views),
      checkout_to_order: safeRate(ordersCompleted, checkoutStarted),
      upsell_acceptance: safeRate(upsellAccepted, upsellShown),
      combo_add_rate: safeRate(comboAdded, comboClicked)
    },
    top_viewed_products: topViewedProducts,
    top_added_products: topAddedProducts,
    top_combos: topCombos
  };
}

/**
 * Métricas comerciais para dashboard operacional.
 */
export async function getCommercialDashboardMetrics(subscriberEmail = null, options = {}) {
  const days = Math.max(1, Math.min(90, Number(options.days || 30)));

  if (!usePostgreSQL) {
    const db = getDb();
    const list = Array.isArray(db?.analytics_events) ? db.analytics_events : [];
    const sinceTs = Date.now() - (days * 24 * 60 * 60 * 1000);

    const scoped = list.filter((row) => {
      const created = new Date(row.created_at || 0).getTime();
      const inWindow = created >= sinceTs;
      const allowedEvent = COMMERCIAL_EVENT_NAMES.includes(String(row.event_name || ''));
      const sameSubscriber = !subscriberEmail || String(row.subscriber_email || '').toLowerCase() === String(subscriberEmail).toLowerCase();
      return inWindow && allowedEvent && sameSubscriber;
    });

    return buildCommercialDashboardFromRows(scoped);
  }

  try {
    const rowsResult = await query(
      `
      SELECT event_name, properties, created_at
      FROM analytics_events
      WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')
        AND event_name = ANY($${subscriberEmail ? 3 : 2})
        ${subscriberEmail ? 'AND LOWER(TRIM(subscriber_email)) = LOWER(TRIM($2))' : ''}
      ORDER BY created_at DESC
      `,
      subscriberEmail
        ? [days, subscriberEmail, COMMERCIAL_EVENT_NAMES]
        : [days, COMMERCIAL_EVENT_NAMES]
    );

    return buildCommercialDashboardFromRows(rowsResult.rows || []);
  } catch (error) {
    console.error('Erro ao obter dashboard comercial:', error);
    return buildCommercialDashboardFromRows([]);
  }
}

/**
 * Eventos importantes para rastrear
 */
export const EVENTS = {
  // Pedidos
  ORDER_CREATED: 'order.created',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',

  // PDV
  PDV_SALE: 'pdv.sale',
  PDV_SALE_COMPLETED: 'pdv.sale.completed',

  // Caixa
  CAIXA_OPENED: 'caixa.opened',
  CAIXA_CLOSED: 'caixa.closed',

  // Usuários
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_SIGNUP: 'user.signup',

  // Assinantes
  SUBSCRIBER_CREATED: 'subscriber.created',
  SUBSCRIBER_ACTIVATED: 'subscriber.activated',
  SUBSCRIBER_DEACTIVATED: 'subscriber.deactivated',

  // Sistema
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
};

/**
 * Middleware para rastrear requisições
 */
export function analyticsMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Rastrear apenas endpoints importantes
    if (req.path.startsWith('/api/entities') || req.path.startsWith('/api/functions')) {
      trackEvent(
        'api.request',
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration
        },
        req.user?.id || null,
        {
          subscriberEmail: req.user?.subscriber_email || req.user?.email || null,
          path: req.path,
          sessionId: req.headers['x-session-id'] || null,
          category: 'api'
        }
      );
    }
  });

  next();
}

export default {
  trackEvent,
  getMetrics,
  getDashboardMetrics,
  getCommercialDashboardMetrics,
  analyticsMiddleware,
  EVENTS
};
