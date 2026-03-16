/**
 * Users Utils - Funções auxiliares para módulo de usuários
 */

import { getEffectivePermissionsForSubscriber } from '../../utils/planPresetsForContext.js';

export const COLAB_ROLES = ['entregador', 'cozinha', 'pdv', 'garcom', 'gerente'];

const normalizeLower = (value = '') => String(value || '').toLowerCase().trim();
const normalizeSubscriberId = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

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
  const requestedSubscriberId = normalizeSubscriberId(
    req.query.as_subscriber_id ??
    req.user?._contextForSubscriberId ??
    req.user?.subscriber_id ??
    null
  );
  const requestedSubscriberEmail = (
    req.query.as_subscriber ||
    req.user?._contextForSubscriber ||
    req.user?.subscriber_email ||
    (!req.user?.is_master ? req.user?.email : '')
  ).toString().toLowerCase().trim();
  let subscriber = null;
  if (usePostgreSQL) {
    subscriber = requestedSubscriberId != null
      ? await repo.getSubscriberById(requestedSubscriberId)
      : await repo.getSubscriberByEmail(requestedSubscriberEmail);
  } else if (db?.subscribers) {
    subscriber = db.subscribers.find((s) => {
      if (requestedSubscriberId != null && Number(s.id) === Number(requestedSubscriberId)) return true;
      return (s.email || '').toLowerCase().trim() === requestedSubscriberEmail;
    }) || null;
  }
  const owner = normalizeLower(subscriber?.email || requestedSubscriberEmail);
  const subscriberId = normalizeSubscriberId(subscriber?.id ?? requestedSubscriberId);
  return { owner, subscriberId, subscriber };
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
