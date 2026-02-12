/**
 * Auth Service - Lógica de negócio de autenticação
 * Centraliza toda a lógica de autenticação, validação de senha e geração de tokens
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as repo from '../../db/repository.js';
import { getPlanPermissions } from '../../utils/plans.js';
import { logger } from '../../utils/logger.js';
import { sanitizeForLog } from '../../middlewares/security.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const usePostgreSQL = !!process.env.DATABASE_URL;

// Armazenamento temporário de tokens (em produção, usar Redis)
const activeTokens = {};
const passwordTokens = {};

/**
 * Gera token JWT para um usuário
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      is_master: user.is_master
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Armazena token ativo
 */
export function storeActiveToken(token, email) {
  activeTokens[token] = email;
}

/**
 * Gera token de senha para assinante
 */
export function generatePasswordTokenForSubscriber(subscriberEmail, subscriberId = null) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  
  const key = subscriberId || subscriberEmail;
  passwordTokens[key] = {
    token,
    email: subscriberEmail,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString()
  };
  
  const setupUrl = `${FRONTEND_URL}/definir-senha?token=${token}`;
  
  return {
    token,
    expires_at: expiresAt.toISOString(),
    setup_url: setupUrl
  };
}

/**
 * Busca token de senha
 */
export function getPasswordToken(token) {
  for (const key in passwordTokens) {
    if (passwordTokens[key].token === token) {
      return passwordTokens[key];
    }
  }
  return null;
}

/**
 * Remove token de senha
 */
export function removePasswordToken(token) {
  for (const key in passwordTokens) {
    if (passwordTokens[key].token === token) {
      delete passwordTokens[key];
      return true;
    }
  }
  return false;
}

/**
 * Valida credenciais de login
 */
export async function validateCredentials(email, password, db = null, saveDatabaseDebounced = null) {
  const emailLower = email.toLowerCase().trim();
  
  // Buscar usuário
  let user;
  if (usePostgreSQL) {
    user = await repo.getLoginUserByEmail(emailLower);
    if (!user) {
      // Tentar busca alternativa
      try {
        const { query } = await import('../../db/postgres.js');
        const result = await query(
          `SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR email ILIKE $2
           ORDER BY (CASE WHEN profile_role IS NOT NULL AND profile_role != '' THEN 0 ELSE 1 END), id LIMIT 1`,
          [emailLower, `%${emailLower}%`]
        );
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch (err) {
        logger.error('Erro na busca alternativa de usuário:', err.message);
      }
    }
  } else if (db && db.users) {
    user = db.users.find(u => {
      const userEmail = (u.email || '').toLowerCase().trim();
      return userEmail === emailLower;
    });
  } else {
    throw new Error('Banco de dados não inicializado');
  }

  if (!user) {
    // Verificar se é assinante sem senha
    if (usePostgreSQL) {
      const subscriber = await repo.getSubscriberByEmail(emailLower);
      if (subscriber) {
        return {
          error: 'PASSWORD_NOT_SET',
          message: 'Conta encontrada, mas ainda não há senha definida. Use o link "Definir senha" enviado ao seu e-mail ou clique em "Esqueci minha senha" para solicitar um novo.'
        };
      }
    }
    return { error: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' };
  }

  // Verificar se colaborador está ativo
  if (user.profile_role && user.active !== undefined && user.active === false) {
    return { error: 'ACCOUNT_DISABLED', message: 'Seu acesso foi desativado. Entre em contato com o administrador.' };
  }

  // Validar senha
  // Verificar tanto password_hash quanto password (compatibilidade)
  const userPassword = user.password_hash || user.password;
  
  if (!userPassword) {
    // Usuário sem senha - apenas admin padrão em desenvolvimento
    const emailMatch = (user.email || '').toLowerCase() === 'admin@digimenu.com';
    if (emailMatch && password === 'admin123' && process.env.NODE_ENV !== 'production') {
      // Hash e salvar senha
      const hashed = await bcrypt.hash(password, 10);
      if (usePostgreSQL) {
        await repo.updateUser(user.id, { password_hash: hashed });
      } else if (db && db.users) {
        const u = db.users.find(x => x.id === user.id);
        if (u) {
          u.password_hash = hashed;
          u.updated_at = new Date().toISOString();
          if (saveDatabaseDebounced) saveDatabaseDebounced(db);
        }
      }
      return { user };
    }
    return { error: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' };
  }

  // Verificar senha com bcrypt
  try {
    const passwordClean = (password || '').trim();
    const isValid = await bcrypt.compare(passwordClean, userPassword);
    
    if (isValid) {
      return { user };
    }
  } catch (bcryptError) {
    // Tentar verificar se senha está em texto plano (migração)
    if (userPassword === password) {
      const hashed = await bcrypt.hash(password, 10);
      if (usePostgreSQL) {
        await repo.updateUser(user.id, { password_hash: hashed });
      } else if (db && db.users) {
        const u = db.users.find(x => x.id === user.id);
        if (u) {
          u.password_hash = hashed;
          u.updated_at = new Date().toISOString();
          if (saveDatabaseDebounced) saveDatabaseDebounced(db);
        }
      }
      return { user };
    }
  }

  return { error: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' };
}

/**
 * Cria colaboradores automáticos baseados no plano do assinante
 */
export async function ensurePlanCollaborators(user, subscriber, db = null, saveDatabaseDebounced = null) {
  if (!subscriber || user.profile_role || user.is_master) {
    return;
  }

  const planPerms = getPlanPermissions(subscriber.plan || 'basic');
  const subscriberEmail = subscriber.email;
  
  const allowedRoles = [];
  if (planPerms.delivery_app || planPerms.team_management) allowedRoles.push('entregador');
  if (planPerms.kitchen_display) allowedRoles.push('cozinha');
  if (planPerms.pdv) allowedRoles.push('pdv');
  if (planPerms.waiter_app) allowedRoles.push('garcom');
  
  if (allowedRoles.length === 0) {
    return;
  }

  for (const role of allowedRoles) {
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
      logger.warn('Erro ao listar colaboradores (não crítico):', listError.message);
      continue;
    }
    
    if (!existingColab) {
      const userData = {
        email: subscriberEmail,
        full_name: user.full_name || subscriber.name || subscriberEmail.split('@')[0],
        password: user.password,
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

/**
 * Prepara resposta de login com token e dados do usuário
 */
export function prepareLoginResponse(user) {
  const token = generateToken(user);
  storeActiveToken(token, user.email);
  
  return {
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
  };
}

/**
 * Valida token de redefinição de senha
 */
export async function validatePasswordResetToken(token) {
  if (!usePostgreSQL) {
    throw new Error('Recuperação de senha requer PostgreSQL');
  }
  
  const row = await repo.getPasswordResetTokenByToken(token);
  if (!row) {
    return null;
  }
  
  // Verificar expiração
  if (new Date(row.expires_at) < new Date()) {
    await repo.deletePasswordResetToken(token);
    return null;
  }
  
  return row;
}

/**
 * Define senha para um usuário usando token
 */
export async function setPasswordWithToken(token, password, db = null, saveDatabaseDebounced = null) {
  if (!token || !password) {
    throw new Error('Token e senha são obrigatórios');
  }

  if (password.length < 6) {
    throw new Error('A senha deve ter no mínimo 6 caracteres');
  }

  // Buscar token
  let userEmail = null;
  let tokenData = null;

  // Verificar em memória
  for (const key in passwordTokens) {
    if (passwordTokens[key].token === token) {
      userEmail = passwordTokens[key].email;
      tokenData = passwordTokens[key];
      break;
    }
  }

  // Se não encontrou em memória, buscar no banco
  if (!userEmail && usePostgreSQL) {
    const subscribers = await repo.listSubscribers();
    for (const sub of subscribers) {
      if (sub.password_token === token) {
        userEmail = sub.email;
        tokenData = {
          expires_at: sub.token_expires_at
        };
        break;
      }
    }
  } else if (!userEmail && db?.subscribers) {
    const subscriber = db.subscribers.find(s => s.password_token === token);
    if (subscriber) {
      userEmail = subscriber.email;
      tokenData = {
        expires_at: subscriber.token_expires_at
      };
    }
  }

  if (!userEmail) {
    throw new Error('Token inválido ou expirado');
  }

  // Verificar expiração
  if (tokenData?.expires_at) {
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      removePasswordToken(token);
      throw new Error('Token expirado. O link é válido por apenas 5 minutos. Solicite um novo link.');
    }
  } else {
    throw new Error('Token inválido ou expirado');
  }

  // Buscar dados do assinante
  let subscriberInfo = null;
  if (usePostgreSQL) {
    subscriberInfo = await repo.getSubscriberByEmail(userEmail);
  } else if (db && db.subscribers) {
    subscriberInfo = db.subscribers.find(s => s.email === userEmail.toLowerCase());
  }

  // Buscar ou criar usuário
  const hashedPassword = await bcrypt.hash(password, 10);
  let user;
  
  if (usePostgreSQL) {
    user = await repo.getUserByEmail(userEmail);
    if (!user) {
      user = await repo.createUser({
        email: userEmail.toLowerCase(),
        password: hashedPassword,
        full_name: subscriberInfo?.name || userEmail.split('@')[0],
        role: 'user',
        is_master: false,
        has_password: true
      });
    } else {
      const updateData = {
        password: hashedPassword,
        has_password: true
      };
      if (!user.full_name && subscriberInfo?.name) {
        updateData.full_name = subscriberInfo.name;
      }
      user = await repo.updateUser(user.id, updateData);
    }
  } else if (db && db.users) {
    user = db.users.find(u => u.email === userEmail.toLowerCase());
    if (!user) {
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
    } else {
      user.password = hashedPassword;
      user.has_password = true;
      if (!user.full_name && subscriberInfo?.name) {
        user.full_name = subscriberInfo.name;
      }
      user.updated_at = new Date().toISOString();
    }
    
    // Remover token do assinante
    if (db.subscribers) {
      const subscriberIndex = db.subscribers.findIndex(s => s.email === userEmail);
      if (subscriberIndex >= 0) {
        db.subscribers[subscriberIndex].password_token = null;
        db.subscribers[subscriberIndex].token_expires_at = null;
        db.subscribers[subscriberIndex].has_password = true;
      }
    }
    
    // Salvar imediatamente
    try {
      if (!usePostgreSQL && db) {
        const persistenceModule = await import('../../db/persistence.js');
        if (persistenceModule?.saveDatabase) {
          persistenceModule.saveDatabase(db);
        } else if (saveDatabaseDebounced) {
          saveDatabaseDebounced(db);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (saveError) {
      logger.error('Erro ao salvar banco:', saveError);
    }
  }

  return { success: true, message: 'Senha definida com sucesso! Você já pode fazer login.' };
}
