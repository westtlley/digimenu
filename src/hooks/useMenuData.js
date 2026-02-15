/**
 * Hook useMenuData - Encapsula queries comuns de menu
 * Usa menuContext automaticamente e aplica safeFetch
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchAdminDishes, fetchAdminCategories, fetchAdminComplementGroups } from '@/services/adminMenuService';
import { log } from '@/utils/logger';
import { usePermission } from '@/components/permissions/usePermission';

/**
 * Hook para buscar pratos do menu
 * 
 * @param {Object} options - Opções da query
 * @returns {Object} Resultado da query (data, isLoading, error)
 */
export function useMenuDishes(options = {}) {
  const { menuContext } = usePermission();

  return useQuery({
    queryKey: ['dishes', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) {
        log.menu.warn('⚠️ [useMenuDishes] menuContext não disponível');
        return [];
      }
      return await fetchAdminDishes(menuContext);
    },
    enabled: !!menuContext && (options.enabled !== false),
    initialData: [],
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnMount: true, // ✅ Apenas true (não 'always') para evitar flicker
    refetchOnWindowFocus: false, // ✅ Não refetch ao focar janela
    staleTime: 30000,
    gcTime: 60000,
    ...options
  });
}

/**
 * Hook para buscar categorias do menu
 */
export function useMenuCategories(options = {}) {
  const { menuContext } = usePermission();

  return useQuery({
    queryKey: ['categories', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) {
        log.menu.warn('⚠️ [useMenuCategories] menuContext não disponível');
        return [];
      }
      return await fetchAdminCategories(menuContext);
    },
    enabled: !!menuContext && (options.enabled !== false),
    initialData: [],
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnMount: false, // ✅ Não refetch ao montar (usa cache)
    refetchOnWindowFocus: false, // ✅ Não refetch ao focar janela
    staleTime: 30000,
    gcTime: 60000,
    ...options
  });
}

/**
 * Hook para buscar grupos de complementos do menu
 */
export function useMenuComplementGroups(options = {}) {
  const { menuContext } = usePermission();

  return useQuery({
    queryKey: ['complementGroups', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) {
        log.menu.warn('⚠️ [useMenuComplementGroups] menuContext não disponível');
        return [];
      }
      return await fetchAdminComplementGroups(menuContext);
    },
    enabled: !!menuContext && (options.enabled !== false),
    initialData: [],
    placeholderData: keepPreviousData,
    retry: 2,
    refetchOnMount: false, // ✅ Não refetch ao montar (usa cache)
    refetchOnWindowFocus: false, // ✅ Não refetch ao focar janela
    staleTime: 30000,
    gcTime: 60000,
    ...options
  });
}

/**
 * Hook para buscar todos os dados do menu de uma vez
 * Útil quando precisa de dishes, categories e complementGroups juntos
 */
export function useMenuData(options = {}) {
  const dishes = useMenuDishes(options);
  const categories = useMenuCategories(options);
  const complementGroups = useMenuComplementGroups(options);

  return {
    dishes: dishes.data || [],
    categories: categories.data || [],
    complementGroups: complementGroups.data || [],
    isLoading: dishes.isLoading || categories.isLoading || complementGroups.isLoading,
    isError: dishes.isError || categories.isError || complementGroups.isError,
    errors: {
      dishes: dishes.error,
      categories: categories.error,
      complementGroups: complementGroups.error
    },
    // Métodos de refetch
    refetch: () => {
      dishes.refetch();
      categories.refetch();
      complementGroups.refetch();
    },
    // Queries individuais (para invalidateQueries)
    queries: {
      dishes,
      categories,
      complementGroups
    }
  };
}
