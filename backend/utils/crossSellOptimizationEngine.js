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

const buildHourBucket = (createdAt) => {
  const date = createdAt ? new Date(createdAt) : new Date();
  const hour = Number.isFinite(date.getHours()) ? date.getHours() : 12;
  if (hour < 11) return 'morning';
  if (hour < 15) return 'lunch';
  if (hour < 19) return 'afternoon';
  if (hour < 23) return 'night';
  return 'late_night';
};

const buildOrderBand = (ticketPartial) => {
  const safeTicket = toNumber(ticketPartial, 0);
  if (safeTicket >= 90) return 'high';
  if (safeTicket >= 40) return 'medium';
  return 'small';
};

const buildServingMode = ({ itemCount = 0, ticketPartial = 0, productContext = 'dish' }) => {
  if (toNumber(itemCount, 0) >= 3 || toNumber(ticketPartial, 0) >= 85) return 'shared';
  if (productContext === 'pizza' && toNumber(ticketPartial, 0) >= 55) return 'shared';
  return 'individual';
};

const buildContextLabel = ({ productContext, dominantCategory, servingMode }) => {
  const safeContext = normalizeText(productContext, 80) || 'dish';
  const safeCategory = normalizeText(dominantCategory, 80);

  if (safeCategory) {
    return safeCategory;
  }

  if (safeContext === 'pizza') {
    return servingMode === 'shared' ? 'pizza para compartilhar' : 'pizza';
  }
  if (safeContext === 'hamburger') return 'lanche';
  if (safeContext === 'dish') return 'prato';
  if (safeContext === 'combo') return 'combo';
  if (safeContext === 'massas') return 'massa';
  if (safeContext === 'sobremesas') return 'sobremesa';
  return safeContext;
};

const buildOfferStyle = ({ productContext, servingMode, volumeMl = 0, acceptanceRate = 0, upgraded = 0 }) => {
  if (upgraded > 0) return 'upgrade';
  if (productContext === 'pizza' || productContext === 'combo') return 'combo';
  if (servingMode === 'shared' || toNumber(volumeMl, 0) >= 1200) return 'combo';
  if (acceptanceRate >= 18 && toNumber(volumeMl, 0) >= 600) return 'combo';
  return 'upsell';
};

const getEventBeverageIds = (properties = {}) => {
  const directId = normalizeText(
    properties?.beverage_id ??
      properties?.dish_id ??
      properties?.product_id ??
      properties?.id,
    120
  );

  if (directId) return [directId];

  if (Array.isArray(properties?.dish_ids)) {
    return properties.dish_ids.map((value) => normalizeText(value, 120)).filter(Boolean);
  }

  return [];
};

const getRevenueFromProperties = (properties = {}) =>
  toNumber(properties?.added_value, 0) ||
  toNumber(properties?.delta_price, 0) ||
  toNumber(properties?.beverage_price, 0) ||
  toNumber(properties?.item_total, 0);

const getProductContext = (properties = {}) =>
  normalizeText(
    properties?.product_context ??
      properties?.current_product_type ??
      properties?.product_type ??
      properties?.context ??
      properties?.primary_context,
    80
  ) || 'dish';

const getDominantCategory = (properties = {}) =>
  normalizeText(
    properties?.dominant_category_name ??
      properties?.current_product_category_name ??
      properties?.dominant_category ??
      properties?.current_product_category ??
      properties?.product_category,
    80
  );

const makeEmptyCombinationEntry = ({
  beverageId,
  beverageName,
  beveragePrice,
  productContext,
  dominantCategory,
  orderBand,
  hourBucket,
  servingMode,
}) => ({
  beverage_id: beverageId,
  beverage_name: beverageName || 'Bebida',
  beverage_price: toNumber(beveragePrice, 0),
  product_context: productContext,
  dominant_category: dominantCategory || null,
  order_band: orderBand,
  hour_bucket: hourBucket,
  serving_mode: servingMode,
  context_label: buildContextLabel({ productContext, dominantCategory, servingMode }),
  suggested: 0,
  clicked: 0,
  added: 0,
  rejected: 0,
  upgraded: 0,
  revenue_generated: 0,
  estimated_profit_generated: 0,
  average_added_value: 0,
  confidence: 0,
  combination_score: 0,
  dominant_action: 'upsell',
});

const accumulateCombinationPatch = (target, patch = {}) => {
  target.suggested += toNumber(patch.suggested, 0);
  target.clicked += toNumber(patch.clicked, 0);
  target.added += toNumber(patch.added, 0);
  target.rejected += toNumber(patch.rejected, 0);
  target.upgraded += toNumber(patch.upgraded, 0);
  target.revenue_generated = Number((toNumber(target.revenue_generated, 0) + toNumber(patch.revenue_generated, 0)).toFixed(2));
  target.estimated_profit_generated = Number(
    (toNumber(target.estimated_profit_generated, 0) + toNumber(patch.estimated_profit_generated, 0)).toFixed(2)
  );
};

const buildCombinationId = ({ productContext, dominantCategory, beverageId }) =>
  [normalizeText(productContext, 80) || 'dish', normalizeText(dominantCategory, 80) || 'geral', String(beverageId || '')]
    .filter(Boolean)
    .join('::');

export function buildOrderContextFromProperties(properties = {}, createdAt = null) {
  const productContext = getProductContext(properties);
  const ticketPartial =
    toNumber(properties?.cart_value, 0) ||
    toNumber(properties?.cart_total, 0) ||
    toNumber(properties?.cart_total_estimate, 0);
  const itemCount = Math.max(
    1,
    toNumber(properties?.cart_item_count, 0) ||
      toNumber(properties?.order_item_count, 0) ||
      toNumber(properties?.quantity, 1)
  );
  const hourBucket = normalizeText(properties?.hour_bucket, 40) || buildHourBucket(createdAt);
  const orderBand = normalizeText(properties?.order_band, 40) || buildOrderBand(ticketPartial);
  const servingMode =
    normalizeText(properties?.serving_mode, 40) ||
    buildServingMode({ itemCount, ticketPartial, productContext });

  return {
    product_context: productContext,
    dominant_category: getDominantCategory(properties),
    ticket_partial: Number(ticketPartial.toFixed(2)),
    item_count: itemCount,
    order_band: orderBand,
    hour_bucket: hourBucket,
    serving_mode: servingMode,
    context_label: buildContextLabel({
      productContext,
      dominantCategory: getDominantCategory(properties),
      servingMode,
    }),
  };
}

export function buildCrossSellCombinationSnapshot({
  rows = [],
  performanceByBeverage = {},
} = {}) {
  const combinationMap = new Map();

  rows.forEach((row) => {
    const eventName = String(row?.event_name || '').trim().toLowerCase();
    const properties = row?.properties && typeof row.properties === 'object' ? row.properties : {};
    const beverageIds = getEventBeverageIds(properties);

    if (beverageIds.length === 0) {
      return;
    }

    const orderContext = buildOrderContextFromProperties(properties, row?.created_at);

    beverageIds.forEach((beverageId) => {
      const beveragePerformance = performanceByBeverage?.[String(beverageId)] || {};
      const entryId = buildCombinationId({
        productContext: orderContext.product_context,
        dominantCategory: orderContext.dominant_category,
        beverageId,
      });
      const current =
        combinationMap.get(entryId) ||
        makeEmptyCombinationEntry({
          beverageId,
          beverageName: beveragePerformance?.beverage_name,
          beveragePrice: beveragePerformance?.beverage_price,
          productContext: orderContext.product_context,
          dominantCategory: orderContext.dominant_category,
          orderBand: orderContext.order_band,
          hourBucket: orderContext.hour_bucket,
          servingMode: orderContext.serving_mode,
        });

      const profitabilitySignal = toNumber(
        beveragePerformance?.profitability_signal ??
          beveragePerformance?.margin_percentage ??
          beveragePerformance?.margin_signal,
        0
      );
      const marginValue = toNumber(beveragePerformance?.margin_value, 0);
      const revenueValue = getRevenueFromProperties(properties);
      const estimatedProfit =
        marginValue > 0 && revenueValue > 0
          ? Math.max(0, marginValue * Math.max(1, toNumber(properties?.quantity, 1)))
          : Number(((revenueValue * profitabilitySignal) / 100).toFixed(2));

      if (eventName === 'beverage_suggested' || (eventName === 'upsell_shown' && beverageIds.length > 0)) {
        accumulateCombinationPatch(current, { suggested: 1 });
      } else if (eventName === 'beverage_clicked') {
        accumulateCombinationPatch(current, { clicked: 1 });
      } else if (eventName === 'beverage_added' || (eventName === 'upsell_accepted' && beverageIds.length > 0)) {
        accumulateCombinationPatch(current, {
          added: 1,
          revenue_generated: revenueValue,
          estimated_profit_generated: estimatedProfit,
        });
      } else if (eventName === 'beverage_upgraded') {
        accumulateCombinationPatch(current, {
          upgraded: 1,
          added: 1,
          revenue_generated: revenueValue,
          estimated_profit_generated: estimatedProfit,
        });
      } else if (eventName === 'beverage_rejected' || eventName === 'upsell_rejected' || eventName === 'upsell_skipped') {
        accumulateCombinationPatch(current, { rejected: 1, suggested: eventName.startsWith('upsell_') ? 1 : 0 });
      }

      combinationMap.set(entryId, current);
    });
  });

  const provisionalEntries = Array.from(combinationMap.values()).map((entry) => {
    const performance = performanceByBeverage?.[String(entry.beverage_id)] || {};
    const acceptanceRate = safeRate(entry.added, entry.suggested);
    const clickRate = safeRate(entry.clicked, entry.suggested);
    const upgradeRate = safeRate(entry.upgraded, entry.added || entry.suggested);
    const averageAddedValue = entry.added > 0 ? Number((entry.revenue_generated / entry.added).toFixed(2)) : 0;
    const profitabilitySignal = toNumber(
      performance?.profitability_signal ??
        performance?.margin_percentage ??
        performance?.margin_signal,
      0
    );

    return {
      ...entry,
      acceptance_rate: acceptanceRate,
      click_rate: clickRate,
      upgrade_rate: upgradeRate,
      average_added_value: averageAddedValue,
      profitability_signal: profitabilitySignal,
      confidence: clamp(
        Math.round(
          Math.min(100, entry.suggested * 10 + entry.clicked * 4 + entry.added * 12 + entry.upgraded * 10)
        ),
        0,
        100
      ),
      dominant_action: buildOfferStyle({
        productContext: entry.product_context,
        servingMode: entry.serving_mode,
        volumeMl: performance?.beverage_volume_ml,
        acceptanceRate,
        upgraded: entry.upgraded,
      }),
    };
  });

  const maxRevenue = provisionalEntries.reduce(
    (highest, entry) => Math.max(highest, toNumber(entry.revenue_generated, 0)),
    0
  );

  const finalizedEntries = provisionalEntries.map((entry) => {
    const revenueWeight = maxRevenue > 0 ? (toNumber(entry.revenue_generated, 0) / maxRevenue) * 100 : 0;
    const contextFit =
      entry.product_context === 'pizza'
        ? 18
        : entry.product_context === 'dish'
          ? 14
          : entry.product_context === 'hamburger'
            ? 12
            : 8;

    return {
      ...entry,
      combination_id: buildCombinationId({
        productContext: entry.product_context,
        dominantCategory: entry.dominant_category,
        beverageId: entry.beverage_id,
      }),
      combination_score: clamp(
        Number(
          (
            entry.acceptance_rate * 0.34 +
            entry.click_rate * 0.1 +
            entry.upgrade_rate * 0.12 +
            entry.profitability_signal * 0.18 +
            revenueWeight * 0.16 +
            contextFit +
            (entry.serving_mode === 'shared' ? 6 : 0)
          ).toFixed(2)
        ),
        0,
        100
      ),
    };
  });

  const serialized = finalizedEntries.reduce((accumulator, entry) => {
    accumulator[entry.combination_id] = {
      ...entry,
      combo_label: `${entry.context_label} + ${entry.beverage_name}`,
    };
    return accumulator;
  }, {});

  const topCombinations = [...finalizedEntries]
    .filter((entry) => entry.suggested > 0 || entry.added > 0)
    .sort(
      (left, right) =>
        right.combination_score - left.combination_score ||
        right.acceptance_rate - left.acceptance_rate ||
        right.revenue_generated - left.revenue_generated
    )
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      combo_label: `${entry.context_label} + ${entry.beverage_name}`,
    }));

  const underusedCombinations = [...finalizedEntries]
    .filter((entry) => entry.combination_score >= 58 && entry.suggested <= 3)
    .sort(
      (left, right) =>
        right.combination_score - left.combination_score ||
        right.profitability_signal - left.profitability_signal
    )
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      combo_label: `${entry.context_label} + ${entry.beverage_name}`,
    }));

  const contextWinners = finalizedEntries.reduce((accumulator, entry) => {
    const key = entry.product_context || 'dish';
    const current = accumulator[key];
    if (!current || entry.combination_score > current.combination_score) {
      accumulator[key] = {
        ...entry,
        combo_label: `${entry.context_label} + ${entry.beverage_name}`,
      };
    }
    return accumulator;
  }, {});

  return {
    combination_performance: serialized,
    combination_summary: {
      total_combinations_with_data: finalizedEntries.filter((entry) => entry.suggested > 0 || entry.added > 0).length,
      top_combinations: topCombinations,
      underused_combinations: underusedCombinations,
      context_winners: contextWinners,
      main_combination_id: topCombinations[0]?.combination_id || null,
      main_combination_label: topCombinations[0]?.combo_label || null,
    },
  };
}
