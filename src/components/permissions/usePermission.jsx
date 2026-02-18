import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { log } from '@/utils/logger';
import { createUserContext, isValidContext } from '@/utils/userContext';
import { mergeWithPlanPreset } from '@/components/permissions/PlanPresets';
import { useSlugContext } from '@/hooks/useSlugContext';

// Deduplicar chamada a /user/context: vários usePermission() montando ao mesmo tempo compartilham a mesma requisição
let inFlightGetContext = null;

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
    let contextData = null;
    if (inFlightGetContext) {
      try {
        contextData = await inFlightGetContext;
      } finally {
        inFlightGetContext = null;
      }
    } else {
      const maxRetries = 3;
      inFlightGetContext = (async () => {
        let data = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            data = await base44.get('/user/context', { _t: Date.now() });
            break;
          } catch (err) {
            const isNetworkError = err?.message?.includes('CONNECTION') || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError') || err?.name === 'TypeError';
            if (isNetworkError && attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, 2000));
            } else {
              throw err;
            }
          }
        }
        return data;
      })();
      try {
        contextData = await inFlightGetContext;
      } finally {
        inFlightGetContext = null;
      }
    }

    try {
      try {
        if (!contextData || !contextData.user) {
          log.permission.warn('⚠️ [usePermission] Contexto não retornado pelo backend');
          setPermissions({});
          setUser(null);
          setSubscriberData(null);
          setUserContext(null);
          setLoading(false);
          return;
        }

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
        // Fallback: assinantes antigos sem permissões explícitas recebem preset do plano (só para exibição; backend continua fonte de verdade)
        if (contextData.user?.is_master !== true && Object.keys(perms).length === 0 && planSlug && planSlug !== 'custom') {
          perms = mergeWithPlanPreset(perms, planSlug);
        }
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
                if (Object.keys(slugPerms).length === 0 && slugPlanSlug && slugPlanSlug !== 'custom') {
                  slugPerms = mergeWithPlanPreset(slugPerms, slugPlanSlug);
                }
                setPermissions(slugPerms);
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
        }

        const context = {
          user: contextData.user,
          menuContext: menuContextToUse,
          permissions: perms,
          isMaster: contextData.user.is_master === true,
          subscriberData: contextData.user.is_master ? null : finalSubscriberData
        };
        setUserContext(context);
        
        // ✅ NOVO: Salvar contexto no sessionStorage para acesso em outros serviços
        try {
          sessionStorage.setItem('userContext', JSON.stringify({
            subscriberData: finalSubscriberData,
            menuContext: menuContextToUse
          }));
        } catch (e) {
          // Ignorar erro de sessionStorage
        }
        
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
          let result;
          try {
            result = await base44.functions.invoke('checkSubscriptionStatus', {
              user_email: currentUser.email
            });
          } catch (fnErr) {
            log.permission.warn('⚠️ [usePermission] checkSubscriptionStatus falhou, usando contexto mínimo:', fnErr?.message);
            result = null;
          }
          if (result?.data?.subscriber) {
            const subscriber = result.data.subscriber;
            let perms = subscriber.permissions || {};
            if (typeof perms === 'string') {
              try { perms = JSON.parse(perms); } catch (e) { perms = {}; }
            }
            if (!perms || typeof perms !== 'object') perms = {};
            const planSlug = (subscriber.plan || 'basic').toString().toLowerCase().trim();
            if (Object.keys(perms).length === 0 && planSlug && planSlug !== 'custom') {
              perms = mergeWithPlanPreset(perms, planSlug);
            }
            setPermissions(perms);
            setSubscriberData(subscriber);
            const context = createUserContext(currentUser, subscriber, perms);
            setUserContext(context);
          } else {
            const subscriberEmail = currentUser.subscriber_email || currentUser.email;
            const minimalSubscriber = {
              email: subscriberEmail,
              plan: 'basic',
              status: 'active',
              permissions: {}
            };
            setPermissions({});
            setSubscriberData(minimalSubscriber);
            const context = createUserContext(currentUser, minimalSubscriber, {});
            setUserContext(context);
            log.permission.warn('⚠️ [usePermission] Usando contexto mínimo (checkSubscriptionStatus indisponível)');
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
  }, [inSlugContext, slugSubscriberEmail]);

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
   * ✅ SIMPLIFICADO: Apenas verifica permissões do backend (sem lógica de negócio)
   * Backend é a única fonte de verdade para permissões e limites
   */
  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    
    // Gerente: cargo de confiança, acesso a todas as ferramentas (igual ao assinante)
    const roles = user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : [];
    const isGerente = roles.includes('gerente');
    if (isGerente) return true;
    
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

  // ✅ Estabilizar menuContext para evitar rerenders desnecessários nas queries
  const stableMenuContext = useMemo(() => {
    return userContext?.menuContext || null;
  }, [userContext?.menuContext?.type, userContext?.menuContext?.value]);

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
    menuContext: stableMenuContext,
  };
}
