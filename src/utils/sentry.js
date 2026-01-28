/**
 * Configuração do Sentry para frontend
 * Monitoramento de erros e performance
 */

let Sentry = null;
let isInitialized = false;

// Inicializar Sentry se disponível
try {
  if (import.meta.env.VITE_SENTRY_DSN) {
    const SentryModule = await import('@sentry/react');
    Sentry = SentryModule.default;
    
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      integrations: [
        new SentryModule.BrowserTracing(),
        new SentryModule.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
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
    
    isInitialized = true;
    console.log('✅ Sentry inicializado para monitoramento');
    
    // Expor globalmente para ErrorBoundary
    window.Sentry = Sentry;
  }
} catch (error) {
  console.warn('⚠️ Sentry não disponível:', error.message);
}

/**
 * Capturar erro manualmente
 */
export function captureError(error, context = {}) {
  if (isInitialized && Sentry) {
    Sentry.captureException(error, {
      extra: context
    });
  }
  console.error('Erro capturado:', error, context);
}

/**
 * Capturar mensagem
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (isInitialized && Sentry) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    });
  }
}

/**
 * Adicionar contexto do usuário
 */
export function setUserContext(user) {
  if (isInitialized && Sentry) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.email
    });
  }
}

/**
 * Limpar contexto do usuário
 */
export function clearUserContext() {
  if (isInitialized && Sentry) {
    Sentry.setUser(null);
  }
}

export default {
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  isInitialized: () => isInitialized
};
