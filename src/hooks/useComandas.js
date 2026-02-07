import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOfflineSync } from './useOfflineSync';
import { saveComandaOffline, updateComandaOffline, getComandasOffline } from '@/utils/offlineStorage';
import { COMANDA_STATUS } from '@/utils/constants';
import toast from 'react-hot-toast';

/**
 * Hook para gerenciar comandas
 */
export function useComandas(statusFilter = 'open', enabled = true) {
  const { online } = useOfflineSync();
  const queryClient = useQueryClient();

  const { data: comandas = [], isLoading } = useQuery({
    queryKey: ['Comanda', statusFilter, online],
    queryFn: async () => {
      const params = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
      
      if (online) {
        return base44.entities.Comanda.list('-created_at', params);
      } else {
        const offlineComandas = await getComandasOffline();
        return offlineComandas.filter(c => {
          if (statusFilter === 'all') return true;
          return (c.status || COMANDA_STATUS.OPEN) === statusFilter;
        });
      }
    },
    enabled: enabled && online !== undefined,
    refetchInterval: online ? 5000 : false,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (online) {
        return await base44.entities.Comanda.create(data);
      } else {
        const offlineComanda = {
          ...data,
          id: `offline_${Date.now()}`,
          code: data.code || `C-${Date.now().toString().slice(-6)}`
        };
        return await saveComandaOffline(offlineComanda);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      toast.success(online ? 'Comanda criada com sucesso!' : 'Comanda salva offline. Será sincronizada quando voltar online.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao criar comanda'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (online) {
        return await base44.entities.Comanda.update(id, data);
      } else {
        return await updateComandaOffline({ ...data, id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      toast.success(online ? 'Comanda atualizada com sucesso!' : 'Comanda atualizada offline. Será sincronizada quando voltar online.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao atualizar comanda'),
  });

  // Memoizar comandas filtradas
  const filteredComandas = useMemo(() => {
    return Array.isArray(comandas) ? comandas : [];
  }, [comandas]);

  // Memoizar estatísticas
  const stats = useMemo(() => {
    const all = filteredComandas;
    return {
      total: all.length,
      open: all.filter(c => (c.status || COMANDA_STATUS.OPEN) === COMANDA_STATUS.OPEN).length,
      closed: all.filter(c => c.status === COMANDA_STATUS.CLOSED).length,
      cancelled: all.filter(c => c.status === COMANDA_STATUS.CANCELLED).length,
      totalValue: all.reduce((sum, c) => sum + (c.total || 0), 0),
      averageTicket: all.length > 0 
        ? all.reduce((sum, c) => sum + (c.total || 0), 0) / all.length 
        : 0
    };
  }, [filteredComandas]);

  return {
    comandas: filteredComandas,
    isLoading,
    stats,
    createMutation,
    updateMutation,
    online
  };
}
