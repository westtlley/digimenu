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

import cloudinary from './config/cloudinary.js';
import { upload } from './middlewares/upload.js';
import { testConnection } from './db/postgres.js';
import { migrate } from './db/migrate.js';
import * as repo from './db/repository.js';
import { requirePermission, requireAccess, requireMaster } from './middlewares/permissions.js';
import { PLANS, getPlanInfo } from './utils/plans.js';

// =======================
// ⚙️ APP SETUP
// =======================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// =======================
// 🧱 MIDDLEWARES
// =======================
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  '/api/auth/google',
  '/api/auth/google/callback'
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco
    let user;
    if (usePostgreSQL) {
      user = await repo.getUserByEmail(email.toLowerCase());
    } else if (db && db.users) {
      user = db.users.find(u => u.email === email.toLowerCase());
    } else {
      return res.status(401).json({ error: 'Banco de dados não inicializado' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha (em produção, usar bcrypt)
    // Por enquanto, aceita qualquer senha para admin@digimenu.com
    if (user.email === 'admin@digimenu.com' && password === 'admin123') {
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

      // Retornar token e dados do usuário
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          is_master: user.is_master,
          role: user.role
        }
      });
    }

    // Para outros usuários, verificar senha com bcrypt
    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) {
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
            role: user.role
          }
        });
      }
    }

    return res.status(401).json({ error: 'Credenciais inválidas' });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    return res.json({
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      is_master: req.user.is_master,
      role: req.user.role
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

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
app.get('/api/entities/:entity', authenticate, async (req, res) => {
  try {
    const { entity } = req.params;
    const { order_by, ...filters } = req.query;
    
    let items;
    if (usePostgreSQL) {
      items = await repo.listEntities(entity, filters, order_by, req.user);
    } else if (db && db.entities) {
      items = db.entities[entity] || [];
      
      // Aplicar filtros
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
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    
    res.json(items);
  } catch (error) {
    console.error('Erro ao listar entidades:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Obter entidade por ID
app.get('/api/entities/:entity/:id', authenticate, async (req, res) => {
  try {
    const { entity, id } = req.params;
    
    let item;
    if (usePostgreSQL) {
      item = await repo.getEntityById(entity, id, req.user);
    } else {
      const items = db.entities[entity] || [];
      item = items.find(i => i.id === id);
    }
    
    if (!item) {
      return res.status(404).json({ error: 'Entidade não encontrada' });
    }
    
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
    const data = req.body;
    
    let newItem;
    if (usePostgreSQL) {
      newItem = await repo.createEntity(entity, data, req.user);
    } else if (db && db.entities) {
      if (!db.entities[entity]) {
        db.entities[entity] = [];
      }
      
      newItem = {
        id: Date.now().toString(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      db.entities[entity].push(newItem);
      if (saveDatabaseDebounced) {
        saveDatabaseDebounced(db);
      }
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    
    console.log(`✅ [${entity}] Item criado:`, newItem.id);
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
    const data = req.body;
    
    let updatedItem;
    if (usePostgreSQL) {
      updatedItem = await repo.updateEntity(entity, id, data, req.user);
      if (!updatedItem) {
        return res.status(404).json({ error: 'Entidade não encontrada' });
      }
    } else if (db && db.entities) {
      const items = db.entities[entity] || [];
      const index = items.findIndex(i => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'Entidade não encontrada' });
      }
      
      updatedItem = {
        ...items[index],
        ...data,
        id,
        updated_at: new Date().toISOString()
      };
      
      items[index] = updatedItem;
      if (saveDatabaseDebounced) {
        saveDatabaseDebounced(db);
      }
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    
    console.log(`✅ [${entity}] Item atualizado:`, id);
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
    
    let deleted = false;
    if (usePostgreSQL) {
      deleted = await repo.deleteEntity(entity, id, req.user);
    } else if (db && db.entities) {
      const items = db.entities[entity] || [];
      const index = items.findIndex(i => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'Entidade não encontrada' });
      }
      
      items.splice(index, 1);
      deleted = true;
      if (saveDatabaseDebounced) {
        saveDatabaseDebounced(db);
      }
    } else {
      return res.status(500).json({ error: 'Banco de dados não inicializado' });
    }
    
    if (!deleted) {
      return res.status(404).json({ error: 'Entidade não encontrada' });
    }
    
    console.log(`✅ [${entity}] Item deletado:`, id);
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
      
      const subscribers = usePostgreSQL 
        ? await repo.listSubscribers()
        : (db && db.subscribers ? db.subscribers : []);
      return res.json({ data: subscribers });
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
        const subscriber = usePostgreSQL
          ? await repo.createSubscriber(data)
          : (() => {
              const newSub = {
                id: Date.now().toString(),
                ...data,
                whatsapp_auto_enabled: data.whatsapp_auto_enabled !== undefined ? data.whatsapp_auto_enabled : true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              if (!db.subscribers) db.subscribers = [];
              db.subscribers.push(newSub);
              if (saveDatabaseDebounced) saveDatabaseDebounced(db);
              return newSub;
            })();
        return res.json({ data: subscriber });
      } catch (error) {
        console.error('Erro ao criar assinante:', error);
        return res.status(500).json({ 
          error: 'Erro ao criar assinante',
          details: error.message 
        });
      }
    }
    
    if (name === 'updateSubscriber') {
      // Apenas master pode atualizar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      // Validar plano se estiver sendo atualizado
      if (data.plan) {
        const validPlans = ['basic', 'premium', 'pro', 'admin', 'custom'];
        if (!validPlans.includes(data.plan)) {
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
      }
      
      try {
        const subscriber = usePostgreSQL
          ? await repo.updateSubscriber(data.email || data.id, data)
        : (() => {
            if (!db || !db.subscribers) {
              throw new Error('Banco de dados não inicializado');
            }
            const index = db.subscribers.findIndex(s => s.email === data.email);
            if (index === -1) return null;
            db.subscribers[index] = { ...db.subscribers[index], ...data, updated_at: new Date().toISOString() };
            if (saveDatabaseDebounced) saveDatabaseDebounced(db);
            return db.subscribers[index];
          })();
      return res.json({ data: subscriber });
    }
    
    if (name === 'deleteSubscriber') {
      // Apenas master pode deletar assinantes
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const subscriber = usePostgreSQL
        ? await repo.deleteSubscriber(data.email)
        : (() => {
            if (!db || !db.subscribers) {
              throw new Error('Banco de dados não inicializado');
            }
            const index = db.subscribers.findIndex(s => s.email === data.email);
            if (index === -1) return null;
            const deleted = db.subscribers.splice(index, 1)[0];
            if (saveDatabaseDebounced) saveDatabaseDebounced(db);
            return deleted;
          })();
      return res.json({ data: subscriber });
    }
    
    if (name === 'checkSubscriptionStatus') {
      const subscriber = usePostgreSQL
        ? await repo.getSubscriberByEmail(data.user_email)
        : (db && db.subscribers ? db.subscribers.find(s => s.email === data.user_email) : null);
      
      return res.json({
        data: {
          is_active: subscriber?.status === 'active',
          subscriber: subscriber || null
        }
      });
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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// =======================
// 🚀 START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 http://localhost:${PORT}/api`);
});
