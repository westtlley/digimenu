/**
 * Busca dados públicos do estabelecimento por slug para personalizar a página de login (logo, tema, nome).
 * Endpoint: GET /api/public/login-info/:slug
 */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/apiClient';

export function useLoginInfo(slug) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState(null);

  const fetchInfo = useCallback(async (s) => {
    if (!s || !String(s).trim()) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/public/login-info/${encodeURIComponent(s)}`);
      setData(res);
    } catch (e) {
      setError(e?.message || 'Erro ao carregar dados do estabelecimento');
      setData({ found: false, slug: s });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo(slug);
  }, [slug, fetchInfo]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchInfo(slug),
  };
}
