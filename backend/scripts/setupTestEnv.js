/**
 * Script de Setup para Ambiente de Testes
 * 
 * Configura variáveis de ambiente e valida configuração para testes
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🔧 Configurando Ambiente de Testes\n');

// Verificar variáveis necessárias
const requiredVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET
};

const missingVars = [];
const warnings = [];

// Verificar variáveis obrigatórias
Object.entries(requiredVars).forEach(([key, value]) => {
  if (!value) {
    missingVars.push(key);
  }
});

// Verificar variáveis opcionais
if (!process.env.TEST_DATABASE_URL) {
  warnings.push('TEST_DATABASE_URL não definido - usando DATABASE_URL');
}

if (!process.env.BACKEND_URL) {
  warnings.push('BACKEND_URL não definido - usando http://localhost:3000');
}

// Exibir resultados
console.log('📋 Variáveis de Ambiente:');
console.log('='.repeat(50));

if (missingVars.length > 0) {
  console.log('❌ Variáveis obrigatórias faltando:');
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('\n⚠️  Configure essas variáveis no arquivo .env');
} else {
  console.log('✅ Todas as variáveis obrigatórias configuradas');
}

if (warnings.length > 0) {
  console.log('\n⚠️  Avisos:');
  warnings.forEach(w => console.log(`   - ${w}`));
}

console.log('\n📊 Configuração Atual:');
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`   TEST_DATABASE_URL: ${process.env.TEST_DATABASE_URL || 'Usando DATABASE_URL'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`   BACKEND_URL: ${process.env.BACKEND_URL || 'http://localhost:3000'}`);

// Verificar se .env.example existe
const envExamplePath = join(__dirname, '../.env.example');
if (existsSync(envExamplePath)) {
  console.log('\n💡 Dica: Consulte .env.example para ver todas as variáveis disponíveis');
}

console.log('\n✅ Setup concluído!');
console.log('\n📝 Próximos passos:');
console.log('   1. Execute: npm test (para testes automatizados)');
console.log('   2. Execute: node scripts/stressTest.js (para stress test)');
console.log('   3. Siga o checklist em CHECKLIST_PRE_CLIENTE.md');
