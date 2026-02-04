import { useState, useEffect, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'favorites_dishes';

export function useFavorites(slug = 'default') {
  const storageKey = `${FAVORITES_STORAGE_KEY}_${slug}`;
  
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch (e) {
      console.error('Erro ao salvar favoritos:', e);
    }
  }, [favorites, storageKey]);

  const addFavorite = useCallback((dish) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === dish.id)) return prev;
      return [...prev, { id: dish.id, dish, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFavorite = useCallback((dishId) => {
    setFavorites(prev => prev.filter(f => f.id !== dishId));
  }, []);

  const toggleFavorite = useCallback((dish) => {
    if (isFavorite(dish.id)) {
      removeFavorite(dish.id);
    } else {
      addFavorite(dish);
    }
  }, []);

  const isFavorite = useCallback((dishId) => {
    return favorites.some(f => f.id === dishId);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites
  };
}
