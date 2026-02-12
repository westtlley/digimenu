/**
 * Testes de Integração - Validação de Limites de Planos
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTestDb, getTestPool } from '../setup/testDb.js';
import { createTestSubscriber } from '../setup/testHelpers.js';
import { 
  validateProductsLimit, 
  validateOrdersPerDayLimit,
  validateOrdersPerMonthLimit,
  validateUsersLimit 
} from '../../services/planValidation.service.js';

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

describe('validateProductsLimit', () => {
  it('deve bloquear produtos além de 30 no plano Free', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'free' });

    // Criar 30 produtos
    for (let i = 0; i < 30; i++) {
      await testPool.query(`
        INSERT INTO entities (entity_type, data, subscriber_email)
        VALUES ('Dish', $1::jsonb, $2)
      `, [
        JSON.stringify({ name: `Produto ${i}`, price: 10.00 }),
        subscriber.email
      ]);
    }

    const validation = await validateProductsLimit(subscriber.email, null, false);
    
    expect(validation.valid).toBe(false);
    expect(validation.current).toBe(30);
    expect(validation.limit).toBe(30);
  });

  it('deve permitir produtos ilimitados no plano Pro', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'pro' });

    // Criar 100 produtos
    for (let i = 0; i < 100; i++) {
      await testPool.query(`
        INSERT INTO entities (entity_type, data, subscriber_email)
        VALUES ('Dish', $1::jsonb, $2)
      `, [
        JSON.stringify({ name: `Produto ${i}`, price: 10.00 }),
        subscriber.email
      ]);
    }

    const validation = await validateProductsLimit(subscriber.email, null, false);
    
    expect(validation.valid).toBe(true);
    expect(validation.limit).toBe(-1); // Ilimitado
  });
});

describe('validateOrdersPerMonthLimit', () => {
  it('deve bloquear pedidos além de 20/mês no plano Free', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'free' });

    // Criar 20 pedidos no mês atual
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      await testPool.query(`
        INSERT INTO entities (entity_type, data, subscriber_email, created_at)
        VALUES ('Order', $1::jsonb, $2, $3)
      `, [
        JSON.stringify({ order_code: `ORDER${i}`, status: 'new', total: 10.00 }),
        subscriber.email,
        now.toISOString()
      ]);
    }

    const validation = await validateOrdersPerMonthLimit(subscriber.email, false);
    
    expect(validation.valid).toBe(false);
    expect(validation.current).toBe(20);
    expect(validation.limit).toBe(20);
  });

  it('deve permitir pedidos ilimitados no plano Pro', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'pro' });

    // Criar 100 pedidos
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      await testPool.query(`
        INSERT INTO entities (entity_type, data, subscriber_email, created_at)
        VALUES ('Order', $1::jsonb, $2, $3)
      `, [
        JSON.stringify({ order_code: `ORDER${i}`, status: 'new', total: 10.00 }),
        subscriber.email,
        now.toISOString()
      ]);
    }

    const validation = await validateOrdersPerMonthLimit(subscriber.email, false);
    
    expect(validation.valid).toBe(true);
    expect(validation.limit).toBe(-1); // Ilimitado
  });
});

describe('validateUsersLimit', () => {
  it('deve bloquear usuários além de 1 no plano Free', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'free' });

    // Criar 1 colaborador
    await testPool.query(`
      INSERT INTO users (email, password_hash, full_name, subscriber_email, profile_role)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      'colab1@test.com',
      'hash123',
      'Colaborador 1',
      subscriber.email,
      'entregador'
    ]);

    const validation = await validateUsersLimit(subscriber.email, null, false);
    
    expect(validation.valid).toBe(false);
    expect(validation.current).toBe(1);
    expect(validation.limit).toBe(1);
  });

  it('deve permitir até 5 usuários no plano Pro', async () => {
    const subscriber = await createTestSubscriber(testPool, { plan: 'pro' });

    // Criar 4 colaboradores (dentro do limite de 5)
    for (let i = 1; i <= 4; i++) {
      await testPool.query(`
        INSERT INTO users (email, password_hash, full_name, subscriber_email, profile_role)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        `colab${i}@test.com`,
        'hash123',
        `Colaborador ${i}`,
        subscriber.email,
        'entregador'
      ]);
    }

    const validation = await validateUsersLimit(subscriber.email, null, false);
    
    expect(validation.valid).toBe(true);
    expect(validation.current).toBe(4);
    expect(validation.limit).toBe(5);
  });
});

describe('Master Bypass', () => {
  it('deve permitir tudo para master (bypass de limites)', async () => {
    const productsValidation = await validateProductsLimit(null, 1000, true);
    expect(productsValidation.valid).toBe(true);
    expect(productsValidation.limit).toBe(-1);

    const ordersValidation = await validateOrdersPerMonthLimit(null, true);
    expect(ordersValidation.valid).toBe(true);
    expect(ordersValidation.limit).toBe(-1);

    const usersValidation = await validateUsersLimit(null, 100, true);
    expect(usersValidation.valid).toBe(true);
    expect(usersValidation.limit).toBe(-1);
  });
});
