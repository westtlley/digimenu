/**
 * Templates de planos pré-configurados
 * Facilita criação rápida de assinantes para casos comuns
 */

export const PLAN_TEMPLATES = {
  restaurant_basic: {
    name: 'Restaurante Básico',
    description: 'Plano ideal para restaurantes que precisam gerenciar cardápio e pedidos',
    permissions: {
      dashboard: ['view'],
      dishes: ['view', 'create', 'update'],
      orders: ['view', 'create', 'update'],
      history: ['view'],
      clients: ['view'],
      store: ['view', 'update'],
      theme: ['view', 'update']
    }
  },
  delivery_pro: {
    name: 'Delivery Profissional',
    description: 'Plano completo para empresas de delivery com gestão de entregas',
    permissions: {
      dashboard: ['view'],
      dishes: ['view', 'create', 'update', 'delete'],
      delivery_zones: ['view', 'create', 'update', 'delete'],
      gestor_pedidos: ['view', 'create', 'update', 'delete'],
      orders: ['view', 'create', 'update'],
      history: ['view'],
      clients: ['view', 'create', 'update'],
      graficos: ['view'],
      store: ['view', 'update'],
      theme: ['view', 'update'],
      payments: ['view']
    }
  },
  pizzaria_premium: {
    name: 'Pizzaria Premium',
    description: 'Plano completo para pizzarias com sistema de montagem de pizzas',
    permissions: {
      dashboard: ['view'],
      dishes: ['view', 'create', 'update', 'delete'],
      pdv: ['view', 'create', 'update'],
      gestor_pedidos: ['view', 'create', 'update', 'delete'],
      orders: ['view', 'create', 'update', 'delete'],
      history: ['view'],
      clients: ['view', 'create', 'update', 'delete'],
      coupons: ['view', 'create', 'update', 'delete'],
      promotions: ['view', 'create', 'update', 'delete'],
      graficos: ['view'],
      financial: ['view'],
      store: ['view', 'update'],
      theme: ['view', 'update'],
      payments: ['view']
    }
  },
  cafe_basic: {
    name: 'Cafeteria Básico',
    description: 'Plano simples para cafeterias e lanchonetes',
    permissions: {
      dashboard: ['view'],
      dishes: ['view', 'create', 'update'],
      orders: ['view', 'create'],
      history: ['view'],
      store: ['view', 'update']
    }
  },
  marketplace_full: {
    name: 'Marketplace Completo',
    description: 'Acesso total para marketplaces e e-commerces',
    permissions: {
      dashboard: ['view'],
      pdv: ['view', 'create', 'update'],
      gestor_pedidos: ['view', 'create', 'update', 'delete'],
      caixa: ['view', 'create', 'update'],
      dishes: ['view', 'create', 'update', 'delete'],
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
      whatsapp: ['view'],
      mais: ['view']
    }
  }
};

/**
 * Obter template por ID
 */
export function getPlanTemplate(templateId) {
  return PLAN_TEMPLATES[templateId] || null;
}

/**
 * Listar todos os templates
 */
export function getAllPlanTemplates() {
  return Object.entries(PLAN_TEMPLATES).map(([id, template]) => ({
    id,
    ...template
  }));
}
