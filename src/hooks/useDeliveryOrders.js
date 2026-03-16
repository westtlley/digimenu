import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { base44 } from '@/api/base44Client';
import {
  ACTIVE_DELIVERY_FLOW_STATUSES,
  getOrderDeliveryStatus,
} from '@/utils/orderLifecycle';

const FALLBACK_DELIVERY_POLLING_MS = 15000;

/**
 * Hook para gerenciar pedidos de entrega
 */
export function useDeliveryOrders(entregadorId, asSubscriber, asSubscriberId = null, isMaster = false) {
  const scopedEntityOpts = {};
  if (asSubscriberId != null) scopedEntityOpts.as_subscriber_id = asSubscriberId;
  if (asSubscriber) scopedEntityOpts.as_subscriber = asSubscriber;

  const { data: orders = [] } = useQuery({
    queryKey: ['deliveryOrders', entregadorId, asSubscriberId ?? asSubscriber ?? 'me'],
    queryFn: () =>
      base44.entities.Order.filter({
        entregador_id: entregadorId,
        ...scopedEntityOpts,
      }),
    enabled: !!entregadorId && !isMaster,
    refetchInterval: FALLBACK_DELIVERY_POLLING_MS,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['allDeliveryOrders', asSubscriberId ?? asSubscriber ?? 'me'],
    queryFn: async () => {
      const allTenantOrders = await base44.entities.Order.list(null, scopedEntityOpts);
      return allTenantOrders.filter((order) => ACTIVE_DELIVERY_FLOW_STATUSES.has(getOrderDeliveryStatus(order)));
    },
    enabled: isMaster,
    refetchInterval: FALLBACK_DELIVERY_POLLING_MS,
  });

  const displayOrders = isMaster ? allOrders : orders;

  const activeOrders = useMemo(
    () => displayOrders.filter((order) => ACTIVE_DELIVERY_FLOW_STATUSES.has(getOrderDeliveryStatus(order))),
    [displayOrders]
  );

  const completedOrders = useMemo(
    () => displayOrders.filter((order) => getOrderDeliveryStatus(order) === 'delivered'),
    [displayOrders]
  );

  const completedOrdersToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return completedOrders.filter((order) => {
      if (!order.delivered_at) return false;
      const deliveredDate = new Date(order.delivered_at);
      deliveredDate.setHours(0, 0, 0, 0);
      return deliveredDate.getTime() === today.getTime();
    });
  }, [completedOrders]);

  const stats = useMemo(() => {
    const todayEarnings = completedOrdersToday.reduce((sum, order) => sum + (order.delivery_fee || 0), 0);

    const avgDeliveryTime =
      completedOrdersToday.length > 0
        ? completedOrdersToday.reduce((sum, order) => {
            if (!order.picked_up_at || !order.delivered_at) return sum;
            const picked = new Date(order.picked_up_at);
            const delivered = new Date(order.delivered_at);
            return sum + (delivered - picked) / 60000;
          }, 0) / completedOrdersToday.length
        : 0;

    return {
      active: activeOrders.length,
      completed: completedOrders.length,
      completedToday: completedOrdersToday.length,
      todayEarnings,
      avgDeliveryTime: Math.round(avgDeliveryTime),
    };
  }, [activeOrders, completedOrders, completedOrdersToday]);

  return {
    orders: displayOrders,
    activeOrders,
    completedOrders,
    completedOrdersToday,
    stats,
  };
}
