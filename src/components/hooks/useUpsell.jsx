import { useState, useCallback } from 'react';

export function useUpsell(promotions, cartTotal) {
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [upsellPromotions, setUpsellPromotions] = useState([]);
  const [hasSeenUpsell, setHasSeenUpsell] = useState(false);

  const checkUpsell = useCallback((newCartTotal) => {
    if (hasSeenUpsell) return;

    const eligiblePromotions = promotions.filter(p => 
      p.is_active && 
      (!p.trigger_min_value || newCartTotal >= p.trigger_min_value)
    );
    
    if (eligiblePromotions.length > 0) {
      setUpsellPromotions(eligiblePromotions);
      setShowUpsellModal(true);
      setHasSeenUpsell(true);
    }
  }, [promotions, hasSeenUpsell]);

  const resetUpsell = useCallback(() => {
    setHasSeenUpsell(false);
  }, []);

  const closeUpsell = useCallback(() => {
    setShowUpsellModal(false);
    setUpsellPromotions([]);
  }, []);

  return {
    showUpsellModal,
    upsellPromotions,
    checkUpsell,
    resetUpsell,
    closeUpsell
  };
}