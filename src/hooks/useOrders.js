/**
 * Hook useOrders - Busca pedidos com contexto automático
 * Usa menuContext para buscar pedidos no contexto correto.
 * Fallback: asSubFromParent (do PainelAssinante) ou subscriberData/user quando menuContext atrasa.
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { safeFetch, ensureArray } from '@/utils/safeFetch';
import { usePermission } from '@/components/permissions/usePermission';
import { log } from '@/utils/logger';

/**
 * Hook para buscar pedidos
 *
 * @param {Object} options - Opções da query
 * @param {string} options.orderBy - Ordenação (padrão: '-created_date')
 * @param {Object} options.filters - Filtros adicionais
 * @param {string} [options.asSubFromParent] - E-mail do assinante passado pelo pai (ex.: PainelAssinante). Quando definido, a query é habilitada imediatamente, sem depender de permissionLoading/menuContext.
 * @returns {Object} Resultado da query
 */
export function useOrders(options = {}) {
  const { menuContext, loading: permissionLoading, user, subscriberData, isMaster } = usePermission();
  const { orderBy = '-created_date', filters = {}, asSubFromParent, ...queryOptions } = options;

  // Escopo: priorizar asSubFromParent (vindo do PainelAssinante), depois menuContext, depois fallback assinante
  const fromPermission =
    (menuContext?.type === 'subscriber' && menuContext?.value) ||
    (!isMaster && (subscriberData?.email || user?.subscriber_email || user?.email));
  const effectiveSubscriberRaw = asSubFromParent ?? fromPermission;
  const effectiveSubscriberNorm = effectiveSubscriberRaw ? String(effectiveSubscriberRaw).trim().toLowerCase() : null;

  // Habilitar quando: (pai passou asSub) OU (permissões carregadas e temos contexto)
  const enabledByParent = asSubFromParent != null && asSubFromParent !== '';
  const enabledByPermission = !permissionLoading && (!!menuContext || !!fromPermission);
  const isEnabled = (queryOptions.enabled !== false) && (enabledByParent || enabledByPermission);

  // Key estável: não incluir menuContext (evita re-fetch e flash vazio quando menuContext atualiza)
  const stableKey = ['orders', effectiveSubscriberNorm ?? 'none', orderBy, JSON.stringify(filters || {})];

  return useQuery({
    queryKey: stableKey,
    queryFn: async () => {
      try {
        const opts = {};
        if (effectiveSubscriberNorm) {
          opts.as_subscriber = effectiveSubscriberNorm;
        }

        const promise = base44.entities.Order.list(orderBy, opts);
        const result = await safeFetch(promise, 10000, 'Timeout ao buscar pedidos');

        let orders = ensureArray(result);

        // Aplicar filtros locais se necessário
        if (Object.keys(filters).length > 0) {
          orders = orders.filter(order => {
            return Object.entries(filters).every(([key, value]) => {
              if (value === undefined || value === null) return true;
              return order[key] === value;
            });
          });
        }

        // Garantir ordem: mais recente sempre no topo (created_date / created_at)
        const getOrderDate = (o) => new Date(o?.created_date || o?.created_at || 0).getTime();
        orders.sort((a, b) => getOrderDate(b) - getOrderDate(a));

        return orders;
      } catch (error) {
        log.menu.error('❌ [useOrders] Erro ao buscar pedidos:', error);
        throw error;
      }
    },
    enabled: isEnabled,
    initialData: [],
    retry: 2,
    refetchOnMount: 'always',
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    // Manter lista anterior visível ao trocar contexto ou ao refetch (evita "apareceu e sumiu")
    placeholderData: (previousData) => previousData,
    ...queryOptions
  });
}
