// =======================
// 🌱 ENV CONFIG (OBRIGATÓRIO SER O PRIMEIRO)
// =======================
import { config } from 'dotenv';
config({ path: new URL('./.env', import.meta.url) });

console.log('🧪 ENV TEST:', {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING',
  JWT_SECRET: process.env.JWT_SECRET ? 'OK' : 'MISSING (usando padrão)',
  FRONTEND_URL: process.env.FRONTEND_URL
});

// =======================
// 📦 IMPORTS
// =======================
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';

import cloudinary from './config/cloudinary.js';
import { upload } from './middlewares/upload.js';
import { testConnection } from './db/postgres.js';
import { migrate } from './db/migrate.js';
import * as repo from './db/repository.js';
import { requirePermission, requireAccess, requireMaster } from './middlewares/permissions.js';
import { PLANS, getPlanInfo } from './utils/plans.js';
import { validateJWTSecret, sanitizeForLog } from './middlewares/security.js';
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
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// =======================
// 🧱 MIDDLEWARES
// =======================
// ✅ COMPRESSÃO DE RESPOSTAS (reduz tamanho em ~70%)
app.use(compressionMiddleware);

app.use(cors({
  origin: CORS_ORIGINS.length === 1 ? CORS_ORIGINS[0] : CORS_ORIGINS,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

const activeTokens = {};

// =======================
// 🔐 PASSWORD TOKEN HELPERS
// =======================
// Armazenar tokens de senha (em produção, usar Redis ou banco)
const passwordTokens = {};

// Função para gerar token de senha para assinante
function generatePasswordTokenForSubscriber(subscriberEmail, subscriberId = null) {
  // Gerar token único
  const token = crypto.randomBytes(32).toString('hex');
  
  // Expira em 5 minutos
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  
  // Armazenar token em memória
  const key = subscriberId || subscriberEmail;
  passwordTokens[key] = {
    token,
    email: subscriberEmail,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString()
  };
  
  console.log('🔑 [generateToken] Token gerado e armazenado em memória:', {
    key,
    email: subscriberEmail,
    token: token.substring(0, 20) + '...',
    expires_at: expiresAt.toISOString()
  });
  
  // Também salvar token no assinante no banco de dados (JSON apenas, PostgreSQL é salvo depois)
  if (db && db.subscribers) {
    const subscriberIndex = db.subscribers.findIndex(s => {
      if (subscriberId) {
        return s.id === subscriberId || s.id === String(subscriberId) || String(s.id) === String(subscriberId);
      }
      return s.email === subscriberEmail || s.email?.toLowerCase() === subscriberEmail?.toLowerCase();
    });
    
    if (subscriberIndex >= 0) {
      db.subscribers[subscriberIndex].password_token = token;
      db.subscribers[subscriberIndex].token_expires_at = expiresAt.toISOString();
      db.subscribers[subscriberIndex].updated_at = new Date().toISOString();
      
      console.log('💾 [generateToken] Token salvo no assinante (JSON):', {
        index: subscriberIndex,
        email: db.subscribers[subscriberIndex].email,
        id: db.subscribers[subscriberIndex].id,
        token: token.substring(0, 20) + '...',
        expires_at: expiresAt.toISOString()
      });
      
      // Salvar imediatamente (não usar debounce aqui para garantir que seja salvo)
      if (saveDatabaseDebounced) {
        saveDatabaseDebounced(db);
      }
    } else {
      console.warn('⚠️ [generateToken] Assinante não encontrado para salvar token:', { 
        subscriberId, 
        subscriberEmail,
        totalSubscribers: db.subscribers.length,
        subscribers: db.subscribers.map(s => ({ id: s.id, email: s.email }))
      });
    }
  }
  
  // Gerar URL de setup
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const setup_url = `${FRONTEND_URL}/definir-senha?token=${token}&email=${encodeURIComponent(subscriberEmail)}`;
  
  console.log('🔑 [generateToken] Token de senha gerado para:', subscriberEmail, 'Expira em:', expiresAt.toISOString());
  
  return {
    token,
    setup_url,
    expires_at: expiresAt.toISOString()
  };
}

// =======================
// 🔐 AUTH HELPERS
// =======================
const getToken = req =>
  req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/api/health',
  '/api/upload-image',
  '/api/auth/login',
  '/api/auth/set-password',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/public/cardapio'  // /api/public/cardapio/:slug — link único do cardápio por assinante
];

const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

const authenticate = async (req, res, next) => {
  // Rotas públicas não precisam de autenticação
  if (isPublicRoute(req.path)) {
    return next();
  }

  const token = getToken(req);
  
  // Se não tem token, usar usuário padrão (modo desenvolvimento)
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      // Em desenvolvimento, permitir sem token
      if (usePostgreSQL) {
        req.user = await repo.getUserByEmail('admin@digimenu.com');
      } else if (db && db.users && db.users.length > 0) {
        req.user = db.users[0];
      } else {
        return res.status(401).json({ error: 'Usuário padrão não encontrado' });
      }
      return next();
    }
    // Em produção, retornar erro se não tiver token
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  // Tentar validar JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user;
    if (usePostgreSQL) {
      user = await repo.getUserByEmail(decoded.email);
      if (!user) {
        user = await repo.getUserByEmail('admin@digimenu.com');
      }
    } else if (db && db.users) {
      user = db.users.find(u => u.email === decoded.email) || db.users[0];
    } else {
      return res.status(401).json({ error: 'Banco de dados não inicializado' });
    }
    req.user = user;
    return next();
  } catch (error) {
    // JWT inválido - tentar método alternativo (buscar em activeTokens)
    const email = activeTokens[token];
    if (email) {
      let user;
      if (usePostgreSQL) {
        user = await repo.getUserByEmail(email);
        if (!user) {
          user = await repo.getUserByEmail('admin@digimenu.com');
        }
      } else if (db && db.users) {
        user = db.users.find(u => u.email === email) || db.users[0];
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
      if (usePostgreSQL) {
        user = await repo.getUserByEmail(email);
        
        if (!user) {
          // Criar novo usuário
          user = await repo.createUser({
            email: email.toLowerCase(),
            full_name: name,
            role: 'user',
            is_master: false,
            google_id: googleId,
            google_photo: photo
          });
        } else if (!user.google_id) {
          // Atualizar usuário existente com dados do Google
          user = await repo.updateUser(user.id, {
            google_id: googleId,
            google_photo: photo
          });
        }
      } else if (db && db.users) {
        user = db.users.find(u => u.email === email.toLowerCase());
        
        if (!user) {
          // Criar novo usuário
          const newUser = {
            id: Date.now().toString(),
            email: email.toLowerCase(),
            full_name: name,
            role: 'user',
            is_master: false,
            google_id: googleId,
            google_photo: photo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(newUser);
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

  console.log('✅ Google OAuth configurado');
} else {
  console.log('⚠️ Google OAuth não configurado (GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não definidos)');
}

// =======================
// 🔐 AUTHENTICATION
// =======================
app.post('/api/auth/login', loginLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 [login] Tentativa de login para:', email?.toLowerCase());

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco
    const emailLower = email.toLowerCase().trim();
    console.log('🔍 [login] Buscando usuário com email:', emailLower);
    
    let user;
    if (usePostgreSQL) {
      user = await repo.getUserByEmail(emailLower);
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
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    console.log('✅ [login] Usuário encontrado:', {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    console.log('✅ [login] Usuário encontrado:', {
      email: user.email,
      hasPassword: !!user.password,
      hasPasswordHash: !!user.password && user.password.startsWith('$2')
    });

    // ✅ SEMPRE usar bcrypt para verificar senhas
    if (user.password) {
      try {
        // Tentar comparar com bcrypt primeiro
        const isValid = await bcrypt.compare(password, user.password);
        
        if (isValid) {
          console.log('✅ [login] Login bem-sucedido para:', user.email);
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
      } catch (bcryptError) {
        // Se bcrypt falhar, pode ser senha antiga sem hash
        // Neste caso, hash a senha antiga e atualize no banco
        console.warn('⚠️ [login] Senha sem hash detectada, atualizando...');
        
        // Verificar se a senha antiga (texto plano) corresponde
        if (user.password === password) {
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
    return res.json({
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      is_master: req.user.is_master,
      role: req.user.role,
      subscriber_email: req.user.subscriber_email || null,
      profile_role: req.user.profile_role || null
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

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

// -----------------------
// Colaboradores (Premium/Pro): perfis limitados Entregador, Cozinha, PDV
// -----------------------
const COLAB_ROLES = ['entregador', 'cozinha', 'pdv'];

async function getOwnerAndSubscriber(req) {
  const owner = (req.query.as_subscriber || req.user?._contextForSubscriber || req.user?.subscriber_email || req.user?.email || '').toString().toLowerCase().trim();
  let subscriber = null;
  if (usePostgreSQL) {
    subscriber = await repo.getSubscriberByEmail(owner);
  } else if (db?.subscribers) {
    subscriber = db.subscribers.find(s => (s.email || '').toLowerCase().trim() === owner) || null;
  }
  return { owner, subscriber };
}

function canUseColaboradores(subscriber, isMaster) {
  if (isMaster && subscriber) {
    const p = (subscriber.plan || '').toLowerCase();
    return p === 'premium' || p === 'pro';
  }
  if (!subscriber) return false;
  const p = (subscriber.plan || '').toLowerCase();
  return p === 'premium' || p === 'pro';
}

// =======================
// 🔗 CARDÁPIO PÚBLICO POR LINK (slug) — cada assinante tem seu link ex: /s/meu-restaurante
// =======================
app.get('/api/public/cardapio/:slug', asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Cardápio por link requer PostgreSQL. Configure DATABASE_URL.' });
  }
  const slug = (req.params.slug || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(400).json({ error: 'Slug inválido' });
  const subscriber = await repo.getSubscriberBySlug(slug);
  if (!subscriber) return res.status(404).json({ error: 'Link não encontrado' });
  const se = subscriber.email;
  const [
    storeList,
    dishes,
    categories,
    complementGroups,
    pizzaSizes,
    pizzaFlavors,
    pizzaEdges,
    pizzaExtras,
    deliveryZones,
    coupons,
    promotions
  ] = await Promise.all([
    repo.listEntitiesForSubscriber('Store', se, null),
    repo.listEntitiesForSubscriber('Dish', se, 'order'),
    repo.listEntitiesForSubscriber('Category', se, 'order'),
    repo.listEntitiesForSubscriber('ComplementGroup', se, 'order'),
    repo.listEntitiesForSubscriber('PizzaSize', se, 'order'),
    repo.listEntitiesForSubscriber('PizzaFlavor', se, 'order'),
    repo.listEntitiesForSubscriber('PizzaEdge', se, null),
    repo.listEntitiesForSubscriber('PizzaExtra', se, null),
    repo.listEntitiesForSubscriber('DeliveryZone', se, null),
    repo.listEntitiesForSubscriber('Coupon', se, null),
    repo.listEntitiesForSubscriber('Promotion', se, null)
  ]);
  const store = Array.isArray(storeList) && storeList[0] ? storeList[0] : { name: 'Loja', is_open: true };
  res.json({
    store,
    dishes: Array.isArray(dishes) ? dishes : [],
    categories: Array.isArray(categories) ? categories : [],
    complementGroups: Array.isArray(complementGroups) ? complementGroups : [],
    pizzaSizes: Array.isArray(pizzaSizes) ? pizzaSizes : [],
    pizzaFlavors: Array.isArray(pizzaFlavors) ? pizzaFlavors : [],
    pizzaEdges: Array.isArray(pizzaEdges) ? pizzaEdges : [],
    pizzaExtras: Array.isArray(pizzaExtras) ? pizzaExtras : [],
    deliveryZones: Array.isArray(deliveryZones) ? deliveryZones : [],
    coupons: Array.isArray(coupons) ? coupons : [],
    promotions: Array.isArray(promotions) ? promotions : []
  });
}));

app.get('/api/colaboradores', authenticate, async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Premium e Pro' });
    }
    let list = [];
    if (usePostgreSQL && repo.listColaboradores) {
      list = await repo.listColaboradores(owner);
    } else if (db?.users) {
      list = db.users
        .filter(u => (u.subscriber_email || '').toLowerCase().trim() === owner && (u.profile_role || '').trim())
        .map(u => ({ id: u.id, email: u.email, full_name: u.full_name, profile_role: u.profile_role, created_at: u.created_at, updated_at: u.updated_at }));
    }
    return res.json(list);
  } catch (e) {
    console.error('GET /api/colaboradores:', e);
    return res.status(500).json({ error: e?.message || 'Erro ao listar colaboradores' });
  }
});

app.post('/api/colaboradores', authenticate, validate(schemas.createColaborador), createLimiter, asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Premium e Pro' });
    }
    const { name, email, password, role } = req.body || {};
    const roleNorm = (role || '').toLowerCase().trim();
    if (!COLAB_ROLES.includes(roleNorm)) return res.status(400).json({ error: 'Perfil inválido. Use: entregador, cozinha ou pdv' });
    if (!(email && String(email).trim())) return res.status(400).json({ error: 'Email é obrigatório' });
    if (!(password && String(password).length >= 6)) return res.status(400).json({ error: 'Senha com no mínimo 6 caracteres' });
    const emailNorm = String(email).toLowerCase().trim();

    let existing = usePostgreSQL ? await repo.getUserByEmail(emailNorm) : db?.users?.find(u => (u.email || '').toLowerCase().trim() === emailNorm);
    if (existing) return res.status(400).json({ error: 'Este email já está em uso' });

    const hashed = await bcrypt.hash(String(password), 10);
    const userData = {
      email: emailNorm,
      full_name: (name || emailNorm.split('@')[0] || '').trim() || 'Colaborador',
      password: hashed,
      is_master: false,
      role: 'user',
      subscriber_email: owner,
      profile_role: roleNorm
    };

    let created;
    if (usePostgreSQL) {
      created = await repo.createUser(userData);
    } else if (db?.users) {
      created = {
        id: String(Date.now()),
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.users.push(created);
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco não disponível' });
    }
    const out = { id: created.id, email: created.email, full_name: created.full_name, profile_role: created.profile_role, created_at: created.created_at, updated_at: created.updated_at };
    return res.status(201).json(out);
  } catch (e) {
    console.error('POST /api/colaboradores:', sanitizeForLog({ error: e?.message }));
    throw e;
  }
}));

app.patch('/api/colaboradores/:id', authenticate, asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Premium e Pro' });
    const { name, role, newPassword } = req.body || {};
    const id = req.params.id;

    let u = null;
    if (usePostgreSQL) {
      const all = await repo.listColaboradores(owner);
      u = all.find(x => String(x.id) === String(id)) || null;
    } else if (db?.users) {
      u = db.users.find(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
    }
    if (!u) return res.status(404).json({ error: 'Colaborador não encontrado' });

    const up = {};
    if (name !== undefined) up.full_name = String(name).trim() || u.full_name;
    if (role !== undefined) {
      const r = String(role).toLowerCase().trim();
      if (COLAB_ROLES.includes(r)) up.profile_role = r;
    }
    if (newPassword !== undefined && String(newPassword).length >= 6) up.password = await bcrypt.hash(String(newPassword), 10);

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
    if (!canUseColaboradores(subscriber, req.user?.is_master)) return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Premium e Pro' });
    const id = req.params.id;

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

// =======================
// 🖼️ IMAGE UPLOAD
// =======================
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  console.log('📥 UPLOAD RECEBIDO');
  console.log('Query params:', req.query);
  console.log('Arquivo recebido:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'NENHUM ARQUIVO');
  
  if (!req.file) {
    console.error('❌ Nenhum arquivo recebido');
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }

  try {
    // Obter pasta do query string ou usar padrão
    const folder = req.query.folder || 'dishes';
    console.log('📁 Pasta do Cloudinary:', folder);
    
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary error:', error);
          console.error('Detalhes:', JSON.stringify(error, null, 2));
          return res.status(500).json({ 
            error: 'Erro ao enviar imagem para Cloudinary',
            details: error.message 
          });
        }
        console.log('✅ Upload concluído:', result.secure_url);
        res.json({ url: result.secure_url });
      }
    );
    stream.end(req.file.buffer);
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno no servidor',
      details: error.message 
    });
  }
});

// =======================
// 📦 ENTITIES (CRUD GENÉRICO)
// =======================
// Listar entidades
app.get('/api/entities/:entity', authenticate, asyncHandler(async (req, res) => {
  try {
    const { entity } = req.params;
    const { order_by, as_subscriber, page, limit, ...filters } = req.query;

    // Modo suporte: master atuando em nome de um assinante (só em Assinantes > Ver dados completos)
    if (req.user?.is_master && as_subscriber) {
      req.user._contextForSubscriber = as_subscriber;
    }

    // ✅ PAGINAÇÃO
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50
    };

    let result;
    if (usePostgreSQL) {
      if (!req.user?.is_master && !filters.owner_email) {
        const subscriber = await repo.getSubscriberByEmail(req.user.email);
        if (subscriber) filters.owner_email = subscriber.email;
      }
      result = await repo.listEntities(entity, filters, order_by, req.user, pagination);
    } else if (db && db.entities) {
      let items = db.entities[entity] || [];

      if (req.user?.is_master && as_subscriber) {
        items = items.filter(item => item.owner_email === as_subscriber);
      } else if (req.user?.is_master) {
        items = items.filter(item => !item.owner_email);
      } else {
        const subscriber = db.subscribers?.find(s => s.email === req.user.email);
        if (subscriber) {
          items = items.filter(item => !item.owner_email || item.owner_email === subscriber.email);
        } else {
          items = [];
        }
      }

      // Aplicar filtros adicionais
      if (Object.keys(filters).length > 0) {
        items = items.filter(item => {
          return Object.entries(filters).every(([key, value]) => {
            if (value === 'null' || value === null) {
              return item[key] === null || item[key] === undefined;
            }
            return item[key] == value;
          });
        });
      }

      // Ordenar
      if (order_by) {
        items.sort((a, b) => {
          const aVal = a[order_by];
          const bVal = b[order_by];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        });
      }
      
      // ✅ PAGINAÇÃO (fallback JSON)
      const total = items.length;
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      const paginatedItems = items.slice(start, end);
      const totalPages = Math.ceil(total / pagination.limit);
      
      result = {
        items: paginatedItems,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
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

// Obter entidade por ID
app.get('/api/entities/:entity/:id', authenticate, async (req, res) => {
  try {
    const { entity, id } = req.params;
    const asSub = req.query.as_subscriber;
    if (req.user?.is_master && asSub) req.user._contextForSubscriber = asSub;

    let item;
    if (usePostgreSQL) {
      item = await repo.getEntityById(entity, id, req.user);
    } else if (db?.entities?.[entity]) {
      const arr = db.entities[entity];
      item = arr.find(i => (i.id === id || i.id === String(id)) && (!asSub || i.owner_email === asSub)) || null;
    } else {
      item = null;
    }

    if (!item) return res.status(404).json({ error: 'Entidade não encontrada' });
    res.json(item);
  } catch (error) {
    console.error('Erro ao obter entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar entidade
app.post('/api/entities/:entity', authenticate, async (req, res) => {
  try {
    const { entity } = req.params;
    let data = { ...req.body };
    const asSub = data.as_subscriber || req.query.as_subscriber;
    let createOpts = {};

    if (req.user?.is_master && asSub) {
      req.user._contextForSubscriber = asSub;
      delete data.as_subscriber;
      data.owner_email = asSub;
    }

    if (!req.user?.is_master) {
      const subEmail = req.user?.subscriber_email || req.user?.email;
      const subscriber = usePostgreSQL ? await repo.getSubscriberByEmail(subEmail) : db?.subscribers?.find(s => (s.email || '').toLowerCase() === (subEmail || '').toLowerCase());
      if (subscriber) {
        if (!data.owner_email) data.owner_email = subscriber.email;
        createOpts.forSubscriberEmail = subscriber.email;
      }
    }

    let newItem;
    if (usePostgreSQL) {
      newItem = await repo.createEntity(entity, data, req.user, createOpts);
    } else if (db && db.entities) {
      if (!db.entities[entity]) db.entities[entity] = [];
      newItem = {
        id: String(Date.now()),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.entities[entity].push(newItem);
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }

    console.log(`✅ [${entity}] Item criado:`, newItem.id, asSub ? `(suporte: ${asSub})` : (req.user?.is_master ? '(master)' : `(owner: ${data.owner_email})`));
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Erro ao criar entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Atualizar entidade
app.put('/api/entities/:entity/:id', authenticate, async (req, res) => {
  try {
    const { entity, id } = req.params;
    let data = req.body;
    const asSub = req.query.as_subscriber;
    if (req.user?.is_master && asSub) req.user._contextForSubscriber = asSub;

    // Subscriber fica na tabela subscribers, não em entities — rotear para repo.updateSubscriber
    if (String(entity).toLowerCase() === 'subscriber') {
      try {
        const idVal = /^\d+$/.test(String(id)) ? parseInt(id, 10) : id;
        let updated;
        if (usePostgreSQL) {
          updated = await repo.updateSubscriber(idVal, data);
        } else if (db && db.subscribers) {
          const idx = db.subscribers.findIndex(s => s.id == idVal || String(s.id) === String(idVal));
          if (idx === -1) return res.status(404).json({ error: 'Assinante não encontrado' });
          const existing = db.subscribers[idx];
          const toMerge = { ...data };
          if (data.send_whatsapp_commands !== undefined) toMerge.whatsapp_auto_enabled = !!data.send_whatsapp_commands;
          const merged = { ...existing, ...toMerge, id: existing.id, updated_at: new Date().toISOString() };
          db.subscribers[idx] = merged;
          if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
          updated = merged;
        } else {
          return res.status(404).json({ error: 'Assinante não encontrado' });
        }
        if (!updated) return res.status(404).json({ error: 'Assinante não encontrado' });
        const out = { ...updated, send_whatsapp_commands: updated.whatsapp_auto_enabled };
        console.log('✅ [Subscriber] Assinante atualizado (PUT entities):', id);
        return res.json(out);
      } catch (e) {
        console.error('Erro ao atualizar assinante (PUT entities/Subscriber):', e);
        return res.status(500).json({ error: 'Erro interno no servidor' });
      }
    }

    // MULTI-TENANCY: Verificar se assinante pode atualizar apenas seus próprios dados
    if (!req.user?.is_master && db && db.entities && db.entities[entity]) {
      const item = db.entities[entity].find(i => i.id === id);
      if (item && item.owner_email && item.owner_email !== req.user.email) {
        // Verificar se o usuário é o dono via assinante
        const subscriber = db.subscribers?.find(s => s.email === req.user.email);
        if (!subscriber || item.owner_email !== subscriber.email) {
          return res.status(403).json({ error: 'Você não tem permissão para atualizar este item' });
        }
      }
    }
    
    let updatedItem;
    if (usePostgreSQL) {
      updatedItem = await repo.updateEntity(entity, id, data, req.user);
      if (!updatedItem) {
        return res.status(404).json({ error: 'Entidade não encontrada' });
      }
    } else if (db && db.entities) {
      const items = db.entities[entity] || [];
      const index = items.findIndex(i => (i.id === id || i.id === String(id)) && (!asSub || i.owner_email === asSub));
      if (index === -1) return res.status(404).json({ error: 'Entidade não encontrada' });
      if (!data.owner_email) data = { ...data, owner_email: items[index].owner_email };
      updatedItem = { ...items[index], ...data, id: items[index].id, updated_at: new Date().toISOString() };
      items[index] = updatedItem;
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    console.log(`✅ [${entity}] Item atualizado:`, id, asSub ? `(suporte: ${asSub})` : '');
    res.json(updatedItem);
  } catch (error) {
    console.error('Erro ao atualizar entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Deletar entidade
app.delete('/api/entities/:entity/:id', authenticate, async (req, res) => {
  try {
    const { entity, id } = req.params;
    const asSub = req.query.as_subscriber;
    if (req.user?.is_master && asSub) req.user._contextForSubscriber = asSub;

    let deleted = false;
    if (usePostgreSQL) {
      deleted = await repo.deleteEntity(entity, id, req.user);
    } else if (db && db.entities) {
      const items = db.entities[entity] || [];
      const index = items.findIndex(i => (i.id === id || i.id === String(id)) && (!asSub || i.owner_email === asSub));
      if (index === -1) return res.status(404).json({ error: 'Entidade não encontrada' });
      items.splice(index, 1);
      deleted = true;
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    if (!deleted) return res.status(404).json({ error: 'Entidade não encontrada' });
    console.log(`✅ [${entity}] Item deletado:`, id, asSub ? `(suporte: ${asSub})` : '');
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar múltiplas entidades
app.post('/api/entities/:entity/bulk', authenticate, async (req, res) => {
  try {
    const { entity } = req.params;
    const { items: itemsToCreate } = req.body;
    
    let newItems;
    if (usePostgreSQL) {
      newItems = await repo.createEntitiesBulk(entity, itemsToCreate, req.user);
    } else if (db && db.entities) {
      if (!db.entities[entity]) {
        db.entities[entity] = [];
      }
      
      newItems = itemsToCreate.map(data => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      db.entities[entity].push(...newItems);
      if (saveDatabaseDebounced) {
        saveDatabaseDebounced(db);
      }
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    
    console.log(`✅ [${entity}] ${newItems.length} itens criados`);
    res.status(201).json(newItems);
  } catch (error) {
    console.error('Erro ao criar entidades em bulk:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Atualizar assinante por ID (PATCH parcial) — evita rota entities/Subscriber
app.put('/api/subscribers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;
    const idVal = /^\d+$/.test(String(id)) ? parseInt(id, 10) : id;

    // Assinante só pode alterar o próprio — e apenas o campo slug (link do cardápio)
    if (!req.user?.is_master) {
      let sub = null;
      if (usePostgreSQL && repo.getSubscriberById) sub = await repo.getSubscriberById(idVal);
      else if (db?.subscribers) sub = db.subscribers.find(s => s.id == idVal || String(s.id) === String(idVal));
      if (!sub) return res.status(404).json({ error: 'Assinante não encontrado' });
      const own = (s) => (s || '').toLowerCase() === (req.user?.subscriber_email || req.user?.email || '').toLowerCase();
      if (!own(sub.email)) return res.status(403).json({ error: 'Só é possível editar seu próprio link' });
      data = { slug: data.slug };
    }

    let updated;
    if (usePostgreSQL) {
      updated = await repo.updateSubscriber(idVal, data);
    } else if (db && db.subscribers) {
      const idx = db.subscribers.findIndex(s => s.id == idVal || String(s.id) === String(idVal));
      if (idx === -1) return res.status(404).json({ error: 'Assinante não encontrado' });
      const existing = db.subscribers[idx];
      const toMerge = { ...data };
      if (data.send_whatsapp_commands !== undefined) toMerge.whatsapp_auto_enabled = !!data.send_whatsapp_commands;
      const merged = { ...existing, ...toMerge, id: existing.id, updated_at: new Date().toISOString() };
      db.subscribers[idx] = merged;
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
      updated = merged;
    } else {
      return res.status(404).json({ error: 'Assinante não encontrado' });
    }
    if (!updated) return res.status(404).json({ error: 'Assinante não encontrado' });
    const out = { ...updated, send_whatsapp_commands: updated.whatsapp_auto_enabled };
    console.log('✅ [PUT /subscribers/:id] Assinante atualizado:', id);
    return res.json(out);
  } catch (e) {
    console.error('Erro em PUT /api/subscribers/:id:', e);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// =======================
// 🔧 FUNCTIONS (FUNÇÕES CUSTOMIZADAS)
// =======================
app.post('/api/functions/:name', authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    const data = req.body;
    
    console.log(`🔧 Função chamada: ${name}`, data);
    
    // Funções de assinantes
    if (name === 'getSubscribers') {
      // Apenas master pode ver todos os assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        const subscribers = usePostgreSQL 
          ? await repo.listSubscribers()
          : (db && db.subscribers ? db.subscribers : []);
        
        console.log('📋 [BACKEND] getSubscribers - Retornando', subscribers.length, 'assinantes');
        console.log('📋 [BACKEND] getSubscribers - IDs:', subscribers.map(s => s.id || s.email));
        
        // Garantir que todos os assinantes retornados têm setup_url se tiverem token
        const subscribersWithTokens = subscribers.map(sub => {
          // Se não tiver setup_url mas tiver password_token, construir
          if (!sub.setup_url && sub.password_token) {
            const baseUrl = FRONTEND_URL || 'http://localhost:5173';
            sub.setup_url = `${baseUrl}/definir-senha?token=${sub.password_token}`;
          }
          return sub;
        });
        
        return res.json({ data: { subscribers: subscribersWithTokens } });
      } catch (error) {
        console.error('❌ [BACKEND] Erro em getSubscribers:', error);
        return res.status(500).json({ error: 'Erro ao buscar assinantes', details: error.message });
      }
    }
    
    if (name === 'getPlanInfo') {
      const { plan } = data;
      const planInfo = getPlanInfo(plan);
      return res.json({ data: planInfo });
    }
    
    if (name === 'getAvailablePlans') {
      const { getAvailablePlans } = await import('./utils/plans.js');
      const plans = getAvailablePlans();
      const plansInfo = plans.map(plan => getPlanInfo(plan));
      return res.json({ data: plansInfo });
    }
    
    if (name === 'createSubscriber') {
      // Apenas master pode criar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Validar plano
      const validPlans = ['basic', 'premium', 'pro', 'admin', 'custom'];
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
    
    if (name === 'updateSubscriber') {
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
        const validPlans = ['basic', 'premium', 'pro', 'admin', 'custom'];
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
      
      const subscriber = usePostgreSQL
        ? await repo.getSubscriberByEmail(data.user_email)
        : (db && db.subscribers ? db.subscribers.find(s => s.email?.toLowerCase() === data.user_email?.toLowerCase()) : null);
      
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
        let store = null;
        
        if (usePostgreSQL) {
          const se = subscriber.email;
          dishes = await repo.listEntitiesForSubscriber('Dish', se, null);
          categories = await repo.listEntitiesForSubscriber('Category', se, 'order');
          complement_groups = await repo.listEntitiesForSubscriber('ComplementGroup', se, 'order');
          combos = await repo.listEntitiesForSubscriber('Combo', se, null);
          orders = await repo.listEntitiesForSubscriber('Order', se, '-created_date');
          caixas = await repo.listEntitiesForSubscriber('Caixa', se, null);
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
          const stores = (db.entities.Store || []).filter(e => e.owner_email === subscriber.email || !e.owner_email);
          store = stores[0] || null;
        }
        
        // Calcular estatísticas
        const stats = {
          total_dishes: dishes.length,
          total_orders: orders.length,
          total_revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0),
          active_caixas: caixas.filter(c => c.status === 'open').length
        };
        
        console.log('✅ [getFullSubscriberProfile] Perfil completo gerado:', {
          subscriber: subscriber.email,
          dishes: stats.total_dishes,
          orders: stats.total_orders,
          revenue: stats.total_revenue
        });
        
        return res.json({
          data: { dishes, categories, complement_groups, combos, orders, caixas, store },
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
// ✅ TRATAMENTO DE ERROS (deve ser o último middleware)
// =======================
app.use(errorHandler);

// =======================
// 🚀 START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 http://localhost:${PORT}/api`);
  console.log(`🔒 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Modo produção ativo');
  } else {
    console.log('⚠️ Modo desenvolvimento - algumas proteções estão desabilitadas');
  }
});
