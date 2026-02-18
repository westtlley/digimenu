/**
 * Eventos de métricas para planos e upgrades
 * Alimenta funil, copy futura e precificação dinâmica.
 */

const EVENT_NAMES = {
  upgrade_modal_shown: 'upgrade_modal_shown',
  limit_orders_80_percent: 'limit_orders_80_percent',
  limit_orders_reached: 'limit_orders_reached',
  feature_blocked_by_plan: 'feature_blocked_by_plan',
  addon_volume_clicked: 'addon_volume_clicked',
  plan_upgrade_clicked: 'plan_upgrade_clicked',
  limit_reached_orders: 'limit_reached_orders',
  upgrade_prompt_shown: 'upgrade_prompt_shown'
};

/**
 * Registra evento (console em dev; pode enviar para analytics depois)
 */
export function trackPlanEvent(eventName, payload = {}) {
  const event = {
    name: eventName,
    ...payload,
    timestamp: new Date().toISOString()
  };
  if (typeof window !== 'undefined') {
    try {
      if (window.__planEvents) {
        window.__planEvents.push(event);
      } else {
        window.__planEvents = [event];
      }
      if (import.meta.env?.DEV) {
        console.debug('[PlanEvent]', eventName, payload);
      }
      // Futuro: window.gtag?.('event', eventName, payload); ou similar
    } catch (e) {
      console.warn('trackPlanEvent failed', e);
    }
  }
  return event;
}

export { EVENT_NAMES };
