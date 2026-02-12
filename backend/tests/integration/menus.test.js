/**
 * Testes de Integração - Menus e Produtos
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupTestDb, teardownTestDb, cleanTestDb, getTestPool } from '../setup/testDb.js';
import { createTestUser, createTestSubscriber, createTestToken, createAuthHeaders } from '../setup/testHelpers.js';
import { authenticate } from '../../middlewares/auth.js';
import entitiesRoutes from '../../src/routes/entities.routes.js';
import { errorHandler } from '../../middlewares/errorHandler.js';

const app = express();
app.use(express.json());
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

describe('POST /api/entities/Dish', () => {
  it('deve criar produto válido dentro do limite do plano', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'free' });
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Criar 29 produtos primeiro (dentro do limite de 30)
    for (let i = 0; i < 29; i++) {
      await testPool.query(`
        INSERT INTO entities (entity_type, data, subscriber_email)
        VALUES ('Dish', $1::jsonb, $2)
      `, [
        JSON.stringify({ name: `Produto ${i}`, price: 10.50 }),
        subscriber.email
      ]);
    }

    // Criar o 30º produto (deve funcionar)
    const response = await request(app)
      .post('/api/entities/Dish')
      .set(createAuthHeaders(token))
      .send({
        name: 'Produto 30',
        price: 15.00
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('name', 'Produto 30');
  });

  it('deve retornar 403 ao ultrapassar limite do plano Free (30 produtos)', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'free' });
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Criar exatamente 30 produtos
    for (let i = 0; i < 30; i++) {
      await testPool.query(`
        INSERT INTO entities (entity_type, data, subscriber_email)
        VALUES ('Dish', $1::jsonb, $2)
      `, [
        JSON.stringify({ name: `Produto ${i}`, price: 10.50 }),
        subscriber.email
      ]);
    }

    // Tentar criar o 31º produto (deve falhar)
    const response = await request(app)
      .post('/api/entities/Dish')
      .set(createAuthHeaders(token))
      .send({
        name: 'Produto 31',
        price: 15.00
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Limite de produtos excedido');
    expect(response.body.message).toContain('30');
  });

  it('deve permitir produtos ilimitados no plano Pro', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'pro' });
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Criar 100 produtos (plano Pro permite ilimitado)
    for (let i = 0; i < 100; i++) {
      await testPool.query(`
        INSERT INTO entities (entity_type, data, subscriber_email)
        VALUES ('Dish', $1::jsonb, $2)
      `, [
        JSON.stringify({ name: `Produto ${i}`, price: 10.50 }),
        subscriber.email
      ]);
    }

    // Criar mais um produto (deve funcionar)
    const response = await request(app)
      .post('/api/entities/Dish')
      .set(createAuthHeaders(token))
      .send({
        name: 'Produto 101',
        price: 15.00
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('name', 'Produto 101');
  });
});

describe('PUT /api/entities/Dish/:id', () => {
  it('deve editar produto existente', async () => {
    const subscriber = await createTestSubscriber(testPool);
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Criar produto
    const dishResult = await testPool.query(`
      INSERT INTO entities (entity_type, data, subscriber_email)
      VALUES ('Dish', $1::jsonb, $2)
      RETURNING *
    `, [
      JSON.stringify({ name: 'Produto Original', price: 10.00 }),
      subscriber.email
    ]);

    const dishId = dishResult.rows[0].id;

    const response = await request(app)
      .put(`/api/entities/Dish/${dishId}`)
      .set(createAuthHeaders(token))
      .send({
        name: 'Produto Editado',
        price: 15.00
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('name', 'Produto Editado');
  });
});

describe('DELETE /api/entities/Dish/:id', () => {
  it('deve retornar 404 ao deletar produto inexistente', async () => {
    const subscriber = await createTestSubscriber(testPool);
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    const response = await request(app)
      .delete('/api/entities/Dish/999999')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });
});
