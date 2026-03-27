import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateCartSubtotal, normalizeCartItem, normalizeCartItems } from '@/utils/cartPricing';

const CART_STORAGE_KEY = 'cardapio_cart';

// Função para obter a chave do carrinho baseada no slug (um carrinho por estabelecimento)
export const getCartStorageKey = (slug) => {
  return slug ? `cardapio_cart_${slug}` : CART_STORAGE_KEY;
};

function loadCartFromStorage(slug) {
  try {
    const key = getCartStorageKey(slug);
    const saved = localStorage.getItem(key);
    return saved ? normalizeCartItems(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
}

export function useCart(slug = null, options = {}) {
  const storageKey = getCartStorageKey(slug);
  const { autoLoad = true } = options || {};

  const [cart, setCart] = useState(() => (autoLoad ? loadCartFromStorage(slug) : []));

  const allowPersistRef = useRef(autoLoad);

  const hydrateCart = useCallback((items) => {
    allowPersistRef.current = true;
    setCart(normalizeCartItems(items));
  }, []);

  // Ao trocar de estabelecimento (slug), carregar o carrinho correto para não misturar pedidos
  useEffect(() => {
    if (!autoLoad) return;
    setCart(loadCartFromStorage(slug));
  }, [slug, autoLoad]);

  // Persistir no localStorage sempre que o carrinho mudar (sempre na chave do slug atual)
  useEffect(() => {
    if (!allowPersistRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
      if (!slug) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Erro ao salvar carrinho:', e);
    }
  }, [cart, storageKey, slug]);

  const addItem = useCallback((item) => {
    allowPersistRef.current = true;
    const dish = item?.dish ?? item;
    if (!dish?.id) return;
    const selections = item?.selections ?? {};
    const baseItem = item?.dish
      ? { ...item, id: `${dish.id}_${Date.now()}` }
      : { dish: { ...dish }, quantity: item?.quantity ?? 1, totalPrice: item?.totalPrice ?? dish?.price ?? 0, selections, id: `${dish.id}_${Date.now()}` };
    const cartItem = normalizeCartItem(baseItem);
    setCart(prev => [...prev, cartItem]);
  }, []);

  const updateItem = useCallback((itemId, updatedItem) => {
    allowPersistRef.current = true;
    setCart(prev => prev.map(item => 
      item.id === itemId
        ? normalizeCartItem({ ...item, ...updatedItem, id: itemId, quantity: updatedItem?.quantity ?? item.quantity })
        : item
    ));
  }, []);

  const removeItem = useCallback((itemId) => {
    allowPersistRef.current = true;
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, delta) => {
    allowPersistRef.current = true;
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = (item.quantity || 1) + delta;
        if (newQty <= 0) return null;
        return normalizeCartItem({ ...item, quantity: newQty });
      }
      return item;
    }).filter(Boolean));
  }, []);

  const clearCart = useCallback(() => {
    allowPersistRef.current = true;
    setCart([]);
  }, []);

  const cartTotal = calculateCartSubtotal(cart);
  const cartItemsCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return {
    cart,
    addItem,
    updateItem,
    removeItem,
    updateQuantity,
    clearCart,
    hydrateCart,
    cartTotal,
    cartItemsCount
  };
}
