import jwt from 'jsonwebtoken';
import * as repo from '../db/repository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/api/health',
  '/api/upload-image',
  '/api/auth/login',
  '/api/auth/me',
  '/api/auth/set-password',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/public/cardapio',
  '/api/entities/PaymentConfig',
  '/api/entities/MenuItem',
  '/api/entities/Category',
  '/api/entities/Subscriber',
  '/api/functions/registerCustomer', // Cadastro de clientes (público)
  '/api/lgpd/request', // Solicitação LGPD pode ser pública
];

const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

const extractTokenFromRequest = (req) => {
  return req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
};

export const authenticate = async (req, res, next) => {
  // Rotas públicas não precisam de autenticação
  if (isPublicRoute(req.path)) {
    const token = extractTokenFromRequest(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const usePostgreSQL = !!process.env.DATABASE_URL;
        let user;
        if (usePostgreSQL) {
          user = await repo.getLoginUserByEmail(decoded.email);
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
  
  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      // Em desenvolvimento, permitir sem token
      const usePostgreSQL = !!process.env.DATABASE_URL;
      if (usePostgreSQL) {
        req.user = await repo.getUserByEmail('admin@digimenu.com');
      }
      if (req.user) {
        return next();
      }
    }
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const usePostgreSQL = !!process.env.DATABASE_URL;
    let user;
    if (usePostgreSQL) {
      user = await repo.getLoginUserByEmail(decoded.email);
      if (!user) {
        user = await repo.getUserByEmail(decoded.email) || await repo.getUserByEmail('admin@digimenu.com');
      }
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
