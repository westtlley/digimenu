/**
 * Presets de permissões por plano - Formato para /user/context
 * Sincronizado com src/components/permissions/PlanPresets.jsx (frontend)
 * Usado quando plan !== 'custom' para preencher o objeto permissions retornado ao frontend.
 *
 * Regras de negócio (resumo):
 * - FREE: pratos CRUD, loja view+update; gestor e orders só VIEW; whatsapp DESATIVADO; sem clientes/histórico/financeiro/pagamentos/gráficos.
 * - BASIC: gestor e orders VIEW+UPDATE; tema, histórico, clientes; payments VIEW+UPDATE, financial VIEW, 2FA VIEW+UPDATE.
 * - PRO: BASIC + marketing (cupons/promoções) e entregas (zonas) CRUD; estoque, afiliados, colaboradores CRUD; LGPD/2FA; gráficos; gestor/orders CRUD.
 * - ULTRA: PRO + PDV, Caixa, Impressora, Comandas (close/history), Mesas CRUD.
 */

const PLAN_PRESETS_PERMISSIONS = {
  free: {
    dashboard: ['view'],
    pdv: [],
    gestor_pedidos: ['view'],
    caixa: [],
    whatsapp: [],
    dishes: ['view', 'create', 'update', 'delete'],
    pizza_config: [],
    delivery_zones: [],
    coupons: [],
    promotions: [],
    theme: [],
    store: ['view', 'update'],
    payments: [],
    graficos: [],
    orders: ['view'],
    history: [],
    clients: [],
    financial: [],
    printer: [],
    mais: [],
    comandas: []
  },
  basic: {
    dashboard: ['view'],
    pdv: [],
    gestor_pedidos: ['view', 'update'],
    caixa: [],
    whatsapp: ['view'],
    dishes: ['view', 'create', 'update', 'delete'],
    pizza_config: [],
    delivery_zones: [],
    coupons: [],
    promotions: [],
    theme: ['view', 'update'],
    store: ['view', 'update'],
    payments: ['view', 'update'],
    graficos: [],
    orders: ['view', 'update'],
    history: ['view'],
    clients: ['view'],
    financial: ['view'],
    printer: [],
    mais: ['view'],
    comandas: [],
    inventory: [],
    affiliates: [],
    lgpd: [],
    '2fa': ['view', 'update'],
    cozinha: [],
    garcom: [],
    colaboradores: []
  },
  pro: {
    dashboard: ['view'],
    pdv: [],
    gestor_pedidos: ['view', 'create', 'update', 'delete'],
    caixa: [],
    whatsapp: ['view'],
    dishes: ['view', 'create', 'update', 'delete'],
    pizza_config: ['view', 'create', 'update', 'delete'],
    delivery_zones: ['view', 'create', 'update', 'delete'],
    coupons: ['view', 'create', 'update', 'delete'],
    promotions: ['view', 'create', 'update', 'delete'],
    theme: ['view', 'update'],
    store: ['view', 'update'],
    payments: ['view', 'update'],
    graficos: ['view'],
    orders: ['view', 'create', 'update', 'delete'],
    history: ['view'],
    clients: ['view', 'create', 'update', 'delete'],
    financial: ['view'],
    printer: [],
    mais: ['view'],
    comandas: [],
    inventory: ['view', 'create', 'update', 'delete'],
    affiliates: ['view', 'create', 'update', 'delete'],
    lgpd: ['view', 'update'],
    '2fa': ['view', 'update'],
    cozinha: ['view'],
    garcom: ['view'],
    colaboradores: ['view', 'create', 'update', 'delete']
  },
  ultra: {
    dashboard: ['view'],
    pdv: ['view', 'create', 'update'],
    gestor_pedidos: ['view', 'create', 'update', 'delete'],
    caixa: ['view', 'create', 'update'],
    whatsapp: ['view'],
    dishes: ['view', 'create', 'update', 'delete'],
    pizza_config: ['view', 'create', 'update', 'delete'],
    delivery_zones: ['view', 'create', 'update', 'delete'],
    coupons: ['view', 'create', 'update', 'delete'],
    promotions: ['view', 'create', 'update', 'delete'],
    theme: ['view', 'update'],
    store: ['view', 'update'],
    payments: ['view', 'update'],
    graficos: ['view'],
    orders: ['view', 'create', 'update', 'delete'],
    history: ['view'],
    clients: ['view', 'create', 'update', 'delete'],
    financial: ['view'],
    printer: ['view', 'update'],
    mais: ['view'],
    comandas: ['view', 'create', 'update', 'close', 'history'],
    inventory: ['view', 'create', 'update', 'delete'],
    affiliates: ['view', 'create', 'update', 'delete'],
    lgpd: ['view', 'update'],
    '2fa': ['view', 'update'],
    tables: ['view', 'create', 'update', 'delete'],
    garcom: ['view'],
    cozinha: ['view'],
    colaboradores: ['view', 'create', 'update', 'delete']
  }
};

// premium = ultra (compatibilidade)
PLAN_PRESETS_PERMISSIONS.premium = PLAN_PRESETS_PERMISSIONS.ultra;

/**
 * Retorna as permissões para /user/context conforme o plano.
 * Se plan === 'custom', retorna null (caller deve usar subscriber.permissions).
 */
function getPermissionsForPlan(plan) {
  if (!plan || plan === 'custom') return null;
  const key = String(plan).toLowerCase().trim();
  return PLAN_PRESETS_PERMISSIONS[key] || PLAN_PRESETS_PERMISSIONS.basic;
}

export { getPermissionsForPlan, PLAN_PRESETS_PERMISSIONS };
