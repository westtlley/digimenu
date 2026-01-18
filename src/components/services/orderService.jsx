import { calculateDistance, calculateDeliveryFeeByDistance } from '@/utils/distanceUtils';

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
  calculateDeliveryFee(deliveryMethod, neighborhood, deliveryZones, store = null, customerLat = null, customerLng = null) {
    if (deliveryMethod !== 'delivery') return 0;

    // Modo: Cálculo por Distância (M/KM)
    if (store?.delivery_fee_mode === 'distance' && customerLat && customerLng) {
      // Verificar se a loja tem coordenadas
      if (store.latitude && store.longitude) {
        const distanceKm = calculateDistance(
          store.latitude,
          store.longitude,
          customerLat,
          customerLng
        );

        const config = {
          baseFee: store.delivery_base_fee || 0,
          pricePerKm: store.delivery_price_per_km || 0,
          minFee: store.delivery_min_fee || 0,
          maxFee: store.delivery_max_fee || null,
          freeDeliveryDistance: store.delivery_free_distance || null,
        };

        return calculateDeliveryFeeByDistance(distanceKm, config);
      }
    }

    // Modo: Cálculo por Zona (padrão)
    if (!neighborhood) return store?.delivery_fee || 0;

    const zone = deliveryZones?.find((z) =>
      z.neighborhood?.toLowerCase().trim() === neighborhood.toLowerCase().trim() && z.is_active
    );

    return zone ? zone.fee : (store?.delivery_fee || 0);
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