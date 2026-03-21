import { useEffect, useMemo, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Zap, Percent, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/utils/formatters';
import { withAlpha } from '@/utils/storefrontTheme';

export default function PromotionBanner({ promotions = [], dishes = [], primaryColor, theme, onSelectPromotion, store, autoplayIntervalMs = 4500 }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const safePromotions = Array.isArray(promotions) ? promotions : [];
  const safeDishes = Array.isArray(dishes) ? dishes : [];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const promosWithDish = useMemo(() => {
    return safePromotions
      .map((promo) => {
        const dish = safeDishes.find(d => d?.id === promo?.offer_dish_id);
        return dish ? { promo, dish } : null;
      })
      .filter(Boolean);
  }, [safeDishes, safePromotions]);

  const visibleCount = isDesktop ? 2 : 1;
  const maxSlides = promosWithDish.length;
  const cardSurface = theme?.surface || 'hsl(var(--card))';
  const badgeBg = theme?.badgeBg || '#facc15';
  const badgeText = theme?.badgeText || '#111827';
  const heroBg = theme?.heroBg || primaryColor;
  const heroText = theme?.heroText || '#ffffff';

  if (safePromotions.length === 0) return null;

  useEffect(() => {
    if (maxSlides <= visibleCount) return;
    const t = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % maxSlides);
    }, Number(autoplayIntervalMs) > 0 ? Number(autoplayIntervalMs) : 4500);
    return () => clearInterval(t);
  }, [autoplayIntervalMs, maxSlides, visibleCount]);

  useEffect(() => {
    if (maxSlides === 0) return;
    setActiveIndex((prev) => Math.min(prev, Math.max(0, maxSlides - 1)));
  }, [maxSlides]);

  // Verificar se há promoção de entrega grátis
  const hasFreeDelivery = store?.free_delivery_threshold && store.free_delivery_threshold > 0;

  const visibleSlides = useMemo(() => {
    if (maxSlides === 0) return [];
    if (maxSlides <= visibleCount) return promosWithDish;
    const out = [];
    for (let i = 0; i < visibleCount; i++) {
      out.push(promosWithDish[(activeIndex + i) % maxSlides]);
    }
    return out;
  }, [activeIndex, maxSlides, promosWithDish, visibleCount]);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5" style={{ color: theme?.primary || primaryColor, fill: withAlpha(theme?.accent || primaryColor, 0.9) }} />
        <h2 className="font-bold text-lg" style={{ color: theme?.textPrimary || 'hsl(var(--foreground))' }}>Promocoes ativas</h2>
      </div>
      
      {/* Banner de Entrega Grátis - Estilo das imagens */}
      {hasFreeDelivery && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl overflow-hidden shadow-lg border"
          style={{ background: `linear-gradient(135deg, ${heroBg}, ${theme?.primary || primaryColor})`, borderColor: withAlpha(theme?.primary || primaryColor, 0.25) }}
        >
          <div className="p-4 flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: withAlpha(cardSurface, 0.2) }}>
              <Truck className="w-8 h-8" style={{ color: heroText }} />
            </div>
            <div className="flex-1" style={{ color: heroText }}>
              <h3 className="font-bold text-base md:text-lg mb-1">Entrega gratis em algumas regioes</h3>
              <p className="text-sm md:text-base opacity-90">Aproveite ja.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Promoções de Produtos */}
      {visibleSlides.length > 0 && (
        <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4'}>
          {visibleSlides.map(({ promo, dish }, slotIdx) => {
            const discount = promo.original_price > promo.offer_price 
              ? Math.round(((promo.original_price - promo.offer_price) / promo.original_price) * 100)
              : 0;

            return (
              <motion.div
                key={`${promo.id}_${slotIdx}_${activeIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="relative h-32 rounded-2xl overflow-hidden shadow-lg cursor-pointer border-2"
                style={{ 
                  borderColor: withAlpha(theme?.primary || primaryColor, 0.32),
                  background: `linear-gradient(135deg, ${heroBg}, ${theme?.primary || primaryColor})`
                }}
                onClick={() => onSelectPromotion && onSelectPromotion(dish)}
              >
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="relative p-4 flex items-center gap-4">
                  <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: withAlpha(cardSurface, 0.22) }}>
                    {dish.image ? (
                      <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0" style={{ color: heroText, textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                    <Badge className="mb-2 font-bold border-0" style={{ backgroundColor: badgeBg, color: badgeText }}>
                      <Percent className="w-3 h-3 mr-1" />
                      -{discount}%
                    </Badge>
                    <h3 className="font-bold text-base mb-1 truncate">{promo.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {promo.original_price > promo.offer_price && (
                        <span className="text-sm line-through opacity-75">
                          {formatCurrency(promo.original_price)}
                        </span>
                      )}
                      <span className="text-xl font-bold">{formatCurrency(promo.offer_price)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
