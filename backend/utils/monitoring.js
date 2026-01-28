/**
 * Sistema de monitoramento e logging estruturado
 * Integração com Sentry e logs estruturados
 */

let Sentry = null;
let isSentryInitialized = false;

// Inicializar Sentry se disponível
try {
  if (process.env.SENTRY_DSN) {
    Sentry = await import('@sentry/node');
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event, hint) {
        // Filtrar informações sensíveis
        if (event.request) {
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
          if (event.request.data) {
            const sensitive = ['password', 'token', 'secret'];
            for (const key in event.request.data) {
              if (sensitive.some(s => key.toLowerCase().includes(s))) {
                event.request.data[key] = '***REDACTED***';
              }
            }
          }
        }
        return event;
      }
    });
    
    isSentryInitialized = true;
    console.log('✅ Sentry inicializado para monitoramento de erros');
  }
} catch (error) {
  console.warn('⚠️ Sentry não disponível:', error.message);
}

/**
 * Log estruturado
 */
export function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Console output
  const emoji = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🔍'
  }[level] || '📝';
  
  console.log(`${emoji} [${level.toUpperCase()}] ${message}`, data);
  
  // Enviar para Sentry se for erro
  if (isSentryInitialized && Sentry && level === 'error') {
    Sentry.captureException(new Error(message), {
      extra: data,
      level: 'error'
    });
  }
  
  return logEntry;
}

/**
 * Log de erro
 */
export function logError(message, error, context = {}) {
  const errorData = {
    message: error?.message || message,
    stack: error?.stack,
    ...context
  };
  
  log('error', message, errorData);
  
  if (isSentryInitialized && Sentry) {
    Sentry.captureException(error, {
      extra: context,
      level: 'error'
    });
  }
}

/**
 * Log de warning
 */
export function logWarning(message, data = {}) {
  return log('warn', message, data);
}

/**
 * Log de info
 */
export function logInfo(message, data = {}) {
  return log('info', message, data);
}

/**
 * Log de debug
 */
export function logDebug(message, data = {}) {
  if (process.env.NODE_ENV !== 'production') {
    return log('debug', message, data);
  }
}

/**
 * Capturar métricas de performance
 */
export function capturePerformance(name, duration, metadata = {}) {
  if (isSentryInitialized && Sentry) {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: name,
      data: {
        duration,
        ...metadata
      },
      level: 'info'
    });
  }
  
  logDebug(`Performance: ${name}`, { duration, ...metadata });
}

/**
 * Capturar evento de negócio
 */
export function captureBusinessEvent(eventName, properties = {}) {
  const event = {
    event: eventName,
    timestamp: new Date().toISOString(),
    properties,
    environment: process.env.NODE_ENV || 'development'
  };
  
  logInfo(`Business Event: ${eventName}`, properties);
  
  if (isSentryInitialized && Sentry) {
    Sentry.addBreadcrumb({
      category: 'business',
      message: eventName,
      data: properties,
      level: 'info'
    });
  }
  
  return event;
}

/**
 * Middleware para capturar requisições
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    
    // Não logar como warning: 401 (não autenticado - esperado), 404 em rotas públicas conhecidas
    const isExpectedError = 
      res.statusCode === 401 || // Não autenticado - comportamento esperado
      (res.statusCode === 404 && req.path === '/'); // Health check na raiz
    
    if (res.statusCode >= 400 && !isExpectedError) {
      logWarning(`HTTP ${res.statusCode}`, logData);
    } else if (res.statusCode >= 500) {
      // Erros 5xx sempre são warnings
      logWarning(`HTTP ${res.statusCode}`, logData);
    } else {
      logDebug(`HTTP ${req.method} ${req.path}`, logData);
    }
    
    capturePerformance(`http.${req.method.toLowerCase()}.${req.path}`, duration);
  });
  
  next();
}

export default {
  log,
  logError,
  logWarning,
  logInfo,
  logDebug,
  capturePerformance,
  captureBusinessEvent,
  requestLogger
};
