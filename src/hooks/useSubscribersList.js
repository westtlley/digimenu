import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/utils/logger';
import { fetchSubscribers } from '@/services/subscribers.service';

const WARMUP_URL_BASE = () => {
  const base = import.meta.env.VITE_API_BASE_URL || 'https://digimenu-backend-3m6t.onrender.com/api';
  return base.replace(/\/api\/?$/, '');
};

const LOADING_STUCK_MS = 80000;

/**
 * Warmup do servidor (cold start). Timeout via setTimeout + AbortController (compatibilidade).
 */
async function runWarmup() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    logger.debug('Warmup servidor...');
    await fetch(WARMUP_URL_BASE(), { method: 'GET', signal: controller.signal });
    logger.debug('Warmup ok');
  } catch (e) {
    logger.debug('Warmup falhou, continuando:', e?.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Hook: lista de assinantes com warmup, paginação e retry.
 * @param {{ page: number, limit: number, enabled: boolean }} opts
 * @returns {{ subscribers, pagination, isLoading, isError, error, refetch, serverWarming, loadingStuck }}
 */
export function useSubscribersList({ page = 1, limit = 50, enabled = true } = {}) {
  const [serverWarming, setServerWarming] = useState(true);
  const [loadingStuck, setLoadingStuck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    runWarmup().then(() => {
      if (!cancelled) setServerWarming(false);
    });
    return () => { cancelled = true; };
  }, []);

  const queryEnabled = !!enabled && !serverWarming;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['subscribers', page, limit],
    queryFn: async ({ signal }) => {
      const result = await fetchSubscribers({ page, limit, signal });
      return result;
    },
    enabled: queryEnabled,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: (failureCount, err) => {
      if (err?.name === 'AbortError') return false;
      return failureCount < 1;
    },
    retryDelay: 3000,
    refetchInterval: false,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!isLoading) {
      setLoadingStuck(false);
      return;
    }
    const t = setTimeout(() => setLoadingStuck(true), LOADING_STUCK_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  const subscribers = data?.subscribers ?? [];
  const pagination = data?.pagination ?? null;

  return {
    subscribers,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
    serverWarming,
    loadingStuck,
  };
}
