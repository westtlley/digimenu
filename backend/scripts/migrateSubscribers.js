/**
 * Script de Migração de Assinantes
 * 
 * Atualiza assinantes com plano 'premium' (antigo) para 'ultra' (novo)
 * 
 * USO:
 *   node backend/scripts/migrateSubscribers.js
 */

import { listSubscribers, updateSubscriber } from '../db/repository.js';
import logger from '../utils/logger.js';

async function migrateSubscribers() {
  try {
    logger.log('🔄 Iniciando migração de assinantes...');
    
    // 1. Listar todos os assinantes
    const subscribers = await listSubscribers();
    logger.log(`📊 Total de assinantes: ${subscribers.length}`);
    
    // 2. Filtrar assinantes com plano 'premium'
    const premiumSubscribers = subscribers.filter(s => s.plan === 'premium');
    logger.log(`🔍 Assinantes com plano 'premium': ${premiumSubscribers.length}`);
    
    if (premiumSubscribers.length === 0) {
      logger.log('✅ Nenhum assinante com plano "premium" encontrado. Migração não necessária.');
      return;
    }
    
    // 3. Atualizar cada assinante
    let successCount = 0;
    let errorCount = 0;
    
    for (const subscriber of premiumSubscribers) {
      try {
        await updateSubscriber(subscriber.id, {
          ...subscriber,
          plan: 'ultra'
        });
        
        logger.log(`  ✅ Migrado: ${subscriber.email} (${subscriber.id}) → ultra`);
        successCount++;
      } catch (error) {
        logger.error(`  ❌ Erro ao migrar ${subscriber.email}:`, error.message);
        errorCount++;
      }
    }
    
    // 4. Resumo
    logger.log('\n📋 RESUMO DA MIGRAÇÃO:');
    logger.log(`✅ Sucesso: ${successCount}`);
    logger.log(`❌ Erros: ${errorCount}`);
    logger.log(`📊 Total processado: ${premiumSubscribers.length}`);
    
    if (errorCount === 0) {
      logger.log('\n🎉 Migração concluída com sucesso!');
    } else {
      logger.log('\n⚠️ Migração concluída com alguns erros. Verifique os logs acima.');
    }
    
  } catch (error) {
    logger.error('❌ Erro fatal na migração:', error);
    process.exit(1);
  }
}

// Executar migração
migrateSubscribers().then(() => {
  process.exit(0);
}).catch(err => {
  logger.error('❌ Erro fatal:', err);
  process.exit(1);
});
