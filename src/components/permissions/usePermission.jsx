import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { logger } from '@/utils/logger';

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

  const loadPermissions = useCallback(async () => {
    try {
      logger.log('🔄 [usePermission] Carregando permissões...');
      const currentUser = await base44.auth.me();
      logger.log('👤 [usePermission] Usuário recebido, is_master:', currentUser?.is_master);

      if (!currentUser) {
        logger.log('⚠️ [usePermission] Usuário não encontrado');
        setPermissions({});
        setUser(null);
        setSubscriberData(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // ✅ CORREÇÃO DEFINITIVA: NUNCA mais usar 'FULL_ACCESS'
      if (currentUser.is_master === true) {
        logger.log('✅ [usePermission] Usuário é master - concedendo acesso total');
        setPermissions({}); // sempre objeto
        setSubscriberData({
          email: currentUser.email,
          plan: 'master',
          status: 'active',
          permissions: {}
        });
        setLoading(false);
        return;
      }

      logger.log('📋 [usePermission] Usuário não é master - verificando assinatura...');

      const result = await base44.functions.invoke('checkSubscriptionStatus', {
        user_email: currentUser.email
      });

      logger.log('📋 [usePermission] Resultado checkSubscriptionStatus');

      // Verificar se encontrou assinante (mesmo que inativo, ainda tem dados)
      if (result.data?.subscriber) {
        const subscriber = result.data.subscriber;
        logger.log('✅ [usePermission] Assinante encontrado:', subscriber?.email, subscriber?.plan);
        let perms = subscriber.permissions || {};
        if (subscriber.plan === 'basic' && Array.isArray(perms.dishes) && perms.dishes.includes('view') && !perms.dishes.includes('create')) {
          perms = { ...perms, dishes: ['view', 'create', 'update', 'delete'] };
        }
        if (['basic', 'pro'].includes(subscriber.plan) && (!Array.isArray(perms.store) || perms.store.length === 0)) {
          perms = { ...perms, store: ['view', 'update'] };
        }
        setPermissions(perms);
        setSubscriberData(subscriber);
      } else {
        logger.warn('⚠️ [usePermission] Nenhum assinante encontrado para:', currentUser.email);
        setPermissions({});
        setSubscriberData(null);
      }
    } catch (e) {
      logger.error('Error loading permissions:', e);
      setPermissions({});
      setSubscriberData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
    // 5 min para reduzir requisições; recarregar também ao ganhar foco na janela
    const interval = setInterval(loadPermissions, 5 * 60 * 1000);
    const onFocus = () => loadPermissions();
    window.addEventListener('focus', onFocus);
    const t = setTimeout(() => {
      setLoading((prev) => (prev ? false : prev));
    }, 12000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      clearTimeout(t);
    };
  }, [loadPermissions]);

  // ✅ isMaster baseado APENAS em user.is_master (definido ANTES das funções que o usam)
  const isMaster = user?.is_master === true;

  /**
   * Verifica se o usuário tem acesso a um módulo
   * ✅ CORREÇÃO: Blindado com Array.isArray
   * colaboradores: apenas planos Pro e Ultra
   */
  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    
    const planLower = (subscriberData?.plan || '').toLowerCase();
    
    // Módulos especiais que dependem do plano
    if (module === 'colaboradores') {
      return ['pro', 'ultra'].includes(planLower);
    }
    
    // Módulos de Garçom - apenas Ultra
    if (['comandas', 'tables', 'garcom'].includes(module)) {
      return planLower === 'ultra';
    }
    
    // Módulos avançados - Pro e Ultra
    if (['affiliates', 'lgpd', '2fa', 'inventory'].includes(module)) {
      return ['pro', 'ultra'].includes(planLower);
    }
    
    // Módulos básicos - todos os planos pagos
    if (['dashboard', 'dishes', 'orders', 'clients', 'whatsapp', 'store', 'theme', 'printer'].includes(module)) {
      return ['basic', 'pro', 'ultra'].includes(planLower);
    }
    
    // Verificar permissões do backend
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
