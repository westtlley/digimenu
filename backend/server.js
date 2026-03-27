// =======================
// ðŸŒ± ENV CONFIG
// =======================
// NOTA: As variÃ¡veis de ambiente jÃ¡ foram carregadas pelo bootstrap.js
// Se este arquivo for executado diretamente (sem bootstrap), 
// o loadEnv.js serÃ¡ importado automaticamente via side-effect quando necessÃ¡rio
// (mÃ³dulos que precisam de env importam loadEnv.js no topo)

// Log de validaÃ§Ã£o (apÃ³s env carregado)
// Usar setImmediate para garantir que env foi carregado (se executado diretamente)
setImmediate(() => {
  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_CHATBOT_KEY || '';
  console.log('ðŸ§ª ENV VALIDATED:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'âœ… Configurado' : 'âŒ NÃ£o configurado',
    JWT_SECRET: process.env.JWT_SECRET ? 'âœ… Configurado' : 'âŒ NÃ£o configurado',
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    'OpenAI assistente': (openaiKey && openaiKey.trim()) ? 'âœ… Ativado' : 'âš ï¸ NÃ£o configurado (use OPENAI_API_KEY no .env)'
  });
});

// =======================
// ðŸ“¦ IMPORTS
// =======================
import express from 'express';
import http from 'http';
import cors from 'cors';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { setupWebSocket, emitOrderUpdate, emitOrderCreated, emitComandaUpdate, emitComandaCreated, emitTableUpdate } from './services/websocket.js';
import { getAIResponse, isAIAvailable } from './services/chatAI.js';
import { finalizePdvSaleAtomic } from './services/pdvFinalizeSale.service.js';

import cloudinary from './config/cloudinary.js';
import { upload } from './middlewares/upload.js';
import { testConnection } from './db/postgres.js';
import { migrate } from './db/migrate.js';
import * as repo from './db/repository.js';
import { logger } from './utils/logger.js';
import { validateJWTSecret, setupHelmet, sanitizeMiddleware } from './middlewares/security.js';
import { requestLogger } from './utils/monitoring.js';
import { scheduleBackups } from './utils/backup.js';
import { analyticsMiddleware } from './utils/analytics.js';
import { initializeCronJobs } from './utils/cronJobs.js';
import { applyTenantContextToUser, resolveTenantContext } from './utils/tenantContext.js';
import { createOrderOperationalContract } from './modules/orders/orderOperationalContract.js';
import { createComandaOrderBridge } from './modules/comandas/comandaOrderBridge.js';
import { createRequestedTenantScopeApplier } from './modules/tenant/requestedTenantScope.js';
import { createManagerialEntityAuth } from './modules/entities/managerialEntityAuth.js';
import { createEntityAccessGuard } from './modules/entities/entityAccessGuard.js';
import { createEntityHandlers } from './modules/entities/entityHandlers.js';
import { createEntityBulkHandler } from './modules/entities/entityBulkHandler.js';
import { createFinalizeSaleHandler } from './modules/pdv/finalizeSaleHandler.js';
import { createPdvCatalogHandler } from './modules/pdv/pdvCatalogHandler.js';
import { createCaixaShiftHandlers } from './modules/caixa/caixaShiftHandlers.js';
import { createManagerialAuthHandlers } from './modules/managerialAuth/managerialAuthHandlers.js';
import analyticsRoutes from './routes/analytics.routes.js';
import backupRoutes from './routes/backup.routes.js';
import { beverageIntelligenceRouter, publicBeverageIntelligenceRouter } from './routes/beverageIntelligence.routes.js';
import mediaRouter from './routes/media.routes.js';
import subscriberBackupRoutes from './routes/subscriberBackup.routes.js';
import mercadopagoRoutes from './routes/mercadopago.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import affiliatesRoutes from './routes/affiliates.routes.js';
import lgpdRoutes from './routes/lgpd.routes.js';
import authRoutes, { getUserContext } from './modules/auth/auth.routes.js';
import * as authController from './modules/auth/auth.controller.js';
import { registerGoogleAuth } from './modules/auth/googleAuthSetup.js';
import { generatePasswordTokenForSubscriber, generateToken } from './modules/auth/auth.service.js';
import usersRoutes, { colaboradoresRouter } from './modules/users/users.routes.js';
import * as usersController from './modules/users/users.controller.js';
import establishmentsRoutes from './modules/establishments/establishments.routes.js';
import * as establishmentsController from './modules/establishments/establishments.controller.js';
import { createUpdateSubscriberFunctionHandler } from './modules/establishments/updateSubscriberFunctionHandler.js';
import {
  createCreateSubscriberFunctionHandler,
  createGetSubscribersFunctionHandler,
} from './modules/establishments/subscriberFunctionHandlers.js';
import menusRoutes from './modules/menus/menus.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import { initializeAppConfig } from './config/appConfig.js';
import { apiLimiter, createLimiter } from './middlewares/rateLimit.js';
import { errorHandler, asyncHandler } from './middlewares/errorHandler.js';
import { compressionMiddleware } from './middlewares/compression.js';
import { authenticate } from './middlewares/auth.js';

// =======================
// âš™ï¸ APP SETUP
// =======================
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const collapseUrlSlashes = (value = '') => String(value || '').replace(/([^:]\/)\/+/g, '$1');

const normalizeBaseUrl = (value = '') => collapseUrlSlashes(String(value || '').trim()).replace(/\/+$/, '');

const stripApiSuffix = (value = '') => normalizeBaseUrl(value).replace(/\/api$/i, '');

const sanitizeDuplicatedApiSegment = (value = '') => normalizeBaseUrl(value).replace(/\/api\/api(?=\/|$)/gi, '/api');

const buildGoogleCallbackUrl = (backendBaseUrl = '') => sanitizeDuplicatedApiSegment(
  `${stripApiSuffix(backendBaseUrl)}/api/auth/google/callback`
);

const toOrigin = (value = '') => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return null;
  try {
    return new URL(normalized).origin;
  } catch {
    return normalized;
  }
};

const requireInProduction = (name, value) => {
  if (isProd && !value) {
    throw new Error(`${name} Ã© obrigatÃ³rio em produÃ§Ã£o`);
  }
  return value;
};

const assertNotLocalhostInProduction = (name, value) => {
  if (!isProd || !value) return value;
  const lower = String(value).toLowerCase();
  if (lower.includes('localhost') || lower.includes('127.0.0.1')) {
    throw new Error(`${name} invalido em producao: ${value}`);
  }
  return value;
};

// âœ… VALIDAR JWT_SECRET (obrigatÃ³rio em produÃ§Ã£o)
validateJWTSecret();

const FRONTEND_URL = assertNotLocalhostInProduction(
  'FRONTEND_URL',
  requireInProduction(
    'FRONTEND_URL',
    normalizeBaseUrl(process.env.FRONTEND_URL || (!isProd ? 'http://localhost:5173' : ''))
  )
);
const BACKEND_URL = assertNotLocalhostInProduction(
  'BACKEND_URL (ou RENDER_EXTERNAL_URL)',
  requireInProduction(
    'BACKEND_URL (ou RENDER_EXTERNAL_URL)',
    stripApiSuffix(process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || (!isProd ? `http://localhost:${PORT}` : ''))
  )
);
const GOOGLE_CALLBACK_URL = assertNotLocalhostInProduction(
  'GOOGLE_CALLBACK_URL',
  process.env.GOOGLE_CALLBACK_URL
    ? sanitizeDuplicatedApiSegment(process.env.GOOGLE_CALLBACK_URL)
    : buildGoogleCallbackUrl(BACKEND_URL)
);

// CORS: allowedOrigins Set (evita cb(new Error) que causa pending/canceled)
const _envList = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const wildcardOriginRules = _envList
  .filter(origin => origin.includes('*'))
  .map((originPattern) => {
    const normalizedPattern = normalizeBaseUrl(originPattern);
    const patternWithScheme = /^https?:\/\//i.test(normalizedPattern)
      ? normalizedPattern
      : (normalizedPattern.startsWith('*.') ? `https://${normalizedPattern}` : normalizedPattern);
    const escaped = patternWithScheme.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  });
const allowedOrigins = new Set([
  'https://digimenu-chi.vercel.app',
  'https://digimenu.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  FRONTEND_URL,
  ..._envList
].map(toOrigin).filter(Boolean));
const isHttpsVercelPreviewOrigin = (origin = '') =>
  /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(String(origin || ''));
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// =======================
// ðŸ§± MIDDLEWARES
// =======================
// âœ… SEGURANÃ‡A: Helmet para headers de seguranÃ§a
setupHelmet(app);

// âœ… COMPRESSÃƒO DE RESPOSTAS (reduz tamanho em ~70%)
app.use(compressionMiddleware);

// âœ… CORS: preflight consistente (mesmo config para use e options)
const corsOptions = {
  origin: (origin, cb) => {
    // Em produÃ§Ã£o, nunca aceitar origin vazio.
    if (!origin) return cb(null, !isProd);
    
    const originToCheck = toOrigin(origin) || origin;
    const isExactAllowed = allowedOrigins.has(originToCheck);
    const isWildcardAllowed = wildcardOriginRules.some((rule) => rule.test(originToCheck));
    const isVercelPreviewAllowed = isHttpsVercelPreviewOrigin(originToCheck);

    if (isExactAllowed || isWildcardAllowed || isVercelPreviewAllowed) {
      if (!isProd) {
        const source = isExactAllowed
          ? 'exact-list'
          : (isWildcardAllowed ? 'env-wildcard' : 'vercel-preview');
        console.log('âœ… CORS: origem permitida:', { origin: originToCheck, source });
      }
      // Reflete a origem recebida (nunca usa "*"), compatÃ­vel com credentials=true.
      return cb(null, originToCheck);
    }
    
    if (!isProd) {
      console.warn('âš ï¸ CORS: origem bloqueada:', {
        origin: originToCheck,
        reason: 'not-in-exact-list-and-no-wildcard-match',
      });
      console.warn('ðŸ“‹ CORS: origens permitidas:', Array.from(allowedOrigins));
    }
    
    // Retornar false sem erro (nÃ£o bloqueia, apenas nÃ£o adiciona headers CORS)
    return cb(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Authorization', 'Content-Length', 'X-Request-Id'],
  credentials: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24h cache do preflight
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// âœ… SANITIZAÃ‡ÃƒO DE DADOS (proteÃ§Ã£o XSS)
app.use(sanitizeMiddleware);

// âœ… LOGGING DE REQUISIÃ‡Ã•ES
app.use(requestLogger);

// âœ… ANALYTICS (rastreamento de eventos)
app.use(analyticsMiddleware);

// âœ… RATE LIMITING (aplicar apÃ³s rotas pÃºblicas)
app.use('/api', apiLimiter);

// Inicializar Passport
app.use(passport.initialize());

// =======================
// ðŸ—ƒï¸ DATABASE (POSTGRESQL COM FALLBACK)
// =======================
// Verificar se DATABASE_URL estÃ¡ configurado
const usePostgreSQL = !!process.env.DATABASE_URL;

// Fallback: sistema de arquivos (apenas se nÃ£o usar PostgreSQL)
let db = null;
let saveDatabaseDebounced = null;

if (!usePostgreSQL) {
  console.log('âš ï¸ DATABASE_URL nÃ£o configurado, usando fallback em memÃ³ria');
  console.warn('ðŸš¨ ATENÃ‡ÃƒO: Fallback JSON Ã© apenas para desenvolvimento!');
  console.warn('ðŸš¨ NUNCA use em produÃ§Ã£o com assinantes ativos!');
  console.warn('ðŸš¨ Configure DATABASE_URL para usar PostgreSQL em produÃ§Ã£o.');
  
  const persistence = await import('./db/persistence.js');
  db = persistence.loadDatabase();
  saveDatabaseDebounced = persistence.saveDatabaseDebounced;
  
  // Garantir que o usuÃ¡rio admin sempre existe
  if (db && db.users && !db.users.find(u => u.email === 'admin@digimenu.com')) {
    db.users.push({
      id: '1',
      email: 'admin@digimenu.com',
      full_name: 'Administrador',
      is_master: true,
      role: 'admin',
      password: 'admin123'
    });
    persistence.saveDatabase(db);
  }
  
  // Salvar dados periodicamente
  setInterval(() => {
    persistence.saveDatabase(db);
  }, 30000);
  
  // Salvar ao encerrar
  process.on('SIGTERM', () => {
    console.log('ðŸ’¾ Salvando banco de dados antes de encerrar...');
    persistence.saveDatabase(db);
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('ðŸ’¾ Salvando banco de dados antes de encerrar...');
    persistence.saveDatabase(db);
    process.exit(0);
  });
} else {
  console.log('ðŸ—„ï¸ Usando PostgreSQL como banco de dados');
  
  // Testar conexÃ£o e executar migraÃ§Ã£o
  (async () => {
    try {
      const connected = await testConnection();
      if (connected) {
        await migrate();
        console.log('âœ… Banco de dados PostgreSQL pronto!');
      } else {
        console.warn('âš ï¸ PostgreSQL nÃ£o disponÃ­vel');
      }
    } catch (error) {
      console.error('âŒ Erro ao configurar PostgreSQL:', error.message);
    }
  })();
}

// Compartilha contexto global (db/tokens) para serviÃ§os que usam appConfig.
initializeAppConfig({
  db,
  saveDatabaseDebounced,
});

const { enforceOrderOperationalStatusContract } = createOrderOperationalContract({
  repo,
  db,
  usePostgreSQL,
});

const { upsertComandaProductionOrder } = createComandaOrderBridge({
  repo,
  db,
  usePostgreSQL,
  emitOrderCreated,
  emitOrderUpdate,
  saveDatabaseDebounced,
});

const { applyRequestedTenantScope } = createRequestedTenantScopeApplier({
  applyTenantContextToUser,
  resolveTenantContext,
});

const managerialEntityAuth = createManagerialEntityAuth({
  repo,
  db,
  usePostgreSQL,
});

const {
  applyBasicScopeFilterToItems,
  applyBasicScopeToEntityResult,
  enforceEntityReadAccess,
  enforceEntityWriteAccess,
  parseSubscriberPermissionMap,
} = createEntityAccessGuard({
  repo,
  db,
  usePostgreSQL,
  managerialEntityAuth,
});

const entityHandlers = createEntityHandlers({
  repo,
  db,
  usePostgreSQL,
  saveDatabaseDebounced,
  applyRequestedTenantScope,
  enforceEntityReadAccess,
  enforceEntityWriteAccess,
  parseSubscriberPermissionMap,
  applyBasicScopeToEntityResult,
  applyBasicScopeFilterToItems,
  enforceOrderOperationalStatusContract,
  upsertComandaProductionOrder,
  emitOrderCreated,
  emitOrderUpdate,
  emitComandaCreated,
  emitComandaUpdate,
  emitTableUpdate,
});

const entityBulkHandler = createEntityBulkHandler({
  repo,
  db,
  usePostgreSQL,
  saveDatabaseDebounced,
});

const finalizeSaleHandler = createFinalizeSaleHandler({
  applyRequestedTenantScope,
  enforceEntityWriteAccess,
  finalizePdvSaleAtomic,
});

const pdvCatalogHandler = createPdvCatalogHandler({
  repo,
  db,
  usePostgreSQL,
  saveDatabaseDebounced,
  applyRequestedTenantScope,
  enforceEntityWriteAccess,
});

const caixaShiftHandlers = createCaixaShiftHandlers({
  repo,
  db,
  usePostgreSQL,
  applyRequestedTenantScope,
  enforceEntityWriteAccess,
});

const managerialAuthHandlers = createManagerialAuthHandlers({
  repo,
  usePostgreSQL,
  bcrypt,
  managerialEntityAuth,
});

const updateSubscriberFunctionHandler = createUpdateSubscriberFunctionHandler({
  establishmentsController,
});

const createSubscriberFunctionHandler = createCreateSubscriberFunctionHandler({
  establishmentsController,
});

const getSubscribersFunctionHandler = createGetSubscribersFunctionHandler({
  establishmentsController,
});

// =======================
// ðŸ” GOOGLE OAUTH CONFIGURATION
// =======================
registerGoogleAuth({
  app,
  passport,
  repo,
  db,
  saveDatabaseDebounced,
  usePostgreSQL,
  FRONTEND_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  generateToken,
});

// =======================
// ðŸ” AUTHENTICATION MODULE
// =======================
// Inicializar controller com referÃªncias globais
authController.initializeAuthController(db, saveDatabaseDebounced);

// Registrar rotas do mÃ³dulo de autenticaÃ§Ã£o
app.use('/api/auth', authRoutes);

// =======================
// ðŸ–¼ï¸ IMAGE UPLOAD (registrada cedo para evitar 404 em produÃ§Ã£o)
// =======================
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  try {
    const folder = req.query.folder || 'dishes';
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          console.error('âŒ Cloudinary error:', error.message);
          return res.status(500).json({
            error: 'Erro ao enviar imagem para Cloudinary',
            details: error.message
          });
        }
        res.json({ url: result.secure_url });
      }
    );
    stream.end(req.file.buffer);
  } catch (error) {
    console.error('âŒ Erro no upload:', error);
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error.message
    });
  }
});

// Rota de contexto do usuÃ¡rio (separada)
app.get('/api/user/context', authenticate, getUserContext);

// =======================
// ðŸ‘¥ USERS MODULE
// =======================
// Inicializar controller com referÃªncias globais
usersController.initializeUsersController(db, saveDatabaseDebounced);

// Registrar rotas do mÃ³dulo de usuÃ¡rios
app.use('/api/users', usersRoutes);
// Alias legado mantido: /api/colaboradores -> mesma implementaÃ§Ã£o do mÃ³dulo users
app.use('/api/colaboradores', colaboradoresRouter);

// =======================
// ðŸ” ROTAS DE DEBUG (ANTES das outras para evitar 404)
// =======================
// DiagnÃ³stico rÃ¡pido - Apenas conta assinantes (SEM AUTH para debug)
app.get('/api/debug/count-subscribers', asyncHandler(async (req, res) => {
  try {
    const { query } = await import('./db/postgres.js');
    const countResult = await query('SELECT COUNT(*)::int as total FROM subscribers');
    const total = countResult.rows[0]?.total ?? 0;
    
    return res.json({
      status: 'ok',
      total_subscribers: total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}));

// Teste DIRETO do repository.listSubscribers (SEM AUTH, para debug)
app.get('/api/debug/list-subscribers-direct', asyncHandler(async (req, res) => {
  try {
    console.log('ðŸ” [debug/list-subscribers-direct] Iniciando teste direto...');
    const startTime = Date.now();
    
    const result = await repo.listSubscribers({ page: 1, limit: 50 });
    
    const elapsed = Date.now() - startTime;
    console.log(`âœ… [debug/list-subscribers-direct] Completou em ${elapsed}ms`);
    
    return res.json({
      status: 'ok',
      elapsed_ms: elapsed,
      total: result.pagination?.total || result.data?.length || 0,
      returned: result.data?.length || 0,
      sample: result.data?.slice(0, 2).map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        plan: s.plan
      })) || []
    });
  } catch (error) {
    console.error('âŒ [debug/list-subscribers-direct] Erro:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
}));

// Debug: Listar pratos diretamente (sem filtros de usuÃ¡rio)
app.get('/api/debug/list-dishes-direct', asyncHandler(async (req, res) => {
  try {
    console.log('ðŸ” [debug/list-dishes-direct] Iniciando teste direto...');
    const startTime = Date.now();
    
    // Query SQL direta para ver TODOS os pratos
    const { query } = await import('./db/postgres.js');
    const result = await query(`
      SELECT 
        id,
        entity_type,
        subscriber_email,
        data->>'name' as name,
        data->>'owner_email' as owner_email,
        created_at
      FROM entities
      WHERE entity_type = 'Dish'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    const elapsed = Date.now() - startTime;
    console.log(`âœ… [debug/list-dishes-direct] Completou em ${elapsed}ms`);
    
    // Agrupar por subscriber_email
    const bySubscriber = {};
    result.rows.forEach(dish => {
      const sub = dish.subscriber_email || 'NULL';
      if (!bySubscriber[sub]) bySubscriber[sub] = [];
      bySubscriber[sub].push(dish);
    });
    
    return res.json({
      status: 'ok',
      elapsed_ms: elapsed,
      total: result.rows.length,
      by_subscriber: Object.entries(bySubscriber).map(([email, dishes]) => ({
        subscriber_email: email,
        count: dishes.length,
        sample: dishes.slice(0, 2).map(d => ({
          id: d.id,
          name: d.name,
          owner_email: d.owner_email
        }))
      })),
      sample_all: result.rows.slice(0, 3).map(d => ({
        id: d.id,
        name: d.name,
        subscriber_email: d.subscriber_email,
        owner_email: d.owner_email
      }))
    });
  } catch (error) {
    console.error('âŒ [debug/list-dishes-direct] Erro:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
}));

// Debug: Testar listEntities com as_subscriber
app.get('/api/debug/test-list-dishes', asyncHandler(async (req, res) => {
  try {
    const { as_subscriber } = req.query;
    console.log('ðŸ” [debug/test-list-dishes] Testando listEntities...', { as_subscriber });
    const startTime = Date.now();
    
    // Simular usuÃ¡rio master
    const mockUser = {
      email: 'master@system.com',
      is_master: true,
      _contextForSubscriber: as_subscriber || null
    };
    
    // Chamar listEntities como a rota faz
    const result = await repo.listEntities('Dish', {}, 'order', mockUser);
    const items = result.items || result || [];
    
    const elapsed = Date.now() - startTime;
    console.log(`âœ… [debug/test-list-dishes] Completou em ${elapsed}ms`);
    
    return res.json({
      status: 'ok',
      elapsed_ms: elapsed,
      as_subscriber: as_subscriber || null,
      has_pagination: !!result.pagination,
      total: items.length,
      sample: items.slice(0, 5).map(d => ({
        id: d.id,
        name: d.name,
        owner_email: d.owner_email
      }))
    });
  } catch (error) {
    console.error('âŒ [debug/test-list-dishes] Erro:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
}));

// DiagnÃ³stico: qual usuÃ¡rio estÃ¡ associado ao token (apenas dev ou DEBUG_ME_ENABLED)
app.get('/api/debug/me', authenticate, (req, res) => {
  const enabled = process.env.NODE_ENV !== 'production' || process.env.DEBUG_ME_ENABLED === 'true';
  if (!enabled) return res.status(404).json({ error: 'Not found' });
  res.json({
    email: req.user?.email,
    is_master: req.user?.is_master,
    profile_role: req.user?.profile_role,
    source: 'authenticate'
  });
});

// =======================
// ðŸª ESTABLISHMENTS MODULE
// =======================
// Registrar rotas do mÃ³dulo de estabelecimentos (incluindo GET /subscribers com requireMaster)
app.use('/api/establishments', establishmentsRoutes);
// Alias para compatibilidade
app.use('/api/subscribers', establishmentsRoutes);

// =======================
// ðŸ“¦ ENTITIES + MANAGERIAL-AUTH (registrar antes de menus/orders para evitar 404)
// =======================
const entitiesAndManagerialRouter = express.Router();
entitiesAndManagerialRouter.get(
  '/managerial-auth',
  authenticate,
  asyncHandler(managerialAuthHandlers.getManagerialAuth)
);
entitiesAndManagerialRouter.post(
  '/managerial-auth',
  authenticate,
  asyncHandler(managerialAuthHandlers.upsertManagerialAuth)
);
entitiesAndManagerialRouter.post(
  '/managerial-auth/validate',
  authenticate,
  asyncHandler(managerialAuthHandlers.validateManagerialAuth)
);
// Listar entidades (evitar 404 em produÃ§Ã£o quando rotas sÃ£o testadas antes de menus/orders)
entitiesAndManagerialRouter.get(
  '/entities/:entity',
  authenticate,
  asyncHandler(entityHandlers.listEntities)
);
entitiesAndManagerialRouter.get(
  '/entities/:entity/:id',
  authenticate,
  entityHandlers.getEntityById
);
// Entities CRUD - must run BEFORE entitiesAndManagerialRouter (which returns 404 for unmatched methods)
app.post(
  '/api/entities/:entity',
  authenticate,
  createLimiter,
  asyncHandler(entityHandlers.createEntity)
);
app.put(
  '/api/entities/:entity/:id',
  authenticate,
  asyncHandler(entityHandlers.updateEntity)
);
app.delete(
  '/api/entities/:entity/:id',
  authenticate,
  asyncHandler(entityHandlers.deleteEntity)
);
app.post(
  '/api/entities/:entity/bulk',
  authenticate,
  createLimiter,
  asyncHandler(entityBulkHandler)
);

app.post(
  '/api/pdv/finalizar-venda',
  authenticate,
  createLimiter,
  asyncHandler(finalizeSaleHandler)
);
app.use('/api/public/beverages', publicBeverageIntelligenceRouter);
app.use('/api/beverages', authenticate, beverageIntelligenceRouter);
app.use('/api/media', authenticate, mediaRouter);
app.patch(
  '/api/dishes/:id/pdv',
  authenticate,
  asyncHandler(pdvCatalogHandler.patchDishPdvStatus)
);
app.patch(
  '/api/dishes/:id/pdv-code',
  authenticate,
  asyncHandler(pdvCatalogHandler.patchDishPdvCode)
);
app.post(
  '/api/caixa/open',
  authenticate,
  createLimiter,
  asyncHandler(caixaShiftHandlers.openShift)
);
app.post(
  '/api/caixa/movement',
  authenticate,
  createLimiter,
  asyncHandler(caixaShiftHandlers.createMovement)
);
app.post(
  '/api/caixa/:id/close',
  authenticate,
  createLimiter,
  asyncHandler(caixaShiftHandlers.closeShift)
);

// =======================
// ðŸ”§ FUNCTIONS - Rotas especÃ­ficas ANTES dos routers (evitar 404)
// =======================
// updateSubscriber via /api/functions/updateSubscriber
app.post('/api/functions/updateSubscriber', authenticate, updateSubscriberFunctionHandler);

// createSubscriber via /api/functions/createSubscriber
app.post('/api/functions/createSubscriber', authenticate, createSubscriberFunctionHandler);

// getSubscribers via /api/functions/getSubscribers
app.post('/api/functions/getSubscribers', authenticate, getSubscribersFunctionHandler);

// getFullSubscriberProfile: rota explÃ­cita para evitar 404 quando /api Ã© montado antes do handler genÃ©rico
app.post('/api/functions/getFullSubscriberProfile', authenticate, async (req, res) => {
  if (!req.user?.is_master) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { subscriber_email } = req.body || {};
  if (!subscriber_email) {
    return res.status(400).json({ error: 'subscriber_email Ã© obrigatÃ³rio' });
  }
  try {
    const subscriber = usePostgreSQL
      ? await repo.getSubscriberByEmail(subscriber_email)
      : (db && db.subscribers ? db.subscribers.find(s => s.email?.toLowerCase() === subscriber_email?.toLowerCase()) : null);
    if (!subscriber) {
      return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
    }
    let dishes = [], categories = [], complement_groups = [], combos = [], orders = [], caixas = [], comandas = [];
    let store = null;
    if (usePostgreSQL) {
      const se = subscriber.email;
      dishes = await repo.listEntitiesForSubscriber('Dish', se, null);
      categories = await repo.listEntitiesForSubscriber('Category', se, 'order');
      complement_groups = await repo.listEntitiesForSubscriber('ComplementGroup', se, 'order');
      combos = await repo.listEntitiesForSubscriber('Combo', se, null);
      orders = await repo.listEntitiesForSubscriber('Order', se, '-created_date');
      caixas = await repo.listEntitiesForSubscriber('Caixa', se, null);
      comandas = await repo.listEntitiesForSubscriber('Comanda', se, '-created_at');
      const stores = await repo.listEntitiesForSubscriber('Store', se, null);
      store = stores[0] || null;
    } else if (db && db.entities) {
      dishes = (db.entities.Dish || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
      categories = (db.entities.Category || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
      complement_groups = (db.entities.ComplementGroup || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
      combos = (db.entities.Combo || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
      orders = (db.entities.Order || []).filter(e => e.owner_email === subscriber.email || e.customer_email === subscriber.email || !e.owner_email);
      caixas = (db.entities.Caixa || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
      comandas = (db.entities.Comanda || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
      const stores = (db.entities.Store || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
      store = stores[0] || null;
    }
    const stats = {
      total_dishes: dishes.length,
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
      active_caixas: caixas.filter(c => c.status === 'open').length,
      total_comandas: comandas.length,
      comandas_abertas: comandas.filter(c => c.status === 'open').length
    };
    return res.json({
      data: { dishes, categories, complement_groups, combos, orders, caixas, comandas, store },
      stats,
      subscriber
    });
  } catch (error) {
    console.error('âŒ [getFullSubscriberProfile] Erro:', error);
    return res.status(500).json({ error: 'Erro ao buscar perfil do assinante', details: error.message });
  }
});

// generatePasswordTokenForSubscriber: rota explÃ­cita para evitar 404 (Resetar Senha em Assinantes)
app.post('/api/functions/generatePasswordTokenForSubscriber', authenticate, async (req, res) => {
  if (!req.user?.is_master) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { subscriber_id, email } = req.body || {};
  if (!subscriber_id && !email) {
    return res.status(400).json({ error: 'subscriber_id ou email Ã© obrigatÃ³rio' });
  }
  try {
    let subscriber = null;
    if (usePostgreSQL) {
      if (email) {
        subscriber = await repo.getSubscriberByEmail(email);
      } else if (subscriber_id) {
        const raw = await repo.listSubscribers();
        const list = Array.isArray(raw) ? raw : (raw?.data || []);
        subscriber = list.find(s => s.id === parseInt(subscriber_id) || s.id === subscriber_id);
      }
    } else if (db && db.subscribers) {
      subscriber = db.subscribers.find(s =>
        (email && s.email?.toLowerCase() === email?.toLowerCase()) || s.id === subscriber_id || s.id === String(subscriber_id)
      );
    }
    if (!subscriber) {
      return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
    }
    const tokenData = generatePasswordTokenForSubscriber(
      subscriber.email,
      subscriber.id || subscriber.email
    );
    return res.json({
      data: {
        token: tokenData.token,
        setup_url: tokenData.setup_url,
        expires_at: tokenData.expires_at
      }
    });
  } catch (error) {
    console.error('âŒ [generatePasswordTokenForSubscriber] Erro:', error);
    return res.status(500).json({ error: 'Erro ao gerar token de senha', details: error.message });
  }
});

app.use('/api', entitiesAndManagerialRouter);

// =======================
// ðŸ“‹ MENUS MODULE
// =======================
// Registrar rotas do mÃ³dulo de menus
app.use('/api', menusRoutes);

// =======================
// ðŸ›’ ORDERS MODULE
// =======================
// Registrar rotas do mÃ³dulo de pedidos
app.use('/api', ordersRoutes);

// =======================
// ðŸ”— CONFIG DA PÃGINA DE VENDAS /assinar (planos, preÃ§os, trial) â€” pÃºblico
// =======================
app.get('/api/public/assinar-config', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.json({ plans_override: null });
  }
  const config = await repo.getFirstPaymentConfigGlobal();
  if (!config) {
    return res.json({ plans_override: null });
  }
  return res.json({
    plans_override: config.plans_override || null,
  });
}));

// Chat do assistente com IA (pÃºblico para o cardÃ¡pio)
app.post('/api/public/chat', asyncHandler(async (req, res) => {
  const { message, slug, storeName, dishesSummary, menuFull, deliveryInfo, paymentOptions, history, storeAddress, storeWhatsapp, storeHours, storeSlogan, storeInstagram, storeFacebook } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Campo message Ã© obrigatÃ³rio' });
  }
  const context = {
    storeName: storeName || 'o estabelecimento',
    dishesSummary: typeof dishesSummary === 'string' ? dishesSummary : '',
    menuFull: typeof menuFull === 'string' ? menuFull : '',
    deliveryInfo: typeof deliveryInfo === 'string' ? deliveryInfo : '',
    paymentOptions: typeof paymentOptions === 'string' ? paymentOptions : '',
    slug: slug || '',
    storeAddress: typeof storeAddress === 'string' ? storeAddress : '',
    storeWhatsapp: typeof storeWhatsapp === 'string' ? storeWhatsapp : '',
    storeHours: typeof storeHours === 'string' ? storeHours : '',
    storeSlogan: typeof storeSlogan === 'string' ? storeSlogan : '',
    storeInstagram: typeof storeInstagram === 'string' ? storeInstagram : '',
    storeFacebook: typeof storeFacebook === 'string' ? storeFacebook : '',
  };
  const hist = Array.isArray(history) ? history.slice(-10) : [];
  const result = await getAIResponse(message.trim(), context, hist);
  if (!result) {
    return res.status(503).json({
      error: 'Assistente com IA indisponÃ­vel',
      hint: isAIAvailable() ? 'Tente novamente em instantes.' : 'Configure OPENAI_API_KEY no backend para ativar respostas inteligentes.'
    });
  }
  const payload = { text: result.text, suggestions: result.suggestions || [] };
  if (result.step) payload.step = result.step;
  res.json(payload);
}));

// =======================
// ðŸ”§ ENDPOINT PARA EXECUTAR MIGRAÃ‡ÃƒO SQL
// =======================
const runMigrationHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'MigraÃ§Ã£o requer PostgreSQL' });
  }

  const secretKey = req.headers['x-migration-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'NÃ£o autorizado. Configure CLEANUP_SECRET_KEY.' });
  }

  const migrationName = req.query.migration || req.body.migration;
  if (!migrationName) {
    return res.status(400).json({ error: 'ParÃ¢metro "migration" Ã© obrigatÃ³rio' });
  }

  try {
    console.log(`ðŸ”§ Executando migraÃ§Ã£o: ${migrationName}`);
    const { query } = await import('./db/postgres.js');
    
    if (migrationName === 'add_slug_to_users') {
      // Adicionar coluna slug se nÃ£o existir
      await query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
      `);
      
      // Criar Ã­ndice
      await query(`
        CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
      `);
      
      console.log('âœ… MigraÃ§Ã£o add_slug_to_users executada com sucesso');
      
      return res.json({
        success: true,
        message: 'MigraÃ§Ã£o add_slug_to_users executada com sucesso!',
        migration: migrationName
      });
    }
    
    return res.status(400).json({
      error: 'MigraÃ§Ã£o nÃ£o encontrada',
      available_migrations: ['add_slug_to_users']
    });

  } catch (error) {
    console.error('âŒ Erro ao executar migraÃ§Ã£o:', error);
    res.status(500).json({ 
      error: 'Erro ao executar migraÃ§Ã£o',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/run-migration', runMigrationHandler);
app.post('/api/run-migration', runMigrationHandler);

// =======================
// ðŸ” ENDPOINT DE DEBUG PARA VER ESTADO DO USUÃRIO
// =======================
const debugUserHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Debug requer PostgreSQL' });
  }

  const secretKey = req.headers['x-debug-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'NÃ£o autorizado. Configure CLEANUP_SECRET_KEY.' });
  }

  try {
    const { query } = await import('./db/postgres.js');
    
    // 1. Ver estrutura da tabela users
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    // 2. Ver todos os usuÃ¡rios master
    const mastersResult = await query(
      'SELECT id, email, full_name, is_master, slug FROM users WHERE is_master = TRUE'
    );
    
    // 3. Ver todos os subscribers
    const subscribersResult = await query(
      'SELECT id, email, name, slug, plan, status FROM subscribers'
    );
    
    res.json({
      success: true,
      database: {
        users_columns: columnsResult.rows,
        masters: mastersResult.rows,
        subscribers: subscribersResult.rows,
        has_slug_column: columnsResult.rows.some(col => col.column_name === 'slug')
      }
    });

  } catch (error) {
    console.error('âŒ Erro ao debugar:', error);
    res.status(500).json({ 
      error: 'Erro ao debugar',
      message: error.message
    });
  }
});

app.get('/api/debug-user', debugUserHandler);
app.post('/api/debug-user', debugUserHandler);

// =======================
// ðŸª ENDPOINT PARA CONFIGURAR LOJA DO MASTER
// =======================
const setupMasterStoreHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Setup requer PostgreSQL' });
  }

  const secretKey = req.headers['x-setup-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'NÃ£o autorizado. Configure CLEANUP_SECRET_KEY.' });
  }

  try {
    console.log('ðŸª Configurando loja para usuÃ¡rio master...');
    const { query } = await import('./db/postgres.js');
    
    // 1. Buscar usuÃ¡rio master
    const masterResult = await query(
      'SELECT id, email, full_name, slug FROM users WHERE is_master = TRUE LIMIT 1'
    );
    
    if (masterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuÃ¡rio master encontrado' });
    }
    
    const master = masterResult.rows[0];
    console.log('âœ“ Master encontrado:', master.email);
    
    // 2. Verificar se jÃ¡ existe loja para o master
    const storeResult = await query(
      `SELECT * FROM entities 
       WHERE entity_type = 'Store' 
       AND subscriber_email IS NULL
       LIMIT 1`
    );
    
    let store;
    if (storeResult.rows.length > 0) {
      store = storeResult.rows[0];
      console.log('âœ“ Loja jÃ¡ existe para o master');
    } else {
      // 3. Criar loja para o master
      console.log('â†’ Criando loja para o master...');
      const storeData = {
        name: 'Loja Master',
        slogan: 'Bem-vindo!',
        whatsapp: '',
        address: '',
        is_open: true,
        accepting_orders: true,
        primary_color: '#f97316',
        opening_time: '08:00',
        closing_time: '22:00',
        working_days: [0, 1, 2, 3, 4, 5, 6],
        enable_premium_pizza_visualization: true
      };
      
      const insertResult = await query(
        `INSERT INTO entities (entity_type, subscriber_email, data, created_at, updated_at)
         VALUES ($1, NULL, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        ['Store', JSON.stringify(storeData)]
      );
      
      store = insertResult.rows[0];
      console.log('âœ“ Loja criada para o master');
    }
    
    res.json({
      success: true,
      message: 'Master configurado com sucesso!',
      master: {
        id: master.id,
        email: master.email,
        slug: master.slug,
        cardapio_url: master.slug ? `https://digimenu-chi.vercel.app/s/${master.slug}` : null
      },
      store: {
        id: store.id,
        name: store.data.name
      }
    });

  } catch (error) {
    console.error('âŒ Erro ao configurar master:', error);
    res.status(500).json({ 
      error: 'Erro ao configurar master',
      message: error.message
    });
  }
});

app.get('/api/setup-master-store', setupMasterStoreHandler);
app.post('/api/setup-master-store', setupMasterStoreHandler);

// =======================
// ðŸš€ START SERVER
// =======================
// Criar servidor HTTP para WebSocket
const server = http.createServer(app);

// âœ… CONFIGURAR WEBSOCKETS
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`ðŸš€ Servidor rodando na porta ${PORT}`);
  console.log(`ðŸ“¡ ${isProd ? `${BACKEND_URL}/api` : `http://localhost:${PORT}/api`}`);
  console.log(`ðŸ”’ Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ðŸ”Œ WebSocket ativo`);
  console.log(`ðŸ”§ Functions compatibility routes montadas`);
  
  // ðŸ”” Inicializar cron jobs (notificaÃ§Ãµes de expiraÃ§Ã£o)
  initializeCronJobs();
  
  if (process.env.NODE_ENV === 'production') {
    console.log('âœ… Modo produÃ§Ã£o ativo');
    
    // Inicializar backup automÃ¡tico em produÃ§Ã£o
    if (process.env.DATABASE_URL) {
      scheduleBackups();
    }
  } else {
    console.log('âš ï¸ Modo desenvolvimento - algumas proteÃ§Ãµes estÃ£o desabilitadas');
  }
});

