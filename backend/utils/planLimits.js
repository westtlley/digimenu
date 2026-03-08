/**
 * Limites operacionais por plano (Monetização Agressiva 2.0) - Backend
 * Alinhado ao frontend src/constants/planLimits.js
 * -1 = ilimitado
 */

import { normalizePlanPresetKey } from './planPresetsForContext.js';

const UNLIMITED = -1;

const PLAN_LIMITS = {
  free: {
    orders_per_month: 200,
    products: 20,
    collaborators: 0,
    locations: 1,
  },
  basic: {
    orders_per_month: 600,
    products: 150,
    collaborators: 2,
    locations: 1,
  },
  pro: {
    orders_per_month: 3000,
    products: 800,
    collaborators: 5,
    locations: 2,
  },
  ultra: {
    orders_per_month: UNLIMITED,
    products: UNLIMITED,
    collaborators: 20,
    locations: 5,
  },
  admin: null,
  custom: null,
  premium: null,
};
PLAN_LIMITS.premium = PLAN_LIMITS.ultra;
PLAN_LIMITS.admin = PLAN_LIMITS.ultra;

function getBaseLimits(plan) {
  const key = normalizePlanPresetKey(plan, { defaultPlan: null, allowNull: true });
  if (key === 'custom' || !key) return null;
  return PLAN_LIMITS[key] || PLAN_LIMITS.basic;
}

/**
 * Limites efetivos = base do plano + add-ons (ex.: orders_per_month + addons.orders)
 * @param {string} plan - free, basic, pro, ultra
 * @param {Object} addons - { orders?: number } (0, 1000, 3000, 5000)
 * @returns {Object} effective limits (orders_per_month, products, collaborators, locations)
 */
function getEffectiveLimits(plan, addons = {}) {
  const base = getBaseLimits(plan);
  if (!base) return null;

  const addonsOrders = Number(addons?.orders) || 0;
  const effectiveOrders =
    base.orders_per_month === UNLIMITED
      ? UNLIMITED
      : Math.max(0, base.orders_per_month + addonsOrders);

  return {
    orders_per_month: effectiveOrders,
    products: base.products,
    collaborators: base.collaborators,
    locations: base.locations,
  };
}

export { UNLIMITED, PLAN_LIMITS, getBaseLimits, getEffectiveLimits };
