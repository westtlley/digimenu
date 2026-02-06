/**
 * Hook useQueryWithError - Query com tratamento de erro padrão
 * Sempre mostra erro visível ao invés de falhar silenciosamente
 */

import { useQuery } from '@tanstack/react-query';
import { LoadingError } from '@/components/admin/AccessDenied';
import { log } from '@/utils/logger';

/**
 * Hook que envolve useQuery com tratamento de erro padrão
 * 
 * @param {Object} queryConfig - Configuração da query (mesma do useQuery)
 * @param {Object} errorConfig - Configuração de erro
 * @param {string} errorConfig.title - Título do erro
 * @param {string} errorConfig.message - Mensagem do erro
 * @param {Function} errorConfig.onError - Callback de erro
 * @returns {Object} Resultado da query + componente de erro
 */
export function useQueryWithError(queryConfig, errorConfig = {}) {
  const {
    title = 'Erro ao carregar dados',
    message = 'Não foi possível carregar os dados.',
    onError: customOnError
  } = errorConfig;

  const query = useQuery({
    ...queryConfig,
    onError: (error) => {
      log.error.error(`❌ [useQueryWithError] Erro na query:`, error);
      if (customOnError) {
        customOnError(error);
      }
    }
  });

  // Componente de erro se houver erro
  const ErrorComponent = query.isError ? (
    <LoadingError
      title={title}
      message={query.error?.message || message}
      onRetry={() => query.refetch()}
    />
  ) : null;

  return {
    ...query,
    ErrorComponent
  };
}
