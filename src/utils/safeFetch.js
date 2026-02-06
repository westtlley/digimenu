/**
 * Helper anti-loading-infinito
 * Garante que todo fetch tenha timeout e tratamento de erro
 * 
 * @param {Promise} promise - Promise do fetch
 * @param {number} timeout - Timeout em ms (padrão: 8000)
 * @param {string} errorMessage - Mensagem de erro customizada
 * @returns {Promise} Promise que sempre resolve ou rejeita
 */
export async function safeFetch(promise, timeout = 8000, errorMessage = 'Timeout ao buscar dados') {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeout)
  );

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    // Log do erro mas não quebra o fluxo
    console.error('[safeFetch] Erro:', error);
    throw error;
  }
}

/**
 * Wrapper para useQuery que aplica safeFetch automaticamente
 * 
 * @param {Function} queryFn - Função de query
 * @param {number} timeout - Timeout em ms
 * @returns {Function} Query function com timeout
 */
export function withSafeFetch(queryFn, timeout = 8000) {
  return async (...args) => {
    try {
      return await safeFetch(queryFn(...args), timeout);
    } catch (error) {
      // Retorna valor padrão seguro baseado no tipo esperado
      console.error('[withSafeFetch] Erro na query:', error);
      return [];
    }
  };
}

/**
 * Helper para garantir que arrays sempre sejam arrays
 * 
 * @param {any} data - Dados que podem ser array ou não
 * @param {Array} fallback - Valor padrão se não for array
 * @returns {Array}
 */
export function ensureArray(data, fallback = []) {
  return Array.isArray(data) ? data : fallback;
}
