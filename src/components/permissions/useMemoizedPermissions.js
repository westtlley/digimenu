import { useMemo } from 'react';

/**
 * Hook para cachear cálculos de permissões
 * Evita recalcular permissões a cada render
 */
export function useMemoizedPermissions(permissions) {
  const permissionCache = useMemo(() => {
    if (!permissions || typeof permissions !== 'object') {
      return {
        totalModules: 0,
        activeModules: 0,
        totalPermissions: 0,
        permissionsByModule: {},
        hasPermission: () => false
      };
    }

    const permissionsByModule = {};
    let totalPermissions = 0;
    let activeModules = 0;

    // Calcular estatísticas por módulo
    Object.entries(permissions).forEach(([moduleId, actions]) => {
      if (Array.isArray(actions) && actions.length > 0) {
        activeModules++;
        totalPermissions += actions.length;
        permissionsByModule[moduleId] = {
          count: actions.length,
          actions: actions
        };
      } else {
        permissionsByModule[moduleId] = {
          count: 0,
          actions: []
        };
      }
    });

    // Função memoizada para verificar permissão
    const hasPermission = (moduleId, action) => {
      const modulePerms = permissionsByModule[moduleId];
      return modulePerms && modulePerms.actions.includes(action);
    };

    return {
      totalModules: Object.keys(permissions).length,
      activeModules,
      totalPermissions,
      permissionsByModule,
      hasPermission
    };
  }, [permissions]);

  return permissionCache;
}
