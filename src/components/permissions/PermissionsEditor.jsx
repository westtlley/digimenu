import React, { useState, useMemo } from 'react';
import { useMemoizedPermissions } from './useMemoizedPermissions';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Info, Loader2, UtensilsCrossed, Pizza, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { validatePermissions, getPlanPermissions } from './PlanPresets';
import PermissionPreview from '../admin/subscribers/PermissionPreview';
import PlanComparison from '../admin/subscribers/PlanComparison';

// Alinhado às categorias do menu (GESTÃO, OPERAÇÃO, CARDÁPIO, GARÇOM, DELIVERY, SISTEMA, MARKETING)
const MODULE_GROUPS = [
  {
    id: 'gestao',
    name: '📊 GESTÃO',
    modules: [
      { id: 'dashboard', name: 'Dashboard', actions: ['view'] },
      { id: 'financial', name: 'Financeiro', actions: ['view'] },
      { id: 'caixa', name: 'Caixa', actions: ['view', 'create', 'update'] },
      { id: 'pdv', name: 'PDV', actions: ['view', 'create', 'update'] },
      { id: 'gestor_pedidos', name: 'Gestor de Pedidos', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  {
    id: 'operacao',
    name: '🧾 OPERAÇÃO',
    modules: [
      { id: 'orders', name: 'Gestor de Pedidos (lista)', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'history', name: 'Histórico de Pedidos', actions: ['view'] },
      { id: 'clients', name: 'Clientes', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'whatsapp', name: 'WhatsApp', actions: ['view'] },
      { id: 'inventory', name: 'Gestão de Estoque', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  {
    id: 'cardapio',
    name: '🍽️ CARDÁPIO',
    modules: [
      { id: 'dishes', name: 'Restaurante (pratos e bebidas)', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'pizza_config', name: 'Pizzaria', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'theme', name: 'Tema', actions: ['view', 'update'] },
      { id: 'store', name: 'Loja', actions: ['view', 'update'] }
    ]
  },
  {
    id: 'garcom',
    name: '🧑‍🍳 GARÇOM',
    modules: [
      { id: 'garcom', name: 'App do Garçom', actions: ['view'] },
      { id: 'comandas', name: 'Comandas', actions: ['view', 'create', 'update', 'close', 'history'] },
      { id: 'tables', name: 'Mesas e QR Code', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  {
    id: 'delivery',
    name: '🚚 DELIVERY',
    modules: [
      { id: 'delivery_zones', name: 'Zonas de Entrega', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'payments', name: 'Métodos de Pagamento', actions: ['view', 'update'] }
    ]
  },
  {
    id: 'sistema',
    name: '⚙️ SISTEMA',
    modules: [
      { id: 'printer', name: 'Impressora', actions: ['view', 'update'] },
      { id: 'colaboradores', name: 'Colaboradores', actions: ['view', 'create', 'update', 'delete'] },
      { id: '2fa', name: 'Autenticação 2FA', actions: ['view', 'update'] },
      { id: 'lgpd', name: 'Conformidade LGPD', actions: ['view', 'update'] }
    ]
  },
  {
    id: 'marketing',
    name: '💰 MARKETING',
    modules: [
      { id: 'promotions', name: 'Promoções', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'coupons', name: 'Cupons', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'affiliates', name: 'Programa de Afiliados', actions: ['view', 'create', 'update', 'delete'] }
    ]
  },
  { id: 'graficos_section', name: 'Gráficos', modules: [{ id: 'graficos', name: 'Gráficos', actions: ['view'] }] },
  { id: 'mais_funcoes', name: 'Mais Funções', modules: [{ id: 'mais', name: 'Mais Funções', actions: ['view'] }] }
];

const ACTION_LABELS = {
  view: 'Ver',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir'
};

export default function PermissionsEditor({ permissions, onChange, selectedPlan = 'basic', onPlanChange }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['gestao', 'operacao', 'cardapio', 'garcom', 'delivery', 'sistema', 'marketing']));
  const [expandedModules, setExpandedModules] = useState(new Set(['dashboard', 'dishes', 'orders', 'inventory', 'garcom', 'tables', 'affiliates']));
  const [showComparison, setShowComparison] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // ✅ Planos padrão sempre disponíveis (não dependem do banco)
  const defaultPlans = [
    { id: 'free', slug: 'free', name: 'Gratuito', description: 'Plano gratuito para uso pessoal', is_active: true, order: 0 },
    { id: 'basic', slug: 'basic', name: 'Básico', description: 'Plano básico com funcionalidades essenciais', is_active: true, order: 1 },
    { id: 'pro', slug: 'pro', name: 'Pro', description: 'Plano profissional com recursos avançados', is_active: true, order: 2 },
    { id: 'ultra', slug: 'ultra', name: 'Ultra', description: 'Plano ultra com todos os recursos', is_active: true, order: 3 }
  ];

  const { data: plans = defaultPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      try {
        const allPlans = await base44.entities.Plan.list('order');
        const activePlans = Array.isArray(allPlans) ? allPlans.filter(p => p.is_active !== false) : [];
        console.log('📋 Planos carregados do banco:', activePlans.length, activePlans);
        
        // Se não houver planos cadastrados, retornar planos padrão
        if (activePlans.length === 0) {
          console.log('⚠️ Nenhum plano no banco, retornando planos padrão (PermissionsEditor)');
          return defaultPlans;
        }
        
        return activePlans;
      } catch (error) {
        console.error('❌ Erro ao carregar planos:', error);
        // ✅ Sempre retornar planos padrão em caso de erro (não quebrar o componente)
        return defaultPlans;
      }
    },
    // ✅ Sempre usar planos padrão como fallback
    initialData: defaultPlans,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Garantir que selectedPlan tenha um valor válido
  const currentPlan = selectedPlan || 'basic';
  
  // Encontrar o plano selecionado para exibir o nome
  const selectedPlanData = useMemo(() => {
    const found = plans.find(p => p.slug === currentPlan);
    console.log('🔍 PermissionsEditor - selectedPlanData:', found, 'currentPlan:', currentPlan, 'plans:', plans);
    return found;
  }, [plans, currentPlan]);
  
  const displayName = useMemo(() => {
    if (currentPlan === 'custom') return 'Personalizado';
    const name = selectedPlanData?.name || currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
    console.log('🏷️ PermissionsEditor - displayName:', name, 'currentPlan:', currentPlan);
    return name;
  }, [currentPlan, selectedPlanData]);

  const warnings = validatePermissions(permissions);
  const basicCardapioMode = (permissions?.pizza_config?.length || 0) > 0 ? 'pizzas' : 'pratos';

  const handlePlanChange = (planSlug) => {
    if (onPlanChange) onPlanChange(planSlug);
    if (planSlug === 'custom') return;
    const base = { ...(getPlanPermissions(planSlug) || {}), store: ['view', 'update'] };
    onChange(base);
  };

  const handleBasicCardapioChoice = (mode) => {
    const next = { ...permissions, store: permissions?.store?.length ? permissions.store : ['view', 'update'] };
    if (mode === 'pizzas') {
      next.pizza_config = ['view', 'create', 'update', 'delete'];
      next.dishes = []; // Básico Pizzaria: só pizzas, sem módulo pratos
    } else {
      next.pizza_config = [];
      next.dishes = ['view', 'create', 'update', 'delete']; // Básico Restaurante: só pratos
    }
    onChange(next);
  };


  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const toggleGroupPermissions = (groupId) => {
    const group = MODULE_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    const allModulesInGroup = group.modules.map(m => m.id);
    const hasAnyActive = allModulesInGroup.some(moduleId => {
      return permissions?.[moduleId]?.length > 0;
    });

    const newPermissions = { ...permissions };

    if (hasAnyActive) {
      // Desativa todos os módulos do grupo
      allModulesInGroup.forEach(moduleId => {
        newPermissions[moduleId] = [];
      });
    } else {
      // Ativa todos os módulos do grupo com todas as ações
      group.modules.forEach(module => {
        newPermissions[module.id] = [...module.actions];
      });
    }

    onChange(newPermissions);
  };

  const toggleModuleAll = (moduleId, actions) => {
    const currentPerms = permissions?.[moduleId] || [];
    const hasAll = actions.every(action => currentPerms.includes(action));

    const newPermissions = { ...permissions };
    if (hasAll) {
      newPermissions[moduleId] = [];
    } else {
      newPermissions[moduleId] = [...actions];
    }

    onChange(newPermissions);
  };

  const handlePermissionChange = (moduleId, action, checked) => {
    const newPermissions = { ...permissions };
    const modulePerms = newPermissions[moduleId] || [];
    
    if (checked) {
      if (!modulePerms.includes(action)) {
        newPermissions[moduleId] = [...modulePerms, action];
      }
    } else {
      newPermissions[moduleId] = modulePerms.filter(a => a !== action);
    }
    
    onChange(newPermissions);
  };

  // Usar cache memoizado de permissões
  const permissionCache = useMemoizedPermissions(permissions);
  
  const hasPermission = (moduleId, action) => {
    return permissionCache.hasPermission(moduleId, action);
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1) Plano */}
      <div>
        <Label className="mb-1 block">Plano</Label>
        <Select key={currentPlan} value={currentPlan} onValueChange={handlePlanChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um plano">{displayName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(plans || []).map((p) => (
              <SelectItem key={p.id || p.slug} value={p.slug}>{p.name}</SelectItem>
            ))}
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2) No Básico: Restaurante (pratos) ou Pizzaria (pizzas) - escolha obrigatória */}
      {currentPlan === 'basic' && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Label className="text-sm font-medium">Plano Básico: tipo de estabelecimento</Label>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            No plano Básico o cardápio é apenas <strong>Restaurante (pratos)</strong> ou <strong>Pizzaria (pizzas)</strong>. Nos planos Pro e Ultra os dois estão disponíveis.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={basicCardapioMode === 'pratos' ? 'default' : 'outline'}
              className={basicCardapioMode === 'pratos' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              onClick={() => handleBasicCardapioChoice('pratos')}
            >
              <UtensilsCrossed className="w-4 h-4 mr-1" /> Restaurante (pratos)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={basicCardapioMode === 'pizzas' ? 'default' : 'outline'}
              className={basicCardapioMode === 'pizzas' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              onClick={() => handleBasicCardapioChoice('pizzas')}
            >
              <Pizza className="w-4 h-4 mr-1" /> Pizzaria (pizzas)
            </Button>
          </div>
        </div>
      )}

      {/* 3) Avisos */}
      {warnings.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm">
              {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 4) Módulos por grupo (objetivo) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Módulos</Label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Resumo
            </Button>
            {plans.length >= 2 && currentPlan !== 'custom' && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowComparison(!showComparison)}>
                {showComparison ? 'Ocultar' : 'Comparar'} planos
              </Button>
            )}
          </div>
        </div>
        {showPreview && (
          <div className="mb-3 p-3 rounded-lg border bg-gray-50">
            <PermissionPreview permissions={permissions} />
          </div>
        )}
        {showComparison && plans.length >= 2 && currentPlan !== 'custom' && (
          <div className="mb-3">
            <PlanComparison
              plans={plans.map(p => ({ ...p, permissions: p.permissions || getPlanPermissions(p.slug) }))}
              currentPlan={currentPlan}
              onSelectPlan={handlePlanChange}
            />
          </div>
        )}
        <div className="border rounded-lg divide-y">
          {MODULE_GROUPS.map(group => {
            const isGroupExpanded = expandedGroups.has(group.id);
            
            return (
              <div key={group.id} className="p-3">
                {/* Header do Grupo */}
                <div className="flex items-center justify-between mb-2">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => toggleGroupExpansion(group.id)}
                  >
                    <span className={`transform transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`}>
                      ▸
                    </span>
                    <span className="font-bold text-base">{group.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupPermissions(group.id);
                    }}
                    className="px-3 py-1 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
                  >
                    {group.modules.some(m => permissions?.[m.id]?.length > 0) ? '🔓 Ativo' : '🔒 Inativo'}
                  </button>
                </div>

                {/* Módulos do Grupo */}
                {isGroupExpanded && (
                  <div className="ml-6 space-y-3 mt-3">
                    {group.modules.map(module => {
                      const isModuleExpanded = expandedModules.has(module.id);
                      const activePerms = permissions?.[module.id] || [];
                      
                      return (
                        <div key={module.id} className="border-l-2 border-gray-200 pl-4">
                          <div className="flex items-center justify-between">
                            <div 
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModule(module.id);
                              }}
                            >
                              <span className={`transform transition-transform ${isModuleExpanded ? 'rotate-90' : ''}`}>
                                ▸
                              </span>
                              <span className="font-medium">{module.name}</span>
                              {activePerms.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                  {activePerms.length} ativa{activePerms.length === 1 ? '' : 's'}
                                </Badge>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModuleAll(module.id, module.actions);
                              }}
                              className="px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-gray-100"
                            >
                              {activePerms.length === module.actions.length ? '🔓' : '🔒'}
                            </button>
                          </div>

                          {isModuleExpanded && (
                            <div className="mt-3 ml-6 space-y-2">
                              {module.actions.map(action => (
                                <label key={action} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                  <Checkbox
                                    checked={!!hasPermission(module.id, action)}
                                    onCheckedChange={(checked) => handlePermissionChange(module.id, action, checked)}
                                  />
                                  <span className="text-sm">{ACTION_LABELS[action]}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}