export function createUpdateSubscriberFunctionHandler({
  establishmentsController,
}) {
  return async function updateSubscriberFunctionHandler(req, res) {
    try {
      console.log(
        '[updateSubscriber] Chamado por:',
        req.user?.email,
        'is_master:',
        req.user?.is_master
      );

      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { id, data: updateData } = req.body || {};
      console.log('[updateSubscriber] ID:', id, 'tem data:', !!updateData);

      if (!id) {
        return res.status(400).json({ error: 'id e obrigatorio' });
      }

      req.params = { ...req.params, id: String(id) };
      req.body = updateData || req.body || {};

      await establishmentsController.updateSubscriber(req, res, () => {});
    } catch (error) {
      console.error('[updateSubscriber] Erro:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
