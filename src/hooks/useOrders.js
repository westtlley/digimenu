/**
 * Hook useOrders - Busca pedidos com contexto automático
 * Usa menuContext para buscar pedidos no contexto correto
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { safeFetch, ensureArray } from '@/utils/safeFetch';
import { usePermission } from '@/components/permissions/usePermission';

/**
 * Hook para buscar pedidos
 * 
 * @param {Object} options - Opções da query
 * @param {string} options.orderBy - Ordenação (padrão: '-created_date')
 * @param {Object} options.filters - Filtros adicionais
 * @returns {Object} Resultado da query
 */
export function useOrders(options = {}) {
  const { menuContext, loading: permissionLoading } = usePermission();
  const { orderBy = '-created_date', filters = {}, ...queryOptions } = options;

  const isEnabled = !permissionLoading && !!menuContext && (queryOptions.enabled !== false);

  return useQuery({
    queryKey: ['orders', menuContext?.type, menuContext?.value, orderBy, filters],
    queryFn: async () => {
      try {
        const opts = {};
        if (menuContext?.type === 'subscriber' && menuContext?.value) {
          opts.as_subscriber = menuContext.value;
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
        
        // Garantir ordem: mais recente sempre no topo (por created_date / created_at)
        const getOrderDate = (o) => new Date(o?.created_date || o?.created_at || 0).getTime();
        orders.sort((a, b) => getOrderDate(b) - getOrderDate(a));
        
        log.menu.log('✅ [useOrders] Pedidos recebidos:', orders.length);
        return orders;
      } catch (error) {
        log.menu.error('❌ [useOrders] Erro ao buscar pedidos:', error);
        return [];
      }
    },
    enabled: !permissionLoading && !!menuContext && (queryOptions.enabled !== false),
    initialData: [],
    retry: 2,
    refetchOnMount: true,
    staleTime: 30 * 1000, // 30s — evita refetch desnecessário ao trocar de aba
    gcTime: 5 * 60 * 1000,
    ...queryOptions
  });
}
