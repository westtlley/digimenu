/**
 * Presets de permissões por plano - Formato para /user/context
 * Deve estar sincronizado com src/components/permissions/PlanPresets.jsx
 * Usado quando plan !== 'custom' para garantir que as limitações do plano sejam aplicadas
 */

const PLAN_PRESETS_PERMISSIONS = {
  free: {
    dashboard: ['view'],
    pdv: [],
    gestor_pedidos: ['view'],
    caixa: [],
    whatsapp: ['view'],
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
    payments: [],
    graficos: [],
    orders: ['view', 'update'],
    history: ['view'],
    clients: ['view'],
    financial: [],
    printer: [],
    mais: ['view'],
    comandas: []
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
    '2fa': ['view', 'update']
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
    garcom: ['view']
  }
};

// premium = ultra (compatibilidade)
PLAN_PRESETS_PERMISSIONS.premium = PLAN_PRESETS_PERMISSIONS.ultra;

/**
 * Retorna as permissões para /user/context conforme o plano.
 * Se plan === 'custom', retorna null (caller deve usar subscriber.permissions).
 * Caso contrário, retorna as permissões do preset do plano.
 */
export function getPermissionsForPlan(plan) {
  if (!plan || plan === 'custom') return null;
  const key = String(plan).toLowerCase().trim();
  return PLAN_PRESETS_PERMISSIONS[key] || PLAN_PRESETS_PERMISSIONS.basic;
}
