/**
 * Testes de Integração - Autenticação
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupTestDb, teardownTestDb, cleanTestDb, getTestPool } from '../setup/testDb.js';
import { createTestUser, createTestToken, createAuthHeaders } from '../setup/testHelpers.js';
import jwt from 'jsonwebtoken';

// Importar rotas de auth diretamente
import authRoutes from '../../modules/auth/auth.routes.js';

// Criar app de teste
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

let testPool = null;

beforeAll(async () => {
  // Para testes, usar banco de teste se disponível, senão pular
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
  await cleanTestDb();
});

describe('POST /api/auth/login', () => {
  it('deve fazer login com credenciais válidas e retornar token', async () => {
    // Criar usuário de teste (createTestUser já faz hash da senha)
    const user = await createTestUser(testPool, {
      email: 'test@example.com'
      // password será 'test123' por padrão (já hasheado)
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'test123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('test@example.com');
  });

  it('deve retornar 401 com credenciais inválidas', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Credenciais inválidas');
  });

  it('deve retornar 400 com payload incompleto', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com'
        // password faltando
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/auth/me', () => {
  it('deve retornar dados do usuário autenticado com token válido', async () => {
    const user = await createTestUser(testPool);
    const token = createTestToken({ id: user.id, email: user.email });

    const response = await request(app)
      .get('/api/auth/me')
      .set(createAuthHeaders(token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('email');
    expect(response.body.email).toBe(user.email);
  });

  it('deve retornar 401 com token inválido', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set(createAuthHeaders('invalid-token'));

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('deve retornar 401 sem token', async () => {
    const response = await request(app)
      .get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});

describe('Token Expiration', () => {
  it('deve rejeitar token expirado', async () => {
    const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    const expiredToken = jwt.sign(
      { id: 1, email: 'test@example.com' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Token já expirado
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set(createAuthHeaders(expiredToken));

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });
});
