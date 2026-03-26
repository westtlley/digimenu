import React from 'react';

const PDV_DEFAULT_QTY_MAX = 99;

function normalizeDefaultQuantity(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 1;
  return Math.max(1, Math.min(PDV_DEFAULT_QTY_MAX, Math.round(numericValue)));
}

function normalizeDefaultQuantityMap(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [dishId, quantity]) => {
    const normalizedDishId = String(dishId || '').trim();
    if (!normalizedDishId) return accumulator;

    const normalizedQuantity = normalizeDefaultQuantity(quantity);
    if (normalizedQuantity <= 1) return accumulator;

    accumulator[normalizedDishId] = normalizedQuantity;
    return accumulator;
  }, {});
}

export function usePDVDefaultQuantities({ storageKey }) {
  const [defaultQuantities, setDefaultQuantities] = React.useState({});

  React.useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return;

    try {
      const rawDefaultQuantities = window.localStorage.getItem(storageKey);
      const parsedDefaultQuantities = rawDefaultQuantities ? JSON.parse(rawDefaultQuantities) : {};
      setDefaultQuantities(normalizeDefaultQuantityMap(parsedDefaultQuantities));
    } catch (error) {
      console.warn('[PDV] Nao foi possivel carregar quantidades padrao:', error);
      setDefaultQuantities({});
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return;
    const normalizedDefaultQuantities = normalizeDefaultQuantityMap(defaultQuantities);
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedDefaultQuantities));
  }, [defaultQuantities, storageKey]);

  const getDefaultQuantity = React.useCallback((dishId) => {
    const normalizedDishId = String(dishId || '').trim();
    if (!normalizedDishId) return 1;
    return normalizeDefaultQuantity(defaultQuantities?.[normalizedDishId] || 1);
  }, [defaultQuantities]);

  const setDishDefaultQuantity = React.useCallback((dishId, quantity) => {
    const normalizedDishId = String(dishId || '').trim();
    if (!normalizedDishId) return;

    setDefaultQuantities((current) => {
      const next = { ...normalizeDefaultQuantityMap(current) };
      const normalizedQuantity = normalizeDefaultQuantity(quantity);

      if (normalizedQuantity <= 1) {
        delete next[normalizedDishId];
      } else {
        next[normalizedDishId] = normalizedQuantity;
      }

      return next;
    });
  }, []);

  return {
    defaultQuantities,
    getDefaultQuantity,
    setDishDefaultQuantity,
  };
}
