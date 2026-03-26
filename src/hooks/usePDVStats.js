import React from 'react';

const PDV_STATS_RECENCY_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;
const PDV_STATS_RECENCY_WEIGHT = 6;

function normalizePdvStats(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') return {};

  return Object.entries(rawValue).reduce((accumulator, [dishId, rawStat]) => {
    const normalizedDishId = String(dishId || '').trim();
    if (!normalizedDishId) return accumulator;

    const count = Number(rawStat?.count || 0);
    const lastUsedAt = Number(rawStat?.lastUsedAt || 0);

    if (!Number.isFinite(count) || count <= 0) return accumulator;

    accumulator[normalizedDishId] = {
      count: Math.max(1, Math.round(count)),
      lastUsedAt: Number.isFinite(lastUsedAt) && lastUsedAt > 0 ? lastUsedAt : 0,
    };

    return accumulator;
  }, {});
}

export function getPdvDishScore(stat, now = Date.now()) {
  if (!stat) return 0;

  const count = Number(stat?.count || 0);
  const lastUsedAt = Number(stat?.lastUsedAt || 0);

  if (!Number.isFinite(count) || count <= 0) return 0;
  if (!Number.isFinite(lastUsedAt) || lastUsedAt <= 0) return count;

  const ageMs = Math.max(0, now - lastUsedAt);
  const recencyRatio = Math.max(0, 1 - (ageMs / PDV_STATS_RECENCY_WINDOW_MS));
  const recencyWeight = recencyRatio * PDV_STATS_RECENCY_WEIGHT;

  return count + recencyWeight;
}

export function usePDVStats({ storageKey }) {
  const [pdvStats, setPdvStats] = React.useState({});

  React.useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return;

    try {
      const rawStats = window.localStorage.getItem(storageKey);
      const parsedStats = rawStats ? JSON.parse(rawStats) : {};
      setPdvStats(normalizePdvStats(parsedStats));
    } catch (error) {
      console.warn('[PDV] Nao foi possivel carregar estatisticas locais:', error);
      setPdvStats({});
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return;

    const normalizedStats = normalizePdvStats(pdvStats);
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedStats));
  }, [pdvStats, storageKey]);

  const recordDishUsage = React.useCallback((dishId) => {
    const normalizedDishId = String(dishId || '').trim();
    if (!normalizedDishId) return;

    setPdvStats((current) => {
      const normalizedStats = normalizePdvStats(current);
      const existingStat = normalizedStats[normalizedDishId] || { count: 0, lastUsedAt: 0 };

      return {
        ...normalizedStats,
        [normalizedDishId]: {
          count: existingStat.count + 1,
          lastUsedAt: Date.now(),
        },
      };
    });
  }, []);

  return {
    pdvStats,
    recordDishUsage,
  };
}
