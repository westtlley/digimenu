/**
 * Rotas de analytics
 */
import express from 'express';
import { query } from '../db/postgres.js';
import * as repo from '../db/repository.js';
import {
  trackEvent,
  getDashboardMetrics,
  getMetrics,
  getCommercialDashboardMetrics
} from '../utils/analytics.js';
import { requireMaster, requirePermission } from '../middlewares/permissions.js';
import { usePostgreSQL, getDb } from '../config/appConfig.js';

const router = express.Router();

const normalizeString = (value, maxLength = 255) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 120);

const resolveSubscriberFromSlug = async (slug) => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  if (usePostgreSQL) {
    const subscriber = await repo.getSubscriberBySlug(normalizedSlug);
    if (subscriber?.email) return { email: subscriber.email, id: subscriber.id ?? null };

    const masterResult = await query(
      'SELECT id, email FROM users WHERE slug = $1 AND is_master = TRUE LIMIT 1',
      [normalizedSlug]
    );
    return masterResult.rows[0]
      ? { email: masterResult.rows[0].email, id: null }
      : null;
  }

  const db = getDb();
  const subscriber = (db?.subscribers || []).find(
    (item) => String(item?.slug || '').toLowerCase() === normalizedSlug
  );
  if (subscriber?.email) return { email: subscriber.email, id: subscriber.id ?? null };

  const master = (db?.users || []).find(
    (item) => item?.is_master && String(item?.slug || '').toLowerCase() === normalizedSlug
  );
  return master?.email ? { email: master.email, id: null } : null;
};

/**
 * POST /api/analytics/events
 * Ingestão de eventos comerciais (público para cardápio)
 */
router.post('/events', async (req, res) => {
  try {
    const body = req.body || {};
    const eventName = normalizeString(body.event_name, 100);
    if (!eventName) {
      return res.status(400).json({ error: 'event_name é obrigatório' });
    }

    const slug = normalizeSlug(body.slug);
    const authSubscriber = {
      id: req.user?.subscriber_id || null,
      email: req.user?.subscriber_email || req.user?.email || null,
    };
    const subscriberFromSlug = await resolveSubscriberFromSlug(slug);
    // Nunca confiar em subscriber_email enviado no body.
    // Isolamento por tenant só por token autenticado ou slug resolvido no backend.
    const subscriberEmail = authSubscriber.email || subscriberFromSlug?.email || null;
    const subscriberId = authSubscriber.id || subscriberFromSlug?.id || null;

    if (!subscriberEmail) {
      return res.json({ ok: true, ignored: true, reason: 'SUBSCRIBER_NOT_RESOLVED' });
    }

    await trackEvent(
      eventName,
      body.properties || {},
      req.user?.id || null,
      {
        subscriberEmail,
        subscriberId,
        slug,
        sessionId: normalizeString(body.session_id || req.headers['x-session-id'], 120),
        path: normalizeString(body.path || req.path, 500),
        category: normalizeString(body.event_category || body.category, 60)
      }
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao registrar evento de analytics:', error);
    // Não bloquear jornada do cliente se analytics falhar.
    return res.json({ ok: true, ignored: true });
  }
});

/**
 * GET /api/analytics/commercial-dashboard
 * Dashboard comercial por assinante (owner/gerente/pdv etc com dashboard_view)
 */
router.get('/commercial-dashboard', requirePermission('dashboard_view'), async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const asSubscriber = normalizeString(req.query.as_subscriber, 255);
    const fromUser = req.user?.subscriber_email || req.user?.email || null;
    const subscriberEmail = req.user?.is_master ? (asSubscriber || fromUser) : fromUser;

    const metrics = await getCommercialDashboardMetrics(subscriberEmail, { days });
    return res.json({
      period_days: Math.max(1, Math.min(90, Number(days || 30))),
      subscriber_email: subscriberEmail,
      metrics
    });
  } catch (error) {
    console.error('Erro ao obter dashboard comercial:', error);
    return res.status(500).json({ error: 'Erro ao obter métricas comerciais' });
  }
});

/**
 * GET /api/analytics/dashboard
 * Dashboard de métricas (apenas master)
 */
router.get('/dashboard', requireMaster(), async (req, res) => {
  try {
    const { subscriber_email } = req.query;
    const metrics = await getDashboardMetrics(subscriber_email || null);
    res.json({ metrics });
  } catch (error) {
    console.error('Erro ao obter dashboard analytics:', error);
    res.status(500).json({ error: 'Erro ao obter métricas' });
  }
});

/**
 * GET /api/analytics/metrics
 * Métricas de um período (apenas master)
 */
router.get('/metrics', requireMaster(), async (req, res) => {
  try {
    const { start_date, end_date, subscriber_email } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date e end_date são obrigatórios' });
    }

    const metrics = await getMetrics(start_date, end_date, subscriber_email || null);
    res.json({ metrics });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ error: 'Erro ao obter métricas' });
  }
});

export default router;
