/**
 * Testes de Integração - Pedidos
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupTestDb, teardownTestDb, cleanTestDb, getTestPool } from '../setup/testDb.js';
import { createTestUser, createTestSubscriber, createTestToken, createAuthHeaders } from '../setup/testHelpers.js';
import { validateStatusTransition } from '../../services/orderStatusValidation.service.js';
import { authenticate } from '../../middlewares/auth.js';
import ordersRoutes from '../../modules/orders/orders.routes.js';
import entitiesRoutes from '../../src/routes/entities.routes.js';
import { errorHandler } from '../../middlewares/errorHandler.js';

const app = express();
app.use(express.json());

// Rotas públicas de orders (já tem /public/pedido-mesa dentro)
app.use('/api', ordersRoutes);

// Rotas protegidas de entities
app.use('/api/entities', authenticate, entitiesRoutes);
app.use(errorHandler);

let testPool = null;

beforeAll(async () => {
  try {
    testPool = await setupTestDb();
  } catch (error) {
    console.warn('⚠️ Banco de teste não disponível. Testes podem falhar.');
  }
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  if (testPool) {
    await cleanTestDb();
  }
});

describe('POST /api/public/pedido-mesa', () => {
  it('deve criar pedido válido', async () => {
    const subscriber = await createTestSubscriber(testPool, { slug: 'test-slug' });
    
    const response = await request(app)
      .post('/api/public/pedido-mesa')
      .send({
        slug: 'test-slug',
        table_number: 1,
        items: [
          { dish_id: 1, quantity: 2, price: 10.00 }
        ],
        total: 20.00,
        customer_name: 'Cliente Teste'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('order_code');
    expect(response.body.data).toHaveProperty('status', 'new');
  });

  it('deve retornar 400 com payload incompleto', async () => {
    // H1: Criar subscriber antes para que o slug exista (evita erro "Link não encontrado")
    await createTestSubscriber(testPool, { slug: 'test-slug' });
    
    const response = await request(app)
      .post('/api/public/pedido-mesa')
      .send({
        slug: 'test-slug'
        // items e total faltando
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });
});

describe('Transições de Status de Pedido', () => {
  it('deve permitir transição válida: new → accepted', () => {
    const validation = validateStatusTransition('new', 'accepted');
    expect(validation.valid).toBe(true);
  });

  it('deve permitir transição válida: accepted → preparing', () => {
    const validation = validateStatusTransition('accepted', 'preparing');
    expect(validation.valid).toBe(true);
  });

  it('deve permitir transição válida: preparing → ready', () => {
    const validation = validateStatusTransition('preparing', 'ready');
    expect(validation.valid).toBe(true);
  });

  it('deve permitir transição válida: ready → delivered', () => {
    const validation = validateStatusTransition('ready', 'delivered');
    expect(validation.valid).toBe(true);
  });

  it('deve rejeitar transição inválida: new → delivered', () => {
    const validation = validateStatusTransition('new', 'delivered');
    expect(validation.valid).toBe(false);
    expect(validation.message).toContain('Transição inválida');
  });

  it('deve rejeitar alteração de status final: delivered → new', () => {
    const validation = validateStatusTransition('delivered', 'new');
    expect(validation.valid).toBe(false);
    expect(validation.message).toContain('não pode ser alterado');
  });

  it('deve rejeitar alteração de status final: cancelled → new', () => {
    const validation = validateStatusTransition('cancelled', 'new');
    expect(validation.valid).toBe(false);
    expect(validation.message).toContain('não pode ser alterado');
  });
});

describe('PUT /api/entities/Order/:id', () => {
  it('deve alterar status válido', async () => {
    const subscriber = await createTestSubscriber(testPool);
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email,
      profile_role: 'admin' // H3: Usuário precisa ter role para alterar status
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email,
      profile_role: 'admin' // H3: Token também precisa ter role
    });

    // Criar pedido
    const orderResult = await testPool.query(`
      INSERT INTO entities (entity_type, data, subscriber_email)
      VALUES ('Order', $1::jsonb, $2)
      RETURNING *
    `, [
      JSON.stringify({ 
        order_code: 'TEST001',
        status: 'new',
        total: 20.00
      }),
      subscriber.email
    ]);

    const orderId = orderResult.rows[0].id;

    const response = await request(app)
      .put(`/api/entities/Order/${orderId}`)
      .set(createAuthHeaders(token))
      .send({
        status: 'accepted'
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('status', 'accepted');
  });

  it('deve retornar 400 ao alterar status inválido', async () => {
    const subscriber = await createTestSubscriber(testPool);
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email,
      profile_role: 'admin' // H3: Usuário precisa ter role para alterar status
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email,
      profile_role: 'admin' // H3: Token também precisa ter role
    });

    // Criar pedido
    const orderResult = await testPool.query(`
      INSERT INTO entities (entity_type, data, subscriber_email)
      VALUES ('Order', $1::jsonb, $2)
      RETURNING *
    `, [
      JSON.stringify({ 
        order_code: 'TEST002',
        status: 'new',
        total: 20.00
      }),
      subscriber.email
    ]);

    const orderId = orderResult.rows[0].id;

    const response = await request(app)
      .put(`/api/entities/Order/${orderId}`)
      .set(createAuthHeaders(token))
      .send({
        status: 'delivered' // Transição inválida: new → delivered
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Transição inválida');
  });

  it('deve retornar 403 se usuário sem permissão tentar alterar status', async () => {
    const subscriber = await createTestSubscriber(testPool);
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email,
      profile_role: 'entregador' // Role sem permissão para alterar status
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Criar pedido
    const orderResult = await testPool.query(`
      INSERT INTO entities (entity_type, data, subscriber_email)
      VALUES ('Order', $1::jsonb, $2)
      RETURNING *
    `, [
      JSON.stringify({ 
        order_code: 'TEST003',
        status: 'new',
        total: 20.00
      }),
      subscriber.email
    ]);

    const orderId = orderResult.rows[0].id;

    const response = await request(app)
      .put(`/api/entities/Order/${orderId}`)
      .set(createAuthHeaders(token))
      .send({
        status: 'accepted'
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
  });
});
