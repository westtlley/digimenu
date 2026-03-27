import { buildOrderContext } from '@/utils/crossSellOptimizationEngine';

export const NEXT_BEST_ACTION_TYPES = {
  ADD_BEVERAGE: 'ADD_BEVERAGE',
  UPGRADE_BEVERAGE: 'UPGRADE_BEVERAGE',
  ADD_DESSERT: 'ADD_DESSERT',
  SUGGEST_COMBO: 'SUGGEST_COMBO',
  DO_NOTHING: 'DO_NOTHING',
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(value, 0));

const isDessertProduct = (product = {}) => {
  const text = normalizeText(`${product?.name || ''} ${product?.description || ''}`);
  const type = normalizeText(product?.product_type);
  return (
    type === 'dessert' ||
    type === 'sobremesa' ||
    text.includes('sobrem') ||
    text.includes('doce') ||
    text.includes('brownie') ||
    text.includes('bolo') ||
    text.includes('pudim') ||
    text.includes('mousse') ||
    text.includes('sorvete')
  );
};

const isComboProduct = (product = {}) => normalizeText(product?.product_type) === 'combo';

const getCategoryNameMap = (categories = []) =>
  new Map(
    (Array.isArray(categories) ? categories : [])
      .filter((category) => category?.id)
      .map((category) => [String(category.id), category?.name || 'categoria'])
  );

const getSummaryBoost = ({ actionType, orderContext, optimizationSummary = {} }) => {
  const topActionBoost =
    normalizeText(optimizationSummary?.top_action_type) === normalizeText(actionType) ? 18 : 0;
  const contextWinner = optimizationSummary?.context_winners?.[orderContext?.productContext];
  const contextBoost =
    normalizeText(contextWinner?.action_type) === normalizeText(actionType)
      ? 14 + toNumber(contextWinner?.action_score, 0) * 0.18
      : 0;
  const topActionEntry = Array.isArray(optimizationSummary?.top_actions)
    ? optimizationSummary.top_actions.find((entry) => normalizeText(entry?.action_type) === normalizeText(actionType))
    : null;
  return topActionBoost + contextBoost + toNumber(topActionEntry?.action_score, 0) * 0.22;
};

const buildMerchandisingDiscountLabel = (product = {}) => {
  const originalPrice = toNumber(product?.original_price, 0);
  const finalPrice = toNumber(product?.price, 0);
  const savings = Math.max(0, originalPrice - finalPrice);
  return savings > 0 ? `Economia de ${formatCurrency(savings)}` : null;
};

const buildComboLabel = ({ product, orderContext }) => {
  if (isComboProduct(product)) return 'Combo dinamico recomendado';
  if (orderContext?.servingMode === 'shared') return 'Mais completo para compartilhar';
  return 'Monta um pedido mais redondo';
};

const buildBeverageCandidate = ({
  suggestion,
  orderContext,
  sessionSignals,
  optimizationSummary,
  cart = [],
}) => {
  if (!suggestion?.dish?.id && !suggestion?.product?.id) return null;

  const product = suggestion?.dish || suggestion?.product || suggestion;
  const cartHasBeverage = cart.some((item) => item?.dish?.product_type === 'beverage');
  const actionType =
    suggestion?.type === 'upgrade'
      ? NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE
      : suggestion?.offerType === 'combo'
        ? NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
        : NEXT_BEST_ACTION_TYPES.ADD_BEVERAGE;

  let score =
    toNumber(suggestion?.ranking, 0) +
    toNumber(suggestion?.combinationScore, 0) * 0.5 +
    getSummaryBoost({ actionType, orderContext, optimizationSummary });

  if (!cartHasBeverage && actionType === NEXT_BEST_ACTION_TYPES.ADD_BEVERAGE) score += 24;
  if (cartHasBeverage && actionType === NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE) score += 22;
  if (actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO && orderContext?.servingMode === 'shared') score += 16;
  if (toNumber(sessionSignals?.rejected_count, 0) >= 2) {
    score -= actionType === NEXT_BEST_ACTION_TYPES.ADD_BEVERAGE ? 24 : 10;
  }
  if (toNumber(sessionSignals?.accepted_count, 0) > 0 && actionType === NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE) {
    score += 10;
  }

  const title =
    actionType === NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE
      ? 'Melhore a bebida do pedido'
      : actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
        ? 'Feche o pedido com combo'
        : orderContext?.productContext === 'pizza'
          ? 'Complete a pizza com bebida'
          : 'Complete o pedido com bebida';

  const message =
    actionType === NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE
      ? suggestion?.benefitLabel || 'Uma troca pequena pode valorizar mais o pedido.'
      : actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
        ? suggestion?.combinationLabel || 'Essa combinacao tende a fechar melhor o pedido inteiro.'
        : suggestion?.benefitLabel || 'A maioria leva junto e decide em um toque.';

  const explanation =
    actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
      ? `O motor escolheu ${product?.name || 'essa bebida'} para fechar um combo melhor no contexto atual.`
      : actionType === NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE
        ? `O pedido ja tem bebida. O sistema puxou uma troca com mais valor percebido e boa resposta.`
        : `A bebida liderou a proxima acao porque equilibra conversao, contexto e valor adicional.`;

  return {
    id: `nba:${actionType}:${String(product?.id || 'item')}`,
    actionType,
    kind: 'beverage',
    product,
    suggestion,
    actionScore: Number(score.toFixed(2)),
    title,
    message,
    badgeLabel:
      suggestion?.badgeLabel ||
      (actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO ? 'Combo forte' : 'Melhor opcao'),
    benefitLabel: suggestion?.benefitLabel || suggestion?.contextSummary || null,
    priceHint: suggestion?.priceHint || `Leve por +${formatCurrency(suggestion?.finalPrice || product?.price)}`,
    ctaLabel:
      suggestion?.ctaLabel ||
      (actionType === NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE ? 'Trocar agora' : 'Levar junto'),
    urgencyLabel:
      actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
        ? 'Aproveite antes de finalizar'
        : actionType === NEXT_BEST_ACTION_TYPES.UPGRADE_BEVERAGE
          ? 'Vale a troca agora'
          : 'A maioria decide agora',
    explanation,
  };
};

const buildMerchandisingCandidate = ({
  suggestion,
  orderContext,
  optimizationSummary,
  cart = [],
  commercialSignals = {},
}) => {
  if (!suggestion?.id) return null;

  const actionType = isDessertProduct(suggestion)
    ? NEXT_BEST_ACTION_TYPES.ADD_DESSERT
    : isComboProduct(suggestion) || normalizeText(suggestion?._merchandising?.source).includes('combo')
      ? NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
      : normalizeText(suggestion?.product_type) === 'beverage'
        ? NEXT_BEST_ACTION_TYPES.ADD_BEVERAGE
        : null;

  if (!actionType) return null;

  const cartHasBeverage = cart.some((item) => item?.dish?.product_type === 'beverage');
  const cartHasDessert = cart.some((item) => isDessertProduct(item?.dish));
  const comboSignal = toNumber(commercialSignals?.combo_added?.[String(suggestion?.id || '').replace(/^combo_/, '')], 0);
  const acceptedSignal = toNumber(commercialSignals?.upsell_accepted?.[String(suggestion?.id || '')], 0);

  let score =
    toNumber(acceptedSignal, 0) * 10 +
    toNumber(comboSignal, 0) * 12 +
    toNumber(suggestion?._merchandising?.sourcePriority, 0) * -4 +
    Math.min(22, toNumber(suggestion?.price, 0) * 0.7) +
    getSummaryBoost({ actionType, orderContext, optimizationSummary });

  if (actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT) {
    score += cartHasBeverage ? 18 : 6;
    if (cartHasDessert) score -= 40;
    if (toNumber(orderContext?.ticketPartial, 0) >= 40) score += 10;
  }

  if (actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO) {
    if (orderContext?.servingMode === 'shared') score += 18;
    if (orderContext?.productContext === 'pizza') score += 16;
  }

  if (actionType === NEXT_BEST_ACTION_TYPES.ADD_BEVERAGE) {
    score += cartHasBeverage ? -34 : 18;
  }

  const discountLabel = buildMerchandisingDiscountLabel(suggestion);
  const title =
    actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT
      ? 'Feche o pedido com sobremesa'
      : actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
        ? 'Monte um combo automatico'
        : 'Complete o pedido';

  const message =
    actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT
      ? 'Sobremesa entra melhor quando a bebida ja esta resolvida e o pedido pede um fechamento gostoso.'
      : actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
        ? buildComboLabel({ product: suggestion, orderContext })
        : 'Essa sugestao ajuda a aumentar o valor sem atrapalhar o fluxo.';

  return {
    id: `nba:${actionType}:${String(suggestion?.id || 'item')}`,
    actionType,
    kind: 'merchandising',
    product: suggestion,
    suggestion,
    actionScore: Number(score.toFixed(2)),
    title,
    message,
    badgeLabel:
      actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT
        ? 'Fechamento do pedido'
        : actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
          ? 'Combo recomendado'
          : 'Sugestao principal',
    benefitLabel:
      actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT
        ? 'Boa para fechar ticket depois da bebida'
        : actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
          ? 'O sistema achou uma combinacao mais forte para este pedido'
          : 'Boa opcao para aumentar valor percebido',
    priceHint:
      actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
        ? `${discountLabel || `Complete por +${formatCurrency(suggestion?.price)}`}`
        : `Leve por +${formatCurrency(suggestion?.price)}`,
    ctaLabel:
      actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT
        ? 'Adicionar sobremesa'
        : actionType === NEXT_BEST_ACTION_TYPES.SUGGEST_COMBO
          ? 'Completar pedido'
          : 'Adicionar agora',
    urgencyLabel:
      actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT
        ? 'Boa hora para fechar o pedido'
        : 'Aproveite antes de finalizar',
    explanation:
      actionType === NEXT_BEST_ACTION_TYPES.ADD_DESSERT
        ? 'O motor puxou sobremesa porque bebida e ticket atual deixam essa acao mais forte.'
        : 'O motor encontrou uma combinacao com melhor leitura para o pedido inteiro.',
  };
};

const buildDoNothingCandidate = ({ orderContext, sessionSignals = {}, optimizationSummary = {} }) => {
  let score = 12 + getSummaryBoost({
    actionType: NEXT_BEST_ACTION_TYPES.DO_NOTHING,
    orderContext,
    optimizationSummary,
  });

  if (toNumber(sessionSignals?.rejected_count, 0) >= 2) score += 28;
  if (toNumber(sessionSignals?.accepted_count, 0) > 0 && toNumber(sessionSignals?.rejected_count, 0) === 0) score -= 10;

  return {
    id: 'nba:DO_NOTHING',
    actionType: NEXT_BEST_ACTION_TYPES.DO_NOTHING,
    kind: 'system',
    product: null,
    suggestion: null,
    actionScore: Number(score.toFixed(2)),
    title: 'Nenhuma acao extra agora',
    message: 'O sistema reduziu a pressao para nao cansar quem ja ignorou sugestoes recentes.',
    badgeLabel: 'Fluxo limpo',
    benefitLabel: 'Sem insistencia quando o contexto pede menos pressao',
    priceHint: null,
    ctaLabel: null,
    urgencyLabel: null,
    explanation: 'A melhor proxima acao agora e nao competir com a decisao principal do cliente.',
  };
};

export function getNextBestOrderAction({
  cart = [],
  currentProduct = null,
  beverageSuggestions = [],
  merchandisingSuggestions = [],
  optimizationSummary = {},
  sessionSignals = {},
  commercialSignals = {},
  categories = [],
  scope = 'post_add',
} = {}) {
  const orderContext = buildOrderContext({ cart, currentProduct, categories });
  const safeBeverageSuggestions = Array.isArray(beverageSuggestions) ? beverageSuggestions.slice(0, 2) : [];
  const safeMerchandisingSuggestions = Array.isArray(merchandisingSuggestions) ? merchandisingSuggestions.slice(0, 2) : [];

  const candidates = [
    ...safeBeverageSuggestions
      .map((suggestion) =>
        buildBeverageCandidate({
          suggestion,
          orderContext,
          sessionSignals,
          optimizationSummary,
          cart,
        })
      )
      .filter(Boolean),
    ...safeMerchandisingSuggestions
      .map((suggestion) =>
        buildMerchandisingCandidate({
          suggestion,
          orderContext,
          optimizationSummary,
          cart,
          commercialSignals,
        })
      )
      .filter(Boolean),
  ];

  const doNothingCandidate = buildDoNothingCandidate({
    orderContext,
    sessionSignals,
    optimizationSummary,
  });
  candidates.push(doNothingCandidate);

  const ranked = candidates
    .filter(Boolean)
    .sort((left, right) => {
      const scoreDiff = toNumber(right?.actionScore, 0) - toNumber(left?.actionScore, 0);
      if (scoreDiff !== 0) return scoreDiff;
      return toNumber(right?.product?.price, 0) - toNumber(left?.product?.price, 0);
    });

  const winner = ranked[0] || doNothingCandidate;
  const winnerThreshold = scope === 'cart' ? 40 : 46;

  if (winner.actionType === NEXT_BEST_ACTION_TYPES.DO_NOTHING || toNumber(winner?.actionScore, 0) < winnerThreshold) {
    return {
      ...doNothingCandidate,
      orderContext,
      alternatives: ranked.filter((candidate) => candidate.actionType !== NEXT_BEST_ACTION_TYPES.DO_NOTHING).slice(0, 2),
    };
  }

  return {
    ...winner,
    orderContext,
    alternatives: ranked
      .filter((candidate) => candidate.id !== winner.id && candidate.actionType !== NEXT_BEST_ACTION_TYPES.DO_NOTHING)
      .slice(0, 2),
  };
}
