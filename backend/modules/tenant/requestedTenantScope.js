export function createRequestedTenantScopeApplier({
  applyTenantContextToUser,
  resolveTenantContext,
}) {
  async function applyRequestedTenantScope(req, identifiers = {}) {
    const subscriberId = identifiers?.subscriberId ?? null;
    const subscriberEmail = identifiers?.subscriberEmail ?? null;

    if (!subscriberId && !subscriberEmail) {
      return null;
    }

    const tenantContext = await resolveTenantContext({
      subscriberId,
      subscriberEmail,
    });

    if (!tenantContext?.subscriberId && !tenantContext?.subscriberEmail) {
      return null;
    }

    if (req.user?.is_master) {
      await applyTenantContextToUser(req.user, tenantContext);
      return tenantContext;
    }

    const currentTenant = await resolveTenantContext({
      subscriberId: req.user?.subscriber_id ?? null,
      subscriberEmail: req.user?.subscriber_email || req.user?.email,
    });

    const sameSubscriberId =
      tenantContext?.subscriberId != null &&
      currentTenant?.subscriberId != null &&
      Number(tenantContext.subscriberId) === Number(currentTenant.subscriberId);

    const sameSubscriberEmail =
      tenantContext?.subscriberEmail &&
      currentTenant?.subscriberEmail &&
      String(tenantContext.subscriberEmail).toLowerCase() === String(currentTenant.subscriberEmail).toLowerCase();

    if (sameSubscriberId || sameSubscriberEmail) {
      await applyTenantContextToUser(req.user, tenantContext);
      return tenantContext;
    }

    return null;
  }

  return {
    applyRequestedTenantScope,
  };
}
