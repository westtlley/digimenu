import cron from 'node-cron';
import { differenceInDays } from 'date-fns';
import { db, saveDatabaseChanges } from '../db/persistence.js';
import { 
  sendExpirationWarningEmail, 
  sendExpiredEmail 
} from './emailService.js';
import { logger } from './logger.js';

/**
 * Inicializar cron jobs do sistema
 */
function initializeCronJobs() {
  logger.log('🔄 Inicializando cron jobs...');
  
  // Job de verificação de expirações
  // Executa todos os dias às 9h da manhã
  cron.schedule('0 9 * * *', async () => {
    await checkExpirations();
  });
  
  // Para desenvolvimento: executar também a cada 1 hora
  // Descomente se quiser testar mais frequentemente
  // cron.schedule('0 * * * *', async () => {
  //   await checkExpirations();
  // });
  
  logger.log('✅ Cron jobs inicializados com sucesso');
  logger.log('📅 Verificação de expirações: Todos os dias às 9h');
}

/**
 * Verificar expirações de assinaturas e enviar notificações
 */
async function checkExpirations() {
  try {
    logger.log('🔔 ========================================');
    logger.log('   Verificando expirações de assinaturas');
    logger.log('========================================');
    
    const now = new Date();
    const subscribers = db.subscribers || [];
    let notificationsSent = 0;
    let subscriptionsExpired = 0;
    
    for (const subscriber of subscribers) {
      // Pular se não tiver data de expiração ou não estiver ativo
      if (!subscriber.expires_at || subscriber.status !== 'active') {
        continue;
      }
      
      const expiresAt = new Date(subscriber.expires_at);
      const daysUntilExpiration = differenceInDays(expiresAt, now);
      
      const renewUrl = `${process.env.FRONTEND_URL}/assinar?email=${subscriber.email}`;
      
      // 7 dias antes da expiração
      if (daysUntilExpiration === 7) {
        await sendExpirationWarningEmail({
          email: subscriber.email,
          name: subscriber.name || subscriber.email,
          expires_at: subscriber.expires_at,
          daysRemaining: 7,
          renewUrl: renewUrl
        });
        logger.log(`📧 Notificação 7 dias enviada para: ${subscriber.email}`);
        notificationsSent++;
      }
      
      // 3 dias antes da expiração
      if (daysUntilExpiration === 3) {
        await sendExpirationWarningEmail({
          email: subscriber.email,
          name: subscriber.name || subscriber.email,
          expires_at: subscriber.expires_at,
          daysRemaining: 3,
          renewUrl: renewUrl
        });
        logger.log(`⚠️ Notificação 3 dias enviada para: ${subscriber.email}`);
        notificationsSent++;
        
        // TODO: Enviar WhatsApp também
        // await sendWhatsAppNotification(subscriber, 3);
      }
      
      // 1 dia antes da expiração
      if (daysUntilExpiration === 1) {
        await sendExpirationWarningEmail({
          email: subscriber.email,
          name: subscriber.name || subscriber.email,
          expires_at: subscriber.expires_at,
          daysRemaining: 1,
          renewUrl: renewUrl
        });
        logger.log(`🚨 Notificação 1 dia enviada para: ${subscriber.email}`);
        notificationsSent++;
        
        // TODO: Enviar WhatsApp também
        // await sendWhatsAppNotification(subscriber, 1);
      }
      
      // Expirado hoje ou já passou
      if (daysUntilExpiration <= 0) {
        // Atualizar status para expirado
        subscriber.status = 'expired';
        subscriber.updated_at = new Date().toISOString();
        
        // Enviar email de expiração
        await sendExpiredEmail({
          email: subscriber.email,
          name: subscriber.name || subscriber.email,
          renewUrl: renewUrl
        });
        
        logger.log(`❌ Assinatura expirada: ${subscriber.email}`);
        subscriptionsExpired++;
      }
    }
    
    // Salvar mudanças no banco
    if (subscriptionsExpired > 0) {
      await saveDatabaseChanges();
    }
    
    logger.log('========================================');
    logger.log(`✅ Verificação concluída`);
    logger.log(`📧 Notificações enviadas: ${notificationsSent}`);
    logger.log(`❌ Assinaturas expiradas: ${subscriptionsExpired}`);
    logger.log('========================================');
    
  } catch (error) {
    logger.error('❌ Erro ao verificar expirações:', error);
  }
}

/**
 * Executar verificação de expirações manualmente (para testes)
 */
async function runExpirationCheckNow() {
  logger.log('⚡ Executando verificação de expirações AGORA (manual)...');
  await checkExpirations();
}

export {
  initializeCronJobs,
  runExpirationCheckNow
};
