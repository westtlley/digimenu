import { normalizeLower } from '../../utils/orderLifecycle.js';
import { normalizePlanPresetKey } from '../../utils/planPresetsForContext.js';
import { isRequesterGerente } from '../users/users.utils.js';

const MANAGERIAL_AUTH_ALLOWED_PLANS = new Set(['pro', 'ultra', 'admin']);

export function createManagerialEntityAuth({
  repo,
  db,
  usePostgreSQL,
  sessionTtlMs = Number(process.env.MANAGERIAL_AUTH_SESSION_TTL_MS || (10 * 60 * 1000)),
}) {
  const managerialAuthSessions = new Map();

  function getManagerialSubscriberAndRole(req) {
    const owner = (
      req.body?.as_subscriber ||
      req.query?.as_subscriber ||
      req.user?._contextForSubscriber ||
      req.user?.subscriber_email ||
      req.user?.email ||
      ''
    ).toString().toLowerCase().trim();
    const isGerente = isRequesterGerente(req);
    const role = req.user?.is_master ? null : (isGerente ? 'gerente' : 'assinante');
    return { owner, role };
  }

  function canUseManagerialAuthForPlan(plan) {
    const planNorm = normalizePlanPresetKey(plan, { defaultPlan: null, allowNull: true });
    return !!(planNorm && MANAGERIAL_AUTH_ALLOWED_PLANS.has(planNorm));
  }

  async function getManagerialAuthSubscriber(owner) {
    if (!owner) return null;
    if (usePostgreSQL) {
      return repo.getSubscriberByEmail(owner);
    }
    if (db?.subscribers) {
      return db.subscribers.find((item) => (item.email || '').toLowerCase().trim() === owner) || null;
    }
    return null;
  }

  async function ensureManagerialAuthPlanEnabled(owner, res) {
    const subscriber = await getManagerialAuthSubscriber(owner);
    if (!subscriber) {
      res.status(404).json({ error: 'Assinante nao encontrado para este contexto.' });
      return null;
    }
    if (!canUseManagerialAuthForPlan(subscriber.plan)) {
      res.status(403).json({ error: 'Autorizacao gerencial disponivel apenas nos planos Pro e Ultra' });
      return null;
    }
    return subscriber;
  }

  function isRequesterOwnerForManagerialAuth(req, ownerEmail) {
    if (!ownerEmail) return false;
    if (req.user?.is_master) return true;
    return normalizeLower(req.user?.email) === normalizeLower(ownerEmail);
  }

  function getManagerialAuthSessionKey(req, ownerEmail, role) {
    const requester = normalizeLower(req?.user?.id || req?.user?.email);
    return `${requester}|${normalizeLower(ownerEmail)}|${normalizeLower(role)}`;
  }

  function pruneManagerialAuthSessions() {
    const now = Date.now();
    for (const [key, expiresAt] of managerialAuthSessions.entries()) {
      if (!expiresAt || expiresAt <= now) {
        managerialAuthSessions.delete(key);
      }
    }
  }

  function registerManagerialAuthSession(req, ownerEmail, role) {
    if (!req?.user || !ownerEmail || !role) return;
    pruneManagerialAuthSessions();
    const key = getManagerialAuthSessionKey(req, ownerEmail, role);
    managerialAuthSessions.set(key, Date.now() + sessionTtlMs);
  }

  function hasRecentManagerialAuthSession(req, ownerEmail, role) {
    if (!req?.user || !ownerEmail || !role) return false;
    pruneManagerialAuthSessions();
    const key = getManagerialAuthSessionKey(req, ownerEmail, role);
    const expiresAt = managerialAuthSessions.get(key);
    return !!(expiresAt && expiresAt > Date.now());
  }

  function extractManagerialCredentials(payload = {}) {
    const fromObject = (payload?.managerial_auth && typeof payload.managerial_auth === 'object')
      ? payload.managerial_auth
      : ((payload?.managerialAuth && typeof payload.managerialAuth === 'object') ? payload.managerialAuth : null);
    const matricula = normalizeLower(
      fromObject?.matricula || payload?.managerial_matricula || payload?.managerialMatricula
    );
    const passwordRaw = fromObject?.password ?? payload?.managerial_password ?? payload?.managerialPassword;
    const password = typeof passwordRaw === 'string' ? passwordRaw : '';
    return { matricula, password };
  }

  function stripManagerialCredentials(payload = {}) {
    if (!payload || typeof payload !== 'object') return payload;
    const sanitized = { ...payload };
    delete sanitized.managerial_auth;
    delete sanitized.managerialAuth;
    delete sanitized.managerial_matricula;
    delete sanitized.managerial_password;
    delete sanitized.managerialMatricula;
    delete sanitized.managerialPassword;
    return sanitized;
  }

  return {
    ensureManagerialAuthPlanEnabled,
    extractManagerialCredentials,
    getManagerialSubscriberAndRole,
    hasRecentManagerialAuthSession,
    isRequesterOwnerForManagerialAuth,
    registerManagerialAuthSession,
    stripManagerialCredentials,
  };
}
