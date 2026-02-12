/**
 * Environment Variables Loader
 * Carrega variáveis de ambiente de forma segura para ESM
 * DEVE ser importado ANTES de qualquer módulo que use process.env
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Carrega variáveis de ambiente
 * Em test: carrega .env.test (se existir) e depois .env (para valores padrão)
 * Em dev/prod: carrega .env
 */
export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Determinar qual arquivo carregar
  let envFile = '.env';
  if (nodeEnv === 'test') {
    // Em teste, tentar .env.test primeiro, depois .env como fallback
    const testEnvFile = join(rootDir, '.env.test');
    if (existsSync(testEnvFile)) {
      envFile = '.env.test';
      console.log('📋 Carregando .env.test para modo teste');
    } else {
      console.log('⚠️ .env.test não encontrado, usando .env');
    }
  }
  
  const envPath = join(rootDir, envFile);
  
  // Carregar arquivo .env
  const result = config({ path: envPath });
  
  if (result.error) {
    // Se .env não existe, apenas avisar (produção pode usar env injetado)
    if (!existsSync(envPath)) {
      console.warn(`⚠️ Arquivo ${envFile} não encontrado em ${rootDir}`);
      console.warn('⚠️ Usando variáveis de ambiente do sistema (produção)');
    } else {
      console.error(`❌ Erro ao carregar ${envFile}:`, result.error);
    }
  } else {
    console.log(`✅ Variáveis de ambiente carregadas de ${envFile}`);
  }
  
  // Validar variáveis críticas (apenas em desenvolvimento/teste)
  if (nodeEnv !== 'production') {
    validateCriticalEnv();
  }
  
  return result;
}

/**
 * Valida variáveis críticas
 */
function validateCriticalEnv() {
  const errors = [];
  
  // DATABASE_URL é obrigatória apenas se não estiver em produção com env injetado
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL não está definida');
  } else {
    // Validar formato da URL
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        errors.push('DATABASE_URL deve usar protocolo postgresql:// ou postgres://');
      }
      // Validar que password não é undefined (mesmo que vazio)
      if (url.password === undefined) {
        errors.push('DATABASE_URL deve conter senha (mesmo que vazia)');
      }
    } catch (e) {
      errors.push(`DATABASE_URL inválida: ${e.message}`);
    }
  }
  
  // JWT_SECRET é obrigatória
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET não está definida');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET deve ter no mínimo 32 caracteres');
  }
  
  if (errors.length > 0) {
    console.error('❌ Erros de validação de variáveis de ambiente:');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n💡 Configure as variáveis no arquivo .env ou .env.test');
    throw new Error('Variáveis de ambiente obrigatórias não configuradas');
  }
}

// Carregar automaticamente ao importar este módulo
loadEnv();
