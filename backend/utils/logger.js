/**
 * Logger: em dev emite tudo; em produção only error (para não esconder falhas).
 * log/warn em produção não poluem nem expõem dados sensíveis.
 */
const isDev = process.env.NODE_ENV !== 'production';

const noop = () => {};

export const logger = {
  log: isDev ? (...args) => console.log(...args) : noop,
  info: isDev ? (...args) => console.log(...args) : noop, // Alias para log
  warn: isDev ? (...args) => console.warn(...args) : noop,
  error: (...args) => console.error(...args), // sempre, para monitoramento em prod
};

export default logger;
