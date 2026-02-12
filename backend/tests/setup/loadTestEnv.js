/**
 * Load Test Environment
 * Carrega .env.test antes dos testes
 * Este arquivo é importado pelo vitest.config.js ou testDb.js
 */

// Forçar NODE_ENV=test antes de carregar env
process.env.NODE_ENV = 'test';

// Garantir JWT_SECRET para testes (≥32 chars para loadEnv; token e auth usam o mesmo)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-integration-tests-32ch';
}

// Carregar env de teste
import '../../config/loadEnv.js';
