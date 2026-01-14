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
// 🗃️ DATABASE (MEMÓRIA)
// =======================
const db = {
  users: [
    {
      id: '1',
      email: 'admin@digimenu.com',
      full_name: 'Administrador',
      is_master: true,
      role: 'admin',
      password: 'admin123'
    }
  ],
  customers: [],
  entities: {},
  subscribers: [],
  passwordTokens: {}
};

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
