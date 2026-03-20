/**
 * Busca dados públicos do estabelecimento por slug para personalizar a página de login (logo, tema, nome).
 * Endpoint: GET /api/public/login-info/:slug
 */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/apiClient';

function classifyLoginInfoError(error) {
  const message = String(error?.message || 'Erro ao carregar dados do estabelecimento');
  const loweredMessage = message.toLowerCase();

  if (loweredMessage.includes('timeout') || loweredMessage.includes('demorou')) {
    return { type: 'timeout', message };
  }

  if (
    loweredMessage.includes('failed to fetch') ||
    loweredMessage.includes('networkerror') ||
    loweredMessage.includes('nao foi possivel conectar') ||
    loweredMessage.includes('não foi possível conectar') ||
    loweredMessage.includes('conexao') ||
    loweredMessage.includes('conexão') ||
    loweredMessage.includes('rede')
  ) {
    return { type: 'network', message };
  }

  if (
    loweredMessage.includes('http error') ||
    loweredMessage.includes('500') ||
    loweredMessage.includes('502') ||
    loweredMessage.includes('503') ||
    loweredMessage.includes('504') ||
    loweredMessage.includes('erro ao buscar') ||
    loweredMessage.includes('internal server error')
  ) {
    return { type: 'server', message };
  }

  return { type: 'unknown', message };
}

export function useLoginInfo(slug) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!slug);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);

  const fetchInfo = useCallback(async (s) => {
    if (!s || !String(s).trim()) {
      setData(null);
      setError(null);
      setErrorType(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setErrorType(null);
    try {
      const res = await apiClient.get(`/public/login-info/${encodeURIComponent(s)}`);
      if (res?.found === false) {
        setData(res);
        setErrorType('not_found');
        return;
      }

      setData(res);
    } catch (e) {
      const classifiedError = classifyLoginInfoError(e);
      setError(classifiedError.message);
      setErrorType(classifiedError.type);
      setData(null);
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
    errorType,
    notFound: errorType === 'not_found' || data?.found === false,
    refetch: () => fetchInfo(slug),
  };
}
