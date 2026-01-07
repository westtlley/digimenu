import { useState, useCallback, useEffect } from 'react';

const COUPON_STORAGE_KEY = 'cardapio_applied_coupon';

export function useCoupons(coupons, cartTotal) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem(COUPON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [couponError, setCouponError] = useState('');

  // Persistir cupom aplicado
  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Erro ao salvar cupom:', e);
    }
  }, [appliedCoupon]);

  const validateAndApply = useCallback(() => {
    setCouponError('');
    const code = couponCode.toUpperCase().trim();
    
    if (!code) {
      setCouponError('Digite um código de cupom');
      return false;
    }

    const coupon = coupons.find((c) => c.code === code);
    
    if (!coupon) {
      setCouponError('Cupom não encontrado');
      return false;
    }
    
    if (!coupon.is_active) {
      setCouponError('Cupom inativo');
      return false;
    }
    
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      setCouponError('Cupom expirado');
      return false;
    }
    
    if (coupon.max_uses > 0 && (coupon.current_uses || 0) >= coupon.max_uses) {
      setCouponError('Cupom esgotado');
      return false;
    }
    
    if (coupon.min_order_value && cartTotal < coupon.min_order_value) {
      setCouponError(`Pedido mínimo: R$ ${coupon.min_order_value.toFixed(2)}`);
      return false;
    }
    
    setAppliedCoupon(coupon);
    setCouponCode('');
    return true;
  }, [couponCode, coupons, cartTotal]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError('');
  }, []);

  const calculateDiscount = useCallback(() => {
    if (!appliedCoupon) return 0;
    
    return appliedCoupon.discount_type === 'percentage' 
      ? cartTotal * appliedCoupon.discount_value / 100 
      : appliedCoupon.discount_value;
  }, [appliedCoupon, cartTotal]);

  return {
    couponCode,
    setCouponCode,
    appliedCoupon,
    couponError,
    validateAndApply,
    removeCoupon,
    calculateDiscount
  };
}