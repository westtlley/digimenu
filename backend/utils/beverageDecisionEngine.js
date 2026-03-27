const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const normalizeText = (value, maxLength = 255) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

export function calculateBeverageMarginMetrics({
  price = 0,
  cost = null,
  estimatedMarginSignal = 0,
} = {}) {
  const safePrice = Math.max(0, toNumber(price, 0));
  const safeCost = cost === null || cost === undefined || cost === '' ? null : Math.max(0, toNumber(cost, 0));

  if (safeCost != null && safePrice > 0) {
    const marginValue = Number(Math.max(0, safePrice - safeCost).toFixed(2));
    const marginPercentage = Number(((marginValue / safePrice) * 100).toFixed(2));
    return {
      cost: safeCost,
      price: safePrice,
      margin_value: marginValue,
      margin_percentage: marginPercentage,
      profitability_signal: clamp(Math.round(marginPercentage), 0, 100),
      margin_source: 'real',
    };
  }

  const profitabilitySignal = clamp(Math.round(toNumber(estimatedMarginSignal, 42)), 20, 100);
  const marginValue = Number(((safePrice * profitabilitySignal) / 100).toFixed(2));

  return {
    cost: safeCost,
    price: safePrice,
    margin_value: marginValue,
    margin_percentage: profitabilitySignal,
    profitability_signal: profitabilitySignal,
    margin_source: 'estimated',
  };
}

export function buildBeverageFinalScore({
  beverage = {},
  strategy = {},
  metrics = {},
  performance = {},
  marginMetrics = {},
  revenueWeight = 0,
} = {}) {
  const acceptanceRate = toNumber(performance.acceptance_rate, 0);
  const clickRate = toNumber(performance.click_rate, 0);
  const upgradeRate = toNumber(performance.upgrade_rate, 0);
  const suggested = toNumber(performance.suggested, 0);
  const added = toNumber(performance.added, 0);
  const profitabilitySignal = toNumber(marginMetrics.profitability_signal, 0);
  const strategyPriority = toNumber(strategy.priority, 0);
  const manualPriority = toNumber(metrics.manual_priority, 0);

  let score =
    acceptanceRate * 0.34 +
    clickRate * 0.11 +
    upgradeRate * 0.09 +
    toNumber(revenueWeight, 0) * 0.14 +
    profitabilitySignal * 0.18 +
    strategyPriority * 0.06 +
    manualPriority * 0.08;

  if (strategy.preparedForUpsell) score += 12;
  if (strategy.moreOrdered) score += 7;
  if (strategy.comboReady) score += 8;
  if (normalizeArray(strategy.tags).includes('premium')) score += 6;
  if (normalizeArray(strategy.tags).includes('alta_margem')) score += 9;
  if (normalizeArray(strategy.tags).includes('delivery')) score += 4;
  if (beverage?.is_highlight) score += 4;

  if (added > 0 && acceptanceRate >= 14) score += 10;
  if (suggested >= 6 && acceptanceRate < 8) score -= 22;
  if (suggested >= 6 && clickRate < 10) score -= 10;
  if (beverage?.is_active === false) score -= 500;
  if (metrics.automation_disabled === true) score -= 320;
  if (metrics.fixed_as_primary === true) score += 340;

  return Number(score.toFixed(2));
}

export function buildBeverageDecisionReasons({
  beverage = {},
  strategy = {},
  metrics = {},
  performance = {},
  marginMetrics = {},
  finalScore = 0,
} = {}) {
  const reasons = [];
  const acceptanceRate = toNumber(performance.acceptance_rate, 0);
  const clickRate = toNumber(performance.click_rate, 0);
  const suggested = toNumber(performance.suggested, 0);
  const upgradeRate = toNumber(performance.upgrade_rate, 0);
  const revenueGenerated = toNumber(performance.revenue_generated, 0);
  const profitabilitySignal = toNumber(marginMetrics.profitability_signal, 0);
  const topContext = normalizeText(performance.top_context, 80);

  if (metrics.fixed_as_primary === true) {
    reasons.push('Fixada manualmente como principal.');
  }
  if (metrics.automation_disabled === true) {
    reasons.push('Automacao desativada neste item.');
  }
  if (marginMetrics.margin_source === 'real' && profitabilitySignal >= 55) {
    reasons.push(`Margem real forte em ${marginMetrics.margin_percentage.toFixed(0)}%.`);
  } else if (profitabilitySignal >= 68) {
    reasons.push('Boa rentabilidade estimada para subir no ranking.');
  }
  if (acceptanceRate >= 18 && suggested >= 3) {
    reasons.push(`Aceitacao consistente em ${acceptanceRate.toFixed(0)}%.`);
  } else if (acceptanceRate < 8 && suggested >= 6) {
    reasons.push('Aceitacao baixa para a exposicao atual.');
  }
  if (clickRate >= 16 && suggested >= 4) {
    reasons.push(`Clique forte no upsell em ${clickRate.toFixed(0)}%.`);
  }
  if (upgradeRate >= 10) {
    reasons.push(`Upgrade responde bem em ${upgradeRate.toFixed(0)}%.`);
  }
  if (revenueGenerated > 0) {
    reasons.push(`Ja gerou ${revenueGenerated.toFixed(2)} em receita de upsell.`);
  }
  if (strategy.preparedForUpsell) {
    reasons.push('Ja esta preparada para aparecer no upsell.');
  }
  if (strategy.comboReady) {
    reasons.push('Ajuda a montar combo rapido.');
  }
  if (normalizeArray(strategy.tags).includes('premium')) {
    reasons.push('Tem leitura premium para puxar ticket.');
  }
  if (topContext) {
    reasons.push(`Melhor resposta recente em contexto ${topContext}.`);
  }
  if (reasons.length === 0) {
    reasons.push(`Score final ${Number(finalScore || 0).toFixed(1)} com fallback seguro.`);
  }

  return reasons.slice(0, 4);
}

export function buildBeverageDecisionSnapshot(entries = []) {
  const sorted = [...entries]
    .filter((entry) => entry?.beverage_id)
    .sort((left, right) => {
      if ((left?.metrics?.fixed_as_primary === true) !== (right?.metrics?.fixed_as_primary === true)) {
        return right?.metrics?.fixed_as_primary === true ? 1 : -1;
      }
      return toNumber(right?.final_score, 0) - toNumber(left?.final_score, 0);
    });

  const eligible = sorted.filter((entry) => entry?.metrics?.automation_disabled !== true);
  const topEntry = eligible[0] || null;
  const secondEntry = eligible[1] || null;
  const scoreGap = topEntry && secondEntry
    ? Math.abs(toNumber(topEntry.final_score, 0) - toNumber(secondEntry.final_score, 0))
    : 999;
  const activeAbTest = Boolean(
    topEntry &&
      secondEntry &&
      topEntry?.metrics?.fixed_as_primary !== true &&
      secondEntry?.metrics?.fixed_as_primary !== true &&
      scoreGap <= 8
  );

  const decisionLog = [];
  if (topEntry) {
    if (topEntry?.metrics?.fixed_as_primary === true) {
      decisionLog.push({
        id: `fixed:${topEntry.beverage_id}`,
        tone: 'manual',
        title: `${topEntry.beverage_name} segue fixa como bebida principal`,
        description: 'O sistema respeitou a decisao manual e manteve a bebida no topo.',
      });
    } else {
      decisionLog.push({
        id: `winner:${topEntry.beverage_id}`,
        tone: 'success',
        title: `${topEntry.beverage_name} virou a principal automatica`,
        description: topEntry.decision_reasons?.[0] || 'Ela combina lucro, aceitacao e contexto melhor que as demais.',
      });
    }
  }

  if (activeAbTest) {
    decisionLog.push({
      id: `ab:${topEntry.beverage_id}:${secondEntry.beverage_id}`,
      tone: 'experiment',
      title: `A/B leve entre ${topEntry.beverage_name} e ${secondEntry.beverage_name}`,
      description: 'As duas estao proximas. O sistema alterna discretamente para aprender qual gera mais dinheiro.',
    });
  }

  sorted
    .filter((entry) => entry?.metrics?.automation_disabled === true)
    .slice(0, 2)
    .forEach((entry) => {
      decisionLog.push({
        id: `paused:${entry.beverage_id}`,
        tone: 'muted',
        title: `${entry.beverage_name} ficou fora da automacao`,
        description: 'Esse item continua disponivel, mas sem participar das decisoes automaticas.',
      });
    });

  sorted
    .filter((entry) => toNumber(entry?.performance?.suggested, 0) >= 6 && toNumber(entry?.performance?.acceptance_rate, 0) < 8)
    .slice(0, 2)
    .forEach((entry) => {
      decisionLog.push({
        id: `cooldown:${entry.beverage_id}`,
        tone: 'warning',
        title: `${entry.beverage_name} perdeu forca por baixa conversao`,
        description: 'Ela esta aparecendo, mas nao esta trazendo retorno proporcional.',
      });
    });

  return {
    primary_beverage_id: topEntry?.beverage_id || null,
    primary_beverage_name: topEntry?.beverage_name || null,
    primary_reason: topEntry?.decision_reasons?.[0] || null,
    secondary_beverage_id: secondEntry?.beverage_id || null,
    secondary_beverage_name: secondEntry?.beverage_name || null,
    active_ab_test: activeAbTest,
    ab_candidate_ids: activeAbTest ? [topEntry?.beverage_id, secondEntry?.beverage_id].filter(Boolean) : [],
    score_gap: Number(scoreGap || 0),
    automated_count: eligible.length,
    fixed_count: sorted.filter((entry) => entry?.metrics?.fixed_as_primary === true).length,
    automation_disabled_count: sorted.filter((entry) => entry?.metrics?.automation_disabled === true).length,
    decision_log: decisionLog,
  };
}
