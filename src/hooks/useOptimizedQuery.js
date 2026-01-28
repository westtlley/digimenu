/**
 * Hook otimizado para queries com cache inteligente
 * Reduz queries N+1 e melhora performance
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

/**
 * Query com deduplicação automática
 */
export function useOptimizedQuery(queryKey, queryFn, options = {}) {
  const lastFetchTime = useRef(0);
  const minInterval = options.minInterval || 1000; // Mínimo 1s entre fetches
  
  const shouldFetch = () => {
    const now = Date.now();
    if (now - lastFetchTime.current < minInterval) {
      return false;
    }
    lastFetchTime.current = now;
    return true;
  };

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!shouldFetch() && options.skipIfRecent) {
        throw new Error('Query skipped - too recent');
      }
      return queryFn();
    },
    staleTime: options.staleTime || 30000, // 30s padrão
    gcTime: options.gcTime || 5 * 60 * 1000, // 5 min padrão
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    ...options
  });
}

/**
 * Prefetch de dados relacionados (resolver N+1)
 */
export function usePrefetch(prefetchConfigs = []) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    prefetchConfigs.forEach(({ queryKey, queryFn }) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 60000 // 1 minuto
      });
    });
  }, [prefetchConfigs, queryClient]);
}

/**
 * Hook para queries com dados relacionados (resolver N+1)
 */
export function useQueryWithRelations(config) {
  const { mainQuery, relations = [] } = config;
  const queryClient = useQueryClient();
  
  // Query principal
  const mainResult = useQuery(mainQuery);
  
  // Prefetch de relações quando dados principais estão disponíveis
  useEffect(() => {
    if (mainResult.data && Array.isArray(mainResult.data)) {
      relations.forEach(({ getQueryKey, queryFn }) => {
        mainResult.data.forEach(item => {
          const queryKey = getQueryKey(item);
          queryClient.prefetchQuery({
            queryKey,
            queryFn: () => queryFn(item),
            staleTime: 60000
          });
        });
      });
    }
  }, [mainResult.data, relations, queryClient]);
  
  return mainResult;
}

/**
 * Batch de queries para reduzir requisições
 */
export function useBatchQuery(queries = []) {
  const results = queries.map(({ queryKey, queryFn, options }) => 
    useQuery({
      queryKey,
      queryFn,
      ...options
    })
  );
  
  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);
  const data = results.map(r => r.data);
  
  return {
    isLoading,
    isError,
    data,
    results
  };
}

export default {
  useOptimizedQuery,
  usePrefetch,
  useQueryWithRelations,
  useBatchQuery
};
