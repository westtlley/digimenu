/**
 * Middleware de Segurança
 * Validações críticas de segurança do sistema
 */

/**
 * Valida se JWT_SECRET está configurado corretamente
 */
export function validateJWTSecret() {
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET) {
    console.error('❌ ERRO CRÍTICO: JWT_SECRET não configurado!');
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Sistema não pode iniciar sem JWT_SECRET em produção!');
      process.exit(1);
    }
    console.warn('⚠️ Usando JWT_SECRET padrão (APENAS DESENVOLVIMENTO)');
    return 'dev-secret';
  }
  
  if (JWT_SECRET === 'dev-secret' && process.env.NODE_ENV === 'production') {
    console.error('❌ ERRO CRÍTICO: JWT_SECRET padrão em produção!');
    console.error('🚨 Configure uma chave segura em produção!');
    process.exit(1);
  }
  
  if (JWT_SECRET.length < 32) {
    console.warn('⚠️ JWT_SECRET muito curto. Recomendado: mínimo 32 caracteres');
  }
  
  return JWT_SECRET;
}

/**
 * Middleware para validar autenticação obrigatória em produção
 */
export function enforceAuth(req, res, next) {
  // Em produção, sempre exigir token
  if (process.env.NODE_ENV === 'production' && !req.headers.authorization) {
    return res.status(401).json({ 
      error: 'Token de autenticação obrigatório',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
}

/**
 * Sanitiza dados sensíveis para logs
 */
export function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitive = ['password', 'token', 'secret', 'authorization', 'jwt'];
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some(s => lowerKey.includes(s))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }
  
  return sanitized;
}
