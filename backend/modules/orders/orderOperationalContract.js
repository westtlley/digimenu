import {
  decorateOrderEntity,
  normalizeLower,
  normalizeOrderForPersistence,
  resolveOrderDeliveryMethod,
} from '../../utils/orderLifecycle.js';

const DELIVERY_FLOW_STATUSES = new Set([
  'going_to_store',
  'arrived_at_store',
  'picked_up',
  'out_for_delivery',
  'arrived_at_customer',
]);

const DELIVERY_COMPLETION_ALLOWED_FROM = new Set([
  'out_for_delivery',
  'arrived_at_customer',
]);

const DELIVERY_CANCEL_ALLOWED_FROM = new Set([
  'going_to_store',
  'arrived_at_store',
  'picked_up',
  'out_for_delivery',
  'arrived_at_customer',
]);

function getUserRoleList(user) {
  const fromList = Array.isArray(user?.profile_roles)
    ? user.profile_roles.map((role) => normalizeLower(role)).filter(Boolean)
    : [];
  const fromSingle = normalizeLower(user?.profile_role);
  const roles = fromSingle ? [fromSingle, ...fromList] : fromList;
  return [...new Set(roles)];
}

export function createOrderOperationalContract({ repo, db, usePostgreSQL }) {
  async function isOrderAssignedToRequesterEntregador(req, currentOrder = {}, payload = {}) {
    const requesterEmail = normalizeLower(req?.user?.email);
    if (!requesterEmail) return false;

    const currentAssignedId = currentOrder?.entregador_id != null ? String(currentOrder.entregador_id) : null;
    const payloadAssignedId = payload?.entregador_id != null ? String(payload.entregador_id) : null;

    if (currentAssignedId && payloadAssignedId && currentAssignedId !== payloadAssignedId) {
      return false;
    }

    const targetAssignedId = currentAssignedId || payloadAssignedId;
    if (!targetAssignedId) return false;

    if (String(req?.user?.id || '') === targetAssignedId) {
      return true;
    }

    const explicitEmail = normalizeLower(payload?.entregador_email || currentOrder?.entregador_email);
    if (explicitEmail && explicitEmail === requesterEmail) {
      return true;
    }

    if (usePostgreSQL) {
      const entregador = await repo.getEntityById('Entregador', targetAssignedId, req?.user || null);
      return normalizeLower(entregador?.email) === requesterEmail;
    }

    const entregadores = Array.isArray(db?.entities?.Entregador) ? db.entities.Entregador : [];
    const entregador = entregadores.find((item) => String(item?.id || '') === targetAssignedId);
    return normalizeLower(entregador?.email) === requesterEmail;
  }

  async function enforceOrderOperationalStatusContract(req, res, currentOrder = {}, payload = {}) {
    const hasOperationalStatusUpdate =
      payload?.status !== undefined ||
      payload?.production_status !== undefined ||
      payload?.delivery_status !== undefined;
    if (!hasOperationalStatusUpdate) return true;
    if (req?.user?.is_master) return true;

    const currentSnapshot = decorateOrderEntity(currentOrder);
    const nextSnapshot = normalizeOrderForPersistence(payload, currentSnapshot);
    const nextStatus = normalizeLower(nextSnapshot?.status);
    if (!nextStatus) return true;

    const roles = getUserRoleList(req?.user);
    const isManagerRole = roles.includes('gerente') || roles.includes('gestor_pedidos');
    const isKitchenRole = roles.includes('cozinha') && !isManagerRole;
    const isEntregadorRole = roles.includes('entregador') && !isManagerRole;

    const currentProductionStatus = normalizeLower(currentSnapshot?.production_status);
    const nextProductionStatus = normalizeLower(nextSnapshot?.production_status);
    const currentDeliveryStatus = normalizeLower(currentSnapshot?.delivery_status);
    const nextDeliveryStatus = normalizeLower(nextSnapshot?.delivery_status);
    const productionChanged = currentProductionStatus !== nextProductionStatus;
    const deliveryChanged = currentDeliveryStatus !== nextDeliveryStatus;
    const deliveryMethod = resolveOrderDeliveryMethod(nextSnapshot);
    const isDeliveryOrder = deliveryMethod === 'delivery';

    if (DELIVERY_FLOW_STATUSES.has(nextDeliveryStatus) && !isDeliveryOrder) {
      res.status(400).json({
        success: false,
        error: `Transicao invalida para pedidos nao-delivery (${deliveryMethod || 'sem tipo'}).`,
        message: `Status "${nextDeliveryStatus}" exige pedido de entrega.`,
        code: 'INVALID_STATUS_TRANSITION',
      });
      return false;
    }

    if (isKitchenRole && deliveryChanged) {
      res.status(403).json({
        error: 'Perfil cozinha nao pode executar estados de entrega.',
        code: 'ACTION_NOT_ALLOWED',
        entity: 'Order',
        action: 'update',
        status: nextDeliveryStatus || nextStatus,
      });
      return false;
    }

    if (isEntregadorRole) {
      if (productionChanged) {
        res.status(403).json({
          error: 'Perfil entregador nao pode executar estados de producao.',
          code: 'ACTION_NOT_ALLOWED',
          entity: 'Order',
          action: 'update',
          status: nextProductionStatus || nextStatus,
        });
        return false;
      }

      if (!isDeliveryOrder) {
        res.status(403).json({
          error: 'Perfil entregador so pode operar pedidos de entrega.',
          code: 'ACTION_NOT_ALLOWED',
          entity: 'Order',
          action: 'update',
          status: nextDeliveryStatus || nextStatus,
        });
        return false;
      }

      const assignedToRequester = await isOrderAssignedToRequesterEntregador(req, currentOrder, payload);
      if (!assignedToRequester) {
        res.status(403).json({
          error: 'Pedido nao esta atribuido a este entregador.',
          code: 'ACTION_NOT_ALLOWED',
          entity: 'Order',
          action: 'update',
        });
        return false;
      }

      if (nextDeliveryStatus === 'cancelled' && !DELIVERY_CANCEL_ALLOWED_FROM.has(currentDeliveryStatus)) {
        res.status(403).json({
          error: 'Entregador so pode cancelar durante a fase de entrega.',
          code: 'ACTION_NOT_ALLOWED',
          entity: 'Order',
          action: 'update',
          status: nextDeliveryStatus,
        });
        return false;
      }

      if (nextDeliveryStatus === 'delivered' && !DELIVERY_COMPLETION_ALLOWED_FROM.has(currentDeliveryStatus)) {
        res.status(403).json({
          error: 'Entrega so pode ser concluida apos saida para entrega.',
          code: 'ACTION_NOT_ALLOWED',
          entity: 'Order',
          action: 'update',
          status: nextDeliveryStatus,
        });
        return false;
      }
    }

    return true;
  }

  return {
    enforceOrderOperationalStatusContract,
  };
}
