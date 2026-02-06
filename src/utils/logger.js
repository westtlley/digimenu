/**
 * Logger profissional centralizado
 * Emite logs apenas em desenvolvimento (import.meta.env.DEV)
 * Suporta categorias para melhor organização
 */
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

const createLogger = (category = 'app') => ({
  log: (...args) => {
    if (isDev) console.log(`[${category}]`, ...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(`[${category}]`, ...args);
  },
  error: (...args) => {
    // Erros sempre são logados, mesmo em produção (mas apenas no console)
    console.error(`[${category}]`, ...args);
  },
  debug: (...args) => {
    if (isDev) console.debug(`[${category}]`, ...args);
  },
});

// Logger global (retrocompatibilidade)
export const logger = createLogger('app');

// Loggers categorizados
export const log = {
  admin: createLogger('admin'),
  permission: createLogger('permission'),
  menu: createLogger('menu'),
  error: createLogger('error'),
  api: createLogger('api'),
  ...createLogger('app'), // Métodos globais também disponíveis
};

export default logger;
