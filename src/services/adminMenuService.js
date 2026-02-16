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
 * Obtém o slug mais confiável para fallback público
 * Prioridade: subscriberData.slug (banco) > user.slug > menuContext.value (se slug) > URL
 * 
 * @param {Object} menuContext - Contexto do menu atual
 * @returns {Promise<string|null>}
 */
async function getReliableSlug(menuContext) {
  const user = await base44.auth.me();
  
  // Tentar obter subscriberData do sessionStorage (salvo pelo usePermission)
  let subscriberSlug = null;
  try {
    const contextData = sessionStorage.getItem('userContext');
    if (contextData) {
      const parsed = JSON.parse(contextData);
      subscriberSlug = parsed?.subscriberData?.slug || null;
    }
  } catch (e) {
    // Ignorar erro
  }
  
  let slugToUse = null;
  
  // Prioridade 1: subscriberSlug (do banco via sessionStorage)
  if (subscriberSlug) {
    slugToUse = subscriberSlug;
    log.menu.debug('✅ [getReliableSlug] Usando slug do subscriberData:', slugToUse);
  }
  // Prioridade 2: user.slug
  else if (user?.slug) {
    slugToUse = user.slug;
    log.menu.debug('✅ [getReliableSlug] Usando slug do user:', slugToUse);
  }
  // Prioridade 3: menuContext.value (se type for 'slug')
  else if (menuContext?.type === 'slug' && menuContext.value) {
    slugToUse = menuContext.value;
    log.menu.debug('✅ [getReliableSlug] Usando slug do menuContext:', slugToUse);
  }
  // Prioridade 4 (último recurso): extrair da URL
  else {
    const urlMatch = window.location.pathname.match(/\/s\/([^/]+)/);
    if (urlMatch) {
      slugToUse = urlMatch[1];
      log.menu.debug('⚠️ [getReliableSlug] Usando slug da URL (último recurso):', slugToUse);
    }
  }
  
  return slugToUse;
}

/**
 * Busca pratos no contexto do admin
 * 
 * @param {Object} menuContext - Contexto do menu { type: 'slug'|'subscriber', value: string }
 * @returns {Promise<Array>}
 */
export async function fetchAdminDishes(menuContext) {
  try {
    log.menu.debug('📦 [adminMenuService] Buscando pratos admin...', menuContext);

    const opts = {};
    
    // Se for subscriber, usar as_subscriber
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
      log.menu.debug('✅ [adminMenuService] Passando as_subscriber:', menuContext.value);
    }

    log.menu.debug('📤 [adminMenuService] Chamando Dish.list com opts:', opts);
    
    try {
      const promise = base44.entities.Dish.list('order', opts);
      const result = await safeFetch(promise, 10000, 'Timeout ao buscar pratos');
      
      log.menu.debug('✅ [adminMenuService] Pratos recebidos:', ensureArray(result).length, 'pratos');
      log.menu.debug('📋 [adminMenuService] Amostra:', ensureArray(result).slice(0, 3).map(d => d.name));
      
      // Se a rota admin retornar vazio, tentar fallback público
      if (ensureArray(result).length === 0) {
        log.menu.warn('⚠️ [adminMenuService] Rota admin retornou 0 pratos, tentando fallback público');
        
        const slugToUse = await getReliableSlug(menuContext);
        
        if (slugToUse) {
          try {
            const publicData = await base44.get(`/public/cardapio/${slugToUse}`);
            
            log.menu.log('✅ [adminMenuService] Dados públicos como fallback:', publicData.dishes?.length || 0, 'pratos');
            return ensureArray(publicData.dishes);
          } catch (publicError) {
            log.menu.error('❌ [adminMenuService] Fallback público também falhou:', publicError);
          }
        } else {
          log.menu.error('❌ [adminMenuService] Sem slug disponível para fallback');
        }
      }
      
      return ensureArray(result);
    } catch (adminError) {
      log.menu.error('❌ [adminMenuService] Erro na rota admin:', adminError);
      return [];
    }
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
    log.menu.debug('📦 [adminMenuService] Buscando categorias admin...', menuContext);

    const opts = {};
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
    }

    try {
      const promise = base44.entities.Category.list('order', opts);
      const result = await safeFetch(promise, 10000, 'Timeout ao buscar categorias');
      
      log.menu.debug('✅ [adminMenuService] Categorias recebidas:', ensureArray(result).length);
      
      // Se a rota admin retornar vazio, tentar fallback público
      if (ensureArray(result).length === 0) {
        log.menu.warn('⚠️ [adminMenuService] Rota admin retornou 0 categorias, tentando fallback público');
        
        const slugToUse = await getReliableSlug(menuContext);
        
        if (slugToUse) {
          const publicData = await base44.get(`/public/cardapio/${slugToUse}`);
          return ensureArray(publicData.categories);
        }
      }
      
      return ensureArray(result);
    } catch (adminError) {
      // ✅ FALLBACK: Tentar rota pública
      log.menu.warn('⚠️ [adminMenuService] Rota admin falhou, tentando fallback público');
      
      const slugToUse = await getReliableSlug(menuContext);
      
      if (slugToUse) {
        const publicData = await base44.get(`/public/cardapio/${slugToUse}`);
        return ensureArray(publicData.categories);
      }
      throw adminError;
    }
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
    log.menu.debug('📦 [adminMenuService] Buscando grupos de complementos admin...', menuContext);

    const opts = {};
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
    }

    try {
      const promise = base44.entities.ComplementGroup.list('order', opts);
      const result = await safeFetch(promise, 10000, 'Timeout ao buscar grupos de complementos');
      
      log.menu.debug('✅ [adminMenuService] Grupos recebidos:', ensureArray(result).length);
      
      // Se a rota admin retornar vazio, tentar fallback público
      if (ensureArray(result).length === 0) {
        log.menu.warn('⚠️ [adminMenuService] Rota admin retornou 0 grupos, tentando fallback público');
        
        const slugToUse = await getReliableSlug(menuContext);
        
        if (slugToUse) {
          const publicData = await base44.get(`/public/cardapio/${slugToUse}`);
          return ensureArray(publicData.complementGroups);
        }
      }
      
      return ensureArray(result);
    } catch (adminError) {
      // ✅ FALLBACK: Tentar rota pública
      log.menu.warn('⚠️ [adminMenuService] Rota admin falhou, tentando fallback público');
      
      const slugToUse = await getReliableSlug(menuContext);
      
      if (slugToUse) {
        const publicData = await base44.get(`/public/cardapio/${slugToUse}`);
        return ensureArray(publicData.complementGroups);
      }
      throw adminError;
    }
  } catch (error) {
    log.menu.error('❌ [adminMenuService] Erro ao buscar grupos:', error);
    return [];
  }
}
