import { useEffect, useState } from 'react';

/**
 * Hook para implementar pull-to-refresh em mobile
 * 
 * @param {Function} onRefresh - Função chamada ao fazer pull to refresh
 * @param {Object} options - Opções de configuração
 * @returns {Object} - Estado e funções do hook
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80, // Distância mínima para trigger
    resistance = 2.5, // Resistência ao scroll
    disabled = false,
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    let touchStartY = 0;
    let touchCurrentY = 0;
    let isTouching = false;

    const handleTouchStart = (e) => {
      // Só funciona se estiver no topo da página
      if (window.scrollY > 0) return;
      
      touchStartY = e.touches[0].clientY;
      isTouching = true;
      setStartY(touchStartY);
    };

    const handleTouchMove = (e) => {
      if (!isTouching) return;
      
      touchCurrentY = e.touches[0].clientY;
      const deltaY = touchCurrentY - touchStartY;

      // Só permite pull down
      if (deltaY > 0 && window.scrollY === 0) {
        e.preventDefault();
        setIsPulling(true);
        setCurrentY(deltaY / resistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isTouching) return;
      
      isTouching = false;
      const deltaY = touchCurrentY - touchStartY;

      if (deltaY > threshold && window.scrollY === 0) {
        setIsRefreshing(true);
        setIsPulling(false);
        setCurrentY(0);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        setIsPulling(false);
        setCurrentY(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, resistance, disabled]);

  return {
    isRefreshing,
    isPulling,
    pullDistance: currentY,
    canRefresh: currentY > threshold,
  };
}
