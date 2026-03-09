import { apiClient } from '@/api/apiClient';

export const COMMERCIAL_EVENTS = {
  PRODUCT_VIEW: 'product_view',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT_STARTED: 'checkout_started',
  ORDER_COMPLETED: 'order_completed',
  UPSELL_SHOWN: 'upsell_shown',
  UPSELL_ACCEPTED: 'upsell_accepted',
  UPSELL_REJECTED: 'upsell_rejected',
  COMBO_CLICKED: 'combo_clicked',
  COMBO_ADDED: 'combo_added'
};

const SESSION_KEY = 'dm_analytics_session_id';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h
const shownEventCache = new Map();

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

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
  } catch (error) {
    // ignore parse errors
  }

  const id = createSessionId();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id,
      expires_at: Date.now() + SESSION_TTL_MS
    }));
  } catch (error) {
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

export async function trackCommercialEvent(eventName, properties = {}) {
  try {
    const payload = {
      event_name: String(eventName || '').trim().toLowerCase(),
      properties: properties && typeof properties === 'object' ? properties : {},
      ...basePayload()
    };

    if (!payload.event_name) return;

    await apiClient.post('/analytics/events', payload);
  } catch (error) {
    // Analytics não pode quebrar fluxo de compra.
    console.debug('commercial analytics event ignored:', eventName, error?.message || error);
  }
}

export async function trackCommercialEventOnce(eventName, key, properties = {}) {
  const cacheKey = `${String(eventName || '')}:${String(key || '')}`;
  if (!key || shownEventCache.has(cacheKey)) return;
  shownEventCache.set(cacheKey, Date.now());
  return trackCommercialEvent(eventName, properties);
}

