/**
 * Professional Logger
 * Logger profissional usando Winston
 * Logs diferentes para dev e produção
 * Nunca loga senha ou JWT
 */

import winston from 'winston';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Formato customizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para console (mais legível)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Adicionar metadata se houver
    if (Object.keys(meta).length > 0) {
      // Filtrar dados sensíveis
      const safeMeta = sanitizeLogData(meta);
      msg += ` ${JSON.stringify(safeMeta)}`;
    }
    
    return msg;
  })
);

/**
 * Sanitiza dados de log (remove senhas, tokens, etc.)
 */
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'password_hash',
    'token',
    'jwt',
    'secret',
    'api_key',
    'api_secret',
    'authorization',
    'cookie',
    'session'
  ];

  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    // Remover chaves sensíveis
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***';
    }
    
    // Sanitizar objetos aninhados
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
    
    // Sanitizar strings que parecem ser senhas/tokens
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 20) {
      // Se parece ser um hash ou token, mascarar
      if (/^[a-f0-9]{32,}$/i.test(sanitized[key]) || sanitized[key].includes('Bearer ')) {
        sanitized[key] = '***REDACTED***';
      }
    }
  });

  return sanitized;
}

// Configurar transportes
const transports = [];

// Console (sempre ativo)
transports.push(
  new winston.transports.Console({
    format: isDevelopment ? consoleFormat : logFormat,
    level: isDevelopment ? 'debug' : 'info'
  })
);

// Arquivo de logs (apenas em produção)
if (!isDevelopment) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Criar logger
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: logFormat,
  transports,
  // Não sair do processo em caso de erro
  exitOnError: false
});

// Métodos auxiliares
export const loggerUtils = {
  /**
   * Log de requisição HTTP
   */
  logRequest: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  },

  /**
   * Log de erro com contexto
   */
  logError: (error, context = {}) => {
    logger.error('Error', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...sanitizeLogData(context)
    });
  },

  /**
   * Log de query de banco
   */
  logQuery: (query, duration, rows) => {
    if (isDevelopment || duration > 1000) {
      logger.debug('Database Query', {
        duration: `${duration}ms`,
        rows,
        query: query.substring(0, 100) // Apenas primeiros 100 caracteres
      });
    }
  }
};

// Exportar logger e utils (named logger para compatibilidade com entities.routes e outros)
export const log = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);

export { logger };
export default logger;
