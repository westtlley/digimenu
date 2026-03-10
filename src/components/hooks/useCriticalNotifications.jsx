import { useMessageAlerts } from './useMessageAlerts';
import { useOrderAlerts } from './useOrderAlerts';

/**
 * Hook principal que agrega todas as notificações críticas
 */
export function useCriticalNotifications(entregadorId, options = {}) {
  const messageAlerts = useMessageAlerts(entregadorId, options);
  const orderAlerts = useOrderAlerts(entregadorId, options);

  const hasCriticalAlerts = 
    messageAlerts.pendingMessages.length > 0 || 
    orderAlerts.pendingOrders.length > 0;

  return {
    messages: messageAlerts,
    orders: orderAlerts,
    hasCriticalAlerts,
    loading: messageAlerts.loading || orderAlerts.loading
  };
}
