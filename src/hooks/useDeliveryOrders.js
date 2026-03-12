import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { base44 } from '@/api/base44Client';
import { ORDER_STATUS } from '@/utils/constants';

const FALLBACK_DELIVERY_POLLING_MS = 15000;

/**
 * Hook para gerenciar pedidos de entrega
 */
export function useDeliveryOrders(entregadorId, asSubscriber, isMaster = false) {
  const { data: orders = [] } = useQuery({
    queryKey: ['deliveryOrders', entregadorId, asSubscriber ?? 'me'],
    queryFn: () =>
      base44.entities.Order.filter({
        entregador_id: entregadorId,
        ...(asSubscriber && { as_subscriber: asSubscriber }),
      }),
    enabled: !!entregadorId && !isMaster,
    refetchInterval: FALLBACK_DELIVERY_POLLING_MS,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['allDeliveryOrders', asSubscriber ?? 'me'],
    queryFn: async () => {
      const allTenantOrders = await base44.entities.Order.list(null, asSubscriber ? { as_subscriber: asSubscriber } : {});
      return allTenantOrders.filter((order) =>
        [
          ORDER_STATUS.GOING_TO_STORE,
          ORDER_STATUS.ARRIVED_AT_STORE,
          ORDER_STATUS.PICKED_UP,
          ORDER_STATUS.OUT_FOR_DELIVERY,
          ORDER_STATUS.ARRIVED_AT_CUSTOMER,
        ].includes(order.status)
      );
    },
    enabled: isMaster,
    refetchInterval: FALLBACK_DELIVERY_POLLING_MS,
  });

  const displayOrders = isMaster ? allOrders : orders;

  const activeOrders = useMemo(
    () =>
      displayOrders.filter((order) =>
        [
          ORDER_STATUS.GOING_TO_STORE,
          ORDER_STATUS.ARRIVED_AT_STORE,
          ORDER_STATUS.PICKED_UP,
          ORDER_STATUS.OUT_FOR_DELIVERY,
          ORDER_STATUS.ARRIVED_AT_CUSTOMER,
        ].includes(order.status)
      ),
    [displayOrders]
  );

  const completedOrders = useMemo(
    () => displayOrders.filter((order) => order.status === ORDER_STATUS.DELIVERED),
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
