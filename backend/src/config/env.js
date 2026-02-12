/**
 * Environment Variables Validation
 * Validação obrigatória de variáveis de ambiente críticas
 */

import { logger } from '../utils/logger.js';

/**
 * Valida variáveis de ambiente obrigatórias
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  // Variáveis obrigatórias
  const required = {
    PORT: {
      value: process.env.PORT,
      validator: (val) => {
        const port = parseInt(val, 10);
        return !isNaN(port) && port > 0 && port < 65536;
      },
      message: 'PORT deve ser um número entre 1 e 65535'
    },
    DATABASE_URL: {
      value: process.env.DATABASE_URL,
      validator: (val) => {
        if (!val) return false;
        try {
          const url = new URL(val);
          return url.protocol === 'postgresql:' || url.protocol === 'postgres:';
        } catch {
          return false;
        }
      },
      message: 'DATABASE_URL deve ser uma URL PostgreSQL válida (postgresql://user:pass@host:port/db)'
    },
    JWT_SECRET: {
      value: process.env.JWT_SECRET,
      validator: (val) => {
        return val && val.length >= 32;
      },
      message: 'JWT_SECRET deve ter no mínimo 32 caracteres'
    }
  };

  // Validar variáveis obrigatórias
  Object.entries(required).forEach(([key, config]) => {
    if (!config.value) {
      errors.push(`❌ ${key} não está definida`);
    } else if (!config.validator(config.value)) {
      errors.push(`❌ ${key} inválida: ${config.message}`);
    }
  });

  // Variáveis opcionais com avisos
  const optional = {
    FRONTEND_URL: {
      value: process.env.FRONTEND_URL,
      default: 'http://localhost:5173',
      message: 'FRONTEND_URL não definida, usando padrão'
    },
    NODE_ENV: {
      value: process.env.NODE_ENV,
      default: 'development',
      message: 'NODE_ENV não definida, usando "development"'
    }
  };

  Object.entries(optional).forEach(([key, config]) => {
    if (!config.value) {
      warnings.push(`⚠️ ${key}: ${config.message} (${config.default})`);
      process.env[key] = config.default;
    }
  });

  // Log de validação
  if (errors.length > 0) {
    logger.error('❌ Erros de validação de variáveis de ambiente:');
    errors.forEach(error => logger.error(`  ${error}`));
    throw new Error('Variáveis de ambiente obrigatórias não configuradas corretamente');
  }

  if (warnings.length > 0) {
    logger.warn('⚠️ Avisos de configuração:');
    warnings.forEach(warning => logger.warn(`  ${warning}`));
  }

  // Log seguro (sem expor valores sensíveis)
  logger.info('✅ Variáveis de ambiente validadas:', {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: maskDatabaseUrl(process.env.DATABASE_URL),
    JWT_SECRET: process.env.JWT_SECRET ? '✅ Configurado' : '❌ Não configurado',
    FRONTEND_URL: process.env.FRONTEND_URL
  });

  return true;
}

/**
 * Mascara a URL do banco para logs (não expõe senha)
 */
function maskDatabaseUrl(url) {
  if (!url) return 'Não configurada';
  
  try {
    const urlObj = new URL(url);
    // Mascarar senha
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch {
    return 'Formato inválido';
  }
}

/**
 * Obtém variável de ambiente com valor padrão
 */
export function getEnv(key, defaultValue = null) {
  const value = process.env[key];
  if (value === undefined || value === null) {
    if (defaultValue === null) {
      throw new Error(`Variável de ambiente ${key} não está definida e não há valor padrão`);
    }
    return defaultValue;
  }
  return value;
}

/**
 * Obtém variável de ambiente como número
 */
export function getEnvNumber(key, defaultValue = null) {
  const value = getEnv(key, defaultValue);
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Variável de ambiente ${key} deve ser um número`);
  }
  return num;
}

/**
 * Obtém variável de ambiente como boolean
 */
export function getEnvBoolean(key, defaultValue = false) {
  const value = getEnv(key, String(defaultValue));
  return value === 'true' || value === '1';
}

export default {
  validateEnv,
  getEnv,
  getEnvNumber,
  getEnvBoolean
};
