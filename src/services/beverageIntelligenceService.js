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
      profitability_signal: toNumber(entry.profitability_signal, 0),
      margin_value: toNumber(entry.margin_value, 0),
      margin_percentage: toNumber(entry.margin_percentage, 0),
      margin_source: entry.margin_source || 'estimated',
      recommendation_score: toNumber(entry.recommendation_score, 0),
      final_score: toNumber(entry.final_score, 0),
      confidence: toNumber(entry.confidence, 0),
      auto_priority: toNumber(entry.auto_priority, 0),
      decision_state: entry.decision_state || 'normal',
      decision_reasons: normalizeArray(entry.decision_reasons),
      automation_disabled: entry.automation_disabled === true,
      fixed_as_primary: entry.fixed_as_primary === true,
      manual_priority: toNumber(entry.manual_priority, 0),
      ab_test_candidate: entry.ab_test_candidate === true,
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
  real_margin_coverage: toNumber(rawValue?.real_margin_coverage, 0),
  learning_state: rawValue?.learning_state || 'fallback_heuristico',
});

const normalizeMetricsMap = (rawValue = {}) => {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [beverageId, entry]) => {
    if (!beverageId || !entry || typeof entry !== 'object') return accumulator;
    accumulator[String(beverageId)] = {
      cost: entry.cost == null ? null : toNumber(entry.cost, 0),
      automation_disabled: entry.automation_disabled === true,
      fixed_as_primary: entry.fixed_as_primary === true,
      manual_priority: toNumber(entry.manual_priority, 0),
    };
    return accumulator;
  }, {});
};

const normalizeDecisionSummary = (rawValue = {}) => ({
  primary_beverage_id: rawValue?.primary_beverage_id || null,
  primary_beverage_name: rawValue?.primary_beverage_name || null,
  primary_reason: rawValue?.primary_reason || null,
  secondary_beverage_id: rawValue?.secondary_beverage_id || null,
  secondary_beverage_name: rawValue?.secondary_beverage_name || null,
  active_ab_test: rawValue?.active_ab_test === true,
  ab_candidate_ids: normalizeArray(rawValue?.ab_candidate_ids),
  score_gap: toNumber(rawValue?.score_gap, 0),
  automated_count: toNumber(rawValue?.automated_count, 0),
  fixed_count: toNumber(rawValue?.fixed_count, 0),
  automation_disabled_count: toNumber(rawValue?.automation_disabled_count, 0),
  decision_log: normalizeArray(rawValue?.decision_log),
});

const normalizeCombinationEntry = (entry = {}) => ({
  combination_id: entry?.combination_id || null,
  beverage_id: entry?.beverage_id || null,
  beverage_name: entry?.beverage_name || 'Bebida',
  beverage_price: toNumber(entry?.beverage_price, 0),
  product_context: entry?.product_context || null,
  dominant_category: entry?.dominant_category || null,
  order_band: entry?.order_band || null,
  hour_bucket: entry?.hour_bucket || null,
  serving_mode: entry?.serving_mode || null,
  context_label: entry?.context_label || null,
  combo_label: entry?.combo_label || null,
  suggested: toNumber(entry?.suggested, 0),
  clicked: toNumber(entry?.clicked, 0),
  added: toNumber(entry?.added, 0),
  rejected: toNumber(entry?.rejected, 0),
  upgraded: toNumber(entry?.upgraded, 0),
  revenue_generated: toNumber(entry?.revenue_generated, 0),
  acceptance_rate: toNumber(entry?.acceptance_rate, 0),
  click_rate: toNumber(entry?.click_rate, 0),
  upgrade_rate: toNumber(entry?.upgrade_rate, 0),
  average_added_value: toNumber(entry?.average_added_value, 0),
  profitability_signal: toNumber(entry?.profitability_signal, 0),
  confidence: toNumber(entry?.confidence, 0),
  combination_score: toNumber(entry?.combination_score, 0),
  dominant_action: entry?.dominant_action || 'upsell',
});

const normalizeCombinationPerformance = (rawValue = {}) => {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [combinationId, entry]) => {
    if (!combinationId || !entry || typeof entry !== 'object') return accumulator;
    accumulator[String(combinationId)] = normalizeCombinationEntry({
      ...entry,
      combination_id: entry?.combination_id || combinationId,
    });
    return accumulator;
  }, {});
};

const normalizeCombinationSummary = (rawValue = {}) => ({
  total_combinations_with_data: toNumber(rawValue?.total_combinations_with_data, 0),
  top_combinations: normalizeArray(rawValue?.top_combinations).map(normalizeCombinationEntry),
  underused_combinations: normalizeArray(rawValue?.underused_combinations).map(normalizeCombinationEntry),
  context_winners:
    rawValue?.context_winners && typeof rawValue.context_winners === 'object'
      ? Object.entries(rawValue.context_winners).reduce((accumulator, [contextKey, entry]) => {
          accumulator[contextKey] = normalizeCombinationEntry(entry);
          return accumulator;
        }, {})
      : {},
  main_combination_id: rawValue?.main_combination_id || null,
  main_combination_label: rawValue?.main_combination_label || null,
});

const normalizeOrderActionEntry = (entry = {}) => ({
  action_type: entry?.action_type || null,
  action_label: entry?.action_label || null,
  product_context: entry?.product_context || 'all',
  suggested: toNumber(entry?.suggested, 0),
  clicked: toNumber(entry?.clicked, 0),
  accepted: toNumber(entry?.accepted, 0),
  rejected: toNumber(entry?.rejected, 0),
  skipped: toNumber(entry?.skipped, 0),
  upgraded: toNumber(entry?.upgraded, 0),
  revenue_generated: toNumber(entry?.revenue_generated, 0),
  average_added_value: toNumber(entry?.average_added_value, 0),
  acceptance_rate: toNumber(entry?.acceptance_rate, 0),
  click_rate: toNumber(entry?.click_rate, 0),
  rejection_rate: toNumber(entry?.rejection_rate, 0),
  profitability_signal: toNumber(entry?.profitability_signal, 0),
  confidence: toNumber(entry?.confidence, 0),
  action_score: toNumber(entry?.action_score, 0),
  top_context: entry?.top_context || null,
});

const normalizeOrderActionPerformance = (rawValue = {}) => {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [actionType, entry]) => {
    if (!actionType || !entry || typeof entry !== 'object') return accumulator;
    accumulator[String(actionType)] = normalizeOrderActionEntry({
      ...entry,
      action_type: entry?.action_type || actionType,
    });
    return accumulator;
  }, {});
};

const normalizeOrderOptimizationSummary = (rawValue = {}) => ({
  top_action_type: rawValue?.top_action_type || null,
  top_action_label: rawValue?.top_action_label || null,
  top_action_reason: rawValue?.top_action_reason || null,
  top_action_score: toNumber(rawValue?.top_action_score, 0),
  total_actions_with_data: toNumber(rawValue?.total_actions_with_data, 0),
  context_winners:
    rawValue?.context_winners && typeof rawValue.context_winners === 'object'
      ? Object.entries(rawValue.context_winners).reduce((accumulator, [contextKey, entry]) => {
          accumulator[contextKey] = normalizeOrderActionEntry({
            ...entry,
            product_context: entry?.product_context || contextKey,
          });
          return accumulator;
        }, {})
      : {},
  top_actions: normalizeArray(rawValue?.top_actions).map(normalizeOrderActionEntry),
  underused_actions: normalizeArray(rawValue?.underused_actions).map(normalizeOrderActionEntry),
  lost_opportunities: normalizeArray(rawValue?.lost_opportunities),
  decision_log: normalizeArray(rawValue?.decision_log),
});

const normalizeSnapshot = (payload = {}) => ({
  strategy_data: normalizeBeverageStrategy(payload?.strategy_data || {}),
  performance_by_beverage: normalizePerformanceMap(payload?.performance_by_beverage || {}),
  performance_summary: normalizeSummary(payload?.performance_summary || {}),
  combination_performance: normalizeCombinationPerformance(payload?.combination_performance || {}),
  combination_summary: normalizeCombinationSummary(payload?.combination_summary || {}),
  order_action_performance: normalizeOrderActionPerformance(payload?.order_action_performance || {}),
  order_optimization_summary: normalizeOrderOptimizationSummary(payload?.order_optimization_summary || {}),
  metrics_by_beverage: normalizeMetricsMap(payload?.metrics_by_beverage || {}),
  decision_summary: normalizeDecisionSummary(payload?.decision_summary || {}),
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

export async function saveAdminBeverageMetrics(metricsData = {}, entityContextOpts = {}) {
  const params = new URLSearchParams(buildTenantParams(entityContextOpts));
  const queryString = params.toString();
  const endpoint = queryString
    ? `/beverages/intelligence/metrics?${queryString}`
    : '/beverages/intelligence/metrics';

  const payload = await apiClient.put(endpoint, {
    metrics: normalizeMetricsMap(metricsData || {}),
  });

  return normalizeSnapshot(payload || {});
}
