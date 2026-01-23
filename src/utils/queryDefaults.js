/**
 * Configurações Padrão para React Query
 * Centraliza configurações de cache e refetch para diferentes tipos de dados
 */

/**
 * Configurações para dados estáticos (categorias, complementos, etc.)
 * Cache longo pois mudam raramente
 */
export const staticDataQueryOptions = {
  staleTime: 10 * 60 * 1000, // 10 minutos
  gcTime: 30 * 60 * 1000, // 30 minutos
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false
};

/**
 * Configurações para dados dinâmicos (pratos, pedidos)
 * Cache médio, atualiza com frequência moderada
 */
export const dynamicDataQueryOptions = {
  staleTime: 2 * 60 * 1000, // 2 minutos
  gcTime: 5 * 60 * 1000, // 5 minutos
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true
};

/**
 * Configurações para dados em tempo real (pedidos ativos, GPS)
 * Cache curto, atualiza frequentemente
 */
export const realTimeQueryOptions = {
  staleTime: 30 * 1000, // 30 segundos
  gcTime: 2 * 60 * 1000, // 2 minutos
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 5 * 1000 // 5 segundos (usar com cuidado)
};

/**
 * Configurações para dados do usuário (permissões, perfil)
 * Cache médio, atualiza quando necessário
 */
export const userDataQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 10 * 60 * 1000, // 10 minutos
  refetchOnMount: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true
};
