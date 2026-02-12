/**
 * Users Service - Lógica de negócio de usuários e colaboradores
 * Centraliza toda a lógica de gerenciamento de usuários e colaboradores
 */

import bcrypt from 'bcrypt';
import * as repo from '../../db/repository.js';
import { logger } from '../../utils/logger.js';
import { sanitizeForLog } from '../../middlewares/security.js';
import { COLAB_ROLES, getOwnerAndSubscriber, canUseColaboradores, isRequesterGerente } from './users.utils.js';
import { validateUsersLimit } from '../../services/planValidation.service.js';

const usePostgreSQL = !!process.env.DATABASE_URL;

/**
 * Lista colaboradores agrupados por email
 */
export async function listColaboradores(req, usePostgreSQL, db, repo) {
  let { owner, subscriber } = await getOwnerAndSubscriber(req, usePostgreSQL, db, repo);
  
  // Gerente só pode ver colaboradores do próprio estabelecimento
  if (isRequesterGerente(req)) {
    owner = (req.user?.subscriber_email || '').toLowerCase().trim();
    if (!owner) return [];
    subscriber = usePostgreSQL && repo.getSubscriberByEmail 
      ? await repo.getSubscriberByEmail(owner) 
      : (db?.subscribers ? db.subscribers.find(s => (s.email || '').toLowerCase().trim() === owner) || null : null);
  }
  
  if (!canUseColaboradores(subscriber, req.user?.is_master)) {
    throw new Error('Colaboradores disponível apenas nos planos Pro e Ultra');
  }
  
  if (!owner && !req.user?.is_master) {
    throw new Error('Contexto do assinante necessário');
  }
  
  if (!owner) return []; // Master sem as_subscriber: lista vazia
  
  let list = [];
  if (usePostgreSQL && repo.listColaboradores) {
    list = await repo.listColaboradores(owner);
  } else if (db?.users) {
    list = db.users
      .filter(u => (u.subscriber_email || '').toLowerCase().trim() === owner && (u.profile_role || '').trim())
      .map(u => ({ 
        id: u.id, 
        email: u.email, 
        full_name: u.full_name, 
        profile_role: u.profile_role, 
        active: u.active !== false, 
        created_at: u.created_at, 
        updated_at: u.updated_at 
      }));
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
        active: item.active !== false,
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    }
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
  
  // Converter para array e manter compatibilidade
  return Object.values(grouped).map(item => ({
    email: item.email,
    full_name: item.full_name,
    profile_role: item.roles[0],
    profile_roles: item.roles,
    ids: item.ids,
    active: item.active !== false,
    created_at: item.created_at,
    updated_at: item.updated_at
  }));
}

/**
 * Cria um novo colaborador
 */
export async function createColaborador(req, usePostgreSQL, db, repo, saveDatabaseDebounced) {
  const { owner, subscriber } = await getOwnerAndSubscriber(req, usePostgreSQL, db, repo);
  
  if (!owner) {
    throw new Error('Informe o assinante (selecione o estabelecimento) para adicionar colaborador.');
  }
  
  if (!canUseColaboradores(subscriber, req.user?.is_master)) {
    throw new Error('Colaboradores disponível apenas nos planos Pro e Ultra');
  }

  // ✅ VALIDAÇÃO DE LIMITE DE USUÁRIOS/COLABORADORES
  if (!req.user?.is_master && owner) {
    const userLimit = await validateUsersLimit(owner, null, req.user?.is_master);
    if (!userLimit.valid) {
      throw new Error(
        `Limite de usuários excedido. Você já tem ${userLimit.current} colaborador(es). ` +
        `Seu plano permite ${userLimit.limit} usuário(s). ` +
        `Faça upgrade do plano para aumentar o limite.`
      );
    }
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
  
  if (rolesToCreate.length === 0) {
    throw new Error('Selecione pelo menos um perfil válido: entregador, cozinha, pdv, garcom ou gerente');
  }
  
  // Gerente não pode criar outro perfil Gerente
  if (isRequesterGerente(req)) {
    const ownerGerente = (req.user?.subscriber_email || '').toLowerCase().trim();
    if (owner && owner.toLowerCase().trim() !== ownerGerente) {
      throw new Error('Você só pode adicionar colaboradores do seu estabelecimento.');
    }
    rolesToCreate = rolesToCreate.filter(r => r !== 'gerente');
    if (rolesToCreate.length === 0) {
      throw new Error('Gerente não pode criar perfil Gerente. Selecione: Entregador, Cozinha, PDV ou Garçom.');
    }
  }
  
  if (!(email && String(email).trim())) {
    throw new Error('Email é obrigatório');
  }
  
  if (!(password && String(password).length >= 6)) {
    throw new Error('Senha com no mínimo 6 caracteres');
  }
  
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
  
  // Verificar se algum dos perfis já existe
  const existingRoles = existingColabs.map(c => (c.profile_role || '').toLowerCase().trim());
  const duplicateRoles = rolesToCreate.filter(r => existingRoles.includes(r));
  if (duplicateRoles.length > 0) {
    throw new Error(`Este email já possui os perfis: ${duplicateRoles.join(', ')}. Remova os perfis duplicados ou use perfis diferentes.`);
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
    active: true
  };
  
  let newUser;
  try {
    if (usePostgreSQL) {
      newUser = await repo.createUser(userData);
    } else if (db?.users) {
      const existingUser = db.users.find(u => (u.email || '').toLowerCase().trim() === emailNorm);
      if (existingUser) {
        if (existingUser.role === 'customer') {
          newUser = {
            id: String(Date.now() + Math.random()),
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(newUser);
        } else {
          throw new Error('Este email já está cadastrado no sistema. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.');
        }
      } else {
        newUser = {
          id: String(Date.now() + Math.random()),
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.users.push(newUser);
      }
    } else {
      throw new Error('Banco não disponível');
    }
  } catch (createErr) {
    if (createErr?.code === '23505' || (createErr?.message && createErr.message.includes('unique constraint')) || (createErr?.message && createErr.message.includes('duplicate key'))) {
      let existingUser = null;
      if (usePostgreSQL) {
        const { query } = await import('../../db/postgres.js');
        const result = await query('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [emailNorm]);
        existingUser = result.rows[0] || null;
      } else if (db?.users) {
        existingUser = db.users.find(u => (u.email || '').toLowerCase().trim() === emailNorm) || null;
      }
      
      if (existingUser) {
        const isCustomer = existingUser.role === 'customer';
        const isColaborador = existingUser.profile_role && existingUser.subscriber_email === owner;
        
        if (isCustomer) {
          throw new Error('Este email já está cadastrado como cliente. O sistema permite que o mesmo email seja cliente e colaborador, mas pode haver uma limitação técnica no banco de dados. Por favor, use um email diferente ou contate o suporte para verificar se a migration foi aplicada corretamente.');
        } else if (isColaborador) {
          throw new Error('Este email já está cadastrado como colaborador deste estabelecimento. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.');
        } else {
          throw new Error('Este email já está cadastrado no sistema com outro perfil. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.');
        }
      }
      throw new Error('Este email já está cadastrado no sistema. Use outro email ou adicione perfis ao colaborador existente em Colaboradores.');
    }
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
  
  return out;
}

/**
 * Atualiza perfil do usuário
 */
export async function updateUserProfile(userId, updateData, reqUser, usePostgreSQL, db, repo, saveDatabaseDebounced) {
  let u = null;
  if (usePostgreSQL) {
    u = await repo.getUserById(parseInt(userId));
  } else if (db?.users) {
    u = db.users.find(x => String(x.id) === String(userId));
  }
  
  if (!u) {
    throw new Error('Usuário não encontrado');
  }
  
  // Verificar permissão: só pode atualizar próprio perfil ou ser master/admin
  const isOwnProfile = String(u.id) === String(reqUser?.id);
  const isMaster = reqUser?.is_master;
  const isAdmin = reqUser?.role === 'admin';
  
  if (!isOwnProfile && !isMaster && !isAdmin) {
    throw new Error('Sem permissão para atualizar este perfil');
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
    return u;
  }
  
  if (usePostgreSQL) {
    await repo.updateUser(parseInt(userId), up);
    return await repo.getUserById(parseInt(userId));
  }
  
  Object.assign(u, up, { updated_at: new Date().toISOString() });
  if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
  return u;
}

/**
 * Atualiza o slug do master
 */
export async function updateMasterSlug(userId, slug, usePostgreSQL, repo) {
  if (!usePostgreSQL) {
    throw new Error('Atualização de slug do master requer PostgreSQL');
  }
  const cleanSlug = slug ? String(slug).trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') : null;
  
  const updated = await repo.updateUser(userId, { slug: cleanSlug });
  return { user: updated, message: 'Slug atualizado com sucesso' };
}

/**
 * Registra um novo cliente
 */
export async function registerCustomer(customerData, usePostgreSQL, db, repo, saveDatabaseDebounced) {
  if (!customerData.email || !customerData.email.includes('@')) {
    throw new Error('Email válido é obrigatório');
  }
  if (!customerData.name || customerData.name.trim().length < 3) {
    throw new Error('Nome deve ter no mínimo 3 caracteres');
  }
  if (!customerData.password || customerData.password.length < 6) {
    throw new Error('Senha deve ter no mínimo 6 caracteres');
  }
  
  const emailLower = customerData.email.toLowerCase().trim();
  
  let existingUser = null;
  if (usePostgreSQL) {
    existingUser = await repo.getUserByEmail(emailLower);
  } else if (db && db.users) {
    existingUser = db.users.find(u => (u.email || '').toLowerCase() === emailLower);
  }
  
  if (existingUser) {
    throw new Error('Email já cadastrado. Use outro email ou faça login.');
  }
  
  const passwordHash = await bcrypt.hash(customerData.password, 10);
  const subscriberEmail = customerData.subscriber_email || null;
  
  const userData = {
    email: emailLower,
    full_name: customerData.name.trim(),
    password: passwordHash,
    role: 'customer',
    is_master: false,
    subscriber_email: subscriberEmail
  };
  
  let createdUser;
  if (usePostgreSQL) {
    createdUser = await repo.createUser(userData);
  } else if (db && db.users) {
    createdUser = {
      id: String(Date.now()),
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.users.push(createdUser);
    if (saveDatabaseDebounced) saveDatabaseDebounced(db);
  } else {
    throw new Error('Banco de dados não disponível');
  }
  
  const customerRepoData = {
    email: emailLower,
    name: customerData.name.trim(),
    phone: customerData.phone ? customerData.phone.replace(/\D/g, '') : null,
    address: customerData.address || null,
    address_number: customerData.address_number || null,
    complement: customerData.complement || null,
    neighborhood: customerData.neighborhood || null,
    city: customerData.city || null,
    state: customerData.state || null,
    zipcode: customerData.zipcode ? customerData.zipcode.replace(/\D/g, '') : null,
    subscriber_email: subscriberEmail,
    birth_date: customerData.birth_date || null,
    cpf: customerData.cpf ? customerData.cpf.replace(/\D/g, '') : null,
    password_hash: passwordHash
  };
  
  let createdCustomer;
  if (usePostgreSQL) {
    try {
      createdCustomer = await repo.createCustomer(customerRepoData, null);
    } catch (customerError) {
      logger.warn('Erro ao criar customer (não crítico):', customerError.message);
      createdCustomer = null;
    }
  } else if (db && db.customers) {
    createdCustomer = {
      id: String(Date.now() + 1),
      ...customerRepoData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.customers.push(createdCustomer);
    if (saveDatabaseDebounced) saveDatabaseDebounced(db);
  }
  
  return {
    success: true,
    user: {
      id: createdUser.id,
      email: createdUser.email,
      full_name: createdUser.full_name,
      role: createdUser.role
    },
    message: 'Cadastro realizado com sucesso!'
  };
}
