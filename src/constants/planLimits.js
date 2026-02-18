/**
 * Limites operacionais por plano (Monetização Agressiva 2.0)
 * Entitlements = limites (quanto pode usar). Não substituem permissões; são adicionais.
 * Backend é a fonte de verdade; frontend usa para UX, bloqueios e modais.
 */

/** -1 = ilimitado */
export const UNLIMITED = -1;

/**
 * Limites base por plano (agressivos para monetização)
 * effective_limits = base + addons (ex.: orders_per_month + addons.orders)
 */
export const PLAN_LIMITS = {
  free: {
    orders_per_month: 200,
    products: 20,
    collaborators: 0, // somente owner (1 usuário)
    locations: 1,
    upgradeTriggers: { orders_80_percent: true, collaborator_limit: true, feature_locked: true },
  },
  basic: {
    orders_per_month: 600,
    products: 150,
    collaborators: 2, // 1 dono + 1 no máximo, ou só 1
    locations: 1,
    upgradeTriggers: { orders_80_percent: true, collaborator_limit: true, feature_locked: true },
  },
  pro: {
    orders_per_month: 3000,
    products: 800,
    collaborators: 5,
    locations: 2,
    upgradeTriggers: { orders_80_percent: true, collaborator_limit: true, feature_locked: true },
  },
  ultra: {
    orders_per_month: UNLIMITED,
    products: UNLIMITED,
    collaborators: 20,
    locations: 5,
    upgradeTriggers: { orders_80_percent: false, collaborator_limit: false, feature_locked: false },
  },
  custom: null,
  premium: null,
};
PLAN_LIMITS.premium = PLAN_LIMITS.ultra;

export function getPlanLimits(plan) {
  const key = (plan || '').toString().toLowerCase().trim();
  if (key === 'custom' || !key) return null;
  return PLAN_LIMITS[key] || PLAN_LIMITS.basic;
}

/**
 * Add-on de volume de pedidos (soma ao limite base)
 * Valores em pedidos/mês adicionais
 */
export const ADDONS_ORDERS_OPTIONS = [
  { value: 0, label: 'Nenhum' },
  { value: 1000, label: '+1.000 pedidos/mês' },
  { value: 3000, label: '+3.000 pedidos/mês' },
  { value: 5000, label: '+5.000 pedidos/mês' },
];

/**
 * Copy exata para modal de bloqueio por tipo (templates com {PLANO}, {LIMITE}, {USADOS})
 */
export const LIMIT_BLOCK_COPY = {
  orders: {
    title: 'Você atingiu o limite de pedidos do seu plano',
    message: 'Seu plano {PLANO} inclui {LIMITE} pedidos/mês. Neste mês você já usou {USADOS}. Para continuar recebendo pedidos, faça upgrade ou adicione volume.',
    ctaPrimary: 'Fazer upgrade',
    ctaSecondary: 'Adicionar volume de pedidos',
    ctaClose: 'Fechar',
    suggestion: 'Pro libera até 3.000 pedidos/mês e equipe de 5 pessoas.',
  },
  collaborators: {
    title: 'Limite de usuários da equipe atingido',
    message: 'Seu plano {PLANO} permite até {LIMITE} colaborador(es). Para adicionar mais pessoas (cozinha, garçom, entregador), faça upgrade.',
    ctaPrimary: 'Fazer upgrade',
    ctaSecondary: null,
    ctaClose: 'Fechar',
    suggestion: 'Pro libera até 5 colaboradores.',
  },
  products: {
    title: 'Limite de produtos atingido',
    message: 'Seu plano {PLANO} permite até {LIMITE} produtos. Para cadastrar mais itens, faça upgrade.',
    ctaPrimary: 'Fazer upgrade',
    ctaSecondary: null,
    ctaClose: 'Fechar',
    suggestion: 'Pro libera até 800 produtos.',
  },
  locations: {
    title: 'Limite de unidades atingido',
    message: 'Seu plano {PLANO} permite até {LIMITE} unidade(s). Para adicionar outra unidade, faça upgrade.',
    ctaPrimary: 'Fazer upgrade',
    ctaSecondary: null,
    ctaClose: 'Fechar',
    suggestion: 'Ultra libera até 5 localizações.',
  },
};

/** Substitui placeholders na mensagem */
export function formatLimitCopy(copy, { PLANO, LIMITE, USADOS }) {
  if (!copy) return '';
  return copy
    .replace(/\{PLANO\}/g, PLANO || '')
    .replace(/\{LIMITE\}/g, String(LIMITE ?? ''))
    .replace(/\{USADOS\}/g, String(USADOS ?? ''));
}

/**
 * Copy legada (modais antigos) – mantida para compatibilidade
 */
export const PLAN_COPY = {
  limit_orders_reached: {
    title: LIMIT_BLOCK_COPY.orders.title,
    message: 'Seu plano inclui limite de pedidos/mês. Para continuar, faça upgrade ou adicione volume.',
    ctaPrimary: 'Fazer upgrade',
    ctaSecondary: 'Adicionar volume de pedidos',
    ctaClose: 'Fechar',
  },
  limit_orders_80: {
    banner: 'Você já usou 82% do seu limite de pedidos/mês. Dica: Pro libera até 3.000 pedidos/mês.',
    cta: 'Ver planos',
  },
  feature_blocked: {
    title: 'Recurso disponível no plano Pro',
    messageGeneric: 'Este recurso não está disponível no seu plano atual.',
    messageCoupon: 'Cupons e promoções ajudam a vender mais, mas não estão disponíveis no seu plano atual.',
    messagePromo: 'Promoções ajudam a vender mais, mas não estão disponíveis no seu plano atual.',
    messagePizza: 'Montagem de pizzas está disponível a partir do plano Pro.',
    messageInventory: 'Controle de estoque está disponível a partir do plano Pro.',
    messagePdv: 'PDV e operação presencial estão disponíveis no plano Ultra.',
    ctaPrimary: 'Ativar plano Pro',
    ctaSecondary: 'Ver comparação de planos',
  },
  collaborators_limit: {
    title: LIMIT_BLOCK_COPY.collaborators.title,
    message: 'Seu plano permite até 1 gerente. Para adicionar garçons, cozinha ou entregadores, faça upgrade.',
    ctaPrimary: 'Fazer upgrade',
    ctaSecondary: 'Ver planos',
  },
  upgrade_basic_to_pro: {
    title: 'Seu restaurante está crescendo.',
    points: ['Mais pedidos por mês', 'Promoções e cupons', 'Cozinha, entregadores e garçons', 'Controle real da operação'],
    cta: 'Ativar Pro agora',
  },
  upgrade_pro_to_ultra: {
    title: 'O Ultra é para quem quer operação completa.',
    message: 'PDV, mesas, comandas e equipe ilimitada, tudo no mesmo sistema.',
    cta: 'Ativar Ultra',
  },
};

export const PLAN_PRICING = {
  free: { monthly: 0, yearly: 0, yearlyLabel: null },
  basic: { monthly: 59, yearly: 566, yearlyLabel: 'Economize 2 meses pagando anual' },
  pro: { monthly: 129, yearly: 1238, yearlyLabel: 'Economize 2 meses pagando anual' },
  ultra: { monthly: 249, yearly: 2390, yearlyLabel: 'Economize 2 meses pagando anual' },
};

export const ADDONS_VOLUME = [
  { id: 'extra_1000', value: 1000, label: '+1.000 pedidos/mês', price: 49 },
  { id: 'extra_3000', value: 3000, label: '+3.000 pedidos/mês', price: 99 },
];

export const ADDON_COPY = {
  title: 'Precisa de mais pedidos sem mudar de plano?',
  subtitle: 'Adicione volume extra quando precisar.',
  cta: 'Adicionar pedidos',
};
