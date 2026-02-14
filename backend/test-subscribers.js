// Script de teste para verificar assinantes no banco
import './loadEnv.js';
import { query } from './db/postgres.js';

async function testSubscribers() {
  try {
    console.log('🔍 Testando conexão e assinantes...\n');
    
    // 1. Testar conexão
    const versionResult = await query('SELECT version()');
    console.log('✅ PostgreSQL conectado:', versionResult.rows[0].version.split(' ')[0], versionResult.rows[0].version.split(' ')[1]);
    
    // 2. Contar total de assinantes
    const countResult = await query('SELECT COUNT(*)::int as total FROM subscribers');
    const total = countResult.rows[0]?.total ?? 0;
    console.log(`📊 Total de assinantes no banco: ${total}\n`);
    
    if (total === 0) {
      console.log('⚠️ PROBLEMA IDENTIFICADO: Não há assinantes no banco de dados!');
      console.log('   Você precisa criar assinantes primeiro.\n');
      process.exit(1);
    }
    
    // 3. Buscar primeiros 5 assinantes
    const subscribersResult = await query(`
      SELECT id, email, name, plan, status, created_at
      FROM subscribers
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('📋 Primeiros 5 assinantes:');
    subscribersResult.rows.forEach((sub, i) => {
      console.log(`   ${i + 1}. ${sub.email} | ${sub.name || '(sem nome)'} | Plano: ${sub.plan} | Status: ${sub.status}`);
    });
    
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao testar:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testSubscribers();
