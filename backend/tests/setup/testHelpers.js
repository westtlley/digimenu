/**
 * Test Helpers
 * Funções auxiliares para testes
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Cria um token JWT para testes
 */
export function createTestToken(userData = {}) {
  const defaultUser = {
    id: 1,
    email: 'test@example.com',
    is_master: false,
    subscriber_email: null,
    ...userData
  };

  return jwt.sign(defaultUser, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Cria um hash de senha para testes
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Cria um usuário de teste no banco
 */
export async function createTestUser(pool, userData = {}) {
  const defaultUser = {
    email: `test_${Date.now()}@example.com`,
    password: await hashPassword('test123'),
    name: 'Test User',
    is_master: false,
    subscriber_email: null,
    profile_role: null,
    ...userData
  };

  const result = await pool.query(`
    INSERT INTO users (email, password_hash, full_name, is_master, subscriber_email, profile_role)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    defaultUser.email,
    defaultUser.password,
    defaultUser.name,
    defaultUser.is_master,
    defaultUser.subscriber_email,
    defaultUser.profile_role || null
  ]);

  return result.rows[0];
}

/**
 * Cria um subscriber de teste no banco
 */
export async function createTestSubscriber(pool, subscriberData = {}) {
  const defaultSubscriber = {
    email: `subscriber_${Date.now()}@example.com`,
    name: 'Test Subscriber',
    plan: 'free',
    status: 'active',
    slug: `test-slug-${Date.now()}`,
    ...subscriberData
  };

  const result = await pool.query(`
    INSERT INTO subscribers (email, name, plan, status, slug)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    defaultSubscriber.email,
    defaultSubscriber.name,
    defaultSubscriber.plan,
    defaultSubscriber.status,
    defaultSubscriber.slug
  ]);

  return result.rows[0];
}

/**
 * Cria headers de autenticação para requisições de teste
 */
export function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Aguarda um tempo específico (útil para testes assíncronos)
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Valida resposta de erro esperada
 */
export function expectErrorResponse(res, expectedStatus, expectedMessage = null) {
  expect(res.status).toBe(expectedStatus);
  expect(res.body).toHaveProperty('error');
  
  if (expectedMessage) {
    expect(res.body.error).toContain(expectedMessage);
  }
  
  // Nunca deve ter stack trace em produção
  expect(res.body).not.toHaveProperty('stack');
}

/**
 * Valida resposta de sucesso
 */
export function expectSuccessResponse(res, expectedStatus = 200) {
  expect(res.status).toBe(expectedStatus);
  expect(res.body).not.toHaveProperty('error');
}
