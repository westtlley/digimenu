import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook para verificar permissões do usuário atual
 * Retorna as permissões e funções para verificar acesso a módulos/ações
 * 
 * ⚠️ CRÍTICO: permissions SEMPRE é um objeto {}, nunca string
 */
export function usePermission() {
  // ✅ Estado inicial sempre objeto
  const [permissions, setPermissions] = useState({});
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

      // ✅ CORREÇÃO DEFINITIVA: NUNCA mais usar 'FULL_ACCESS'
      if (currentUser.is_master === true) {
        console.log('✅ [usePermission] Usuário é master - concedendo acesso total');
        setPermissions({}); // sempre objeto
        setSubscriberData({
          email: currentUser.email,
          plan: 'master', // ✅ CORRIGIDO: era 'premium'
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

      console.log('📋 [usePermission] Resultado checkSubscriptionStatus:', result);

      // Verificar se encontrou assinante (mesmo que inativo, ainda tem dados)
      if (result.data?.subscriber) {
        const subscriber = result.data.subscriber;
        console.log('✅ [usePermission] Assinante encontrado:', {
          email: subscriber.email,
          name: subscriber.name,
          status: subscriber.status,
          plan: subscriber.plan
        });
        let perms = subscriber.permissions || {};
        if (subscriber.plan === 'basic' && Array.isArray(perms.dishes) && perms.dishes.includes('view') && !perms.dishes.includes('create')) {
          perms = { ...perms, dishes: ['view', 'create', 'update', 'delete'] };
        }
        if (['basic', 'pro', 'premium'].includes(subscriber.plan) && (!Array.isArray(perms.store) || perms.store.length === 0)) {
          perms = { ...perms, store: ['view', 'update'] };
        }
        setPermissions(perms);
        setSubscriberData(subscriber);
      } else {
        console.warn('⚠️ [usePermission] Nenhum assinante encontrado para:', currentUser.email);
        setPermissions({});
        setSubscriberData(null);
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
    const t = setTimeout(() => {
      setLoading((prev) => (prev ? false : prev));
    }, 12000);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, []);

  // ✅ isMaster baseado APENAS em user.is_master (definido ANTES das funções que o usam)
  const isMaster = user?.is_master === true;

  /**
   * Verifica se o usuário tem acesso a um módulo
   * ✅ CORREÇÃO: Blindado com Array.isArray
   * colaboradores: apenas planos Premium e Pro
   */
  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    if (module === 'colaboradores') return ['premium', 'pro'].includes((subscriberData?.plan || '').toLowerCase());
    if (!permissions || typeof permissions !== 'object') return false;
    
    const modulePerms = permissions[module];
    return Array.isArray(modulePerms) && modulePerms.length > 0;
  };

  /**
   * Verifica se o usuário tem uma ação específica em um módulo
   * ✅ CORREÇÃO: Blindado com Array.isArray
   */
  const hasPermission = (module, action) => {
    if (isMaster) return true;
    if (!permissions || typeof permissions !== 'object') return false;
    
    const modulePerms = permissions[module];
    return Array.isArray(modulePerms) && modulePerms.includes(action);
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
