/**
 * Helpers para criar queryKeys padronizados
 * Sempre inclui contexto quando relevante
 */

import { usePermission } from '@/components/permissions/usePermission';

/**
 * Cria queryKey com contexto
 * 
 * @param {string|Array} baseKey - Chave base ou array de chaves
 * @param {Object} menuContext - Contexto do menu
 * @param {Object} additionalKeys - Chaves adicionais (filtros, ordenação, etc.)
 * @returns {Array} QueryKey completo
 */
export function createQueryKey(baseKey, menuContext, additionalKeys = {}) {
  const base = Array.isArray(baseKey) ? baseKey : [baseKey];
  
  // Adicionar contexto se disponível
  if (menuContext) {
    base.push(menuContext.type, menuContext.value);
  }
  
  // Adicionar chaves adicionais
  if (Object.keys(additionalKeys).length > 0) {
    base.push(additionalKeys);
  }
  
  return base;
}

/**
 * Hook para criar queryKeys com contexto automático
 * 
 * @param {string|Array} baseKey - Chave base
 * @param {Object} additionalKeys - Chaves adicionais
 * @returns {Array} QueryKey completo
 */
export function useQueryKey(baseKey, additionalKeys = {}) {
  const { menuContext } = usePermission();
  return createQueryKey(baseKey, menuContext, additionalKeys);
}

/**
 * QueryKeys padrão do sistema
 */
export const QUERY_KEYS = {
  // Menu
  DISHES: 'dishes',
  CATEGORIES: 'categories',
  COMPLEMENT_GROUPS: 'complementGroups',
  
  // Pedidos
  ORDERS: 'orders',
  PDV_SALES: 'pedidosPDV',
  
  // Loja
  STORE: 'store',
  STORES: 'stores',
  
  // Clientes
  CLIENTS: 'clients',
  CUSTOMERS: 'customers',
  
  // Outros
  COUPONS: 'coupons',
  PROMOTIONS: 'promotions',
  DELIVERY_ZONES: 'deliveryZones',
  TABLES: 'tables',
  COMANDA: 'comandas',
};
