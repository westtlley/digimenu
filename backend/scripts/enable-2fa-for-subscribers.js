/**
 * Script para ativar 2FA para todos os assinantes
 * Executa: node -r dotenv/config scripts/enable-2fa-for-subscribers.js
 */

import * as repo from '../db/repository.js';
import { testConnection } from '../db/postgres.js';

async function enable2FAForSubscribers() {
  try {
    console.log('🔄 Iniciando ativação de 2FA para assinantes...');
    
    // Verificar conexão
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Não foi possível conectar ao PostgreSQL');
    }

    // Buscar todos os assinantes ativos
    const subscribers = await repo.listSubscribers();
    const activeSubscribers = subscribers.filter(s => s.status === 'active');
    
    console.log(`📊 Encontrados ${activeSubscribers.length} assinantes ativos`);

    let enabled = 0;
    let skipped = 0;
    let errors = 0;

    for (const subscriber of activeSubscribers) {
      try {
        // Verificar se já tem 2FA configurado
        const existing2FA = await repo.listEntities('User2FA', null);
        const has2FA = existing2FA.some(tfa => tfa.user_email === subscriber.email && tfa.enabled);

        if (has2FA) {
          console.log(`⏭️  Assinante ${subscriber.email} já tem 2FA ativado`);
          skipped++;
          continue;
        }

        // Buscar usuário correspondente
        const user = await repo.getUserByEmail(subscriber.email);
        if (!user) {
          console.log(`⚠️  Usuário não encontrado para ${subscriber.email}`);
          skipped++;
          continue;
        }

        // Criar registro de 2FA (mas não ativar ainda - o usuário precisa configurar)
        // O 2FA só será ativado quando o usuário escanear o QR code e verificar o código
        console.log(`📝 Preparando 2FA para ${subscriber.email}...`);
        
        // Não vamos criar automaticamente, apenas informar
        // O 2FA deve ser ativado pelo próprio usuário através da interface
        console.log(`✅ Assinante ${subscriber.email} pode ativar 2FA através do painel admin`);
        enabled++;
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${subscriber.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`✅ Prontos para ativar: ${enabled}`);
    console.log(`⏭️  Já ativados ou sem usuário: ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('\n💡 Nota: Os assinantes precisam ativar o 2FA manualmente através do painel admin em "Sistema > Autenticação 2FA"');

  } catch (error) {
    console.error('❌ Erro ao ativar 2FA:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  enable2FAForSubscribers()
    .then(() => {
      console.log('✅ Processo concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { enable2FAForSubscribers };
