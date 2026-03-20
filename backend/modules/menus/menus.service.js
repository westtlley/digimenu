/**
 * Menus Service - business logic for public menu routes.
 */

import { logger } from '../../utils/logger.js';
import { getSubscriberOrMasterBySlug, getMenuEntities, normalizeStoreData } from './menus.utils.js';

function logPublicSlugTrace(scope, details = {}) {
  try {
    console.log(`[menus:${scope}]`, JSON.stringify(details));
  } catch {
    console.log(`[menus:${scope}]`, details);
  }
}

/**
 * Get public menu by slug.
 */
export async function getPublicMenuBySlug(slug) {
  const normalizedSlug = (slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  if (!normalizedSlug) {
    throw new Error('Slug inv\u00e1lido');
  }

  logger.info(`[public/cardapio] Buscando cardapio para slug: "${normalizedSlug}"`);
  logPublicSlugTrace('cardapio.slug_received', {
    slug_received: slug || '',
    normalized_slug: normalizedSlug,
  });

  const {
    subscriber,
    isMaster,
    subscriberEmail,
    subscriberId,
    source: slugSource,
    attemptedSources: slugAttemptedSources,
    fallbackUsed: slugFallbackUsed,
    missReason: slugMissReason,
  } = await getSubscriberOrMasterBySlug(normalizedSlug);

  logPublicSlugTrace('cardapio.slug_resolution', {
    slug: normalizedSlug,
    source: slugSource,
    attempted_sources: slugAttemptedSources,
    fallback_used: slugFallbackUsed,
    found_subscriber: !!subscriber,
    is_master: isMaster,
    subscriber_email: subscriberEmail || null,
    subscriber_id: subscriberId || null,
    miss_reason: slugMissReason || null,
  });

  if (!subscriber && !isMaster) {
    logger.warn('[public/cardapio] Slug nao encontrado nem como subscriber nem como master');
    logPublicSlugTrace('cardapio.not_found', {
      slug: normalizedSlug,
      reason: slugMissReason || 'slug-not-found',
      attempted_sources: slugAttemptedSources,
    });
    throw new Error('Link n\u00e3o encontrado');
  }

  if (subscriber) {
    logger.info(`[public/cardapio] Encontrado subscriber: ${subscriberEmail}`);
  } else {
    logger.info('[public/cardapio] Encontrado master (subscriber_email IS NULL)');
  }

  const {
    storeList,
    dishes,
    categories,
    complementGroups,
    combos,
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
    loyaltyConfigs,
    loyaltyRewards,
    source: menuSource,
    attemptedSources: menuAttemptedSources,
    fallbackUsed: menuFallbackUsed,
    missReason: menuMissReason,
  } = await getMenuEntities(subscriberEmail, isMaster);

  logPublicSlugTrace('cardapio.menu_entities', {
    slug: normalizedSlug,
    source: menuSource,
    attempted_sources: menuAttemptedSources,
    fallback_used: menuFallbackUsed,
    miss_reason: menuMissReason || null,
    store_count: Array.isArray(storeList) ? storeList.length : 0,
    dishes_count: Array.isArray(dishes) ? dishes.length : 0,
    categories_count: Array.isArray(categories) ? categories.length : 0,
    combos_count: Array.isArray(combos) ? combos.length : 0,
  });

  const store = normalizeStoreData(storeList);

  logger.info('[public/cardapio] Retornando dados:', {
    is_master: isMaster,
    subscriber_email: subscriberEmail || 'master',
    store_name: store?.name,
    dishes_count: Array.isArray(dishes) ? dishes.length : 0,
    categories_count: Array.isArray(categories) ? categories.length : 0,
    combos_count: Array.isArray(combos) ? combos.length : 0,
  });

  return {
    subscriber_id: subscriberId || null,
    subscriber_email: subscriberEmail || 'master',
    is_master: isMaster,
    store,
    dishes: Array.isArray(dishes) ? dishes : [],
    categories: Array.isArray(categories) ? categories : [],
    tables: Array.isArray(tables) ? tables : [],
    beverageCategories: Array.isArray(beverageCategories) ? beverageCategories : [],
    complementGroups: Array.isArray(complementGroups) ? complementGroups : [],
    combos: Array.isArray(combos) ? combos : [],
    pizzaSizes: Array.isArray(pizzaSizes) ? pizzaSizes : [],
    pizzaFlavors: Array.isArray(pizzaFlavors) ? pizzaFlavors : [],
    pizzaEdges: Array.isArray(pizzaEdges) ? pizzaEdges : [],
    pizzaExtras: Array.isArray(pizzaExtras) ? pizzaExtras : [],
    pizzaCategories: Array.isArray(pizzaCategories) ? pizzaCategories : [],
    deliveryZones: Array.isArray(deliveryZones) ? deliveryZones : [],
    coupons: Array.isArray(coupons) ? coupons : [],
    promotions: Array.isArray(promotions) ? promotions : [],
    loyaltyConfigs: Array.isArray(loyaltyConfigs) ? loyaltyConfigs : [],
    loyaltyRewards: Array.isArray(loyaltyRewards) ? loyaltyRewards : [],
  };
}

/**
 * Get public branding data by slug for the login page.
 */
export async function getPublicLoginInfo(slug) {
  const normalizedSlug = (slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!normalizedSlug) {
    return { found: false, error: 'Slug inv\u00e1lido' };
  }

  logPublicSlugTrace('login_info.slug_received', {
    slug_received: slug || '',
    normalized_slug: normalizedSlug,
  });

  const {
    subscriber,
    isMaster,
    subscriberEmail,
    source: slugSource,
    attemptedSources: slugAttemptedSources,
    fallbackUsed: slugFallbackUsed,
    missReason: slugMissReason,
  } = await getSubscriberOrMasterBySlug(normalizedSlug);

  logPublicSlugTrace('login_info.slug_resolution', {
    slug: normalizedSlug,
    source: slugSource,
    attempted_sources: slugAttemptedSources,
    fallback_used: slugFallbackUsed,
    found_subscriber: !!subscriber,
    is_master: isMaster,
    subscriber_email: subscriberEmail || null,
    miss_reason: slugMissReason || null,
  });

  if (!subscriber && !isMaster) {
    logPublicSlugTrace('login_info.not_found', {
      slug: normalizedSlug,
      reason: slugMissReason || 'slug-not-found',
      attempted_sources: slugAttemptedSources,
    });
    return { found: false, slug: normalizedSlug };
  }

  const {
    storeList,
    source: menuSource,
    attemptedSources: menuAttemptedSources,
    fallbackUsed: menuFallbackUsed,
    missReason: menuMissReason,
  } = await getMenuEntities(subscriberEmail, isMaster);

  logPublicSlugTrace('login_info.menu_entities', {
    slug: normalizedSlug,
    source: menuSource,
    attempted_sources: menuAttemptedSources,
    fallback_used: menuFallbackUsed,
    miss_reason: menuMissReason || null,
    store_count: Array.isArray(storeList) ? storeList.length : 0,
  });

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
