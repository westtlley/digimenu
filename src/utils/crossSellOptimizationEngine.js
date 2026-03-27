const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(value, 0));

const getProductCategoryId = (product) =>
  String(product?.category_id || product?.category?.id || '').trim();

const mapProductTypeToContext = (productType) => {
  const normalized = normalizeText(productType);
  if (normalized === 'pizza') return 'pizza';
  if (normalized === 'hamburger') return 'hamburger';
  if (normalized === 'dish') return 'dish';
  if (normalized === 'combo') return 'combo';
  if (normalized === 'massas' || normalized === 'massa') return 'massas';
  if (normalized === 'sobremesa' || normalized === 'dessert') return 'sobremesas';
  return normalized || 'dish';
};

const buildOrderBand = (ticketPartial) => {
  const safeTicket = toNumber(ticketPartial, 0);
  if (safeTicket >= 90) return 'high';
  if (safeTicket >= 40) return 'medium';
  return 'small';
};

const buildHourBucket = (date = new Date()) => {
  const hour = Number.isFinite(date?.getHours?.()) ? date.getHours() : 12;
  if (hour < 11) return 'morning';
  if (hour < 15) return 'lunch';
  if (hour < 19) return 'afternoon';
  if (hour < 23) return 'night';
  return 'late_night';
};

const resolveDominantCategory = ({ cart = [], currentProduct = null, categories = [] }) => {
  const nameMap = new Map(
    (Array.isArray(categories) ? categories : [])
      .filter((category) => category?.id)
      .map((category) => [String(category.id), category?.name || 'categoria'])
  );

  const counts = new Map();
  const candidates = [currentProduct, ...cart.map((item) => item?.dish)].filter(
    (product) => product?.product_type !== 'beverage'
  );

  candidates.forEach((product) => {
    const categoryId = getProductCategoryId(product);
    if (!categoryId) return;
    counts.set(categoryId, (counts.get(categoryId) || 0) + Math.max(1, toNumber(product?.quantity, 1)));
  });

  const dominantCategoryId =
    [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ||
    getProductCategoryId(currentProduct) ||
    null;

  return {
    id: dominantCategoryId ? String(dominantCategoryId) : null,
    name: dominantCategoryId ? nameMap.get(String(dominantCategoryId)) || null : null,
  };
};

export function buildOrderContext({ cart = [], currentProduct = null, categories = [] } = {}) {
  const nonBeverageItems = Array.isArray(cart)
    ? cart.filter((item) => item?.dish?.product_type !== 'beverage')
    : [];
  const anchorProduct = currentProduct?.id ? currentProduct : nonBeverageItems[nonBeverageItems.length - 1]?.dish || null;
  const productContext = mapProductTypeToContext(anchorProduct?.product_type);
  const ticketPartial = cart.reduce(
    (sum, item) => sum + toNumber(item?.totalPrice, 0) * Math.max(1, toNumber(item?.quantity, 1)),
    0
  );
  const itemCount = cart.reduce((sum, item) => sum + Math.max(1, toNumber(item?.quantity, 1)), 0);
  const dominantCategory = resolveDominantCategory({ cart, currentProduct: anchorProduct, categories });
  const servingMode =
    itemCount >= 3 || ticketPartial >= 85 || (productContext === 'pizza' && ticketPartial >= 55)
      ? 'shared'
      : 'individual';

  return {
    anchorProduct,
    productContext,
    ticketPartial: Number(ticketPartial.toFixed(2)),
    itemCount,
    orderBand: buildOrderBand(ticketPartial),
    hourBucket: buildHourBucket(new Date()),
    servingMode,
    dominantCategoryId: dominantCategory.id,
    dominantCategoryName: dominantCategory.name,
  };
}

const resolveCombinationMatches = ({ suggestion, combinationData = {}, orderContext }) => {
  const safeId = String(suggestion?.dish?.id || '');
  if (!safeId) return [];

  return Object.values(combinationData || {})
    .filter((entry) => String(entry?.beverage_id || '') === safeId)
    .map((entry) => {
      let matchScore = toNumber(entry?.combination_score, 0);
      if (normalizeText(entry?.product_context) === normalizeText(orderContext?.productContext)) matchScore += 22;
      if (
        normalizeText(entry?.dominant_category) &&
        normalizeText(entry?.dominant_category) === normalizeText(orderContext?.dominantCategoryName)
      ) {
        matchScore += 18;
      }
      if (normalizeText(entry?.order_band) === normalizeText(orderContext?.orderBand)) matchScore += 8;
      if (normalizeText(entry?.hour_bucket) === normalizeText(orderContext?.hourBucket)) matchScore += 6;
      if (normalizeText(entry?.serving_mode) === normalizeText(orderContext?.servingMode)) matchScore += 10;

      return {
        ...entry,
        matchScore,
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore);
};

const resolveOfferType = ({ suggestion, combinationEntry, orderContext, scope }) => {
  if (suggestion?.type === 'upgrade' || scope === 'cart' && suggestion?.type === 'upgrade') {
    return 'upgrade';
  }

  if (
    normalizeText(combinationEntry?.dominant_action) === 'combo' ||
    orderContext?.servingMode === 'shared' ||
    ['pizza', 'combo'].includes(normalizeText(orderContext?.productContext)) ||
    toNumber(suggestion?.dish?.volume_ml, 0) >= 1200
  ) {
    return 'combo';
  }

  return 'upsell';
};

const buildBadgeLabel = ({ suggestion, combinationEntry, offerType }) => {
  if (offerType === 'combo') {
    if (toNumber(combinationEntry?.acceptance_rate, 0) >= 18) return 'Combo forte';
    return 'Combo recomendado';
  }
  if (offerType === 'upgrade') return 'Upgrade inteligente';
  return suggestion?.badgeLabel || 'Boa pedida';
};

const buildReasonLabel = ({ suggestion, combinationEntry, orderContext, offerType }) => {
  if (offerType === 'combo') {
    if (combinationEntry?.dominant_category) {
      return `Combina forte com ${combinationEntry.dominant_category}`;
    }
    if (orderContext?.productContext === 'pizza') return 'Combo forte para pizza';
    if (orderContext?.productContext === 'hamburger') return 'Combo forte para lanche';
    return 'Boa combinacao para este pedido';
  }
  if (offerType === 'upgrade') {
    return combinationEntry?.combo_label || suggestion?.reasonLabel || 'Upgrade com boa resposta';
  }
  return suggestion?.reasonLabel || 'Boa para aumentar ticket';
};

const buildBenefitLabel = ({ suggestion, combinationEntry, offerType, orderContext }) => {
  if (offerType === 'combo') {
    if (orderContext?.servingMode === 'shared') return 'Melhor para compartilhar';
    if (toNumber(combinationEntry?.acceptance_rate, 0) >= 18) return 'A maioria leva junto';
    return 'Deixa o pedido mais completo';
  }
  if (offerType === 'upgrade') {
    if (toNumber(suggestion?.dish?.volume_ml, 0) >= 1500) return 'Mais economica para dividir';
    return 'Mais valorizada no pedido';
  }
  return suggestion?.readout || 'Ajuda a completar o pedido';
};

const buildPriceHint = ({ suggestion, offerType }) => {
  if (offerType === 'upgrade') {
    return suggestion?.deltaPrice > 0
      ? `Upgrade por +${formatCurrency(suggestion.deltaPrice)}`
      : 'Upgrade sem custo extra';
  }
  const finalPrice = toNumber(suggestion?.finalPrice ?? suggestion?.price, 0);
  if (offerType === 'combo') {
    return `Complete por +${formatCurrency(finalPrice)}`;
  }
  return suggestion?.priceHint || `Leve por +${formatCurrency(finalPrice)}`;
};

const buildCtaLabel = ({ offerType }) => {
  if (offerType === 'combo') return 'Completar pedido';
  if (offerType === 'upgrade') return 'Trocar agora';
  return 'Levar junto';
};

export function optimizeBeverageSuggestionsForOrder({
  suggestions = [],
  combinationData = {},
  combinationSummary = {},
  orderContext,
  scope = 'post_add',
} = {}) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return [];

  const contextWinner = combinationSummary?.context_winners?.[orderContext?.productContext] || null;

  return [...suggestions]
    .map((suggestion) => {
      const bestCombination = resolveCombinationMatches({
        suggestion,
        combinationData,
        orderContext,
      })[0] || null;
      const offerType = resolveOfferType({ suggestion, combinationEntry: bestCombination, orderContext, scope });

      let combinedRanking = toNumber(suggestion?.ranking, 0);
      combinedRanking += toNumber(bestCombination?.matchScore, 0) * 0.65;
      if (contextWinner && String(contextWinner?.beverage_id || '') === String(suggestion?.dish?.id || '')) {
        combinedRanking += 24;
      }
      if (offerType === 'combo') combinedRanking += 12;

      return {
        ...suggestion,
        ranking: Number(combinedRanking.toFixed(2)),
        offerType,
        orderContext,
        combinationScore: toNumber(bestCombination?.combination_score, 0),
        combinationContext: bestCombination?.product_context || orderContext?.productContext || null,
        combinationLabel: bestCombination?.combo_label || null,
        contextSummary: buildBenefitLabel({ suggestion, combinationEntry: bestCombination, offerType, orderContext }),
        badgeLabel: buildBadgeLabel({ suggestion, combinationEntry: bestCombination, offerType }),
        reasonLabel: buildReasonLabel({ suggestion, combinationEntry: bestCombination, offerType, orderContext }),
        benefitLabel: buildBenefitLabel({ suggestion, combinationEntry: bestCombination, offerType, orderContext }),
        priceHint: buildPriceHint({ suggestion, offerType }),
        ctaLabel: buildCtaLabel({ offerType }),
      };
    })
    .sort((left, right) => right.ranking - left.ranking);
}
