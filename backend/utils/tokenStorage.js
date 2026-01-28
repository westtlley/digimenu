/**
 * Sistema de armazenamento de tokens com suporte a Redis e fallback para banco de dados
 * Substitui o armazenamento em memória para produção
 */

let redisClient = null;
let useRedis = false;

// Tentar conectar ao Redis
try {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    const redis = await import('redis');
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
    
    redisClient = redis.createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.warn('⚠️ Redis connection error:', err.message);
      console.warn('⚠️ Falling back to database storage');
      useRedis = false;
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      useRedis = true;
    });
    
    await redisClient.connect();
  }
} catch (error) {
  console.warn('⚠️ Redis not available, using database fallback:', error.message);
  useRedis = false;
}

/**
 * Armazenar token no Redis ou banco
 */
export async function storeToken(key, value, ttlSeconds = null) {
  const data = {
    ...value,
    stored_at: new Date().toISOString()
  };
  
  if (useRedis && redisClient) {
    try {
      const serialized = JSON.stringify(data);
      if (ttlSeconds) {
        await redisClient.setEx(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('❌ Redis store error:', error);
      useRedis = false;
      // Fallback para banco
    }
  }
  
  // Fallback: armazenar no banco de dados
  return await storeTokenInDatabase(key, data, ttlSeconds);
}

/**
 * Recuperar token do Redis ou banco
 */
export async function getToken(key) {
  if (useRedis && redisClient) {
    try {
      const serialized = await redisClient.get(key);
      if (serialized) {
        return JSON.parse(serialized);
      }
      return null;
    } catch (error) {
      console.error('❌ Redis get error:', error);
      useRedis = false;
      // Fallback para banco
    }
  }
  
  // Fallback: buscar no banco
  return await getTokenFromDatabase(key);
}

/**
 * Deletar token do Redis ou banco
 */
export async function deleteToken(key) {
  if (useRedis && redisClient) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('❌ Redis delete error:', error);
      useRedis = false;
    }
  }
  
  // Fallback: deletar do banco
  return await deleteTokenFromDatabase(key);
}

/**
 * Verificar se token existe
 */
export async function tokenExists(key) {
  if (useRedis && redisClient) {
    try {
      return await redisClient.exists(key) === 1;
    } catch (error) {
      console.error('❌ Redis exists error:', error);
      useRedis = false;
    }
  }
  
  // Fallback: verificar no banco
  return await tokenExistsInDatabase(key);
}

/**
 * Limpar tokens expirados (manutenção)
 */
export async function cleanupExpiredTokens() {
  // Redis faz isso automaticamente com TTL
  if (!useRedis) {
    // Limpar do banco de dados
    await cleanupExpiredTokensFromDatabase();
  }
}

// =======================
// FALLBACK: Banco de Dados
// =======================

let tokenStore = {}; // Fallback em memória (apenas desenvolvimento)

async function storeTokenInDatabase(key, value, ttlSeconds) {
  // Em produção, salvar na tabela tokens do PostgreSQL
  // Por enquanto, usar memória como fallback
  tokenStore[key] = {
    ...value,
    expires_at: ttlSeconds 
      ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
      : null
  };
  
  // Se usar PostgreSQL, salvar na tabela
  if (process.env.DATABASE_URL) {
    try {
      const { default: repo } = await import('../db/repository.js');
      await repo.storeToken(key, value, ttlSeconds);
    } catch (error) {
      console.error('❌ Database token store error:', error);
    }
  }
  
  return true;
}

async function getTokenFromDatabase(key) {
  // Verificar memória primeiro
  const token = tokenStore[key];
  if (token) {
    // Verificar expiração
    if (token.expires_at && new Date(token.expires_at) < new Date()) {
      delete tokenStore[key];
      return null;
    }
    return token;
  }
  
  // Se usar PostgreSQL, buscar na tabela
  if (process.env.DATABASE_URL) {
    try {
      const { default: repo } = await import('../db/repository.js');
      return await repo.getToken(key);
    } catch (error) {
      console.error('❌ Database token get error:', error);
    }
  }
  
  return null;
}

async function deleteTokenFromDatabase(key) {
  delete tokenStore[key];
  
  if (process.env.DATABASE_URL) {
    try {
      const { default: repo } = await import('../db/repository.js');
      await repo.deleteToken(key);
    } catch (error) {
      console.error('❌ Database token delete error:', error);
    }
  }
  
  return true;
}

async function tokenExistsInDatabase(key) {
  const token = await getTokenFromDatabase(key);
  return token !== null;
}

async function cleanupExpiredTokensFromDatabase() {
  const now = new Date();
  const keys = Object.keys(tokenStore);
  
  for (const key of keys) {
    const token = tokenStore[key];
    if (token.expires_at && new Date(token.expires_at) < now) {
      delete tokenStore[key];
    }
  }
  
  // Limpar do PostgreSQL também
  if (process.env.DATABASE_URL) {
    try {
      const { default: repo } = await import('../db/repository.js');
      await repo.cleanupExpiredTokens();
    } catch (error) {
      console.error('❌ Database cleanup error:', error);
    }
  }
}

// Limpar tokens expirados a cada hora
setInterval(() => {
  cleanupExpiredTokens();
}, 3600000); // 1 hora

export default {
  storeToken,
  getToken,
  deleteToken,
  tokenExists,
  cleanupExpiredTokens
};
