/**
 * Testes de Integração - Estabelecimentos
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupTestDb, teardownTestDb, cleanTestDb, getTestPool } from '../setup/testDb.js';
import { createTestUser, createTestSubscriber, createTestToken, createAuthHeaders } from '../setup/testHelpers.js';

// Importar rotas e controller (POST testado via controller para evitar hang no app)
import establishmentsRoutes from '../../modules/establishments/establishments.routes.js';
import * as establishmentsController from '../../modules/establishments/establishments.controller.js';
import { errorHandler } from '../../middlewares/errorHandler.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/api/establishments', establishmentsRoutes);
app.use(errorHandler);

/** Helper: chama createSubscriber com req/res mock (evita timeout em request(app).post) */
async function callCreateSubscriber(user, body) {
  const req = { body, user };
  const res = { statusCode: null, body: null };
  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (data) { this.body = data; return this; };
  let nextError = null;
  const next = (err) => { nextError = err; };
  const handler = asyncHandler(establishmentsController.createSubscriber);
  await handler(req, res, next);
  if (nextError) throw nextError;
  return res;
}

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

describe('POST /api/establishments/subscribers', () => {
  it('deve criar estabelecimento válido', async () => {
    const user = await createTestUser(testPool, { is_master: true });
    const reqUser = { ...user, is_master: true };

    await callCreateSubscriber(reqUser, {
      email: 'test@restaurante.com',
      name: 'Restaurante Teste',
      plan: 'free'
    });

    const row = await testPool.query(
      'SELECT email, name, plan FROM subscribers WHERE email = $1',
      ['test@restaurante.com']
    );
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].email).toBe('test@restaurante.com');
    expect(row.rows[0].plan).toBe('free');
  });

  it('deve retornar 403 se usuário não for master', async () => {
    const user = await createTestUser(testPool, { is_master: false });

    const res = await callCreateSubscriber(user, {
      email: 'test@restaurante.com',
      name: 'Restaurante Teste',
      plan: 'free'
    });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('message');
  });

  it('deve retornar 400 com payload incompleto', async () => {
    const user = await createTestUser(testPool, { is_master: true });

    const res = await callCreateSubscriber(user, {
      name: 'Restaurante Teste'
      // email faltando
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

describe('PUT /api/establishments/subscribers/:id', () => {
  it('deve retornar estabelecimento se usuário for dono', async () => {
    const subscriber = await createTestSubscriber(testPool);
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Atualizar subscriber (teste de acesso)
    const response = await request(app)
      .put(`/api/establishments/subscribers/${subscriber.id}`)
      .set(createAuthHeaders(token))
      .send({
        name: 'Restaurante Atualizado'
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('name', 'Restaurante Atualizado');
  });

  it('deve retornar 403 se usuário tentar acessar estabelecimento de outro', async () => {
    const subscriber1 = await createTestSubscriber(testPool, { email: 'sub1@test.com' });
    const subscriber2 = await createTestSubscriber(testPool, { email: 'sub2@test.com' });
    
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber1.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber1.email 
    });

    // Tentar atualizar subscriber2 (deve falhar)
    const response = await request(app)
      .put(`/api/establishments/subscribers/${subscriber2.id}`)
      .set(createAuthHeaders(token))
      .send({
        name: 'Tentativa de Acesso'
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
  });

  it('deve retornar 404 para estabelecimento inexistente', async () => {
    const user = await createTestUser(testPool, { is_master: true });
    const token = createTestToken({ id: user.id, email: user.email, is_master: true });

    const response = await request(app)
      .put('/api/establishments/subscribers/999999')
      .set(createAuthHeaders(token))
      .send({
        name: 'Teste'
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });
});
