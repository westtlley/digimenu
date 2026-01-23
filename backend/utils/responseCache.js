/**
 * Cache Simples em Memória para Respostas
 * Útil para dados que mudam pouco (planos, permissões, etc.)
 */

// Cache em memória (em produção, usar Redis)
const cache = new Map();

/**
 * Obter item do cache
 */
export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  // Verificar se expirou
  if (item.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
}

/**
 * Armazenar no cache
 */
export function setCache(key, value, ttlSeconds = 300) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
}

/**
 * Limpar cache
 */
export function clearCache(key = null) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Middleware para cache de respostas
 */
export function cacheMiddleware(ttlSeconds = 300) {
  return (req, res, next) => {
    // Apenas cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `${req.method}:${req.originalUrl}`;
    const cached = getCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    // Interceptar res.json para cachear resposta
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      setCache(cacheKey, data, ttlSeconds);
      return originalJson(data);
    };
    
    next();
  };
}
