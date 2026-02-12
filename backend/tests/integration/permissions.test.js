/**
 * Testes de Integração - Permissões e Middlewares
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupTestDb, teardownTestDb, cleanTestDb, getTestPool } from '../setup/testDb.js';
import { createTestUser, createTestSubscriber, createTestToken, createAuthHeaders } from '../setup/testHelpers.js';
import { requirePermission, requireAccess, requireMaster } from '../../middlewares/permissions.js';
import { authenticate } from '../../middlewares/auth.js';

const app = express();
app.use(express.json());

// Rotas de teste para middlewares
// IMPORTANTE: authenticate deve vir ANTES dos middlewares de permissão
app.get('/test/require-permission', authenticate, requirePermission('orders_advanced'), (req, res) => {
  res.json({ success: true });
});

app.get('/test/require-access', authenticate, requireAccess('reports'), (req, res) => {
  res.json({ success: true });
});

app.get('/test/require-master', authenticate, requireMaster(), (req, res) => {
  res.json({ success: true });
});

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

describe('requirePermission middleware', () => {
  it('deve bloquear usuário sem permissão', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'free' });
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Plano Free não tem orders_advanced
    const response = await request(app)
      .get('/test/require-permission')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message.toLowerCase()).toContain('permissão');
  });

  it('deve permitir usuário com permissão', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'pro' });
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Plano Pro tem orders_advanced
    const response = await request(app)
      .get('/test/require-permission')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  it('deve permitir master (bypass)', async () => {
    const user = await createTestUser(testPool, { is_master: true });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      is_master: true 
    });

    const response = await request(app)
      .get('/test/require-permission')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});

describe('requireAccess middleware', () => {
  it('deve bloquear usuário sem acesso ao recurso', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'free' });
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email 
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      subscriber_email: subscriber.email 
    });

    // Plano Free não tem acesso a reports
    const response = await request(app)
      .get('/test/require-access')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
  });

  it('deve permitir master (bypass)', async () => {
    const user = await createTestUser(testPool, { is_master: true });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      is_master: true 
    });

    const response = await request(app)
      .get('/test/require-access')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});

describe('requireMaster middleware', () => {
  it('deve bloquear usuário não-master', async () => {
    const subscriber = await createTestSubscriber(testPool);
    const user = await createTestUser(testPool, { 
      subscriber_email: subscriber.email,
      is_master: false
    });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      is_master: false 
    });

    const response = await request(app)
      .get('/test/require-master')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('master');
  });

  it('deve permitir master', async () => {
    const user = await createTestUser(testPool, { is_master: true });
    const token = createTestToken({ 
      id: user.id, 
      email: user.email, 
      is_master: true 
    });

    const response = await request(app)
      .get('/test/require-master')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});
