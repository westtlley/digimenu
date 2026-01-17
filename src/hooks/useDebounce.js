import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * Útil para buscas e inputs que não devem ser processados a cada tecla
 * @param {*} value - Valor a ser debounced
 * @param {number} delay - Delay em milissegundos (padrão: 300ms)
 * @returns {*} Valor debounced
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
