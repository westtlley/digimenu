/**
 * Hook para rastreamento de eventos no frontend
 */
import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Eventos do sistema
 */
export const EVENTS = {
  // Navegação
  PAGE_VIEW: 'page.view',
  
  // Pedidos
  ORDER_STARTED: 'order.started',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  
  // Carrinho
  CART_ADD_ITEM: 'cart.add_item',
  CART_REMOVE_ITEM: 'cart.remove_item',
  CART_CLEARED: 'cart.cleared',
  
  // Produtos
  PRODUCT_VIEW: 'product.view',
  PRODUCT_SEARCH: 'product.search',
  
  // Cupons
  COUPON_APPLIED: 'coupon.applied',
  COUPON_REMOVED: 'coupon.removed',
  
  // Usuário
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_SIGNUP: 'user.signup',
};

export function useAnalytics() {
  /**
   * Rastrear evento
   */
  const track = useCallback(async (eventName, properties = {}) => {
    try {
      // Enviar para backend
      await base44.functions.invoke('trackAnalytics', {
        event_name: eventName,
        properties,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer || null
      });
    } catch (error) {
      // Não bloquear a aplicação se analytics falhar
      console.debug('Analytics error:', error);
    }
  }, []);

  /**
   * Rastrear visualização de página
   */
  const trackPageView = useCallback((pageName) => {
    track(EVENTS.PAGE_VIEW, {
      page: pageName,
      path: window.location.pathname
    });
  }, [track]);

  /**
   * Rastrear clique
   */
  const trackClick = useCallback((element, metadata = {}) => {
    track('click', {
      element,
      ...metadata
    });
  }, [track]);

  /**
   * Rastrear conversão
   */
  const trackConversion = useCallback((value, metadata = {}) => {
    track('conversion', {
      value,
      ...metadata
    });
  }, [track]);

  return {
    track,
    trackPageView,
    trackClick,
    trackConversion,
    EVENTS
  };
}

export default useAnalytics;
