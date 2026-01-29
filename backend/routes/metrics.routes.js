import express from 'express';
import { calculateAllMetrics } from '../utils/saasMetrics.js';
import { listSubscribers } from '../db/repository.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/metrics/saas
 * Retorna todas as métricas SaaS calculadas
 * APENAS ADMIN MASTER
 */
router.get('/saas', async (req, res) => {
  try {
    // Verificar se o usuário é admin master
    if (!req.user || !req.user.is_master) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas Admin Master pode acessar métricas.'
      });
    }
    
    logger.log('📊 Calculando métricas SaaS...');
    
    // Buscar todos os assinantes
    const subscribers = await listSubscribers();
    
    // TODO: Buscar dados históricos (MRR mês a mês)
    // Por enquanto, array vazio
    const historicalData = [];
    
    // TODO: Integrar com dados reais de marketing
    const marketingSpend = 0;
    
    // Calcular todas as métricas
    const metrics = calculateAllMetrics(subscribers, historicalData, marketingSpend);
    
    logger.log('✅ Métricas calculadas:', {
      mrr: metrics.mrr,
      arr: metrics.arr,
      totalSubscribers: metrics.totalSubscribers,
      activeSubscribers: metrics.activeSubscribers
    });
    
    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    logger.error('❌ Erro ao calcular métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao calcular métricas',
      details: error.message
    });
  }
});

/**
 * GET /api/metrics/growth
 * Retorna dados de crescimento (MRR e assinantes mês a mês)
 * APENAS ADMIN MASTER
 */
router.get('/growth', async (req, res) => {
  try {
    if (!req.user || !req.user.is_master) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado'
      });
    }
    
    // TODO: Implementar busca de dados históricos no banco
    // Por enquanto, retornar dados simulados para os últimos 6 meses
    const now = new Date();
    const mockData = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      mockData.push({
        month: monthName,
        mrr: Math.random() * 5000 + 1000, // Simulado
        subscribers: Math.floor(Math.random() * 50 + 10) // Simulado
      });
    }
    
    res.json({
      success: true,
      data: mockData
    });
    
  } catch (error) {
    logger.error('❌ Erro ao buscar dados de crescimento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados de crescimento'
    });
  }
});

export default router;
