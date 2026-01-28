/**
 * Rotas de analytics
 */
import express from 'express';
import { getDashboardMetrics, getMetrics } from '../utils/analytics.js';
import { requireMaster } from '../middlewares/permissions.js';

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Dashboard de métricas (apenas master)
 */
router.get('/dashboard', requireMaster, async (req, res) => {
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
 * Métricas de um período
 */
router.get('/metrics', requireMaster, async (req, res) => {
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
