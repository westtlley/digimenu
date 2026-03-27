import { buildOrderContextFromProperties } from './crossSellOptimizationEngine.js';

const ACTION_TYPES = [
  'ADD_BEVERAGE',
  'UPGRADE_BEVERAGE',
  'ADD_DESSERT',
  'SUGGEST_COMBO',
  'DO_NOTHING',
];

const ACTION_LABELS = {
  ADD_BEVERAGE: 'Adicionar bebida',
  UPGRADE_BEVERAGE: 'Melhorar bebida',
  ADD_DESSERT: 'Adicionar sobremesa',
  SUGGEST_COMBO: 'Montar combo',
  DO_NOTHING: 'Nao sugerir nada',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value, maxLength = 120) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized ? normalized.slice(0, maxLength) : null;
};

const safeRate = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

const getRevenueFromProperties = (properties = {}) =>
  toNumber(properties?.added_value, 0) ||
  toNumber(properties?.delta_price, 0) ||
  toNumber(properties?.beverage_price, 0) ||
  toNumber(properties?.offer_price, 0) ||
  toNumber(properties?.item_total, 0);

const mapActionTypeFromProperties = (properties = {}) => {
  const explicitType = normalizeText(properties?.next_best_action_type || properties?.action_type, 40);
  if (explicitType && ACTION_TYPES.includes(explicitType.toUpperCase())) {
    return explicitType.toUpperCase();
  }

  const offerType = normalizeText(properties?.offer_type || properties?.suggestion_type, 40);
  const source = normalizeText(properties?.source || properties?.merchandising_source, 80);
  const productType = normalizeText(
    properties?.product_type ??
      properties?.current_product_type ??
      properties?.context_product_type,
    40
  );

  if (offerType === 'upgrade') return 'UPGRADE_BEVERAGE';
  if (source?.includes('dessert') || productType === 'dessert' || productType === 'sobremesa') return 'ADD_DESSERT';
  if (source?.includes('combo') || productType === 'combo') return 'SUGGEST_COMBO';
  if (source?.includes('beverage')) return 'ADD_BEVERAGE';

  return null;
};

const inferActionType = ({ eventName, properties = {} } = {}) => {
  const explicit = mapActionTypeFromProperties(properties);
  if (explicit) return explicit;

  const normalizedEvent = normalizeText(eventName, 60) || '';
  if (normalizedEvent === 'beverage_upgraded') return 'UPGRADE_BEVERAGE';
  if (normalizedEvent.startsWith('beverage_')) return 'ADD_BEVERAGE';
  if (normalizedEvent === 'combo_clicked' || normalizedEvent === 'combo_added') return 'SUGGEST_COMBO';
  if (normalizedEvent === 'upsell_skipped' || normalizedEvent === 'upsell_rejected') {
    return mapActionTypeFromProperties(properties) || 'DO_NOTHING';
  }

  const source = normalizeText(properties?.source || properties?.merchandising_source, 80);
  const productType = normalizeText(properties?.product_type, 40);

  if (source?.includes('dessert') || productType === 'dessert' || productType === 'sobremesa') return 'ADD_DESSERT';
  if (source?.includes('combo') || productType === 'combo') return 'SUGGEST_COMBO';
  if (source?.includes('beverage')) return 'ADD_BEVERAGE';

  return null;
};

const makeEmptyActionEntry = ({ actionType, productContext = 'dish' } = {}) => ({
  action_type: actionType,
  action_label: ACTION_LABELS[actionType] || actionType,
  product_context: productContext,
  suggested: 0,
  clicked: 0,
  accepted: 0,
  rejected: 0,
  skipped: 0,
  upgraded: 0,
  revenue_generated: 0,
  estimated_profit_generated: 0,
  average_added_value: 0,
  acceptance_rate: 0,
  click_rate: 0,
  rejection_rate: 0,
  profitability_signal: 0,
  confidence: 0,
  action_score: 0,
  top_context: productContext,
});

const accumulateActionPatch = (target, patch = {}) => {
  target.suggested += toNumber(patch.suggested, 0);
  target.clicked += toNumber(patch.clicked, 0);
  target.accepted += toNumber(patch.accepted, 0);
  target.rejected += toNumber(patch.rejected, 0);
  target.skipped += toNumber(patch.skipped, 0);
  target.upgraded += toNumber(patch.upgraded, 0);
  target.revenue_generated = Number(
    (toNumber(target.revenue_generated, 0) + toNumber(patch.revenue_generated, 0)).toFixed(2)
  );
  target.estimated_profit_generated = Number(
    (toNumber(target.estimated_profit_generated, 0) + toNumber(patch.estimated_profit_generated, 0)).toFixed(2)
  );
};

const estimateProfitSignal = ({ actionType, beverageId, revenueValue, performanceByBeverage = {} } = {}) => {
  const beveragePerformance = beverageId ? performanceByBeverage?.[String(beverageId)] || null : null;
  const profitabilitySignal = toNumber(
    beveragePerformance?.profitability_signal ??
      beveragePerformance?.margin_percentage ??
      beveragePerformance?.margin_signal,
    0
  );
  const marginValue = toNumber(beveragePerformance?.margin_value, 0);

  if (beveragePerformance) {
    const estimatedProfit = marginValue > 0
      ? Math.max(0, marginValue)
      : Number(((revenueValue * Math.max(20, profitabilitySignal)) / 100).toFixed(2));
    return {
      profitabilitySignal: profitabilitySignal || 42,
      estimatedProfit,
    };
  }

  const fallbackSignal =
    actionType === 'SUGGEST_COMBO'
      ? 56
      : actionType === 'ADD_DESSERT'
        ? 48
        : actionType === 'DO_NOTHING'
          ? 0
          : 44;

  return {
    profitabilitySignal: fallbackSignal,
    estimatedProfit: Number(((revenueValue * fallbackSignal) / 100).toFixed(2)),
  };
};

const buildActionContextId = ({ actionType, productContext }) =>
  `${String(actionType || 'DO_NOTHING')}::${String(productContext || 'dish')}`;

const buildDecisionLog = ({
  topAction,
  contextWinners = {},
  underusedActions = [],
} = {}) => {
  const items = [];

  if (topAction) {
    items.push({
      id: `top:${topAction.action_type}`,
      tone: 'success',
      title: `${topAction.action_label} lidera a proxima acao do pedido`,
      description:
        topAction.acceptance_rate > 0
          ? `${topAction.action_label} esta gerando mais retorno com ${topAction.acceptance_rate.toFixed(0)}% de aceitacao.`
          : 'Ainda com pouca massa critica, mas esta acao esta na frente pela combinacao de ticket e contexto.',
    });
  }

  Object.values(contextWinners)
    .slice(0, 2)
    .forEach((winner) => {
      items.push({
        id: `ctx:${winner.product_context}:${winner.action_type}`,
        tone: 'info',
        title: `${winner.action_label} ganha em ${winner.product_context || 'pedido geral'}`,
        description: `Nesse contexto, essa acao entrega score ${Number(winner.action_score || 0).toFixed(0)} e tende a gerar mais valor.`,
      });
    });

  underusedActions.slice(0, 2).forEach((entry) => {
    items.push({
      id: `underused:${entry.action_type}:${entry.product_context}`,
      tone: 'warning',
      title: `${entry.action_label} ainda aparece pouco`,
      description: `O contexto ${entry.product_context || 'geral'} responde bem, mas teve so ${entry.suggested} exibicao(oes).`,
    });
  });

  return items.slice(0, 5);
};

export function buildOrderOptimizationSnapshot({
  rows = [],
  performanceByBeverage = {},
} = {}) {
  const actionMap = new Map();
  const actionContextMap = new Map();

  ACTION_TYPES.forEach((actionType) => {
    actionMap.set(actionType, makeEmptyActionEntry({ actionType, productContext: 'all' }));
  });

  rows.forEach((row) => {
    const eventName = normalizeText(row?.event_name, 60) || '';
    const properties = row?.properties && typeof row.properties === 'object' ? row.properties : {};
    const actionType = inferActionType({ eventName, properties });
    if (!actionType || !ACTION_TYPES.includes(actionType)) return;

    const orderContext = buildOrderContextFromProperties(properties, row?.created_at);
    const productContext = orderContext?.product_context || 'dish';
    const beverageId = String(
      properties?.beverage_id ??
        properties?.dish_id ??
        properties?.product_id ??
        ''
    ).trim() || null;
    const revenueValue = getRevenueFromProperties(properties);
    const { profitabilitySignal, estimatedProfit } = estimateProfitSignal({
      actionType,
      beverageId,
      revenueValue,
      performanceByBeverage,
    });

    const patch = {
      revenue_generated: 0,
      estimated_profit_generated: 0,
      suggested: 0,
      clicked: 0,
      accepted: 0,
      rejected: 0,
      skipped: 0,
      upgraded: 0,
      profitability_signal: profitabilitySignal,
    };

    if (eventName === 'beverage_suggested' || eventName === 'upsell_shown') patch.suggested = 1;
    if (eventName === 'beverage_clicked' || eventName === 'combo_clicked') patch.clicked = 1;
    if (eventName === 'beverage_added' || eventName === 'upsell_accepted' || eventName === 'combo_added') {
      patch.accepted = 1;
      patch.revenue_generated = revenueValue;
      patch.estimated_profit_generated = estimatedProfit;
    }
    if (eventName === 'beverage_upgraded') {
      patch.accepted = 1;
      patch.upgraded = 1;
      patch.revenue_generated = revenueValue;
      patch.estimated_profit_generated = estimatedProfit;
    }
    if (eventName === 'beverage_rejected' || eventName === 'upsell_rejected') patch.rejected = 1;
    if (eventName === 'upsell_skipped') patch.skipped = 1;

    const actionEntry = actionMap.get(actionType) || makeEmptyActionEntry({ actionType, productContext: 'all' });
    const contextId = buildActionContextId({ actionType, productContext });
    const contextEntry =
      actionContextMap.get(contextId) ||
      makeEmptyActionEntry({ actionType, productContext });

    accumulateActionPatch(actionEntry, patch);
    accumulateActionPatch(contextEntry, patch);

    actionMap.set(actionType, actionEntry);
    actionContextMap.set(contextId, contextEntry);
  });

  const provisionalEntries = [...actionMap.values(), ...actionContextMap.values()];
  const maxRevenue = provisionalEntries.reduce(
    (highest, entry) => Math.max(highest, toNumber(entry.revenue_generated, 0)),
    0
  );

  const finalizeEntry = (entry = {}) => {
    const acceptanceRate = safeRate(entry.accepted, entry.suggested || entry.accepted + entry.rejected + entry.skipped);
    const clickRate = safeRate(entry.clicked, entry.suggested);
    const rejectionRate = safeRate(entry.rejected + entry.skipped, entry.suggested || entry.rejected + entry.skipped);
    const averageAddedValue = entry.accepted > 0 ? Number((entry.revenue_generated / entry.accepted).toFixed(2)) : 0;
    const profitabilitySignal =
      entry.revenue_generated > 0
        ? clamp(Math.round((entry.estimated_profit_generated / entry.revenue_generated) * 100), 0, 100)
        : toNumber(entry.profitability_signal, 0);
    const revenueWeight = maxRevenue > 0 ? (toNumber(entry.revenue_generated, 0) / maxRevenue) * 100 : 0;
    const actionScore = clamp(
      Number(
        (
          acceptanceRate * 0.36 +
          clickRate * 0.12 +
          profitabilitySignal * 0.18 +
          revenueWeight * 0.22 +
          Math.min(12, averageAddedValue * 0.55)
        ).toFixed(2)
      ),
      0,
      100
    );

    return {
      ...entry,
      average_added_value: averageAddedValue,
      acceptance_rate: acceptanceRate,
      click_rate: clickRate,
      rejection_rate: rejectionRate,
      profitability_signal: profitabilitySignal,
      confidence: clamp(
        Math.round(
          Math.min(
            100,
            entry.suggested * 8 +
              entry.clicked * 4 +
              entry.accepted * 10 +
              entry.upgraded * 10
          )
        ),
        0,
        100
      ),
      action_score: actionScore,
      top_context: entry.product_context || 'all',
    };
  };

  const finalizedActionMap = Object.fromEntries(
    [...actionMap.entries()].map(([actionType, entry]) => [actionType, finalizeEntry(entry)])
  );
  const finalizedContextEntries = [...actionContextMap.values()].map(finalizeEntry);

  const topActions = Object.values(finalizedActionMap)
    .filter((entry) => entry.action_type !== 'DO_NOTHING' && (entry.suggested > 0 || entry.accepted > 0))
    .sort(
      (left, right) =>
        right.action_score - left.action_score ||
        right.acceptance_rate - left.acceptance_rate ||
        right.revenue_generated - left.revenue_generated
    )
    .slice(0, 5);

  const underusedActions = finalizedContextEntries
    .filter((entry) => entry.action_type !== 'DO_NOTHING' && entry.action_score >= 52 && entry.suggested <= 4)
    .sort(
      (left, right) =>
        right.action_score - left.action_score ||
        right.profitability_signal - left.profitability_signal
    )
    .slice(0, 5);

  const contextWinners = finalizedContextEntries.reduce((accumulator, entry) => {
    const contextKey = entry.product_context || 'dish';
    if (contextKey === 'all' || entry.action_type === 'DO_NOTHING') return accumulator;
    const current = accumulator[contextKey];
    if (!current || entry.action_score > current.action_score) {
      accumulator[contextKey] = entry;
    }
    return accumulator;
  }, {});

  const lostOpportunities = [];
  underusedActions.slice(0, 3).forEach((entry) => {
    lostOpportunities.push({
      id: `lost:${entry.action_type}:${entry.product_context}`,
      title: `${entry.action_label} esta subaproveitada em ${entry.product_context || 'geral'}`,
      description: 'Esse contexto aceita bem a acao, mas ela ainda aparece pouco no fluxo real.',
      impact: `Score ${Number(entry.action_score || 0).toFixed(0)} com ${entry.suggested} exibicao(oes).`,
      action_type: entry.action_type,
      product_context: entry.product_context,
    });
  });

  const topAction = topActions[0] || null;

  return {
    action_performance: finalizedActionMap,
    action_summary: {
      top_action_type: topAction?.action_type || null,
      top_action_label: topAction?.action_label || null,
      top_action_reason: topAction
        ? `${topAction.action_label} lidera com ${Number(topAction.acceptance_rate || 0).toFixed(0)}% de aceitacao e ${topAction.confidence}% de confianca.`
        : 'Ainda sem dados suficientes. O fallback atual continua protegendo a proxima acao do pedido.',
      top_action_score: Number(topAction?.action_score || 0),
      total_actions_with_data: topActions.length,
      context_winners: contextWinners,
      top_actions: topActions,
      underused_actions: underusedActions,
      lost_opportunities: lostOpportunities,
      decision_log: buildDecisionLog({
        topAction,
        contextWinners,
        underusedActions,
      }),
    },
  };
}
