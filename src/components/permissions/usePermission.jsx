import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { log } from '@/utils/logger';
import { createUserContext, isValidContext } from '@/utils/userContext';
import { getPlanPermissions } from '@/components/permissions/PlanPresets';

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
  const [userContext, setUserContext] = useState(null);

  const loadPermissions = useCallback(async () => {
    try {
      log.permission.log('🔄 [usePermission] Carregando contexto do usuário...');
      
      // ✅ NOVO: Usar endpoint /api/user/context que retorna tudo pronto
      try {
        const contextData = await base44.get('/user/context', { _t: Date.now() });
        
        if (!contextData || !contextData.user) {
          log.permission.warn('⚠️ [usePermission] Contexto não retornado pelo backend');
          setPermissions({});
          setUser(null);
          setSubscriberData(null);
          setUserContext(null);
          setLoading(false);
          return;
        }

        log.permission.log('✅ [usePermission] Contexto recebido do backend:', {
          is_master: contextData.user.is_master,
          menuContext: contextData.menuContext,
          subscriberData: contextData.subscriberData,
          plan: contextData.subscriberData?.plan
        });

        setUser(contextData.user);

        let perms = contextData.permissions;
        if (typeof perms === 'string') {
          try {
            perms = JSON.parse(perms);
          } catch (e) {
            perms = {};
          }
        }
        if (!perms || typeof perms !== 'object') perms = {};
        const planSlug = contextData.subscriberData?.plan || 'basic';
        const isEmpty = Object.keys(perms).length === 0;
        if (!contextData.user.is_master && ['free', 'basic', 'pro', 'ultra'].includes(planSlug) && isEmpty) {
          perms = { ...(getPlanPermissions(planSlug) || {}), ...perms };
        }
        setPermissions(perms);

        // ✅ Garantir que subscriberData sempre tenha plan e status
        const subscriber = contextData.subscriberData ? {
          ...contextData.subscriberData,
          plan: contextData.subscriberData.plan || 'basic',
          status: contextData.subscriberData.status || 'active'
        } : null;
        setSubscriberData(subscriber);

        // ✅ Criar contexto de usuário (backend já retornou menuContext, mas criamos aqui para consistência)
        const context = createUserContext(
          contextData.user,
          contextData.subscriberData,
          perms
        );
        setUserContext(context);
        log.permission.log('✅ [usePermission] Contexto criado:', context.menuContext);
      } catch (contextError) {
        // Fallback: se o endpoint novo não existir, usar método antigo
        log.permission.warn('⚠️ [usePermission] Endpoint /user/context não disponível, usando fallback');
        
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          log.permission.warn('⚠️ [usePermission] Usuário não encontrado');
          setPermissions({});
          setUser(null);
          setSubscriberData(null);
          setUserContext(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        if (currentUser.is_master === true) {
          const perms = {};
          const subscriber = {
            email: currentUser.email,
            plan: 'master',
            status: 'active',
            permissions: {}
          };
          setPermissions(perms);
          setSubscriberData(subscriber);
          const context = createUserContext(currentUser, subscriber, perms);
          setUserContext(context);
        } else {
          const result = await base44.functions.invoke('checkSubscriptionStatus', {
            user_email: currentUser.email
          });
          if (result.data?.subscriber) {
            const subscriber = result.data.subscriber;
            let perms = subscriber.permissions || {};
            if (subscriber.plan === 'basic' && Array.isArray(perms.dishes) && perms.dishes.includes('view') && !perms.dishes.includes('create')) {
              perms = { ...perms, dishes: ['view', 'create', 'update', 'delete'] };
            }
            if (['basic', 'pro'].includes(subscriber.plan) && (!Array.isArray(perms.store) || perms.store.length === 0)) {
              perms = { ...perms, store: ['view', 'update'] };
            }
            setPermissions(perms);
            setSubscriberData(subscriber);
            const context = createUserContext(currentUser, subscriber, perms);
            setUserContext(context);
          } else {
            setPermissions({});
            setSubscriberData(null);
            setUserContext(null);
          }
        }
      }
    } catch (e) {
      log.permission.error('Error loading permissions:', e);
      setPermissions({});
      setSubscriberData(null);
      setUserContext(null);
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
    
    // Fonte da verdade: permissões do backend (respeita básico pratos/pizzaria e custom)
    if (permissions && typeof permissions === 'object') {
      const modulePerms = permissions[module];
      if (Array.isArray(modulePerms) && modulePerms.length > 0) return true;
    }
    
    // Regras por plano só para negar (ex.: colaboradores só Pro/Ultra)
    if (module === 'colaboradores') return ['pro', 'ultra'].includes(planLower);
    if (['comandas', 'tables', 'garcom'].includes(module)) return planLower === 'ultra';
    if (['affiliates', 'lgpd', '2fa', 'inventory'].includes(module)) return ['pro', 'ultra'].includes(planLower);
    
    return false;
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
    refresh,
    // ✅ Novo: contexto de usuário pronto para uso
    userContext,
    menuContext: userContext?.menuContext || null,
  };
}
