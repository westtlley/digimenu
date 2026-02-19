import { useState, useEffect, useCallback } from 'react';

const CART_STORAGE_KEY = 'cardapio_cart';

// Função para obter a chave do carrinho baseada no slug (um carrinho por estabelecimento)
export const getCartStorageKey = (slug) => {
  return slug ? `cardapio_cart_${slug}` : CART_STORAGE_KEY;
};

function loadCartFromStorage(slug) {
  try {
    const key = getCartStorageKey(slug);
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function useCart(slug = null) {
  const storageKey = getCartStorageKey(slug);
  const [cart, setCart] = useState(() => loadCartFromStorage(slug));

  // Ao trocar de estabelecimento (slug), carregar o carrinho correto para não misturar pedidos
  useEffect(() => {
    setCart(loadCartFromStorage(slug));
  }, [slug]);

  // Persistir no localStorage sempre que o carrinho mudar (sempre na chave do slug atual)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
      if (!slug) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Erro ao salvar carrinho:', e);
    }
  }, [cart, storageKey, slug]);

  const addItem = useCallback((item) => {
    const dish = item?.dish ?? item;
    if (!dish?.id) return;
    const qty = item?.quantity ?? 1;
    const totalPrice = item?.totalPrice ?? dish?.price ?? 0;
    const selections = item?.selections ?? {};
    const cartItem = item?.dish
      ? { ...item, quantity: qty, id: `${dish.id}_${Date.now()}` }
      : { dish: { ...dish }, quantity: qty, totalPrice, selections, id: `${dish.id}_${Date.now()}` };
    setCart(prev => [...prev, cartItem]);
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