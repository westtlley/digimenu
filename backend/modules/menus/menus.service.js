/**
 * Menus Service - Lógica de negócio de menus
 * Centraliza toda a lógica de gerenciamento de menus e cardápios
 */

import { logger } from '../../utils/logger.js';
import { getSubscriberOrMasterBySlug, getMenuEntities, normalizeStoreData } from './menus.utils.js';

/**
 * Obtém cardápio público por slug
 */
export async function getPublicMenuBySlug(slug) {
  const normalizedSlug = (slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  if (!normalizedSlug) {
    throw new Error('Slug inválido');
  }

  logger.info(`🔍 [public/cardapio] Buscando cardápio para slug: "${normalizedSlug}"`);

  const { subscriber, isMaster, subscriberEmail } = await getSubscriberOrMasterBySlug(normalizedSlug);

  if (!subscriber && !isMaster) {
    logger.warn(`❌ [public/cardapio] Slug não encontrado nem como subscriber nem como master`);
    throw new Error('Link não encontrado');
  }

  if (subscriber) {
    logger.info(`✅ [public/cardapio] Encontrado subscriber: ${subscriberEmail}`);
  } else {
    logger.info(`✅ [public/cardapio] Encontrado master (subscriber_email IS NULL)`);
  }

  // Buscar todas as entidades relacionadas ao menu
  const {
    storeList,
    dishes,
    categories,
    complementGroups,
    pizzaSizes,
    pizzaFlavors,
    pizzaEdges,
    pizzaExtras,
    pizzaCategories,
    beverageCategories,
    deliveryZones,
    coupons,
    promotions,
    tables,
    loyaltyConfigs
  } = await getMenuEntities(subscriberEmail, isMaster);

  // Normalizar dados da loja
  const store = normalizeStoreData(storeList);

  logger.info(`✅ [public/cardapio] Retornando dados:`, {
    is_master: isMaster,
    subscriber_email: subscriberEmail || 'master',
    store_name: store?.name,
    dishes_count: Array.isArray(dishes) ? dishes.length : 0,
    categories_count: Array.isArray(categories) ? categories.length : 0
  });

  return {
    subscriber_email: subscriberEmail || 'master',
    is_master: isMaster,
    store,
    dishes: Array.isArray(dishes) ? dishes : [],
    categories: Array.isArray(categories) ? categories : [],
    tables: Array.isArray(tables) ? tables : [],
    beverageCategories: Array.isArray(beverageCategories) ? beverageCategories : [],
    complementGroups: Array.isArray(complementGroups) ? complementGroups : [],
    pizzaSizes: Array.isArray(pizzaSizes) ? pizzaSizes : [],
    pizzaFlavors: Array.isArray(pizzaFlavors) ? pizzaFlavors : [],
    pizzaEdges: Array.isArray(pizzaEdges) ? pizzaEdges : [],
    pizzaExtras: Array.isArray(pizzaExtras) ? pizzaExtras : [],
    pizzaCategories: Array.isArray(pizzaCategories) ? pizzaCategories : [],
    deliveryZones: Array.isArray(deliveryZones) ? deliveryZones : [],
    coupons: Array.isArray(coupons) ? coupons : [],
    promotions: Array.isArray(promotions) ? promotions : [],
    loyaltyConfigs: Array.isArray(loyaltyConfigs) ? loyaltyConfigs : []
  };
}

/**
 * Obtém dados públicos do estabelecimento por slug para a página de login (logo, tema, nome).
 * Usado em GET /api/public/login-info/:slug
 */
export async function getPublicLoginInfo(slug) {
  const normalizedSlug = (slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!normalizedSlug) {
    return { found: false, error: 'Slug inválido' };
  }

  const { subscriber, isMaster, subscriberEmail } = await getSubscriberOrMasterBySlug(normalizedSlug);
  if (!subscriber && !isMaster) {
    return { found: false, slug: normalizedSlug };
  }

  const { storeList } = await getMenuEntities(subscriberEmail, isMaster);
  const store = normalizeStoreData(storeList);
  const raw = store || {};
  return {
    found: true,
    slug: normalizedSlug,
    name: raw.name || 'Estabelecimento',
    logo: raw.logo || null,
    theme_primary_color: raw.theme_primary_color || raw.primary_color || null,
    theme_secondary_color: raw.theme_secondary_color || raw.secondary_color || null,
    theme_accent_color: raw.theme_accent_color || raw.accent_color || null,
  };
}
