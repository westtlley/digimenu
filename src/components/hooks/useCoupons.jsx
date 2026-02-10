import { useState, useCallback, useEffect } from 'react';

const COUPON_STORAGE_KEY = 'cardapio_applied_coupon';

function getCouponStorageKey(slug) {
  return slug ? `cardapio_applied_coupon_${slug}` : COUPON_STORAGE_KEY;
}

export function useCoupons(coupons, cartTotal, slug = null) {
  const storageKey = getCouponStorageKey(slug);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [couponError, setCouponError] = useState('');

  // Ao trocar de estabelecimento, recarregar cupom do slug atual
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getCouponStorageKey(slug));
      setAppliedCoupon(saved ? JSON.parse(saved) : null);
    } catch {
      setAppliedCoupon(null);
    }
  }, [slug]);

  // Persistir cupom aplicado (por slug)
  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(storageKey, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.error('Erro ao salvar cupom:', e);
    }
  }, [appliedCoupon, storageKey]);

  const validateAndApply = useCallback((overrideCode) => {
    setCouponError('');
    const code = (overrideCode !== undefined && overrideCode !== null ? String(overrideCode) : couponCode).toUpperCase().trim();
    
    if (!code) {
      const msg = 'Digite um código de cupom';
      setCouponError(msg);
      return { success: false, error: msg };
    }

    const coupon = coupons.find((c) => c.code === code);
    
    if (!coupon) {
      const msg = 'Cupom não encontrado';
      setCouponError(msg);
      return { success: false, error: msg };
    }
    
    if (!coupon.is_active) {
      const msg = 'Cupom inativo';
      setCouponError(msg);
      return { success: false, error: msg };
    }
    
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      const msg = 'Cupom expirado';
      setCouponError(msg);
      return { success: false, error: msg };
    }
    
    if (coupon.max_uses > 0 && (coupon.current_uses || 0) >= coupon.max_uses) {
      const msg = 'Cupom esgotado';
      setCouponError(msg);
      return { success: false, error: msg };
    }
    
    if (coupon.min_order_value && cartTotal < coupon.min_order_value) {
      const msg = `Pedido mínimo: R$ ${coupon.min_order_value.toFixed(2)}`;
      setCouponError(msg);
      return { success: false, error: msg };
    }
    
    setAppliedCoupon(coupon);
    setCouponCode('');
    const discount = coupon.discount_type === 'percentage'
      ? cartTotal * coupon.discount_value / 100
      : coupon.discount_value;
    return { success: true, error: null, discount };
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