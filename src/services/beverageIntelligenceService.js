import { apiClient } from '@/api/apiClient';
import { normalizeBeverageStrategy } from '@/utils/beverageStrategy';

const PUBLIC_CACHE_PREFIX = 'beverage-intelligence-public-v1:';

const normalizeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildTenantParams = (entityContextOpts = {}) => {
  const params = {};
  if (entityContextOpts?.as_subscriber_id != null) {
    params.as_subscriber_id = entityContextOpts.as_subscriber_id;
  }
  if (entityContextOpts?.as_subscriber) {
    params.as_subscriber = entityContextOpts.as_subscriber;
  }
  return params;
};

const normalizePerformanceMap = (rawValue = {}) => {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [beverageId, entry]) => {
    if (!beverageId || !entry || typeof entry !== 'object') return accumulator;
    accumulator[String(beverageId)] = {
      beverage_id: String(entry.beverage_id || beverageId),
      beverage_name: entry.beverage_name || 'Bebida',
      beverage_price: toNumber(entry.beverage_price, 0),
      suggested: toNumber(entry.suggested, 0),
      clicked: toNumber(entry.clicked, 0),
      added: toNumber(entry.added, 0),
      rejected: toNumber(entry.rejected, 0),
      upgraded: toNumber(entry.upgraded, 0),
      revenue_generated: toNumber(entry.revenue_generated, 0),
      upgrade_revenue_generated: toNumber(entry.upgrade_revenue_generated, 0),
      acceptance_rate: toNumber(entry.acceptance_rate, 0),
      click_rate: toNumber(entry.click_rate, 0),
      rejection_rate: toNumber(entry.rejection_rate, 0),
      upgrade_rate: toNumber(entry.upgrade_rate, 0),
      margin_signal: toNumber(entry.margin_signal, 0),
      recommendation_score: toNumber(entry.recommendation_score, 0),
      confidence: toNumber(entry.confidence, 0),
      top_context: entry.top_context || null,
      last_event_at: entry.last_event_at || null,
      source: entry.source || 'heuristic',
      context_counts: entry.context_counts && typeof entry.context_counts === 'object' ? entry.context_counts : {},
    };
    return accumulator;
  }, {});
};

const normalizeSummary = (rawValue = {}) => ({
  total_beverages_with_data: toNumber(rawValue?.total_beverages_with_data, 0),
  total_suggested: toNumber(rawValue?.total_suggested, 0),
  total_added: toNumber(rawValue?.total_added, 0),
  total_revenue_generated: toNumber(rawValue?.total_revenue_generated, 0),
  module_acceptance_rate: toNumber(rawValue?.module_acceptance_rate, 0),
  top_acceptance: normalizeArray(rawValue?.top_acceptance),
  top_revenue: normalizeArray(rawValue?.top_revenue),
  underexposed_high_margin: normalizeArray(rawValue?.underexposed_high_margin),
  learning_state: rawValue?.learning_state || 'fallback_heuristico',
});

const normalizeSnapshot = (payload = {}) => ({
  strategy_data: normalizeBeverageStrategy(payload?.strategy_data || {}),
  performance_by_beverage: normalizePerformanceMap(payload?.performance_by_beverage || {}),
  performance_summary: normalizeSummary(payload?.performance_summary || {}),
  opportunities: normalizeArray(payload?.opportunities),
  generated_at: payload?.generated_at || null,
});

const getPublicCacheKey = (slug) => `${PUBLIC_CACHE_PREFIX}${String(slug || '').trim().toLowerCase()}`;

const writePublicCache = (slug, snapshot) => {
  if (typeof window === 'undefined' || !window.localStorage || !slug) return;
  try {
    window.localStorage.setItem(getPublicCacheKey(slug), JSON.stringify(snapshot));
  } catch (_error) {
    // noop
  }
};

const readPublicCache = (slug) => {
  if (typeof window === 'undefined' || !window.localStorage || !slug) return null;
  try {
    const raw = window.localStorage.getItem(getPublicCacheKey(slug));
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
};

export const mergeBeverageStrategySources = (...sources) => {
  const merged = {};
  sources.forEach((source) => {
    const normalized = normalizeBeverageStrategy(source || {});
    Object.entries(normalized).forEach(([beverageId, entry]) => {
      merged[beverageId] = {
        ...(merged[beverageId] || {}),
        ...entry,
        tags: normalizeArray(entry?.tags?.length ? entry.tags : merged[beverageId]?.tags),
        contexts: normalizeArray(entry?.contexts?.length ? entry.contexts : merged[beverageId]?.contexts),
        linkedCategoryIds: normalizeArray(
          entry?.linkedCategoryIds?.length ? entry.linkedCategoryIds : merged[beverageId]?.linkedCategoryIds
        ),
        linkedDishIds: normalizeArray(
          entry?.linkedDishIds?.length ? entry.linkedDishIds : merged[beverageId]?.linkedDishIds
        ),
      };
    });
  });
  return normalizeBeverageStrategy(merged);
};

export async function getPublicBeverageIntelligence(slug, options = {}) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) return normalizeSnapshot({});

  try {
    const payload = await apiClient.get(`/public/beverages/intelligence/${encodeURIComponent(safeSlug)}`, {
      days: options?.days,
    });
    const snapshot = normalizeSnapshot(payload || {});
    writePublicCache(safeSlug, snapshot);
    return snapshot;
  } catch (error) {
    const cached = readPublicCache(safeSlug);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

export async function getAdminBeverageIntelligence(entityContextOpts = {}, options = {}) {
  const payload = await apiClient.get('/beverages/intelligence', {
    ...buildTenantParams(entityContextOpts),
    days: options?.days,
  });

  return normalizeSnapshot(payload || {});
}

export async function saveAdminBeverageStrategy(strategyData = {}, entityContextOpts = {}) {
  const params = new URLSearchParams(buildTenantParams(entityContextOpts));
  const queryString = params.toString();
  const endpoint = queryString
    ? `/beverages/intelligence/strategy?${queryString}`
    : '/beverages/intelligence/strategy';

  const payload = await apiClient.put(endpoint, {
    strategies: normalizeBeverageStrategy(strategyData || {}),
  });

  return normalizeSnapshot(payload || {});
}
