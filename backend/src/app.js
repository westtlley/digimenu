/**
 * Express Application
 * Configuração centralizada da aplicação Express
 */

import express from 'express';
import compression from 'compression';
import { validateEnv } from './config/env.js';
import { initializeDatabase, testConnection } from './config/database.js';
import { setupHelmet, setupCors, sanitizeInput } from './middlewares/security.js';
import { authenticate } from './middlewares/auth.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { logger } from './utils/logger.js';
import { apiLimiter, loginLimiter, createLimiter } from './config/rateLimit.js';
import { requestLogger } from '../utils/monitoring.js';
import { analyticsMiddleware } from '../utils/analytics.js';
import { sanitizeMiddleware } from '../utils/sanitize.js';
import passport from 'passport';

// Importar rotas
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes, { colaboradoresRouter } from '../modules/users/users.routes.js';
import establishmentsRoutes from '../modules/establishments/establishments.routes.js';
import menusRoutes from '../modules/menus/menus.routes.js';
import ordersRoutes from '../modules/orders/orders.routes.js';

// Importar outras rotas existentes
import analyticsRoutes from '../routes/analytics.routes.js';
import backupRoutes from '../routes/backup.routes.js';
import subscriberBackupRoutes from '../routes/subscriberBackup.routes.js';
import mercadopagoRoutes from '../routes/mercadopago.routes.js';
import metricsRoutes from '../routes/metrics.routes.js';
import affiliatesRoutes from '../routes/affiliates.routes.js';
import lgpdRoutes from '../routes/lgpd.routes.js';
import entitiesRoutes from './routes/entities.routes.js';

/**
 * Cria e configura a aplicação Express
 */
export async function createApp() {
  // Validar variáveis de ambiente
  validateEnv();

  // Inicializar banco de dados
  initializeDatabase();
  await testConnection();

  // Criar aplicação Express
  const app = express();

  // =======================
  // 🧱 MIDDLEWARES GLOBAIS
  // =======================

  // Segurança
  setupHelmet(app);
  setupCors(app);

  // Compressão
  app.use(compression());

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Sanitização
  app.use(sanitizeInput);
  app.use(sanitizeMiddleware);

  // Logging
  app.use(requestLogger);

  // Analytics
  app.use(analyticsMiddleware);

  // Rate limiting
  app.use('/api', apiLimiter);

  // Passport (OAuth)
  app.use(passport.initialize());

  // =======================
  // 🛣️ ROTAS
  // =======================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'API está funcionando',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Rotas públicas (antes da autenticação)
  app.use('/api/auth', loginLimiter, authRoutes);
  app.use('/api/public', menusRoutes); // Cardápio público
  app.use('/api/public', ordersRoutes); // Pedido público

  // Autenticação (aplicar em todas as rotas protegidas)
  app.use('/api', authenticate);

  // Rotas protegidas
  app.use('/api/users', usersRoutes);
  app.use('/api/colaboradores', colaboradoresRouter);
  app.use('/api/establishments', establishmentsRoutes);
  app.use('/api/menus', menusRoutes);
  app.use('/api/orders', ordersRoutes);

  // Outras rotas
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/subscriber-backup', subscriberBackupRoutes);
  app.use('/api/mercadopago', mercadopagoRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/affiliates', affiliatesRoutes);
  app.use('/api/lgpd', lgpdRoutes);

  // Rotas genéricas de entidades (manter compatibilidade)
  // Nota: Estas rotas serão migradas gradualmente para os módulos específicos
  app.use('/api/entities', createLimiter, entitiesRoutes);

  // =======================
  // ❌ TRATAMENTO DE ERROS
  // =======================

  // Rota não encontrada
  app.use(notFoundHandler);

  // Handler global de erros (deve ser o último)
  app.use(errorHandler);

  logger.info('✅ Aplicação Express configurada');

  return app;
}

export default createApp;
