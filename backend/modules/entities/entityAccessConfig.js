import { normalizeLower } from '../../utils/orderLifecycle.js';

export const ENTITY_ACCESS_CONFIG = {
  caixa: { module: 'caixa', allowedCollaboratorRoles: new Set(['gerente', 'pdv']), enforceRead: true },
  caixaoperation: { module: 'caixa', allowedCollaboratorRoles: new Set(['gerente', 'pdv']), enforceRead: true },
  pedidopdv: { module: 'pdv', allowedCollaboratorRoles: new Set(['gerente', 'pdv']), enforceRead: true },
  pdvsession: { module: 'pdv', allowedCollaboratorRoles: new Set(['gerente', 'pdv']), enforceRead: true },
  dish: { module: 'dishes', allowedCollaboratorRoles: new Set(['gerente']), enforceRead: true },
  category: { module: 'dishes', allowedCollaboratorRoles: new Set(['gerente']) },
  complementgroup: { module: 'dishes', allowedCollaboratorRoles: new Set(['gerente']) },
  combo: { module: 'dishes', allowedCollaboratorRoles: new Set(['gerente']), enforceRead: true },
  beveragecategory: { module: 'dishes', allowedCollaboratorRoles: new Set(['gerente']) },
  dishingredient: { module: 'dishes', allowedCollaboratorRoles: new Set(['gerente']) },
  ingredient: { module: 'dishes', allowedCollaboratorRoles: new Set(['gerente']) },
  flavor: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  flavorcategory: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  pizzacategory: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  pizzaedge: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  pizzaextra: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  pizzaflavor: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  pizzasize: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  pizzavisualizationconfig: { module: 'pizza_config', allowedCollaboratorRoles: new Set(['gerente']) },
  deliveryzone: { module: 'delivery_zones', allowedCollaboratorRoles: new Set(['gerente']) },
  coupon: { module: 'coupons', allowedCollaboratorRoles: new Set(['gerente']) },
  promotion: { module: 'promotions', allowedCollaboratorRoles: new Set(['gerente']) },
  store: { module: 'store', allowedCollaboratorRoles: new Set(['gerente']) },
  storeconfig: { module: 'store', allowedCollaboratorRoles: new Set(['gerente']) },
  subscriber: { module: 'store', allowedCollaboratorRoles: new Set(['gerente']), enforceRead: true },
  paymentconfig: { module: 'payments', allowedCollaboratorRoles: new Set(['gerente']), enforceRead: true },
  loyaltyconfig: { module: 'promotions', allowedCollaboratorRoles: new Set(['gerente']), enforceRead: true },
  loyaltyreward: { module: 'promotions', allowedCollaboratorRoles: new Set(['gerente']), enforceRead: true },
  notification: { module: 'promotions', allowedCollaboratorRoles: new Set(['gerente']), enforceRead: true },
  messagetemplate: { module: 'gestor_pedidos', allowedCollaboratorRoles: new Set(['gerente', 'gestor_pedidos']), enforceRead: true },
  customer: { module: 'clients', allowedCollaboratorRoles: new Set(['gerente', 'gestor_pedidos']) },
  printerconfig: { module: 'printer', allowedCollaboratorRoles: new Set(['gerente', 'pdv']), enforceRead: true },
  stockmovement: { module: 'inventory', allowedCollaboratorRoles: new Set(['gerente']) },
  affiliate: { module: 'affiliates', allowedCollaboratorRoles: new Set(['gerente']) },
  referral: { module: 'affiliates', allowedCollaboratorRoles: new Set(['gerente']) },
  user2fa: { module: '2fa', allowedCollaboratorRoles: new Set(['gerente']) },
  servicerequest: { module: 'dashboard', allowedCollaboratorRoles: new Set(), enforceRead: true },
  order: { module: 'orders', allowedCollaboratorRoles: new Set(['gerente', 'gestor_pedidos', 'cozinha', 'entregador']) },
  comanda: { module: 'comandas', allowedCollaboratorRoles: new Set(['gerente', 'garcom', 'pdv']) },
  table: { module: 'tables', allowedCollaboratorRoles: new Set(['gerente', 'garcom']) },
  waitercall: { module: 'garcom', allowedCollaboratorRoles: new Set(['gerente', 'garcom']) },
  entregador: { module: 'gestor_pedidos', allowedCollaboratorRoles: new Set(['gerente', 'gestor_pedidos']) },
};

export const ORDER_COLLABORATOR_STATUS_RULES = {
  cozinha: new Set(['accepted', 'preparing', 'ready']),
  entregador: new Set([
    'going_to_store',
    'arrived_at_store',
    'picked_up',
    'out_for_delivery',
    'arrived_at_customer',
    'delivered',
    'cancelled',
  ]),
};

export function normalizeEntityName(entity = '') {
  return normalizeLower(entity).replace(/\s+/g, '');
}
