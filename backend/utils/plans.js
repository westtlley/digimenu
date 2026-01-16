/**
 * Sistema de Planos e Permissões - DigiMenu
 * 
 * Define os planos disponíveis e suas permissões
 */

export const PLANS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  PRO: 'pro',
  ADMIN: 'admin'
};

/**
 * Permissões base do plano Básico
 */
const BASIC_PERMISSIONS = {
    // Cardápio Digital
    menu_digital: true,
    menu_view: true,
    menu_create: true,
    menu_edit: true,
    menu_delete: true,
    
    // Dashboard
    dashboard_view: true,
    
    // Criação de Cardápio/Restaurante/Pizzaria
    restaurant_create: true,
    restaurant_edit: true,
    restaurant_view: true,
    
    // Gestor de Pedidos Simplificado
    orders_simple_view: true,
    orders_simple_create: true,
    orders_simple_update: true,
    orders_simple_delete: false, // Apenas visualização e criação
    
    // Comanda Automática WhatsApp
    whatsapp_auto_enable: true,
    whatsapp_auto_disable: true, // Pode desativar
    
    // Funcionalidades avançadas - NÃO INCLUÍDAS
    orders_advanced: false,
    pdv: false,
    cash_control: false,
    reports_advanced: false,
    integrations_advanced: false,
    
    // Admin - NÃO INCLUÍDO
    admin_users: false,
    admin_subscribers: false,
    admin_settings: false,
    admin_master: false
  },
  
  [PLANS.PREMIUM]: {
    // Tudo do Básico
    ...BASIC_PERMISSIONS,
    
    // Gestor de Pedidos Avançado
    orders_advanced: true,
    orders_advanced_view: true,
    orders_advanced_create: true,
    orders_advanced_update: true,
    orders_advanced_delete: true,
    orders_advanced_reports: true,
    orders_advanced_analytics: true,
    
    // PDV (Ponto de Venda)
    pdv: true,
    pdv_view: true,
    pdv_create: true,
    pdv_update: true,
    pdv_delete: true,
    pdv_reports: true,
    
    // Controle de Caixa
    cash_control: true,
    cash_control_view: true,
    cash_control_open: true,
    cash_control_close: true,
    cash_control_reports: true,
    cash_control_history: true,
    
    // Relatórios Avançados
    reports_advanced: true,
    
    // Admin - AINDA NÃO INCLUÍDO
    admin_users: false,
    admin_subscribers: false,
    admin_settings: false,
    admin_master: false
  };

/**
 * Permissões do plano Pro
 */
const PRO_PERMISSIONS = {
    // Tudo do Premium
    ...PREMIUM_PERMISSIONS,
    
    // Integrações Avançadas
    integrations_advanced: true,
    integrations_api: true,
    integrations_webhooks: true,
    integrations_custom: true,
    
    // Relatórios e Analytics Avançados
    reports_advanced: true,
    analytics_advanced: true,
    exports_advanced: true,
    
    // Configurações Avançadas
    settings_advanced: true,
    branding_advanced: true,
    customization_advanced: true,
    
    // Admin - AINDA NÃO INCLUÍDO (exceto funções master)
    admin_users: true, // Pode gerenciar usuários da própria conta
    admin_subscribers: false, // Não pode gerenciar outros assinantes
    admin_settings: true, // Pode alterar configurações da própria conta
    admin_master: false // NUNCA tem acesso master
  };

/**
 * Permissões do plano Admin
 */
const ADMIN_PERMISSIONS = {
    // Acesso total - todas as permissões
    ...PRO_PERMISSIONS,
    
    // Funções Admin Master
    admin_users: true,
    admin_subscribers: true,
    admin_settings: true,
    admin_master: true,
    admin_all_data: true,
    admin_system_config: true
  }
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
      description: 'Ideal para começar com cardápio digital',
      features: [
        'Cardápio digital',
        'Dashboard',
        'Criação de cardápio/restaurante/pizzaria',
        'Gestor de pedidos simplificado',
        'Comanda automática WhatsApp (pode desativar)'
      ],
      price: 'R$ 0,00' // Ajustar conforme necessário
    },
    [PLANS.PREMIUM]: {
      name: 'Premium',
      description: 'Para restaurantes que precisam de mais controle',
      features: [
        'Tudo do plano Básico',
        'Gestor de pedidos avançado',
        'PDV (Ponto de Venda)',
        'Controle de caixa',
        'Relatórios avançados'
      ],
      price: 'R$ 0,00' // Ajustar conforme necessário
    },
    [PLANS.PRO]: {
      name: 'Pro',
      description: 'Solução completa para restaurantes profissionais',
      features: [
        'Tudo do plano Premium',
        'Integrações avançadas',
        'API e Webhooks',
        'Analytics avançado',
        'Customização completa',
        'Gerenciamento de usuários'
      ],
      price: 'R$ 0,00' // Ajustar conforme necessário
    },
    [PLANS.ADMIN]: {
      name: 'Admin',
      description: 'Acesso total ao sistema',
      features: [
        'Todas as funcionalidades',
        'Gerenciamento de assinantes',
        'Configurações do sistema',
        'Acesso a todos os dados'
      ],
      price: 'N/A'
    }
  };
  
  return planInfo[plan] || null;
}
