import { apiClient } from '@/api/apiClient';

export const COMMERCIAL_EVENTS = {
  PRODUCT_VIEW: 'product_view',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT_STARTED: 'checkout_started',
  ORDER_COMPLETED: 'order_completed',
  UPSELL_SHOWN: 'upsell_shown',
  UPSELL_ACCEPTED: 'upsell_accepted',
  UPSELL_REJECTED: 'upsell_rejected',
  UPSELL_SKIPPED: 'upsell_skipped',
  COMBO_CLICKED: 'combo_clicked',
  COMBO_ADDED: 'combo_added',
  BEVERAGE_SUGGESTED: 'beverage_suggested',
  BEVERAGE_CLICKED: 'beverage_clicked',
  BEVERAGE_ADDED: 'beverage_added',
  BEVERAGE_REJECTED: 'beverage_rejected',
  BEVERAGE_UPGRADED: 'beverage_upgraded'
};

const SESSION_KEY = 'dm_analytics_session_id';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h
const shownEventCache = new Map();
const SHOWN_CACHE_TTL_MS = 1000 * 60 * 20; // 20 min
const SHOWN_CACHE_MAX_SIZE = 400;

const SIGNALS_KEY = 'dm_commercial_signals_v1';
const SIGNALS_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
const SIGNALS_MAX_SLUGS = 24;
const SIGNALS_MAX_ITEMS = 96;
const BEVERAGE_SESSION_KEY = 'dm_beverage_session_signals_v1';

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const normalizeId = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, 120) : null;
};

const toPositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed >= 0 ? parsed : fallback;
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getSlugFromPathname = () => {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/s\/([a-z0-9-]+)(?:\/|$)/i);
  return match ? normalizeSlug(match[1]) : null;
};

function createSessionId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `dm_${Date.now().toString(36)}_${random}`;
}

function getSessionId() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && Number(parsed?.expires_at || 0) > Date.now()) {
        return parsed.id;
      }
    }
  } catch {
    // ignore parse errors
  }

  const id = createSessionId();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id,
      expires_at: Date.now() + SESSION_TTL_MS
    }));
  } catch {
    // ignore storage errors
  }

  return id;
}

const basePayload = () => {
  if (typeof window === 'undefined') {
    return {
      path: null,
      url: null,
      referrer: null,
      slug: null,
      session_id: null
    };
  }

  return {
    path: window.location.pathname || null,
    url: window.location.href || null,
    referrer: document.referrer || null,
    slug: getSlugFromPathname(),
    session_id: getSessionId()
  };
};

const cleanupShownEventCache = (nowTs = Date.now()) => {
  for (const [key, createdAt] of shownEventCache.entries()) {
    if (!Number.isFinite(createdAt) || (nowTs - createdAt) > SHOWN_CACHE_TTL_MS) {
      shownEventCache.delete(key);
    }
  }

  if (shownEventCache.size <= SHOWN_CACHE_MAX_SIZE) return;
  const overflow = shownEventCache.size - SHOWN_CACHE_MAX_SIZE;
  let removed = 0;
  for (const key of shownEventCache.keys()) {
    shownEventCache.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
};

const makeEmptySignalBucket = () => ({
  updated_at: Date.now(),
  product_views: {},
  add_events: {},
  add_units: {},
  upsell_accepted: {},
  combo_added: {}
});

const trimTopEntries = (obj, maxEntries = SIGNALS_MAX_ITEMS) => {
  if (!isPlainObject(obj)) return {};
  const entries = Object.entries(obj)
    .filter(([key]) => Boolean(normalizeId(key)))
    .map(([key, value]) => [String(key), toPositiveNumber(value, 0)])
    .filter(([, value]) => value > 0);
  if (entries.length <= maxEntries) {
    return Object.fromEntries(entries);
  }
  const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, maxEntries);
  return Object.fromEntries(sorted);
};

const readSignalsStore = () => {
  if (typeof window === 'undefined') return { slugs: {}, updated_at: Date.now() };
  try {
    const raw = localStorage.getItem(SIGNALS_KEY);
    if (!raw) return { slugs: {}, updated_at: Date.now() };
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return { slugs: {}, updated_at: Date.now() };
    return {
      slugs: isPlainObject(parsed.slugs) ? parsed.slugs : {},
      updated_at: toPositiveNumber(parsed.updated_at, Date.now())
    };
  } catch {
    return { slugs: {}, updated_at: Date.now() };
  }
};

const saveSignalsStore = (store) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
};

const cleanupSignalsStore = (store, nowTs = Date.now()) => {
  const slugs = isPlainObject(store?.slugs) ? { ...store.slugs } : {};
  Object.entries(slugs).forEach(([slugKey, bucket]) => {
    const bucketUpdated = toPositiveNumber(bucket?.updated_at, 0);
    if (!bucketUpdated || (nowTs - bucketUpdated) > SIGNALS_TTL_MS) {
      delete slugs[slugKey];
      return;
    }
    slugs[slugKey] = {
      ...makeEmptySignalBucket(),
      ...bucket,
      updated_at: bucketUpdated,
      product_views: trimTopEntries(bucket?.product_views),
      add_events: trimTopEntries(bucket?.add_events),
      add_units: trimTopEntries(bucket?.add_units),
      upsell_accepted: trimTopEntries(bucket?.upsell_accepted),
      combo_added: trimTopEntries(bucket?.combo_added)
    };
  });

  const slugEntries = Object.entries(slugs);
  if (slugEntries.length > SIGNALS_MAX_SLUGS) {
    slugEntries
      .sort((a, b) => toPositiveNumber(b?.[1]?.updated_at, 0) - toPositiveNumber(a?.[1]?.updated_at, 0))
      .slice(SIGNALS_MAX_SLUGS)
      .forEach(([slugKey]) => delete slugs[slugKey]);
  }

  return {
    slugs,
    updated_at: nowTs
  };
};

const incrementCounter = (bucket, key, amount = 1) => {
  const normalizedKey = normalizeId(key);
  if (!normalizedKey || !isPlainObject(bucket)) return;
  bucket[normalizedKey] = toPositiveNumber(bucket[normalizedKey], 0) + toPositiveNumber(amount, 0);
};

const getDishIdFromProperties = (properties = {}) =>
  normalizeId(properties?.dish_id ?? properties?.product_id ?? properties?.id);

const getComboIdFromProperties = (properties = {}) => {
  const comboId = normalizeId(properties?.combo_id ?? properties?.dish_id ?? properties?.product_id ?? properties?.id);
  if (!comboId) return null;
  return comboId.replace(/^combo_/, '');
};

const makeEmptyBeverageSessionBucket = () => ({
  updated_at: Date.now(),
  accepted_count: 0,
  rejected_count: 0,
  clicked_count: 0,
  added_count: 0,
  upgraded_count: 0,
  beverage_accepts: {},
  beverage_rejections: {},
  beverage_clicks: {},
});

const readBeverageSessionStore = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return { slugs: {}, updated_at: Date.now() };
  }

  try {
    const raw = window.sessionStorage.getItem(BEVERAGE_SESSION_KEY);
    if (!raw) return { slugs: {}, updated_at: Date.now() };
    const parsed = JSON.parse(raw);
    return {
      slugs: isPlainObject(parsed?.slugs) ? parsed.slugs : {},
      updated_at: toPositiveNumber(parsed?.updated_at, Date.now()),
    };
  } catch {
    return { slugs: {}, updated_at: Date.now() };
  }
};

const saveBeverageSessionStore = (store) => {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(BEVERAGE_SESSION_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
};

const getBeverageIdFromProperties = (properties = {}) =>
  normalizeId(properties?.beverage_id ?? properties?.dish_id ?? properties?.product_id ?? properties?.id);

const updateBeverageSessionSignals = (eventName, properties = {}, slugFromPayload = null) => {
  if (typeof window === 'undefined') return;

  const slug = normalizeSlug(slugFromPayload || getSlugFromPathname());
  if (!slug) return;

  const store = readBeverageSessionStore();
  const nextStore = {
    ...store,
    updated_at: Date.now(),
    slugs: { ...(store?.slugs || {}) },
  };

  const bucket = {
    ...makeEmptyBeverageSessionBucket(),
    ...(nextStore.slugs[slug] || {}),
  };
  bucket.updated_at = Date.now();

  const beverageId = getBeverageIdFromProperties(properties);

  if (eventName === COMMERCIAL_EVENTS.BEVERAGE_SUGGESTED) {
    incrementCounter(bucket.beverage_clicks, beverageId, 0);
  }

  if (eventName === COMMERCIAL_EVENTS.BEVERAGE_CLICKED) {
    bucket.clicked_count += 1;
    incrementCounter(bucket.beverage_clicks, beverageId, 1);
  }

  if (eventName === COMMERCIAL_EVENTS.BEVERAGE_ADDED) {
    bucket.accepted_count += 1;
    bucket.added_count += 1;
    incrementCounter(bucket.beverage_accepts, beverageId, 1);
  }

  if (eventName === COMMERCIAL_EVENTS.BEVERAGE_UPGRADED) {
    bucket.accepted_count += 1;
    bucket.added_count += 1;
    bucket.upgraded_count += 1;
    incrementCounter(bucket.beverage_accepts, beverageId, 1);
  }

  if (eventName === COMMERCIAL_EVENTS.BEVERAGE_REJECTED) {
    bucket.rejected_count += 1;
    incrementCounter(bucket.beverage_rejections, beverageId, 1);
  }

  nextStore.slugs[slug] = {
    ...bucket,
    beverage_accepts: trimTopEntries(bucket.beverage_accepts),
    beverage_rejections: trimTopEntries(bucket.beverage_rejections),
    beverage_clicks: trimTopEntries(bucket.beverage_clicks),
  };

  saveBeverageSessionStore(nextStore);
};

const updateLocalCommercialSignals = (eventName, properties = {}, slugFromPayload = null) => {
  if (typeof window === 'undefined') return;

  const slug = normalizeSlug(slugFromPayload || getSlugFromPathname());
  if (!slug) return;

  const nowTs = Date.now();
  const currentStore = cleanupSignalsStore(readSignalsStore(), nowTs);
  const nextStore = {
    ...currentStore,
    slugs: { ...(currentStore?.slugs || {}) }
  };

  const bucket = {
    ...makeEmptySignalBucket(),
    ...(nextStore.slugs[slug] || {})
  };
  bucket.updated_at = nowTs;

  if (eventName === COMMERCIAL_EVENTS.PRODUCT_VIEW) {
    incrementCounter(bucket.product_views, getDishIdFromProperties(properties), 1);
  }

  if (eventName === COMMERCIAL_EVENTS.ADD_TO_CART) {
    const dishId = getDishIdFromProperties(properties);
    const units = toPositiveNumber(properties?.quantity ?? properties?.units, 1) || 1;
    incrementCounter(bucket.add_events, dishId, 1);
    incrementCounter(bucket.add_units, dishId, units);
  }

  if (eventName === COMMERCIAL_EVENTS.UPSELL_ACCEPTED) {
    incrementCounter(bucket.upsell_accepted, getDishIdFromProperties(properties), 1);
  }

  if (eventName === COMMERCIAL_EVENTS.COMBO_ADDED) {
    incrementCounter(bucket.combo_added, getComboIdFromProperties(properties), 1);
  }

  nextStore.slugs[slug] = {
    ...bucket,
    product_views: trimTopEntries(bucket.product_views),
    add_events: trimTopEntries(bucket.add_events),
    add_units: trimTopEntries(bucket.add_units),
    upsell_accepted: trimTopEntries(bucket.upsell_accepted),
    combo_added: trimTopEntries(bucket.combo_added)
  };

  saveSignalsStore(cleanupSignalsStore(nextStore, nowTs));
};

export async function trackCommercialEvent(eventName, properties = {}) {
  try {
    const payload = {
      event_name: String(eventName || '').trim().toLowerCase(),
      properties: properties && typeof properties === 'object' ? properties : {},
      ...basePayload()
    };

    if (!payload.event_name) return;

    updateLocalCommercialSignals(payload.event_name, payload.properties, payload.slug);
    updateBeverageSessionSignals(payload.event_name, payload.properties, payload.slug);
    await apiClient.post('/analytics/events', payload);
  } catch (error) {
    // Analytics nao pode quebrar fluxo de compra.
    console.debug('commercial analytics event ignored:', eventName, error?.message || error);
  }
}

export async function trackCommercialEventOnce(eventName, key, properties = {}) {
  const nowTs = Date.now();
  cleanupShownEventCache(nowTs);
  const cacheKey = `${String(eventName || '')}:${String(key || '')}`;
  if (!key || shownEventCache.has(cacheKey)) return;
  shownEventCache.set(cacheKey, nowTs);
  return trackCommercialEvent(eventName, properties);
}

export function getCommercialSignalsForSlug(slugInput = null) {
  if (typeof window === 'undefined') {
    return makeEmptySignalBucket();
  }

  const slug = normalizeSlug(slugInput || getSlugFromPathname());
  if (!slug) return makeEmptySignalBucket();

  const nowTs = Date.now();
  const sanitizedStore = cleanupSignalsStore(readSignalsStore(), nowTs);
  saveSignalsStore(sanitizedStore);

  const bucket = sanitizedStore?.slugs?.[slug];
  if (!bucket) return makeEmptySignalBucket();

  return {
    ...makeEmptySignalBucket(),
    ...bucket,
    product_views: trimTopEntries(bucket.product_views),
    add_events: trimTopEntries(bucket.add_events),
    add_units: trimTopEntries(bucket.add_units),
    upsell_accepted: trimTopEntries(bucket.upsell_accepted),
    combo_added: trimTopEntries(bucket.combo_added)
  };
}

export function getBeverageSessionSignals(slugInput = null) {
  if (typeof window === 'undefined') {
    return makeEmptyBeverageSessionBucket();
  }

  const slug = normalizeSlug(slugInput || getSlugFromPathname());
  if (!slug) return makeEmptyBeverageSessionBucket();

  const bucket = readBeverageSessionStore()?.slugs?.[slug];
  if (!bucket) return makeEmptyBeverageSessionBucket();

  return {
    ...makeEmptyBeverageSessionBucket(),
    ...bucket,
    beverage_accepts: trimTopEntries(bucket.beverage_accepts),
    beverage_rejections: trimTopEntries(bucket.beverage_rejections),
    beverage_clicks: trimTopEntries(bucket.beverage_clicks),
  };
}
