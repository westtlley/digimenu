import jwt from 'jsonwebtoken';
import * as repo from '../db/repository.js';
import { getDb } from '../config/appConfig.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const usePostgreSQL = !!process.env.DATABASE_URL;
const DEV_AUTH_FALLBACK_FLAG = 'ALLOW_DEV_AUTH_FALLBACK';
const DEV_AUTH_FALLBACK_EMAIL = (process.env.DEV_AUTH_FALLBACK_EMAIL || 'admin@digimenu.com')
  .toLowerCase()
  .trim();

const publicRoutes = [
  '/api/health',
  '/api/upload-image',
  '/api/auth/login',
  '/api/auth/set-password',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/analytics/events',
  '/api/public/cardapio',
  '/api/public/login-info',
  '/api/public/pedido-cardapio',
  '/api/public/pedido-mesa',
  '/api/public/chat',
  '/api/public/assinar-config',
  '/api/entities/PaymentConfig',
  '/api/entities/MenuItem',
  '/api/entities/Category',
  '/api/entities/Subscriber',
  '/api/functions/registerCustomer',
  '/api/lgpd/request',
];

function normalizeLower(value = '') {
  return String(value || '').toLowerCase().trim();
}

export const isPublicRoute = (path = '') => {
  return publicRoutes.some((route) => String(path || '').startsWith(route));
};

export const extractTokenFromRequest = (req) => {
  return req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
};

function getRoleList(user = {}) {
  const fromArray = Array.isArray(user?.profile_roles)
    ? user.profile_roles.map((role) => normalizeLower(role)).filter(Boolean)
    : [];
  const fromSingle = normalizeLower(user?.profile_role);
  return [...new Set(fromSingle ? [fromSingle, ...fromArray] : fromArray)];
}

function buildCanonicalRequestUser(user = {}) {
  const profileRoles = getRoleList(user);
  const roles = [...new Set([
    normalizeLower(user?.role),
    ...profileRoles,
  ].filter(Boolean))];

  return {
    ...user,
    id: user?.id ?? null,
    email: user?.email ?? null,
    full_name: user?.full_name || user?.name || null,
    is_master: user?.is_master === true,
    role: user?.role || 'user',
    subscriber_id: user?.subscriber_id ?? null,
    subscriber_email: user?.subscriber_email || null,
    profile_role: user?.profile_role || profileRoles[0] || null,
    profile_roles: profileRoles,
    roles,
  };
}

function attachAuthenticatedUser(req, user, source, token = null) {
  req.user = buildCanonicalRequestUser(user);
  req.auth = {
    source,
    token_present: !!token,
    user_id: req.user.id,
    email: req.user.email,
    subscriber_id: req.user.subscriber_id,
    is_master: req.user.is_master,
  };
  return req.user;
}

function getJsonUsers() {
  const db = getDb();
  return Array.isArray(db?.users) ? db.users : [];
}

function selectBestUserMatch(users = []) {
  if (!Array.isArray(users) || users.length === 0) return null;
  return users.find((user) => normalizeLower(user?.profile_role)) || users[0] || null;
}

async function loadUserByEmail(email) {
  const normalizedEmail = normalizeLower(email);
  if (!normalizedEmail) return null;

  if (usePostgreSQL) {
    return (
      await repo.getLoginUserByEmail(normalizedEmail) ||
      await repo.getUserByEmail(normalizedEmail)
    );
  }

  const matches = getJsonUsers().filter(
    (user) => normalizeLower(user?.email) === normalizedEmail
  );
  return selectBestUserMatch(matches);
}

async function loadLocalDevFallbackUser() {
  if (usePostgreSQL) {
    return await repo.getUserByEmail(DEV_AUTH_FALLBACK_EMAIL);
  }

  const users = getJsonUsers();
  const explicitUser = users.find((user) => normalizeLower(user?.email) === DEV_AUTH_FALLBACK_EMAIL);
  return explicitUser || users[0] || null;
}

function isLocalRequest(req) {
  const host = normalizeLower(req.headers.host || '');
  const remoteAddress = normalizeLower(req.socket?.remoteAddress || req.ip || req.connection?.remoteAddress || '');
  const forwardedFor = normalizeLower(String(req.headers['x-forwarded-for'] || '').split(',')[0]);

  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  const localIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

  return (
    localHosts.some((value) => host.startsWith(value)) ||
    localIps.includes(remoteAddress) ||
    localIps.includes(forwardedFor)
  );
}

function canUseDevFallback(req) {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env[DEV_AUTH_FALLBACK_FLAG] === 'true' &&
    isLocalRequest(req)
  );
}

async function resolveAuthenticatedUserFromToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (!decoded?.email) return null;
  return await loadUserByEmail(decoded.email);
}

export const authenticate = async (req, res, next) => {
  const token = extractTokenFromRequest(req);

  if (isPublicRoute(req.path)) {
    if (!token) {
      return next();
    }

    try {
      const user = await resolveAuthenticatedUserFromToken(token);
      if (user) {
        attachAuthenticatedUser(req, user, 'public-bearer', token);
      }
    } catch {
      // Em rota publica, token invalido e ignorado.
    }
    return next();
  }

  if (!token) {
    if (canUseDevFallback(req)) {
      const user = await loadLocalDevFallbackUser();
      if (user) {
        attachAuthenticatedUser(req, user, 'dev-fallback');
        return next();
      }
    }
    return res.status(401).json({ error: 'Token de autenticacao necessario' });
  }

  try {
    const user = await resolveAuthenticatedUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Usuario nao encontrado' });
    }

    attachAuthenticatedUser(req, user, 'bearer', token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
};
