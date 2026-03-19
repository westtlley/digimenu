function createMasterSubscriberFunctionHandler({
  establishmentsController,
  controllerMethodName,
  logLabel,
}) {
  return async function subscriberFunctionHandler(req, res) {
    try {
      if (!req.user?.is_master) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      await establishmentsController[controllerMethodName](req, res, () => {});
    } catch (error) {
      console.error(`[${logLabel}] Erro:`, error);
      res.status(500).json({ error: error.message });
    }
  };
}

export function createCreateSubscriberFunctionHandler({ establishmentsController }) {
  return createMasterSubscriberFunctionHandler({
    establishmentsController,
    controllerMethodName: 'createSubscriber',
    logLabel: 'createSubscriber',
  });
}

export function createGetSubscribersFunctionHandler({ establishmentsController }) {
  return createMasterSubscriberFunctionHandler({
    establishmentsController,
    controllerMethodName: 'listSubscribers',
    logLabel: 'getSubscribers',
  });
}
