import { useState, useEffect, useCallback } from 'react';

const CART_STORAGE_KEY = 'cardapio_cart';

export function useCart() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistir no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Erro ao salvar carrinho:', e);
    }
  }, [cart]);

  const addItem = useCallback((item) => {
    setCart(prev => [...prev, { ...item, quantity: 1, id: `${item.dish.id}_${Date.now()}` }]);
  }, []);

  const updateItem = useCallback((itemId, updatedItem) => {
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...updatedItem, id: itemId, quantity: item.quantity } : item
    ));
  }, []);

  const removeItem = useCallback((itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = (item.quantity || 1) + delta;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * (item.quantity || 1), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return {
    cart,
    addItem,
    updateItem,
    removeItem,
    updateQuantity,
    clearCart,
    cartTotal,
    cartItemsCount
  };
}