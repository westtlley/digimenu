import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para estado persistido em localStorage (preferências de UI, não tokens sensíveis).
 * API igual a useState: [value, setValue]
 * @param {string} key - Chave no localStorage
 * @param {any} initialValue - Valor inicial se a chave não existir
 * @returns {[any, (value: any | ((prev: any) => any)) => void]}
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item == null) return initialValue;
      return JSON.parse(item);
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        try {
          const toStore = value instanceof Function ? value(prev) : value;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(toStore));
          }
          return toStore;
        } catch (e) {
          console.warn(`[useLocalStorage] Erro ao salvar "${key}":`, e);
          return prev;
        }
      });
    },
    [key]
  );

  // Sincronizar ao mudar em outra aba
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e) => {
      if (e.key === key && e.newValue != null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          setStoredValue(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
