/**
 * Auth Controller - Handlers de rotas de autenticação
 * Orquestra as requisições e chama o service apropriado
 */

import * as authService from './auth.service.js';
import * as repo from '../../db/repository.js';
import { getEffectivePermissionsForSubscriber, normalizePlanPresetKey } from '../../utils/planPresetsForContext.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';
import { sanitizeForLog } from '../../middlewares/security.js';
import { logger } from '../../utils/logger.js';
import { sendPasswordResetEmail, sendPasswordSetupEmail } from '../../utils/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const usePostgreSQL = !!process.env.DATABASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Referências globais (serão injetadas do server.js)
let db = null;
let saveDatabaseDebounced = null;

/**
 * Inicializa referências globais (chamado do server.js)
 */
export function initializeAuthController(database, saveDatabaseFn) {
  db = database;
  saveDatabaseDebounced = saveDatabaseFn;
}

/**
 * Login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  logger.log('🔐 [login] Tentativa de login para:', email?.toLowerCase());

  // Validar credenciais
  const result = await authService.validateCredentials(email, password, db, saveDatabaseDebounced);
  
  if (result.error) {
    if (result.error === 'PASSWORD_NOT_SET') {
      return res.status(401).json({
        error: result.message,
        code: 'PASSWORD_NOT_SET'
      });
    }
    if (result.error === 'ACCOUNT_DISABLED') {
      return res.status(403).json({ error: result.message });
    }
    return res.status(401).json({ error: result.message });
  }

  const user = result.user;
  logger.log('✅ [login] Usuário encontrado:', {
    id: user.id,
    email: user.email,
    is_master: user.is_master,
    profile_role: user.profile_role
  });

  // Verificar se é assinante e garantir acesso automático aos perfis do plano
  let subscriber = null;
  const subscriberId = user.subscriber_id || null;
  const subscriberEmail = user.subscriber_email || user.email;
  if (usePostgreSQL) {
    subscriber = subscriberId
      ? await repo.getSubscriberById(subscriberId)
      : await repo.getSubscriberByEmail(subscriberEmail);
  } else if (db?.subscribers) {
    subscriber = db.subscribers.find(s => (s.email || '').toLowerCase().trim() === subscriberEmail.toLowerCase().trim());
  }

  // Criar colaboradores automáticos se necessário
  await authService.ensurePlanCollaborators(user, subscriber, db, saveDatabaseDebounced);

  // Preparar resposta
  const response = authService.prepareLoginResponse(user);
  return res.json(response);
});

/**
 * Obter usuário atual
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const payload = {
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    is_master: req.user.is_master,
    role: req.user.role,
    subscriber_id: req.user.subscriber_id || null,
    subscriber_email: req.user.subscriber_email || null,
    profile_role: req.user.profile_role || null,
    slug: req.user.slug || null
  };

  // Colaborador: retornar todos os perfis
  if (req.user.profile_role && req.user.subscriber_email) {
    try {
      let list = [];
      if (usePostgreSQL && repo.listColaboradores) {
        list = await repo.listColaboradores(req.user.subscriber_email, req.user.subscriber_id || null);
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

  return res.json(payload);
});

/**
 * Obter contexto completo do usuário
 */
export const getUserContext = asyncHandler(async (req, res) => {
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
    permissions = {};
  } else {
    const subscriberIdToFind = user.subscriber_id || null;
    const emailToFind = user.subscriber_email || user.email;
    if (usePostgreSQL) {
      if (subscriberIdToFind) {
        subscriber = await repo.getSubscriberById(subscriberIdToFind);
      } else if (emailToFind) {
        subscriber = await repo.getSubscriberByEmail(emailToFind);
      }
    } else if (db && db.subscribers && emailToFind) {
      subscriber = db.subscribers.find(s => (s.email || '').toLowerCase() === (emailToFind || '').toLowerCase());
    }

    if (subscriber) {
      menuContext = {
        type: 'subscriber',
        value: subscriber.email,
        subscriber_id: subscriber.id
      };
      permissions = getEffectivePermissionsForSubscriber(subscriber);
    } else {
      menuContext = {
        type: 'subscriber',
        value: user.email,
        subscriber_id: user.subscriber_id || null
      };
    }
  }

  // Colaborador: incluir profile_role e profile_roles
  let profileRoles = [];
  if (user.profile_role) profileRoles = [user.profile_role];
  if (Array.isArray(user.profile_roles) && user.profile_roles.length) profileRoles = [...new Set(user.profile_roles)];

  let subscriberDataPayload = null;
  if (!user.is_master && subscriber) {
    let usage = null;
    let effectiveLimits = null;
    let addons = subscriber.addons;
    if (typeof addons === 'string') {
      try {
        addons = JSON.parse(addons);
      } catch {
        addons = {};
      }
    }
    if (!addons || typeof addons !== 'object') addons = {};

    try {
      const { getUsageForSubscriber, getEffectiveLimitsForSubscriber } = await import('../../services/planValidation.service.js');
      usage = await getUsageForSubscriber(subscriber.email);
      effectiveLimits = getEffectiveLimitsForSubscriber({ ...subscriber, addons });
    } catch (e) {
      // Ignorar erro de enriquecimento de contexto
    }

    subscriberDataPayload = {
      id: subscriber.id,
      email: subscriber.email,
      plan: normalizePlanPresetKey(subscriber.plan, { defaultPlan: 'basic' }) || 'basic',
      status: subscriber.status || 'active',
      expires_at: subscriber.expires_at || null,
      permissions,
      slug: subscriber.slug || null,
      addons,
      ...(effectiveLimits && { effectiveLimits }),
      ...(usage && { usage })
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
      subscriber_id: user.subscriber_id || null,
      subscriber_email: user.subscriber_email || null,
      profile_role: user.profile_role || null,
      profile_roles: profileRoles.length ? profileRoles : null,
      photo: user.photo || null,
      google_photo: user.google_photo || null
    },
    menuContext,
    permissions,
    subscriberData: subscriberDataPayload
  });
});

/**
 * Alterar própria senha
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
  }

  // Carregar usuário com senha
  let user;
  if (usePostgreSQL) {
    user = await repo.getUserByEmail(req.user.email);
  } else if (db && db.users) {
    user = db.users.find(u => (u.email || '').toLowerCase() === (req.user.email || '').toLowerCase());
  }
  
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  // Validar senha atual
  let valid = false;
  if (user.password) {
    if (typeof user.password === 'string' && user.password.startsWith('$2')) {
      valid = await bcrypt.compare(currentPassword, user.password);
    } else if (user.password === currentPassword) {
      valid = true;
    }
  } else if ((user.email || '').toLowerCase() === 'admin@digimenu.com' && currentPassword === 'admin123') {
    valid = true;
  }
  
  if (!valid) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }

  // Atualizar senha
  const hashed = await bcrypt.hash(newPassword, 10);
  if (usePostgreSQL) {
    await repo.updateUser(user.id, { password: hashed });
  } else if (db && db.users) {
    const u = db.users.find(x => (x.email || '').toLowerCase() === (req.user.email || '').toLowerCase());
    if (u) {
      u.password = hashed;
      u.updated_at = new Date().toISOString();
      try {
        const persistenceModule = await import('../../db/persistence.js');
        if (persistenceModule?.saveDatabase) persistenceModule.saveDatabase(db);
        else if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
      } catch (e) {
        logger.error('Erro ao salvar senha (JSON):', e);
      }
    }
  }

  return res.json({ success: true, message: 'Senha alterada com sucesso.' });
});

/**
 * Esqueci minha senha
 */
export const forgotPassword = asyncHandler(async (req, res) => {
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
  
  // Enviar email
  try {
    await sendPasswordResetEmail(emailNorm, token);
    logger.log('✅ [forgot-password] Email de recuperação enviado para:', emailNorm);
  } catch (emailError) {
    logger.error('❌ [forgot-password] Erro ao enviar email:', emailError);
    const link = `${FRONTEND_URL}/redefinir-senha?token=${token}`;
    logger.log('🔐 [forgot-password] Link de redefinição (email não enviado):', link);
  }
  
  return res.json({ success: true, message: msg });
});

/**
 * Redefinir senha com token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  if (!usePostgreSQL) {
    return res.status(503).json({ error: 'Redefinição de senha requer PostgreSQL. Configure DATABASE_URL.' });
  }
  
  const { token, newPassword } = req.body;
  const row = await authService.validatePasswordResetToken(token);
  
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
});

/**
 * Definir senha (primeira vez)
 */
export const setPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  try {
    const result = await authService.setPasswordWithToken(token, password, db, saveDatabaseDebounced);
    return res.json(result);
  } catch (error) {
    logger.error('❌ Erro ao definir senha:', sanitizeForLog({ error: error.message }));
    if (error.message.includes('Token')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('mínimo')) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});
