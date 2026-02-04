import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as repo from '../db/repository.js';

const router = express.Router();

// Listar afiliados
router.get('/', authenticate, async (req, res) => {
  try {
    const affiliates = await repo.listEntities('Affiliate', req.user);
    res.json(affiliates);
  } catch (error) {
    console.error('Erro ao listar afiliados:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar afiliado
router.post('/', authenticate, async (req, res) => {
  try {
    const { email, name, commission_rate } = req.body;
    
    // Gerar código único de afiliado
    const affiliateCode = `AFF${Date.now().toString(36).toUpperCase()}`;
    
    const affiliate = await repo.createEntity('Affiliate', {
      email,
      name,
      affiliate_code: affiliateCode,
      commission_rate: commission_rate || 10,
      status: 'active',
      total_referrals: 0,
      total_commissions: 0,
    }, req.user);

    res.status(201).json(affiliate);
  } catch (error) {
    console.error('Erro ao criar afiliado:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Registrar indicação
router.post('/referral', authenticate, async (req, res) => {
  try {
    const { affiliate_code, order_id, referred_email, referred_name } = req.body;
    
    // Buscar afiliado
    const affiliates = await repo.listEntities('Affiliate', req.user);
    const affiliate = affiliates.find(a => a.affiliate_code === affiliate_code);
    
    if (!affiliate) {
      return res.status(404).json({ error: 'Código de afiliado inválido' });
    }

    // Buscar pedido
    const orders = await repo.listEntities('Order', req.user);
    const order = orders.find(o => o.id === order_id);
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Calcular comissão
    const commission = (order.total || 0) * (affiliate.commission_rate / 100);

    // Criar indicação
    const referral = await repo.createEntity('Referral', {
      affiliate_id: affiliate.id,
      affiliate_code,
      order_id,
      referred_email,
      referred_name,
      order_total: order.total,
      commission,
      status: order.status === 'delivered' ? 'completed' : 'pending',
      paid: false,
    }, req.user);

    // Atualizar estatísticas do afiliado
    await repo.updateEntity('Affiliate', affiliate.id, {
      total_referrals: (affiliate.total_referrals || 0) + 1,
      total_commissions: (affiliate.total_commissions || 0) + commission,
    }, req.user);

    res.status(201).json(referral);
  } catch (error) {
    console.error('Erro ao registrar indicação:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Listar indicações
router.get('/referrals', authenticate, async (req, res) => {
  try {
    const referrals = await repo.listEntities('Referral', req.user);
    res.json(referrals);
  } catch (error) {
    console.error('Erro ao listar indicações:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
