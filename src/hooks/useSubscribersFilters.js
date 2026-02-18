import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Hook: filtros de assinantes (busca debounced + filtro avançado + quick filter).
 * @param {Array} subscribers - Lista bruta da página atual
 * @returns {{ filteredSubscribers, stats, searchTerm, setSearchTerm, advancedFiltered, setAdvancedFiltered, setQuickFilter }}
 */
export function useSubscribersFilters(subscribers = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFiltered, setAdvancedFiltered] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredSubscribers = useMemo(() => {
    const base = advancedFiltered !== null ? advancedFiltered : subscribers;
    if (!debouncedSearch.trim()) return base;
    const term = debouncedSearch.toLowerCase().trim();
    return base.filter(
      (s) =>
        s.email?.toLowerCase().includes(term) ||
        s.name?.toLowerCase().includes(term)
    );
  }, [subscribers, debouncedSearch, advancedFiltered]);

  const stats = useMemo(() => {
    const list = Array.isArray(subscribers) ? subscribers : [];
    return {
      total: list.length,
      active: list.filter((s) => s.status === 'active').length,
      inactive: list.filter((s) => s.status === 'inactive').length,
      free: list.filter((s) => s.plan === 'free' && s.status === 'active').length,
      basic: list.filter((s) => s.plan === 'basic' && s.status === 'active').length,
      pro: list.filter((s) => s.plan === 'pro' && s.status === 'active').length,
      ultra: list.filter((s) => s.plan === 'ultra' && s.status === 'active').length,
    };
  }, [subscribers]);

  const setQuickFilter = (filter) => {
    if (filter === null || filter === 'all') {
      setAdvancedFiltered(null);
      return;
    }
    if (filter === 'active' || filter === 'inactive') {
      setAdvancedFiltered(subscribers.filter((s) => s.status === filter));
      return;
    }
    setAdvancedFiltered(
      subscribers.filter((s) => s.plan === filter && s.status === 'active')
    );
  };

  return {
    filteredSubscribers,
    stats,
    searchTerm,
    setSearchTerm,
    advancedFiltered,
    setAdvancedFiltered,
    setQuickFilter,
  };
}
