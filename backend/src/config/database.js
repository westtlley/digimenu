/**
 * Database Configuration
 * Configuração centralizada do PostgreSQL com pool de conexões
 */

import pg from 'pg';
const { Pool } = pg;
import { logger } from '../utils/logger.js';

let pool = null;

/**
 * Inicializa o pool de conexões PostgreSQL
 */
export function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL é obrigatória. Configure no arquivo .env');
  }

  // Validar formato da URL
  try {
    new URL(connectionString);
  } catch (error) {
    throw new Error('DATABASE_URL inválida. Formato esperado: postgresql://user:password@host:port/database');
  }

  // Criar pool com configurações otimizadas
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : false,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Máximo de conexões
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10), // 30s
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10), // 2s
    // Configurações adicionais para produção
    ...(process.env.NODE_ENV === 'production' && {
      statement_timeout: 30000, // 30s timeout para queries
      query_timeout: 30000,
    })
  });

  // Event handlers
  pool.on('connect', () => {
    logger.info('✅ Conectado ao PostgreSQL');
  });

  pool.on('error', (err) => {
    logger.error('❌ Erro inesperado no pool PostgreSQL:', {
      message: err.message,
      code: err.code
    });
  });

  pool.on('acquire', () => {
    logger.debug('📊 Conexão adquirida do pool');
  });

  pool.on('remove', () => {
    logger.debug('📊 Conexão removida do pool');
  });

  return pool;
}

/**
 * Obtém o pool de conexões
 */
export function getPool() {
  if (!pool) {
    throw new Error('Pool não inicializado. Chame initializeDatabase() primeiro.');
  }
  return pool;
}

/**
 * Executa uma query
 */
export async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log apenas em desenvolvimento ou queries lentas (>1s)
    if (process.env.NODE_ENV !== 'production' || duration > 1000) {
      logger.debug('📊 Query executada', {
        duration: `${duration}ms`,
        rows: result.rowCount,
        // Não logar a query completa em produção (pode conter dados sensíveis)
        query: process.env.NODE_ENV === 'production' 
          ? text.substring(0, 100) + '...' 
          : text
      });
    }
    
    return result;
  } catch (error) {
    logger.error('❌ Erro na query:', {
      message: error.message,
      code: error.code,
      // Não logar a query completa em produção
      query: process.env.NODE_ENV === 'production' 
        ? text.substring(0, 100) + '...' 
        : text
    });
    throw error;
  }
}

/**
 * Obtém um cliente do pool (para transações)
 */
export async function getClient() {
  const pool = getPool();
  const client = await pool.connect();
  
  // Wrapper para garantir release
  const originalRelease = client.release.bind(client);
  let released = false;
  
  client.release = () => {
    if (released) {
      logger.warn('⚠️ Tentativa de liberar cliente já liberado');
      return;
    }
    released = true;
    originalRelease();
  };
  
  // Timeout de segurança (10s)
  const timeout = setTimeout(() => {
    if (!released) {
      logger.error('⚠️ Cliente não foi liberado após 10 segundos');
      client.release();
    }
  }, 10000);
  
  const originalReleaseWithTimeout = client.release;
  client.release = () => {
    clearTimeout(timeout);
    originalReleaseWithTimeout();
  };
  
  return client;
}

/**
 * Testa a conexão com o banco
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    logger.info('✅ PostgreSQL conectado:', {
      timestamp: result.rows[0].now,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    });
    return true;
  } catch (error) {
    logger.error('❌ Erro ao conectar PostgreSQL:', {
      message: error.message,
      code: error.code
    });
    return false;
  }
}

/**
 * Fecha o pool de conexões (útil para testes ou shutdown graceful)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('✅ Pool de conexões fechado');
  }
}

/**
 * Obtém estatísticas do pool
 */
export function getPoolStats() {
  if (!pool) {
    return null;
  }
  
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

export default {
  initializeDatabase,
  getPool,
  query,
  getClient,
  testConnection,
  closePool,
  getPoolStats
};
