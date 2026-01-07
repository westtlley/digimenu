export const orderService = {
  generateOrderCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  calculateDeliveryFee(deliveryMethod, neighborhood, deliveryZones) {
    if (deliveryMethod !== 'delivery') return 0;
    
    if (!neighborhood) return 0;
    
    const zone = deliveryZones.find((z) =>
      z.neighborhood.toLowerCase().trim() === neighborhood.toLowerCase().trim() && z.is_active
    );
    
    return zone ? zone.fee : 0;
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