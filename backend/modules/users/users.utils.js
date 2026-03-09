/**
 * Users Utils - Funções auxiliares para módulo de usuários
 */

import { getEffectivePermissionsForSubscriber } from '../../utils/planPresetsForContext.js';

export const COLAB_ROLES = ['entregador', 'cozinha', 'pdv', 'garcom', 'gerente'];

const normalizeLower = (value = '') => String(value || '').toLowerCase().trim();

function parseSubscriberPermissionMap(subscriber) {
  return getEffectivePermissionsForSubscriber(subscriber);
}

function hasModuleActionPermission(permissionMap, moduleName, action) {
  const modulePermissions = permissionMap?.[moduleName];
  if (Array.isArray(modulePermissions)) {
    return modulePermissions.includes(action) || modulePermissions.includes('*');
  }
  if (modulePermissions === true) return true;
  if (modulePermissions && typeof modulePermissions === 'object') {
    return modulePermissions[action] === true;
  }
  return false;
}

/**
 * Obtém owner e subscriber do request
 */
export async function getOwnerAndSubscriber(req, usePostgreSQL, db, repo) {
  const owner = (req.query.as_subscriber || req.user?._contextForSubscriber || req.user?.subscriber_email || req.user?.email || '').toString().toLowerCase().trim();
  let subscriber = null;
  if (usePostgreSQL) {
    subscriber = await repo.getSubscriberByEmail(owner);
  } else if (db?.subscribers) {
    subscriber = db.subscribers.find(s => (s.email || '').toLowerCase().trim() === owner) || null;
  }
  return { owner, subscriber };
}

/**
 * Verifica se pode usar colaboradores com base no resolvedor central de plano/permissoes
 * action: view | create | update | delete
 */
export function canUseColaboradores(subscriber, isMaster, action = 'view') {
  if (isMaster) return true; // Master tem acesso a tudo
  if (!subscriber) return false;
  const permissionMap = parseSubscriberPermissionMap(subscriber);
  const requestedAction = normalizeLower(action) || 'view';
  return hasModuleActionPermission(permissionMap, 'colaboradores', requestedAction);
}

/**
 * Retorna true se o usuário autenticado é um colaborador com perfil Gerente (não master/dono).
 */
export function isRequesterGerente(req) {
  if (!req?.user) return false;
  if (req.user.is_master) return false;
  const pr = (req.user.profile_role || '').toLowerCase().trim();
  const roles = req.user.profile_roles || (pr ? [pr] : []);
  return roles.includes('gerente');
}
