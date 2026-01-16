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

import cloudinary from './config/cloudinary.js';
import { upload } from './middlewares/upload.js';

// =======================
// ⚙️ APP SETUP
// =======================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// =======================
// 🧱 MIDDLEWARES
// =======================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =======================
// 🗃️ DATABASE (PERSISTENTE)
// =======================
import { loadDatabase, saveDatabase, saveDatabaseDebounced } from './db/persistence.js';

// Carregar dados do arquivo ao iniciar
const db = loadDatabase();

// Garantir que o usuário admin sempre existe
if (!db.users.find(u => u.email === 'admin@digimenu.com')) {
  db.users.push({
    id: '1',
    email: 'admin@digimenu.com',
    full_name: 'Administrador',
    is_master: true,
    role: 'admin',
    password: 'admin123'
  });
  saveDatabase(db);
}

// Salvar dados periodicamente (a cada 30 segundos) e ao encerrar
setInterval(() => {
  saveDatabase(db);
}, 30000);

// Salvar ao encerrar o processo
process.on('SIGTERM', () => {
  console.log('💾 Salvando banco de dados antes de encerrar...');
  saveDatabase(db);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('💾 Salvando banco de dados antes de encerrar...');
  saveDatabase(db);
  process.exit(0);
});

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
  '/api/auth/login'
];

const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

const authenticate = (req, res, next) => {
  // Rotas públicas não precisam de autenticação
  if (isPublicRoute(req.path)) {
    return next();
  }

  const token = getToken(req);
  
  // Se não tem token, usar usuário padrão (modo desenvolvimento)
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      // Em desenvolvimento, permitir sem token
      req.user = db.users[0];
      return next();
    }
    // Em produção, retornar erro se não tiver token
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  // Tentar validar JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.find(u => u.email === decoded.email) || db.users[0];
    req.user = user;
    return next();
  } catch (error) {
    // JWT inválido - tentar método alternativo (buscar em activeTokens)
    const email = activeTokens[token];
    if (email) {
      const user = db.users.find(u => u.email === email) || db.users[0];
      req.user = user;
      return next();
    }
    
    // Se não encontrou em activeTokens e está em desenvolvimento, usar padrão
    if (process.env.NODE_ENV !== 'production') {
      // Apenas logar em desenvolvimento
      console.warn('⚠️ JWT inválido, usando usuário padrão (dev mode)');
      req.user = db.users[0];
      return next();
    }
    
    // Em produção, retornar erro
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

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
    const user = db.users.find(u => u.email === email.toLowerCase());

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
app.get('/api/entities/:entity', authenticate, (req, res) => {
  try {
    const { entity } = req.params;
    const { order_by, ...filters } = req.query;
    
    let items = db.entities[entity] || [];
    
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
    
    res.json(items);
  } catch (error) {
    console.error('Erro ao listar entidades:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Obter entidade por ID
app.get('/api/entities/:entity/:id', authenticate, (req, res) => {
  try {
    const { entity, id } = req.params;
    const items = db.entities[entity] || [];
    const item = items.find(i => i.id === id);
    
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
app.post('/api/entities/:entity', authenticate, (req, res) => {
  try {
    const { entity } = req.params;
    const data = req.body;
    
    if (!db.entities[entity]) {
      db.entities[entity] = [];
    }
    
    const newItem = {
      id: Date.now().toString(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.entities[entity].push(newItem);
    saveDatabaseDebounced(db); // Salvar após criar
    
    console.log(`✅ [${entity}] Item criado:`, newItem.id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Erro ao criar entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Atualizar entidade
app.put('/api/entities/:entity/:id', authenticate, (req, res) => {
  try {
    const { entity, id } = req.params;
    const data = req.body;
    const items = db.entities[entity] || [];
    const index = items.findIndex(i => i.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entidade não encontrada' });
    }
    
    items[index] = {
      ...items[index],
      ...data,
      id,
      updated_at: new Date().toISOString()
    };
    
    console.log(`✅ [${entity}] Item atualizado:`, id);
    res.json(items[index]);
  } catch (error) {
    console.error('Erro ao atualizar entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Deletar entidade
app.delete('/api/entities/:entity/:id', authenticate, (req, res) => {
  try {
    const { entity, id } = req.params;
    const items = db.entities[entity] || [];
    const index = items.findIndex(i => i.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entidade não encontrada' });
    }
    
    items.splice(index, 1);
    saveDatabaseDebounced(db); // Salvar após deletar
    
    console.log(`✅ [${entity}] Item deletado:`, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar entidade:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar múltiplas entidades
app.post('/api/entities/:entity/bulk', authenticate, (req, res) => {
  try {
    const { entity } = req.params;
    const { items: itemsToCreate } = req.body;
    
    if (!db.entities[entity]) {
      db.entities[entity] = [];
    }
    
    const newItems = itemsToCreate.map(data => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    db.entities[entity].push(...newItems);
    saveDatabaseDebounced(db); // Salvar após criar em bulk
    
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
    
    // Aqui você pode implementar funções específicas
    // Por enquanto, retorna um mock
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
