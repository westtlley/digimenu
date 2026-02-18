/**
 * Serviço de assinantes: fetch e parse centralizados.
 * Não loga tokens, setup_url nem dados sensíveis.
 */
import { apiClient } from '@/api/apiClient';
import { logger } from '@/utils/logger';

/**
 * Normaliza a resposta da API para um formato único.
 * Suporta: response.data.subscribers, response.data array, response.subscribers, response array.
 * @param {any} response - Resposta bruta da API
 * @returns {{ subscribers: Array, pagination: object | null }}
 */
export function parseSubscribersResponse(response) {
  const fallback = { subscribers: [], pagination: null };

  if (response == null) return fallback;
  if (response?.data?.error) {
    throw new Error(response.data.error);
  }

  let subscribers = [];
  let pagination = null;

  if (response?.data?.subscribers) {
    subscribers = Array.isArray(response.data.subscribers) ? response.data.subscribers : [];
    pagination = response.data.pagination ?? null;
  } else if (response?.data && Array.isArray(response.data)) {
    subscribers = response.data;
  } else if (Array.isArray(response)) {
    subscribers = response;
  } else if (response?.subscribers) {
    subscribers = Array.isArray(response.subscribers) ? response.subscribers : [];
    pagination = response.pagination ?? null;
  } else if (response?.data && typeof response.data === 'object' && !response.data.subscribers) {
    logger.debug('subscribers.service: formato de resposta inesperado');
    return fallback;
  }

  return { subscribers, pagination };
}

/**
 * Busca assinantes com timeout via AbortController (compatível com todos os browsers).
 * Conecta o signal do React Query ao timeout local.
 * @param {{ page: number, limit: number, signal?: AbortSignal }} opts
 * @returns {Promise<{ subscribers: Array, pagination: object | null }>}
 */
export async function fetchSubscribers({ page = 1, limit = 50, signal } = {}) {
  const controller = new AbortController();
  let timeoutId;

  const timeoutMs = 120000;

  if (signal) {
    signal.addEventListener('abort', () => {
      if (timeoutId) clearTimeout(timeoutId);
      controller.abort();
    }, { once: true });
  }

  timeoutId = setTimeout(() => {
    logger.debug('subscribers.service: timeout atingido');
    controller.abort();
  }, timeoutMs);

  try {
    const response = await apiClient.get(
      '/establishments/subscribers',
      { page, limit },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return parseSubscribersResponse(response);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Servidor não respondeu a tempo. Pode estar em cold start. Aguarde e clique em "Tentar novamente".');
    }
    throw err;
  }
}
