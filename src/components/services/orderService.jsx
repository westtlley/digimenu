import {
  calculateDeliveryContext,
  resolveCheckoutAddressMode,
  resolveDeliveryPricingMode,
} from '@/utils/deliveryRules';

export const orderService = {
  generateOrderCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  /**
   * Calcula taxa de entrega por zona ou por distância
   * @param {string} deliveryMethod - 'delivery' ou 'pickup'
   * @param {string} neighborhood - Bairro do cliente (para cálculo por zona)
   * @param {Array} deliveryZones - Zonas de entrega configuradas
   * @param {Object} store - Dados da loja (para cálculo por distância)
   * @param {number} customerLat - Latitude do cliente
   * @param {number} customerLng - Longitude do cliente
   * @returns {number} Taxa de entrega calculada
   */
  calculateDeliveryContext(deliveryMethod, neighborhood, deliveryZones, store = null, customerLat = null, customerLng = null) {
    return calculateDeliveryContext({
      deliveryMethod,
      neighborhood,
      deliveryZones,
      store,
      customerLat,
      customerLng,
    });
  },

  calculateDeliveryFee(deliveryMethod, neighborhood, deliveryZones, store = null, customerLat = null, customerLng = null) {
    return this.calculateDeliveryContext(
      deliveryMethod,
      neighborhood,
      deliveryZones,
      store,
      customerLat,
      customerLng
    ).deliveryFee;
  },

  resolveCheckoutAddressMode(store = null) {
    return resolveCheckoutAddressMode(store);
  },

  resolveDeliveryPricingMode(store = null) {
    return resolveDeliveryPricingMode(store);
  },

  formatFullAddress(customer) {
    if (customer.deliveryMethod !== 'delivery') return '';
    
    let fullAddress = `${customer.address_street}, ${customer.address_number}`;
    if (customer.address_complement) {
      fullAddress += ` - ${customer.address_complement}`;
    }
    fullAddress += ` - ${customer.neighborhood}`;
    
    return fullAddress;
  },

  calculateTotals(cartTotal, discount, deliveryFee) {
    return {
      subtotal: cartTotal,
      discount,
      deliveryFee,
      total: cartTotal - discount + deliveryFee
    };
  },

  async createOrder(orderData, createOrderMutation) {
    return await createOrderMutation.mutateAsync(orderData);
  },

  async updateCouponUsage(coupon, updateCouponMutation) {
    if (!coupon) return;
    
    await updateCouponMutation.mutateAsync({
      id: coupon.id,
      data: { ...coupon, current_uses: (coupon.current_uses || 0) + 1 }
    });
  }
};
