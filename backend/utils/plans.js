/**
 * Sistema de Planos e Permissões - DigiMenu
 * 
 * Define os planos disponíveis e suas permissões
 */

export const PLANS = {
  BASIC: 'basic',
  PRO: 'pro',
  ULTRA: 'ultra',
  ADMIN: 'admin',
  CUSTOM: 'custom' // Plano personalizado com permissões customizadas
};

// Preços dos planos (mensais em R$)
export const PLAN_PRICES = {
  basic: { monthly: 39.90, yearly: 399.00 },
  pro: { monthly: 79.90, yearly: 799.00 },
  ultra: { monthly: 149.90, yearly: 1499.00 }
};

/**
 * Permissões do Plano BÁSICO - R$ 39,90/mês
 * "Comece a vender online hoje"
 */
const BASIC_PERMISSIONS = {
    // Cardápio Digital
    menu_digital: true,
    menu_view: true,
    menu_create: true,
    menu_edit: true,
    menu_delete: true,
    categories_unlimited: true,
    products_limit: 100, // Limite de 100 produtos
    
    // Dashboard Básico
    dashboard_view: true,
    dashboard_basic: true,
    
    // Loja/Restaurante/Pizzaria
    restaurant_create: true,
    restaurant_edit: true,
    restaurant_view: true,
    restaurant_customize: true, // Cores, logo, banner
    
    // Gestor de Pedidos Simplificado
    orders_view: true,
    orders_create: true,
    orders_update: true,
    orders_accept_reject: true,
    orders_notify: true,
    orders_history_days: 30, // Histórico de 30 dias
    orders_delete: false,
    
    // Comanda Automática WhatsApp
    whatsapp_auto: true,
    whatsapp_notifications: true,
    
    // Limites
    users_limit: 1, // Apenas 1 usuário
    orders_per_day: 50,
    
    // Features Avançadas - NÃO INCLUÍDAS
    team_management: false,
    delivery_app: false,
    orders_advanced: false,
    delivery_zones: false,
    coupons: false,
    promotions: false,
    upsell: false,
    reports_detailed: false,
    pdv: false,
    cash_control: false,
    comandas_presencial: false,
    waiter_app: false,
    kitchen_display: false,
    fiscal_integration: false,
    api_webhooks: false,
    
    // Admin - NÃO INCLUÍDO
    admin_users: false,
    admin_subscribers: false,
    admin_master: false
  };

/**
 * Permissões do Plano PRO - R$ 79,90/mês
 * "Expanda suas entregas e cresça"
 */
const PRO_PERMISSIONS = {
    // Tudo do Básico (com upgrades)
    ...BASIC_PERMISSIONS,
    products_limit: 500, // Upgrade: 500 produtos
    orders_history_days: 365, // Upgrade: Histórico de 1 ano
    users_limit: 5, // Upgrade: Até 5 usuários
    orders_per_day: 200, // Upgrade: 200 pedidos/dia
    
    // Gestor de Pedidos Avançado
    orders_advanced: true,
    orders_advanced_view: true,
    orders_advanced_filters: true,
    orders_advanced_export: true,
    orders_delete: true,
    
    // Equipe & Entregas
    team_management: true,
    team_roles: true, // Entregador, Cozinha, Atendente
    delivery_app: true, // App próprio para entregadores
    delivery_zones: true, // Configurar áreas de entrega
    delivery_tracking: true, // Rastreamento em tempo real
    delivery_optimization: true, // Sugestão de rotas
    
    // Marketing & Vendas
    coupons: true,
    coupons_create: true,
    coupons_usage_limited: true,
    promotions: true,
    promotions_scheduled: true,
    upsell: true, // Sugestões de produtos
    
    // Relatórios & Analytics
    reports_detailed: true,
    reports_sales: true,
    reports_products: true,
    reports_export: true,
    
    // Customização Avançada
    restaurant_customize_advanced: true,
    branding_custom: true,
    
    // Ainda NÃO INCLUÍDAS (ficam no Ultra)
    pdv: false,
    cash_control: false,
    comandas_presencial: false,
    waiter_app: false,
    kitchen_display: false,
    fiscal_integration: false,
    api_webhooks: false,
    multi_location: false,
    
    // Admin - NÃO INCLUÍDO
    admin_users: false,
    admin_subscribers: false,
    admin_master: false
  };

/**
 * Permissões do Plano ULTRA - R$ 149,90/mês
 * "Gestão completa: online, presencial e fiscal"
 */
const ULTRA_PERMISSIONS = {
    // Tudo do Pro (com upgrades)
    ...PRO_PERMISSIONS,
    products_limit: -1, // Ilimitado
    orders_history_days: -1, // Ilimitado
    users_limit: 20, // Upgrade: Até 20 usuários
    orders_per_day: -1, // Ilimitado
    
    // PDV (Ponto de Venda) Completo
    pdv: true,
    pdv_view: true,
    pdv_create: true,
    pdv_sales: true,
    pdv_quick_sale: true,
    pdv_split_payment: true,
    pdv_reports: true,
    
    // Controle de Caixa
    cash_control: true,
    cash_control_open: true,
    cash_control_close: true,
    cash_control_deposit: true,
    cash_control_withdrawal: true,
    cash_control_reports: true,
    cash_control_history: true,
    
    // Comandas Presenciais
    comandas_presencial: true,
    comandas_create: true,
    comandas_edit: true,
    comandas_close: true,
    comandas_split: true, // Dividir conta
    comandas_transfer: true, // Transferir items
    
    // App Garçom
    waiter_app: true,
    waiter_orders: true,
    waiter_table_management: true,
    
    // Display Cozinha (KDS)
    kitchen_display: true,
    kitchen_orders: true,
    kitchen_priority: true,
    
    // Integrações Fiscais
    fiscal_integration: true,
    nfce_emission: true,
    sat_emission: true,
    
    // API & Webhooks
    api_webhooks: true,
    api_access: true,
    webhooks_custom: true,
    
    // Multi-localização
    multi_location: true,
    locations_limit: 5,
    
    // Analytics Avançado
    analytics_advanced: true,
    analytics_realtime: true,
    analytics_predictive: true,
    exports_advanced: true,
    
    // Suporte Prioritário
    support_priority: true,
    support_phone: true,
    support_whatsapp: true,
    
    // Admin própria conta
    admin_users: true, // Pode gerenciar usuários da própria conta
    admin_settings: true, // Pode alterar configurações da própria conta
    admin_subscribers: false, // Não pode gerenciar outros assinantes
    admin_master: false // NUNCA tem acesso master
  };

/**
 * Permissões do plano Admin (Master)
 */
const ADMIN_PERMISSIONS = {
    // Acesso total - todas as permissões
    ...ULTRA_PERMISSIONS,
    
    // Funções Admin Master
    admin_users: true,
    admin_subscribers: true,
    admin_subscribers_view: true,
    admin_subscribers_edit: true,
    admin_subscribers_delete: true,
    admin_settings: true,
    admin_master: true,
    admin_all_data: true,
    admin_system_config: true,
    admin_financial: true,
    admin_reports: true,
    
    // Sem limites
    products_limit: -1,
    orders_history_days: -1,
    users_limit: -1,
    orders_per_day: -1,
    locations_limit: -1
  };

/**
 * Permissões por plano (exportado)
 */
export const PLAN_PERMISSIONS = {
  [PLANS.BASIC]: BASIC_PERMISSIONS,
  [PLANS.PRO]: PRO_PERMISSIONS,
  [PLANS.ULTRA]: ULTRA_PERMISSIONS,
  [PLANS.ADMIN]: ADMIN_PERMISSIONS
};

/**
 * Verifica se um plano tem uma permissão específica
 */
export function hasPermission(plan, permission) {
  if (!plan || !PLAN_PERMISSIONS[plan]) {
    return false;
  }
  
  const permissions = PLAN_PERMISSIONS[plan];
  return permissions[permission] === true;
}

/**
 * Verifica se um plano tem acesso a um recurso
 */
export function hasAccess(plan, resource) {
  if (!plan || !PLAN_PERMISSIONS[plan]) {
    return false;
  }
  
  const permissions = PLAN_PERMISSIONS[plan];
  
  // Verificar permissão direta
  if (permissions[resource] === true) {
    return true;
  }
  
  // Verificar permissões relacionadas
  const resourceMap = {
    'menu': 'menu_digital',
    'dashboard': 'dashboard_view',
    'restaurant': 'restaurant_view',
    'orders': 'orders_simple_view',
    'orders-advanced': 'orders_advanced',
    'pdv': 'pdv',
    'cash': 'cash_control',
    'reports': 'reports_advanced',
    'admin': 'admin_master'
  };
  
  const mappedPermission = resourceMap[resource];
  if (mappedPermission) {
    return permissions[mappedPermission] === true;
  }
  
  return false;
}

/**
 * Obtém todas as permissões de um plano
 */
export function getPlanPermissions(plan) {
  if (!plan || !PLAN_PERMISSIONS[plan]) {
    return {};
  }
  
  return PLAN_PERMISSIONS[plan];
}

/**
 * Lista todos os planos disponíveis
 */
export function getAvailablePlans() {
  return Object.values(PLANS);
}

/**
 * Obtém informações detalhadas de um plano
 */
export function getPlanInfo(plan) {
  const planInfo = {
    [PLANS.BASIC]: {
      name: 'Básico',
      tagline: 'Comece a vender online hoje',
      description: 'Perfeito para começar seu delivery',
      price_monthly: PLAN_PRICES.basic.monthly,
      price_yearly: PLAN_PRICES.basic.yearly,
      features: [
        'Cardápio digital ilimitado',
        'Até 100 produtos',
        'Pedidos via WhatsApp',
        'Gestor de pedidos básico',
        'Personalização (logo, cores)',
        'Dashboard básico',
        'Histórico 30 dias',
        'Até 50 pedidos/dia',
        '1 usuário'
      ],
      limits: {
        products: 100,
        orders_per_day: 50,
        users: 1,
        history_days: 30
      }
    },
    [PLANS.PRO]: {
      name: 'Pro',
      tagline: 'Expanda suas entregas e cresça',
      description: 'Para restaurantes em crescimento',
      price_monthly: PLAN_PRICES.pro.monthly,
      price_yearly: PLAN_PRICES.pro.yearly,
      popular: true, // Badge "Mais Popular"
      features: [
        '✅ Tudo do Básico, mais:',
        'Até 500 produtos',
        'App próprio para entregadores',
        'Zonas e taxas de entrega',
        'Rastreamento em tempo real',
        'Cupons e promoções',
        'Relatórios avançados',
        'Gestão de equipe (até 5)',
        'Histórico 1 ano',
        'Até 200 pedidos/dia',
        'Suporte prioritário'
      ],
      limits: {
        products: 500,
        orders_per_day: 200,
        users: 5,
        history_days: 365
      }
    },
    [PLANS.ULTRA]: {
      name: 'Ultra',
      tagline: 'Gestão completa: online + presencial',
      description: 'Solução completa para operações avançadas',
      price_monthly: PLAN_PRICES.ultra.monthly,
      price_yearly: PLAN_PRICES.ultra.yearly,
      features: [
        '✅ Tudo do Pro, mais:',
        'Produtos ilimitados',
        'PDV completo',
        'Controle de caixa',
        'Comandas presenciais',
        'App garçom',
        'Display cozinha (KDS)',
        'Emissão NFC-e / SAT',
        'API & Webhooks',
        'Até 5 localizações',
        'Analytics preditivo',
        'Pedidos ilimitados',
        'Até 20 usuários',
        'Suporte VIP (telefone + WhatsApp)'
      ],
      limits: {
        products: -1, // Ilimitado
        orders_per_day: -1, // Ilimitado
        users: 20,
        history_days: -1, // Ilimitado
        locations: 5
      }
    },
    [PLANS.ADMIN]: {
      name: 'Admin Master',
      tagline: 'Acesso total ao sistema',
      description: 'Apenas para administradores',
      price_monthly: 0,
      price_yearly: 0,
      features: [
        'Todas as funcionalidades',
        'Gerenciamento de assinantes',
        'Configurações do sistema',
        'Acesso a todos os dados',
        'Relatórios financeiros',
        'Sem limites'
      ],
      limits: {
        products: -1,
        orders_per_day: -1,
        users: -1,
        history_days: -1,
        locations: -1
      }
    }
  };
  
  return planInfo[plan] || null;
}
