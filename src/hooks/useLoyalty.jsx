import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const LOYALTY_STORAGE_KEY = 'loyalty_points';

// Configuração de níveis
export const LOYALTY_TIERS = {
  bronze: {
    name: 'Bronze',
    minPoints: 0,
    discount: 0,
    color: '#CD7F32',
    icon: '🥉'
  },
  silver: {
    name: 'Prata',
    minPoints: 100,
    discount: 5,
    color: '#C0C0C0',
    icon: '🥈'
  },
  gold: {
    name: 'Ouro',
    minPoints: 500,
    discount: 10,
    color: '#FFD700',
    icon: '🥇'
  },
  platinum: {
    name: 'Platina',
    minPoints: 1000,
    discount: 15,
    color: '#E5E4E2',
    icon: '💎'
  }
};

// Calcular nível baseado em pontos
export function calculateTier(points) {
  const tiers = Object.entries(LOYALTY_TIERS).reverse();
  for (const [key, tier] of tiers) {
    if (points >= tier.minPoints) {
      return { key, ...tier };
    }
  }
  return { key: 'bronze', ...LOYALTY_TIERS.bronze };
}

// Calcular pontos necessários para próximo nível
export function pointsToNextTier(points) {
  const currentTier = calculateTier(points);
  const tiers = Object.values(LOYALTY_TIERS).sort((a, b) => a.minPoints - b.minPoints);
  const nextTier = tiers.find(t => t.minPoints > currentTier.minPoints);
  if (!nextTier) return null;
  return nextTier.minPoints - points;
}

export function useLoyalty(customerPhone, customerEmail, slug) {
  const [loyaltyData, setLoyaltyData] = useState({
    points: 0,
    totalSpent: 0,
    tier: 'bronze',
    bonusPoints: 0,
    lastOrderDate: null,
    birthday: null,
    referralCode: null,
    referredBy: null,
    consecutiveDays: 0,
    firstReviewDate: null,
    lastBirthdayBonus: null,
    lastConsecutiveBonusAt: 0
  });

  const [loading, setLoading] = useState(true);

  // Carregar dados de fidelidade
  useEffect(() => {
    const loadLoyaltyData = async () => {
      if (!customerPhone && !customerEmail) {
        setLoading(false);
        return;
      }

      try {
        // Tentar buscar do backend (se existir entidade Loyalty)
        try {
          const loyaltyEntities = await base44.entities.Loyalty?.filter({
            customer_phone: customerPhone || '',
            customer_email: customerEmail || '',
            subscriber_slug: slug || ''
          });
          
          if (loyaltyEntities && loyaltyEntities.length > 0) {
            const data = loyaltyEntities[0];
            setLoyaltyData({
              points: data.points || 0,
              totalSpent: data.total_spent || 0,
              tier: data.tier || 'bronze',
              bonusPoints: data.bonus_points || 0,
              lastOrderDate: data.last_order_date,
              birthday: data.birthday,
              referralCode: data.referral_code,
              referredBy: data.referred_by,
              consecutiveDays: data.consecutive_days || 0,
              firstReviewDate: data.first_review_date,
              lastBirthdayBonus: data.last_birthday_bonus,
              lastConsecutiveBonusAt: data.last_consecutive_bonus_at ?? 0
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log('Loyalty entity não encontrada, usando localStorage');
        }

        // Fallback: usar localStorage
        const storageKey = `${LOYALTY_STORAGE_KEY}_${slug || 'default'}_${customerPhone || customerEmail || 'guest'}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setLoyaltyData(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Erro ao carregar dados de fidelidade:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLoyaltyData();
  }, [customerPhone, customerEmail, slug]);

  // Salvar dados de fidelidade
  const saveLoyaltyData = useCallback(async (newData) => {
    const updated = { ...loyaltyData, ...newData };
    setLoyaltyData(updated);

    try {
      // Tentar salvar no backend
      if (customerPhone || customerEmail) {
        try {
          const loyaltyEntities = await base44.entities.Loyalty?.filter({
            customer_phone: customerPhone || '',
            customer_email: customerEmail || '',
            subscriber_slug: slug || ''
          });

          const loyaltyPayload = {
            customer_phone: customerPhone || '',
            customer_email: customerEmail || '',
            subscriber_slug: slug || '',
            points: updated.points,
            total_spent: updated.totalSpent,
            tier: updated.tier,
            bonus_points: updated.bonusPoints,
            last_order_date: updated.lastOrderDate,
            birthday: updated.birthday,
            referral_code: updated.referralCode,
            referred_by: updated.referredBy,
            consecutive_days: updated.consecutiveDays || 0,
            first_review_date: updated.firstReviewDate,
            last_birthday_bonus: updated.lastBirthdayBonus,
            last_consecutive_bonus_at: updated.lastConsecutiveBonusAt ?? 0
          };

          if (loyaltyEntities && loyaltyEntities.length > 0) {
            await base44.entities.Loyalty?.update(loyaltyEntities[0].id, loyaltyPayload);
          } else {
            await base44.entities.Loyalty?.create(loyaltyPayload);
          }
        } catch (e) {
          console.log('Erro ao salvar no backend, usando localStorage:', e);
        }
      }

      // Salvar no localStorage como fallback
      const storageKey = `${LOYALTY_STORAGE_KEY}_${slug || 'default'}_${customerPhone || customerEmail || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Erro ao salvar dados de fidelidade:', error);
    }
  }, [loyaltyData, customerPhone, customerEmail, slug]);

  // Adicionar pontos
  const addPoints = useCallback(async (amount, reason = 'compra') => {
    const newPoints = loyaltyData.points + amount;
    const newTotalSpent = loyaltyData.totalSpent + (reason === 'compra' ? amount : 0);
    
    // Atualizar tier se necessário
    const newTier = calculateTier(newPoints);
    
    const updateData = {
      points: newPoints,
      totalSpent: newTotalSpent,
      tier: newTier.key,
      lastOrderDate: new Date().toISOString()
    };
    
    // Se for uma compra, atualizar dias consecutivos
    if (reason === 'compra') {
      const today = new Date();
      const lastOrder = loyaltyData.lastOrderDate ? new Date(loyaltyData.lastOrderDate) : null;
      const daysSinceLastOrder = lastOrder 
        ? Math.floor((today - lastOrder) / (1000 * 60 * 60 * 24))
        : null;
      
      if (daysSinceLastOrder === null || daysSinceLastOrder === 0) {
        // Primeira compra ou compra no mesmo dia
        updateData.consecutiveDays = (loyaltyData.consecutiveDays || 0) + 1;
      } else if (daysSinceLastOrder === 1) {
        // Compra consecutiva (fez pedido ontem e hoje)
        updateData.consecutiveDays = (loyaltyData.consecutiveDays || 0) + 1;
      } else {
        // Quebrou a sequência
        updateData.consecutiveDays = 1;
      }
    }
    
    await saveLoyaltyData(updateData);

    return { points: newPoints, tier: newTier };
  }, [loyaltyData, saveLoyaltyData]);

  // Adicionar bônus
  const addBonus = useCallback(async (amount, type) => {
    await saveLoyaltyData({
      bonusPoints: loyaltyData.bonusPoints + amount,
      points: loyaltyData.points + amount
    });
  }, [loyaltyData, saveLoyaltyData]);

  // Calcular desconto baseado no tier
  const getDiscount = useCallback(() => {
    const tier = calculateTier(loyaltyData.points);
    return tier.discount;
  }, [loyaltyData.points]);

  // Gerar código de referência
  const generateReferralCode = useCallback(async () => {
    if (loyaltyData.referralCode) return loyaltyData.referralCode;
    
    const code = `${(customerPhone || customerEmail || 'USER').slice(-4).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
    await saveLoyaltyData({ referralCode: code });
    return code;
  }, [loyaltyData.referralCode, customerPhone, customerEmail, saveLoyaltyData]);

  // Aplicar código de referência (quando alguém usa o código)
  const applyReferralCode = useCallback(async (referralCode) => {
    // Buscar cliente que possui esse código
    try {
      const loyaltyEntities = await base44.entities.Loyalty?.filter({
        referral_code: referralCode,
        subscriber_slug: slug || ''
      });
      
      if (loyaltyEntities && loyaltyEntities.length > 0) {
        const referrer = loyaltyEntities[0];
        
        // Adicionar pontos para quem indicou
        await base44.entities.Loyalty?.update(referrer.id, {
          ...referrer,
          points: (referrer.points || 0) + 100,
          bonus_points: (referrer.bonus_points || 0) + 100
        });
        
        // Adicionar pontos para quem foi indicado (primeira compra)
        await addPoints(100, 'indicacao');
        
        return { success: true, message: 'Código de referência aplicado! +100 pontos para você e para quem indicou!' };
      }
      
      return { success: false, message: 'Código de referência inválido' };
    } catch (error) {
      console.error('Erro ao aplicar código de referência:', error);
      return { success: false, message: 'Erro ao aplicar código' };
    }
  }, [slug, addPoints]);

  // Verificar e aplicar bônus de aniversário
  const checkBirthdayBonus = useCallback(async () => {
    if (!loyaltyData.birthday) return;
    
    const today = new Date();
    const birthday = new Date(loyaltyData.birthday);
    const lastBonusDate = loyaltyData.lastBirthdayBonus 
      ? new Date(loyaltyData.lastBirthdayBonus)
      : null;
    
    // Verificar se é aniversário e ainda não deu bônus este ano
    if (
      birthday.getMonth() === today.getMonth() &&
      birthday.getDate() === today.getDate() &&
      (!lastBonusDate || lastBonusDate.getFullYear() < today.getFullYear())
    ) {
      await addBonus(100, 'aniversario');
      await saveLoyaltyData({ lastBirthdayBonus: today.toISOString() });
      return { success: true, message: '🎉 Parabéns! Você ganhou 100 pontos de bônus de aniversário!' };
    }
    
    return { success: false };
  }, [loyaltyData.birthday, loyaltyData.lastBirthdayBonus, addBonus, saveLoyaltyData]);

  // Aplicar bônus de avaliação
  const applyReviewBonus = useCallback(async () => {
    await addBonus(20, 'avaliacao');
    return { success: true, message: 'Obrigado pela avaliação! Você ganhou 20 pontos!' };
  }, [addBonus]);

  // Verificar e aplicar bônus de compras consecutivas (3 ou 7 dias)
  const checkConsecutiveOrdersBonus = useCallback(async () => {
    const consecutive = loyaltyData.consecutiveDays || 0;
    const lastClaimed = loyaltyData.lastConsecutiveBonusAt ?? 0;

    if (consecutive >= 7 && lastClaimed < 7) {
      await addBonus(30, 'consecutivo_7');
      await saveLoyaltyData({ lastConsecutiveBonusAt: 7 });
      return { success: true, message: '🎉 7 pedidos seguidos! Você ganhou 30 pontos de bônus!' };
    }
    if (consecutive >= 3 && lastClaimed < 3) {
      await addBonus(15, 'consecutivo_3');
      await saveLoyaltyData({ lastConsecutiveBonusAt: 3 });
      return { success: true, message: '🔥 3 pedidos seguidos! Você ganhou 15 pontos de bônus!' };
    }
    return { success: false };
  }, [loyaltyData.consecutiveDays, loyaltyData.lastConsecutiveBonusAt, addBonus, saveLoyaltyData]);

  return {
    loyaltyData,
    loading,
    addPoints,
    addBonus,
    getDiscount,
    generateReferralCode,
    applyReferralCode,
    checkBirthdayBonus,
    applyReviewBonus,
    checkConsecutiveOrdersBonus,
    currentTier: calculateTier(loyaltyData.points),
    pointsToNext: pointsToNextTier(loyaltyData.points)
  };
}
