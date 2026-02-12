import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { log } from '@/utils/logger';
import { createUserContext, isValidContext } from '@/utils/userContext';
// ✅ REMOVIDO: getPlanPermissions - Backend é a única fonte de verdade para permissões
import { useSlugContext } from '@/hooks/useSlugContext';

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

  // ✅ NOVO: Obter contexto do slug quando estiver em /s/:slug
  const { subscriberEmail: slugSubscriberEmail, inSlugContext } = useSlugContext();

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
        const planSlug = (contextData.subscriberData?.plan || 'basic').toString().toLowerCase().trim();
        // ✅ SIMPLIFICADO: Usar apenas permissões do backend (fonte única de verdade)
        // Backend já retorna permissões mescladas com o plano
        setPermissions(perms);

        // ✅ Garantir que subscriberData sempre tenha plan (minúsculo) e status
        let finalSubscriberData = contextData.subscriberData ? {
          ...contextData.subscriberData,
          plan: planSlug,
          status: contextData.subscriberData.status || 'active'
        } : null;

        // ✅ CORREÇÃO: Se estiver em contexto de slug, usar subscriberEmail do slug
        // Isso garante que os dados sejam buscados do assinante correto baseado no slug
        if (inSlugContext && slugSubscriberEmail && !contextData.user.is_master) {
          // Se o subscriberEmail do slug for diferente do usuário logado, buscar dados do assinante do slug
          if (slugSubscriberEmail.toLowerCase() !== (contextData.user.email || '').toLowerCase() &&
              slugSubscriberEmail.toLowerCase() !== (contextData.user.subscriber_email || '').toLowerCase()) {
            try {
              // Buscar dados do assinante baseado no slug
              const slugSubscriberResult = await base44.functions.invoke('checkSubscriptionStatus', {
                user_email: slugSubscriberEmail
              });
              if (slugSubscriberResult.data?.subscriber) {
                const slugSubscriber = slugSubscriberResult.data.subscriber;
                const slugPlanSlug = (slugSubscriber.plan || 'basic').toString().toLowerCase().trim();
                finalSubscriberData = {
                  ...slugSubscriber,
                  plan: slugPlanSlug,
                  status: slugSubscriber.status || 'active'
                };
                // Atualizar permissões também
                let slugPerms = slugSubscriber.permissions || {};
                if (typeof slugPerms === 'string') {
                  try {
                    slugPerms = JSON.parse(slugPerms);
                  } catch (e) {
                    slugPerms = {};
                  }
                }
                if (!slugPerms || typeof slugPerms !== 'object') slugPerms = {};
                // ✅ SIMPLIFICADO: Usar apenas permissões do backend
                setPermissions(slugPerms);
                log.permission.log('✅ [usePermission] Usando dados do assinante do slug:', slugSubscriberEmail);
              }
            } catch (e) {
              log.permission.warn('⚠️ [usePermission] Erro ao buscar dados do assinante do slug:', e);
            }
          }
        }

        setSubscriberData(finalSubscriberData);

        // ✅ Criar contexto de usuário com subscriberEmail correto (do slug se disponível)
        // Se estiver em contexto de slug, usar subscriberEmail do slug para menuContext
        let menuContextToUse = contextData.menuContext;
        if (inSlugContext && slugSubscriberEmail && !contextData.user.is_master) {
          // Sobrescrever menuContext para usar subscriberEmail do slug
          menuContextToUse = {
            type: 'subscriber',
            value: slugSubscriberEmail
          };
          log.permission.log('✅ [usePermission] Usando subscriberEmail do slug no menuContext:', slugSubscriberEmail);
        }

        const context = {
          user: contextData.user,
          menuContext: menuContextToUse,
          permissions: perms,
          isMaster: contextData.user.is_master === true,
          subscriberData: contextData.user.is_master ? null : finalSubscriberData
        };
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
            if (typeof perms === 'string') {
              try { perms = JSON.parse(perms); } catch (e) { perms = {}; }
            }
            if (!perms || typeof perms !== 'object') perms = {};
            // ✅ SIMPLIFICADO: Usar apenas permissões do backend (sem lógica de negócio no frontend)
            // Backend já retorna permissões corretas mescladas com o plano
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
      setLoading(false);
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
  }, [loadPermissions, inSlugContext, slugSubscriberEmail]);

  // ✅ isMaster baseado APENAS em user.is_master (definido ANTES das funções que o usam)
  const isMaster = user?.is_master === true;

  /**
   * Verifica se o usuário tem acesso a um módulo
   * ✅ SIMPLIFICADO: Apenas verifica permissões do backend (sem lógica de negócio)
   * Backend é a única fonte de verdade para permissões e limites
   */
  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    
    // ✅ Apenas verificar permissões explícitas do backend
    if (permissions && typeof permissions === 'object') {
      const modulePerms = permissions[module];
      if (Array.isArray(modulePerms) && modulePerms.length > 0) return true;
    }
    
    // ✅ Sem fallback por plano - backend já retorna permissões corretas
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
