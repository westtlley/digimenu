/**
 * Users Controller - Handlers de rotas de usuários e colaboradores
 * Orquestra as requisições e chama o service apropriado
 */

import * as usersService from './users.service.js';
import * as repo from '../../db/repository.js';
import { asyncHandler } from '../../middlewares/errorHandler.js';
import { sanitizeForLog } from '../../middlewares/security.js';
import { logger } from '../../utils/logger.js';
import bcrypt from 'bcrypt';
import { COLAB_ROLES, getOwnerAndSubscriber, canUseColaboradores, isRequesterGerente } from './users.utils.js';

const usePostgreSQL = !!process.env.DATABASE_URL;

// Referências globais (serão injetadas do server.js)
let db = null;
let saveDatabaseDebounced = null;

/**
 * Inicializa referências globais (chamado do server.js)
 */
export function initializeUsersController(database, saveDatabaseFn) {
  db = database;
  saveDatabaseDebounced = saveDatabaseFn;
}

/**
 * Listar colaboradores
 */
export const listColaboradores = asyncHandler(async (req, res) => {
  try {
    const result = await usersService.listColaboradores(req, usePostgreSQL, db, repo);
    return res.json(result);
  } catch (error) {
    logger.error('GET /api/colaboradores:', error);
    if (error.message.includes('Colaboradores disponível')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('Contexto do assinante')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error?.message || 'Erro ao listar colaboradores' });
  }
});

/**
 * Criar colaborador
 */
export const createColaborador = asyncHandler(async (req, res) => {
  try {
    const result = await usersService.createColaborador(req, usePostgreSQL, db, repo, saveDatabaseDebounced);
    return res.status(201).json(result);
  } catch (error) {
    logger.error('POST /api/colaboradores:', sanitizeForLog({ error: error.message }));
    if (error.message.includes('Colaboradores disponível')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('Email') || error.message.includes('perfil') || error.message.includes('Senha')) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});

/**
 * Atualizar perfil do usuário
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};
    const updated = await usersService.updateUserProfile(id, updateData, req.user, usePostgreSQL, db, repo, saveDatabaseDebounced);
    return res.json(updated);
  } catch (error) {
    logger.error('PATCH /api/users/:id:', sanitizeForLog({ error: error.message }));
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message });
    }
    throw error;
  }
});

/**
 * Adicionar perfis a colaborador
 */
export const addRolesToColaborador = asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req, usePostgreSQL, db, repo);
    if (!owner) return res.status(400).json({ error: 'Informe o assinante (selecione o estabelecimento) para adicionar perfis.' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    }
    
    const { roles } = req.body || {};
    const email = req.params.email;
    const emailNorm = String(email).toLowerCase().trim();
    
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um perfil para adicionar' });
    }
    
    let rolesToAdd = roles.map(r => String(r).toLowerCase().trim()).filter(r => COLAB_ROLES.includes(r));
    if (rolesToAdd.length === 0) return res.status(400).json({ error: 'Perfis inválidos' });
    
    // Gerente não pode adicionar perfil Gerente
    if (isRequesterGerente(req)) {
      rolesToAdd = rolesToAdd.filter(r => r !== 'gerente');
      if (rolesToAdd.length === 0) {
        return res.status(400).json({ error: 'Gerente não pode atribuir perfil Gerente. Use: Entregador, Cozinha, PDV ou Garçom.' });
      }
    }
    
    // Buscar colaboradores existentes
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
    
    if (existingColabs.length === 0) {
      return res.status(404).json({ error: 'Colaborador não encontrado. Crie o colaborador primeiro.' });
    }
    
    const existingRoles = existingColabs.map(c => (c.profile_role || '').toLowerCase().trim());
    const newRoles = rolesToAdd.filter(r => !existingRoles.includes(r));
    
    if (newRoles.length === 0) {
      return res.status(400).json({ error: 'Todos os perfis selecionados já existem para este colaborador' });
    }
    
    // Buscar usuário base
    const baseUser = existingColabs[0];
    let userBase = null;
    if (usePostgreSQL) {
      userBase = await repo.getUserById(baseUser.id);
    } else if (db?.users) {
      userBase = db.users.find(u => String(u.id) === String(baseUser.id));
    }
    
    if (!userBase) return res.status(404).json({ error: 'Usuário base não encontrado' });
    
    // Criar novos registros para os perfis adicionais
    const added = [];
    for (const role of newRoles) {
      const userData = {
        email: emailNorm,
        full_name: userBase.full_name || baseUser.full_name,
        password: userBase.password,
        is_master: false,
        role: 'user',
        subscriber_email: owner,
        profile_role: role
      };
      try {
        if (usePostgreSQL) {
          await repo.createUser(userData);
          added.push(role);
        } else if (db?.users) {
          const newUser = {
            id: String(Date.now() + Math.random()),
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(newUser);
          added.push(role);
        }
      } catch (err) {
        if (err?.code === '23505' || (err?.message && err.message.includes('unique constraint'))) {
          return res.status(400).json({ error: 'O sistema permite um perfil por email por estabelecimento. Este email já está em uso aqui.' });
        }
        throw err;
      }
    }
    
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    return res.json({ 
      success: true, 
      message: added.length ? `Perfis adicionados: ${added.join(', ')}` : 'Nenhum perfil novo adicionado.', 
      added_roles: added 
    });
  } catch (error) {
    logger.error('POST /api/colaboradores/:email/add-roles:', sanitizeForLog({ error: error.message }));
    throw error;
  }
});

/**
 * Atualizar colaborador
 */
export const updateColaborador = asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req, usePostgreSQL, db, repo);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    }
    
    const { name, role, roles, newPassword } = req.body || {};
    const id = req.params.id;
    
    let u = null;
    if (usePostgreSQL) {
      const all = await repo.listColaboradores(owner);
      u = all.find(x => String(x.id) === String(id)) || null;
    } else if (db?.users) {
      u = db.users.find(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
    }
    
    if (!u) return res.status(404).json({ error: 'Colaborador não encontrado' });
    
    // Gerente não pode editar outro colaborador que tenha perfil Gerente
    if (isRequesterGerente(req) && (u.profile_role || '').toLowerCase().trim() === 'gerente') {
      return res.status(403).json({ error: 'Apenas o dono do estabelecimento pode editar outro Gerente.' });
    }
    
    const up = {};
    if (name !== undefined) up.full_name = String(name).trim() || u.full_name;
    if (role !== undefined) {
      const r = String(role).toLowerCase().trim();
      if (isRequesterGerente(req) && r === 'gerente') {
        return res.status(403).json({ error: 'Gerente não pode atribuir perfil Gerente a outros.' });
      }
      if (COLAB_ROLES.includes(r)) up.profile_role = r;
    }
    if (newPassword !== undefined && String(newPassword).length >= 6) {
      up.password = await bcrypt.hash(String(newPassword), 10);
      // Atualizar senha em todos os registros do mesmo email
      const emailNorm = (u.email || '').toLowerCase().trim();
      if (usePostgreSQL) {
        const all = await repo.listColaboradores(owner);
        const sameEmail = all.filter(c => (c.email || '').toLowerCase().trim() === emailNorm);
        for (const colab of sameEmail) {
          await repo.updateUser(colab.id, { password: up.password });
        }
      } else if (db?.users) {
        db.users.forEach(user => {
          if ((user.email || '').toLowerCase().trim() === emailNorm && 
              (user.subscriber_email || '').toLowerCase().trim() === owner && 
              (user.profile_role || '').trim()) {
            user.password = up.password;
            user.updated_at = new Date().toISOString();
          }
        });
      }
    }
    
    if (Object.keys(up).length === 0) {
      return res.json({ id: u.id, email: u.email, full_name: u.full_name, profile_role: u.profile_role });
    }
    
    if (usePostgreSQL) {
      await repo.updateUser(u.id, up);
      const updated = await repo.getUserById(u.id);
      return res.json({ 
        id: updated.id, 
        email: updated.email, 
        full_name: updated.full_name, 
        profile_role: updated.profile_role, 
        updated_at: updated.updated_at 
      });
    }
    
    Object.assign(u, up, { updated_at: new Date().toISOString() });
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    return res.json({ 
      id: u.id, 
      email: u.email, 
      full_name: u.full_name, 
      profile_role: u.profile_role, 
      updated_at: u.updated_at 
    });
  } catch (error) {
    logger.error('PATCH /api/colaboradores/:id:', sanitizeForLog({ error: error.message }));
    throw error;
  }
});

/**
 * Deletar colaborador
 */
export const deleteColaborador = asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req, usePostgreSQL, db, repo);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    }
    
    const id = req.params.id;
    
    // Gerente não pode remover outro colaborador que tenha perfil Gerente
    let targetColab = null;
    if (usePostgreSQL && repo.listColaboradores) {
      const all = await repo.listColaboradores(owner);
      targetColab = all.find(x => String(x.id) === String(id));
    } else if (db?.users) {
      targetColab = db.users.find(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
    }
    
    if (targetColab && isRequesterGerente(req) && (targetColab.profile_role || '').toLowerCase().trim() === 'gerente') {
      return res.status(403).json({ error: 'Apenas o dono do estabelecimento pode remover um Gerente.' });
    }
    
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
  } catch (error) {
    logger.error('DELETE /api/colaboradores/:id:', sanitizeForLog({ error: error.message }));
    throw error;
  }
});

/**
 * Ativar/desativar colaborador
 */
export const toggleActiveColaborador = asyncHandler(async (req, res) => {
  try {
    const { owner, subscriber } = await getOwnerAndSubscriber(req, usePostgreSQL, db, repo);
    if (!owner) return res.status(400).json({ error: 'Contexto do assinante necessário' });
    if (!canUseColaboradores(subscriber, req.user?.is_master)) {
      return res.status(403).json({ error: 'Colaboradores disponível apenas nos planos Pro e Ultra' });
    }
    
    const id = req.params.id;
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Campo "active" deve ser true ou false' });
    }
    
    // Buscar colaborador
    let targetColab = null;
    if (usePostgreSQL && repo.listColaboradores) {
      const all = await repo.listColaboradores(owner);
      targetColab = all.find(x => String(x.id) === String(id));
    } else if (db?.users) {
      targetColab = db.users.find(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
    }
    
    if (!targetColab) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }
    
    // Gerente não pode desativar outro colaborador que tenha perfil Gerente
    if (!active && isRequesterGerente(req) && (targetColab.profile_role || '').toLowerCase().trim() === 'gerente') {
      return res.status(403).json({ error: 'Apenas o dono do estabelecimento pode desativar um Gerente.' });
    }
    
    // Atualizar status
    if (usePostgreSQL) {
      await repo.updateUser(id, { active });
    } else if (db?.users) {
      const idx = db.users.findIndex(x => String(x.id) === String(id) && (x.subscriber_email || '').toLowerCase().trim() === owner && (x.profile_role || '').trim());
      if (idx === -1) return res.status(404).json({ error: 'Colaborador não encontrado' });
      db.users[idx].active = active;
      db.users[idx].updated_at = new Date().toISOString();
      if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco não disponível' });
    }
    
    return res.json({ success: true, active });
  } catch (error) {
    logger.error('PATCH /api/colaboradores/:id/toggle-active:', sanitizeForLog({ error: error.message }));
    throw error;
  }
});

/**
 * Atualizar slug do master
 */
export const updateMasterSlug = asyncHandler(async (req, res) => {
  if (!req.user?.is_master) {
    return res.status(403).json({ error: 'Apenas master pode atualizar slug' });
  }
  const { slug } = req.body;
  const result = await usersService.updateMasterSlug(req.user.id, slug, usePostgreSQL, repo);
  res.json({ data: result });
});

/**
 * Registrar novo cliente (rota pública)
 */
export const registerCustomer = asyncHandler(async (req, res) => {
  const result = await usersService.registerCustomer(req.body, usePostgreSQL, db, repo, saveDatabaseDebounced);
  res.status(201).json({ data: result });
});
