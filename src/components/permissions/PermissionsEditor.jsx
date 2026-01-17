import React, { useState, useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { validatePermissions } from './PlanPresets';

const MODULE_GROUPS = [
  {
    id: 'ferramentas',
    name: '🏠 Ferramentas Principais',
    modules: [
      { id: 'dashboard', name: 'Home', actions: ['view'] },
      { id: 'pdv', name: 'Ponto de Venda (PDV)', actions: ['view', 'create', 'update'] },
      { id: 'gestor_pedidos', name: 'Gestor de Pedidos', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'caixa', name: 'Caixa', actions: ['view', 'create', 'update'] },
      { id: 'whatsapp', name: 'WhatsApp', actions: ['view'] }
    ]
  },
  {
    id: 'cardapio',
    name: '🍽️ Cardápio Digital',
    modules: [
      { id: 'dishes', name: 'Cardápio (Pratos)', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'delivery_zones', name: 'Zonas de Entrega', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'coupons', name: 'Cupons', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'promotions', name: 'Promoções', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'theme', name: 'Cores/Tema', actions: ['view', 'update'] },
      { id: 'store', name: 'Loja', actions: ['view', 'update'] },
      { id: 'payments', name: 'Pagamentos', actions: ['view', 'update'] }
    ]
  },
  {
    id: 'graficos_section',
    name: '📊 Gráficos',
    modules: [
      { id: 'graficos', name: 'Gráficos', actions: ['view'] }
    ]
  },
  {
    id: 'gestao',
    name: '📋 Gestão',
    modules: [
      { id: 'orders', name: 'Pedidos', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'history', name: 'Histórico', actions: ['view'] },
      { id: 'clients', name: 'Clientes', actions: ['view', 'create', 'update', 'delete'] },
      { id: 'financial', name: 'Financeiro', actions: ['view'] },
      { id: 'printer', name: 'Impressora', actions: ['view', 'update'] }
    ]
  },
  {
    id: 'mais_funcoes',
    name: '➕ Mais Funções',
    modules: [
      { id: 'mais', name: 'Mais Funções', actions: ['view'] }
    ]
  }
];

const ACTION_LABELS = {
  view: 'Ver',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir'
};

export default function PermissionsEditor({ permissions, onChange, selectedPlan = 'basic', onPlanChange }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['ferramentas', 'cardapio', 'gestao']));
  const [expandedModules, setExpandedModules] = useState(new Set(['dashboard', 'dishes', 'orders']));
  
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      try {
        const allPlans = await base44.entities.Plan.list('order');
        const activePlans = allPlans.filter(p => p.is_active !== false);
        console.log('📋 Planos carregados:', activePlans.length, activePlans);
        
        // Se não houver planos cadastrados, retornar planos padrão
        if (activePlans.length === 0) {
          console.log('⚠️ Nenhum plano cadastrado, usando planos padrão');
          return [
            { id: 'basic', slug: 'basic', name: 'Básico', description: 'Plano básico com funcionalidades essenciais', is_active: true, order: 1 },
            { id: 'pro', slug: 'pro', name: 'Profissional', description: 'Plano profissional com recursos avançados', is_active: true, order: 2 },
            { id: 'premium', slug: 'premium', name: 'Premium', description: 'Plano premium com todos os recursos', is_active: true, order: 3 }
          ];
        }
        
        return activePlans;
      } catch (error) {
        console.error('❌ Erro ao carregar planos:', error);
        // Retornar planos padrão em caso de erro
        return [
          { id: 'basic', slug: 'basic', name: 'Básico', description: 'Plano básico com funcionalidades essenciais', is_active: true, order: 1 },
          { id: 'pro', slug: 'pro', name: 'Profissional', description: 'Plano profissional com recursos avançados', is_active: true, order: 2 },
          { id: 'premium', slug: 'premium', name: 'Premium', description: 'Plano premium com todos os recursos', is_active: true, order: 3 }
        ];
      }
    }
  });
  
  // Garantir que selectedPlan tenha um valor válido
  const currentPlan = selectedPlan || 'basic';
  
  // Encontrar o plano selecionado para exibir o nome
  const selectedPlanData = useMemo(() => {
    return plans.find(p => p.slug === currentPlan);
  }, [plans, currentPlan]);
  
  const displayName = useMemo(() => {
    if (currentPlan === 'custom') return 'Personalizado';
    return selectedPlanData?.name || 'Básico';
  }, [currentPlan, selectedPlanData]);
  
  console.log('🎨 PermissionsEditor render - currentPlan:', currentPlan);
  console.log('🎨 PermissionsEditor render - selectedPlanData:', selectedPlanData);
  console.log('🎨 PermissionsEditor render - displayName:', displayName);
  
  const warnings = validatePermissions(permissions);

  const handlePlanChange = (planSlug) => {
    console.log('🎨 PermissionsEditor - Plano selecionado:', planSlug);
    console.log('🎨 PermissionsEditor - selectedPlan atual:', selectedPlan);
    console.log('🎨 PermissionsEditor - Planos disponíveis:', plans.map(p => p.slug));
    
    // PRIMEIRO: Chama onPlanChange para atualizar o estado do pai
    if (onPlanChange) {
      onPlanChange(planSlug);
    }

    // SEGUNDO: Atualiza as permissões se não for custom
    if (planSlug !== 'custom') {
      const selectedPlanData = plans.find(p => p.slug === planSlug);
      console.log('🎨 PermissionsEditor - Plano encontrado:', selectedPlanData?.name);
      if (selectedPlanData && selectedPlanData.permissions) {
        onChange(selectedPlanData.permissions);
      }
    }
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

  const hasPermission = (moduleId, action) => {
    return permissions?.[moduleId]?.includes(action) || false;
  };

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Plano */}
      <div>
        <Label className="mb-2 block">Plano de Assinatura</Label>
        <Select value={currentPlan} onValueChange={handlePlanChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um plano">
              {displayName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {plansLoading ? (
              <div className="p-2 text-sm text-gray-500">Carregando planos...</div>
            ) : plans.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">Nenhum plano disponível</div>
            ) : (
              <>
                {plans.map((plan) => (
                  <SelectItem key={plan.id || plan.slug} value={plan.slug}>
                    <div className="flex flex-col">
                      <span className="font-medium">{plan.name}</span>
                      {plan.description && (
                        <span className="text-xs text-gray-500">{plan.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex flex-col">
                    <span className="font-medium">Personalizado</span>
                    <span className="text-xs text-gray-500">Configure manualmente as permissões</span>
                  </div>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          {currentPlan === 'custom' 
            ? '🎨 Plano Personalizado: Configure as permissões manualmente abaixo'
            : 'Selecione um plano para preencher automaticamente as permissões. Você pode ajustar manualmente depois.'
          }
        </p>
      </div>

      {/* Avisos de Conflito */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">⚠️ Atenção: Possíveis problemas operacionais</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          As permissões controlam exatamente o que o assinante pode fazer no sistema. 
          Ações não autorizadas não aparecerão na interface ou ficarão desabilitadas.
        </AlertDescription>
      </Alert>

      {/* Lista de Módulos Agrupados */}
      <div className="space-y-2">
        <Label>Permissões por Módulo</Label>
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
                                    checked={hasPermission(module.id, action)}
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