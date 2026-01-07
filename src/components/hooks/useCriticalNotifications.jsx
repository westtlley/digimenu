import { useMessageAlerts } from './useMessageAlerts';
import { useOrderAlerts } from './useOrderAlerts';

/**
 * Hook principal que agrega todas as notificações críticas
 */
export function useCriticalNotifications(entregadorId) {
  const messageAlerts = useMessageAlerts(entregadorId);
  const orderAlerts = useOrderAlerts(entregadorId);

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