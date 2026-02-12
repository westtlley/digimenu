/**
 * Server Entry Point
 * Ponto de entrada do servidor - apenas inicia o servidor HTTP
 */

import { config } from 'dotenv';
import http from 'http';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { getEnv } from './config/env.js';
import { setupWebSocket } from '../services/websocket.js';
import { initializeCronJobs } from '../utils/cronJobs.js';
import { scheduleBackups } from '../utils/backup.js';

// Carregar variáveis de ambiente
config({ path: new URL('../.env', import.meta.url) });

/**
 * Inicia o servidor
 */
async function startServer() {
  try {
    // Criar aplicação Express
    const app = await createApp();

    // Criar servidor HTTP
    const server = http.createServer(app);

    // Configurar WebSocket
    const io = setupWebSocket(server);

    // Obter porta
    const PORT = getEnv('PORT', '3000');

    // Iniciar servidor
    server.listen(PORT, () => {
      logger.info('🚀 Servidor iniciado', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        websocket: 'ativo'
      });

      // Inicializar cron jobs
      initializeCronJobs();

      // Configurar backups em produção
      if (process.env.NODE_ENV === 'production') {
        logger.info('✅ Modo produção ativo');
        if (process.env.DATABASE_URL) {
          scheduleBackups();
        }
      } else {
        logger.warn('⚠️ Modo desenvolvimento - algumas proteções estão desabilitadas');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM recebido, encerrando servidor...');
      server.close(() => {
        logger.info('✅ Servidor encerrado');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('🛑 SIGINT recebido, encerrando servidor...');
      server.close(() => {
        logger.info('✅ Servidor encerrado');
        process.exit(0);
      });
    });

    return { server, io };
  } catch (error) {
    logger.error('❌ Erro ao iniciar servidor:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Iniciar servidor
startServer();
