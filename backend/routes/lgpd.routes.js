import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as repo from '../db/repository.js';

const router = express.Router();

// Exportar dados do cliente
router.post('/export/:customerId', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Buscar cliente
    const customers = await repo.listEntities('Customer', req.user);
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar pedidos do cliente
    const orders = await repo.listEntities('Order', req.user);
    const customerOrders = orders.filter(o => 
      o.customer_email === customer.email || 
      o.customer_phone === customer.phone
    );

    // Montar dados para exportação
    const exportData = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      },
      orders: customerOrders.map(order => ({
        id: order.id,
        order_code: order.order_code,
        total: order.total,
        status: order.status,
        payment_method: order.payment_method,
        delivery_type: order.delivery_type,
        created_date: order.created_date,
        items: order.items || [],
      })),
      exported_at: new Date().toISOString(),
      exported_by: req.user?.email || 'system',
    };

    // Marcar como exportado
    await repo.updateEntity('Customer', customerId, {
      lgpd_exported: true,
      lgpd_exported_at: new Date().toISOString(),
    }, req.user);

    res.json(exportData);
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Remover dados do cliente (direito ao esquecimento)
router.post('/delete/:customerId', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Buscar cliente
    const customers = await repo.listEntities('Customer', req.user);
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Anonimizar dados do cliente (LGPD - não deletar, mas anonimizar)
    await repo.updateEntity('Customer', customerId, {
      name: '[Dados Removidos]',
      email: `removed_${Date.now()}@deleted.local`,
      phone: null,
      address: null,
      complement: null,
      neighborhood: null,
      city: null,
      zipcode: null,
      lgpd_deleted: true,
      lgpd_deleted_at: new Date().toISOString(),
    }, req.user);

    // Anonimizar pedidos relacionados
    const orders = await repo.listEntities('Order', req.user);
    const customerOrders = orders.filter(o => 
      o.customer_email === customer.email || 
      o.customer_phone === customer.phone
    );

    for (const order of customerOrders) {
      await repo.updateEntity('Order', order.id, {
        customer_name: '[Dados Removidos]',
        customer_email: `removed_${Date.now()}@deleted.local`,
        customer_phone: null,
        customer_address: null,
      }, req.user);
    }

    res.json({ 
      success: true, 
      message: 'Dados anonimizados conforme LGPD' 
    });
  } catch (error) {
    console.error('Erro ao remover dados:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Listar solicitações LGPD
router.get('/requests', authenticate, async (req, res) => {
  try {
    const requests = await repo.listEntities('LGPDRequest', req.user);
    res.json(requests);
  } catch (error) {
    console.error('Erro ao listar solicitações LGPD:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar solicitação LGPD
router.post('/request', async (req, res) => {
  try {
    const { customer_email, request_type, description } = req.body;
    
    const request = await repo.createEntity('LGPDRequest', {
      customer_email,
      request_type, // 'export', 'delete', 'update'
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, null);

    res.status(201).json(request);
  } catch (error) {
    console.error('Erro ao criar solicitação LGPD:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
