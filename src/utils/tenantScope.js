export function normalizeTenantId(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeTenantEmail(value) {
  const normalized = String(value || '').toLowerCase().trim();
  return normalized || null;
}

export function getTenantScopeKey(subscriberId = null, subscriberEmail = null, fallback = 'self') {
  const normalizedId = normalizeTenantId(subscriberId);
  if (normalizedId != null) {
    return `sid:${normalizedId}`;
  }

  const normalizedEmail = normalizeTenantEmail(subscriberEmail);
  if (normalizedEmail) {
    return `sem:${normalizedEmail}`;
  }

  return fallback;
}

export function buildTenantEntityOpts({ subscriberId = null, subscriberEmail = null } = {}) {
  const opts = {};
  const normalizedId = normalizeTenantId(subscriberId);
  const normalizedEmail = normalizeTenantEmail(subscriberEmail);

  if (normalizedId != null) {
    opts.as_subscriber_id = normalizedId;
  }
  if (normalizedEmail) {
    opts.as_subscriber = normalizedEmail;
  }

  return opts;
}

export function getMenuContextEntityOpts(menuContext) {
  if (!menuContext || menuContext.type !== 'subscriber') {
    return {};
  }

  return buildTenantEntityOpts({
    subscriberId: menuContext.subscriber_id,
    subscriberEmail: menuContext.value,
  });
}

export function getMenuContextSubscriberId(menuContext, fallback = null) {
  if (menuContext?.type === 'subscriber') {
    return normalizeTenantId(menuContext.subscriber_id);
  }

  return normalizeTenantId(fallback);
}

export function getMenuContextSubscriberEmail(menuContext, fallback = null) {
  if (menuContext?.type === 'subscriber') {
    return normalizeTenantEmail(menuContext.value);
  }

  return normalizeTenantEmail(fallback);
}

export function getMenuContextQueryKeyParts(menuContext) {
  if (!menuContext) return [];

  if (menuContext.type === 'subscriber') {
    return [
      menuContext.type,
      getTenantScopeKey(menuContext.subscriber_id, menuContext.value, 'subscriber'),
    ];
  }

  return [
    menuContext.type,
    menuContext.value ?? menuContext.type,
  ];
}

export function getMenuContextScopeKey(menuContext, fallback = 'self') {
  if (!menuContext) return fallback;

  if (menuContext.type === 'subscriber') {
    return getTenantScopeKey(menuContext.subscriber_id, menuContext.value, fallback);
  }

  const slugValue = String(menuContext.value || '').trim();
  if (slugValue) {
    return `${menuContext.type}:${slugValue}`;
  }

  return fallback;
}

export function userMatchesTenant(user, { subscriberId = null, subscriberEmail = null } = {}) {
  if (user?.is_master === true) return true;

  const targetId = normalizeTenantId(subscriberId);
  const userSubscriberId = normalizeTenantId(user?.subscriber_id);

  if (targetId != null && userSubscriberId != null) {
    return String(targetId) === String(userSubscriberId);
  }

  const targetEmail = normalizeTenantEmail(subscriberEmail);
  if (!targetEmail) return true;

  const userSubscriberEmail = normalizeTenantEmail(user?.subscriber_email);
  const userEmail = normalizeTenantEmail(user?.email);

  return userSubscriberEmail === targetEmail || userEmail === targetEmail;
}

export function userIsTenantOwner(user) {
  if (!user) return false;
  if (user?.is_owner != null) return user.is_owner === true;

  const userEmail = normalizeTenantEmail(user?.email);
  const userSubscriberEmail = normalizeTenantEmail(user?.subscriber_email);

  return !!userEmail && !!userSubscriberEmail && userEmail === userSubscriberEmail;
}

export function getPersistedMenuContext() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem('userContext');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.menuContext || null;
  } catch (_error) {
    return null;
  }
}

export function getScopedStorageKey(baseKey, menuContext = null, fallback = 'global') {
  const context = menuContext || getPersistedMenuContext();

  if (!context) {
    return `${baseKey}:${fallback}`;
  }

  if (context.type === 'subscriber') {
    return `${baseKey}:${getTenantScopeKey(context.subscriber_id, context.value, fallback)}`;
  }

  const value = String(context.value || '').trim();
  return `${baseKey}:${context.type}:${value || fallback}`;
}
