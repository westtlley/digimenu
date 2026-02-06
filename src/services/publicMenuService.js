/**
 * Serviço de Menu Público
 * Separa lógica do cardápio público do admin
 * 
 * ✅ Usa apenas slug para buscar dados públicos
 */

import { base44 } from '@/api/base44Client';
import { safeFetch, ensureArray } from '@/utils/safeFetch';
import { log } from '@/utils/logger';

/**
 * Busca dados públicos do cardápio por slug
 * 
 * @param {string} slug - Slug do cardápio
 * @returns {Promise<Object>} Dados do cardápio público
 */
export async function fetchPublicMenu(slug) {
  try {
    log.menu.log('📦 [publicMenuService] Buscando cardápio público...', slug);

    if (!slug) {
      log.menu.warn('⚠️ [publicMenuService] Slug não fornecido');
      return {
        dishes: [],
        categories: [],
        complementGroups: [],
        store: null,
      };
    }

    // Buscar dados públicos via endpoint específico ou entidades com slug
    // Por enquanto, usar entidades normais (backend filtra por slug automaticamente)
    const [dishes, categories, complementGroups, stores] = await Promise.all([
      safeFetch(base44.entities.Dish.list('order'), 10000, 'Timeout ao buscar pratos'),
      safeFetch(base44.entities.Category.list('order'), 10000, 'Timeout ao buscar categorias'),
      safeFetch(base44.entities.ComplementGroup.list('order'), 10000, 'Timeout ao buscar grupos'),
      safeFetch(base44.entities.Store.list(), 10000, 'Timeout ao buscar loja'),
    ]);

    const store = ensureArray(stores)[0] || null;

    log.menu.log('✅ [publicMenuService] Cardápio público carregado:', {
      dishes: ensureArray(dishes).length,
      categories: ensureArray(categories).length,
      groups: ensureArray(complementGroups).length,
      hasStore: !!store,
    });

    return {
      dishes: ensureArray(dishes),
      categories: ensureArray(categories),
      complementGroups: ensureArray(complementGroups),
      store,
    };
  } catch (error) {
    log.menu.error('❌ [publicMenuService] Erro ao buscar cardápio público:', error);
    return {
      dishes: [],
      categories: [],
      complementGroups: [],
      store: null,
    };
  }
}
