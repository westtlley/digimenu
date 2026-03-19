export function createFinalizeSaleHandler({
  applyRequestedTenantScope,
  enforceEntityWriteAccess,
  finalizePdvSaleAtomic,
}) {
  return async function finalizeSaleHandler(req, res) {
    const payload = req.body || {};
    const asSub = req.query?.as_subscriber || payload?.as_subscriber;
    const asSubId = req.query?.as_subscriber_id || payload?.as_subscriber_id;

    await applyRequestedTenantScope(req, {
      subscriberId: asSubId,
      subscriberEmail: asSub,
    });

    if (!payload?.client_request_id || !String(payload.client_request_id).trim()) {
      return res.status(400).json({
        error: 'client_request_id e obrigatorio.',
        code: 'CLIENT_REQUEST_ID_REQUIRED',
      });
    }

    const pdvGuard = await enforceEntityWriteAccess(req, res, 'PedidoPDV', 'POST', {
      owner_email:
        payload.owner_email ||
        asSub ||
        req.user?._contextForSubscriber ||
        req.user?.subscriber_email ||
        req.user?.email,
    });
    if (!pdvGuard.allowed) return;

    const ownerEmail = pdvGuard.ownerEmail || pdvGuard.subscriber?.email;
    const caixaGuard = await enforceEntityWriteAccess(req, res, 'CaixaOperation', 'POST', {
      owner_email: ownerEmail,
      type: 'venda_pdv',
    });
    if (!caixaGuard.allowed) return;

    try {
      const result = await finalizePdvSaleAtomic({
        user: req.user,
        ownerEmail,
        ownerSubscriberId:
          caixaGuard.subscriber?.id ||
          pdvGuard.subscriber?.id ||
          req.user?._contextForSubscriberId ||
          null,
        payload: {
          ...payload,
          owner_email: ownerEmail,
        },
      });
      return res.status(result.idempotent ? 200 : 201).json(result);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) {
        console.error('[PDV] Erro ao finalizar venda:', error);
      }
      return res.status(status).json({
        error: error?.message || 'Erro ao finalizar venda PDV.',
        code: error?.code || 'PDV_FINALIZE_SALE_ERROR',
      });
    }
  };
}
