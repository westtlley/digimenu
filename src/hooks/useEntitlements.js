import { useMemo } from 'react';
import { usePermission } from '@/components/permissions/usePermission';
import { getPlanLimits, UNLIMITED } from '@/constants/planLimits';

/**
 * Hook de entitlements (limites efetivos + uso) para Monetização 2.0.
 * Backend é fonte de verdade; fallback para getPlanLimits + addons se effectiveLimits não vier.
 * Fail-open: se falha ao carregar, não bloquear por limite (logar).
 */
export function useEntitlements() {
  const { subscriberData, isMaster } = usePermission();

  const plan = useMemo(
    () => (subscriberData?.plan || 'basic').toString().toLowerCase().trim(),
    [subscriberData?.plan]
  );

  const usage = useMemo(() => {
    const u = subscriberData?.usage || {};
    return {
      ordersCurrentMonth: u.ordersCurrentMonth ?? 0,
      productsCount: u.productsCount ?? 0,
      collaboratorsCount: u.collaboratorsCount ?? 0,
      locationsCount: u.locationsCount ?? 0,
    };
  }, [subscriberData?.usage]);

  const addons = useMemo(() => {
    const a = subscriberData?.addons;
    if (a && typeof a === 'object') return a;
    return {};
  }, [subscriberData?.addons]);

  const effectiveLimits = useMemo(() => {
    if (isMaster) return null;
    const fromBackend = subscriberData?.effectiveLimits;
    if (fromBackend && typeof fromBackend === 'object') return fromBackend;
    const base = getPlanLimits(plan);
    if (!base) return null;
    const addonsOrders = Number(addons?.orders) || 0;
    const orders =
      base.orders_per_month === UNLIMITED
        ? UNLIMITED
        : Math.max(0, (base.orders_per_month ?? 0) + addonsOrders);
    return {
      orders_per_month: orders,
      products: base.products ?? UNLIMITED,
      collaborators: base.collaborators ?? 0,
      locations: base.locations ?? 1,
    };
  }, [isMaster, subscriberData?.effectiveLimits, plan, addons?.orders]);

  const percentUsed = useMemo(() => {
    if (!effectiveLimits) return {};
    const cap = (limit, current) => {
      if (limit === UNLIMITED || limit <= 0) return 0;
      return Math.min(100, Math.round((current / limit) * 100));
    };
    return {
      orders: cap(effectiveLimits.orders_per_month, usage.ordersCurrentMonth),
      products: cap(effectiveLimits.products, usage.productsCount),
      collaborators: cap(effectiveLimits.collaborators, usage.collaboratorsCount),
      locations: cap(effectiveLimits.locations, usage.locationsCount),
    };
  }, [effectiveLimits, usage]);

  const canCreateOrder = useMemo(() => {
    if (isMaster) return true;
    if (!effectiveLimits) return true;
    const limit = effectiveLimits.orders_per_month;
    if (limit === UNLIMITED) return true;
    return usage.ordersCurrentMonth < limit;
  }, [isMaster, effectiveLimits, usage.ordersCurrentMonth]);

  const canAddProduct = useMemo(() => {
    if (isMaster) return true;
    if (!effectiveLimits) return true;
    const limit = effectiveLimits.products;
    if (limit === UNLIMITED) return true;
    return usage.productsCount < limit;
  }, [isMaster, effectiveLimits, usage.productsCount]);

  const canAddCollaborator = useMemo(() => {
    if (isMaster) return true;
    if (!effectiveLimits) return true;
    const limit = effectiveLimits.collaborators;
    if (limit === UNLIMITED) return true;
    return usage.collaboratorsCount < limit;
  }, [isMaster, effectiveLimits, usage.collaboratorsCount]);

  const canAddLocation = useMemo(() => {
    if (isMaster) return true;
    if (!effectiveLimits) return true;
    const limit = effectiveLimits.locations;
    if (limit === UNLIMITED) return true;
    return usage.locationsCount < limit;
  }, [isMaster, effectiveLimits, usage.locationsCount]);

  const canPerform = useMemo(() => {
    return (actionContext) => {
      if (isMaster) return true;
      const type = actionContext?.type;
      if (type === 'orders' || type === 'create_order') return canCreateOrder;
      if (type === 'products' || type === 'create_product') return canAddProduct;
      if (type === 'collaborators' || type === 'add_collaborator') return canAddCollaborator;
      if (type === 'locations' || type === 'add_location') return canAddLocation;
      return true;
    };
  }, [isMaster, canCreateOrder, canAddProduct, canAddCollaborator, canAddLocation]);

  const limitReached = useMemo(
    () => ({
      orders: !canCreateOrder,
      products: !canAddProduct,
      collaborators: !canAddCollaborator,
      locations: !canAddLocation,
    }),
    [canCreateOrder, canAddProduct, canAddCollaborator, canAddLocation]
  );

  return {
    plan,
    limits: effectiveLimits ? { ...effectiveLimits } : null,
    usage: { ...usage },
    effectiveLimits: effectiveLimits ? { ...effectiveLimits } : null,
    addons: { ...addons },
    percentUsed,
    canPerform,
    canCreateOrder,
    canAddProduct,
    canAddCollaborator,
    canAddLocation,
    limitReached,
    isMaster,
  };
}
