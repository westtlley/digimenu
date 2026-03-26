const normalizeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

export const BEVERAGE_SECTIONS = [
  { id: 'overview', label: 'Visao Geral', shortLabel: 'Geral' },
  { id: 'catalog', label: 'Catalogo de Bebidas', shortLabel: 'Catalogo' },
  { id: 'links', label: 'Vinculos & Upsell', shortLabel: 'Vinculos' },
  { id: 'preview', label: 'Preview', shortLabel: 'Preview' },
  { id: 'insights', label: 'Inteligencia & Oportunidades', shortLabel: 'Insights' },
];

export const BEVERAGE_TAG_OPTIONS = [
  { id: 'refrescante', label: 'Refrescante' },
  { id: 'premium', label: 'Premium' },
  { id: 'mais_vendida', label: 'Mais vendida' },
  { id: 'alta_margem', label: 'Alta margem' },
  { id: 'combo', label: 'Combo' },
  { id: 'delivery', label: 'Delivery' },
];

export const BEVERAGE_PACKAGING_OPTIONS = [
  { id: 'lata', label: 'Lata' },
  { id: '600ml', label: '600ml' },
  { id: '1l', label: '1L' },
  { id: '2l', label: '2L' },
  { id: 'jarra', label: 'Jarra' },
  { id: 'copo', label: 'Copo' },
];

export const BEVERAGE_CONTEXT_OPTIONS = [
  { id: 'pizza', label: 'Pizza' },
  { id: 'dish', label: 'Pratos' },
  { id: 'hamburger', label: 'Hamburgueres' },
  { id: 'massas', label: 'Massas' },
  { id: 'sobremesas', label: 'Sobremesas' },
  { id: 'delivery', label: 'Delivery' },
];

export function normalizeBeverageStrategy(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((acc, [beverageId, config]) => {
    if (!beverageId || !config || typeof config !== 'object') return acc;

    acc[beverageId] = {
      tags: normalizeArray(config.tags),
      packaging: config.packaging || '',
      contexts: normalizeArray(config.contexts),
      linkedCategoryIds: normalizeArray(config.linkedCategoryIds),
      linkedDishIds: normalizeArray(config.linkedDishIds),
      preparedForUpsell: config.preparedForUpsell === true,
      moreOrdered: config.moreOrdered === true,
      comboReady: config.comboReady === true,
    };
    return acc;
  }, {});
}

export function inferBeveragePackaging(beverage, savedPackaging = '') {
  if (savedPackaging) return savedPackaging;
  const volume = Number(beverage?.volume_ml || 0);
  if (volume >= 1800) return '2l';
  if (volume >= 900) return '1l';
  if (volume >= 500) return '600ml';
  if (volume >= 320) return 'lata';
  if (volume > 0) return 'copo';
  if (beverage?.beverage_type === 'natural') return 'copo';
  return '';
}

const normalizeName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function getBeverageUsageSnapshot({
  beverage,
  strategy = {},
  activeUpsellDishId = null,
  comboCount = 0,
}) {
  const hasCategoryLinks = normalizeArray(strategy.linkedCategoryIds).length > 0;
  const hasDishLinks = normalizeArray(strategy.linkedDishIds).length > 0;
  const hasContextLinks = normalizeArray(strategy.contexts).length > 0;
  const isRealUpsell = String(activeUpsellDishId || '') === String(beverage?.id || '');

  return {
    isRealUpsell,
    hasCategoryLinks,
    hasDishLinks,
    hasContextLinks,
    comboCount: Number(comboCount || 0),
    totalLinks:
      normalizeArray(strategy.linkedCategoryIds).length +
      normalizeArray(strategy.linkedDishIds).length +
      normalizeArray(strategy.contexts).length,
  };
}

export function getBeverageCommercialProfile({
  beverage,
  strategy = {},
  activeUpsellDishId = null,
  comboCount = 0,
}) {
  const tags = normalizeArray(strategy.tags);
  const contexts = normalizeArray(strategy.contexts);
  const packaging = inferBeveragePackaging(beverage, strategy.packaging);
  const price = Number(beverage?.price || 0);
  const volume = Number(beverage?.volume_ml || 0);
  const usage = getBeverageUsageSnapshot({ beverage, strategy, activeUpsellDishId, comboCount });

  let score = 0;
  if (beverage?.is_active !== false) score += 1;
  if (price > 0) score += 1;
  if (volume > 0 || packaging) score += 1;
  if (beverage?.is_highlight) score += 1;
  if (usage.totalLinks > 0) score += 2;
  if (usage.isRealUpsell) score += 2;
  if (strategy.preparedForUpsell) score += 1;
  if (strategy.moreOrdered) score += 1;
  if (strategy.comboReady || usage.comboCount > 0) score += 1;
  if (tags.includes('premium') || price >= 8) score += 1;
  if (tags.includes('alta_margem') || tags.includes('mais_vendida')) score += 1;
  if (beverage?.is_active === false) score -= 2;
  if (!packaging && volume <= 0) score -= 1;
  if (usage.totalLinks === 0 && !usage.isRealUpsell) score -= 1;

  let level = 'Fraca';
  let accent = 'rose';
  if (score >= 8) {
    level = 'Forte';
    accent = 'emerald';
  } else if (score >= 6) {
    level = 'Boa';
    accent = 'sky';
  } else if (score >= 3) {
    level = 'Regular';
    accent = 'amber';
  }

  let readout = 'Baixo potencial';
  if ((tags.includes('premium') || price >= 8) && (usage.isRealUpsell || strategy.preparedForUpsell)) {
    readout = 'Forte para ticket';
  } else if ((strategy.comboReady || usage.comboCount > 0) && volume >= 900) {
    readout = 'Boa para combo';
  } else if (contexts.includes('pizza') || contexts.includes('delivery')) {
    readout = volume >= 900 ? 'Boa para delivery' : 'Boa para acompanhar';
  } else if (price <= 6 || packaging === 'lata' || packaging === 'copo') {
    readout = 'Boa para volume';
  } else if (tags.includes('premium') && !usage.isRealUpsell) {
    readout = 'Premium subaproveitada';
  }

  return {
    score,
    level,
    accent,
    readout,
    packaging,
    usage,
  };
}

export function suggestBeverageLinks({ beverage, strategy = {}, categories = [] }) {
  const volume = Number(beverage?.volume_ml || 0);
  const normalizedCategories = Array.isArray(categories) ? categories : [];
  const currentContexts = new Set(normalizeArray(strategy.contexts));
  const currentCategoryIds = new Set(normalizeArray(strategy.linkedCategoryIds));
  const nextTags = new Set(normalizeArray(strategy.tags));
  const packaging = inferBeveragePackaging(beverage, strategy.packaging);
  const normalizedText = normalizeName(`${beverage?.name || ''} ${beverage?.description || ''}`);

  if (packaging === '2l' || packaging === '1l' || volume >= 900) {
    currentContexts.add('pizza');
    currentContexts.add('delivery');
    nextTags.add('combo');
  }

  if (packaging === 'lata' || packaging === '600ml' || volume <= 700) {
    currentContexts.add('hamburger');
  }

  if (beverage?.beverage_type === 'natural' || beverage?.sugar_free) {
    currentContexts.add('dish');
    nextTags.add('refrescante');
  }

  if (Number(beverage?.price || 0) >= 8 || /premium|especial|artesanal/.test(normalizedText)) {
    nextTags.add('premium');
    nextTags.add('alta_margem');
  }

  if (/agua|suco|natural|cha|mate|detox/.test(normalizedText)) {
    nextTags.add('delivery');
    currentContexts.add('dish');
  }

  normalizedCategories.forEach((category) => {
    const categoryName = normalizeName(category?.name);
    if (!category?.id || !categoryName) return;

    if ((currentContexts.has('pizza') || nextTags.has('combo')) && /pizza|massa|esfiha/.test(categoryName)) {
      currentCategoryIds.add(category.id);
    }
    if (currentContexts.has('dish') && /prato|executivo|marmita|almoco|refeicao/.test(categoryName)) {
      currentCategoryIds.add(category.id);
    }
    if (currentContexts.has('hamburger') && /hamburg|lanche|burger|sand/.test(categoryName)) {
      currentCategoryIds.add(category.id);
    }
    if (/sobremesa|doce|bolo|torta/.test(categoryName) && (beverage?.beverage_type === 'natural' || nextTags.has('premium'))) {
      currentCategoryIds.add(category.id);
    }
  });

  return {
    ...strategy,
    packaging,
    contexts: Array.from(currentContexts),
    linkedCategoryIds: Array.from(currentCategoryIds),
    tags: Array.from(nextTags),
  };
}

export function buildBeverageModuleSummary({
  beverages = [],
  beverageStrategies = {},
  activeUpsellDishId = null,
  comboUsageMap = {},
  categoriesWithoutUpsell = [],
}) {
  const profiles = beverages.map((beverage) =>
    getBeverageCommercialProfile({
      beverage,
      strategy: beverageStrategies?.[beverage.id] || {},
      activeUpsellDishId,
      comboCount: comboUsageMap?.[beverage.id] || 0,
    })
  );

  const strong = profiles.filter((profile) => profile.level === 'Forte').length;
  const good = profiles.filter((profile) => profile.level === 'Boa').length;
  const regular = profiles.filter((profile) => profile.level === 'Regular').length;
  const weak = profiles.filter((profile) => profile.level === 'Fraca').length;
  const averageScore = profiles.length > 0 ? profiles.reduce((sum, profile) => sum + profile.score, 0) / profiles.length : 0;
  const activeCount = beverages.filter((beverage) => beverage?.is_active !== false).length;

  let level = 'BASICO';
  let title = 'Bebidas ainda estao subaproveitadas';
  let className = 'border-rose-200 bg-rose-50/80';
  if (averageScore >= 7) {
    level = 'FORTE';
    title = 'Bebidas puxam ticket com boa estrutura';
    className = 'border-emerald-200 bg-emerald-50/80';
  } else if (averageScore >= 5) {
    level = 'BOM';
    title = 'Bebidas ja apoiam bem o upsell';
    className = 'border-sky-200 bg-sky-50/80';
  } else if (averageScore >= 3) {
    level = 'REGULAR';
    title = 'Bebidas ajudam, mas ainda perdem oportunidades';
    className = 'border-amber-200 bg-amber-50/80';
  }

  return {
    strong,
    good,
    regular,
    weak,
    activeCount,
    averageScore,
    level,
    title,
    className,
    categoriesWithoutUpsell: categoriesWithoutUpsell.length,
  };
}

export function buildBeverageAutoPlan({
  summary,
  activeUpsellDishId = null,
  categoriesWithoutUpsell = [],
  packagingVariety = 0,
}) {
  const before = [];
  const after = [];
  const impact = [];

  if (!activeUpsellDishId) {
    before.push('Sem bebida no upsell principal');
    after.push('Uma bebida forte entra no cross-sell real');
    impact.push('Upsell mais visivel no cardapio');
  }

  if (summary.weak > 0) {
    before.push(`${summary.weak} bebida(s) com leitura comercial fraca`);
    after.push('As bebidas mais promissoras ficam mais claras e destacadas');
    impact.push('Catalogo mais vendavel');
  }

  if (categoriesWithoutUpsell.length > 0) {
    before.push(`${categoriesWithoutUpsell.length} categoria(s) sem apoio de bebida`);
    after.push('Categorias principais recebem sugestao de bebida');
    impact.push('Mais chances de aumentar ticket');
  }

  if (packagingVariety < 3) {
    before.push('Pouca variedade de embalagem/volume');
    after.push('Leitura de valor fica mais clara entre lata, 600ml e familia');
    impact.push('Melhor percepcao de faixa de preco');
  }

  return {
    canImprove: before.length > 0,
    summary: before.length > 0 ? 'O modulo ainda pode vender mais com poucos ajustes.' : 'A base comercial de bebidas esta bem encaminhada.',
    before: before.length > 0 ? before : ['Estrutura de bebidas consistente'],
    after: after.length > 0 ? after : ['Sem ajustes urgentes agora'],
    impact,
    level: summary.level,
  };
}

export function buildBeverageRecommendations({
  beverages = [],
  beverageStrategies = {},
  activeUpsellDishId = null,
  categoriesWithoutUpsell = [],
  comboUsageMap = {},
}) {
  const recommendations = [];

  const activeBeverages = beverages.filter((beverage) => beverage?.is_active !== false);
  const premiumCandidates = activeBeverages.filter((beverage) => {
    const strategy = beverageStrategies?.[beverage.id] || {};
    return normalizeArray(strategy.tags).includes('premium') || Number(beverage?.price || 0) >= 8;
  });

  if (!activeUpsellDishId && activeBeverages.length > 0) {
    recommendations.push({
      id: 'activate-basic-upsell',
      severity: 'critical',
      title: 'Voce ainda nao esta usando bebida no upsell principal',
      description: 'Ative uma bebida forte no cross-sell para pizza, prato e hamburguer sem mexer no backend.',
      impact: 'Aumenta o valor percebido assim que o cliente monta o pedido.',
      actionLabel: 'Ativar upsell basico',
      actionId: 'activate-basic-upsell',
    });
  }

  if (categoriesWithoutUpsell.length > 0) {
    recommendations.push({
      id: 'link-missing-categories',
      severity: categoriesWithoutUpsell.length >= 3 ? 'important' : 'opportunity',
      title: 'Existem categorias sem bebida sugerida',
      description: `${categoriesWithoutUpsell.length} categoria(s) ainda nao recebem apoio de bebida, o que reduz chance de ticket adicional.`,
      impact: 'Melhora a presenca de bebida no fluxo do cardapio e no raciocinio do lojista.',
      actionLabel: 'Vincular bebidas sugeridas',
      actionId: 'link-suggested-beverages',
    });
  }

  if (premiumCandidates.length === 0 && activeBeverages.length > 0) {
    recommendations.push({
      id: 'premium-gap',
      severity: 'important',
      title: 'Bebidas premium estao pouco aproveitadas',
      description: 'Sem uma bebida mais valorizada, o sistema perde uma alavanca clara para aumentar ticket.',
      impact: 'Uma faixa premium ajuda a vender mais sem complicar o cardapio.',
      actionLabel: 'Preparar bebidas para vender',
      actionId: 'prepare-beverages',
    });
  }

  const comboReadyCount = activeBeverages.filter((beverage) => {
    const strategy = beverageStrategies?.[beverage.id] || {};
    return strategy.comboReady || Number(comboUsageMap?.[beverage.id] || 0) > 0;
  }).length;
  if (comboReadyCount === 0 && activeBeverages.length > 0) {
    recommendations.push({
      id: 'combo-ready',
      severity: 'opportunity',
      title: 'Nenhuma bebida esta pronta para combo',
      description: 'Preparar uma bebida para combo ajuda pizza, prato e promocao a venderem melhor juntos.',
      impact: 'Cria mais oportunidades de montar oferta com alto valor percebido.',
      actionLabel: 'Criar estrutura recomendada',
      actionId: 'apply-recommended-structure',
    });
  }

  return recommendations;
}
