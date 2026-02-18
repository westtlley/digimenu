/**
 * Hook useOrders - Busca pedidos com contexto automático
 * Usa menuContext para buscar pedidos no contexto correto.
 * Fallback: se menuContext atrasar (ex.: Painel Assinante), usa subscriberData/user para assinante.
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
 * @returns {Object} Resultado da query
 */
export function useOrders(options = {}) {
  const { menuContext, loading: permissionLoading, user, subscriberData, isMaster } = usePermission();
  const { orderBy = '-created_date', filters = {}, ...queryOptions } = options;

  // Para assinante: usar menuContext ou fallback (subscriberData.email / user) para não depender do timing do menuContext
  const effectiveSubscriber =
    (menuContext?.type === 'subscriber' && menuContext?.value) ||
    (!isMaster && (subscriberData?.email || user?.subscriber_email || user?.email));
  const effectiveSubscriberNorm = effectiveSubscriber ? String(effectiveSubscriber).trim().toLowerCase() : null;

  const isEnabled = !permissionLoading && (!!menuContext || !!effectiveSubscriberNorm) && (queryOptions.enabled !== false);

  return useQuery({
    queryKey: ['orders', menuContext?.type, menuContext?.value, effectiveSubscriberNorm, orderBy, filters],
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

        log.menu.log('✅ [useOrders] Pedidos recebidos:', orders.length);
        return orders;
      } catch (error) {
        log.menu.error('❌ [useOrders] Erro ao buscar pedidos:', error);
        return [];
      }
    },
    enabled: !permissionLoading && (!!menuContext || !!effectiveSubscriberNorm) && (queryOptions.enabled !== false),
    initialData: [],
    retry: 2,
    refetchOnMount: true,
    staleTime: 30 * 1000, // 30s — evita refetch desnecessário ao trocar de aba
    gcTime: 5 * 60 * 1000,
    ...queryOptions
  });
}
