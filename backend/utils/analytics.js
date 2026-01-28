/**
 * Sistema básico de analytics
 * Rastreia métricas de negócio e uso do sistema
 */
import { query } from '../db/postgres.js';

/**
 * Registrar evento de analytics
 */
export async function trackEvent(eventName, properties = {}, userId = null) {
  try {
    const sql = `
      INSERT INTO analytics_events (event_name, properties, user_id, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `;
    
    await query(sql, [
      eventName,
      JSON.stringify(properties),
      userId
    ]);
  } catch (error) {
    // Não bloquear a aplicação se analytics falhar
    console.debug('Analytics event not tracked:', eventName);
  }
}

/**
 * Obter métricas de um período
 */
export async function getMetrics(startDate, endDate, subscriberEmail = null) {
  try {
    const conditions = ['created_at >= $1', 'created_at <= $2'];
    const params = [startDate, endDate];
    
    if (subscriberEmail) {
      conditions.push('subscriber_email = $3');
      params.push(subscriberEmail);
    }
    
    const sql = `
      SELECT 
        event_name,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM analytics_events
      WHERE ${conditions.join(' AND ')}
      GROUP BY event_name, DATE(created_at)
      ORDER BY date DESC, count DESC
    `;
    
    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    return [];
  }
}

/**
 * Dashboard de métricas principais
 */
export async function getDashboardMetrics(subscriberEmail = null) {
  try {
    const conditions = subscriberEmail ? ['subscriber_email = $1'] : [];
    const params = subscriberEmail ? [subscriberEmail] : [];
    
    // Última semana
    const since = new Date();
    since.setDate(since.getDate() - 7);
    conditions.push(`created_at >= $${params.length + 1}`);
    params.push(since);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = `
      SELECT
        event_name,
        COUNT(*) as total,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
      FROM analytics_events
      ${whereClause}
      GROUP BY event_name
      ORDER BY total DESC
      LIMIT 20
    `;
    
    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    return [];
  }
}

/**
 * Eventos importantes para rastrear
 */
export const EVENTS = {
  // Pedidos
  ORDER_CREATED: 'order.created',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  
  // PDV
  PDV_SALE: 'pdv.sale',
  PDV_SALE_COMPLETED: 'pdv.sale.completed',
  
  // Caixa
  CAIXA_OPENED: 'caixa.opened',
  CAIXA_CLOSED: 'caixa.closed',
  
  // Usuários
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_SIGNUP: 'user.signup',
  
  // Assinantes
  SUBSCRIBER_CREATED: 'subscriber.created',
  SUBSCRIBER_ACTIVATED: 'subscriber.activated',
  SUBSCRIBER_DEACTIVATED: 'subscriber.deactivated',
  
  // Sistema
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
};

/**
 * Middleware para rastrear requisições
 */
export function analyticsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Rastrear apenas endpoints importantes
    if (req.path.startsWith('/api/entities') || req.path.startsWith('/api/functions')) {
      trackEvent('api.request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      }, req.user?.id || null);
    }
  });
  
  next();
}

export default {
  trackEvent,
  getMetrics,
  getDashboardMetrics,
  analyticsMiddleware,
  EVENTS
};
