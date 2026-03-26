export const PIZZA_BUSINESS_PROFILES = [
  {
    id: 'neighborhood',
    label: 'Pizzaria de bairro',
    badge: 'Clareza',
    description: 'Prioriza leitura simples, valor percebido e cardapio facil de entender.',
  },
  {
    id: 'delivery',
    label: 'Pizzaria delivery',
    badge: 'Velocidade',
    description: 'Favorece estrutura rapida, escolhas claras e upsell leve no pedido.',
  },
  {
    id: 'premium',
    label: 'Pizzaria premium',
    badge: 'Ticket',
    description: 'Valoriza premium forte, diferenca clara de preco e experiencia mais rica.',
  },
  {
    id: 'dark-kitchen',
    label: 'Dark kitchen',
    badge: 'Operacao',
    description: 'Foco em eficiencia, repetibilidade e venda digital sem excesso de friccao.',
  },
  {
    id: 'other',
    label: 'Outro',
    badge: 'Livre',
    description: 'Mantem leitura equilibrada e deixa a configuracao seguir o seu estilo de operacao.',
  },
];

export const getPizzaBusinessProfile = (profileId) => {
  return PIZZA_BUSINESS_PROFILES.find((profile) => profile.id === profileId) || PIZZA_BUSINESS_PROFILES[PIZZA_BUSINESS_PROFILES.length - 1];
};

export const buildPizzaStorageScopeKey = ({
  slug = null,
  subscriberEmail = null,
  subscriberId = null,
  ownerEmail = null,
  suffix = 'default',
}) => {
  const scope = slug
    || subscriberEmail
    || (subscriberId != null ? `subscriber-${subscriberId}` : null)
    || ownerEmail
    || 'global';
  return `pizza-intelligence:${scope}:${suffix}`;
};

const resolveProfileWeights = (profileId) => {
  if (profileId === 'delivery') {
    return {
      sizeVariety: 1,
      flavorVariety: 0.8,
      premium: 0.6,
      edges: 0.5,
      extras: 0.4,
      price: 1.1,
      multiFlavor: 0.5,
      adjustments: (context) => (
        (context.activeSizeCount > 3 ? -0.4 : 0)
        + (context.activeFlavorCount > 8 ? -0.2 : 0)
        + ((context.hasEdges || context.hasExtras) ? 0.2 : 0)
      ),
    };
  }

  if (profileId === 'premium') {
    return {
      sizeVariety: 1,
      flavorVariety: 1.1,
      premium: 1.4,
      edges: 0.6,
      extras: 0.6,
      price: 1,
      multiFlavor: 0.6,
      adjustments: (context) => (
        (context.hasPremiumFlavor ? 0.3 : -0.5)
        + (context.premiumDelta >= 6 ? 0.4 : -0.2)
        + ((context.hasEdges || context.hasExtras) ? 0.2 : 0)
      ),
    };
  }

  if (profileId === 'neighborhood') {
    return {
      sizeVariety: 0.9,
      flavorVariety: 0.8,
      premium: 0.5,
      edges: 0.3,
      extras: 0.3,
      price: 1.2,
      multiFlavor: 0.4,
      adjustments: (context) => (
        (context.activeSizeCount <= 2 ? 0.3 : -0.1)
        + (context.hasPrice ? 0.2 : -0.2)
      ),
    };
  }

  if (profileId === 'dark-kitchen') {
    return {
      sizeVariety: 0.9,
      flavorVariety: 0.7,
      premium: 0.7,
      edges: 0.5,
      extras: 0.4,
      price: 1.1,
      multiFlavor: 0.5,
      adjustments: (context) => (
        (context.activeSizeCount > 2 ? -0.2 : 0.2)
        + (context.activeFlavorCount > 10 ? -0.3 : 0)
        + ((context.hasEdges || context.hasExtras) ? 0.2 : 0)
      ),
    };
  }

  return {
    sizeVariety: 1,
    flavorVariety: 1,
    premium: 1,
    edges: 0.5,
    extras: 0.5,
    price: 1,
    multiFlavor: 0.5,
    adjustments: () => 0,
  };
};

export const buildPizzaEntryCommercialModel = ({
  pizza,
  entryCategory,
  sizes,
  flavors,
  profileId = 'other',
}) => {
  const configuredSizes = Array.isArray(pizza?.pizza_config?.sizes) ? pizza.pizza_config.sizes.filter(Boolean) : [];
  const fallbackSize = sizes.find((size) => size.id === entryCategory?.size_id) || null;
  const effectiveSizes = configuredSizes.length > 0 ? configuredSizes : (fallbackSize ? [fallbackSize] : []);
  const activeSizes = effectiveSizes.filter((size) => size?.is_active !== false);
  const allowedFlavorIds = Array.isArray(pizza?.pizza_config?.flavor_ids) ? pizza.pizza_config.flavor_ids : [];
  const activeFlavors = flavors.filter((flavor) => allowedFlavorIds.includes(flavor.id) && flavor?.is_active !== false);
  const hasPremiumFlavor = activeFlavors.some((flavor) => flavor.category === 'premium');
  const hasPrice = activeSizes.some((size) => Number(size?.price_tradicional || 0) > 0 || Number(size?.price_premium || 0) > 0)
    || Number(pizza?.price || 0) > 0;
  const hasEdges = (pizza?.pizza_config?.edges || []).some((edge) => edge?.is_active !== false);
  const hasExtras = (pizza?.pizza_config?.extras || []).some((extra) => extra?.is_active !== false);
  const activeSizeCount = activeSizes.length;
  const activeFlavorCount = activeFlavors.length;
  const premiumDelta = activeSizes.reduce((maxValue, size) => {
    const delta = Number(size?.price_premium || 0) - Number(size?.price_tradicional || 0);
    return Math.max(maxValue, delta);
  }, 0);
  const profile = getPizzaBusinessProfile(profileId);
  const weights = resolveProfileWeights(profile.id);

  const essentialChecks = [
    { label: 'Nome definido', done: Boolean(String(pizza?.name || '').trim()) },
    { label: 'Regra vinculada', done: Boolean(entryCategory) },
    { label: 'Tamanhos ativos', done: activeSizes.length > 0 },
    { label: 'Sabores vinculados', done: activeFlavors.length > 0 },
    { label: 'Preco coerente', done: hasPrice },
  ];

  const completedEssentials = essentialChecks.filter((check) => check.done).length;
  const isComplete = completedEssentials === essentialChecks.length && pizza?.is_active !== false;
  const isAlmostReady = completedEssentials >= essentialChecks.length - 1 && completedEssentials < essentialChecks.length;
  const status = isComplete ? 'Completa' : (isAlmostReady ? 'Quase pronta' : 'Incompleta');

  const commercialScore = (
    (activeSizeCount >= 2 ? weights.sizeVariety : (activeSizeCount === 1 ? weights.sizeVariety * 0.5 : 0))
    + (activeFlavorCount >= 6 ? weights.flavorVariety : (activeFlavorCount >= 3 ? weights.flavorVariety * 0.5 : 0))
    + (hasPremiumFlavor ? weights.premium : 0)
    + (hasEdges ? weights.edges : 0)
    + (hasExtras ? weights.extras : 0)
    + (hasPrice ? weights.price : 0)
    + ((Number(entryCategory?.max_flavors) || 1) >= 2 ? weights.multiFlavor : 0)
    + Number(weights.adjustments({ activeSizeCount, activeFlavorCount, hasPremiumFlavor, hasEdges, hasExtras, hasPrice, premiumDelta }))
  );
  const commercialScoreValue = Number(commercialScore.toFixed(1));
  const salesStrength = commercialScore >= 4.8 ? 'Forte' : (commercialScore >= 3.4 ? 'Boa' : (commercialScore >= 2.1 ? 'Regular' : 'Fraca'));
  const commercialPotential = commercialScore >= 4 ? 'Alto potencial' : (commercialScore >= 2.5 ? 'Medio potencial' : 'Baixo potencial');
  const upsellPotential = hasEdges && (hasExtras || hasPremiumFlavor)
    ? 'Upsell forte'
    : ((hasEdges || hasExtras || hasPremiumFlavor) ? 'Upsell moderado' : 'Upsell limitado');

  let confidenceLabel = 'Precisa melhorar';
  if (salesStrength === 'Forte') {
    confidenceLabel = profile.id === 'premium'
      ? 'Alta chance de venda premium'
      : (profile.id === 'delivery' || profile.id === 'dark-kitchen'
        ? 'Alta chance de venda'
        : 'Forte para ticket medio');
  } else if (salesStrength === 'Boa') {
    confidenceLabel = profile.id === 'delivery' || profile.id === 'dark-kitchen'
      ? 'Boa para delivery'
      : 'Boa estrutura comercial';
  } else if (salesStrength === 'Fraca') {
    confidenceLabel = 'Baixo potencial';
  }

  let directFeedback = 'Estrutura comercial consistente.';
  if (salesStrength === 'Fraca') {
    directFeedback = 'Essa entrada tem baixo potencial de venda.';
  } else if (!hasPremiumFlavor && (profile.id === 'premium' || profile.id === 'delivery') && activeFlavorCount > 0) {
    directFeedback = 'Premium pouco aproveitado.';
  } else if (!hasEdges && !hasExtras) {
    directFeedback = 'Upsell inexistente.';
  } else if (salesStrength === 'Forte' && hasPremiumFlavor && premiumDelta >= 6) {
    directFeedback = profile.id === 'premium' ? 'Forte para ticket medio premium.' : 'Forte para ticket medio.';
  } else if ((profile.id === 'delivery' || profile.id === 'dark-kitchen') && activeSizeCount >= 2) {
    directFeedback = 'Boa estrutura para delivery.';
  }

  const suggestions = [];
  if (!entryCategory) suggestions.push('Vincule uma regra de montagem para definir o que o cliente realmente pode montar.');
  if (activeSizes.length === 0) suggestions.push('Ative ao menos um tamanho para evitar entrada sem preco ou sem opcao no builder.');
  if (activeFlavors.length === 0) suggestions.push('Vincule sabores ativos para a entrada aparecer com opcoes reais no builder.');
  if (!hasPrice) suggestions.push('Revise o preco base desta entrada para ela ficar pronta para venda.');
  if ((entryCategory?.max_flavors || 1) >= 2 && activeSizes.length <= 1) suggestions.push('Entradas com ate 2 sabores costumam performar melhor com tamanhos M e G ativos.');
  if (activeFlavors.length > 0 && !hasPremiumFlavor) suggestions.push(profile.id === 'premium' ? 'Ative premium para sustentar valor percebido e ticket medio.' : 'Considere liberar pelo menos um sabor premium para ampliar ticket medio.');
  if (!hasEdges) suggestions.push('Adicionar ao menos uma borda ajuda a transformar a entrada em oferta mais premium.');
  if (!hasExtras) suggestions.push('Adicionar extras opcionais pode aumentar conversao sem pesar no fluxo.');
  if (hasPremiumFlavor && premiumDelta > 0 && premiumDelta < 6) suggestions.push('A diferenca entre tradicional e premium pode estar baixa para destacar valor percebido.');
  if ((profile.id === 'delivery' || profile.id === 'dark-kitchen') && activeSizeCount > 3) suggestions.push('Muitos tamanhos podem deixar o delivery mais lento e confuso.');
  if (profile.id === 'neighborhood' && activeSizeCount > 2) suggestions.push('Para pizzaria de bairro, menos tamanhos costumam deixar o cardapio mais claro.');

  const optionalChecks = [
    { label: 'Borda configurada', done: hasEdges, tone: 'Opcional' },
    { label: 'Adicionais configurados', done: hasExtras, tone: 'Opcional' },
  ];

  return {
    status,
    completedEssentials,
    totalEssentials: essentialChecks.length,
    essentialChecks,
    optionalChecks,
    suggestions: suggestions.slice(0, 4),
    hasPremiumFlavor,
    activeSizeCount,
    activeFlavorCount,
    premiumDelta,
    commercialScoreValue,
    salesStrength,
    confidenceLabel,
    directFeedback,
    commercialPotential,
    upsellPotential,
    profileHint: profile.description,
  };
};

export const summarizePizzaCommercialReadiness = (readinessById, pizzas = []) => {
  const summary = pizzas.reduce((accumulator, pizza) => {
    const readiness = readinessById[String(pizza.id)];
    if (pizza?.is_active === false) {
      accumulator.inactive += 1;
      return accumulator;
    }
    if (readiness?.salesStrength === 'Forte') accumulator.strong += 1;
    else if (readiness?.salesStrength === 'Boa') accumulator.good += 1;
    else if (readiness?.salesStrength === 'Regular') accumulator.regular += 1;
    else accumulator.weak += 1;

    if (readiness?.status === 'Completa') accumulator.complete += 1;
    else if (readiness?.status === 'Quase pronta') accumulator.almost += 1;
    else accumulator.incomplete += 1;
    return accumulator;
  }, { complete: 0, almost: 0, incomplete: 0, inactive: 0, strong: 0, good: 0, regular: 0, weak: 0 });

  const activeEntries = summary.strong + summary.good + summary.regular + summary.weak;
  let level = 'REGULAR';
  if (activeEntries === 0) level = 'REGULAR';
  else if (summary.strong >= Math.max(summary.good, 1) && summary.weak === 0) level = 'FORTE';
  else if ((summary.strong + summary.good) >= (summary.regular + summary.weak)) level = 'BOM';
  else if (summary.weak > summary.strong) level = 'FRACO';

  return {
    ...summary,
    level,
  };
};
