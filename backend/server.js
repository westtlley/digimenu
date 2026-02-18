// =======================
// 🌱 ENV CONFIG
// =======================
// NOTA: As variáveis de ambiente já foram carregadas pelo bootstrap.js
// Se este arquivo for executado diretamente (sem bootstrap), 
// o loadEnv.js será importado automaticamente via side-effect quando necessário
// (módulos que precisam de env importam loadEnv.js no topo)

// Log de validação (após env carregado)
// Usar setImmediate para garantir que env foi carregado (se executado diretamente)
setImmediate(() => {
  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_CHATBOT_KEY || '';
  console.log('🧪 ENV VALIDATED:', {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ Configurado' : '❌ Não configurado',
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    'OpenAI assistente': (openaiKey && openaiKey.trim()) ? '✅ Ativado' : '⚠️ Não configurado (use OPENAI_API_KEY no .env)'
  });
});

// =======================
// 📦 IMPORTS
// =======================
import express from 'express';
import http from 'http';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import { setupWebSocket, emitOrderUpdate, emitOrderCreated, emitComandaUpdate, emitComandaCreated, emitWaiterCall, emitTableUpdate } from './services/websocket.js';
import { getAIResponse, isAIAvailable } from './services/chatAI.js';

import cloudinary from './config/cloudinary.js';
import { upload } from './middlewares/upload.js';
import { testConnection } from './db/postgres.js';
import { migrate } from './db/migrate.js';
import * as repo from './db/repository.js';
import { requirePermission, requireAccess, requireMaster } from './middlewares/permissions.js';
import { PLANS, getPlanInfo } from './utils/plans.js';
import { logger } from './utils/logger.js';
import { validateJWTSecret, sanitizeForLog, setupHelmet, sanitizeMiddleware } from './middlewares/security.js';
import { storeToken, getToken, deleteToken } from './utils/tokenStorage.js';
import { requestLogger } from './utils/monitoring.js';
import { scheduleBackups } from './utils/backup.js';
import { analyticsMiddleware } from './utils/analytics.js';
import { initializeCronJobs } from './utils/cronJobs.js';
import analyticsRoutes from './routes/analytics.routes.js';
import backupRoutes from './routes/backup.routes.js';
import subscriberBackupRoutes from './routes/subscriberBackup.routes.js';
import mercadopagoRoutes from './routes/mercadopago.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import affiliatesRoutes from './routes/affiliates.routes.js';
import lgpdRoutes from './routes/lgpd.routes.js';
import authRoutes, { getUserContext } from './modules/auth/auth.routes.js';
import * as authController from './modules/auth/auth.controller.js';
import { generatePasswordTokenForSubscriber } from './modules/auth/auth.service.js';
import usersRoutes from './modules/users/users.routes.js';
import * as usersController from './modules/users/users.controller.js';
import { isRequesterGerente } from './modules/users/users.utils.js';
import establishmentsRoutes from './modules/establishments/establishments.routes.js';
import * as establishmentsController from './modules/establishments/establishments.controller.js';
import menusRoutes from './modules/menus/menus.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import { initializeAppConfig } from './config/appConfig.js';
import { loginLimiter, apiLimiter, createLimiter } from './middlewares/rateLimit.js';
import { validate, schemas } from './middlewares/validation.js';
import { errorHandler, asyncHandler } from './middlewares/errorHandler.js';
import { compressionMiddleware } from './middlewares/compression.js';

// =======================
// ⚙️ APP SETUP
// =======================
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ VALIDAR JWT_SECRET (obrigatório em produção)
const JWT_SECRET = validateJWTSecret();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// CORS: allowedOrigins Set (evita cb(new Error) que causa pending/canceled)
const _envList = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const allowedOrigins = new Set([
  'https://digimenu-chi.vercel.app',
  'https://digimenu.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  FRONTEND_URL,
  ..._envList
].filter(Boolean));
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// =======================
// 🧱 MIDDLEWARES
// =======================
// ✅ SEGURANÇA: Helmet para headers de segurança
setupHelmet(app);

// ✅ COMPRESSÃO DE RESPOSTAS (reduz tamanho em ~70%)
app.use(compressionMiddleware);

// ✅ CORS: preflight consistente (mesmo config para use e options)
const corsOptions = {
  origin: (origin, cb) => {
    // Permitir requisições sem origin (ex: mobile apps, Postman, curl)
    if (!origin) return cb(null, true);
    
    // Log para debug em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 CORS: Verificando origem:', origin);
    }
    
    if (allowedOrigins.has(origin)) {
      console.log('✅ CORS: origem permitida:', origin);
      return cb(null, true);
    }
    
    console.warn('⚠️ CORS: origem NÃO permitida:', origin);
    console.warn('📋 CORS: origens permitidas:', Array.from(allowedOrigins));
    
    // Retornar false sem erro (não bloqueia, apenas não adiciona headers CORS)
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

// ✅ SANITIZAÇÃO DE DADOS (proteção XSS)
app.use(sanitizeMiddleware);

// ✅ LOGGING DE REQUISIÇÕES
app.use(requestLogger);

// ✅ ANALYTICS (rastreamento de eventos)
app.use(analyticsMiddleware);

// ✅ RATE LIMITING (aplicar após rotas públicas)
app.use('/api', apiLimiter);

// Inicializar Passport
app.use(passport.initialize());

// =======================
// 🗃️ DATABASE (POSTGRESQL COM FALLBACK)
// =======================
// Verificar se DATABASE_URL está configurado
const usePostgreSQL = !!process.env.DATABASE_URL;

// Fallback: sistema de arquivos (apenas se não usar PostgreSQL)
let db = null;
let saveDatabaseDebounced = null;

if (!usePostgreSQL) {
  console.log('⚠️ DATABASE_URL não configurado, usando fallback em memória');
  console.warn('🚨 ATENÇÃO: Fallback JSON é apenas para desenvolvimento!');
  console.warn('🚨 NUNCA use em produção com assinantes ativos!');
  console.warn('🚨 Configure DATABASE_URL para usar PostgreSQL em produção.');
  
  const persistence = await import('./db/persistence.js');
  db = persistence.loadDatabase();
  saveDatabaseDebounced = persistence.saveDatabaseDebounced;
  
  // Garantir que o usuário admin sempre existe
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
    console.log('💾 Salvando banco de dados antes de encerrar...');
    persistence.saveDatabase(db);
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('💾 Salvando banco de dados antes de encerrar...');
    persistence.saveDatabase(db);
    process.exit(0);
  });
} else {
  console.log('🗄️ Usando PostgreSQL como banco de dados');
  
  // Testar conexão e executar migração
  (async () => {
    try {
      const connected = await testConnection();
      if (connected) {
        await migrate();
        console.log('✅ Banco de dados PostgreSQL pronto!');
      } else {
        console.warn('⚠️ PostgreSQL não disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao configurar PostgreSQL:', error.message);
    }
  })();
}

// Tokens agora são gerenciados pelo tokenStorage (Redis ou banco)
// Mantido para compatibilidade durante migração
const activeTokens = {};
const passwordTokens = {};

// ✅ Função generatePasswordTokenForSubscriber movida para: backend/modules/auth/auth.service.js
// Importar quando necessário: import { generatePasswordTokenForSubscriber } from './modules/auth/auth.service.js';

// =======================
// 🔐 AUTH HELPERS
// =======================
const extractTokenFromRequest = req =>
  req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/api/health',
  '/api/upload-image',
  '/api/auth/login',
  '/api/auth/me',  // Permitir chamadas de verificação de auth
  '/api/auth/set-password',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/public/cardapio',  // /api/public/cardapio/:slug — link único do cardápio por assinante
  '/api/public/login-info', // /api/public/login-info/:slug — dados para página de login por estabelecimento
  '/api/public/chat',      // Chat do assistente (IA) — público para o cardápio
  '/api/public/assinar-config',   // Config da página de vendas (planos, preços, trial) para /assinar
  '/api/entities/PaymentConfig',  // Configurações de pagamento públicas para o cardápio
  '/api/entities/MenuItem',  // Itens do menu públicos para o cardápio
  '/api/entities/Category',  // Categorias públicas para o cardápio
  '/api/entities/Subscriber',  // Info do assinante pública para o cardápio
  '/api/functions/registerCustomer'  // Cadastro de clientes (público)
];

const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

const authenticate = async (req, res, next) => {
  // Rotas públicas não precisam de autenticação
  if (isPublicRoute(req.path)) {
    // Para rotas públicas, apenas passar adiante sem verificar token
    // O token pode ser verificado opcionalmente dentro da rota se necessário
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
        // Token inválido em rota pública - apenas ignorar
      }
    }
    return next();
  }

  const token = extractTokenFromRequest(req);
  
  // Se não tem token, usar usuário padrão (modo desenvolvimento)
  if (!token) {
    console.log('⚠️ [authenticate] Sem token:', { path: req.path, method: req.method });
    if (process.env.NODE_ENV !== 'production') {
      // Em desenvolvimento, permitir sem token
      if (usePostgreSQL) {
        req.user = await repo.getUserByEmail('admin@digimenu.com');
      } else if (db && db.users && db.users.length > 0) {
        req.user = db.users[0];
      } else {
        return res.status(401).json({ error: 'Usuário padrão não encontrado' });
      }
      console.log('✅ [authenticate] Usando usuário padrão (dev)');
      return next();
    }
    // Em produção, retornar erro se não tiver token
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  // Tentar validar JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ [authenticate] Token válido:', { email: decoded.email, id: decoded.id });
    
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
      return res.status(401).json({ error: 'Banco de dados não inicializado' });
    }
    
    if (!user) {
      console.log('❌ [authenticate] Usuário não encontrado:', decoded.email);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    req.user = user;
    console.log('✅ [authenticate] Usuário autenticado:', { email: user.email, is_master: user.is_master });
    return next();
  } catch (error) {
    // JWT inválido - tentar método alternativo (buscar em activeTokens)
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
        return res.status(401).json({ error: 'Banco de dados não inicializado' });
      }
      req.user = user;
      return next();
    }
    
    // Se não encontrou em activeTokens e está em desenvolvimento, usar padrão
    if (process.env.NODE_ENV !== 'production') {
      // Apenas logar em desenvolvimento
      console.warn('⚠️ JWT inválido, usando usuário padrão (dev mode)');
      if (usePostgreSQL) {
        req.user = await repo.getUserByEmail('admin@digimenu.com');
      } else if (db && db.users && db.users.length > 0) {
        req.user = db.users[0];
      } else {
        return res.status(401).json({ error: 'Usuário padrão não encontrado' });
      }
      return next();
    }
    
    // Em produção, retornar erro
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// =======================
// 🔐 GOOGLE OAUTH CONFIGURATION
// =======================
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  // Configurar estratégia Google OAuth
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${BACKEND_URL}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || profile.name?.givenName || 'Usuário';
      const googleId = profile.id;
      const photo = profile.photos?.[0]?.value;

      if (!email) {
        return done(new Error('Email não fornecido pelo Google'), null);
      }

      // Buscar ou criar usuário
      let user;
      const emailLower = email.toLowerCase();
      
      if (usePostgreSQL) {
        user = await repo.getUserByEmail(emailLower);
        
        if (!user) {
          // Criar novo usuário como cliente (role='customer')
          user = await repo.createUser({
            email: emailLower,
            full_name: name,
            role: 'customer', // Cliente por padrão quando faz login via Google
            is_master: false,
            subscriber_email: null,
            google_id: googleId,
            google_photo: photo
          });
          
          // Criar também registro na tabela customers
          try {
            await repo.createCustomer({
              email: emailLower,
              name: name,
              phone: null,
              address: null,
              complement: null,
              neighborhood: null,
              city: null,
              zipcode: null,
              subscriber_email: null,
              birth_date: null,
              cpf: null,
              password_hash: null
            }, null);
          } catch (customerError) {
            console.warn('⚠️ Erro ao criar customer via Google OAuth (não crítico):', customerError.message);
          }
        } else if (!user.google_id) {
          // Atualizar usuário existente com dados do Google
          user = await repo.updateUser(user.id, {
            google_id: googleId,
            google_photo: photo
          });
        }
      } else if (db && db.users) {
        user = db.users.find(u => (u.email || '').toLowerCase() === emailLower);
        
        if (!user) {
          // Criar novo usuário como cliente
          const newUser = {
            id: Date.now().toString(),
            email: emailLower,
            full_name: name,
            role: 'customer', // Cliente por padrão
            is_master: false,
            subscriber_email: null,
            google_id: googleId,
            google_photo: photo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(newUser);
          
          // Criar também registro na tabela customers
          if (db.customers) {
            const newCustomer = {
              id: String(Date.now() + 1),
              email: emailLower,
              name: name,
              phone: null,
              address: null,
              complement: null,
              neighborhood: null,
              city: null,
              zipcode: null,
              subscriber_email: null,
              birth_date: null,
              cpf: null,
              password_hash: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            db.customers.push(newCustomer);
          }
          
          if (saveDatabaseDebounced) {
            saveDatabaseDebounced(db);
          }
          user = newUser;
        } else if (!user.google_id) {
          // Atualizar usuário existente
          user.google_id = googleId;
          user.google_photo = photo;
          user.updated_at = new Date().toISOString();
          if (saveDatabaseDebounced) {
            saveDatabaseDebounced(db);
          }
        }
      }

      return done(null, user);
    } catch (error) {
      console.error('Erro ao processar login Google:', error);
      return done(error, null);
    }
  }));

  // Serializar usuário para sessão (não usado, mas necessário)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      let user;
      if (usePostgreSQL) {
        user = await repo.getUserById(id);
      } else if (db && db.users) {
        user = db.users.find(u => u.id === id);
      }
      done(null, user || null);
    } catch (error) {
      done(error, null);
    }
  });

  // Rota para iniciar autenticação Google
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  // Callback do Google OAuth
  app.get('/api/auth/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed` }),
    async (req, res) => {
      try {
        const user = req.user;

        if (!user) {
          return res.redirect(`${FRONTEND_URL}/login?error=user_not_found`);
        }

        // Gerar token JWT
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

        // Armazenar token ativo
        activeTokens[token] = user.email;

        // Redirecionar para frontend com token
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.full_name || '')}`);
      } catch (error) {
        console.error('Erro no callback Google:', error);
        res.redirect(`${FRONTEND_URL}/login?error=callback_error`);
      }
    }
  );

  const callbackUrl = `${BACKEND_URL}/api/auth/google/callback`;
  console.log('✅ Google OAuth configurado');
  console.log('🔗 URL de Callback:', callbackUrl);
  console.log('📋 IMPORTANTE: Adicione esta URL exata no Google Cloud Console:');
  console.log('   → URIs de redirecionamento autorizados:', callbackUrl);
} else {
  console.log('⚠️ Google OAuth não configurado (GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não definidos)');
}

// =======================
// 🔐 AUTHENTICATION MODULE
// =======================
// Inicializar controller com referências globais
authController.initializeAuthController(db, saveDatabaseDebounced);

// Registrar rotas do módulo de autenticação
app.use('/api/auth', authRoutes);

// =======================
// 🖼️ IMAGE UPLOAD (registrada cedo para evitar 404 em produção)
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
          console.error('❌ Cloudinary error:', error.message);
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
    console.error('❌ Erro no upload:', error);
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error.message
    });
  }
});

// Rota de contexto do usuário (separada)
app.get('/api/user/context', authenticate, getUserContext);

// =======================
// 👥 USERS MODULE
// =======================
// Inicializar controller com referências globais
usersController.initializeUsersController(db, saveDatabaseDebounced);

// Registrar rotas do módulo de usuários
app.use('/api/users', usersRoutes);
// Nota: Rotas de colaboradores estão em /api/users/colaboradores
// Para compatibilidade com frontend, pode ser necessário adicionar redirect ou alias futuro

// =======================
// 🔍 ROTAS DE DEBUG (ANTES das outras para evitar 404)
// =======================
// Diagnóstico rápido - Apenas conta assinantes (SEM AUTH para debug)
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
    console.log('🔍 [debug/list-subscribers-direct] Iniciando teste direto...');
    const startTime = Date.now();
    
    const result = await repo.listSubscribers({ page: 1, limit: 50 });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ [debug/list-subscribers-direct] Completou em ${elapsed}ms`);
    
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
    console.error('❌ [debug/list-subscribers-direct] Erro:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
}));

// Debug: Listar pratos diretamente (sem filtros de usuário)
app.get('/api/debug/list-dishes-direct', asyncHandler(async (req, res) => {
  try {
    console.log('🔍 [debug/list-dishes-direct] Iniciando teste direto...');
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
    console.log(`✅ [debug/list-dishes-direct] Completou em ${elapsed}ms`);
    
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
    console.error('❌ [debug/list-dishes-direct] Erro:', error);
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
    console.log('🔍 [debug/test-list-dishes] Testando listEntities...', { as_subscriber });
    const startTime = Date.now();
    
    // Simular usuário master
    const mockUser = {
      email: 'master@system.com',
      is_master: true,
      _contextForSubscriber: as_subscriber || null
    };
    
    // Chamar listEntities como a rota faz
    const result = await repo.listEntities('Dish', {}, 'order', mockUser);
    const items = result.items || result || [];
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ [debug/test-list-dishes] Completou em ${elapsed}ms`);
    
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
    console.error('❌ [debug/test-list-dishes] Erro:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
}));

// Diagnóstico: qual usuário está associado ao token (apenas dev ou DEBUG_ME_ENABLED)
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
// 🏪 ESTABLISHMENTS MODULE
// =======================
// Registrar rotas do módulo de estabelecimentos (incluindo GET /subscribers com requireMaster)
app.use('/api/establishments', establishmentsRoutes);
// Alias para compatibilidade
app.use('/api/subscribers', establishmentsRoutes);

// =======================
// 📦 ENTITIES + MANAGERIAL-AUTH (registrar antes de menus/orders para evitar 404)
// =======================
function getManagerialSubscriberAndRole(req) {
  const owner = (req.body?.as_subscriber || req.query?.as_subscriber || req.user?._contextForSubscriber || req.user?.subscriber_email || req.user?.email || '').toString().toLowerCase().trim();
  const isGerente = isRequesterGerente(req);
  const role = req.user?.is_master ? null : (isGerente ? 'gerente' : 'assinante');
  return { owner, role };
}
const entitiesAndManagerialRouter = express.Router();
entitiesAndManagerialRouter.get('/managerial-auth', authenticate, asyncHandler(async (req, res) => {
  if (!usePostgreSQL || !repo.getManagerialAuthorization) {
    return res.status(503).json({ error: 'Autorização gerencial requer PostgreSQL' });
  }
  const { owner, role } = getManagerialSubscriberAndRole(req);
  if (!owner) return res.status(400).json({ error: 'Contexto do estabelecimento necessário' });
  const isOwner = (req.user?.is_master && owner) || (!req.user?.is_master && (req.user?.email || '').toLowerCase().trim() === owner);
  if (!isOwner) {
    const authGerente = await repo.getManagerialAuthorization(owner, 'gerente');
    return res.json({
      assinante: null,
      gerente: authGerente ? { configured: true, expires_at: authGerente.expires_at } : { configured: false },
    });
  }
  const [authAssinante, authGerente] = await Promise.all([
    repo.getManagerialAuthorization(owner, 'assinante'),
    repo.getManagerialAuthorization(owner, 'gerente'),
  ]);
  return res.json({
    assinante: authAssinante ? { configured: true, matricula: authAssinante.matricula, expires_at: authAssinante.expires_at } : { configured: false },
    gerente: authGerente ? { configured: true, matricula: authGerente.matricula, expires_at: authGerente.expires_at } : { configured: false },
  });
}));
entitiesAndManagerialRouter.post('/managerial-auth', authenticate, asyncHandler(async (req, res) => {
  if (!usePostgreSQL || !repo.setManagerialAuthorization) {
    return res.status(503).json({ error: 'Autorização gerencial requer PostgreSQL' });
  }
  const { owner, role } = getManagerialSubscriberAndRole(req);
  if (!owner) return res.status(400).json({ error: 'Contexto do estabelecimento necessário' });
  const isOwner = (req.user?.is_master && owner) || (!req.user?.is_master && (req.user?.email || '').toLowerCase().trim() === owner);
  if (!isOwner) return res.status(403).json({ error: 'Apenas o dono do estabelecimento pode criar ou alterar autorizações.' });
  const { role: bodyRole, matricula, password, expirable, expires_at } = req.body || {};
  const targetRole = bodyRole === 'gerente' ? 'gerente' : 'assinante';
  if (!matricula || !password || String(password).length < 6) {
    return res.status(400).json({ error: 'Matrícula e senha (mín. 6 caracteres) são obrigatórios.' });
  }
  const expiresAt = expirable && expires_at ? new Date(expires_at) : null;
  const passwordHash = await bcrypt.hash(String(password), 10);
  await repo.setManagerialAuthorization(owner, targetRole, {
    matricula: String(matricula).trim(),
    passwordHash,
    expiresAt: expiresAt || null,
  });
  const updated = await repo.getManagerialAuthorization(owner, targetRole);
  return res.json({
    success: true,
    role: targetRole,
    configured: true,
    expires_at: updated?.expires_at ?? null,
  });
}));
entitiesAndManagerialRouter.post('/managerial-auth/validate', authenticate, asyncHandler(async (req, res) => {
  if (!usePostgreSQL || !repo.validateManagerialAuthorization) {
    return res.status(503).json({ error: 'Autorização gerencial requer PostgreSQL' });
  }
  const { owner, role } = getManagerialSubscriberAndRole(req);
  if (!owner || !role) return res.status(400).json({ error: 'Acesso não permitido para este perfil.' });
  const { matricula, password } = req.body || {};
  if (!matricula || !password) {
    return res.status(400).json({ error: 'Matrícula e senha são obrigatórios.' });
  }
  const valid = await repo.validateManagerialAuthorization(owner, role, matricula, password);
  return res.json({ valid: !!valid });
}));
// Listar entidades (evitar 404 em produção quando rotas são testadas antes de menus/orders)
entitiesAndManagerialRouter.get('/entities/:entity', authenticate, asyncHandler(async (req, res) => {
  try {
    const { entity } = req.params;
    const { order_by, as_subscriber, page, limit, ...filters } = req.query;
    if (req.user?.is_master && as_subscriber) req.user._contextForSubscriber = as_subscriber;
    if (req.user && !req.user?.is_master && as_subscriber) {
      const uEmail = (req.user.email || '').toLowerCase().trim();
      const uSub = (req.user.subscriber_email || '').toLowerCase().trim();
      const subParam = (as_subscriber || '').toLowerCase().trim();
      if (subParam && (subParam === uEmail || subParam === uSub)) {
        req.user._contextForSubscriber = as_subscriber;
      }
    }
    const pagination = { page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 };
    let result;
    if (usePostgreSQL) {
      if (req.user && !req.user?.is_master && !filters.owner_email) {
        const subscriber = await repo.getSubscriberByEmail(req.user._contextForSubscriber || req.user.subscriber_email || req.user.email);
        if (subscriber) filters.owner_email = subscriber.email;
      }
      result = await repo.listEntities(entity, filters, order_by, req.user || null, pagination);
    } else if (db && db.entities) {
      let items = db.entities[entity] || [];
      if (req.user?.is_master && as_subscriber) items = items.filter(item => item.owner_email === as_subscriber);
      else if (req.user?.is_master || !req.user) items = items.filter(item => !item.owner_email);
      else {
        const subscriber = db.subscribers?.find(s => s.email === req.user.email);
        items = subscriber ? items.filter(item => !item.owner_email || item.owner_email === subscriber.email) : [];
      }
      if (Object.keys(filters).length > 0) {
        items = items.filter(item => Object.entries(filters).every(([key, value]) =>
          (value === 'null' || value === null) ? (item[key] === null || item[key] === undefined) : item[key] == value
        ));
      }
      if (order_by) {
        const desc = order_by.startsWith('-');
        const field = desc ? order_by.replace(/^-/, '') : order_by;
        const getVal = (item) => {
          const v = item[field] ?? item.created_at ?? item.created_date;
          return v ? new Date(v).getTime() : 0;
        };
        items.sort((a, b) => {
          const aVal = getVal(a);
          const bVal = getVal(b);
          if (aVal < bVal) return desc ? 1 : -1;
          if (aVal > bVal) return desc ? -1 : 1;
          return 0;
        });
      }
      const total = items.length;
      const start = (pagination.page - 1) * pagination.limit;
      const totalPages = Math.ceil(total / pagination.limit);
      result = {
        items: items.slice(start, start + pagination.limit),
        pagination: { page: pagination.page, limit: pagination.limit, total, totalPages, hasNext: pagination.page < totalPages, hasPrev: pagination.page > 1 }
      };
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar entidades:', sanitizeForLog({ error: error.message }));
    throw error;
  }
}));
entitiesAndManagerialRouter.get('/entities/:entity/:id', authenticate, async (req, res) => {
  try {
    const { entity, id } = req.params;
    const asSub = req.query.as_subscriber;
    if (req.user?.is_master && asSub) req.user._contextForSubscriber = asSub;
    let item;
    if (usePostgreSQL) item = await repo.getEntityById(entity, id, req.user);
    else if (db?.entities?.[entity]) {
      const arr = db.entities[entity];
      item = arr.find(i => (i.id === id || i.id === String(id)) && (!asSub || i.owner_email === asSub)) || null;
    } else item = null;
    if (!item) return res.status(404).json({ error: 'Entidade não encontrada' });
    res.json(item);
  } catch (error) {
    console.error('Erro ao obter entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});
// Colaboradores (evitar 404 em produção - front espera /api/colaboradores)
entitiesAndManagerialRouter.get('/colaboradores', authenticate, usersController.listColaboradores);
entitiesAndManagerialRouter.post('/colaboradores', authenticate, validate(schemas.createColaborador), createLimiter, usersController.createColaborador);
entitiesAndManagerialRouter.post('/colaboradores/:email/add-roles', authenticate, usersController.addRolesToColaborador);
entitiesAndManagerialRouter.patch('/colaboradores/:id', authenticate, usersController.updateColaborador);
entitiesAndManagerialRouter.delete('/colaboradores/:id', authenticate, usersController.deleteColaborador);
entitiesAndManagerialRouter.patch('/colaboradores/:id/toggle-active', authenticate, usersController.toggleActiveColaborador);

// Entities CRUD - must run BEFORE entitiesAndManagerialRouter (which returns 404 for unmatched methods)
app.post('/api/entities/:entity', authenticate, createLimiter, asyncHandler(async (req, res) => {
  const { entity } = req.params;
  let data = { ...req.body };
  const asSub = data.as_subscriber || req.query.as_subscriber;
  let createOpts = {};
  if (req.user?.is_master && asSub) {
    req.user._contextForSubscriber = asSub;
    delete data.as_subscriber;
    data.owner_email = asSub;
    createOpts.forSubscriberEmail = asSub;
  }
  if (!req.user?.is_master) {
    const subEmail = req.user?.subscriber_email || req.user?.email;
    const subscriber = usePostgreSQL ? await repo.getSubscriberByEmail(subEmail) : db?.subscribers?.find(s => (s.email || '').toLowerCase() === (subEmail || '').toLowerCase());
    if (subscriber) {
      if (!data.owner_email) data.owner_email = subscriber.email;
      createOpts.forSubscriberEmail = subscriber.email;
    }
  }
  if (data.owner_email && !createOpts.forSubscriberEmail) {
    const ownerSub = usePostgreSQL ? await repo.getSubscriberByEmail(data.owner_email) : db?.subscribers?.find(s => (s.email || '').toLowerCase() === (data.owner_email || '').toLowerCase());
    if (ownerSub) createOpts.forSubscriberEmail = data.owner_email;
    else if (String(entity).toLowerCase() === 'order') return res.status(400).json({ error: 'owner_email não é um assinante válido. Pedido do cardápio por link precisa do dono do cardápio.' });
  }
  if (String(entity).toLowerCase() === 'dish' && !req.user?.is_master) {
    const subscriberEmail = createOpts.forSubscriberEmail || data.owner_email || (req.user?.subscriber_email || req.user?.email);
    if (subscriberEmail) {
      const { validateProductsLimit } = await import('./services/planValidation.service.js');
      const productLimit = await validateProductsLimit(subscriberEmail, null, req.user?.is_master);
      if (!productLimit.valid) return res.status(403).json({ error: productLimit.error || `Limite de produtos excedido.`, code: 'PRODUCT_LIMIT_EXCEEDED', limit: productLimit.limit, current: productLimit.current });
    }
  }
  if (String(entity).toLowerCase() === 'order' && !req.user?.is_master) {
    const subscriberEmail = createOpts.forSubscriberEmail || data.owner_email || (req.user?.subscriber_email || req.user?.email);
    if (subscriberEmail) {
      const { validateOrdersPerDayLimit } = await import('./services/planValidation.service.js');
      const orderLimit = await validateOrdersPerDayLimit(subscriberEmail, req.user?.is_master);
      if (!orderLimit.valid) return res.status(403).json({ error: orderLimit.error || `Limite de pedidos por dia excedido.`, code: 'ORDER_LIMIT_EXCEEDED', limit: orderLimit.limit, current: orderLimit.current });
    }
  }
  if (String(entity) === 'Comanda' && !(data.code && String(data.code).trim())) {
    const owner = createOpts.forSubscriberEmail || data.owner_email || null;
    data.code = (usePostgreSQL && repo.getNextComandaCode) ? await repo.getNextComandaCode(owner) : 'C-001';
  }
  let newItem;
  if (usePostgreSQL) {
    newItem = await repo.createEntity(entity, data, req.user, createOpts);
  } else if (db && db.entities) {
    if (!db.entities[entity]) db.entities[entity] = [];
    const now = new Date().toISOString();
    newItem = { id: String(Date.now()), ...data, created_at: now, created_date: now, updated_at: now };
    db.entities[entity].push(newItem);
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
  } else return res.status(500).json({ error: 'Banco de dados não inicializado' });
  if (String(entity).toLowerCase() === 'order') emitOrderCreated(newItem);
  else if (String(entity).toLowerCase() === 'comanda') emitComandaCreated(newItem);
  console.log(`✅ [${entity}] Item criado:`, newItem.id);
  res.status(201).json(newItem);
}));
app.put('/api/entities/:entity/:id', authenticate, asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  let data = req.body;
  const asSub = req.query.as_subscriber;
  if (req.user?.is_master && asSub) req.user._contextForSubscriber = asSub;
  if (String(entity).toLowerCase() === 'subscriber') {
    const idVal = /^\d+$/.test(String(id)) ? parseInt(id, 10) : id;
    const updated = usePostgreSQL ? await repo.updateSubscriber(idVal, data) : (() => { const idx = db?.subscribers?.findIndex(s => s.id == idVal); if (idx < 0) throw new Error('Assinante não encontrado'); const e = db.subscribers[idx]; const m = { ...e, ...data, send_whatsapp_commands: data.send_whatsapp_commands ?? e.whatsapp_auto_enabled }; db.subscribers[idx] = m; if (saveDatabaseDebounced) saveDatabaseDebounced(db); return { ...m, send_whatsapp_commands: m.whatsapp_auto_enabled }; })();
    return res.json(updated);
  }
  if (String(entity).toLowerCase() === 'order' && data.status) {
    // Verificar permissão: master, admin, gestor_pedidos ou dono do estabelecimento (assinante)
    if (!req.user?.is_master) {
      const allowedRoles = ['admin', 'gestor_pedidos'];
      const userRole = req.user?.profile_role || req.user?.role;
      const asSub = (req.query?.as_subscriber || '').toString().trim().toLowerCase();
      const userEmail = (req.user?.email || '').toString().trim().toLowerCase();
      const subEmail = (req.user?.subscriber_email || '').toString().trim().toLowerCase();
      const isOwner = asSub && (userEmail === asSub || subEmail === asSub);
      if (!allowedRoles.includes(userRole) && !isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Sem permissão para alterar status do pedido. Apenas administradores e gestores de pedidos podem alterar o status.',
          message: 'Sem permissão para alterar status do pedido. Apenas administradores e gestores de pedidos podem alterar o status.',
          code: 'PERMISSION_DENIED'
        });
      }
    }
    const currentOrder = usePostgreSQL ? await repo.getEntityById('Order', id, req.user) : db?.entities?.Order?.find(i => i.id === id || i.id === String(id));
    if (currentOrder?.status) {
      const { validateStatusTransition } = await import('./services/orderStatusValidation.service.js');
      const v = validateStatusTransition(currentOrder.status, data.status, { isMaster: req.user?.is_master, userRole: req.user?.profile_role || req.user?.role });
      if (!v.valid) return res.status(400).json({ success: false, error: v.message, message: v.message, code: 'INVALID_STATUS_TRANSITION' });
    }
  }
  let updatedItem;
  if (usePostgreSQL) {
    updatedItem = await repo.updateEntity(entity, id, data, req.user);
    if (!updatedItem) return res.status(404).json({ error: 'Entidade não encontrada' });
  } else if (db?.entities) {
    const items = db.entities[entity] || [];
    const idx = items.findIndex(i => (i.id === id || i.id === String(id)) && (!asSub || i.owner_email === asSub));
    if (idx === -1) return res.status(404).json({ error: 'Entidade não encontrada' });
    updatedItem = { ...items[idx], ...data, id: items[idx].id, updated_at: new Date().toISOString() };
    items[idx] = updatedItem;
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
  } else return res.status(500).json({ error: 'Banco de dados não inicializado' });
  if (String(entity).toLowerCase() === 'order') emitOrderUpdate(updatedItem);
  else if (String(entity).toLowerCase() === 'comanda') emitComandaUpdate(updatedItem);
  else if (String(entity).toLowerCase() === 'table') emitTableUpdate(updatedItem);
  console.log(`✅ [${entity}] Item atualizado:`, id);
  res.json(updatedItem);
}));
app.delete('/api/entities/:entity/:id', authenticate, asyncHandler(async (req, res) => {
  const { entity, id } = req.params;
  const asSub = req.query.as_subscriber;
  if (req.user?.is_master && asSub) req.user._contextForSubscriber = asSub;
  let deleted = false;
  if (usePostgreSQL) deleted = await repo.deleteEntity(entity, id, req.user);
  else if (db?.entities) {
    const items = db.entities[entity] || [];
    const idx = items.findIndex(i => (i.id === id || i.id === String(id)) && (!asSub || i.owner_email === asSub));
    if (idx === -1) return res.status(404).json({ error: 'Entidade não encontrada' });
    items.splice(idx, 1);
    deleted = true;
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
  } else return res.status(500).json({ error: 'Banco de dados não inicializado' });
  if (!deleted) return res.status(404).json({ error: 'Entidade não encontrada' });
  console.log(`✅ [${entity}] Item deletado:`, id);
  res.json({ success: true });
}));
app.post('/api/entities/:entity/bulk', authenticate, createLimiter, asyncHandler(async (req, res) => {
  const { entity } = req.params;
  const { items: itemsToCreate } = req.body || {};
  let newItems;
  if (usePostgreSQL) newItems = await repo.createEntitiesBulk(entity, itemsToCreate, req.user);
  else if (db?.entities) {
    if (!db.entities[entity]) db.entities[entity] = [];
    newItems = (itemsToCreate || []).map(d => ({ id: String(Date.now()) + Math.random().toString(36).substr(2, 9), ...d, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    db.entities[entity].push(...newItems);
    if (saveDatabaseDebounced) saveDatabaseDebounced(db);
  } else return res.status(500).json({ error: 'Banco de dados não inicializado' });
  console.log(`✅ [${entity}] ${newItems?.length || 0} itens criados`);
  res.status(201).json(newItems || []);
}));

// =======================
// 🔧 FUNCTIONS - Rotas específicas ANTES dos routers (evitar 404)
// =======================
// updateSubscriber via /api/functions/updateSubscriber
app.post('/api/functions/updateSubscriber', authenticate, async (req, res) => {
  try {
    console.log('🔧 [updateSubscriber] Chamado por:', req.user?.email, 'is_master:', req.user?.is_master);
    
    if (!req.user?.is_master) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id, data: updateData, originalData } = req.body || {};
    console.log('🔧 [updateSubscriber] ID:', id, 'tem data:', !!updateData);
    
    if (!id) {
      return res.status(400).json({ error: 'id é obrigatório' });
    }
    
    req.params = { ...req.params, id: String(id) };
    req.body = updateData || req.body || {};
    
    await establishmentsController.updateSubscriber(req, res, () => {});
  } catch (error) {
    console.error('❌ [updateSubscriber] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// createSubscriber via /api/functions/createSubscriber
app.post('/api/functions/createSubscriber', authenticate, async (req, res) => {
  try {
    if (!req.user?.is_master) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    await establishmentsController.createSubscriber(req, res, () => {});
  } catch (error) {
    console.error('❌ [createSubscriber] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// getSubscribers via /api/functions/getSubscribers
app.post('/api/functions/getSubscribers', authenticate, async (req, res) => {
  try {
    if (!req.user?.is_master) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    await establishmentsController.listSubscribers(req, res, () => {});
  } catch (error) {
    console.error('❌ [getSubscribers] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// getFullSubscriberProfile: rota explícita para evitar 404 quando /api é montado antes do handler genérico
app.post('/api/functions/getFullSubscriberProfile', authenticate, async (req, res) => {
  if (!req.user?.is_master) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { subscriber_email } = req.body || {};
  if (!subscriber_email) {
    return res.status(400).json({ error: 'subscriber_email é obrigatório' });
  }
  try {
    const subscriber = usePostgreSQL
      ? await repo.getSubscriberByEmail(subscriber_email)
      : (db && db.subscribers ? db.subscribers.find(s => s.email?.toLowerCase() === subscriber_email?.toLowerCase()) : null);
    if (!subscriber) {
      return res.status(404).json({ error: 'Assinante não encontrado' });
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
    console.error('❌ [getFullSubscriberProfile] Erro:', error);
    return res.status(500).json({ error: 'Erro ao buscar perfil do assinante', details: error.message });
  }
});

// generatePasswordTokenForSubscriber: rota explícita para evitar 404 (Resetar Senha em Assinantes)
app.post('/api/functions/generatePasswordTokenForSubscriber', authenticate, async (req, res) => {
  if (!req.user?.is_master) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { subscriber_id, email } = req.body || {};
  if (!subscriber_id && !email) {
    return res.status(400).json({ error: 'subscriber_id ou email é obrigatório' });
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
      return res.status(404).json({ error: 'Assinante não encontrado' });
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
    console.error('❌ [generatePasswordTokenForSubscriber] Erro:', error);
    return res.status(500).json({ error: 'Erro ao gerar token de senha', details: error.message });
  }
});

app.use('/api', entitiesAndManagerialRouter);

// =======================
// 📋 MENUS MODULE
// =======================
// Registrar rotas do módulo de menus
app.use('/api', menusRoutes);

// =======================
// 🛒 ORDERS MODULE
// =======================
// Registrar rotas do módulo de pedidos
app.use('/api', ordersRoutes);

// =======================
// 🔐 AUTHENTICATION (LEGADO - REMOVIDO)
// =======================
// ✅ Código migrado para: backend/modules/auth/
// Rotas registradas em: app.use('/api/auth', authRoutes);
/*
app.post('/api/auth/login', validate(schemas.login), asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 [login] Tentativa de login para:', email?.toLowerCase());

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco (prioriza linha de colaborador quando mesmo email tem 2 registros)
    const emailLower = email.toLowerCase().trim();
    console.log('🔍 [login] Buscando usuário com email:', emailLower);
    
    let user;
    if (usePostgreSQL) {
      user = await repo.getLoginUserByEmail(emailLower);
      if (!user) {
        console.log('⚠️ [login] Usuário não encontrado com email normalizado. Tentando busca alternativa...');
        try {
          const { query } = await import('./db/postgres.js');
          const result = await query(
            `SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR email ILIKE $2
             ORDER BY (CASE WHEN profile_role IS NOT NULL AND profile_role != '' THEN 0 ELSE 1 END), id LIMIT 1`,
            [emailLower, `%${emailLower}%`]
          );
          if (result.rows.length > 0) {
            user = result.rows[0];
            console.log('✅ [login] Usuário encontrado com busca alternativa:', user.email);
          }
        } catch (err) {
          console.error('❌ [login] Erro na busca alternativa:', err.message);
        }
      }
    } else if (db && db.users) {
      // Buscar com diferentes variações do email
      user = db.users.find(u => {
        const userEmail = (u.email || '').toLowerCase().trim();
        return userEmail === emailLower;
      });
      
      if (!user) {
        console.log('🔍 [login] Usuário não encontrado. Emails disponíveis no banco:');
        db.users.forEach((u, idx) => {
          console.log(`  [${idx}] Email: "${u.email}" (normalizado: "${(u.email || '').toLowerCase().trim()}")`);
        });
      }
    } else {
      return res.status(401).json({ error: 'Banco de dados não inicializado' });
    }

    if (!user) {
      console.log('❌ [login] Usuário não encontrado:', emailLower);
      // Se for assinante (existe em subscribers mas não em users), orientar a definir senha
      if (usePostgreSQL) {
        const subscriber = await repo.getSubscriberByEmail(emailLower);
        if (subscriber) {
          return res.status(401).json({
            error: 'Conta encontrada, mas ainda não há senha definida. Use o link "Definir senha" enviado ao seu e-mail ou clique em "Esqueci minha senha" para solicitar um novo.',
            code: 'PASSWORD_NOT_SET'
          });
        }
      }
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    console.log('✅ [login] Usuário encontrado:', {
      id: user.id,
      email: user.email,
      is_master: user.is_master,
      profile_role: user.profile_role,
      subscriber_email: user.subscriber_email,
      role: user.role
    });
    
    console.log('✅ [login] Usuário encontrado:', {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      hasPasswordHash: !!user.password && user.password.startsWith('$2')
    });

    // ✅ Verificar se colaborador está ativo (se tiver profile_role e se a coluna active existir)
    if (user.profile_role && user.active !== undefined && user.active === false) {
      console.log('❌ [login] Colaborador desativado:', user.email);
      return res.status(403).json({ error: 'Seu acesso foi desativado. Entre em contato com o administrador.' });
    }

    // ✅ SEMPRE usar bcrypt para verificar senhas
    if (user.password) {
      try {
        // Tentar comparar com bcrypt primeiro
        console.log('🔐 [login] Verificando senha para:', user.email);
        // Garantir que a senha não tenha espaços extras
        const passwordClean = (password || '').trim();
        const isValid = await bcrypt.compare(passwordClean, user.password);
        
        if (isValid) {
          console.log('✅ [login] Senha válida! Login bem-sucedido para:', user.email);
          
          // Verificar se é assinante e garantir acesso automático aos perfis do plano
          let subscriber = null;
          const subscriberEmail = user.subscriber_email || user.email;
          if (usePostgreSQL) {
            subscriber = await repo.getSubscriberByEmail(subscriberEmail);
          } else if (db?.subscribers) {
            subscriber = db.subscribers.find(s => (s.email || '').toLowerCase().trim() === subscriberEmail.toLowerCase().trim());
          }
          
          // Se for assinante e não for colaborador, garantir acesso automático aos perfis do plano
          if (subscriber && !user.profile_role && !user.is_master) {
            const { getPlanPermissions } = await import('./utils/plans.js');
            const planPerms = getPlanPermissions(subscriber.plan || 'basic');
            
            // Verificar quais perfis o plano permite
            const allowedRoles = [];
            if (planPerms.delivery_app || planPerms.team_management) allowedRoles.push('entregador');
            if (planPerms.kitchen_display) allowedRoles.push('cozinha');
            if (planPerms.pdv) allowedRoles.push('pdv');
            if (planPerms.waiter_app) allowedRoles.push('garcom');
            
            // Criar registros de colaborador para os perfis permitidos se não existirem
            if (allowedRoles.length > 0) {
              for (const role of allowedRoles) {
                // Verificar se já existe colaborador com este email e perfil
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
                  console.warn('⚠️ [login] Erro ao listar colaboradores (não crítico):', listError.message);
                  // Continuar sem verificar colaboradores existentes
                  existingColab = null;
                }
                
                // Se não existe, criar (só se ainda não houver usuário com este email — evita duplicate key)
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
        
        // Se não passou, senha está incorreta
        console.log('❌ [login] Senha incorreta para:', user.email);
        console.log('🔍 [login] Detalhes da verificação:', {
          email: user.email,
          passwordProvided: password ? 'SIM' : 'NÃO',
          passwordLength: password ? password.length : 0,
          passwordHashInDB: user.password ? 'SIM' : 'NÃO',
          hashLength: user.password ? user.password.length : 0,
          hashStartsWith$2: user.password ? user.password.startsWith('$2') : false,
          hashFirstChars: user.password ? user.password.substring(0, 20) : 'N/A',
          passwordFirstChars: password ? password.substring(0, 5) + '...' : 'N/A'
        });
        
        // Tentar verificar se há problema com espaços ou caracteres especiais
        const passwordTrimmed = password ? password.trim() : '';
        if (passwordTrimmed !== password) {
          console.log('⚠️ [login] Senha contém espaços no início/fim, tentando com trim...');
          try {
            const isValidTrimmed = await bcrypt.compare(passwordTrimmed, user.password);
            if (isValidTrimmed) {
              console.log('✅ [login] Senha válida após trim!');
              // Continuar com o login normalmente
              // (o código abaixo já vai fazer isso)
            }
          } catch (e) {
            console.warn('⚠️ [login] Erro ao verificar senha com trim:', e.message);
          }
        }
      } catch (bcryptError) {
        // Se bcrypt falhar, pode ser senha antiga sem hash
        // Neste caso, hash a senha antiga e atualize no banco
        console.warn('⚠️ [login] Erro ao comparar com bcrypt:', bcryptError.message);
        console.warn('⚠️ [login] Tentando verificar se senha está em texto plano...');
        
        // Verificar se a senha antiga (texto plano) corresponde
        if (user.password === password) {
          console.log('✅ [login] Senha em texto plano corresponde. Convertendo para hash...');
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
            console.log('✅ [login] Senha atualizada e login bem-sucedido');
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
        
        console.error('❌ [login] Erro ao comparar senha:', bcryptError);
      }
    } else {
      // Usuário sem senha - apenas para admin padrão em desenvolvimento
      const emailMatch = (user.email || '').toLowerCase() === 'admin@digimenu.com';
      if (emailMatch && password === 'admin123' && process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ [login] Acesso de recuperação (admin sem senha). Altere a senha no Admin.');
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
      console.log('❌ [login] Usuário sem senha:', user.email);
    }

    return res.status(401).json({ error: 'Credenciais inválidas' });
  } catch (error) {
    console.error('❌ [login] Erro no login:', sanitizeForLog({ error: error.message }));
    throw error; // Deixar errorHandler tratar
  }
}));

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
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
    // Assinante (dono): tem acesso total ao painel colaborador — marcar is_owner quando email está em subscribers
    if (!req.user.is_master && req.user.email) {
      try {
        const sub = usePostgreSQL ? await repo.getSubscriberByEmail(req.user.email) : (db?.subscribers?.find(s => (s.email || '').toLowerCase().trim() === (req.user.email || '').toLowerCase().trim()) || null);
        if (sub) payload.is_owner = true;
      } catch (_) {}
    }
    return res.json(payload);
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// ✅ NOVO: Endpoint que retorna contexto completo do usuário (menuContext + permissions)
app.get('/api/user/context', authenticate, asyncHandler(async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const user = req.user;
    let subscriber = null;
    let permissions = {};
    let menuContext = null;

    // Se for master, criar contexto com slug
    if (user.is_master === true) {
      menuContext = {
        type: 'slug',
        value: user.slug || null
      };
      permissions = {}; // Master tem todas as permissões (vazio = acesso total)
    } else {
      const emailToFind = (user.subscriber_email || user.email || '').toString().toLowerCase().trim();
      if (usePostgreSQL) {
        if (emailToFind) {
          subscriber = await repo.getSubscriberByEmail(emailToFind);
          if (subscriber && !user.subscriber_email && user.email && (user.email || '').toLowerCase().trim() === emailToFind) {
            try {
              await repo.updateUser(user.id, { subscriber_email: subscriber.email });
              user.subscriber_email = subscriber.email;
            } catch (e) {
              console.warn('⚠️ [user/context] Não foi possível sincronizar subscriber_email:', e?.message);
            }
          }
        }
      } else if (db && db.subscribers && emailToFind) {
        subscriber = db.subscribers.find(s => (s.email || '').toLowerCase() === emailToFind);
      }

      if (subscriber) {
        menuContext = {
          type: 'subscriber',
          value: subscriber.email
        };
        let raw = subscriber.permissions;
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch (e) {
            raw = {};
          }
        }
        permissions = (raw && typeof raw === 'object') ? raw : {};
        if (subscriber.plan === 'basic' && Array.isArray(permissions.dishes) && permissions.dishes?.includes('view') && !permissions.dishes?.includes('create')) {
          permissions = { ...permissions, dishes: ['view', 'create', 'update', 'delete'] };
        }
        if (['basic', 'pro'].includes(subscriber.plan) && (!Array.isArray(permissions.store) || permissions.store.length === 0)) {
          permissions = { ...permissions, store: ['view', 'update'] };
        }
      } else {
        // ✅ DEBUG: Log quando subscriber não é encontrado
        console.log('⚠️ [user/context] Subscriber não encontrado para:', user.subscriber_email || user.email);
        // Fallback: usar email do usuário
        menuContext = {
          type: 'subscriber',
          value: user.email
        };
      }
    }

    // Colaborador: incluir profile_role e profile_roles para o frontend (ex.: Painel do Gerente)
    let profileRoles = [];
    if (user.profile_role) profileRoles = [String(user.profile_role).toLowerCase().trim()];
    if (Array.isArray(user.profile_roles) && user.profile_roles.length) profileRoles = [...new Set(user.profile_roles.map(r => String(r).toLowerCase().trim()))];

    // Assinante (dono): is_owner = true quando email está em subscribers
    const isOwner = !user.is_master && subscriber && (subscriber.email || '').toLowerCase().trim() === (user.email || '').toLowerCase().trim();

    let subscriberDataPayload = null;
    if (!user.is_master && subscriber) {
      let p = subscriber.permissions;
      if (typeof p === 'string') {
        try { p = JSON.parse(p); } catch (e) { p = {}; }
      }
      let usage = null;
      try {
        const { getUsageForSubscriber } = await import('./services/planValidation.service.js');
        usage = await getUsageForSubscriber(subscriber.email);
      } catch (e) {
        // ignore
      }
      let addons = subscriber.addons;
      if (typeof addons === 'string') {
        try {
          addons = JSON.parse(addons);
        } catch (e) {
          addons = {};
        }
      }
      if (!addons || typeof addons !== 'object') addons = {};
      let effectiveLimits = null;
      try {
        const { getEffectiveLimitsForSubscriber } = await import('./services/planValidation.service.js');
        effectiveLimits = getEffectiveLimitsForSubscriber({ ...subscriber, addons });
      } catch (e) {
        // ignore
      }
      subscriberDataPayload = {
        email: subscriber.email,
        plan: subscriber.plan || 'basic',
        status: subscriber.status || 'active',
        expires_at: subscriber.expires_at || null,
        permissions: (p && typeof p === 'object') ? p : {},
        slug: subscriber.slug || null,
        addons,
        ...(effectiveLimits && { effectiveLimits }),
        ...(usage && { usage }),
      };
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_master: user.is_master,
        role: user.role,
        slug: user.slug || null,
        subscriber_email: user.subscriber_email || null,
        profile_role: user.profile_role || null,
        profile_roles: profileRoles.length ? profileRoles : null,
        is_owner: !!isOwner,
        photo: user.photo || null,
        google_photo: user.google_photo || null
      },
      menuContext,
      permissions,
      subscriberData: subscriberDataPayload
    });
  } catch (error) {
    console.error('❌ [user/context] Erro ao obter contexto:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}));

// Alterar própria senha (requer autenticação)
app.post('/api/auth/change-password', authenticate, validate(schemas.changePassword), asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }

    // Carregar usuário com senha (req.user pode não ter o hash)
    let user;
    if (usePostgreSQL) {
      user = await repo.getUserByEmail(req.user.email);
    } else if (db && db.users) {
      user = db.users.find(u => (u.email || '').toLowerCase() === (req.user.email || '').toLowerCase());
    }
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let valid = false;
    if (user.password) {
      if (typeof user.password === 'string' && user.password.startsWith('$2')) {
        valid = await bcrypt.compare(currentPassword, user.password);
      } else if (user.password === currentPassword) {
        valid = true;
      }
    } else if ((user.email || '').toLowerCase() === 'admin@digimenu.com' && currentPassword === 'admin123') {
      valid = true; // recuperação: admin sem senha no DB
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
    return res.status(503).json({ error: 'Recuperação de senha requer PostgreSQL. Configure DATABASE_URL.' });
  }
  const { email } = req.body;
  const emailNorm = String(email).toLowerCase().trim();
  const user = await repo.getUserByEmail(emailNorm);
  // Sempre retornar a mesma mensagem (não vazar se o email existe)
  const msg = 'Se existir uma conta com este email, você receberá um link para redefinir a senha.';
  if (!user) {
    return res.json({ success: true, message: msg });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  await repo.createPasswordResetToken(emailNorm, token, expiresAt);
  const link = `${FRONTEND_URL}/redefinir-senha?token=${token}`;
  
  // Enviar email de recuperação de senha
  try {
    const { sendPasswordResetEmail } = await import('./utils/emailService.js');
    await sendPasswordResetEmail(emailNorm, token);
    logger.log('✅ [forgot-password] Email de recuperação enviado para:', emailNorm);
  } catch (emailError) {
    logger.error('❌ [forgot-password] Erro ao enviar email:', emailError);
    // Continuar mesmo se falhar (não crítico para segurança)
    logger.log('🔐 [forgot-password] Link de redefinição (email não enviado):', link);
  }
  
  return res.json({ success: true, message: msg });
}));

// Redefinir senha com token (esqueci minha senha)
app.post('/api/auth/reset-password', validate(schemas.resetPassword), asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Redefinição de senha requer PostgreSQL. Configure DATABASE_URL.' });
  }
  const { token, newPassword } = req.body;
  const row = await repo.getPasswordResetTokenByToken(token);
  if (!row) {
    return res.status(400).json({ error: 'Token inválido ou expirado. Solicite um novo link.' });
  }
  const user = await repo.getUserByEmail(row.email);
  if (!user) {
    await repo.deletePasswordResetToken(token);
    return res.status(400).json({ error: 'Token inválido ou expirado.' });
  }
  const hashed = await bcrypt.hash(newPassword, 10);
  await repo.updateUser(user.id, { password: hashed });
  await repo.deletePasswordResetToken(token);
  return res.json({ success: true, message: 'Senha redefinida com sucesso. Faça login.' });
}));

// -----------------------
// Colaboradores (Premium/Pro): perfis limitados Entregador, Cozinha, PDV
// -----------------------
// ✅ FUNÇÕES AUXILIARES MOVIDAS PARA: backend/modules/users/users.utils.js
// - getOwnerAndSubscriber
// - canUseColaboradores
// - isRequesterGerente
// - COLAB_ROLES

// =======================
// 🔗 INFORMAÇÕES PÚBLICAS PARA PÁGINA DE LOGIN POR SLUG (logo, tema, nome)
// =======================
app.get('/api/public/login-info/:slug', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ found: false, error: 'Requer PostgreSQL' });
  }
  const slug = (req.params.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ found: false, error: 'Slug inválido' });

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
// 🔗 CONFIG DA PÁGINA DE VENDAS /assinar (planos, preços, trial) — público
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
// 🔗 CARDÁPIO PÚBLICO POR LINK (slug) — cada assinante tem seu link ex: /s/meu-restaurante
// =======================
// ✅ Rota movida para: /api/public/cardapio/:slug (via módulo de menus)
/*
app.get('/api/public/cardapio/:slug', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Cardápio por link requer PostgreSQL. Configure DATABASE_URL.' });
  }
  const slug = (req.params.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'Slug inválido' });
  
  // Tentar buscar subscriber primeiro
  let subscriber = await repo.getSubscriberBySlug(slug);
  let isMaster = false;
  let se = null;
  
  console.log(`🔍 [public/cardapio] Buscando cardápio para slug: "${slug}"`);
  
  if (subscriber) {
    se = subscriber.email;
    console.log(`✅ [public/cardapio] Encontrado subscriber: ${se}`);
  } else {
    // Se não encontrou subscriber, buscar usuário master pelo slug
    const { query } = await import('./db/postgres.js');
    const masterResult = await query(
      'SELECT id, email, slug FROM users WHERE slug = $1 AND is_master = TRUE',
      [slug]
    );
    
    console.log(`🔍 [public/cardapio] Buscando master com slug: "${slug}"`, {
      encontrados: masterResult.rows.length,
      resultados: masterResult.rows
    });
    
    if (masterResult.rows.length > 0) {
      isMaster = true;
      se = null; // Master usa subscriber_email = NULL
      console.log(`✅ [public/cardapio] Encontrado master: ${masterResult.rows[0].email} (ID: ${masterResult.rows[0].id})`);
    } else {
      console.log(`❌ [public/cardapio] Slug não encontrado nem como subscriber nem como master`);
      return res.status(404).json({ error: 'Link não encontrado' });
    }
  }
  // Buscar entidades (para subscriber ou master), incluindo mesas (Table)
  let storeList, dishes, categories, complementGroups, pizzaSizes, pizzaFlavors, pizzaEdges, pizzaExtras, pizzaCategories, beverageCategories, deliveryZones, coupons, promotions, tables;
  
  if (isMaster) {
    // Para master, buscar entidades com subscriber_email IS NULL
    const { query } = await import('./db/postgres.js');
    console.log(`🔍 [public/cardapio] Buscando entidades do master (subscriber_email IS NULL)`);
    [storeList, dishes, categories, complementGroups, pizzaSizes, pizzaFlavors, pizzaEdges, pizzaExtras, pizzaCategories, beverageCategories, deliveryZones, coupons, promotions, tables] = await Promise.all([
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Store' AND subscriber_email IS NULL ORDER BY updated_at DESC NULLS LAST, created_at DESC`).then(r => {
        console.log(`📦 [public/cardapio] Store encontrados: ${r.rows.length}`);
        return r.rows.map(row => ({ id: row.id.toString(), ...row.data }));
      }),
      query(`SELECT id, data, created_at, updated_at FROM entities WHERE entity_type = 'Dish' AND subscriber_email IS NULL ORDER BY (data->>'order')::int NULLS LAST, created_at DESC`).then(r => {
        console.log(`📦 [public/cardapio] Dishes encontrados: ${r.rows.length}`);
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
    // Para subscriber, usar a função existente
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
  
  console.log(`✅ [public/cardapio] Retornando dados:`, {
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

// Chat do assistente com IA (público para o cardápio)
app.post('/api/public/chat', asyncHandler(async (req, res) => {
  const { message, slug, storeName, dishesSummary, menuFull, deliveryInfo, paymentOptions, history } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Campo message é obrigatório' });
  }
  const context = {
    storeName: storeName || 'o estabelecimento',
    dishesSummary: typeof dishesSummary === 'string' ? dishesSummary : '',
    menuFull: typeof menuFull === 'string' ? menuFull : '',
    deliveryInfo: typeof deliveryInfo === 'string' ? deliveryInfo : '',
    paymentOptions: typeof paymentOptions === 'string' ? paymentOptions : '',
    slug: slug || ''
  };
  const hist = Array.isArray(history) ? history.slice(-10) : [];
  const result = await getAIResponse(message.trim(), context, hist);
  if (!result) {
    return res.status(503).json({
      error: 'Assistente com IA indisponível',
      hint: isAIAvailable() ? 'Tente novamente em instantes.' : 'Configure OPENAI_API_KEY no backend para ativar respostas inteligentes.'
    });
  }
  const payload = { text: result.text, suggestions: result.suggestions || [] };
  if (result.step) payload.step = result.step;
  res.json(payload);
}));

// ✅ Rota movida para: /api/public/pedido-mesa (via módulo de pedidos)
// Pedido da mesa (público, sem login) — usado pela página /mesa/:numero?slug=xxx
/*
app.post('/api/public/pedido-mesa', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) return res.status(503).json({ error: 'Requer PostgreSQL' });
  const slug = (req.body.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'Slug obrigatório' });
  let se = null;
  const subscriber = await repo.getSubscriberBySlug(slug);
  if (subscriber) {
    se = subscriber.email;
  } else {
    const { query } = await import('./db/postgres.js');
    const masterResult = await query('SELECT id FROM users WHERE slug = $1 AND is_master = TRUE', [slug]);
    if (masterResult.rows.length === 0) return res.status(404).json({ error: 'Link não encontrado' });
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

// Chamar garçom (público, sem login) — usado pela página /mesa/:numero?slug=xxx
app.post('/api/public/chamar-garcom', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) return res.status(503).json({ error: 'Requer PostgreSQL' });
  const slug = (req.body.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'Slug obrigatório' });
  let se = null;
  const subscriber = await repo.getSubscriberBySlug(slug);
  if (subscriber) se = subscriber.email;
  else {
    const { query } = await import('./db/postgres.js');
    const masterResult = await query('SELECT id FROM users WHERE slug = $1 AND is_master = TRUE', [slug]);
    if (masterResult.rows.length === 0) return res.status(404).json({ error: 'Link não encontrado' });
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
  
  // ✅ EMITIR CHAMADA DE GARÇOM VIA WEBSOCKET
  emitWaiterCall(waiterCall);
  
  res.status(201).json({ ok: true, message: 'Garçom chamado!', call: waiterCall });
}));

// =======================
// 👥 USERS (LEGADO - REMOVER APÓS TESTES)
// =======================
/*
app.get('/api/colaboradores', authenticate, async (req, res) => {
  try {
    let { owner, subscriber } = await getOwnerAndSubscriber(req);
    // Gerente só pode ver colaboradores do próprio estabelecimento
    if (isRequesterGerente(req)) {
      owner = (req.user?.subscriber_email || '').toLowerCase().trim();
      if (!owner) return res.json([]);
      subscriber = usePostgreSQL && repo.getSubscriberByEmail ? await repo.getSubscriberByEmail(owner) : (db?.subscribers ? db.subscribers.find(s => (s.email || '').toLowerCase().trim() === owner) || null : null);
    }
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    }
    if (!owner && !req.user?.is_master) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!owner) return res.json([]); // Master sem as_subscriber: lista vazia
    let list = [];
    if (usePostgreSQL && repo.listColaboradores) {
      list = await repo.listColaboradores(owner);
    } else if (db?.users) {
      list = db.users
        .filter(u => (u.subscriber_email || '').toLowerCase().trim() === owner && (u.profile_role || '').trim())
        .map(u => ({ id: u.id, email: u.email, full_name: u.full_name, profile_role: u.profile_role, active: u.active !== false, created_at: u.created_at, updated_at: u.updated_at }));
    }
    
    // Agrupar por email para mostrar múltiplos perfis
    const grouped = {};
    list.forEach(item => {
      const email = item.email.toLowerCase().trim();
      if (!grouped[email]) {
        grouped[email] = {
          email: item.email,
          full_name: item.full_name,
          roles: [],
          ids: [],
          active: item.active !== false, // Default true se não especificado
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      }
      // Se algum perfil estiver desativado, marcar como desativado
      if (item.active === false) {
        grouped[email].active = false;
      }
      if (!grouped[email].roles.includes(item.profile_role)) {
        grouped[email].roles.push(item.profile_role);
      }
      if (!grouped[email].ids.includes(item.id)) {
        grouped[email].ids.push(item.id);
      }
    });
    
    // Converter para array e manter compatibilidade com formato antigo
    const result = Object.values(grouped).map(item => ({
      email: item.email,
      full_name: item.full_name,
      profile_role: item.roles[0], // Primeiro perfil para compatibilidade
      profile_roles: item.roles, // Array de perfis
      ids: item.ids, // IDs dos registros
      active: item.active !== false, // Default true se não especificado
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
    
    return res.json(result);
  } catch (e) {
    console.error('GET /api/colaboradores:', e);
    return res.status(500).json({ error: e?.message || 'Erro ao listar colaboradores' });
  }
});

app.post('/api/colaboradores', authenticate, validate(schemas.createColaborador), createLimiter, asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Informe o assinante (selecione o estabelecimento) para adicionar colaborador.' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    }
    const { name, email, password, roles, role } = req.body || {};
    
    // Suportar roles (array) ou role (string) para compatibilidade
    let rolesToCreate = [];
    if (roles && Array.isArray(roles) && roles.length > 0) {
      rolesToCreate = roles.map(r => String(r).toLowerCase().trim()).filter(r => COLAB_ROLES.includes(r));
    } else if (role) {
      const roleNorm = String(role).toLowerCase().trim();
      if (COLAB_ROLES.includes(roleNorm)) {
        rolesToCreate = [roleNorm];
      }
    }
    
    if (rolesToCreate.length === 0) return res.status(400).json({ error: 'Selecione pelo menos um perfil válido: entregador, cozinha, pdv, garcom ou gerente' });
    // Gerente não pode criar outro perfil Gerente — apenas Entregador, Cozinha, PDV, Garçom
    if (isRequesterGerente(req)) {
      const ownerGerente = (req.user?.subscriber_email || '').toLowerCase().trim();
      if (owner && owner.toLowerCase().trim() !== ownerGerente) return res.status(403).json({ error: 'Você só pode adicionar colaboradores do seu estabelecimento.' });
      rolesToCreate = rolesToCreate.filter(r => r !== 'gerente');
      if (rolesToCreate.length === 0) return res.status(400).json({ error: 'Gerente não pode criar perfil Gerente. Selecione: Entregador, Cozinha, PDV ou Garçom.' });
    }
    if (!(email && String(email).trim())) return res.status(400).json({ error: 'Email é obrigatório' });
    if (!(password && String(password).length >= 6)) return res.status(400).json({ error: 'Senha com no mínimo 6 caracteres' });
    const emailNorm = String(email).toLowerCase().trim();

    // Verificar se já existe colaborador com este email e subscriber
    let existingColabs = [];
    if (usePostgreSQL) {
      const all = await repo.listColaboradores(owner);
      existingColabs = all.filter(c => (c.email || '').toLowerCase().trim() === emailNorm);
    } else if (db?.users) {
      existingColabs = db.users.filter(u => 
        (u.email || '').toLowerCase().trim() === emailNorm && 
        (u.subscriber_email || '').toLowerCase().trim() === owner && 
        (u.profile_role || '').trim()
      );
    }
    
    // Verificar se algum dos perfis já existe para este email
    const existingRoles = existingColabs.map(c => (c.profile_role || '').toLowerCase().trim());
    const duplicateRoles = rolesToCreate.filter(r => existingRoles.includes(r));
    if (duplicateRoles.length > 0) {
      return res.status(400).json({ error: `Este email já possui os perfis: ${duplicateRoles.join(', ')}. Remova os perfis duplicados ou use perfis diferentes.` });
    }

    // Verificar se o email já existe como cliente (role='customer')
    // Se for cliente, permitir criar colaborador mesmo assim (mesmo email pode ser cliente e colaborador)
    let existingUserAsCustomer = null;
    if (usePostgreSQL) {
      const existingUser = await repo.getUserByEmail(emailNorm);
      if (existingUser && existingUser.role === 'customer') {
        existingUserAsCustomer = existingUser;
      }
    } else if (db?.users) {
      existingUserAsCustomer = db.users.find(u => 
        (u.email || '').toLowerCase().trim() === emailNorm && 
        u.role === 'customer'
      ) || null;
    }

    const hashed = await bcrypt.hash(String(password), 10);
    const fullName = (name || emailNorm.split('@')[0] || '').trim() || 'Colaborador';
    const roleNorm = rolesToCreate[0];
    const userData = {
      email: emailNorm,
      full_name: fullName,
      password: hashed,
      is_master: false,
      role: 'user',
      subscriber_email: owner,
      profile_role: roleNorm,
      active: true // Colaboradores são criados ativos por padrão
    };

    let newUser;
    try {
      if (usePostgreSQL) {
        // Se é cliente, o banco vai dar erro de constraint única
        // Mas vamos tentar criar mesmo assim e tratar o erro
        console.log('🔍 [POST /api/colaboradores] Criando usuário no PostgreSQL:', { email: emailNorm, profile_role: roleNorm, subscriber_email: owner });
        newUser = await repo.createUser(userData);
        console.log('✅ [POST /api/colaboradores] Usuário criado com sucesso:', { id: newUser.id, email: newUser.email });
      } else if (db?.users) {
        // Para JSON, verificar se já existe
        const existingUser = db.users.find(u => (u.email || '').toLowerCase().trim() === emailNorm);
        if (existingUser) {
          // Se é cliente, permitir criar colaborador mesmo assim
          if (existingUser.role === 'customer') {
            // É cliente - permitir criar colaborador com mesmo email
            newUser = {
              id: String(Date.now() + Math.random()),
              ...userData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            db.users.push(newUser);
          } else {
            // Não é cliente - já existe como outro tipo, não pode criar
            return res.status(400).json({ error: 'Este email já está cadastrado no sistema. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.' });
          }
        } else {
          // Não existe - criar normalmente
          newUser = {
            id: String(Date.now() + Math.random()),
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(newUser);
        }
      } else {
        return res.status(500).json({ error: 'Banco não disponível' });
      }
    } catch (createErr) {
      console.error('❌ [POST /api/colaboradores] Erro ao criar usuário:', {
        error: createErr?.message,
        code: createErr?.code,
        stack: createErr?.stack,
        email: emailNorm,
        subscriber_email: owner
      });
      // Se o erro for constraint única
      if (createErr?.code === '23505' || (createErr?.message && createErr.message.includes('unique constraint')) || (createErr?.message && createErr.message.includes('duplicate key'))) {
        console.log('⚠️ [POST /api/colaboradores] Erro de constraint única detectado. Verificando usuário existente...');
        // Verificar novamente se é cliente ou colaborador existente
        let existingUser = null;
        if (usePostgreSQL) {
          // Buscar todos os usuários com este email
          const { query } = await import('./db/postgres.js');
          const result = await query('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [emailNorm]);
          existingUser = result.rows[0] || null;
        } else if (db?.users) {
          existingUser = db.users.find(u => (u.email || '').toLowerCase().trim() === emailNorm) || null;
        }
        
        if (existingUser) {
          const isCustomer = existingUser.role === 'customer';
          const isColaborador = existingUser.profile_role && existingUser.subscriber_email === owner;
          
          if (isCustomer) {
            // É cliente - tentar criar colaborador mesmo assim (pode funcionar se a migration foi aplicada)
            // Mas se ainda der erro, informar que precisa usar email diferente
            return res.status(400).json({ 
              error: 'Este email já está cadastrado como cliente. O sistema permite que o mesmo email seja cliente e colaborador, mas pode haver uma limitação técnica no banco de dados. Por favor, use um email diferente ou contate o suporte para verificar se a migration foi aplicada corretamente.' 
            });
          } else if (isColaborador) {
            // Já é colaborador deste estabelecimento
            return res.status(400).json({ error: 'Este email já está cadastrado como colaborador deste estabelecimento. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.' });
          } else {
            // É outro tipo de usuário
            return res.status(400).json({ error: 'Este email já está cadastrado no sistema com outro perfil. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.' });
          }
        }
        return res.status(400).json({ error: 'Este email já está cadastrado no sistema. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.' });
      }
      // Se não for erro de constraint, relançar o erro para ser tratado pelo errorHandler
      console.error('❌ [POST /api/colaboradores] Erro inesperado ao criar colaborador:', createErr);
      throw createErr;
    }

    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);

    const out = {
      email: newUser.email,
      full_name: newUser.full_name,
      profile_role: newUser.profile_role,
      profile_roles: [newUser.profile_role],
      ids: [newUser.id],
      created_at: newUser.created_at,
      updated_at: newUser.updated_at
    };
    if (rolesToCreate.length > 1) {
      out.message = 'Colaborador criado. Adicione os outros perfis em "Adicionar perfis".';
    }
    return res.status(201).json(out);
  } catch (e) {
    console.error('POST /api/colaboradores:', sanitizeForLog({ error: e?.message }));
    throw e;
  }
}));

// Endpoint para adicionar perfis a um colaborador existente
app.post('/api/colaboradores/:email/add-roles', authenticate, asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Informe o assinante (selecione o estabelecimento) para adicionar perfis.' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    const { roles } = req.body || {};
    const email = req.params.email;
    const emailNorm = String(email).toLowerCase().trim();
    
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um perfil para adicionar' });
    }
    
    let rolesToAdd = roles.map(r => String(r).toLowerCase().trim()).filter(r => COLAB_ROLES.includes(r));
    if (rolesToAdd.length === 0) return res.status(400).json({ error: 'Perfis inválidos' });
    // Gerente não pode adicionar perfil Gerente a ninguém
    if (isRequesterGerente(req)) {
      rolesToAdd = rolesToAdd.filter(r => r !== 'gerente');
      if (rolesToAdd.length === 0) return res.status(400).json({ error: 'Gerente não pode atribuir perfil Gerente. Use: Entregador, Cozinha, PDV ou Garçom.' });
    }
    
    // Buscar colaboradores existentes com este email
    let existingColabs = [];
    if (usePostgreSQL) {
      const all = await repo.listColaboradores(owner);
      existingColabs = all.filter(c => (c.email || '').toLowerCase().trim() === emailNorm);
    } else if (db?.users) {
      existingColabs = db.users.filter(u => 
        (u.email || '').toLowerCase().trim() === emailNorm && 
        (u.subscriber_email || '').toLowerCase().trim() === owner && 
        (u.profile_role || '').trim()
      );
    }
    
    if (existingColabs.length === 0) {
      return res.status(404).json({ error: 'Colaborador não encontrado. Crie o colaborador primeiro.' });
    }
    
    const existingRoles = existingColabs.map(c => (c.profile_role || '').toLowerCase().trim());
    const newRoles = rolesToAdd.filter(r => !existingRoles.includes(r));
    
    if (newRoles.length === 0) {
      return res.status(400).json({ error: 'Todos os perfis selecionados já existem para este colaborador' });
    }
    
    // Buscar usuário base para pegar senha e nome
    const baseUser = existingColabs[0];
    let userBase = null;
    if (usePostgreSQL) {
      userBase = await repo.getUserById(baseUser.id);
    } else if (db?.users) {
      userBase = db.users.find(u => String(u.id) === String(baseUser.id));
    }
    
    if (!userBase) return res.status(404).json({ error: 'Usuário base não encontrado' });
    
    // Criar novos registros para os perfis adicionais (pode falhar se email já existir - 1 por email no BD)
    const added = [];
    for (const role of newRoles) {
      const userData = {
        email: emailNorm,
        full_name: userBase.full_name || baseUser.full_name,
        password: userBase.password,
        is_master: false,
        role: 'user',
        subscriber_email: owner,
        profile_role: role
      };
      try {
        if (usePostgreSQL) {
          await repo.createUser(userData);
          added.push(role);
        } else if (db?.users) {
          const newUser = {
            id: String(Date.now() + Math.random()),
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(newUser);
          added.push(role);
        }
      } catch (err) {
        if (err?.code === '23505' || (err?.message && err.message.includes('unique constraint'))) {
          return res.status(400).json({ error: 'O sistema permite um perfil por email por estabelecimento. Este email já está em uso aqui.' });
        }
        throw err;
      }
    }
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    return res.json({ success: true, message: added.length ? `Perfis adicionados: ${added.join(', ')}` : 'Nenhum perfil novo adicionado.', added_roles: added });
  } catch (e) {
    console.error('POST /api/colaboradores/:email/add-roles:', sanitizeForLog({ error: e?.message }));
    throw e;
  }
}));

// Endpoint para atualizar perfil do usuário (colaborador)
app.patch('/api/users/:id', authenticate, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};
    
    // Verificar se o usuário pode atualizar este perfil
    let u = null;
    if (usePostgreSQL) {
      u = await repo.getUserById(parseInt(id));
    } else if (db?.users) {
      u = db.users.find(x => String(x.id) === String(id));
    }
    
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    // Verificar permissão: só pode atualizar próprio perfil ou ser master/admin
    const isOwnProfile = String(u.id) === String(req.user?.id);
    const isMaster = req.user?.is_master;
    const isAdmin = req.user?.role === 'admin';
    
    if (!isOwnProfile && !isMaster && !isAdmin) {
      return res.status(403).json({ error: 'Sem permissão para atualizar este perfil' });
    }
    
    // Campos permitidos para atualização
    const allowedFields = ['full_name', 'photo', 'phone', 'address', 'city', 'state', 'birth_date', 'document'];
    const up = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (updateData[field] === '' || updateData[field] === null) {
          up[field] = null;
        } else {
          up[field] = String(updateData[field]).trim();
        }
      }
    }
    
    if (Object.keys(up).length === 0) {
      return res.json(u);
    }
    
    if (usePostgreSQL) {
      await repo.updateUser(parseInt(id), up);
      const updated = await repo.getUserById(parseInt(id));
      return res.json(updated);
    }
    
    Object.assign(u, up, { updated_at: new Date().toISOString() });
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    return res.json(u);
  } catch (e) {
    console.error('PATCH /api/users/:id:', sanitizeForLog({ error: e?.message }));
    throw e;
  }
}));

app.patch('/api/colaboradores/:id', authenticate, asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    const { name, role, roles, newPassword } = req.body || {};
    const id = req.params.id;

    let u = null;
    if (usePostgreSQL) {
      const all = await repo.listColaboradores(owner);
      u = all.find(x => String(x.id) === String(id)) || null;
    } else if (db?.users) {
      u = db.users.find(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
    }
    if (!u) return res.status(404).json({ error: 'Colaborador não encontrado' });
    // Gerente não pode editar outro colaborador que tenha perfil Gerente
    if (isRequesterGerente(req) && (u.profile_role || '').toLowerCase().trim() === 'gerente') {
      return res.status(403).json({ error: 'Apenas o dono do estabelecimento pode editar outro Gerente.' });
    }

    const up = {};
    if (name !== undefined) up.full_name = String(name).trim() || u.full_name;
    if (role !== undefined) {
      const r = String(role).toLowerCase().trim();
      if (isRequesterGerente(req) && r === 'gerente') return res.status(403).json({ error: 'Gerente não pode atribuir perfil Gerente a outros.' });
      if (COLAB_ROLES.includes(r)) up.profile_role = r;
    }
    if (newPassword !== undefined && String(newPassword).length >= 6) {
      up.password = await bcrypt.hash(String(newPassword), 10);
      // Atualizar senha em todos os registros do mesmo email
      const emailNorm = (u.email || '').toLowerCase().trim();
      if (usePostgreSQL) {
        const all = await repo.listColaboradores(owner);
        const sameEmail = all.filter(c => (c.email || '').toLowerCase().trim() === emailNorm);
        for (const colab of sameEmail) {
          await repo.updateUser(colab.id, { password: up.password });
        }
      } else if (db?.users) {
        db.users.forEach(user => {
          if ((user.email || '').toLowerCase().trim() === emailNorm && 
              (user.subscriber_email || '').toLowerCase().trim() === owner && 
              (user.profile_role || '').trim()) {
            user.password = up.password;
            user.updated_at = new Date().toISOString();
          }
        });
      }
    }

    if (Object.keys(up).length === 0) return res.json({ id: u.id, email: u.email, full_name: u.full_name, profile_role: u.profile_role });

    if (usePostgreSQL) {
      await repo.updateUser(u.id, up);
      const updated = await repo.getUserById(u.id);
      return res.json({ id: updated.id, email: updated.email, full_name: updated.full_name, profile_role: updated.profile_role, updated_at: updated.updated_at });
    }
    Object.assign(u, up, { updated_at: new Date().toISOString() });
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    return res.json({ id: u.id, email: u.email, full_name: u.full_name, profile_role: u.profile_role, updated_at: u.updated_at });
  } catch (e) {
    console.error('PATCH /api/colaboradores:', sanitizeForLog({ error: e?.message }));
    throw e;
  }
}));

app.delete('/api/colaboradores/:id', authenticate, asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    const id = req.params.id;
    // Gerente não pode remover outro colaborador que tenha perfil Gerente
    let targetColab = null;
    if (usePostgreSQL && repo.listColaboradores) {
      const all = await repo.listColaboradores(owner);
      targetColab = all.find(x => String(x.id) === String(id));
    } else if (db?.users) {
      targetColab = db.users.find(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
    }
    if (targetColab && isRequesterGerente(req) && (targetColab.profile_role || '').toLowerCase().trim() === 'gerente') {
      return res.status(403).json({ error: 'Apenas o dono do estabelecimento pode remover um Gerente.' });
    }

    if (usePostgreSQL) {
      const ok = await repo.deleteColaborador(id, owner);
      if (!ok) return res.status(404).json({ error: 'Colaborador não encontrado' });
    } else if (db?.users) {
      const idx = db.users.findIndex(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
      if (idx === -1) return res.status(404).json({ error: 'Colaborador não encontrado' });
      db.users.splice(idx, 1);
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco não disponível' });
    }
    return res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/colaboradores:', sanitizeForLog({ error: e?.message }));
    throw e;
  }
}));

// Endpoint para ativar/desativar colaborador
app.patch('/api/colaboradores/:id/toggle-active', authenticate, asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    const id = req.params.id;
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Campo "active" deve ser true ou false' });
    }

    // Buscar colaborador
    let targetColab = null;
    if (usePostgreSQL && repo.listColaboradores) {
      const all = await repo.listColaboradores(owner);
      targetColab = all.find(x => String(x.id) === String(id));
    } else if (db?.users) {
      targetColab = db.users.find(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
    }
    
    if (!targetColab) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    // Gerente não pode desativar outro colaborador que tenha perfil Gerente
    if (!active && isRequesterGerente(req) && (targetColab.profile_role || '').toLowerCase().trim() === 'gerente') {
      return res.status(403).json({ error: 'Apenas o dono do estabelecimento pode desativar um Gerente.' });
    }

    // Atualizar status
    if (usePostgreSQL) {
      await repo.updateUser(id, { active });
    } else if (db?.users) {
      const idx = db.users.findIndex(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
      if (idx === -1) return res.status(404).json({ error: 'Colaborador não encontrado' });
      db.users[idx].active = active;
      db.users[idx].updated_at = new Date().toISOString();
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco não disponível' });
    }
    
    return res.json({ success: true, active });
  } catch (e) {
    console.error('PATCH /api/colaboradores/:id/toggle-active:', sanitizeForLog({ error: e?.message }));
    throw e;
  }
}));

// Rota para definir senha usando token (NÃO requer autenticação - pública)
app.post('/api/auth/set-password', validate(schemas.setPassword), asyncHandler(async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log('🔐 [set-password] Recebida requisição para definir senha');
    console.log('🔐 [set-password] Token recebido:', token ? token.substring(0, 20) + '...' : 'NENHUM');

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    // Buscar token nos password tokens armazenados (memória e banco)
    let userEmail = null;
    let tokenData = null;

    // Primeiro, verificar em passwordTokens (memória)
    console.log('🔍 [set-password] Verificando em passwordTokens (memória)...', Object.keys(passwordTokens).length, 'tokens');
    for (const key in passwordTokens) {
      if (passwordTokens[key].token === token) {
        userEmail = passwordTokens[key].email;
        tokenData = {
          expires_at: passwordTokens[key].expires_at
        };
        console.log('✅ [set-password] Token encontrado em memória para:', userEmail);
        break;
      }
    }

    // Se não encontrou em memória, buscar no banco
    if (!userEmail) {
      console.log('🔍 [set-password] Token não encontrado em memória, buscando no banco...');
      
      if (usePostgreSQL) {
        // Buscar token no banco
        const subscribers = await repo.listSubscribers();
        console.log('🔍 [set-password] Buscando em', subscribers.length, 'assinantes no PostgreSQL');
        for (const sub of subscribers) {
          if (sub.password_token === token) {
            userEmail = sub.email;
            tokenData = {
              expires_at: sub.token_expires_at
            };
            console.log('✅ [set-password] Token encontrado no PostgreSQL para:', userEmail);
            break;
          }
        }
      } else if (db && db.subscribers) {
        // Buscar token nos assinantes
        console.log('🔍 [set-password] Buscando em', db.subscribers.length, 'assinantes no JSON');
        const subscriber = db.subscribers.find(s => {
          const match = s.password_token === token;
          if (match) {
            console.log('✅ [set-password] Token encontrado no JSON para:', s.email);
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
          console.log('❌ [set-password] Token não encontrado. Tokens disponíveis:');
          db.subscribers.forEach((sub, idx) => {
            console.log(`  [${idx}] Email: ${sub.email}, Token: ${sub.password_token ? sub.password_token.substring(0, 20) + '...' : 'SEM TOKEN'}`);
          });
        }
      }
    }

    if (!userEmail) {
      console.log('❌ [set-password] Token não encontrado em nenhum lugar');
      return res.status(400).json({ error: 'Token inválido ou expirado' });
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
        return res.status(400).json({ error: 'Token expirado. O link é válido por apenas 5 minutos. Solicite um novo link.' });
      }
    } else {
      // Se não tem data de expiração, considerar expirado por segurança
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Buscar dados do assinante para preencher full_name
    let subscriberInfo = null;
    if (usePostgreSQL) {
      subscriberInfo = await repo.getSubscriberByEmail(userEmail);
    } else if (db && db.subscribers) {
      subscriberInfo = db.subscribers.find(s => s.email === userEmail.toLowerCase());
    }
    
    console.log('📋 [set-password] Dados do assinante encontrados:', subscriberInfo ? {
      email: subscriberInfo.email,
      name: subscriberInfo.name
    } : 'NENHUM');

    // Buscar ou criar usuário
    let user;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('💾 [set-password] Hash da senha gerado:', hashedPassword.substring(0, 20) + '...');
    
    if (usePostgreSQL) {
      user = await repo.getUserByEmail(userEmail);
      if (!user) {
        console.log('👤 [set-password] Criando novo usuário no PostgreSQL:', userEmail);
        // Criar usuário se não existir, usando nome do assinante se disponível
        user = await repo.createUser({
          email: userEmail.toLowerCase(),
          password: hashedPassword,
          full_name: subscriberInfo?.name || userEmail.split('@')[0],
          role: 'user',
          is_master: false,
          has_password: true
        });
        console.log('✅ [set-password] Usuário criado no PostgreSQL:', user.id);
      } else {
        console.log('👤 [set-password] Atualizando senha do usuário existente no PostgreSQL:', user.id);
        // Atualizar senha e nome do usuário existente (se não tiver nome)
        const updateData = {
          password: hashedPassword,
          has_password: true
        };
        if (!user.full_name && subscriberInfo?.name) {
          updateData.full_name = subscriberInfo.name;
        }
        user = await repo.updateUser(user.id, updateData);
        console.log('✅ [set-password] Senha atualizada no PostgreSQL');
      }
    } else if (db && db.users) {
      user = db.users.find(u => u.email === userEmail.toLowerCase());
      
      if (!user) {
        console.log('👤 [set-password] Criando novo usuário no JSON:', userEmail);
        // Criar usuário com nome do assinante se disponível
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
        console.log('✅ [set-password] Usuário criado no JSON:', user.id, 'Nome:', user.full_name);
      } else {
        console.log('👤 [set-password] Atualizando senha do usuário existente no JSON:', user.id);
        // Atualizar senha e nome se não tiver
        user.password = hashedPassword;
        user.has_password = true;
        if (!user.full_name && subscriberInfo?.name) {
          user.full_name = subscriberInfo.name;
        }
        user.updated_at = new Date().toISOString();
        console.log('✅ [set-password] Senha atualizada no JSON, Nome:', user.full_name);
      }
      
      // Remover token do assinante após definir senha
      if (db.subscribers) {
        const subscriberIndex = db.subscribers.findIndex(s => s.email === userEmail);
        if (subscriberIndex >= 0) {
          db.subscribers[subscriberIndex].password_token = null;
          db.subscribers[subscriberIndex].token_expires_at = null;
          db.subscribers[subscriberIndex].has_password = true;
          console.log('✅ [set-password] Token removido do assinante');
        }
      }
      
      // Salvar imediatamente (forçar salvamento síncrono)
      try {
        if (!usePostgreSQL && db) {
          // Importar persistence dinamicamente se necessário
          const persistenceModule = await import('./db/persistence.js');
          if (persistenceModule && persistenceModule.saveDatabase) {
            persistenceModule.saveDatabase(db);
            console.log('💾 [set-password] Banco de dados salvo (síncrono)');
          } else if (saveDatabaseDebounced) {
            // Fallback para debounced
            saveDatabaseDebounced(db);
            await new Promise(resolve => setTimeout(resolve, 200));
            console.log('💾 [set-password] Banco de dados salvo (debounced)');
          }
        }
      } catch (saveError) {
        console.error('❌ [set-password] Erro ao salvar banco:', saveError);
      }
      
      // Verificar se a senha foi salva corretamente
      const verifyUser = db.users.find(u => u.email === userEmail.toLowerCase());
      if (verifyUser && verifyUser.password) {
        console.log('✅ [set-password] Verificação: Senha salva corretamente no banco');
        console.log('✅ [set-password] Hash salvo:', verifyUser.password.substring(0, 20) + '...');
        console.log('✅ [set-password] Email do usuário:', verifyUser.email);
        console.log('✅ [set-password] ID do usuário:', verifyUser.id);
      } else {
        console.error('❌ [set-password] ERRO: Senha não foi salva corretamente!');
        console.error('❌ [set-password] Usuário verificado:', verifyUser);
      }
    }

    console.log('✅ [set-password] Senha definida com sucesso para:', userEmail);
    
    return res.json({
      success: true,
      message: 'Senha definida com sucesso! Você já pode fazer login.'
    });
  } catch (error) {
    console.error('❌ Erro ao definir senha:', sanitizeForLog({ error: error.message }));
    throw error;
  }
}));

// 🖼️ IMAGE UPLOAD — rota registrada no início do arquivo (após auth) para evitar 404

// =======================
// 🔔 SERVICE REQUESTS (solicitações de assinantes para master)
// =======================
app.get('/api/service-requests', authenticate, requireMaster, asyncHandler(async (req, res) => {
  const items = usePostgreSQL ? await repo.listAllServiceRequests() : [];
  res.json({ items });
}));

// ✅ Entities CRUD (POST/PUT/DELETE/bulk) - movido para antes de app.use('/api') linha ~749 para corrigir 404

// REMOVIDO: handlers duplicados app.post/put/delete entities (agora registrados antes do router)

// ✅ Rota movida para: /api/establishments/subscribers/:id ou /api/subscribers/:id
// app.put('/api/subscribers/:id', authenticate, async (req, res) => { ... });

// =======================
// 🔧 FUNCTIONS (FUNÇÕES CUSTOMIZADAS)
// =======================
// Rota: POST /api/functions/:name (getSubscribers, createSubscriber, updateSubscriber, etc.)
// Frontend preferencial: GET /api/establishments/subscribers
app.post('/api/functions/:name', authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    const data = req.body;
    
    console.log(`🔧 [/api/functions/${name}] Função chamada por:`, req.user?.email, 'is_master:', req.user?.is_master);
    console.log(`🔧 [/api/functions/${name}] Body:`, JSON.stringify(data).substring(0, 200));
    
    // ✅ updateMasterSlug movido para: /api/users/functions/updateMasterSlug
    // ✅ registerCustomer movido para: /api/users/functions/registerCustomer
    
    // ✅ getSubscribers: delegar ao establishments (frontend chama /api/functions/getSubscribers)
    if (name === 'getSubscribers') {
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      await establishmentsController.listSubscribers(req, res, () => {});
      return;
    }
    
    // ✅ createSubscriber: delegar ao establishments (frontend chama /api/functions/createSubscriber)
    if (name === 'createSubscriber') {
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      await establishmentsController.createSubscriber(req, res, () => {});
      return;
    }
    
    // ✅ updateSubscriber: delegar ao establishments (frontend envia { id, data, originalData })
    if (name === 'updateSubscriber') {
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      const { id, data: updateData, originalData } = data || {};
      if (!id) {
        return res.status(400).json({ error: 'id é obrigatório' });
      }
      req.params = { ...req.params, id: String(id) };
      req.body = updateData || data || {};
      await establishmentsController.updateSubscriber(req, res, () => {});
      return;
    }
    
    // ✅ Funções de assinantes movidas para: /api/establishments/functions/*
    // - getSubscribers também disponível em /api/functions/getSubscribers (acima)
    // - getPlanInfo → /api/establishments/functions/getPlanInfo
    // - getAvailablePlans → /api/establishments/functions/getAvailablePlans
    // - createSubscriber → /api/establishments/functions/createSubscriber
    
    // ✅ createSubscriber movido para: /api/establishments/functions/createSubscriber
    if (false && name === 'createSubscriber') { // Desabilitado - movido para módulo
      // Apenas master pode criar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Validar plano
      const validPlans = ['free', 'basic', 'pro', 'ultra', 'admin', 'custom'];
      if (data.plan && !validPlans.includes(data.plan)) {
        return res.status(400).json({ 
          error: `Plano inválido: ${data.plan}. Planos válidos: ${validPlans.join(', ')}` 
        });
      }
      
      // Se for plano custom, garantir que tem permissões definidas
      if (data.plan === 'custom' && (!data.permissions || Object.keys(data.permissions).length === 0)) {
        return res.status(400).json({ 
          error: 'Plano custom requer permissões definidas' 
        });
      }
      
      try {
        console.log('📝 Criando assinante:', { 
          email: data.email, 
          plan: data.plan, 
          hasPermissions: !!data.permissions 
        });
        
        const subscriber = usePostgreSQL
          ? await repo.createSubscriber(data)
          : (() => {
              // Fallback JSON - apenas para desenvolvimento
              if (!db || !db.subscribers) {
                throw new Error('Banco de dados não inicializado');
              }
              
              // Verificar se já existe
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
          // Verificar se é um novo assinante (não atualização)
          const isNewSubscriber = !data.id; // Se não tem ID, é novo
          
          if (isNewSubscriber) {
            passwordTokenData = generatePasswordTokenForSubscriber(
              subscriber.email,
              subscriber.id || subscriber.email
            );
            
            // Atualizar assinante com token (se não foi salvo automaticamente)
            if (usePostgreSQL) {
              // Atualizar assinante no PostgreSQL
              if (repo.updateSubscriber) {
                await repo.updateSubscriber(subscriber.id, {
                  password_token: passwordTokenData.token,
                  token_expires_at: passwordTokenData.expires_at
                });
                console.log('💾 [createSubscriber] Token salvo no PostgreSQL para:', subscriber.email);
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
                
                // Atualizar também o objeto subscriber retornado
                subscriber.password_token = passwordTokenData.token;
                subscriber.token_expires_at = passwordTokenData.expires_at;
                
                console.log('💾 [createSubscriber] Token salvo no JSON para:', subscriber.email);
                
                if (saveDatabaseDebounced) {
                  saveDatabaseDebounced(db);
                }
              } else {
                console.warn('⚠️ [createSubscriber] Assinante não encontrado após criação:', subscriber.email);
              }
            }
            
            console.log('🔑 Token de senha gerado automaticamente para:', subscriber.email);
          }
        } catch (tokenError) {
          console.warn('⚠️ Erro ao gerar token de senha (não crítico):', tokenError.message);
          // Não falhar a criação do assinante se o token falhar
        }
        
        console.log('✅ Assinante criado com sucesso:', subscriber.id || subscriber.email);
        
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
        console.error('❌ Erro ao criar assinante:', error);
        console.error('❌ Stack trace:', error.stack);
        return res.status(500).json({ 
          error: 'Erro ao criar assinante',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
    
    // ✅ updateSubscriber movido para: /api/establishments/subscribers/:id
    if (false && name === 'updateSubscriber') { // Desabilitado - movido para módulo
      // Apenas master pode atualizar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // O frontend envia: { id, data: {...}, originalData: {...} }
      // Precisamos extrair os dados corretamente
      const subscriberId = data.id;
      const updateData = data.data || data; // Se não tiver 'data', usar o body inteiro (compatibilidade)
      const originalData = data.originalData;
      
      console.log('📝 [updateSubscriber] Recebido:', {
        subscriberId,
        updateDataKeys: Object.keys(updateData),
        hasOriginalData: !!originalData
      });
      console.log('📝 [updateSubscriber] updateData completo:', JSON.stringify(updateData, null, 2));
      
      // Validar plano se estiver sendo atualizado
      if (updateData.plan) {
        const validPlans = ['free', 'basic', 'pro', 'ultra', 'admin', 'custom'];
        if (!validPlans.includes(updateData.plan)) {
          return res.status(400).json({ 
            error: `Plano inválido: ${updateData.plan}. Planos válidos: ${validPlans.join(', ')}` 
          });
        }
        
        // Se for plano custom, garantir que tem permissões definidas
        if (updateData.plan === 'custom' && (!updateData.permissions || Object.keys(updateData.permissions).length === 0)) {
          return res.status(400).json({ 
            error: 'Plano custom requer permissões definidas' 
          });
        }
      }
      
      try {
        console.log('📝 [updateSubscriber] Atualizando assinante:', { 
          email: updateData.email, 
          id: subscriberId,
          plan: updateData.plan 
        });
        
        // O email pode estar em updateData ou no subscriberId (se for email)
        const subscriberEmail = updateData.email;
        const identifier = subscriberId || subscriberEmail;
        
        console.log('🔍 [updateSubscriber] Buscando assinante com:', { id: subscriberId, email: subscriberEmail, identifier });
        
        if (!identifier) {
          console.error('❌ [updateSubscriber] Nenhum identificador fornecido (id ou email)');
          return res.status(400).json({ error: 'ID ou email do assinante é obrigatório' });
        }
        
        let subscriber = null;
        if (usePostgreSQL) {
          subscriber = await repo.updateSubscriber(identifier, updateData);
          console.log('✅ [updateSubscriber] Assinante atualizado no PostgreSQL:', subscriber?.id);
          
          if (!subscriber) {
            console.error('❌ [updateSubscriber] Assinante não encontrado no PostgreSQL com:', identifier);
            return res.status(404).json({ error: 'Assinante não encontrado' });
          }
        } else {
          if (!db || !db.subscribers) {
            throw new Error('Banco de dados não inicializado');
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
          
          console.log('🔍 [updateSubscriber] Índice encontrado:', index);
          
          if (index === -1) {
            console.error('❌ [updateSubscriber] Assinante não encontrado. Assinantes disponíveis:');
            db.subscribers.forEach((sub, idx) => {
              console.log(`  [${idx}] ID: ${sub.id}, Email: ${sub.email}`);
            });
            return res.status(404).json({ error: 'Assinante não encontrado' });
          }
          
          // Atualizar mantendo campos existentes
          const existing = db.subscribers[index];
          subscriber = { 
            ...existing, 
            ...updateData,
            id: existing.id, // Garantir que ID não seja alterado
            email: subscriberEmail || existing.email, // Manter email se não for fornecido
            updated_at: new Date().toISOString()
          };
          
          db.subscribers[index] = subscriber;
          
          // Salvar imediatamente
          if (saveDatabaseDebounced) {
            saveDatabaseDebounced(db);
          }
          
          console.log('✅ [updateSubscriber] Assinante atualizado no JSON:', subscriber.id);
        }
        
        if (!subscriber) {
          console.error('❌ [updateSubscriber] Assinante não encontrado após atualização');
          return res.status(404).json({ error: 'Assinante não encontrado' });
        }
        
        console.log('✅ Assinante atualizado com sucesso:', subscriber.id || subscriber.email);
        return res.json({ data: { subscriber } });
      } catch (error) {
        console.error('❌ Erro ao atualizar assinante:', error);
        console.error('❌ Stack trace:', error.stack);
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
        return res.status(400).json({ error: 'subscriber_id ou email é obrigatório' });
      }
      
      try {
        // Buscar assinante para validar
        let subscriber = null;
        if (usePostgreSQL) {
          if (email) {
            subscriber = await repo.getSubscriberByEmail(email);
          } else if (subscriber_id) {
            // Buscar todos e filtrar por ID (temporário até ter getSubscriberById)
            const allSubscribers = await repo.listSubscribers();
            subscriber = allSubscribers.find(s => s.id === parseInt(subscriber_id) || s.id === subscriber_id);
          }
        } else if (db && db.subscribers) {
          subscriber = db.subscribers.find(s => 
            s.email === email || s.id === subscriber_id
          );
        }
        
        if (!subscriber) {
          return res.status(404).json({ error: 'Assinante não encontrado' });
        }
        
        // Gerar token
        const tokenData = generatePasswordTokenForSubscriber(
          subscriber.email,
          subscriber.id || subscriber.email
        );
        
        console.log('🔑 Token de senha gerado manualmente para:', subscriber.email);
        
        return res.json({
          data: {
            token: tokenData.token,
            setup_url: tokenData.setup_url,
            expires_at: tokenData.expires_at
          }
        });
      } catch (error) {
        console.error('❌ Erro ao gerar token de senha:', error);
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
        console.log('🗑️ Deletando assinante:', { 
          email: data.email, 
          id: data.id 
        });
        
        const subscriber = usePostgreSQL
          ? await repo.deleteSubscriber(data.email || data.id)
          : (() => {
              if (!db || !db.subscribers) {
                throw new Error('Banco de dados não inicializado');
              }
              const index = db.subscribers.findIndex(s => s.email === data.email || s.id === data.id);
              if (index === -1) return null;
              const deleted = db.subscribers.splice(index, 1)[0];
              if (saveDatabaseDebounced) saveDatabaseDebounced(db);
              return deleted;
            })();
        
        if (!subscriber) {
          return res.status(404).json({ error: 'Assinante não encontrado' });
        }
        
        console.log('✅ Assinante deletado com sucesso:', subscriber.id || subscriber.email);
        return res.json({ data: { subscriber } });
      } catch (error) {
        console.error('❌ Erro ao deletar assinante:', error);
        console.error('❌ Stack trace:', error.stack);
        return res.status(500).json({ 
          error: 'Erro ao deletar assinante',
          details: error.message 
        });
      }
    }
    
    if (name === 'checkSubscriptionStatus') {
      console.log('📋 [checkSubscriptionStatus] Verificando assinatura para:', data.user_email);
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
      
      console.log('📋 [checkSubscriptionStatus] Assinante encontrado:', subscriber ? {
        email: subscriber.email,
        name: subscriber.name,
        status: subscriber.status,
        plan: subscriber.plan
      } : 'NENHUM');
      
      if (!subscriber) {
        console.warn('⚠️ [checkSubscriptionStatus] Assinante não encontrado. Assinantes disponíveis:');
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
    
    // ✅ NOVO: Atualizar slug do master
    if (name === 'updateMasterSlug') {
      console.log('📝 [updateMasterSlug] Master atualizando slug:', data.slug);
      
      // Apenas master pode atualizar seu próprio slug
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Apenas masters podem atualizar slug' });
      }
      
      const { slug } = data;
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return res.status(400).json({ error: 'Slug inválido' });
      }
      
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      
      if (usePostgreSQL) {
        try {
          await repo.updateUser(req.user.id, { slug: cleanSlug });
          console.log('✅ [updateMasterSlug] Slug atualizado com sucesso:', cleanSlug);
          return res.json({ 
            data: { 
              success: true, 
              slug: cleanSlug,
              message: 'Slug atualizado com sucesso' 
            } 
          });
        } catch (error) {
          console.error('❌ [updateMasterSlug] Erro ao atualizar:', error);
          return res.status(500).json({ error: 'Erro ao atualizar slug' });
        }
      } else {
        // JSON mode
        if (!db || !db.users) {
          return res.status(500).json({ error: 'Banco de dados não inicializado' });
        }
        
        const userIndex = db.users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        db.users[userIndex].slug = cleanSlug;
        await saveDB();
        
        console.log('✅ [updateMasterSlug] Slug atualizado com sucesso:', cleanSlug);
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
        return res.status(400).json({ error: 'subscriber_email é obrigatório' });
      }
      
      console.log('📊 [getFullSubscriberProfile] Buscando perfil completo para:', subscriber_email);
      
      try {
        // Buscar assinante
        const subscriber = usePostgreSQL
          ? await repo.getSubscriberByEmail(subscriber_email)
          : (db && db.subscribers ? db.subscribers.find(s => s.email?.toLowerCase() === subscriber_email?.toLowerCase()) : null);
        
        if (!subscriber) {
          return res.status(404).json({ error: 'Assinante não encontrado' });
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
        
        // Calcular estatísticas
        const stats = {
          total_dishes: dishes.length,
          total_orders: orders.length,
          total_revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
          active_caixas: caixas.filter(c => c.status === 'open').length,
          total_comandas: comandas.length,
          comandas_abertas: comandas.filter(c => c.status === 'open').length
        };
        
        console.log('✅ [getFullSubscriberProfile] Perfil completo gerado:', {
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
        console.error('❌ [getFullSubscriberProfile] Erro:', error);
        return res.status(500).json({ 
          error: 'Erro ao buscar perfil do assinante',
          details: error.message 
        });
      }
    }
    
    // ✅ registerCustomer movido para: /api/users/functions/registerCustomer
    
    // Função padrão (mock)
    res.json({ 
      success: true, 
      function: name,
      data: data,
      message: `Função ${name} executada com sucesso`
    });
  } catch (error) {
    console.error('Erro ao executar função:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// =======================
// 🏠 ROTA RAIZ (para health checks)
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
// 🧪 HEALTH CHECK
// =======================
app.get('/api/health', asyncHandler(async (req, res) => {
  const health = {
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Verificar conexão com banco de dados
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
// 🔍 HEALTH CHECK ESPECÍFICO PARA SUBSCRIBERS (DIAGNÓSTICO)
// =======================
app.get('/api/health/subscribers', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const diagnostic = {
    time: new Date().toISOString(),
    steps: []
  };

  try {
    const { query } = await import('./db/postgres.js');
    
    // Passo 1: Testar conexão
    diagnostic.steps.push({ step: 1, action: 'Testando conexão PostgreSQL...', time: Date.now() - startTime });
    const connected = await testConnection();
    diagnostic.steps.push({ step: 1, result: connected ? 'conectado' : 'falhou', time: Date.now() - startTime });
    
    if (!connected) {
      return res.status(503).json({ ...diagnostic, error: 'PostgreSQL não conectado' });
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
// 📊 ROTAS DE ANALYTICS, BACKUP, MERCADOPAGO E METRICS
// =======================
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/subscriber-backup', subscriberBackupRoutes);
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/affiliates', affiliatesRoutes);
app.use('/api/lgpd', lgpdRoutes);

// =======================
// ✅ TRATAMENTO DE ERROS (deve ser o último middleware)
// =======================
app.use(errorHandler);

// =======================
// 🌱 ENDPOINT DE SEED DEMO (uso único via HTTP - GET e POST)
// =======================
const seedDemoHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Seed requer PostgreSQL. Configure DATABASE_URL.' });
  }

  // Validação simples com chave secreta
  const secretKey = req.headers['x-seed-key'] || req.query.key;
  const expectedKey = process.env.SEED_SECRET_KEY || 'demo-secret-2026';
  
  if (secretKey !== expectedKey) {
    return res.status(403).json({ 
      error: 'Não autorizado. Configure SEED_SECRET_KEY no Render ou use a chave padrão.',
      hint: 'Envie a chave via header x-seed-key ou query ?key=...'
    });
  }

  const DEMO_EMAIL = 'demo@pizzaria.com';
  const DEMO_SLUG = 'demo-pizzaria';

  try {
    // 1. Verificar se já existe
    let subscriber = await repo.getSubscriberByEmail(DEMO_EMAIL);
    
    if (subscriber) {
      return res.json({ 
        message: 'Demo já existe! Use o link abaixo.',
        url: `https://digimenu-chi.vercel.app/s/${DEMO_SLUG}`,
        email: DEMO_EMAIL,
        slug: DEMO_SLUG,
        alreadyExists: true
      });
    }

    console.log('🍕 Criando demo-pizzaria...');

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
    console.log('✅ Subscriber criado');

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
    console.log('✅ Loja criada');

    // 4. Criar categorias
    const pizzaCat = await repo.createEntity('Category', subEmail, { name: 'Pizzas', order: 1, is_active: true });
    const bebidaCat = await repo.createEntity('Category', subEmail, { name: 'Bebidas', order: 2, is_active: true });
    await repo.createEntity('Category', subEmail, { name: 'Sobremesas', order: 3, is_active: true });
    console.log('✅ Categorias criadas');

    // 5. Tamanhos de pizza
    await repo.createEntity('PizzaSize', subEmail, {
      name: 'Pequena', slices: 4, max_flavors: 2,
      price_tradicional: 35.00, price_premium: 40.00, order: 1, is_active: true
    });
    await repo.createEntity('PizzaSize', subEmail, {
      name: 'Média', slices: 6, max_flavors: 2,
      price_tradicional: 50.00, price_premium: 60.00, order: 2, is_active: true
    });
    await repo.createEntity('PizzaSize', subEmail, {
      name: 'Grande', slices: 8, max_flavors: 3,
      price_tradicional: 65.00, price_premium: 75.00, order: 3, is_active: true
    });
    console.log('✅ Tamanhos criados');

    // 6. Sabores
    const flavors = [
      { name: 'Margherita', category: 'tradicional', order: 1 },
      { name: 'Calabresa', category: 'tradicional', order: 2 },
      { name: 'Frango com Catupiry', category: 'tradicional', order: 3 },
      { name: 'Portuguesa', category: 'tradicional', order: 4 },
      { name: 'Quatro Queijos', category: 'premium', order: 5 },
      { name: 'Pepperoni', category: 'premium', order: 6 },
      { name: 'Lombinho', category: 'premium', order: 7 },
      { name: 'Camarão', category: 'premium', order: 8 }
    ];
    for (const flavor of flavors) {
      await repo.createEntity('PizzaFlavor', subEmail, {
        ...flavor, description: `Deliciosa pizza de ${flavor.name}`, is_active: true
      });
    }
    console.log('✅ Sabores criados');

    // 7. Bordas
    await repo.createEntity('PizzaEdge', subEmail, { name: 'Catupiry', price: 8.00, order: 1, is_active: true });
    await repo.createEntity('PizzaEdge', subEmail, { name: 'Cheddar', price: 10.00, order: 2, is_active: true });
    console.log('✅ Bordas criadas');

    // 8. Extras
    await repo.createEntity('PizzaExtra', subEmail, { name: 'Bacon Extra', price: 5.00, order: 1, is_active: true });
    await repo.createEntity('PizzaExtra', subEmail, { name: 'Azeitonas', price: 3.00, order: 2, is_active: true });
    console.log('✅ Extras criados');

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
      name: 'Guaraná Antarctica 2L',
      description: 'Refrigerante Guaraná 2 litros',
      price: 10.00,
      category_id: bebidaCat.id,
      product_type: 'simple',
      is_active: true,
      order: 2
    });
    console.log('✅ Pratos criados');

    // 10. Zona de entrega
    await repo.createEntity('DeliveryZone', subEmail, {
      name: 'Centro', fee: 5.00, min_order: 30.00,
      delivery_time: '40-50 min', is_active: true
    });
    console.log('✅ Zona de entrega criada');

    console.log('🎉 Demo criado com sucesso!');

    res.json({
      success: true,
      message: '🎉 Demo criado com sucesso!',
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
    console.error('❌ Erro ao criar demo:', error);
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
// 🧹 ENDPOINT DE LIMPEZA DE CONFLITO MASTER-SUBSCRIBER
// =======================
const cleanupMasterHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Limpeza requer PostgreSQL' });
  }

  // Validação simples (você pode melhorar com senha)
  const secretKey = req.headers['x-cleanup-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'Não autorizado. Configure CLEANUP_SECRET_KEY.' });
  }

  try {
    console.log('🧹 Iniciando limpeza de conflitos master-subscriber...');
    
    // Importar query do postgres
    const { query } = await import('./db/postgres.js');
    
    // 1. Buscar todos os usuários master
    const mastersResult = await query(
      'SELECT id, email, full_name, is_master FROM users WHERE is_master = TRUE'
    );
    
    if (mastersResult.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Nenhum usuário master encontrado'
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
        
        console.log(`⚠️ Conflito encontrado: ${master.email}`);
        
        // 3. Deletar todas as entidades do subscriber
        console.log(`  → Deletando entidades do subscriber ${subscriber.email}...`);
        const entitiesResult = await query(
          'DELETE FROM entities WHERE subscriber_email = $1',
          [subscriber.email]
        );
        console.log(`  ✓ ${entitiesResult.rowCount} entidades deletadas`);
        
        // 4. Deletar o subscriber
        console.log(`  → Deletando subscriber ${subscriber.email}...`);
        await query(
          'DELETE FROM subscribers WHERE email = $1',
          [subscriber.email]
        );
        console.log(`  ✓ Subscriber deletado`);
      }
    }
    
    if (conflicts.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhum conflito encontrado. Sistema OK!',
        masters: mastersResult.rows.length
      });
    }
    
    console.log('✅ Limpeza concluída!');
    
    res.json({
      success: true,
      message: `${conflicts.length} conflito(s) resolvido(s) com sucesso!`,
      conflicts_resolved: conflicts,
      masters_count: mastersResult.rows.length
    });

  } catch (error) {
    console.error('❌ Erro ao limpar conflitos:', error);
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
// 🗑️ ENDPOINT PARA DELETAR SUBSCRIBER ESPECÍFICO POR SLUG (LEGADO - MOVIDO PARA MÓDULO)
// =======================
// ✅ Handler movido para: backend/modules/establishments/establishments.service.js
// ✅ Rotas movidas para: /api/establishments/delete-subscriber-by-slug
*/

// =======================
// 🔧 ENDPOINT PARA EXECUTAR MIGRAÇÃO SQL
// =======================
const runMigrationHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Migração requer PostgreSQL' });
  }

  const secretKey = req.headers['x-migration-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'Não autorizado. Configure CLEANUP_SECRET_KEY.' });
  }

  const migrationName = req.query.migration || req.body.migration;
  if (!migrationName) {
    return res.status(400).json({ error: 'Parâmetro "migration" é obrigatório' });
  }

  try {
    console.log(`🔧 Executando migração: ${migrationName}`);
    const { query } = await import('./db/postgres.js');
    
    if (migrationName === 'add_slug_to_users') {
      // Adicionar coluna slug se não existir
      await query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
      `);
      
      // Criar índice
      await query(`
        CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
      `);
      
      console.log('✅ Migração add_slug_to_users executada com sucesso');
      
      return res.json({
        success: true,
        message: 'Migração add_slug_to_users executada com sucesso!',
        migration: migrationName
      });
    }
    
    return res.status(400).json({
      error: 'Migração não encontrada',
      available_migrations: ['add_slug_to_users']
    });

  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    res.status(500).json({ 
      error: 'Erro ao executar migração',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/run-migration', runMigrationHandler);
app.post('/api/run-migration', runMigrationHandler);

// =======================
// 🔍 ENDPOINT DE DEBUG PARA VER ESTADO DO USUÁRIO
// =======================
const debugUserHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Debug requer PostgreSQL' });
  }

  const secretKey = req.headers['x-debug-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'Não autorizado. Configure CLEANUP_SECRET_KEY.' });
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
    
    // 2. Ver todos os usuários master
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
    console.error('❌ Erro ao debugar:', error);
    res.status(500).json({ 
      error: 'Erro ao debugar',
      message: error.message
    });
  }
});

app.get('/api/debug-user', debugUserHandler);
app.post('/api/debug-user', debugUserHandler);

// =======================
// 🏪 ENDPOINT PARA CONFIGURAR LOJA DO MASTER
// =======================
const setupMasterStoreHandler = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Setup requer PostgreSQL' });
  }

  const secretKey = req.headers['x-setup-key'] || req.query.key;
  if (secretKey !== process.env.CLEANUP_SECRET_KEY) {
    return res.status(403).json({ error: 'Não autorizado. Configure CLEANUP_SECRET_KEY.' });
  }

  try {
    console.log('🏪 Configurando loja para usuário master...');
    const { query } = await import('./db/postgres.js');
    
    // 1. Buscar usuário master
    const masterResult = await query(
      'SELECT id, email, full_name, slug FROM users WHERE is_master = TRUE LIMIT 1'
    );
    
    if (masterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário master encontrado' });
    }
    
    const master = masterResult.rows[0];
    console.log('✓ Master encontrado:', master.email);
    
    // 2. Verificar se já existe loja para o master
    const storeResult = await query(
      `SELECT * FROM entities 
       WHERE entity_type = 'Store' 
       AND subscriber_email IS NULL
       LIMIT 1`
    );
    
    let store;
    if (storeResult.rows.length > 0) {
      store = storeResult.rows[0];
      console.log('✓ Loja já existe para o master');
    } else {
      // 3. Criar loja para o master
      console.log('→ Criando loja para o master...');
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
      console.log('✓ Loja criada para o master');
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
    console.error('❌ Erro ao configurar master:', error);
    res.status(500).json({ 
      error: 'Erro ao configurar master',
      message: error.message
    });
  }
});

app.get('/api/setup-master-store', setupMasterStoreHandler);
app.post('/api/setup-master-store', setupMasterStoreHandler);

// =======================
// 🚀 START SERVER
// =======================
// Criar servidor HTTP para WebSocket
const server = http.createServer(app);

// ✅ CONFIGURAR WEBSOCKETS
const io = setupWebSocket(server);

// Emitir atualizações quando pedido é atualizado
const originalPutOrder = app._router?.stack?.find(layer => layer.route?.path === '/api/entities/Order/:id' && layer.route?.methods?.put);
if (originalPutOrder) {
  // A atualização já será feita nas rotas existentes
}

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 http://localhost:${PORT}/api`);
  console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket ativo`);
  console.log(`🔧 Functions router: POST /api/functions/:name montado`);
  
  // 🔔 Inicializar cron jobs (notificações de expiração)
  initializeCronJobs();
  
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Modo produção ativo');
    
    // Inicializar backup automático em produção
    if (process.env.DATABASE_URL) {
      scheduleBackups();
    }
  } else {
    console.log('⚠️ Modo desenvolvimento - algumas proteções estão desabilitadas');
  }
});
