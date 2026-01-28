import pg from 'pg';
const { Pool } = pg;

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL:', err);
});

// Função para executar queries
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 Query executada', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', { text, error: error.message });
    throw error;
  }
}

// Função para obter cliente do pool (para transações)
export async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Adicionar timeout para evitar vazamento de conexões
  const timeout = setTimeout(() => {
    console.error('⚠️ Cliente não foi liberado após 10 segundos');
    release();
  }, 10000);
  
  client.release = () => {
    clearTimeout(timeout);
    release();
  };
  
  return client;
}

// Testar conexão ao iniciar
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ PostgreSQL conectado:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar PostgreSQL:', error.message);
    return false;
  }
}

export default pool;
