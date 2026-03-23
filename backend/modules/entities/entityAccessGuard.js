import { normalizeLower } from '../../utils/orderLifecycle.js';
import {
  getEffectivePermissionsForSubscriber,
  normalizePlanPresetKey,
} from '../../utils/planPresetsForContext.js';
import {
  ENTITY_ACCESS_CONFIG,
  ORDER_COLLABORATOR_STATUS_RULES,
  normalizeEntityName,
} from './entityAccessConfig.js';

export function createEntityAccessGuard({
  repo,
  db,
  usePostgreSQL,
  managerialEntityAuth,
}) {
  const {
    extractManagerialCredentials,
    getManagerialSubscriberAndRole,
    hasRecentManagerialAuthSession,
    registerManagerialAuthSession,
    stripManagerialCredentials,
  } = managerialEntityAuth;

  const hasProfileRole = (user) => !!normalizeLower(user?.profile_role);

  function getUserRoleList(user) {
    const fromList = Array.isArray(user?.profile_roles)
      ? user.profile_roles.map((role) => normalizeLower(role)).filter(Boolean)
      : [];
    const fromSingle = normalizeLower(user?.profile_role);
    const roles = fromSingle ? [fromSingle, ...fromList] : fromList;
    return [...new Set(roles)];
  }

  function isOwnerForSubscriber(user, ownerEmail) {
    if (!user || !ownerEmail) return false;
    if (user?.is_master) return true;
    if (hasProfileRole(user)) return false;
    const ownerNorm = normalizeLower(ownerEmail);
    const userEmail = normalizeLower(user.email);
    const userSubscriber = normalizeLower(user.subscriber_email);
    const scopedSubscriber = normalizeLower(user?._contextForSubscriber);
    return userEmail === ownerNorm || userSubscriber === ownerNorm || scopedSubscriber === ownerNorm;
  }

  function getEntityCrudAction(method) {
    const normalizedMethod = String(method || '').toUpperCase();
    if (normalizedMethod === 'POST') return 'create';
    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') return 'update';
    if (normalizedMethod === 'DELETE') return 'delete';
    return null;
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

  function parseSubscriberPermissionMap(subscriber) {
    return getEffectivePermissionsForSubscriber(subscriber);
  }

  function resolveBasicMenuProfile(permissionMap = {}) {
    const pizzaPermissions = permissionMap?.pizza_config;
    if (Array.isArray(pizzaPermissions) && pizzaPermissions.length > 0) {
      return 'pizzaria';
    }
    return 'restaurante';
  }

  function isAllowedDishTypeForBasicProfile(productType, profile) {
    const normalizedType = normalizeLower(productType || 'dish');
    if (profile === 'pizzaria') {
      return normalizedType === 'pizza' || normalizedType === 'beverage';
    }
    return normalizedType !== 'pizza';
  }

  function isAllowedComboModeForBasicProfile(comboMode, profile) {
    const normalizedMode = normalizeLower(comboMode);
    if (!normalizedMode) return true;
    if (profile === 'pizzaria') return normalizedMode === 'pizzas_beverages';
    return normalizedMode === 'dishes_beverages';
  }

  async function getEntityRecordForScope(entityNorm, id, user) {
    if (!id) return null;
    const canonicalEntity = entityNorm === 'dish' ? 'Dish' : entityNorm === 'combo' ? 'Combo' : null;
    if (!canonicalEntity) return null;

    if (usePostgreSQL) {
      return repo.getEntityById(canonicalEntity, id, user || null);
    }

    const list = db?.entities?.[canonicalEntity];
    if (!Array.isArray(list)) return null;
    return list.find((item) => String(item?.id || '') === String(id || '')) || null;
  }

  async function resolveEntityScopeData(entityNorm, method, payload, req) {
    if (!(entityNorm === 'dish' || entityNorm === 'combo')) return payload || {};
    const methodUpper = String(method || '').toUpperCase();
    const needsExistingLookup = methodUpper !== 'POST';
    if (!needsExistingLookup) return payload || {};

    const existing = await getEntityRecordForScope(entityNorm, req?.params?.id, req?.user);
    if (!existing || typeof existing !== 'object') return payload || {};

    return {
      ...existing,
      ...(payload || {}),
    };
  }

  function applyBasicScopeFilterToItems(entityNorm, items, permissionMap) {
    if (!Array.isArray(items) || items.length === 0) return items;
    const profile = resolveBasicMenuProfile(permissionMap);

    if (entityNorm === 'dish') {
      return items.filter((item) => isAllowedDishTypeForBasicProfile(item?.product_type, profile));
    }

    if (entityNorm === 'combo') {
      return items.filter((item) => isAllowedComboModeForBasicProfile(item?.combo_mode, profile));
    }

    return items;
  }

  function applyBasicScopeToEntityResult(entityNorm, result, permissionMap) {
    if (!result) return result;
    if (Array.isArray(result)) {
      return applyBasicScopeFilterToItems(entityNorm, result, permissionMap);
    }
    if (Array.isArray(result?.items)) {
      return {
        ...result,
        items: applyBasicScopeFilterToItems(entityNorm, result.items, permissionMap),
      };
    }
    return result;
  }

  async function enforceBasicPlanEntityScope(req, res, entityNorm, method, payload, subscriber, permissionMap) {
    const plan = normalizePlanPresetKey(subscriber?.plan, { defaultPlan: 'basic' }) || 'basic';
    if (plan !== 'basic') return { allowed: true, scopedPayload: payload };
    if (!(entityNorm === 'dish' || entityNorm === 'combo')) return { allowed: true, scopedPayload: payload };

    const scopedPayload = await resolveEntityScopeData(entityNorm, method, payload, req);
    const profile = resolveBasicMenuProfile(permissionMap);

    if (entityNorm === 'dish') {
      const productType = normalizeLower(scopedPayload?.product_type || 'dish');
      if (!isAllowedDishTypeForBasicProfile(productType, profile)) {
        const blockedModule = productType === 'pizza' ? 'pizza_config' : 'dishes';
        res.status(403).json({
          error: `Plano basico (${profile}) nao permite operar este tipo de item no cardapio.`,
          code: 'ACTION_NOT_ALLOWED',
          module: blockedModule,
          action: getEntityCrudAction(method) || 'view',
          profile,
        });
        return { allowed: false };
      }
    }

    if (entityNorm === 'combo') {
      const comboMode = normalizeLower(scopedPayload?.combo_mode || '');
      if (comboMode && !isAllowedComboModeForBasicProfile(comboMode, profile)) {
        res.status(403).json({
          error: `Plano basico (${profile}) nao permite este modo de combo.`,
          code: 'ACTION_NOT_ALLOWED',
          module: 'combo',
          action: getEntityCrudAction(method) || 'view',
          profile,
        });
        return { allowed: false };
      }
    }

    return { allowed: true, scopedPayload };
  }

  function shouldEnforceEntityRead(config) {
    return !!(config && config.enforceRead === true);
  }

  function isSensitiveEntityAction(entityName, method, payload = {}) {
    const entityNorm = normalizeEntityName(entityName);
    const httpMethod = String(method || '').toUpperCase();
    if (entityNorm === 'order' && httpMethod === 'DELETE') return true;

    if (entityNorm === 'caixa') {
      if (httpMethod === 'POST') return true;
      if (httpMethod === 'PUT' || httpMethod === 'PATCH') {
        const status = normalizeLower(payload?.status);
        return status === 'closed' || payload?.closing_date !== undefined || payload?.closing_amount_cash !== undefined;
      }
      return false;
    }

    if (entityNorm === 'caixaoperation') {
      const type = normalizeLower(payload?.type);
      return type === 'sangria' || type === 'suprimento';
    }

    if (entityNorm === 'pedidopdv' && (httpMethod === 'PUT' || httpMethod === 'PATCH')) {
      const status = normalizeLower(payload?.status);
      return status.startsWith('cancel') || payload?.canceled === true;
    }

    if (entityNorm === 'order' && (httpMethod === 'PUT' || httpMethod === 'PATCH')) {
      const status = normalizeLower(payload?.status);
      const productionStatus = normalizeLower(payload?.production_status);
      const deliveryStatus = normalizeLower(payload?.delivery_status);
      return (
        status === 'cancelled' ||
        productionStatus === 'cancelled' ||
        deliveryStatus === 'cancelled'
      );
    }

    return false;
  }

  function evaluateOrderCollaboratorAction(roles = [], action, payload = {}) {
    const roleSet = new Set(roles);
    const isManagerRole = roleSet.has('gerente') || roleSet.has('gestor_pedidos');

    if (action === 'delete' || action === 'create') {
      return isManagerRole;
    }

    if (action !== 'update') {
      return true;
    }

    const nextStatus = normalizeLower(payload?.status);
    const nextProductionStatus = normalizeLower(payload?.production_status);
    const nextDeliveryStatus = normalizeLower(payload?.delivery_status);

    if (!nextStatus && !nextProductionStatus && !nextDeliveryStatus) {
      if (roleSet.has('cozinha') || roleSet.has('entregador')) {
        return false;
      }
      return true;
    }

    if (isManagerRole) return true;

    if (roleSet.has('cozinha')) {
      if (nextDeliveryStatus) return false;
      return ORDER_COLLABORATOR_STATUS_RULES.cozinha.has(nextProductionStatus || nextStatus);
    }

    if (roleSet.has('entregador')) {
      if (nextProductionStatus) return false;
      return ORDER_COLLABORATOR_STATUS_RULES.entregador.has(nextDeliveryStatus || nextStatus);
    }

    return false;
  }

  async function resolveSubscriberContextForEntity(req, payload = {}) {
    const payloadOwner = normalizeLower(payload?.owner_email || payload?.as_subscriber);
    const queryOwner = normalizeLower(req?.query?.as_subscriber);
    const contextOwner = normalizeLower(req?.user?._contextForSubscriber);
    const userSubscriber = normalizeLower(req?.user?.subscriber_email);
    const userEmail = normalizeLower(req?.user?.email);
    let owner = queryOwner || payloadOwner || contextOwner || userSubscriber || userEmail;

    let subscriber = null;
    if (owner) {
      if (usePostgreSQL) {
        subscriber = await repo.getSubscriberByEmail(owner);
      } else if (db?.subscribers) {
        subscriber = db.subscribers.find((item) => normalizeLower(item?.email) === owner) || null;
      }
    }

    if (!subscriber && !req?.user?.is_master && userSubscriber && userSubscriber !== owner) {
      owner = userSubscriber;
      if (usePostgreSQL) {
        subscriber = await repo.getSubscriberByEmail(owner);
      } else if (db?.subscribers) {
        subscriber = db.subscribers.find((item) => normalizeLower(item?.email) === owner) || null;
      }
    }

    const normalizedOwner = normalizeLower(subscriber?.email || owner);
    return { ownerEmail: normalizedOwner, subscriber };
  }

  async function enforceEntityReadAccess(req, res, entity, payload = {}) {
    const entityNorm = normalizeEntityName(entity);
    const config = ENTITY_ACCESS_CONFIG[entityNorm];
    const shouldTraceEntity = entityNorm === 'dish' || entityNorm === 'category';
    if (!shouldEnforceEntityRead(config)) {
      if (shouldTraceEntity) {
        console.log('[ENTITY_READ_DIAG] skip_enforce', {
          entity: entityNorm,
          reason: 'config.enforceRead=false',
          user: {
            email: req?.user?.email || null,
            subscriber_email: req?.user?.subscriber_email || null,
            subscriber_id: req?.user?.subscriber_id ?? null,
            profile_role: req?.user?.profile_role || null,
            is_master: req?.user?.is_master === true,
          },
        });
      }
      return { allowed: true };
    }

    if (req?.user?.is_master) {
      if (shouldTraceEntity) {
        console.log('[ENTITY_READ_DIAG] allow_master', {
          entity: entityNorm,
          user: {
            email: req?.user?.email || null,
          },
        });
      }
      return { allowed: true };
    }

    const { ownerEmail, subscriber } = await resolveSubscriberContextForEntity(req, payload);
    if (!ownerEmail || !subscriber) {
      if (shouldTraceEntity) {
        console.log('[ENTITY_READ_DIAG] deny_invalid_context', {
          entity: entityNorm,
          ownerEmail: ownerEmail || null,
          subscriberFound: !!subscriber,
          payloadOwner: payload?.owner_email || payload?.as_subscriber || null,
          queryAsSubscriber: req?.query?.as_subscriber || null,
          user: {
            email: req?.user?.email || null,
            subscriber_email: req?.user?.subscriber_email || null,
            subscriber_id: req?.user?.subscriber_id ?? null,
            profile_role: req?.user?.profile_role || null,
          },
        });
      }
      res.status(403).json({
        error: 'Contexto do assinante invalido para esta leitura.',
        code: 'ACTION_NOT_ALLOWED',
      });
      return { allowed: false };
    }

    const action = 'view';
    const permissionMap = parseSubscriberPermissionMap(subscriber);
    if (!hasModuleActionPermission(permissionMap, config.module, action)) {
      if (shouldTraceEntity) {
        console.log('[ENTITY_READ_DIAG] deny_plan_permission', {
          entity: entityNorm,
          module: config.module,
          action,
          ownerEmail,
          subscriber: {
            id: subscriber?.id ?? null,
            email: subscriber?.email || null,
            plan: subscriber?.plan || null,
          },
          permissionMap,
        });
      }
      res.status(403).json({
        error: `Plano atual nao permite ${config.module.toUpperCase()} (${action}).`,
        code: 'PLAN_FEATURE_NOT_AVAILABLE',
        module: config.module,
        action,
        plan: normalizePlanPresetKey(subscriber.plan, { defaultPlan: 'basic' }) || 'basic',
      });
      return { allowed: false };
    }

    const isOwner = isOwnerForSubscriber(req.user, ownerEmail);
    if (!isOwner) {
      const roles = getUserRoleList(req.user);
      const allowedRole = roles.some((role) => config.allowedCollaboratorRoles.has(role));
      if (!allowedRole) {
        if (shouldTraceEntity) {
          console.log('[ENTITY_READ_DIAG] deny_role', {
            entity: entityNorm,
            ownerEmail,
            roles,
            allowedRoles: Array.from(config.allowedCollaboratorRoles),
            user: {
              email: req?.user?.email || null,
              subscriber_email: req?.user?.subscriber_email || null,
              subscriber_id: req?.user?.subscriber_id ?? null,
              profile_role: req?.user?.profile_role || null,
              context_subscriber: req?.user?._contextForSubscriber || null,
            },
          });
        }
        res.status(403).json({
          error: 'Perfil sem permissao para visualizar este modulo.',
          code: 'ROLE_NOT_ALLOWED',
        });
        return { allowed: false };
      }
    }

    const basicScopeCheck = await enforceBasicPlanEntityScope(req, res, entityNorm, 'GET', payload, subscriber, permissionMap);
    if (!basicScopeCheck.allowed) {
      return { allowed: false };
    }

    if (shouldTraceEntity) {
      console.log('[ENTITY_READ_DIAG] allow', {
        entity: entityNorm,
        ownerEmail,
        isOwner,
        user: {
          email: req?.user?.email || null,
          subscriber_email: req?.user?.subscriber_email || null,
          subscriber_id: req?.user?.subscriber_id ?? null,
          profile_role: req?.user?.profile_role || null,
          context_subscriber: req?.user?._contextForSubscriber || null,
        },
        subscriber: {
          id: subscriber?.id ?? null,
          email: subscriber?.email || null,
          plan: subscriber?.plan || null,
        },
      });
    }

    return { allowed: true, ownerEmail, subscriber, permissionMap };
  }

  async function enforceEntityWriteAccess(req, res, entity, method, payload = {}) {
    const entityNorm = normalizeEntityName(entity);
    const config = ENTITY_ACCESS_CONFIG[entityNorm];
    const sanitizedPayload = stripManagerialCredentials(payload);

    if (!config) {
      return { allowed: true, sanitizedPayload };
    }

    if (req?.user?.is_master) {
      return { allowed: true, sanitizedPayload };
    }

    const { ownerEmail, subscriber } = await resolveSubscriberContextForEntity(req, sanitizedPayload);
    if (!ownerEmail || !subscriber) {
      res.status(403).json({
        error: 'Contexto do assinante invalido para esta operacao.',
        code: 'ACTION_NOT_ALLOWED',
      });
      return { allowed: false };
    }

    const action = getEntityCrudAction(method);
    const permissionMap = parseSubscriberPermissionMap(subscriber);
    if (!action || !hasModuleActionPermission(permissionMap, config.module, action)) {
      res.status(403).json({
        error: `Plano atual nao permite ${config.module.toUpperCase()} (${action || 'acao'}).`,
        code: 'PLAN_FEATURE_NOT_AVAILABLE',
        module: config.module,
        action,
        plan: normalizePlanPresetKey(subscriber.plan, { defaultPlan: 'basic' }) || 'basic',
      });
      return { allowed: false };
    }

    const isOwner = isOwnerForSubscriber(req.user, ownerEmail);
    if (!isOwner) {
      const roles = getUserRoleList(req.user);
      const allowedRole = roles.some((role) => config.allowedCollaboratorRoles.has(role));
      if (!allowedRole) {
        res.status(403).json({
          error: 'Perfil sem permissao para operar este modulo.',
          code: 'ROLE_NOT_ALLOWED',
        });
        return { allowed: false };
      }

      if (entityNorm === 'order' && !evaluateOrderCollaboratorAction(roles, action, sanitizedPayload)) {
        res.status(403).json({
          error: 'Acao nao permitida para este perfil operacional em pedidos.',
          code: 'ACTION_NOT_ALLOWED',
          entity: 'Order',
          action,
        });
        return { allowed: false };
      }

      if (isSensitiveEntityAction(entityNorm, method, sanitizedPayload)) {
        const { role: managerialRole } = getManagerialSubscriberAndRole(req);
        const hasRecentAuth = hasRecentManagerialAuthSession(req, ownerEmail, managerialRole);

        if (!hasRecentAuth) {
          const { matricula, password } = extractManagerialCredentials(payload);
          let validFromInlineAuth = false;
          if (matricula && password && usePostgreSQL && repo.validateManagerialAuthorization) {
            validFromInlineAuth = await repo.validateManagerialAuthorization(ownerEmail, managerialRole, matricula, password);
            if (validFromInlineAuth) {
              registerManagerialAuthSession(req, ownerEmail, managerialRole);
            }
          }

          if (!validFromInlineAuth) {
            res.status(403).json({
              error: 'Autorizacao gerencial obrigatoria para esta acao sensivel.',
              code: 'MANAGERIAL_AUTH_REQUIRED',
            });
            return { allowed: false };
          }
        }
      }
    }

    const basicScopeCheck = await enforceBasicPlanEntityScope(req, res, entityNorm, method, sanitizedPayload, subscriber, permissionMap);
    if (!basicScopeCheck.allowed) {
      return { allowed: false };
    }

    return {
      allowed: true,
      sanitizedPayload: basicScopeCheck.scopedPayload || sanitizedPayload,
      ownerEmail,
      subscriber,
      permissionMap,
    };
  }

  return {
    applyBasicScopeFilterToItems,
    applyBasicScopeToEntityResult,
    enforceEntityReadAccess,
    enforceEntityWriteAccess,
    parseSubscriberPermissionMap,
  };
}
