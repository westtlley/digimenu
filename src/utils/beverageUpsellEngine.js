import {
  getBeverageCommercialProfile,
  normalizeBeverageStrategy,
  suggestBeverageLinks,
} from '@/utils/beverageStrategy';
import { buildOrderContext, optimizeBeverageSuggestionsForOrder } from '@/utils/crossSellOptimizationEngine';

const STRATEGY_PREFIX = 'beverage-ai-v1:';
const ANALYTICS_SESSION_KEY = 'dm_analytics_session_id';

const normalizeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getProductCategoryId = (product) =>
  String(product?.category_id || product?.category?.id || '').trim();

const mapProductTypeToContext = (productType) => {
  const normalized = String(productType || '').trim().toLowerCase();
  if (normalized === 'pizza') return 'pizza';
  if (normalized === 'hamburger') return 'hamburger';
  if (normalized === 'dish') return 'dish';
  if (normalized === 'massas' || normalized === 'massa') return 'massas';
  if (normalized === 'sobremesa' || normalized === 'dessert') return 'sobremesas';
  return normalized || 'dish';
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(value, 0));

const readAnalyticsSessionId = () => {
  if (typeof window === 'undefined' || !window.localStorage) return 'session:fallback';
  try {
    const raw = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
    if (!raw) return 'session:fallback';
    const parsed = JSON.parse(raw);
    return String(parsed?.id || 'session:fallback');
  } catch (_error) {
    return 'session:fallback';
  }
};

const hashSeed = (seedValue) => {
  const seed = String(seedValue || 'default');
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) % 2147483647;
  }
  return Math.abs(hash);
};

const buildCandidateStorageKeys = ({ slug, store = null, subscriberEmail = '' }) => {
  const keys = new Set();
  const safeSlug = String(slug || '').trim();
  const safeStoreId = String(store?.id || '').trim();
  const safeSubscriberId = String(store?.subscriber_id || store?.subscriberId || '').trim();
  const safeEmail = normalizeEmail(subscriberEmail || store?.subscriber_email || store?.owner_email || store?.email);

  if (safeSubscriberId) {
    keys.add(`${STRATEGY_PREFIX}subscriber:sid:${safeSubscriberId}`);
  }
  if (safeEmail) {
    keys.add(`${STRATEGY_PREFIX}subscriber:sem:${safeEmail}`);
  }
  if (safeSlug) {
    keys.add(`${STRATEGY_PREFIX}slug:${safeSlug}`);
  }
  if (safeStoreId) {
    keys.add(`${STRATEGY_PREFIX}store:${safeStoreId}`);
  }

  return Array.from(keys);
};

export function loadPublicBeverageStrategy({ slug, store = null, subscriberEmail = '' } = {}) {
  if (typeof window === 'undefined' || !window.localStorage) return {};

  const next = {};
  const candidateKeys = buildCandidateStorageKeys({ slug, store, subscriberEmail });

  candidateKeys.forEach((storageKey) => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      Object.assign(next, normalizeBeverageStrategy(JSON.parse(raw)));
    } catch (_error) {
      // noop
    }
  });

  // Fallback: tentar localizar algum snapshot do lote 1 na mesma origem do assinante.
  if (Object.keys(next).length === 0) {
    try {
      const safeEmail = normalizeEmail(subscriberEmail || store?.subscriber_email || store?.owner_email || store?.email);
      const safeSlug = normalizeText(slug);
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const storageKey = window.localStorage.key(index);
        if (!storageKey || !storageKey.startsWith(STRATEGY_PREFIX)) continue;
        const normalizedKey = normalizeText(storageKey);
        if (
          (safeEmail && normalizedKey.includes(normalizeText(safeEmail))) ||
          (safeSlug && normalizedKey.includes(safeSlug))
        ) {
          const raw = window.localStorage.getItem(storageKey);
          if (!raw) continue;
          Object.assign(next, normalizeBeverageStrategy(JSON.parse(raw)));
        }
      }
    } catch (_error) {
      // noop
    }
  }

  return next;
}

const resolveStrategy = (beverage, strategyMap = {}, categories = []) => {
  const saved = strategyMap?.[beverage?.id] || {};
  const inferred = suggestBeverageLinks({ beverage, strategy: saved, categories });

  return {
    ...inferred,
    ...saved,
    tags: normalizeArray(saved.tags).length > 0 ? normalizeArray(saved.tags) : normalizeArray(inferred.tags),
    packaging: saved.packaging || inferred.packaging || '',
    contexts:
      normalizeArray(saved.contexts).length > 0 ? normalizeArray(saved.contexts) : normalizeArray(inferred.contexts),
    linkedCategoryIds:
      normalizeArray(saved.linkedCategoryIds).length > 0
        ? normalizeArray(saved.linkedCategoryIds)
        : normalizeArray(inferred.linkedCategoryIds),
    linkedDishIds:
      normalizeArray(saved.linkedDishIds).length > 0
        ? normalizeArray(saved.linkedDishIds)
        : normalizeArray(inferred.linkedDishIds),
    preparedForUpsell: saved.preparedForUpsell === true || inferred.preparedForUpsell === true,
    moreOrdered: saved.moreOrdered === true,
    comboReady: saved.comboReady === true || inferred.comboReady === true,
  };
};

const resolveBeverageDiscount = ({ beverage, store = null, cart = [], currentProduct = null }) => {
  const config = store?.cross_sell_config?.beverage_offer || {};
  if (!config?.enabled || !config?.dish_id) return 0;
  if (String(config.dish_id) !== String(beverage?.id || '')) return 0;

  const triggerTypes =
    Array.isArray(config.trigger_product_types) && config.trigger_product_types.length > 0
      ? config.trigger_product_types.map((value) => String(value || '').toLowerCase())
      : ['pizza', 'dish', 'hamburger'];

  const minCartValue = toNumber(config.min_cart_value, 0);
  const cartTotal = cart.reduce((sum, item) => sum + toNumber(item?.totalPrice, 0) * toNumber(item?.quantity, 1), 0);
  const currentType = String(currentProduct?.product_type || '').toLowerCase();
  const hasTriggerProduct =
    (currentType && triggerTypes.includes(currentType)) ||
    cart.some((item) => triggerTypes.includes(String(item?.dish?.product_type || '').toLowerCase()));

  if (!hasTriggerProduct) return 0;
  if (cartTotal < minCartValue) return 0;

  return Math.max(0, toNumber(config.discount_percent, 0));
};

const resolvePrimaryContext = ({ cart = [], currentProduct = null }) => {
  const nonBeverageItems = cart.filter((item) => item?.dish?.product_type !== 'beverage');
  const fallbackDish = nonBeverageItems[nonBeverageItems.length - 1]?.dish || null;
  const anchorProduct = currentProduct?.id ? currentProduct : fallbackDish;
  const contextTypes = new Set(
    [anchorProduct?.product_type, ...nonBeverageItems.map((item) => item?.dish?.product_type)]
      .filter(Boolean)
      .map(mapProductTypeToContext)
  );
  const categoryIds = new Set(
    [getProductCategoryId(anchorProduct), ...nonBeverageItems.map((item) => getProductCategoryId(item?.dish))]
      .filter(Boolean)
      .map(String)
  );

  return {
    anchorProduct,
    contextTypes,
    categoryIds,
  };
};

const buildSuggestionReason = ({ beverage, strategy, profile, anchorProduct, categoryMap, configDishId }) => {
  const linkedDishIds = new Set(normalizeArray(strategy.linkedDishIds).map(String));
  const linkedCategoryIds = new Set(normalizeArray(strategy.linkedCategoryIds).map(String));
  const contexts = new Set(normalizeArray(strategy.contexts));
  const anchorCategoryId = getProductCategoryId(anchorProduct);
  const anchorContext = mapProductTypeToContext(anchorProduct?.product_type);

  if (anchorProduct?.id && linkedDishIds.has(String(anchorProduct.id))) {
    return 'Combina com este item';
  }
  if (anchorCategoryId && linkedCategoryIds.has(String(anchorCategoryId))) {
    const categoryName = categoryMap.get(String(anchorCategoryId));
    return categoryName ? `Boa para ${categoryName}` : 'Boa para esta categoria';
  }
  if (String(configDishId || '') === String(beverage?.id || '')) {
    return 'Mais pedido junto';
  }
  if (contexts.has(anchorContext)) {
    if (anchorContext === 'pizza') return 'Boa para pizza';
    if (anchorContext === 'dish') return 'Boa para refeicao';
    if (anchorContext === 'hamburger') return 'Boa para lanche';
    if (anchorContext === 'delivery') return 'Boa para delivery';
  }
  return profile.readout || 'Boa para aumentar ticket';
};

const resolvePerformanceEntry = (beverage, performanceData = {}) => {
  const safeId = String(beverage?.id || '');
  return performanceData?.[safeId] && typeof performanceData[safeId] === 'object'
    ? performanceData[safeId]
    : null;
};

const buildPerformanceBoost = (performanceEntry) => {
  if (!performanceEntry) return 0;

  const acceptanceRate = toNumber(performanceEntry.acceptance_rate, 0);
  const clickRate = toNumber(performanceEntry.click_rate, 0);
  const upgradeRate = toNumber(performanceEntry.upgrade_rate, 0);
  const recommendationScore = toNumber(performanceEntry.recommendation_score, 0);
  const finalScore = toNumber(performanceEntry.final_score, 0);
  const confidence = toNumber(performanceEntry.confidence, 0);
  const profitabilitySignal = toNumber(
    performanceEntry.profitability_signal ?? performanceEntry.margin_percentage ?? performanceEntry.margin_signal,
    0
  );
  const revenueGenerated = toNumber(performanceEntry.revenue_generated, 0);
  const autoPriority = toNumber(performanceEntry.auto_priority, 0);

  return (
    acceptanceRate * 1.4 +
    clickRate * 0.55 +
    upgradeRate * 0.6 +
    recommendationScore * 0.4 +
    finalScore * 0.35 +
    (confidence / 10) +
    (profitabilitySignal / 5.5) +
    Math.min(18, revenueGenerated / 4) +
    (autoPriority > 0 ? Math.max(0, 16 - autoPriority * 2) : 0)
  );
};

const buildSessionBehaviorBoost = ({
  beverage,
  strategy,
  performanceEntry,
  sessionSignals = {},
  scope,
  cart = [],
}) => {
  const beverageId = String(beverage?.id || '');
  const accepts = toNumber(sessionSignals?.beverage_accepts?.[beverageId], 0);
  const rejections = toNumber(sessionSignals?.beverage_rejections?.[beverageId], 0);
  const hasBeverageInCart = cart.some((item) => item?.dish?.product_type === 'beverage');
  const premiumTagged = normalizeArray(strategy?.tags).includes('premium');
  const acceptanceRate = toNumber(performanceEntry?.acceptance_rate, 0);
  const cartTotal = cart.reduce((sum, item) => sum + toNumber(item?.totalPrice, 0) * toNumber(item?.quantity, 1), 0);

  let boost = 0;
  if (accepts > 0) boost += accepts * 16;
  if (rejections > 0) boost -= rejections * 24;

  if (scope === 'post_add' && toNumber(sessionSignals?.rejected_count, 0) >= 2) {
    boost -= premiumTagged ? 12 : 6;
  }

  if (scope === 'cart' && hasBeverageInCart) {
    boost += premiumTagged ? 18 : 10;
    boost += acceptanceRate >= 12 ? 8 : 0;
  }

  if (scope === 'post_add' && cartTotal >= 60) {
    boost += premiumTagged ? 18 : 6;
  }

  if (scope === 'post_add' && toNumber(sessionSignals?.accepted_count, 0) > 0) {
    boost += premiumTagged ? 10 : 4;
  }

  return boost;
};

const scoreSuggestion = ({
  beverage,
  strategy,
  profile,
  performanceEntry,
  sessionSignals,
  anchorProduct,
  categoryIds,
  contextTypes,
  configDishId,
  cart,
  scope,
}) => {
  const linkedDishIds = new Set(normalizeArray(strategy.linkedDishIds).map(String));
  const linkedCategoryIds = new Set(normalizeArray(strategy.linkedCategoryIds).map(String));
  const linkedContexts = new Set(normalizeArray(strategy.contexts));

  let ranking = profile.score * 12;
  if (beverage?.is_active === false) ranking -= 500;
  if (performanceEntry?.automation_disabled === true) ranking -= 400;
  if (performanceEntry?.fixed_as_primary === true) ranking += 380;
  if (anchorProduct?.id && linkedDishIds.has(String(anchorProduct.id))) ranking += 140;
  if (Array.from(categoryIds).some((categoryId) => linkedCategoryIds.has(String(categoryId)))) ranking += 90;
  if (Array.from(contextTypes).some((context) => linkedContexts.has(context))) ranking += 55;
  if (String(configDishId || '') === String(beverage?.id || '')) ranking += 48;
  if (strategy.preparedForUpsell) ranking += 28;
  if (strategy.moreOrdered) ranking += 18;
  if (strategy.comboReady && (contextTypes.has('pizza') || contextTypes.has('dish'))) ranking += 16;
  if (normalizeArray(strategy.tags).includes('premium')) ranking += 10;
  if (normalizeArray(strategy.tags).includes('delivery')) ranking += 8;
  if (beverage?.is_highlight) ranking += 6;
  ranking += buildPerformanceBoost(performanceEntry);
  ranking += buildSessionBehaviorBoost({
    beverage,
    strategy,
    performanceEntry,
    sessionSignals,
    scope,
    cart,
  });

  return ranking;
};

const applyAutomaticDecisionOrder = (entries = []) => {
  const ordered = [...entries].sort((left, right) => right.ranking - left.ranking);
  const first = ordered[0];
  const second = ordered[1];

  if (
    !first ||
    !second ||
    first?.performanceEntry?.fixed_as_primary === true ||
    second?.performanceEntry?.fixed_as_primary === true ||
    first?.performanceEntry?.ab_test_candidate !== true ||
    second?.performanceEntry?.ab_test_candidate !== true
  ) {
    return ordered;
  }

  const scoreGap = Math.abs(toNumber(first?.ranking, 0) - toNumber(second?.ranking, 0));
  if (scoreGap > 12) {
    return ordered;
  }

  const seed = `${readAnalyticsSessionId()}:${first?.beverage?.id || 'a'}:${second?.beverage?.id || 'b'}`;
  if (hashSeed(seed) % 2 === 1) {
    return [second, first, ...ordered.slice(2)];
  }

  return ordered;
};

const buildUpsellSuggestion = ({
  beverage,
  strategy,
  profile,
  performanceEntry,
  ranking,
  anchorProduct,
  categoryMap,
  store,
  cart,
}) => {
  const discountPercent = resolveBeverageDiscount({ beverage, store, cart, currentProduct: anchorProduct });
  const basePrice = toNumber(beverage?.price, 0);
  const finalPrice = basePrice * (1 - discountPercent / 100);
  const configDishId = store?.cross_sell_config?.beverage_offer?.dish_id || null;
  const reasonLabel = buildSuggestionReason({
    beverage,
    strategy,
    profile,
    anchorProduct,
    categoryMap,
    configDishId,
  });

  return {
    id: `beverage-upsell:${beverage.id}`,
    type: 'upsell',
    dish: beverage,
    name: beverage?.name || 'Bebida',
    image: beverage?.image || null,
    price: basePrice,
    finalPrice,
    discountPercent,
    reasonLabel,
    ranking,
    readout: profile.readout,
    scoreLevel: profile.level,
    performance: performanceEntry,
    badgeLabel:
      performanceEntry?.acceptance_rate >= 18 && toNumber(performanceEntry?.confidence, 0) >= 18
        ? 'Mais aceita'
        : discountPercent > 0
        ? `Oferta ${discountPercent}%`
        : profile.level === 'Forte'
          ? 'Mais indicada'
          : 'Boa pedida',
    ctaLabel: 'Adicionar',
    priceHint: `Leve por +${formatCurrency(finalPrice)}`,
  };
};

const buildUpgradeSuggestion = ({
  beverage,
  strategy,
  profile,
  performanceEntry,
  ranking,
  existingBeverageItem,
  anchorProduct,
  categoryMap,
}) => {
  const currentUnitPrice = toNumber(existingBeverageItem?.totalPrice, toNumber(existingBeverageItem?.dish?.price, 0));
  const nextPrice = toNumber(beverage?.price, 0);
  const deltaPrice = Math.max(0, nextPrice - currentUnitPrice);
  const reasonLabel = buildSuggestionReason({
    beverage,
    strategy,
    profile,
    anchorProduct,
    categoryMap,
    configDishId: null,
  });

  return {
    id: `beverage-upgrade:${existingBeverageItem?.id || beverage?.id}:${beverage?.id}`,
    type: 'upgrade',
    dish: beverage,
    name: beverage?.name || 'Bebida',
    image: beverage?.image || null,
    price: nextPrice,
    finalPrice: nextPrice,
    deltaPrice,
    replaceItemId: existingBeverageItem?.id || null,
    reasonLabel,
    ranking,
    readout: profile.readout,
    scoreLevel: profile.level,
    performance: performanceEntry,
    badgeLabel: 'Upgrade',
    ctaLabel: deltaPrice > 0 ? `Trocar por +${formatCurrency(deltaPrice)}` : 'Trocar bebida',
    priceHint: deltaPrice > 0 ? `Upgrade por +${formatCurrency(deltaPrice)}` : 'Upgrade sem custo extra',
  };
};

export function getBestBeverageSuggestions({
  cart = [],
  currentProduct = null,
  beverages = [],
  strategyData = {},
  performanceData = {},
  combinationData = {},
  combinationSummary = {},
  sessionSignals = {},
  store = null,
  categories = [],
  scope = 'post_add',
  limit = 3,
}) {
  const safeBeverages = Array.isArray(beverages) ? beverages.filter((beverage) => beverage?.is_active !== false) : [];
  if (safeBeverages.length === 0) return [];
  if (scope === 'cart' && (!Array.isArray(cart) || cart.length === 0)) return [];

  const categoryMap = new Map(
    (Array.isArray(categories) ? categories : [])
      .filter((category) => category?.id)
      .map((category) => [String(category.id), category?.name || 'categoria'])
  );
  const orderContext = buildOrderContext({ cart, currentProduct, categories });

  const { anchorProduct, contextTypes, categoryIds } = resolvePrimaryContext({ cart, currentProduct });
  const hasBeverageInCart = cart.some((item) => item?.dish?.product_type === 'beverage');

  if (scope === 'post_add' && (!anchorProduct || hasBeverageInCart)) {
    return [];
  }
  if (scope === 'cart' && !hasBeverageInCart && !anchorProduct) {
    return [];
  }

  const configDishId = store?.cross_sell_config?.beverage_offer?.dish_id || null;
  const baseSuggestions = safeBeverages
    .map((beverage) => {
      const strategy = resolveStrategy(beverage, strategyData, categories);
      const profile = getBeverageCommercialProfile({
        beverage,
        strategy,
        activeUpsellDishId: configDishId,
        comboCount: 0,
      });

      return {
        beverage,
        strategy,
        profile,
        performanceEntry: resolvePerformanceEntry(beverage, performanceData),
        ranking: scoreSuggestion({
          beverage,
          strategy,
          profile,
          performanceEntry: resolvePerformanceEntry(beverage, performanceData),
          sessionSignals,
          anchorProduct,
          categoryIds,
          contextTypes,
          configDishId,
          cart,
          scope,
        }),
      };
    });

  const orderedSuggestions = applyAutomaticDecisionOrder(baseSuggestions);

  if (scope === 'cart' && hasBeverageInCart) {
    const existingBeverageItem = [...cart]
      .reverse()
      .find((item) => item?.dish?.product_type === 'beverage' && toNumber(item?.quantity, 1) === 1);

    if (!existingBeverageItem) return [];

    const currentVolume = toNumber(existingBeverageItem?.dish?.volume_ml, 0);
    const currentPrice = toNumber(existingBeverageItem?.dish?.price, toNumber(existingBeverageItem?.totalPrice, 0));
    const currentTags = new Set(
      normalizeArray(resolveStrategy(existingBeverageItem?.dish, strategyData, categories)?.tags).map(String)
    );

    const upgradeSuggestions = orderedSuggestions
      .filter(({ beverage, strategy }) => {
        if (String(beverage?.id || '') === String(existingBeverageItem?.dish?.id || '')) return false;
        const volume = toNumber(beverage?.volume_ml, 0);
        const price = toNumber(beverage?.price, 0);
        const tags = new Set(normalizeArray(strategy.tags).map(String));
        const isPremiumUpgrade = tags.has('premium') && !currentTags.has('premium');
        const isLargerUpgrade = volume > currentVolume + 150;
        const isHigherTicket = price > currentPrice + 1;
        return isPremiumUpgrade || isLargerUpgrade || isHigherTicket;
      })
      .map((entry) =>
        buildUpgradeSuggestion({
          beverage: entry.beverage,
          strategy: entry.strategy,
          profile: entry.profile,
          performanceEntry: entry.performanceEntry,
          ranking: entry.ranking,
          existingBeverageItem,
          anchorProduct,
          categoryMap,
        })
      );

    return optimizeBeverageSuggestionsForOrder({
      suggestions: upgradeSuggestions,
      combinationData,
      combinationSummary,
      orderContext,
      scope,
    }).slice(0, Math.max(1, limit));
  }

  return optimizeBeverageSuggestionsForOrder({
    suggestions: orderedSuggestions.map((entry) =>
      buildUpsellSuggestion({
        beverage: entry.beverage,
        strategy: entry.strategy,
        profile: entry.profile,
        performanceEntry: entry.performanceEntry,
        ranking: entry.ranking,
        anchorProduct,
        categoryMap,
        store,
        cart,
      })
    ),
    combinationData,
    combinationSummary,
    orderContext,
    scope,
  }).slice(0, Math.max(1, limit));
}
