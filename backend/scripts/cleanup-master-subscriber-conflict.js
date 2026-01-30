#!/usr/bin/env node

/**
 * Script para remover subscriber que conflita com usuário master
 * Mantém apenas o usuário master e remove o subscriber duplicado
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado');
  process.exit(1);
}

const repo = await import('../db/repository.js');
const { query } = await import('../db/postgres.js');

async function cleanupConflict() {
  console.log('🔍 Procurando conflitos entre master e subscriber...\n');

  try {
    // 1. Listar todos os usuários master
    const mastersResult = await query(
      'SELECT id, email, full_name, is_master FROM users WHERE is_master = TRUE'
    );
    
    console.log(`📋 Encontrados ${mastersResult.rows.length} usuário(s) master:\n`);
    
    for (const master of mastersResult.rows) {
      console.log(`  ✓ ${master.email} (ID: ${master.id}) - ${master.full_name}`);
      
      // 2. Verificar se existe subscriber com o mesmo email
      const subscriber = await repo.getSubscriberByEmail(master.email);
      
      if (subscriber) {
        console.log(`\n  ⚠️ CONFLITO ENCONTRADO!`);
        console.log(`     Master: ${master.email}`);
        console.log(`     Subscriber: ${subscriber.email} (ID: ${subscriber.id})`);
        console.log(`     Plano: ${subscriber.plan}`);
        console.log(`     Status: ${subscriber.status}`);
        
        console.log(`\n  🗑️ Removendo subscriber duplicado...`);
        
        // 3. Deletar todas as entidades do subscriber
        console.log(`     → Deletando entidades do subscriber...`);
        await query(
          'DELETE FROM entities WHERE subscriber_email = $1',
          [subscriber.email]
        );
        
        // 4. Deletar o subscriber
        console.log(`     → Deletando registro do subscriber...`);
        await query(
          'DELETE FROM subscribers WHERE email = $1',
          [subscriber.email]
        );
        
        console.log(`  ✅ Conflito resolvido! Subscriber removido, master mantido.`);
      } else {
        console.log(`  ✓ Sem conflitos`);
      }
    }
    
    console.log('\n✅ Limpeza concluída!\n');
    
  } catch (error) {
    console.error('\n❌ Erro ao limpar conflitos:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanupConflict();
