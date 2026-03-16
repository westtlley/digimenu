import { query } from '../db/postgres.js';

export function normalizeEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

export function normalizeSubscriberId(value) {
  if (value == null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildTenantContext(subscriber = null, overrides = {}) {
  const subscriberId = normalizeSubscriberId(overrides.subscriberId ?? subscriber?.id);
  const subscriberEmail = normalizeEmail(overrides.subscriberEmail ?? subscriber?.email);
  const linkedUserEmail = normalizeEmail(overrides.linkedUserEmail ?? subscriber?.linked_user_email);
  const slug = String((overrides.slug ?? subscriber?.slug) || '').trim() || null;

  return {
    subscriberId,
    subscriberEmail,
    linkedUserEmail,
    slug,
  };
}

export function hasTenantContext(context) {
  return Boolean(normalizeSubscriberId(context?.subscriberId) || normalizeEmail(context?.subscriberEmail));
}

export async function getSubscriberByIdentifier({ subscriberId = null, subscriberEmail = null, slug = null } = {}) {
  const normalizedId = normalizeSubscriberId(subscriberId);
  if (normalizedId != null) {
    const byId = await query('SELECT * FROM subscribers WHERE id = $1 LIMIT 1', [normalizedId]);
    if (byId.rows[0]) return byId.rows[0];
  }

  const normalizedEmail = normalizeEmail(subscriberEmail);
  if (normalizedEmail) {
    const byEmail = await query(
      `SELECT * FROM subscribers
       WHERE LOWER(TRIM(email)) = $1
          OR (linked_user_email IS NOT NULL AND LOWER(TRIM(linked_user_email)) = $1)
       LIMIT 1`,
      [normalizedEmail]
    );
    if (byEmail.rows[0]) return byEmail.rows[0];
  }

  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (normalizedSlug) {
    const bySlug = await query(
      'SELECT * FROM subscribers WHERE LOWER(TRIM(slug)) = $1 LIMIT 1',
      [normalizedSlug]
    );
    if (bySlug.rows[0]) return bySlug.rows[0];
  }

  return null;
}

export async function resolveTenantContext({ subscriberId = null, subscriberEmail = null, slug = null } = {}) {
  const subscriber = await getSubscriberByIdentifier({ subscriberId, subscriberEmail, slug });
  if (subscriber) {
    return buildTenantContext(subscriber);
  }

  return buildTenantContext(null, { subscriberId, subscriberEmail, slug });
}

export async function resolveTenantContextForUser(user = null) {
  if (!user) {
    return buildTenantContext();
  }

  if (user.is_master && !user._contextForSubscriberId && !user._contextForSubscriber) {
    return buildTenantContext();
  }

  const requestedSubscriberId =
    user._contextForSubscriberId ??
    user.subscriber_id ??
    null;

  const requestedSubscriberEmail =
    user._contextForSubscriber ??
    user.subscriber_email ??
    (!user.is_master ? user.email : null);

  if (requestedSubscriberId != null && requestedSubscriberEmail) {
    return buildTenantContext(null, {
      subscriberId: requestedSubscriberId,
      subscriberEmail: requestedSubscriberEmail,
    });
  }

  return resolveTenantContext({
    subscriberId: requestedSubscriberId,
    subscriberEmail: requestedSubscriberEmail,
  });
}

export async function applyTenantContextToUser(user = null, identifiers = {}) {
  const tenantContext = await resolveTenantContext(identifiers);
  if (user && hasTenantContext(tenantContext)) {
    user._contextForSubscriberId = tenantContext.subscriberId;
    user._contextForSubscriber = tenantContext.subscriberEmail;
  }
  return tenantContext;
}
