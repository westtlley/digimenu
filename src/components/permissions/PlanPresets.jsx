/**
 * Presets de planos de assinatura
 * Define as permissões padrão para cada nível de plano
 */

export const PLAN_PRESETS = {
  custom: {
    name: 'Personalizado',
    description: 'Configuração manual de permissões e limites',
    permissions: {}
  },
  expired: {
    name: 'Expirado',
    description: 'Assinatura expirada - sem acesso',
    permissions: {}
  },
  basic: {
    name: 'Básico',
    description: 'Visualização de pedidos e cardápio básico',
    permissions: {
      // Ferramentas Principais
      dashboard: ['view'],
      pdv: [],
      gestor_pedidos: [],
      caixa: [],
      whatsapp: [],
      
      // Cardápio Digital (create/update/delete para o assinante gerenciar seu cardápio)
      dishes: ['view', 'create', 'update', 'delete'],
      delivery_zones: [],
      coupons: [],
      promotions: [],
      theme: [],
      store: [],
      payments: [],
      
      // Gráficos
      graficos: [],
      
      // Gestão
      orders: ['view'],
      history: [],
      clients: [],
      financial: [],
      printer: [],
      
      // Mais Funções
      mais: []
    }
  },
  
  pro: {
    name: 'Pro',
    description: 'Gestão completa de cardápio e entregas',
    permissions: {
      // Ferramentas Principais
      dashboard: ['view'],
      pdv: ['view', 'create', 'update'],
      gestor_pedidos: ['view', 'create', 'update', 'delete'],
      caixa: ['view', 'create', 'update'],
      whatsapp: ['view'],
      
      // Cardápio Digital
      dishes: ['view', 'create', 'update', 'delete'],
      delivery_zones: ['view', 'create', 'update', 'delete'],
      coupons: ['view', 'create', 'update', 'delete'],
      promotions: ['view', 'create', 'update', 'delete'],
      theme: ['view', 'update'],
      store: ['view', 'update'],
      payments: ['view'],
      
      // Gráficos
      graficos: ['view'],
      
      // Gestão
      orders: ['view', 'update'],
      history: ['view'],
      clients: ['view'],
      financial: ['view'],
      printer: [],
      
      // Mais Funções
      mais: ['view']
    }
  },
  
  premium: {
    name: 'Premium',
    description: 'Acesso total ao sistema',
    permissions: {
      // Ferramentas Principais
      dashboard: ['view'],
      pdv: ['view', 'create', 'update'],
      gestor_pedidos: ['view', 'create', 'update', 'delete'],
      caixa: ['view', 'create', 'update'],
      whatsapp: ['view'],
      
      // Cardápio Digital
      dishes: ['view', 'create', 'update', 'delete'],
      delivery_zones: ['view', 'create', 'update', 'delete'],
      coupons: ['view', 'create', 'update', 'delete'],
      promotions: ['view', 'create', 'update', 'delete'],
      theme: ['view', 'update'],
      store: ['view', 'update'],
      payments: ['view', 'update'],
      
      // Gráficos
      graficos: ['view'],
      
      // Gestão
      orders: ['view', 'create', 'update', 'delete'],
      history: ['view'],
      clients: ['view', 'create', 'update', 'delete'],
      financial: ['view'],
      printer: ['view', 'update'],
      
      // Mais Funções
      mais: ['view']
    }
  }
};

/**
 * Retorna as permissões de um plano
 */
export function getPlanPermissions(plan) {
  // Para plano custom, retornar vazio - será configurado manualmente
  if (plan === 'custom') {
    return PLAN_PRESETS.custom.permissions;
  }
  return PLAN_PRESETS[plan]?.permissions || PLAN_PRESETS.basic.permissions;
}

/**
 * Valida se um conjunto de permissões pode causar problemas operacionais
 */
export function validatePermissions(permissions) {
  const warnings = [];

  // Se pode ver pratos mas não pode criar/editar
  if (permissions.dishes?.includes('view') && 
      !permissions.dishes?.includes('create') && 
      !permissions.dishes?.includes('update')) {
    warnings.push({
      module: 'dishes',
      message: 'Pode visualizar pratos mas não pode criar ou editar. Isso limitará muito as operações.'
    });
  }

  // Se pode ver pedidos mas não pode atualizar
  if (permissions.orders?.includes('view') && !permissions.orders?.includes('update')) {
    warnings.push({
      module: 'orders',
      message: 'Pode visualizar pedidos mas não pode atualizá-los. Não será possível aceitar ou processar pedidos.'
    });
  }

  // Se pode criar complementos mas não categorias
  if (permissions.complements?.includes('create') && 
      !permissions.categories?.includes('create')) {
    warnings.push({
      module: 'complements',
      message: 'Pode criar complementos mas não categorias. Isso pode causar confusão na organização.'
    });
  }

  return warnings;
}

/**
 * Compara permissões antes e depois para log de auditoria
 */
export function comparePermissions(before, after) {
  const changes = [];
  const allModules = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);

  allModules.forEach(module => {
    const beforeActions = before?.[module] || [];
    const afterActions = after?.[module] || [];

    const added = afterActions.filter(a => !beforeActions.includes(a));
    const removed = beforeActions.filter(a => !afterActions.includes(a));

    if (added.length > 0) {
      changes.push({
        module,
        type: 'added',
        actions: added
      });
    }

    if (removed.length > 0) {
      changes.push({
        module,
        type: 'removed',
        actions: removed
      });
    }
  });

  return changes;
}