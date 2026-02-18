import { useMemo } from 'react';
import { usePermission } from '@/components/permissions/usePermission';
import { getPlanLimits, UNLIMITED } from '@/constants/planLimits';

/**
 * Hook de limites do plano (monetização 2.0)
 * Separa permissão (pode usar módulo) de limite (quanto pode usar).
 * Uso vem de subscriberData.usage (backend /user/context) ou do parâmetro.
 *
 * @param {Object} usageOverride - Uso atual opcional { ordersCurrentMonth, productsCount, collaboratorsCount } (sobrescreve contexto)
 * @returns { limits, plan, usage, isOrdersAt80, isOrdersLimitReached, canCreateOrder, canAddProduct, canAddCollaborator, show80Banner }
 */
export function usePlanLimits(usageOverride = {}) {
  const { subscriberData, isMaster } = usePermission();
  const plan = (subscriberData?.plan || 'basic').toString().toLowerCase().trim();
  const usageFromContext = subscriberData?.usage || {};
  const usage = { ...usageFromContext, ...usageOverride };

  const limits = useMemo(() => {
    if (isMaster) return null;
    return getPlanLimits(plan);
  }, [plan, isMaster]);

  const ordersLimit = limits?.orders_per_month ?? UNLIMITED;
  const ordersCurrent = usage.ordersCurrentMonth ?? 0;
  const productsLimit = limits?.products ?? UNLIMITED;
  const productsCurrent = usage.productsCount ?? 0;
  const collaboratorsLimit =
    typeof limits?.collaborators === 'number'
      ? limits.collaborators
      : limits?.collaborators?.total ?? 1;
  const collaboratorsCurrent = usage.collaboratorsCount ?? 0;

  const isOrdersLimitReached = useMemo(() => {
    if (ordersLimit === UNLIMITED) return false;
    return ordersCurrent >= ordersLimit;
  }, [ordersLimit, ordersCurrent]);

  const isOrdersAt80 = useMemo(() => {
    if (ordersLimit === UNLIMITED) return false;
    if (ordersLimit <= 0) return false;
    return ordersCurrent >= ordersLimit * 0.8 && ordersCurrent < ordersLimit;
  }, [ordersLimit, ordersCurrent]);

  const canCreateOrder = useMemo(() => {
    if (isMaster) return true;
    if (ordersLimit === UNLIMITED) return true;
    return ordersCurrent < ordersLimit;
  }, [isMaster, ordersLimit, ordersCurrent]);

  const canAddProduct = useMemo(() => {
    if (isMaster) return true;
    if (productsLimit === UNLIMITED) return true;
    return productsCurrent < productsLimit;
  }, [isMaster, productsLimit, productsCurrent]);

  const canAddCollaborator = useMemo(() => {
    if (isMaster) return true;
    if (collaboratorsLimit === UNLIMITED) return true;
    return collaboratorsCurrent < collaboratorsLimit;
  }, [isMaster, collaboratorsLimit, collaboratorsCurrent]);

  const show80Banner = useMemo(() => {
    if (!limits?.upgradeTriggers?.orders_80_percent) return false;
    return isOrdersAt80;
  }, [limits, isOrdersAt80]);

  return {
    plan,
    limits,
    usage: {
      ordersCurrentMonth: ordersCurrent,
      productsCount: productsCurrent,
      collaboratorsCount: collaboratorsCurrent,
    },
    isOrdersAt80,
    isOrdersLimitReached,
    canCreateOrder,
    canAddProduct,
    canAddCollaborator,
    show80Banner,
    isMaster,
  };
}
