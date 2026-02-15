/**
 * Serviço de Menu para Admin
 * Separa lógica de admin do cardápio público
 * 
 * ✅ Master usa slug ou null (próprios dados)
 * ✅ Subscriber usa subscriber_email
 */

import { base44 } from '@/api/base44Client';
import { safeFetch, ensureArray } from '@/utils/safeFetch';
import { log } from '@/utils/logger';

/**
 * Busca pratos no contexto do admin
 * 
 * @param {Object} menuContext - Contexto do menu { type: 'slug'|'subscriber', value: string }
 * @returns {Promise<Array>}
 */
export async function fetchAdminDishes(menuContext) {
  try {
    log.menu.log('📦 [adminMenuService] Buscando pratos admin...', menuContext);

    const opts = {};
    
    // Se for subscriber, usar as_subscriber
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
      log.menu.log('✅ [adminMenuService] Passando as_subscriber:', menuContext.value);
    }
    // Se for slug, usar slug (se o backend suportar)
    // Por enquanto, master sem slug usa dados próprios (sem opts)

    log.menu.log('📤 [adminMenuService] Chamando Dish.list com opts:', opts);
    const promise = base44.entities.Dish.list('order', opts);
    const result = await safeFetch(promise, 10000, 'Timeout ao buscar pratos');
    
    log.menu.log('✅ [adminMenuService] Pratos recebidos:', ensureArray(result).length, 'pratos');
    log.menu.log('📋 [adminMenuService] Amostra:', ensureArray(result).slice(0, 3).map(d => d.name));
    return ensureArray(result);
  } catch (error) {
    log.menu.error('❌ [adminMenuService] Erro ao buscar pratos:', error);
    return [];
  }
}

/**
 * Busca categorias no contexto do admin
 * 
 * @param {Object} menuContext - Contexto do menu
 * @returns {Promise<Array>}
 */
export async function fetchAdminCategories(menuContext) {
  try {
    log.menu.log('📦 [adminMenuService] Buscando categorias admin...', menuContext);

    const opts = {};
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
    }

    const promise = base44.entities.Category.list('order', opts);
    const result = await safeFetch(promise, 10000, 'Timeout ao buscar categorias');
    
    log.menu.log('✅ [adminMenuService] Categorias recebidas:', ensureArray(result).length);
    return ensureArray(result);
  } catch (error) {
    log.menu.error('❌ [adminMenuService] Erro ao buscar categorias:', error);
    return [];
  }
}

/**
 * Busca grupos de complementos no contexto do admin
 * 
 * @param {Object} menuContext - Contexto do menu
 * @returns {Promise<Array>}
 */
export async function fetchAdminComplementGroups(menuContext) {
  try {
    log.menu.log('📦 [adminMenuService] Buscando grupos de complementos admin...', menuContext);

    const opts = {};
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
    }

    const promise = base44.entities.ComplementGroup.list('order', opts);
    const result = await safeFetch(promise, 10000, 'Timeout ao buscar grupos de complementos');
    
    log.menu.log('✅ [adminMenuService] Grupos recebidos:', ensureArray(result).length);
    return ensureArray(result);
  } catch (error) {
    log.menu.error('❌ [adminMenuService] Erro ao buscar grupos:', error);
    return [];
  }
}
