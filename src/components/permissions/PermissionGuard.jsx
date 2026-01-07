import React from 'react';
import { usePermission } from './usePermission';
import { AlertCircle } from 'lucide-react';

/**
 * Componente para proteger conteúdo baseado em permissões
 * 
 * Uso:
 * <PermissionGuard module="dishes" action="create">
 *   <Button>Adicionar Prato</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  module, 
  action, 
  children, 
  fallback = null,
  showError = false 
}) {
  const { hasPermission, loading, isMaster } = usePermission();

  if (loading) {
    return fallback;
  }

  // Master sempre tem acesso
  if (isMaster) {
    return <>{children}</>;
  }

  // Verificar permissão
  const hasAccess = hasPermission(module, action);

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>Você não tem permissão para esta ação</span>
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Componente para proteger módulos inteiros
 */
export function ModuleGuard({ 
  module, 
  children, 
  fallback = null,
  showError = false 
}) {
  const { hasModuleAccess, loading, isMaster } = usePermission();

  if (loading) {
    return fallback;
  }

  if (isMaster) {
    return <>{children}</>;
  }

  const hasAccess = hasModuleAccess(module);

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Acesso Negado</h3>
            <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
            <p className="text-sm text-gray-400 mt-2">Entre em contato com o administrador master.</p>
          </div>
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
}

/**
 * HOC para proteger componentes inteiros
 */
export function withPermission(Component, module, action) {
  return function ProtectedComponent(props) {
    return (
      <PermissionGuard module={module} action={action} showError>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * HOC para proteger módulos
 */
export function withModuleAccess(Component, module) {
  return function ProtectedModule(props) {
    return (
      <ModuleGuard module={module} showError>
        <Component {...props} />
      </ModuleGuard>
    );
  };
}