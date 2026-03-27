import express from 'express';
import {
  getBeverageIntelligenceSnapshot,
  normalizeBeverageMetricsSnapshot,
  normalizeBeverageStrategySnapshot,
  resolveBeverageTenantScope,
  saveBeverageMetricsSnapshot,
  saveBeverageStrategySnapshot,
} from '../utils/beverageIntelligence.js';

const publicRouter = express.Router();
const privateRouter = express.Router();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

publicRouter.get('/intelligence/:slug', async (req, res) => {
  try {
    const scope = await resolveBeverageTenantScope({ slug: req.params?.slug || '' });
    if (!scope?.tenantKey) {
      return res.status(404).json({ error: 'Estabelecimento nao encontrado' });
    }

    const snapshot = await getBeverageIntelligenceSnapshot({
      scope,
      days: clamp(toNumber(req.query?.days, 45), 7, 120),
      includeSensitive: false,
    });

    return res.json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    console.error('Erro ao obter inteligencia publica de bebidas:', error);
    return res.status(500).json({ error: 'Erro ao obter inteligencia publica de bebidas' });
  }
});

privateRouter.get('/intelligence', async (req, res) => {
  try {
    const scope = await resolveBeverageTenantScope({
      user: req.user,
      subscriberId: req.query?.as_subscriber_id ?? null,
      subscriberEmail: req.query?.as_subscriber ?? null,
    });

    if (!scope?.tenantKey) {
      return res.status(400).json({ error: 'Tenant nao encontrado para inteligencia de bebidas' });
    }

    const snapshot = await getBeverageIntelligenceSnapshot({
      scope,
      days: clamp(toNumber(req.query?.days, 45), 7, 120),
      includeSensitive: true,
    });

    return res.json({
      success: true,
      scope,
      ...snapshot,
    });
  } catch (error) {
    console.error('Erro ao obter inteligencia de bebidas:', error);
    return res.status(500).json({ error: 'Erro ao obter inteligencia de bebidas' });
  }
});

privateRouter.put('/intelligence/metrics', async (req, res) => {
  try {
    const scope = await resolveBeverageTenantScope({
      user: req.user,
      subscriberId: req.query?.as_subscriber_id ?? null,
      subscriberEmail: req.query?.as_subscriber ?? null,
    });

    if (!scope?.tenantKey) {
      return res.status(400).json({ error: 'Tenant nao encontrado para salvar metricas de bebidas' });
    }

    const rawMetrics = req.body?.metrics || req.body?.metrics_by_beverage || {};
    const normalized = normalizeBeverageMetricsSnapshot(rawMetrics);
    const savedMetrics = await saveBeverageMetricsSnapshot({
      scope,
      metrics: normalized,
    });

    return res.json({
      success: true,
      metrics_by_beverage: savedMetrics,
      saved_count: Object.keys(savedMetrics || {}).length,
    });
  } catch (error) {
    console.error('Erro ao salvar metricas de bebidas:', error);
    return res.status(500).json({ error: 'Erro ao salvar metricas de bebidas' });
  }
});

privateRouter.put('/intelligence/strategy', async (req, res) => {
  try {
    const scope = await resolveBeverageTenantScope({
      user: req.user,
      subscriberId: req.query?.as_subscriber_id ?? null,
      subscriberEmail: req.query?.as_subscriber ?? null,
    });

    if (!scope?.tenantKey) {
      return res.status(400).json({ error: 'Tenant nao encontrado para salvar estrategia de bebidas' });
    }

    const rawStrategies = req.body?.strategies || req.body?.strategy_data || {};
    const normalized = normalizeBeverageStrategySnapshot(rawStrategies);
    const savedStrategy = await saveBeverageStrategySnapshot({
      scope,
      strategies: normalized,
    });

    return res.json({
      success: true,
      strategy_data: savedStrategy,
      saved_count: Object.keys(savedStrategy || {}).length,
    });
  } catch (error) {
    console.error('Erro ao salvar estrategia de bebidas:', error);
    return res.status(500).json({ error: 'Erro ao salvar estrategia de bebidas' });
  }
});

export { publicRouter as publicBeverageIntelligenceRouter, privateRouter as beverageIntelligenceRouter };
export default privateRouter;
