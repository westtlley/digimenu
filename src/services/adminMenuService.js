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

    log.menu.log('📤 [adminMenuService] Chamando Dish.list com opts:', opts);
    
    try {
      const promise = base44.entities.Dish.list('order', opts);
      const result = await safeFetch(promise, 10000, 'Timeout ao buscar pratos');
      
      // #region agent log H1-H2
      fetch('http://127.0.0.1:7242/ingest/ccefc2e4-c9d6-41c0-a239-092136d59e5b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adminMenuService.js:36',message:'API admin response',data:{requested_email:opts.as_subscriber,returned_count:ensureArray(result).length,sample_dishes:ensureArray(result).slice(0,3).map(d=>({id:d.id,name:d.name,subscriber_email:d.subscriber_email,owner_email:d.owner_email}))},timestamp:Date.now(),hypothesisId:'H1-H2'})}).catch(()=>{});
      // #endregion
      
      log.menu.log('✅ [adminMenuService] Pratos recebidos:', ensureArray(result).length, 'pratos');
      log.menu.log('📋 [adminMenuService] Amostra:', ensureArray(result).slice(0, 3).map(d => d.name));
      
      // Se a rota admin retornar vazio, tentar fallback público
      if (ensureArray(result).length === 0) {
        log.menu.warn('⚠️ [adminMenuService] Rota admin retornou 0 pratos, tentando fallback público');
        
        // Tentar obter slug do usuário
        const user = await base44.auth.me();
        
        // #region agent log H3
        fetch('http://127.0.0.1:7242/ingest/ccefc2e4-c9d6-41c0-a239-092136d59e5b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adminMenuService.js:49',message:'User data for fallback',data:{user_email:user?.email,user_slug:user?.slug,user_subscriber_email:user?.subscriber_email},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        
        if (user?.slug) {
          try {
            const publicData = await base44.get(`/public/cardapio/${user.slug}`);
            
            // #region agent log H4-H5
            fetch('http://127.0.0.1:7242/ingest/ccefc2e4-c9d6-41c0-a239-092136d59e5b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'adminMenuService.js:59',message:'Public API response',data:{slug:user.slug,public_dishes_count:publicData.dishes?.length||0,public_subscriber_email:publicData.subscriber_email,sample_public_dishes:ensureArray(publicData.dishes).slice(0,3).map(d=>({id:d.id,name:d.name,subscriber_email:d.subscriber_email,owner_email:d.owner_email}))},timestamp:Date.now(),hypothesisId:'H4-H5'})}).catch(()=>{});
            // #endregion
            
            log.menu.log('✅ [adminMenuService] Dados públicos como fallback:', publicData.dishes?.length || 0, 'pratos');
            return ensureArray(publicData.dishes);
          } catch (publicError) {
            log.menu.error('❌ [adminMenuService] Fallback público também falhou:', publicError);
          }
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
    log.menu.log('📦 [adminMenuService] Buscando categorias admin...', menuContext);

    const opts = {};
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
    }

    try {
      const promise = base44.entities.Category.list('order', opts);
      const result = await safeFetch(promise, 10000, 'Timeout ao buscar categorias');
      
      log.menu.log('✅ [adminMenuService] Categorias recebidas:', ensureArray(result).length);
      return ensureArray(result);
    } catch (adminError) {
      // ✅ FALLBACK: Tentar rota pública
      log.menu.warn('⚠️ [adminMenuService] Rota admin falhou, tentando fallback público');
      const user = await base44.auth.me();
      if (user?.slug) {
        const publicData = await base44.get(`/public/cardapio/${user.slug}`);
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
    log.menu.log('📦 [adminMenuService] Buscando grupos de complementos admin...', menuContext);

    const opts = {};
    if (menuContext.type === 'subscriber' && menuContext.value) {
      opts.as_subscriber = menuContext.value;
    }

    try {
      const promise = base44.entities.ComplementGroup.list('order', opts);
      const result = await safeFetch(promise, 10000, 'Timeout ao buscar grupos de complementos');
      
      log.menu.log('✅ [adminMenuService] Grupos recebidos:', ensureArray(result).length);
      return ensureArray(result);
    } catch (adminError) {
      // ✅ FALLBACK: Tentar rota pública
      log.menu.warn('⚠️ [adminMenuService] Rota admin falhou, tentando fallback público');
      const user = await base44.auth.me();
      if (user?.slug) {
        const publicData = await base44.get(`/public/cardapio/${user.slug}`);
        return ensureArray(publicData.complementGroups);
      }
      throw adminError;
    }
  } catch (error) {
    log.menu.error('❌ [adminMenuService] Erro ao buscar grupos:', error);
    return [];
  }
}
