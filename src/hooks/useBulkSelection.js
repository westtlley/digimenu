import { useState, useCallback } from 'react';

/**
 * Hook: seleção em lote por IDs.
 * @param {Array} items - Lista de itens
 * @param {(item) => string|number} getId - Função que retorna o id do item
 * @returns {{ selectedIds, isSelected, toggle, selectAll, clear }}
 */
export function useBulkSelection(items = [], getId = (item) => item?.id) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const isSelected = useCallback(
    (id) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (ids) => {
      const idList = Array.isArray(ids) ? ids : items.map(getId).filter(Boolean);
      setSelectedIds(new Set(idList));
    },
    [items, getId]
  );

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const setSelectedIdsFromArray = useCallback((ids) => {
    setSelectedIds(new Set(ids));
  }, []);

  return {
    selectedIds,
    setSelectedIds: setSelectedIdsFromArray,
    isSelected,
    toggle,
    selectAll,
    clear,
  };
}
