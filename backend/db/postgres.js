/**
 * PostgreSQL Connection Pool
 * Pool de conexões com lazy initialization para garantir que env esteja carregado
 */

import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Obtém ou cria o pool de conexões (lazy initialization)
 * Garante que DATABASE_URL esteja carregado antes de criar o pool
 * Em modo de teste, verifica se há um pool de teste global
 */
function getPool() {
  // Em modo de teste, usar pool de teste se disponível
  if (process.env.NODE_ENV === 'test' && global.__testPool) {
    return global.__testPool;
  }
  
  if (pool) {
    return pool;
  }
  
  // Validar DATABASE_URL
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL não está definida. ' +
      'Configure no arquivo .env ou .env.test, ou use bootstrap.js para carregar env.'
    );
  }
  
  // Validar formato da URL
  let urlObj;
  try {
    urlObj = new URL(connectionString);
  } catch (error) {
    throw new Error(`DATABASE_URL inválida: ${error.message}`);
  }
  
  // Validar protocolo
  if (urlObj.protocol !== 'postgresql:' && urlObj.protocol !== 'postgres:') {
    throw new Error('DATABASE_URL deve usar protocolo postgresql:// ou postgres://');
  }
  
  // Validar que password existe (mesmo que vazio)
  // Se password for undefined, o pg vai tentar conectar sem senha e falhar com SCRAM
  if (urlObj.password === undefined) {
    throw new Error(
      'DATABASE_URL não contém senha. ' +
      'Formato esperado: postgresql://usuario:senha@host:porta/banco'
    );
  }
  
  // Garantir que password seja string (não undefined/null)
  const password = String(urlObj.password || '');
  
  // Criar pool com configurações
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10),
  });
  
  // Event handlers
  pool.on('connect', () => {
    console.log('✅ Conectado ao PostgreSQL');
  });
  
  pool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool PostgreSQL:', err.message);
    // Não resetar pool automaticamente - deixar o erro propagar
  });
  
  return pool;
}

/**
 * Executa uma query usando o pool
 */
export async function query(text, params) {
  const poolInstance = getPool();
  const start = Date.now();
  
  try {
    const res = await poolInstance.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV !== 'production' && duration > 100) {
      console.log('📊 Query executada', { 
        duration: `${duration}ms`, 
        rows: res.rowCount,
        // Não logar query completa em produção (pode conter dados sensíveis)
        query: process.env.NODE_ENV === 'production' 
          ? text.substring(0, 100) + '...' 
          : text.substring(0, 200)
      });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', { 
      message: error.message,
      code: error.code,
      // Não logar query completa em produção
      query: process.env.NODE_ENV === 'production' 
        ? text.substring(0, 100) + '...' 
        : text.substring(0, 200)
    });
    throw error;
  }
}

/**
 * Obtém um cliente do pool (para transações)
 */
export async function getClient() {
  const poolInstance = getPool();
  const client = await poolInstance.connect();
  
  // Wrapper para garantir release
  const originalRelease = client.release.bind(client);
  let released = false;
  
  client.release = () => {
    if (released) {
      console.warn('⚠️ Tentativa de liberar cliente já liberado');
      return;
    }
    released = true;
    originalRelease();
  };
  
  // Timeout de segurança (10s)
  const timeout = setTimeout(() => {
    if (!released) {
      console.error('⚠️ Cliente não foi liberado após 10 segundos');
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
    const now = result.rows[0].now;
    const version = result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1];
    console.log('✅ PostgreSQL conectado:', { timestamp: now, version });
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar PostgreSQL:', {
      message: error.message,
      code: error.code,
      hint: error.message.includes('password') 
        ? 'Verifique se DATABASE_URL contém a senha correta'
        : 'Verifique se o PostgreSQL está rodando e DATABASE_URL está correta'
    });
    return false;
  }
}

/**
 * Fecha o pool (útil para testes ou shutdown graceful)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Pool de conexões fechado');
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

// Exportar pool como default (lazy)
export default {
  get pool() {
    return getPool();
  },
  query,
  getClient,
  testConnection,
  closePool,
  getPoolStats
};
