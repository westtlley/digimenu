import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook para verificar permissões do usuário atual
 * Retorna as permissões e funções para verificar acesso a módulos/ações
 */
export function usePermission() {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [subscriberData, setSubscriberData] = useState(null);

const loadPermissions = async () => {
  try {
    console.log('🔄 [usePermission] Carregando permissões...');
    const currentUser = await base44.auth.me();
    console.log('👤 [usePermission] Usuário recebido:', currentUser);
    console.log('👤 [usePermission] is_master:', currentUser?.is_master);

    if (!currentUser) {
      console.log('⚠️ [usePermission] Usuário não encontrado');
      setPermissions({});
      setUser(null);
      setSubscriberData(null);
      setLoading(false);
      return;
    }
    
    console.log('👤 [usePermission] Usuário recebido:', currentUser);
    console.log('👤 [usePermission] is_master:', currentUser?.is_master);

    setUser(currentUser);

    if (currentUser.is_master === true) {
      console.log('✅ [usePermission] Usuário é master - concedendo FULL_ACCESS');
      setPermissions('FULL_ACCESS');
      setSubscriberData({
        email: currentUser.email,
        plan: 'premium',
        status: 'active',
        permissions: {}
      });
      setLoading(false);
      return;
    }
    
    console.log('📋 [usePermission] Usuário não é master - verificando assinatura...');

    const result = await base44.functions.invoke('checkSubscriptionStatus', {
      user_email: currentUser.email
    });

    // Verificar se encontrou assinante ativo
    if (result.data?.status === 'success' && result.data?.subscriber) {
      const subscriber = result.data.subscriber;
      setPermissions(subscriber.permissions || {});
      setSubscriberData(subscriber);
    } else {
      setPermissions({});
      setSubscriberData(result.data?.subscriber || null);
    }

  } catch (e) {
    console.error('Error loading permissions:', e);
    setPermissions({});
    setSubscriberData(null);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadPermissions();
  const interval = setInterval(loadPermissions, 30000);
  return () => clearInterval(interval);
}, []);

  /**
   * Verifica se o usuário tem acesso a um módulo
   */
  const hasModuleAccess = (module) => {
    if (permissions === 'FULL_ACCESS') return true;
    if (!permissions) return false;
    
    const modulePerms = permissions[module];
    return modulePerms && modulePerms.length > 0;
  };

  /**
   * Verifica se o usuário tem uma ação específica em um módulo
   */
  const hasPermission = (module, action) => {
    if (permissions === 'FULL_ACCESS') return true;
    if (!permissions) return false;
    
    const modulePerms = permissions[module];
    if (!modulePerms) return false;
    
    return modulePerms.includes(action);
  };

  /**
   * Verifica se o usuário pode criar em um módulo
   */
  const canCreate = (module) => hasPermission(module, 'create');

  /**
   * Verifica se o usuário pode editar em um módulo
   */
  const canUpdate = (module) => hasPermission(module, 'update');

  /**
   * Verifica se o usuário pode excluir em um módulo
   */
  const canDelete = (module) => hasPermission(module, 'delete');

  /**
   * Verifica se o usuário pode visualizar um módulo
   */
  const canView = (module) => hasPermission(module, 'view');

  /**
   * Força recarregamento das permissões
   */
  const refresh = () => {
    setLoading(true);
    loadPermissions();
  };

  // isMaster deve ser baseado no user.is_master, não apenas nas permissões
  const isMaster = user?.is_master === true || permissions === 'FULL_ACCESS';
  
  return {
    permissions,
    loading,
    user,
    subscriberData,
    isMaster,
    hasModuleAccess,
    hasPermission,
    canCreate,
    canUpdate,
    canDelete,
    canView,
    refresh
  };
}