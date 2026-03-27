import express from 'express';
import {
  listMediaAssets,
  listPopularMediaAssets,
  listRecentMediaAssets,
  registerMediaAssets,
  resolveMediaTenantScope,
  updateMediaAsset,
} from '../utils/mediaService.js';

const router = express.Router();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildScopeOptions = (req) => ({
  user: req.user,
  subscriberId: req.query?.as_subscriber_id ?? req.body?.as_subscriber_id ?? null,
  subscriberEmail: req.query?.as_subscriber ?? req.body?.as_subscriber ?? null,
});

const resolveLimit = (value, fallback) => clamp(toNumber(value, fallback), 1, 60);
const resolveOffset = (value) => Math.max(0, toNumber(value, 0));

async function resolveScopeOrFail(req, res, actionLabel) {
  const scope = await resolveMediaTenantScope(buildScopeOptions(req));
  if (!scope?.tenantKey) {
    res.status(400).json({ error: `Tenant nao encontrado para ${actionLabel}` });
    return null;
  }
  return scope;
}

router.get('/', async (req, res) => {
  try {
    const scope = await resolveScopeOrFail(req, res, 'listar ativos de midia');
    if (!scope) return;

    const payload = await listMediaAssets({
      scope,
      type: req.query?.type || 'all',
      module: req.query?.module || 'all',
      search: req.query?.search || '',
      limit: resolveLimit(req.query?.limit, 24),
      offset: resolveOffset(req.query?.offset),
    });

    return res.json({
      success: true,
      scope,
      ...payload,
    });
  } catch (error) {
    console.error('Erro ao listar ativos de midia:', error);
    return res.status(500).json({ error: 'Erro ao listar ativos de midia' });
  }
});

router.get('/popular', async (req, res) => {
  try {
    const scope = await resolveScopeOrFail(req, res, 'listar ativos populares');
    if (!scope) return;

    const payload = await listPopularMediaAssets({
      scope,
      type: req.query?.type || 'all',
      module: req.query?.module || 'all',
      search: req.query?.search || '',
      limit: resolveLimit(req.query?.limit, 6),
      offset: resolveOffset(req.query?.offset),
    });

    return res.json({
      success: true,
      scope,
      ...payload,
    });
  } catch (error) {
    console.error('Erro ao listar ativos populares de midia:', error);
    return res.status(500).json({ error: 'Erro ao listar ativos populares de midia' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const scope = await resolveScopeOrFail(req, res, 'listar ativos recentes');
    if (!scope) return;

    const payload = await listRecentMediaAssets({
      scope,
      type: req.query?.type || 'all',
      module: req.query?.module || 'all',
      search: req.query?.search || '',
      limit: resolveLimit(req.query?.limit, 6),
      offset: resolveOffset(req.query?.offset),
    });

    return res.json({
      success: true,
      scope,
      ...payload,
    });
  } catch (error) {
    console.error('Erro ao listar ativos recentes de midia:', error);
    return res.status(500).json({ error: 'Erro ao listar ativos recentes de midia' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const scope = await resolveScopeOrFail(req, res, 'registrar ativos de midia');
    if (!scope) return;

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const savedItems = await registerMediaAssets({ scope, items });

    return res.json({
      success: true,
      scope,
      items: savedItems,
      saved_count: savedItems.length,
    });
  } catch (error) {
    console.error('Erro ao registrar ativos de midia:', error);
    return res.status(500).json({ error: 'Erro ao registrar ativos de midia' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const scope = await resolveScopeOrFail(req, res, 'atualizar ativo de midia');
    if (!scope) return;

    const item = await updateMediaAsset({
      scope,
      assetId: req.params?.id,
      patch: req.body || {},
    });

    return res.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error('Erro ao atualizar ativo de midia:', error);
    const message = error?.message || 'Erro ao atualizar ativo de midia';
    const statusCode = message.includes('nao encontrado') ? 404 : 500;
    return res.status(statusCode).json({ error: message });
  }
});

export default router;
