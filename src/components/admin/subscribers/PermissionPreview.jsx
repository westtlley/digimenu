import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  pdv: 'PDV',
  gestor_pedidos: 'Gestor de Pedidos',
  caixa: 'Caixa',
  whatsapp: 'WhatsApp',
  dishes: 'Cardápio',
  delivery_zones: 'Zonas de Entrega',
  coupons: 'Cupons',
  promotions: 'Promoções',
  theme: 'Tema',
  store: 'Loja',
  payments: 'Pagamentos',
  graficos: 'Gráficos',
  orders: 'Pedidos',
  history: 'Histórico',
  clients: 'Clientes',
  financial: 'Financeiro',
  printer: 'Impressora',
  mais: 'Mais Funções'
};

const ACTION_LABELS = {
  view: 'Ver',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir'
};

/**
 * Preview visual das permissões do assinante
 * Mostra o que o assinante verá no sistema
 */
export default function PermissionPreview({ permissions = {} }) {
  // Calcular estatísticas
  const stats = {
    totalModules: Object.keys(permissions).length,
    activeModules: Object.keys(permissions).filter(
      key => permissions[key] && Array.isArray(permissions[key]) && permissions[key].length > 0
    ).length,
    totalPermissions: Object.values(permissions).reduce(
      (sum, actions) => sum + (Array.isArray(actions) ? actions.length : 0), 0
    ),
    viewOnly: Object.entries(permissions).filter(
      ([_, actions]) => Array.isArray(actions) && actions.length === 1 && actions.includes('view')
    ).length
  };

  // Módulos ativos (com permissões)
  const activeModules = Object.entries(permissions)
    .filter(([_, actions]) => Array.isArray(actions) && actions.length > 0)
    .map(([moduleId, actions]) => ({
      moduleId,
      moduleName: MODULE_LABELS[moduleId] || moduleId,
      actions: actions || []
    }));

  // Módulos inativos (sem permissões)
  const inactiveModules = Object.entries(permissions)
    .filter(([_, actions]) => !Array.isArray(actions) || actions.length === 0)
    .map(([moduleId]) => ({
      moduleId,
      moduleName: MODULE_LABELS[moduleId] || moduleId
    }));

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          📊 Resumo das Permissões
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.activeModules}</div>
            <div className="text-xs text-gray-600">Módulos Ativos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalPermissions}</div>
            <div className="text-xs text-gray-600">Permissões</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.viewOnly}</div>
            <div className="text-xs text-gray-600">Somente Leitura</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.totalModules - stats.activeModules}</div>
            <div className="text-xs text-gray-600">Bloqueados</div>
          </div>
        </div>
      </Card>

      {/* Módulos Ativos */}
      {activeModules.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Módulos Acessíveis ({activeModules.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {activeModules.map(({ moduleId, moduleName, actions }) => (
              <div
                key={moduleId}
                className="p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-900">{moduleName}</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                    {actions.length} permissão{actions.length > 1 ? 'ões' : ''}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {actions.map(action => (
                    <Badge
                      key={action}
                      variant="secondary"
                      className="text-xs bg-green-200 text-green-800"
                    >
                      {ACTION_LABELS[action] || action}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Módulos Bloqueados */}
      {inactiveModules.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            Módulos Bloqueados ({inactiveModules.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {inactiveModules.map(({ moduleId, moduleName }) => (
              <Badge
                key={moduleId}
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 text-xs"
              >
                {moduleName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Avisos */}
      {stats.totalPermissions === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            ⚠️ Nenhuma permissão configurada! O assinante não terá acesso a nenhum módulo.
          </AlertDescription>
        </Alert>
      )}

      {stats.viewOnly === stats.activeModules && stats.activeModules > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            ℹ️ Todas as permissões são somente leitura. O assinante poderá visualizar mas não modificar dados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
