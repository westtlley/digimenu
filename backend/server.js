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
import jwt from 'jsonwebtoken';
import passport from 'passport';
import crypto from 'crypto';
import { setupWebSocket, emitOrderUpdate, emitOrderCreated, emitComandaUpdate, emitComandaCreated, emitWaiterCall, emitTableUpdate } from './services/websocket.js';
import { getAIResponse, isAIAvailable } from './services/chatAI.js';
import { finalizePdvSaleAtomic } from './services/pdvFinalizeSale.service.js';

import cloudinary from './config/cloudinary.js';
import { upload } from './middlewares/upload.js';
import { testConnection } from './db/postgres.js';
import { migrate } from './db/migrate.js';
import * as repo from './db/repository.js';
import { PLANS, getPlanInfo } from './utils/plans.js';
import { logger } from './utils/logger.js';
import { validateJWTSecret, sanitizeForLog, setupHelmet, sanitizeMiddleware } from './middlewares/security.js';
import { storeToken, getToken, deleteToken } from './utils/tokenStorage.js';
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
import { createManagerialAuthHandlers } from './modules/managerialAuth/managerialAuthHandlers.js';
import analyticsRoutes from './routes/analytics.routes.js';
import backupRoutes from './routes/backup.routes.js';
import subscriberBackupRoutes from './routes/subscriberBackup.routes.js';
import mercadopagoRoutes from './routes/mercadopago.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import affiliatesRoutes from './routes/affiliates.routes.js';
import lgpdRoutes from './routes/lgpd.routes.js';
import authRoutes, { getUserContext } from './modules/auth/auth.routes.js';
import * as authController from './modules/auth/auth.controller.js';
import { registerGoogleAuth } from './modules/auth/googleAuthSetup.js';
import { generatePasswordTokenForSubscriber } from './modules/auth/auth.service.js';
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
import { loginLimiter, apiLimiter, createLimiter } from './middlewares/rateLimit.js';
import { validate, schemas } from './middlewares/validation.js';
import { errorHandler, asyncHandler } from './middlewares/errorHandler.js';
import { compressionMiddleware } from './middlewares/compression.js';

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
const JWT_SECRET = validateJWTSecret();

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

// Tokens agora sÃ£o gerenciados pelo tokenStorage (Redis ou banco)
// Mantido para compatibilidade durante migraÃ§Ã£o
const activeTokens = {};
const passwordTokens = {};

// Compartilha contexto global (db/tokens) para serviÃ§os que usam appConfig.
initializeAppConfig({
  db,
  saveDatabaseDebounced,
  activeTokens,
  passwordTokens
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

// âœ… FunÃ§Ã£o generatePasswordTokenForSubscriber movida para: backend/modules/auth/auth.service.js
// Importar quando necessÃ¡rio: import { generatePasswordTokenForSubscriber } from './modules/auth/auth.service.js';

// =======================
// ðŸ” AUTH HELPERS
// =======================
const extractTokenFromRequest = req =>
  req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

// Rotas pÃºblicas que nÃ£o precisam de autenticaÃ§Ã£o
const publicRoutes = [
  '/api/health',
  '/api/upload-image',
  '/api/auth/login',
  '/api/auth/me',  // Permitir chamadas de verificaÃ§Ã£o de auth
  '/api/auth/set-password',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/public/cardapio',  // /api/public/cardapio/:slug â€” link Ãºnico do cardÃ¡pio por assinante
  '/api/public/login-info', // /api/public/login-info/:slug â€” dados para pÃ¡gina de login por estabelecimento
  '/api/public/chat',      // Chat do assistente (IA) â€” pÃºblico para o cardÃ¡pio
  '/api/public/assinar-config',   // Config da pÃ¡gina de vendas (planos, preÃ§os, trial) para /assinar
  '/api/analytics/events', // IngestÃ£o de eventos comerciais do cardÃ¡pio/carrinho/checkout (pÃºblico)
  '/api/entities/PaymentConfig',  // ConfiguraÃ§Ãµes de pagamento pÃºblicas para o cardÃ¡pio
  '/api/entities/MenuItem',  // Itens do menu pÃºblicos para o cardÃ¡pio
  '/api/entities/Category',  // Categorias pÃºblicas para o cardÃ¡pio
  '/api/entities/Subscriber',  // Info do assinante pÃºblica para o cardÃ¡pio
  '/api/functions/registerCustomer'  // Cadastro de clientes (pÃºblico)
];

const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

const authenticate = async (req, res, next) => {
  // Rotas pÃºblicas nÃ£o precisam de autenticaÃ§Ã£o
  if (isPublicRoute(req.path)) {
    // Para rotas pÃºblicas, apenas passar adiante sem verificar token
    // O token pode ser verificado opcionalmente dentro da rota se necessÃ¡rio
    const token = extractTokenFromRequest(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        let user;
        if (usePostgreSQL) {
          user = await repo.getLoginUserByEmail(decoded.email);
        } else if (db && db.users) {
          const matches = db.users.filter(u => (u.email || '').toLowerCase() === (decoded.email || '').toLowerCase());
          user = matches.find(u => u.profile_role) || matches[0];
        }
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Token invÃ¡lido em rota pÃºblica - apenas ignorar
      }
    }
    return next();
  }

  const token = extractTokenFromRequest(req);
  
  // Se nÃ£o tem token, usar usuÃ¡rio padrÃ£o (modo desenvolvimento)
  if (!token) {
    console.log('âš ï¸ [authenticate] Sem token:', { path: req.path, method: req.method });
    if (process.env.NODE_ENV !== 'production') {
      // Em desenvolvimento, permitir sem token
      if (usePostgreSQL) {
        req.user = await repo.getUserByEmail('admin@digimenu.com');
      } else if (db && db.users && db.users.length > 0) {
        req.user = db.users[0];
      } else {
        return res.status(401).json({ error: 'UsuÃ¡rio padrÃ£o nÃ£o encontrado' });
      }
      console.log('âœ… [authenticate] Usando usuÃ¡rio padrÃ£o (dev)');
      return next();
    }
    // Em produÃ§Ã£o, retornar erro se nÃ£o tiver token
    return res.status(401).json({ error: 'Token de autenticaÃ§Ã£o necessÃ¡rio' });
  }

  // Tentar validar JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('âœ… [authenticate] Token vÃ¡lido:', { email: decoded.email, id: decoded.id });
    
    let user;
    if (usePostgreSQL) {
      user = await repo.getLoginUserByEmail(decoded.email);
      if (!user) {
        user = await repo.getUserByEmail('admin@digimenu.com');
      }
    } else if (db && db.users) {
      const matches = db.users.filter(u => (u.email || '').toLowerCase() === (decoded.email || '').toLowerCase());
      user = matches.find(u => u.profile_role) || matches[0] || db.users[0];
    } else {
      return res.status(401).json({ error: 'Banco de dados nÃ£o inicializado' });
    }
    
    if (!user) {
      console.log('âŒ [authenticate] UsuÃ¡rio nÃ£o encontrado:', decoded.email);
      return res.status(401).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
    }
    
    req.user = user;
    console.log('âœ… [authenticate] UsuÃ¡rio autenticado:', { email: user.email, is_master: user.is_master });
    return next();
  } catch (error) {
    // JWT invÃ¡lido - tentar mÃ©todo alternativo (buscar em activeTokens)
    const email = activeTokens[token];
    if (email) {
      let user;
      if (usePostgreSQL) {
        user = await repo.getLoginUserByEmail(email);
        if (!user) {
          user = await repo.getUserByEmail('admin@digimenu.com');
        }
      } else if (db && db.users) {
        const matches = db.users.filter(u => (u.email || '').toLowerCase() === (email || '').toLowerCase());
        user = matches.find(u => u.profile_role) || matches[0] || db.users[0];
      } else {
        return res.status(401).json({ error: 'Banco de dados nÃ£o inicializado' });
      }
      req.user = user;
      return next();
    }
    
    // Se nÃ£o encontrou em activeTokens e estÃ¡ em desenvolvimento, usar padrÃ£o
    if (process.env.NODE_ENV !== 'production') {
      // Apenas logar em desenvolvimento
      console.warn('âš ï¸ JWT invÃ¡lido, usando usuÃ¡rio padrÃ£o (dev mode)');
      if (usePostgreSQL) {
        req.user = await repo.getUserByEmail('admin@digimenu.com');
      } else if (db && db.users && db.users.length > 0) {
        req.user = db.users[0];
      } else {
        return res.status(401).json({ error: 'UsuÃ¡rio padrÃ£o nÃ£o encontrado' });
      }
      return next();
    }
    
    // Em produÃ§Ã£o, retornar erro
    return res.status(401).json({ error: 'Token invÃ¡lido ou expirado' });
  }
};

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
  jwt,
  JWT_SECRET,
  activeTokens,
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
// ðŸ” AUTHENTICATION (LEGADO - REMOVIDO)
// =======================
// âœ… CÃ³digo migrado para: backend/modules/auth/
// Rotas registradas em: app.use('/api/auth', authRoutes);
/*
app.post('/api/auth/login', validate(schemas.login), asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('ðŸ” [login] Tentativa de login para:', email?.toLowerCase());

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha sÃ£o obrigatÃ³rios' });
    }

    // Buscar usuÃ¡rio no banco (prioriza linha de colaborador quando mesmo email tem 2 registros)
    const emailLower = email.toLowerCase().trim();
    console.log('ðŸ” [login] Buscando usuÃ¡rio com email:', emailLower);
    
    let user;
    if (usePostgreSQL) {
      user = await repo.getLoginUserByEmail(emailLower);
      if (!user) {
        console.log('âš ï¸ [login] UsuÃ¡rio nÃ£o encontrado com email normalizado. Tentando busca alternativa...');
        try {
          const { query } = await import('./db/postgres.js');
          const result = await query(
            `SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR email ILIKE $2
             ORDER BY (CASE WHEN profile_role IS NOT NULL AND profile_role != '' THEN 0 ELSE 1 END), id LIMIT 1`,
            [emailLower, `%${emailLower}%`]
          );
          if (result.rows.length > 0) {
            user = result.rows[0];
            console.log('âœ… [login] UsuÃ¡rio encontrado com busca alternativa:', user.email);
          }
        } catch (err) {
          console.error('âŒ [login] Erro na busca alternativa:', err.message);
        }
      }
    } else if (db && db.users) {
      // Buscar com diferentes variaÃ§Ãµes do email
      user = db.users.find(u => {
        const userEmail = (u.email || '').toLowerCase().trim();
        return userEmail === emailLower;
      });
      
      if (!user) {
        console.log('ðŸ” [login] UsuÃ¡rio nÃ£o encontrado. Emails disponÃ­veis no banco:');
        db.users.forEach((u, idx) => {
          console.log(`  [${idx}] Email: "${u.email}" (normalizado: "${(u.email || '').toLowerCase().trim()}")`);
        });
      }
    } else {
      return res.status(401).json({ error: 'Banco de dados nÃ£o inicializado' });
    }

    if (!user) {
      console.log('âŒ [login] UsuÃ¡rio nÃ£o encontrado:', emailLower);
      // Se for assinante (existe em subscribers mas nÃ£o em users), orientar a definir senha
      if (usePostgreSQL) {
        const subscriber = await repo.getSubscriberByEmail(emailLower);
        if (subscriber) {
          return res.status(401).json({
            error: 'Conta encontrada, mas ainda nÃ£o hÃ¡ senha definida. Use o link "Definir senha" enviado ao seu e-mail ou clique em "Esqueci minha senha" para solicitar um novo.',
            code: 'PASSWORD_NOT_SET'
          });
        }
      }
      return res.status(401).json({ error: 'Credenciais invÃ¡lidas' });
    }
    
    console.log('âœ… [login] UsuÃ¡rio encontrado:', {
      id: user.id,
      email: user.email,
      is_master: user.is_master,
      profile_role: user.profile_role,
      subscriber_email: user.subscriber_email,
      role: user.role
    });
    
    console.log('âœ… [login] UsuÃ¡rio encontrado:', {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      hasPasswordHash: !!user.password && user.password.startsWith('$2')
    });

    // âœ… Verificar se colaborador estÃ¡ ativo (se tiver profile_role e se a coluna active existir)
    if (user.profile_role && user.active !== undefined && user.active === false) {
      console.log('âŒ [login] Colaborador desativado:', user.email);
      return res.status(403).json({ error: 'Seu acesso foi desativado. Entre em contato com o administrador.' });
    }

    // âœ… SEMPRE usar bcrypt para verificar senhas
    if (user.password) {
      try {
        // Tentar comparar com bcrypt primeiro
        console.log('ðŸ” [login] Verificando senha para:', user.email);
        // Garantir que a senha nÃ£o tenha espaÃ§os extras
        const passwordClean = (password || '').trim();
        const isValid = await bcrypt.compare(passwordClean, user.password);
        
        if (isValid) {
          console.log('âœ… [login] Senha vÃ¡lida! Login bem-sucedido para:', user.email);
          
          // Verificar se Ã© assinante e garantir acesso automÃ¡tico aos perfis do plano
          let subscriber = null;
          const subscriberEmail = user.subscriber_email || user.email;
          if (usePostgreSQL) {
            subscriber = await repo.getSubscriberByEmail(subscriberEmail);
          } else if (db?.subscribers) {
            subscriber = db.subscribers.find(s => (s.email || '').toLowerCase().trim() === subscriberEmail.toLowerCase().trim());
          }
          
          // Se for assinante e nÃ£o for colaborador, garantir acesso automÃ¡tico aos perfis do plano
          if (subscriber && !user.profile_role && !user.is_master) {
            const { getPlanPermissions } = await import('./utils/plans.js');
            const planPerms = getPlanPermissions(subscriber.plan || 'basic');
            
            // Verificar quais perfis o plano permite
            const allowedRoles = [];
            if (planPerms.delivery_app || planPerms.team_management) allowedRoles.push('entregador');
            if (planPerms.kitchen_display) allowedRoles.push('cozinha');
            if (planPerms.pdv) allowedRoles.push('pdv');
            if (planPerms.waiter_app) allowedRoles.push('garcom');
            
            // Criar registros de colaborador para os perfis permitidos se nÃ£o existirem
            if (allowedRoles.length > 0) {
              for (const role of allowedRoles) {
                // Verificar se jÃ¡ existe colaborador com este email e perfil
                let existingColab = null;
                try {
                  if (usePostgreSQL) {
                    const all = await repo.listColaboradores(subscriberEmail);
                    existingColab = all.find(c => 
                      (c.email || '').toLowerCase().trim() === subscriberEmail.toLowerCase().trim() &&
                      (c.profile_role || '').toLowerCase().trim() === role
                    );
                  } else if (db?.users) {
                    existingColab = db.users.find(u => 
                      (u.email || '').toLowerCase().trim() === subscriberEmail.toLowerCase().trim() &&
                      (u.subscriber_email || '').toLowerCase().trim() === subscriberEmail.toLowerCase().trim() &&
                      (u.profile_role || '').toLowerCase().trim() === role
                    );
                  }
                } catch (listError) {
                  console.warn('âš ï¸ [login] Erro ao listar colaboradores (nÃ£o crÃ­tico):', listError.message);
                  // Continuar sem verificar colaboradores existentes
                  existingColab = null;
                }
                
                // Se nÃ£o existe, criar (sÃ³ se ainda nÃ£o houver usuÃ¡rio com este email â€” evita duplicate key)
                if (!existingColab) {
                  const userData = {
                    email: subscriberEmail,
                    full_name: user.full_name || subscriber.name || subscriberEmail.split('@')[0],
                    password: user.password, // Usar mesma senha
                    is_master: false,
                    role: 'user',
                    subscriber_email: subscriberEmail,
                    profile_role: role
                  };
                  
                  if (usePostgreSQL) {
                    const existingUser = await repo.getUserByEmail(subscriberEmail);
                    if (!existingUser) await repo.createUser(userData);
                  } else if (db?.users) {
                    const newColab = {
                      id: String(Date.now() + Math.random()),
                      ...userData,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    };
                    db.users.push(newColab);
                  }
                }
              }
              if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
            }
          }
          
          const token = jwt.sign(
            {
              id: user.id,
              email: user.email,
              role: user.role,
              is_master: user.is_master
            },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          activeTokens[token] = user.email;

          return res.json({
            token,
            user: {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              is_master: user.is_master,
              role: user.role,
              subscriber_email: user.subscriber_email || null,
              profile_role: user.profile_role || null
            }
          });
        }
        
        // Se nÃ£o passou, senha estÃ¡ incorreta
        console.log('âŒ [login] Senha incorreta para:', user.email);
        console.log('ðŸ” [login] Detalhes da verificaÃ§Ã£o:', {
          email: user.email,
          passwordProvided: password ? 'SIM' : 'NÃƒO',
          passwordLength: password ? password.length : 0,
          passwordHashInDB: user.password ? 'SIM' : 'NÃƒO',
          hashLength: user.password ? user.password.length : 0,
          hashStartsWith$2: user.password ? user.password.startsWith('$2') : false,
          hashFirstChars: user.password ? user.password.substring(0, 20) : 'N/A',
          passwordFirstChars: password ? password.substring(0, 5) + '...' : 'N/A'
        });
        
        // Tentar verificar se hÃ¡ problema com espaÃ§os ou caracteres especiais
        const passwordTrimmed = password ? password.trim() : '';
        if (passwordTrimmed !== password) {
          console.log('âš ï¸ [login] Senha contÃ©m espaÃ§os no inÃ­cio/fim, tentando com trim...');
          try {
            const isValidTrimmed = await bcrypt.compare(passwordTrimmed, user.password);
            if (isValidTrimmed) {
              console.log('âœ… [login] Senha vÃ¡lida apÃ³s trim!');
              // Continuar com o login normalmente
              // (o cÃ³digo abaixo jÃ¡ vai fazer isso)
            }
          } catch (e) {
            console.warn('âš ï¸ [login] Erro ao verificar senha com trim:', e.message);
          }
        }
      } catch (bcryptError) {
        // Se bcrypt falhar, pode ser senha antiga sem hash
        // Neste caso, hash a senha antiga e atualize no banco
        console.warn('âš ï¸ [login] Erro ao comparar com bcrypt:', bcryptError.message);
        console.warn('âš ï¸ [login] Tentando verificar se senha estÃ¡ em texto plano...');
        
        // Verificar se a senha antiga (texto plano) corresponde
        if (user.password === password) {
          console.log('âœ… [login] Senha em texto plano corresponde. Convertendo para hash...');
          // Hash a senha e atualize no banco
          const hashed = await bcrypt.hash(password, 10);
          
          // Atualizar senha no banco
          if (usePostgreSQL) {
            await repo.updateUser(user.id, { password: hashed });
          } else if (db && db.users) {
            const u = db.users.find(x => x.id === user.id);
            if (u) {
              u.password = hashed;
              u.updated_at = new Date().toISOString();
              if (saveDatabaseDebounced) saveDatabaseDebounced(db);
            }
          }
          
          // Agora tentar comparar novamente
          const isValid = await bcrypt.compare(password, hashed);
          if (isValid) {
            console.log('âœ… [login] Senha atualizada e login bem-sucedido');
            const token = jwt.sign(
              {
                id: user.id,
                email: user.email,
                role: user.role,
                is_master: user.is_master
              },
              JWT_SECRET,
              { expiresIn: '7d' }
            );

            activeTokens[token] = user.email;

            return res.json({
              token,
              user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                is_master: user.is_master,
                role: user.role,
                subscriber_email: user.subscriber_email || null,
                profile_role: user.profile_role || null
              }
            });
          }
        }
        
        console.error('âŒ [login] Erro ao comparar senha:', bcryptError);
      }
    } else {
      // UsuÃ¡rio sem senha - apenas para admin padrÃ£o em desenvolvimento
      const emailMatch = (user.email || '').toLowerCase() === 'admin@digimenu.com';
      if (emailMatch && password === 'admin123' && process.env.NODE_ENV !== 'production') {
        console.warn('âš ï¸ [login] Acesso de recuperaÃ§Ã£o (admin sem senha). Altere a senha no Admin.');
        // Hash a senha e salvar
        const hashed = await bcrypt.hash(password, 10);
        if (usePostgreSQL) {
          await repo.updateUser(user.id, { password: hashed });
        } else if (db && db.users) {
          const u = db.users.find(x => x.id === user.id);
          if (u) {
            u.password = hashed;
            u.updated_at = new Date().toISOString();
            if (saveDatabaseDebounced) saveDatabaseDebounced(db);
          }
        }
        
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, is_master: user.is_master },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        activeTokens[token] = user.email;
        return res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            is_master: user.is_master,
            role: user.role,
            subscriber_email: user.subscriber_email || null,
            profile_role: user.profile_role || null
          }
        });
      }
      console.log('âŒ [login] UsuÃ¡rio sem senha:', user.email);
    }

    return res.status(401).json({ error: 'Credenciais invÃ¡lidas' });
  } catch (error) {
    console.error('âŒ [login] Erro no login:', sanitizeForLog({ error: error.message }));
    throw error; // Deixar errorHandler tratar
  }
}));

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'NÃ£o autenticado' });
    }
    const payload = {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      is_master: req.user.is_master,
      role: req.user.role,
      subscriber_email: req.user.subscriber_email || null,
      profile_role: req.user.profile_role || null,
      slug: req.user.slug || null
    };
    // Colaborador: retornar todos os perfis (profile_roles) deste email no mesmo assinante
    if (req.user.profile_role && req.user.subscriber_email) {
      try {
        let list = [];
        if (usePostgreSQL && repo.listColaboradores) {
          list = await repo.listColaboradores(req.user.subscriber_email);
        } else if (db?.users) {
          list = db.users
            .filter(u => (u.subscriber_email || '').toLowerCase().trim() === (req.user.subscriber_email || '').toLowerCase().trim() && (u.profile_role || '').trim())
            .map(u => ({ email: u.email, profile_role: u.profile_role }));
        }
        const myRoles = list
          .filter(u => (u.email || '').toLowerCase().trim() === (req.user.email || '').toLowerCase().trim())
          .map(u => (u.profile_role || '').toLowerCase().trim())
          .filter(Boolean);
        const unique = [...new Set(myRoles)];
        if (unique.length) payload.profile_roles = unique;
      } catch (e) {
        payload.profile_roles = [req.user.profile_role].filter(Boolean);
      }
    }
    if (req.user.profile_role && !payload.profile_roles) payload.profile_roles = [req.user.profile_role].filter(Boolean);
    // Assinante (dono): tem acesso total ao painel colaborador â€” marcar is_owner quando email estÃ¡ em subscribers
    if (!req.user.is_master && req.user.email) {
      try {
        const sub = usePostgreSQL ? await repo.getSubscriberByEmail(req.user.email) : (db?.subscribers?.find(s => (s.email || '').toLowerCase().trim() === (req.user.email || '').toLowerCase().trim()) || null);
        if (sub) payload.is_owner = true;
      } catch (_) {}
    }
    return res.json(payload);
  } catch (error) {
    console.error('Erro ao obter usuÃ¡rio:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Alterar prÃ³pria senha (requer autenticaÃ§Ã£o)
app.post('/api/auth/change-password', authenticate, validate(schemas.changePassword), asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha sÃ£o obrigatÃ³rias' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mÃ­nimo 6 caracteres' });
    }

    // Carregar usuÃ¡rio com senha (req.user pode nÃ£o ter o hash)
    let user;
    if (usePostgreSQL) {
      user = await repo.getUserByEmail(req.user.email);
    } else if (db && db.users) {
      user = db.users.find(u => (u.email || '').toLowerCase() === (req.user.email || '').toLowerCase());
    }
    if (!user) {
      return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
    }

    let valid = false;
    if (user.password) {
      if (typeof user.password === 'string' && user.password.startsWith('$2')) {
        valid = await bcrypt.compare(currentPassword, user.password);
      } else if (user.password === currentPassword) {
        valid = true;
      }
    } else if ((user.email || '').toLowerCase() === 'admin@digimenu.com' && currentPassword === 'admin123') {
      valid = true; // recuperaÃ§Ã£o: admin sem senha no DB
    }
    if (!valid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    if (usePostgreSQL) {
      await repo.updateUser(user.id, { password: hashed });
    } else if (db && db.users) {
      const u = db.users.find(x => (x.email || '').toLowerCase() === (req.user.email || '').toLowerCase());
      if (u) {
        u.password = hashed;
        u.updated_at = new Date().toISOString();
        try {
          const persistenceModule = await import('./db/persistence.js');
          if (persistenceModule?.saveDatabase) persistenceModule.saveDatabase(db);
          else if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
        } catch (e) {
          console.error('Erro ao salvar senha (JSON):', e);
        }
      }
    }

    return res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao alterar senha:', sanitizeForLog({ error: error.message }));
    throw error;
  }
}));

// Esqueci minha senha (gera token e envia link por email; sem email config = apenas log do link)
app.post('/api/auth/forgot-password', validate(schemas.forgotPassword), asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'RecuperaÃ§Ã£o de senha requer PostgreSQL. Configure DATABASE_URL.' });
  }
  const { email } = req.body;
  const emailNorm = String(email).toLowerCase().trim();
  const user = await repo.getUserByEmail(emailNorm);
  // Sempre retornar a mesma mensagem (nÃ£o vazar se o email existe)
  const msg = 'Se existir uma conta com este email, vocÃª receberÃ¡ um link para redefinir a senha.';
  if (!user) {
    return res.json({ success: true, message: msg });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  await repo.createPasswordResetToken(emailNorm, token, expiresAt);
  const link = `${FRONTEND_URL}/redefinir-senha?token=${token}`;
  
  // Enviar email de recuperaÃ§Ã£o de senha
  try {
    const { sendPasswordResetEmail } = await import('./utils/emailService.js');
    await sendPasswordResetEmail(emailNorm, token);
    logger.log('âœ… [forgot-password] Email de recuperaÃ§Ã£o enviado para:', emailNorm);
  } catch (emailError) {
    logger.error('âŒ [forgot-password] Erro ao enviar email:', emailError);
    // Continuar mesmo se falhar (nÃ£o crÃ­tico para seguranÃ§a)
    logger.log('ðŸ” [forgot-password] Link de redefiniÃ§Ã£o (email nÃ£o enviado):', link);
  }
  
  return res.json({ success: true, message: msg });
}));

// Redefinir senha com token (esqueci minha senha)
app.post('/api/auth/reset-password', validate(schemas.resetPassword), asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'RedefiniÃ§Ã£o de senha requer PostgreSQL. Configure DATABASE_URL.' });
  }
  const { token, newPassword } = req.body;
  const row = await repo.getPasswordResetTokenByToken(token);
  if (!row) {
    return res.status(400).json({ error: 'Token invÃ¡lido ou expirado. Solicite um novo link.' });
  }
  const user = await repo.getUserByEmail(row.email);
  if (!user) {
    await repo.deletePasswordResetToken(token);
    return res.status(400).json({ error: 'Token invÃ¡lido ou expirado.' });
  }
  const hashed = await bcrypt.hash(newPassword, 10);
  await repo.updateUser(user.id, { password: hashed });
  await repo.deletePasswordResetToken(token);
  return res.json({ success: true, message: 'Senha redefinida com sucesso. FaÃ§a login.' });
}));

// -----------------------
// Colaboradores (Premium/Pro): perfis limitados Entregador, Cozinha, PDV
// -----------------------
// âœ… FUNÃ‡Ã•ES AUXILIARES MOVIDAS PARA: backend/modules/users/users.utils.js
// - getOwnerAndSubscriber
// - canUseColaboradores
// - isRequesterGerente
// - COLAB_ROLES

// =======================
// ðŸ”— INFORMAÃ‡Ã•ES PÃšBLICAS PARA PÃGINA DE LOGIN POR SLUG (logo, tema, nome)
// =======================
app.get('/api/public/login-info/:slug', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ found: false, error: 'Requer PostgreSQL' });
  }
  const slug = (req.params.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ found: false, error: 'Slug invÃ¡lido' });

  let subscriber = await repo.getSubscriberBySlug(slug);
  let isMaster = false;
  let se = null;
  if (subscriber) {
    se = subscriber.email;
  } else {
    const { query } = await import('./db/postgres.js');
    const masterResult = await query('SELECT id, email, slug FROM users WHERE slug = $1 AND is_master = TRUE', [slug]);
    if (masterResult.rows.length > 0) {
      isMaster = true;
      se = null;
    } else {
      return res.json({ found: false, slug });
    }
  }

  let storeList = [];
  if (isMaster) {
    const { query } = await import('./db/postgres.js');
    const rows = await query(`SELECT id, data FROM entities WHERE entity_type = 'Store' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1`);
    storeList = rows.rows.map(row => ({ id: row.id.toString(), ...row.data }));
  } else {
    storeList = await repo.listEntitiesForSubscriber('Store', se, null);
  }
  const raw = Array.isArray(storeList) && storeList[0] ? storeList[0] : {};
  const name = raw.name || 'Estabelecimento';
  const logo = raw.logo || null;
  const theme_primary = raw.theme_primary_color || raw.primary_color || null;
  const theme_secondary = raw.theme_secondary_color || raw.secondary_color || null;
  const theme_accent = raw.theme_accent_color || raw.accent_color || null;
  return res.json({
    found: true,
    slug,
    name,
    logo,
    theme_primary_color: theme_primary,
    theme_secondary_color: theme_secondary,
    theme_accent_color: theme_accent,
  });
}));

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

// =======================
// ðŸ”— CARDÃPIO PÃšBLICO POR LINK (slug) â€” cada assinante tem seu link ex: /s/meu-restaurante
// =======================
// âœ… Rota movida para: /api/public/cardapio/:slug (via mÃ³dulo de menus)
/*
app.get('/api/public/cardapio/:slug', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'CardÃ¡pio por link requer PostgreSQL. Configure DATABASE_URL.' });
  }
  const slug = (req.params.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'Slug invÃ¡lido' });
  
  // Tentar buscar subscriber primeiro
  let subscriber = await repo.getSubscriberBySlug(slug);
  let isMaster = false;
  let se = null;
  
  console.log(`ðŸ” [public/cardapio] Buscando cardÃ¡pio para slug: "${slug}"`);
  
  if (subscriber) {
    se = subscriber.email;
    console.log(`âœ… [public/cardapio] Encontrado subscriber: ${se}`);
  } else {
    // Se nÃ£o encontrou subscriber, buscar usuÃ¡rio master pelo slug
    const { query } = await import('./db/postgres.js');
    const masterResult = await query(
      'SELECT id, email, slug FROM users WHERE slug = $1 AND is_master = TRUE',
      [slug]
    );
    
    console.log(`ðŸ” [public/cardapio] Buscando master com slug: "${slug}"`, {
      encontrados: masterResult.rows.length,
      resultados: masterResult.rows
    });
    
    if (masterResult.rows.length > 0) {
      isMaster = true;
      se = null; // Master usa subscriber_email = NULL
      console.log(`âœ… [public/cardapio] Encontrado master: ${masterResult.rows[0].email} (ID: ${masterResult.rows[0].id})`);
    } else {
      console.log(`âŒ [public/cardapio] Slug nÃ£o encontrado nem como subscriber nem como master`);
      return res.status(404).json({ error: 'Link nÃ£o encontrado' });
    }
  }
  // Buscar entidades (para subscriber ou master), incluindo mesas (Table)
  let storeList, dishes, categories, complementGroups, pizzaSizes, pizzaFlavors, pizzaEdges, pizzaExtras, pizzaCategories, beverageCategories, deliveryZones, coupons, promotions, tables;
  
  if (isMaster) {
    // Para master, buscar entidades com subscriber_email IS NULL
    const { query } = await import('./db/postgres.js');
    console.log(`ðŸ” [public/cardapio] Buscando entidades do master (subscriber_email IS NULL)`);
    [storeList, dishes, categories, complementGroups, pizzaSizes, pizzaFlavors, pizzaEdges, pizzaExtras, pizzaCategories, beverageCategories, deliveryZones, coupons, promotions, tables] = await Promise.all([
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Store' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then(r => {
        console.log(`ðŸ“¦ [public/cardapio] Store encontrados: ${r.rows.length}`);
        return r.rows.map(row => ({ id: row.id.toString(), ...row.data }));
      }),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Dish' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => {
        console.log(`ðŸ“¦ [public/cardapio] Dishes encontrados: ${r.rows.length}`);
        return r.rows.map(row => ({ id: row.id.toString(), ...row.data }));
      }),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Category' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'ComplementGroup' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaSize' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaFlavor' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaEdge' AND subscriber_email IS NULL`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaExtra' AND subscriber_email IS NULL`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'PizzaCategory' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'BeverageCategory' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'DeliveryZone' AND subscriber_email IS NULL`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Coupon' AND subscriber_email IS NULL`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Promotion' AND subscriber_email IS NULL`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data }))),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Table' AND subscriber_email IS NULL ORDER BY (data->>'table_number')::int NULLS LAST, created_at ASC`).then(r => r.rows.map(row => ({ id: row.id.toString(), ...row.data })))
    ]);
  } else {
    // Para subscriber, usar a funÃ§Ã£o existente
    [storeList, dishes, categories, complementGroups, pizzaSizes, pizzaFlavors, pizzaEdges, pizzaExtras, pizzaCategories, beverageCategories, deliveryZones, coupons, promotions, tables] = await Promise.all([
      repo.listEntitiesForSubscriber('Store', se, null),
      repo.listEntitiesForSubscriber('Dish', se, 'order'),
      repo.listEntitiesForSubscriber('Category', se, 'order'),
      repo.listEntitiesForSubscriber('ComplementGroup', se, 'order'),
      repo.listEntitiesForSubscriber('PizzaSize', se, 'order'),
      repo.listEntitiesForSubscriber('PizzaFlavor', se, 'order'),
      repo.listEntitiesForSubscriber('PizzaEdge', se, null),
      repo.listEntitiesForSubscriber('PizzaExtra', se, null),
      repo.listEntitiesForSubscriber('PizzaCategory', se, 'order'),
      repo.listEntitiesForSubscriber('BeverageCategory', se, 'order'),
      repo.listEntitiesForSubscriber('DeliveryZone', se, null),
      repo.listEntitiesForSubscriber('Coupon', se, null),
      repo.listEntitiesForSubscriber('Promotion', se, null),
      repo.listEntitiesForSubscriber('Table', se, 'table_number')
    ]);
  }
  const _rawStore = Array.isArray(storeList) && storeList[0] ? storeList[0] : {};
  // Garantir tema e nome: normalizar theme_* (Admin/ThemeTab) e fallback primary_color (legado)
  const store = {
    name: 'Loja',
    is_open: true,
    ..._rawStore,
    name: _rawStore.name || 'Loja',
    theme_primary_color: _rawStore.theme_primary_color || _rawStore.primary_color,
    theme_secondary_color: _rawStore.theme_secondary_color || _rawStore.secondary_color,
    theme_accent_color: _rawStore.theme_accent_color || _rawStore.accent_color,
    theme_header_bg: _rawStore.theme_header_bg,
    theme_header_text: _rawStore.theme_header_text,
  };
  
  console.log(`âœ… [public/cardapio] Retornando dados:`, {
    is_master: isMaster,
    subscriber_email: se || 'master',
    store_name: store?.name,
    dishes_count: Array.isArray(dishes) ? dishes.length : 0,
    categories_count: Array.isArray(categories) ? categories.length : 0
  });
  
  res.json({
    subscriber_email: se || 'master',
    is_master: isMaster,
    store,
    dishes: Array.isArray(dishes) ? dishes : [],
    categories: Array.isArray(categories) ? categories : [],
    tables: Array.isArray(tables) ? tables : [],
    beverageCategories: Array.isArray(beverageCategories) ? beverageCategories : [],
    complementGroups: Array.isArray(complementGroups) ? complementGroups : [],
    pizzaSizes: Array.isArray(pizzaSizes) ? pizzaSizes : [],
    pizzaFlavors: Array.isArray(pizzaFlavors) ? pizzaFlavors : [],
    pizzaEdges: Array.isArray(pizzaEdges) ? pizzaEdges : [],
    pizzaExtras: Array.isArray(pizzaExtras) ? pizzaExtras : [],
    pizzaCategories: Array.isArray(pizzaCategories) ? pizzaCategories : [],
    deliveryZones: Array.isArray(deliveryZones) ? deliveryZones : [],
    coupons: Array.isArray(coupons) ? coupons : [],
    promotions: Array.isArray(promotions) ? promotions : []
  });
}));
*/

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

// âœ… Rota movida para: /api/public/pedido-mesa (via mÃ³dulo de pedidos)
// Pedido da mesa (pÃºblico, sem login) â€” usado pela pÃ¡gina /mesa/:numero?slug=xxx
/*
app.post('/api/public/pedido-mesa', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) return res.status(503).json({ error: 'Requer PostgreSQL' });
  const slug = (req.body.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'Slug obrigatÃ³rio' });
  let se = null;
  const subscriber = await repo.getSubscriberBySlug(slug);
  if (subscriber) {
    se = subscriber.email;
  } else {
    const { query } = await import('./db/postgres.js');
    const masterResult = await query('SELECT id FROM users WHERE slug = $1 AND is_master = TRUE', [slug]);
    if (masterResult.rows.length === 0) return res.status(404).json({ error: 'Link nÃ£o encontrado' });
  }
  const tableNumber = req.body.table_number;
  const tableId = req.body.table_id;
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const total = Number(req.body.total) || 0;
  const customerName = req.body.customer_name || '';
  const customerPhone = (req.body.customer_phone || '').replace(/\D/g, '');
  const customerEmail = req.body.customer_email || '';
  const observations = req.body.observations || '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  const order_code = `MESA-${tableNumber || '?'}-${code}`;
  const orderData = {
    order_code,
    items,
    total,
    table_id: tableId,
    table_number: tableNumber,
    delivery_type: 'table',
    status: 'new',
    customer_name: customerName,
    customer_phone: customerPhone || null,
    customer_email: customerEmail || null,
    observations: observations || null,
    created_date: new Date().toISOString()
  };
  const newOrder = await repo.createEntity('Order', orderData, null, { forSubscriberEmail: se });
  if (typeof emitOrderCreated === 'function') emitOrderCreated(newOrder);
  res.status(201).json(newOrder);
}));

// Chamar garÃ§om (pÃºblico, sem login) â€” usado pela pÃ¡gina /mesa/:numero?slug=xxx
app.post('/api/public/chamar-garcom', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) return res.status(503).json({ error: 'Requer PostgreSQL' });
  const slug = (req.body.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'Slug obrigatÃ³rio' });
  let se = null;
  const subscriber = await repo.getSubscriberBySlug(slug);
  if (subscriber) se = subscriber.email;
  else {
    const { query } = await import('./db/postgres.js');
    const masterResult = await query('SELECT id FROM users WHERE slug = $1 AND is_master = TRUE', [slug]);
    if (masterResult.rows.length === 0) return res.status(404).json({ error: 'Link nÃ£o encontrado' });
  }
  const tableId = req.body.table_id;
  const tableNumber = req.body.table_number;
  const data = {
    table_id: tableId,
    table_number: tableNumber,
    status: 'pending',
    created_at: new Date().toISOString(),
    subscriber_email: se,
    owner_email: se
  };
  const waiterCall = await repo.createEntity('WaiterCall', data, null, { forSubscriberEmail: se });
  
  // âœ… EMITIR CHAMADA DE GARÃ‡OM VIA WEBSOCKET
  emitWaiterCall(waiterCall);
  
  res.status(201).json({ ok: true, message: 'GarÃ§om chamado!', call: waiterCall });
}));

// =======================
// ðŸ‘¥ USERS (LEGADO - REMOVER APÃ“S TESTES)
// =======================
/*

// Rota para definir senha usando token (NÃƒO requer autenticaÃ§Ã£o - pÃºblica)
app.post('/api/auth/set-password', validate(schemas.setPassword), asyncHandler(async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log('ðŸ” [set-password] Recebida requisiÃ§Ã£o para definir senha');
    console.log('ðŸ” [set-password] Token recebido:', token ? token.substring(0, 20) + '...' : 'NENHUM');

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e senha sÃ£o obrigatÃ³rios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mÃ­nimo 6 caracteres' });
    }

    // Buscar token nos password tokens armazenados (memÃ³ria e banco)
    let userEmail = null;
    let tokenData = null;

    // Primeiro, verificar em passwordTokens (memÃ³ria)
    console.log('ðŸ” [set-password] Verificando em passwordTokens (memÃ³ria)...', Object.keys(passwordTokens).length, 'tokens');
    for (const key in passwordTokens) {
      if (passwordTokens[key].token === token) {
        userEmail = passwordTokens[key].email;
        tokenData = {
          expires_at: passwordTokens[key].expires_at
        };
        console.log('âœ… [set-password] Token encontrado em memÃ³ria para:', userEmail);
        break;
      }
    }

    // Se nÃ£o encontrou em memÃ³ria, buscar no banco
    if (!userEmail) {
      console.log('ðŸ” [set-password] Token nÃ£o encontrado em memÃ³ria, buscando no banco...');
      
      if (usePostgreSQL) {
        // Buscar token no banco
        const subscribers = await repo.listSubscribers();
        console.log('ðŸ” [set-password] Buscando em', subscribers.length, 'assinantes no PostgreSQL');
        for (const sub of subscribers) {
          if (sub.password_token === token) {
            userEmail = sub.email;
            tokenData = {
              expires_at: sub.token_expires_at
            };
            console.log('âœ… [set-password] Token encontrado no PostgreSQL para:', userEmail);
            break;
          }
        }
      } else if (db && db.subscribers) {
        // Buscar token nos assinantes
        console.log('ðŸ” [set-password] Buscando em', db.subscribers.length, 'assinantes no JSON');
        const subscriber = db.subscribers.find(s => {
          const match = s.password_token === token;
          if (match) {
            console.log('âœ… [set-password] Token encontrado no JSON para:', s.email);
          }
          return match;
        });
        if (subscriber) {
          userEmail = subscriber.email;
          tokenData = {
            expires_at: subscriber.token_expires_at
          };
        } else {
          // Log detalhado para debug
          console.log('âŒ [set-password] Token nÃ£o encontrado. Tokens disponÃ­veis:');
          db.subscribers.forEach((sub, idx) => {
            console.log(`  [${idx}] Email: ${sub.email}, Token: ${sub.password_token ? sub.password_token.substring(0, 20) + '...' : 'SEM TOKEN'}`);
          });
        }
      }
    }

    if (!userEmail) {
      console.log('âŒ [set-password] Token nÃ£o encontrado em nenhum lugar');
      return res.status(400).json({ error: 'Token invÃ¡lido ou expirado' });
    }

    // Verificar se token expirou (5 minutos)
    const expiresAt = tokenData?.expires_at ? new Date(tokenData.expires_at) : null;
    if (expiresAt) {
      const now = new Date();
      if (expiresAt < now) {
        // Remover token expirado
        for (const key in passwordTokens) {
          if (passwordTokens[key].token === token) {
            delete passwordTokens[key];
            break;
          }
        }
        return res.status(400).json({ error: 'Token expirado. O link Ã© vÃ¡lido por apenas 5 minutos. Solicite um novo link.' });
      }
    } else {
      // Se nÃ£o tem data de expiraÃ§Ã£o, considerar expirado por seguranÃ§a
      return res.status(400).json({ error: 'Token invÃ¡lido ou expirado' });
    }

    // Buscar dados do assinante para preencher full_name
    let subscriberInfo = null;
    if (usePostgreSQL) {
      subscriberInfo = await repo.getSubscriberByEmail(userEmail);
    } else if (db && db.subscribers) {
      subscriberInfo = db.subscribers.find(s => s.email === userEmail.toLowerCase());
    }
    
    console.log('ðŸ“‹ [set-password] Dados do assinante encontrados:', subscriberInfo ? {
      email: subscriberInfo.email,
      name: subscriberInfo.name
    } : 'NENHUM');

    // Buscar ou criar usuÃ¡rio
    let user;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('ðŸ’¾ [set-password] Hash da senha gerado:', hashedPassword.substring(0, 20) + '...');
    
    if (usePostgreSQL) {
      user = await repo.getUserByEmail(userEmail);
      if (!user) {
        console.log('ðŸ‘¤ [set-password] Criando novo usuÃ¡rio no PostgreSQL:', userEmail);
        // Criar usuÃ¡rio se nÃ£o existir, usando nome do assinante se disponÃ­vel
        user = await repo.createUser({
          email: userEmail.toLowerCase(),
          password: hashedPassword,
          full_name: subscriberInfo?.name || userEmail.split('@')[0],
          role: 'user',
          is_master: false,
          has_password: true
        });
        console.log('âœ… [set-password] UsuÃ¡rio criado no PostgreSQL:', user.id);
      } else {
        console.log('ðŸ‘¤ [set-password] Atualizando senha do usuÃ¡rio existente no PostgreSQL:', user.id);
        // Atualizar senha e nome do usuÃ¡rio existente (se nÃ£o tiver nome)
        const updateData = {
          password: hashedPassword,
          has_password: true
        };
        if (!user.full_name && subscriberInfo?.name) {
          updateData.full_name = subscriberInfo.name;
        }
        user = await repo.updateUser(user.id, updateData);
        console.log('âœ… [set-password] Senha atualizada no PostgreSQL');
      }
    } else if (db && db.users) {
      user = db.users.find(u => u.email === userEmail.toLowerCase());
      
      if (!user) {
        console.log('ðŸ‘¤ [set-password] Criando novo usuÃ¡rio no JSON:', userEmail);
        // Criar usuÃ¡rio com nome do assinante se disponÃ­vel
        user = {
          id: Date.now().toString(),
          email: userEmail.toLowerCase(),
          password: hashedPassword,
          full_name: subscriberInfo?.name || userEmail.split('@')[0],
          role: 'user',
          is_master: false,
          has_password: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.users.push(user);
        console.log('âœ… [set-password] UsuÃ¡rio criado no JSON:', user.id, 'Nome:', user.full_name);
      } else {
        console.log('ðŸ‘¤ [set-password] Atualizando senha do usuÃ¡rio existente no JSON:', user.id);
        // Atualizar senha e nome se nÃ£o tiver
        user.password = hashedPassword;
        user.has_password = true;
        if (!user.full_name && subscriberInfo?.name) {
          user.full_name = subscriberInfo.name;
        }
        user.updated_at = new Date().toISOString();
        console.log('âœ… [set-password] Senha atualizada no JSON, Nome:', user.full_name);
      }
      
      // Remover token do assinante apÃ³s definir senha
      if (db.subscribers) {
        const subscriberIndex = db.subscribers.findIndex(s => s.email === userEmail);
        if (subscriberIndex >= 0) {
          db.subscribers[subscriberIndex].password_token = null;
          db.subscribers[subscriberIndex].token_expires_at = null;
          db.subscribers[subscriberIndex].has_password = true;
          console.log('âœ… [set-password] Token removido do assinante');
        }
      }
      
      // Salvar imediatamente (forÃ§ar salvamento sÃ­ncrono)
      try {
        if (!usePostgreSQL && db) {
          // Importar persistence dinamicamente se necessÃ¡rio
          const persistenceModule = await import('./db/persistence.js');
          if (persistenceModule && persistenceModule.saveDatabase) {
            persistenceModule.saveDatabase(db);
            console.log('ðŸ’¾ [set-password] Banco de dados salvo (sÃ­ncrono)');
          } else if (saveDatabaseDebounced) {
            // Fallback para debounced
            saveDatabaseDebounced(db);
            await new Promise(resolve => setTimeout(resolve, 200));
            console.log('ðŸ’¾ [set-password] Banco de dados salvo (debounced)');
          }
        }
      } catch (saveError) {
        console.error('âŒ [set-password] Erro ao salvar banco:', saveError);
      }
      
      // Verificar se a senha foi salva corretamente
      const verifyUser = db.users.find(u => u.email === userEmail.toLowerCase());
      if (verifyUser && verifyUser.password) {
        console.log('âœ… [set-password] VerificaÃ§Ã£o: Senha salva corretamente no banco');
        console.log('âœ… [set-password] Hash salvo:', verifyUser.password.substring(0, 20) + '...');
        console.log('âœ… [set-password] Email do usuÃ¡rio:', verifyUser.email);
        console.log('âœ… [set-password] ID do usuÃ¡rio:', verifyUser.id);
      } else {
        console.error('âŒ [set-password] ERRO: Senha nÃ£o foi salva corretamente!');
        console.error('âŒ [set-password] UsuÃ¡rio verificado:', verifyUser);
      }
    }

    console.log('âœ… [set-password] Senha definida com sucesso para:', userEmail);
    
    return res.json({
      success: true,
      message: 'Senha definida com sucesso! VocÃª jÃ¡ pode fazer login.'
    });
  } catch (error) {
    console.error('âŒ Erro ao definir senha:', sanitizeForLog({ error: error.message }));
    throw error;
  }
}));

// ðŸ–¼ï¸ IMAGE UPLOAD â€” rota registrada no inÃ­cio do arquivo (apÃ³s auth) para evitar 404

// =======================
// ðŸ”” SERVICE REQUESTS (solicitaÃ§Ãµes de assinantes para master)
// =======================
app.get('/api/service-requests', authenticate, requireMaster(), asyncHandler(async (req, res) => {
  const items = usePostgreSQL ? await repo.listAllServiceRequests() : [];
  res.json({ items });
}));

// âœ… Entities CRUD (POST/PUT/DELETE/bulk) - movido para antes de app.use('/api') linha ~749 para corrigir 404

// REMOVIDO: handlers duplicados app.post/put/delete entities (agora registrados antes do router)

// âœ… Rota movida para: /api/establishments/subscribers/:id ou /api/subscribers/:id
// app.put('/api/subscribers/:id', authenticate, async (req, res) => { ... });

// =======================
// ðŸ”§ FUNCTIONS (FUNÃ‡Ã•ES CUSTOMIZADAS)
// =======================
// Rota: POST /api/functions/:name (getSubscribers, createSubscriber, updateSubscriber, etc.)
// Frontend preferencial: GET /api/establishments/subscribers
app.post('/api/functions/:name', authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    const data = req.body;
    
    console.log(`ðŸ”§ [/api/functions/${name}] FunÃ§Ã£o chamada por:`, req.user?.email, 'is_master:', req.user?.is_master);
    console.log(`ðŸ”§ [/api/functions/${name}] Body:`, JSON.stringify(data).substring(0, 200));
    
    // âœ… updateMasterSlug movido para: /api/users/functions/updateMasterSlug
    // âœ… registerCustomer movido para: /api/users/functions/registerCustomer
    
    // âœ… getSubscribers: delegar ao establishments (frontend chama /api/functions/getSubscribers)
    if (name === 'getSubscribers') {
      await getSubscribersFunctionHandler(req, res);
      return;
    }
    
    // âœ… createSubscriber: delegar ao establishments (frontend chama /api/functions/createSubscriber)
    if (name === 'createSubscriber') {
      await createSubscriberFunctionHandler(req, res);
      return;
    }
    
    // âœ… updateSubscriber: delegar ao establishments (frontend envia { id, data, originalData })
    if (name === 'updateSubscriber') {
      await updateSubscriberFunctionHandler(req, res);
      return;
    }
    
    // âœ… FunÃ§Ãµes de assinantes movidas para: /api/establishments/functions/*
    // - getSubscribers tambÃ©m disponÃ­vel em /api/functions/getSubscribers (acima)
    // - getPlanInfo â†’ /api/establishments/functions/getPlanInfo
    // - getAvailablePlans â†’ /api/establishments/functions/getAvailablePlans
    // - createSubscriber â†’ /api/establishments/functions/createSubscriber
    
    // âœ… createSubscriber movido para: /api/establishments/functions/createSubscriber
    if (false && name === 'createSubscriber') { // Desabilitado - movido para mÃ³dulo
      // Apenas master pode criar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Validar plano
      const validPlans = ['free', 'basic', 'pro', 'ultra', 'admin', 'custom'];
      if (data.plan && !validPlans.includes(data.plan)) {
        return res.status(400).json({ 
          error: `Plano invÃ¡lido: ${data.plan}. Planos vÃ¡lidos: ${validPlans.join(', ')}` 
        });
      }
      
      // Se for plano custom, garantir que tem permissÃµes definidas
      if (data.plan === 'custom' && (!data.permissions || Object.keys(data.permissions).length === 0)) {
        return res.status(400).json({ 
          error: 'Plano custom requer permissÃµes definidas' 
        });
      }
      
      try {
        console.log('ðŸ“ Criando assinante:', { 
          email: data.email, 
          plan: data.plan, 
          hasPermissions: !!data.permissions 
        });
        
        const subscriber = usePostgreSQL
          ? await repo.createSubscriber(data)
          : (() => {
              // Fallback JSON - apenas para desenvolvimento
              if (!db || !db.subscribers) {
                throw new Error('Banco de dados nÃ£o inicializado');
              }
              
              // Verificar se jÃ¡ existe
              const existingIndex = db.subscribers.findIndex(s => s.email === data.email);
              
              const rawSlug = data.slug;
              const slug = (rawSlug == null || rawSlug === '') ? null : (String(rawSlug).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null);
              const linked = (data.linked_user_email != null && String(data.linked_user_email || '').trim()) ? String(data.linked_user_email).trim() : null;
              const newSub = {
                id: existingIndex >= 0 ? db.subscribers[existingIndex].id : Date.now().toString(),
                email: data.email,
                name: data.name,
                plan: data.plan || 'basic',
                status: data.status || 'active',
                expires_at: data.expires_at || null,
                permissions: data.permissions || {},
                whatsapp_auto_enabled: data.whatsapp_auto_enabled !== undefined ? data.whatsapp_auto_enabled : true,
                slug,
                linked_user_email: linked,
                created_at: existingIndex >= 0 ? db.subscribers[existingIndex].created_at : new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              if (existingIndex >= 0) {
                // Atualizar existente
                db.subscribers[existingIndex] = newSub;
              } else {
                // Criar novo
                db.subscribers.push(newSub);
              }
              
              if (saveDatabaseDebounced) saveDatabaseDebounced(db);
              return newSub;
            })();
        
        // Gerar token de senha automaticamente para novos assinantes
        let passwordTokenData = null;
        try {
          // Verificar se Ã© um novo assinante (nÃ£o atualizaÃ§Ã£o)
          const isNewSubscriber = !data.id; // Se nÃ£o tem ID, Ã© novo
          
          if (isNewSubscriber) {
            passwordTokenData = generatePasswordTokenForSubscriber(
              subscriber.email,
              subscriber.id || subscriber.email
            );
            
            // Atualizar assinante com token (se nÃ£o foi salvo automaticamente)
            if (usePostgreSQL) {
              // Atualizar assinante no PostgreSQL
              if (repo.updateSubscriber) {
                await repo.updateSubscriber(subscriber.id, {
                  password_token: passwordTokenData.token,
                  token_expires_at: passwordTokenData.expires_at
                });
                console.log('ðŸ’¾ [createSubscriber] Token salvo no PostgreSQL para:', subscriber.email);
              }
            } else if (db && db.subscribers) {
              // Garantir que o token seja salvo no assinante
              const subIndex = db.subscribers.findIndex(s => 
                s.email === subscriber.email || (subscriber.id && (s.id === subscriber.id || s.id === String(subscriber.id)))
              );
              if (subIndex >= 0) {
                db.subscribers[subIndex].password_token = passwordTokenData.token;
                db.subscribers[subIndex].token_expires_at = passwordTokenData.expires_at;
                db.subscribers[subIndex].updated_at = new Date().toISOString();
                
                // Atualizar tambÃ©m o objeto subscriber retornado
                subscriber.password_token = passwordTokenData.token;
                subscriber.token_expires_at = passwordTokenData.expires_at;
                
                console.log('ðŸ’¾ [createSubscriber] Token salvo no JSON para:', subscriber.email);
                
                if (saveDatabaseDebounced) {
                  saveDatabaseDebounced(db);
                }
              } else {
                console.warn('âš ï¸ [createSubscriber] Assinante nÃ£o encontrado apÃ³s criaÃ§Ã£o:', subscriber.email);
              }
            }
            
            console.log('ðŸ”‘ Token de senha gerado automaticamente para:', subscriber.email);
          }
        } catch (tokenError) {
          console.warn('âš ï¸ Erro ao gerar token de senha (nÃ£o crÃ­tico):', tokenError.message);
          // NÃ£o falhar a criaÃ§Ã£o do assinante se o token falhar
        }
        
        console.log('âœ… Assinante criado com sucesso:', subscriber.id || subscriber.email);
        
        // Retornar assinante com token de senha (se gerado)
        return res.json({ 
          data: { 
            subscriber,
            ...(passwordTokenData && {
              password_token: passwordTokenData.token,
              setup_url: passwordTokenData.setup_url,
              token_expires_at: passwordTokenData.expires_at
            })
          } 
        });
      } catch (error) {
        console.error('âŒ Erro ao criar assinante:', error);
        console.error('âŒ Stack trace:', error.stack);
        return res.status(500).json({ 
          error: 'Erro ao criar assinante',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
    
    // âœ… updateSubscriber movido para: /api/establishments/subscribers/:id
    if (false && name === 'updateSubscriber') { // Desabilitado - movido para mÃ³dulo
      // Apenas master pode atualizar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // O frontend envia: { id, data: {...}, originalData: {...} }
      // Precisamos extrair os dados corretamente
      const subscriberId = data.id;
      const updateData = data.data || data; // Se nÃ£o tiver 'data', usar o body inteiro (compatibilidade)
      const originalData = data.originalData;
      
      console.log('ðŸ“ [updateSubscriber] Recebido:', {
        subscriberId,
        updateDataKeys: Object.keys(updateData),
        hasOriginalData: !!originalData
      });
      console.log('ðŸ“ [updateSubscriber] updateData completo:', JSON.stringify(updateData, null, 2));
      
      // Validar plano se estiver sendo atualizado
      if (updateData.plan) {
        const validPlans = ['free', 'basic', 'pro', 'ultra', 'admin', 'custom'];
        if (!validPlans.includes(updateData.plan)) {
          return res.status(400).json({ 
            error: `Plano invÃ¡lido: ${updateData.plan}. Planos vÃ¡lidos: ${validPlans.join(', ')}` 
          });
        }
        
        // Se for plano custom, garantir que tem permissÃµes definidas
        if (updateData.plan === 'custom' && (!updateData.permissions || Object.keys(updateData.permissions).length === 0)) {
          return res.status(400).json({ 
            error: 'Plano custom requer permissÃµes definidas' 
          });
        }
      }
      
      try {
        console.log('ðŸ“ [updateSubscriber] Atualizando assinante:', { 
          email: updateData.email, 
          id: subscriberId,
          plan: updateData.plan 
        });
        
        // O email pode estar em updateData ou no subscriberId (se for email)
        const subscriberEmail = updateData.email;
        const identifier = subscriberId || subscriberEmail;
        
        console.log('ðŸ” [updateSubscriber] Buscando assinante com:', { id: subscriberId, email: subscriberEmail, identifier });
        
        if (!identifier) {
          console.error('âŒ [updateSubscriber] Nenhum identificador fornecido (id ou email)');
          return res.status(400).json({ error: 'ID ou email do assinante Ã© obrigatÃ³rio' });
        }
        
        let subscriber = null;
        if (usePostgreSQL) {
          subscriber = await repo.updateSubscriber(identifier, updateData);
          console.log('âœ… [updateSubscriber] Assinante atualizado no PostgreSQL:', subscriber?.id);
          
          if (!subscriber) {
            console.error('âŒ [updateSubscriber] Assinante nÃ£o encontrado no PostgreSQL com:', identifier);
            return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
          }
        } else {
          if (!db || !db.subscribers) {
            throw new Error('Banco de dados nÃ£o inicializado');
          }
          
          // Buscar por ID primeiro, depois por email
          const index = db.subscribers.findIndex(s => {
            if (subscriberId) {
              return s.id === subscriberId || s.id === String(subscriberId) || String(s.id) === String(subscriberId);
            }
            if (subscriberEmail) {
              return s.email?.toLowerCase() === subscriberEmail?.toLowerCase();
            }
            return false;
          });
          
          console.log('ðŸ” [updateSubscriber] Ãndice encontrado:', index);
          
          if (index === -1) {
            console.error('âŒ [updateSubscriber] Assinante nÃ£o encontrado. Assinantes disponÃ­veis:');
            db.subscribers.forEach((sub, idx) => {
              console.log(`  [${idx}] ID: ${sub.id}, Email: ${sub.email}`);
            });
            return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
          }
          
          // Atualizar mantendo campos existentes
          const existing = db.subscribers[index];
          subscriber = { 
            ...existing, 
            ...updateData,
            id: existing.id, // Garantir que ID nÃ£o seja alterado
            email: subscriberEmail || existing.email, // Manter email se nÃ£o for fornecido
            updated_at: new Date().toISOString()
          };
          
          db.subscribers[index] = subscriber;
          
          // Salvar imediatamente
          if (saveDatabaseDebounced) {
            saveDatabaseDebounced(db);
          }
          
          console.log('âœ… [updateSubscriber] Assinante atualizado no JSON:', subscriber.id);
        }
        
        if (!subscriber) {
          console.error('âŒ [updateSubscriber] Assinante nÃ£o encontrado apÃ³s atualizaÃ§Ã£o');
          return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
        }
        
        console.log('âœ… Assinante atualizado com sucesso:', subscriber.id || subscriber.email);
        return res.json({ data: { subscriber } });
      } catch (error) {
        console.error('âŒ Erro ao atualizar assinante:', error);
        console.error('âŒ Stack trace:', error.stack);
        return res.status(500).json({ 
          error: 'Erro ao atualizar assinante',
          details: error.message 
        });
      }
    }
    
    if (name === 'generatePasswordTokenForSubscriber') {
      // Gerar token de senha para assinante
      const { subscriber_id, email } = req.body;
      
      if (!subscriber_id && !email) {
        return res.status(400).json({ error: 'subscriber_id ou email Ã© obrigatÃ³rio' });
      }
      
      try {
        // Buscar assinante para validar
        let subscriber = null;
        if (usePostgreSQL) {
          if (email) {
            subscriber = await repo.getSubscriberByEmail(email);
          } else if (subscriber_id) {
            // Buscar todos e filtrar por ID (temporÃ¡rio atÃ© ter getSubscriberById)
            const allSubscribers = await repo.listSubscribers();
            subscriber = allSubscribers.find(s => s.id === parseInt(subscriber_id) || s.id === subscriber_id);
          }
        } else if (db && db.subscribers) {
          subscriber = db.subscribers.find(s => 
            s.email === email || s.id === subscriber_id
          );
        }
        
        if (!subscriber) {
          return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
        }
        
        // Gerar token
        const tokenData = generatePasswordTokenForSubscriber(
          subscriber.email,
          subscriber.id || subscriber.email
        );
        
        console.log('ðŸ”‘ Token de senha gerado manualmente para:', subscriber.email);
        
        return res.json({
          data: {
            token: tokenData.token,
            setup_url: tokenData.setup_url,
            expires_at: tokenData.expires_at
          }
        });
      } catch (error) {
        console.error('âŒ Erro ao gerar token de senha:', error);
        return res.status(500).json({ 
          error: 'Erro ao gerar token de senha',
          details: error.message 
        });
      }
    }
    
    if (name === 'deleteSubscriber') {
      // Apenas master pode deletar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        console.log('ðŸ—‘ï¸ Deletando assinante:', { 
          email: data.email, 
          id: data.id 
        });
        
        const subscriber = usePostgreSQL
          ? await repo.deleteSubscriber(data.email || data.id)
          : (() => {
              if (!db || !db.subscribers) {
                throw new Error('Banco de dados nÃ£o inicializado');
              }
              const index = db.subscribers.findIndex(s => s.email === data.email || s.id === data.id);
              if (index === -1) return null;
              const deleted = db.subscribers.splice(index, 1)[0];
              if (saveDatabaseDebounced) saveDatabaseDebounced(db);
              return deleted;
            })();
        
        if (!subscriber) {
          return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
        }
        
        console.log('âœ… Assinante deletado com sucesso:', subscriber.id || subscriber.email);
        return res.json({ data: { subscriber } });
      } catch (error) {
        console.error('âŒ Erro ao deletar assinante:', error);
        console.error('âŒ Stack trace:', error.stack);
        return res.status(500).json({ 
          error: 'Erro ao deletar assinante',
          details: error.message 
        });
      }
    }
    
    if (name === 'checkSubscriptionStatus') {
      console.log('ðŸ“‹ [checkSubscriptionStatus] Verificando assinatura para:', data.user_email);
      let subscriber = null;
      if (usePostgreSQL) {
        const user = await repo.getUserByEmail(data.user_email);
        if (user?.subscriber_email && user?.profile_role) {
          subscriber = await repo.getSubscriberByEmail(user.subscriber_email);
        } else {
          subscriber = await repo.getSubscriberByEmail(data.user_email);
        }
      } else if (db?.subscribers) {
        const u = db.users?.find(x => (x.email || '').toLowerCase() === (data.user_email || '').toLowerCase());
        const emailToFind = (u?.subscriber_email && u?.profile_role) ? u.subscriber_email : data.user_email;
        subscriber = db.subscribers.find(s => (s.email || '').toLowerCase() === (emailToFind || '').toLowerCase()) || null;
      }
      
      console.log('ðŸ“‹ [checkSubscriptionStatus] Assinante encontrado:', subscriber ? {
        email: subscriber.email,
        name: subscriber.name,
        status: subscriber.status,
        plan: subscriber.plan
      } : 'NENHUM');
      
      if (!subscriber) {
        console.warn('âš ï¸ [checkSubscriptionStatus] Assinante nÃ£o encontrado. Assinantes disponÃ­veis:');
        if (db && db.subscribers) {
          db.subscribers.forEach((sub, idx) => {
            console.log(`  [${idx}] Email: ${sub.email}, Nome: ${sub.name}`);
          });
        }
      }
      
      return res.json({
        data: {
          status: subscriber ? 'success' : 'not_found',
          is_active: subscriber?.status === 'active',
          subscriber: subscriber || null
        }
      });
    }
    
    // âœ… NOVO: Atualizar slug do master
    if (name === 'updateMasterSlug') {
      console.log('ðŸ“ [updateMasterSlug] Master atualizando slug:', data.slug);
      
      // Apenas master pode atualizar seu prÃ³prio slug
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Apenas masters podem atualizar slug' });
      }
      
      const { slug } = data;
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return res.status(400).json({ error: 'Slug invÃ¡lido' });
      }
      
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      
      if (usePostgreSQL) {
        try {
          await repo.updateUser(req.user.id, { slug: cleanSlug });
          console.log('âœ… [updateMasterSlug] Slug atualizado com sucesso:', cleanSlug);
          return res.json({ 
            data: { 
              success: true, 
              slug: cleanSlug,
              message: 'Slug atualizado com sucesso' 
            } 
          });
        } catch (error) {
          console.error('âŒ [updateMasterSlug] Erro ao atualizar:', error);
          return res.status(500).json({ error: 'Erro ao atualizar slug' });
        }
      } else {
        // JSON mode
        if (!db || !db.users) {
          return res.status(500).json({ error: 'Banco de dados nÃ£o inicializado' });
        }
        
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
          return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
        }
        
        db.users[userIndex].slug = cleanSlug;
        await saveDB();
        
        console.log('âœ… [updateMasterSlug] Slug atualizado com sucesso:', cleanSlug);
        return res.json({ 
          data: { 
            success: true, 
            slug: cleanSlug,
            message: 'Slug atualizado com sucesso' 
          } 
        });
      }
    }
    
    if (name === 'getFullSubscriberProfile') {
      // Apenas master pode ver dados completos de assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const { subscriber_email } = data;
      if (!subscriber_email) {
        return res.status(400).json({ error: 'subscriber_email Ã© obrigatÃ³rio' });
      }
      
      console.log('ðŸ“Š [getFullSubscriberProfile] Buscando perfil completo para:', subscriber_email);
      
      try {
        // Buscar assinante
        const subscriber = usePostgreSQL
          ? await repo.getSubscriberByEmail(subscriber_email)
          : (db && db.subscribers ? db.subscribers.find(s => s.email?.toLowerCase() === subscriber_email?.toLowerCase()) : null);
        
        if (!subscriber) {
          return res.status(404).json({ error: 'Assinante nÃ£o encontrado' });
        }
        
        let dishes = [];
        let categories = [];
        let complement_groups = [];
        let combos = [];
        let orders = [];
        let caixas = [];
        let comandas = [];
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
          // JSON - buscar entidades com filtro por owner_email
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
        
        // Calcular estatÃ­sticas
        const stats = {
          total_dishes: dishes.length,
          total_orders: orders.length,
          total_revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
          active_caixas: caixas.filter(c => c.status === 'open').length,
          total_comandas: comandas.length,
          comandas_abertas: comandas.filter(c => c.status === 'open').length
        };
        
        console.log('âœ… [getFullSubscriberProfile] Perfil completo gerado:', {
          subscriber: subscriber.email,
          dishes: stats.total_dishes,
          orders: stats.total_orders,
          revenue: stats.total_revenue,
          comandas: stats.total_comandas
        });
        
        return res.json({
          data: { dishes, categories, complement_groups, combos, orders, caixas, comandas, store },
          stats,
          subscriber
        });
      } catch (error) {
        console.error('âŒ [getFullSubscriberProfile] Erro:', error);
        return res.status(500).json({ 
          error: 'Erro ao buscar perfil do assinante',
          details: error.message 
        });
      }
    }
    
    // âœ… registerCustomer movido para: /api/users/functions/registerCustomer
    
    // FunÃ§Ã£o padrÃ£o (mock)
    res.json({ 
      success: true, 
      function: name,
      data: data,
      message: `FunÃ§Ã£o ${name} executada com sucesso`
    });
  } catch (error) {
    console.error('Erro ao executar funÃ§Ã£o:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// =======================
// ðŸ  ROTA RAIZ (para health checks)
// =======================
app.get('/', (req, res) => {
  res.json({
    service: 'DigiMenu API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs'
    }
  });
});

// =======================
// ðŸ§ª HEALTH CHECK
// =======================
app.get('/api/health', asyncHandler(async (req, res) => {
  const health = {
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Verificar conexÃ£o com banco de dados
  if (usePostgreSQL) {
    try {
      const connected = await testConnection();
      health.database = connected ? 'connected' : 'disconnected';
    } catch (error) {
      health.database = 'error';
      health.databaseError = error.message;
    }
  } else {
    health.database = 'fallback_json';
  }
  
  // Verificar Cloudinary (se configurado)
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    health.cloudinary = 'configured';
  } else {
    health.cloudinary = 'not_configured';
  }
  
  const statusCode = health.database === 'connected' || health.database === 'fallback_json' ? 200 : 503;
  res.status(statusCode).json(health);
}));

// =======================
// ðŸ” HEALTH CHECK ESPECÃFICO PARA SUBSCRIBERS (DIAGNÃ“STICO)
// =======================
app.get('/api/health/subscribers', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const diagnostic = {
    time: new Date().toISOString(),
    steps: []
  };

  try {
    const { query } = await import('./db/postgres.js');
    
    // Passo 1: Testar conexÃ£o
    diagnostic.steps.push({ step: 1, action: 'Testando conexÃ£o PostgreSQL...', time: Date.now() - startTime });
    const connected = await testConnection();
    diagnostic.steps.push({ step: 1, result: connected ? 'conectado' : 'falhou', time: Date.now() - startTime });
    
    if (!connected) {
      return res.status(503).json({ ...diagnostic, error: 'PostgreSQL nÃ£o conectado' });
    }

    // Passo 2: Contar assinantes
    diagnostic.steps.push({ step: 2, action: 'Executando COUNT(*)...', time: Date.now() - startTime });
    const countResult = await query('SELECT COUNT(*)::int as total FROM subscribers');
    const total = countResult.rows[0]?.total ?? 0;
    diagnostic.steps.push({ step: 2, result: `${total} assinantes`, time: Date.now() - startTime });

    // Passo 3: Buscar 5 assinantes de exemplo
    diagnostic.steps.push({ step: 3, action: 'Buscando 5 assinantes...', time: Date.now() - startTime });
    const sampleResult = await query(`
      SELECT id, email, name, plan, status, created_at
      FROM subscribers
      ORDER BY created_at DESC
      LIMIT 5
    `);
    diagnostic.steps.push({ step: 3, result: `${sampleResult.rows.length} retornados`, time: Date.now() - startTime });

    const totalTime = Date.now() - startTime;
    
    return res.json({
      status: 'ok',
      totalTime: `${totalTime}ms`,
      totalSubscribers: total,
      sampleSubscribers: sampleResult.rows.map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        plan: s.plan,
        status: s.status
      })),
      diagnostic
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    diagnostic.steps.push({ step: 'ERROR', error: error.message, time: totalTime });
    
    return res.status(500).json({
      status: 'error',
      error: error.message,
      totalTime: `${totalTime}ms`,
      diagnostic
    });
  }
}));

// =======================
// ðŸ“Š ROTAS DE ANALYTICS, BACKUP, MERCADOPAGO E METRICS
// =======================
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/subscriber-backup', subscriberBackupRoutes);
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/affiliates', affiliatesRoutes);
app.use('/api/lgpd', lgpdRoutes);

// =======================
// âœ… TRATAMENTO DE ERROS (deve ser o Ãºltimo middleware)
// =======================
app.use(errorHandler);

// =======================
// ðŸŒ± ENDPOINT DE SEED DEMO (uso Ãºnico via HTTP - GET e POST)
// =======================
const seedDemoHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Seed requer PostgreSQL. Configure DATABASE_URL.' });
  }

  // ValidaÃ§Ã£o simples com chave secreta
  const secretKey = req.headers['x-seed-key'] || req.query.key;
  const expectedKey = process.env.SEED_SECRET_KEY || 'demo-secret-2026';
  
  if (secretKey !== expectedKey) {
    return res.status(403).json({ 
      error: 'NÃ£o autorizado. Configure SEED_SECRET_KEY no Render ou use a chave padrÃ£o.',
      hint: 'Envie a chave via header x-seed-key ou query ?key=...'
    });
  }

  const DEMO_EMAIL = 'demo@pizzaria.com';
  const DEMO_SLUG = 'demo-pizzaria';

  try {
    // 1. Verificar se jÃ¡ existe
    let subscriber = await repo.getSubscriberByEmail(DEMO_EMAIL);
    
    if (subscriber) {
      return res.json({ 
        message: 'Demo jÃ¡ existe! Use o link abaixo.',
        url: `https://digimenu-chi.vercel.app/s/${DEMO_SLUG}`,
        email: DEMO_EMAIL,
        slug: DEMO_SLUG,
        alreadyExists: true
      });
    }

    console.log('ðŸ• Criando demo-pizzaria...');

    // 2. Criar subscriber
    subscriber = await repo.createSubscriber({
      email: DEMO_EMAIL,
      name: 'Pizzaria Demo',
      slug: DEMO_SLUG,
      plan: 'ultra',
      status: 'active',
      expires_at: null,
      permissions: {
        store: ['view', 'update'],
        dishes: ['view', 'create', 'update', 'delete'],
        categories: ['view', 'create', 'update', 'delete'],
        orders: ['view', 'create', 'update', 'delete'],
        dashboard: ['view'],
        whatsapp: ['view'],
        pizza_config: ['view', 'update']
      }
    });
    console.log('âœ… Subscriber criado');

    const subEmail = subscriber.email;

    // 3. Criar loja
    await repo.createEntity('Store', subEmail, {
      name: 'Pizzaria Demo',
      slogan: 'A melhor pizza da cidade!',
      whatsapp: '11999887766',
      address: 'Rua das Pizzas, 123 - Centro',
      opening_time: '18:00',
      closing_time: '23:00',
      working_days: [0, 1, 2, 3, 4, 5, 6],
      is_open: true,
      accepting_orders: true,
      primary_color: '#e63946',
      enable_premium_pizza_visualization: true
    });
    console.log('âœ… Loja criada');

    // 4. Criar categorias
    const pizzaCat = await repo.createEntity('Category', subEmail, { name: 'Pizzas', order: 1, is_active: true });
    const bebidaCat = await repo.createEntity('Category', subEmail, { name: 'Bebidas', order: 2, is_active: true });
    await repo.createEntity('Category', subEmail, { name: 'Sobremesas', order: 3, is_active: true });
    console.log('âœ… Categorias criadas');

    // 5. Tamanhos de pizza
    await repo.createEntity('PizzaSize', subEmail, {
      name: 'Pequena', slices: 4, max_flavors: 2,
      price_tradicional: 35.00, price_premium: 40.00, order: 1, is_active: true
    });
    await repo.createEntity('PizzaSize', subEmail, {
      name: 'MÃ©dia', slices: 6, max_flavors: 2,
      price_tradicional: 50.00, price_premium: 60.00, order: 2, is_active: true
    });
    await repo.createEntity('PizzaSize', subEmail, {
      name: 'Grande', slices: 8, max_flavors: 3,
      price_tradicional: 65.00, price_premium: 75.00, order: 3, is_active: true
    });
    console.log('âœ… Tamanhos criados');

    // 6. Sabores
    const flavors = [
      { name: 'Margherita', category: 'tradicional', order: 1 },
      { name: 'Calabresa', category: 'tradicional', order: 2 },
      { name: 'Frango com Catupiry', category: 'tradicional', order: 3 },
      { name: 'Portuguesa', category: 'tradicional', order: 4 },
      { name: 'Quatro Queijos', category: 'premium', order: 5 },
      { name: 'Pepperoni', category: 'premium', order: 6 },
      { name: 'Lombinho', category: 'premium', order: 7 },
      { name: 'CamarÃ£o', category: 'premium', order: 8 }
    ];
    for (const flavor of flavors) {
      await repo.createEntity('PizzaFlavor', subEmail, {
        ...flavor, description: `Deliciosa pizza de ${flavor.name}`, is_active: true
      });
    }
    console.log('âœ… Sabores criados');

    // 7. Bordas
    await repo.createEntity('PizzaEdge', subEmail, { name: 'Catupiry', price: 8.00, order: 1, is_active: true });
    await repo.createEntity('PizzaEdge', subEmail, { name: 'Cheddar', price: 10.00, order: 2, is_active: true });
    console.log('âœ… Bordas criadas');

    // 8. Extras
    await repo.createEntity('PizzaExtra', subEmail, { name: 'Bacon Extra', price: 5.00, order: 1, is_active: true });
    await repo.createEntity('PizzaExtra', subEmail, { name: 'Azeitonas', price: 3.00, order: 2, is_active: true });
    console.log('âœ… Extras criados');

    // 9. Pratos
    await repo.createEntity('Dish', subEmail, {
      name: 'Monte Sua Pizza',
      description: 'Escolha o tamanho, sabores, borda e extras!',
      price: 35.00,
      category_id: pizzaCat.id,
      product_type: 'pizza',
      is_active: true,
      order: 1
    });
    await repo.createEntity('Dish', subEmail, {
      name: 'Coca-Cola 2L',
      description: 'Refrigerante Coca-Cola 2 litros',
      price: 12.00,
      category_id: bebidaCat.id,
      product_type: 'simple',
      is_active: true,
      order: 1
    });
    await repo.createEntity('Dish', subEmail, {
      name: 'GuaranÃ¡ Antarctica 2L',
      description: 'Refrigerante GuaranÃ¡ 2 litros',
      price: 10.00,
      category_id: bebidaCat.id,
      product_type: 'simple',
      is_active: true,
      order: 2
    });
    console.log('âœ… Pratos criados');

    // 10. Zona de entrega
    await repo.createEntity('DeliveryZone', subEmail, {
      name: 'Centro', fee: 5.00, min_order: 30.00,
      delivery_time: '40-50 min', is_active: true
    });
    console.log('âœ… Zona de entrega criada');

    console.log('ðŸŽ‰ Demo criado com sucesso!');

    res.json({
      success: true,
      message: 'ðŸŽ‰ Demo criado com sucesso!',
      url: `https://digimenu-chi.vercel.app/s/${DEMO_SLUG}`,
      email: DEMO_EMAIL,
      slug: DEMO_SLUG,
      details: {
        categories: 3,
        pizzaSizes: 3,
        flavors: 8,
        edges: 2,
        extras: 2,
        dishes: 3,
        deliveryZones: 1
      }
    });

  } catch (error) {
    console.error('âŒ Erro ao criar demo:', error);
    res.status(500).json({ 
      error: 'Erro ao criar demo',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Registrar para GET e POST
app.get('/api/seed-demo', seedDemoHandler);
app.post('/api/seed-demo', seedDemoHandler);

// =======================
// ðŸ§¹ ENDPOINT DE LIMPEZA DE CONFLITO MASTER-SUBSCRIBER
// =======================
const cleanupMasterHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Limpeza requer PostgreSQL' });
  }

  // ValidaÃ§Ã£o simples (vocÃª pode melhorar com senha)
  const secretKey = req.headers['x-cleanup-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'NÃ£o autorizado. Configure CLEANUP_SECRET_KEY.' });
  }

  try {
    console.log('ðŸ§¹ Iniciando limpeza de conflitos master-subscriber...');
    
    // Importar query do postgres
    const { query } = await import('./db/postgres.js');
    
    // 1. Buscar todos os usuÃ¡rios master
    const mastersResult = await query(
      'SELECT id, email, full_name, is_master FROM users WHERE is_master = TRUE'
    );
    
    if (mastersResult.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Nenhum usuÃ¡rio master encontrado'
      });
    }
    
    const conflicts = [];
    
    // 2. Para cada master, verificar se existe subscriber com o mesmo email
    for (const master of mastersResult.rows) {
      const subscriber = await repo.getSubscriberByEmail(master.email);
      
      if (subscriber) {
        conflicts.push({
          master_email: master.email,
          master_id: master.id,
          subscriber_email: subscriber.email,
          subscriber_id: subscriber.id,
          subscriber_plan: subscriber.plan,
          subscriber_status: subscriber.status
        });
        
        console.log(`âš ï¸ Conflito encontrado: ${master.email}`);
        
        // 3. Deletar todas as entidades do subscriber
        console.log(`  â†’ Deletando entidades do subscriber ${subscriber.email}...`);
        const entitiesResult = await query(
          'DELETE FROM entities WHERE subscriber_email = $1',
          [subscriber.email]
        );
        console.log(`  âœ“ ${entitiesResult.rowCount} entidades deletadas`);
        
        // 4. Deletar o subscriber
        console.log(`  â†’ Deletando subscriber ${subscriber.email}...`);
        await query(
          'DELETE FROM subscribers WHERE email = $1',
          [subscriber.email]
        );
        console.log(`  âœ“ Subscriber deletado`);
      }
    }
    
    if (conflicts.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum conflito encontrado. Sistema OK!',
        masters: mastersResult.rows.length
      });
    }
    
    console.log('âœ… Limpeza concluÃ­da!');
    
    res.json({
      success: true,
      message: `${conflicts.length} conflito(s) resolvido(s) com sucesso!`,
      conflicts_resolved: conflicts,
      masters_count: mastersResult.rows.length
    });

  } catch (error) {
    console.error('âŒ Erro ao limpar conflitos:', error);
    res.status(500).json({ 
      error: 'Erro ao limpar conflitos',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Registrar para GET e POST
app.get('/api/cleanup-master', cleanupMasterHandler);
app.post('/api/cleanup-master', cleanupMasterHandler);

// =======================
// ðŸ—‘ï¸ ENDPOINT PARA DELETAR SUBSCRIBER ESPECÃFICO POR SLUG (LEGADO - MOVIDO PARA MÃ“DULO)
// =======================
// âœ… Handler movido para: backend/modules/establishments/establishments.service.js
// âœ… Rotas movidas para: /api/establishments/delete-subscriber-by-slug
*/

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
const io = setupWebSocket(server);

// Emitir atualizaÃ§Ãµes quando pedido Ã© atualizado
const originalPutOrder = app._router?.stack?.find(layer => layer.route?.path === '/api/entities/Order/:id' && layer.route?.methods?.put);
if (originalPutOrder) {
  // A atualizaÃ§Ã£o jÃ¡ serÃ¡ feita nas rotas existentes
}

server.listen(PORT, () => {
  console.log(`ðŸš€ Servidor rodando na porta ${PORT}`);
  console.log(`ðŸ“¡ ${isProd ? `${BACKEND_URL}/api` : `http://localhost:${PORT}/api`}`);
  console.log(`ðŸ”’ Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ðŸ”Œ WebSocket ativo`);
  console.log(`ðŸ”§ Functions router: POST /api/functions/:name montado`);
  
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




