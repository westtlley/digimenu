import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DishSkeleton from '../DishSkeleton';
import { withAlpha } from '@/utils/storefrontTheme';

export default function CarouselLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  textSecondaryColor,
  theme,
  loading = false,
  stockUtils,
  formatCurrency,
  slug = null,
  menuCardStyle = 'solid'
}) {
  const scrollRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const resetDragTimeoutRef = useRef(null);
  const dragStateRef = useRef({
    isDown: false,
    startX: 0,
    startScrollLeft: 0,
    pointerId: null,
    didDrag: false,
  });

  const safeDishes = useMemo(() => (Array.isArray(dishes) ? dishes : []), [dishes]);
  const isAeroCard = menuCardStyle === 'aero';
  const cardSurface = theme?.surface || 'hsl(var(--card))';
  const cardAltSurface = theme?.surfaceAlt || 'hsl(var(--muted))';
  const cardBorder = theme?.borderColor || 'hsl(var(--border))';
  const badgeBg = theme?.badgeBg || primaryColor;
  const badgeText = theme?.badgeText || '#ffffff';
  const ctaBg = theme?.ctaBg || primaryColor;
  const ctaText = theme?.ctaText || '#ffffff';

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollLeft(el.scrollLeft));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const el = scrollRef.current;
      const base = Math.max(240, Math.floor((el?.clientWidth || 0) * 0.9));
      const scrollAmount = vw < 768 ? 280 : base;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <DishSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!safeDishes || safeDishes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center px-6 py-10">
          <div className="text-4xl mb-2">🍽️</div>
          <p className="font-semibold text-gray-900 dark:text-white">Sem itens nessa categoria</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Escolha outra categoria acima.</p>
        </div>
      </div>
    );
  }

  const showNav = safeDishes.length > 1;
  const maxScroll = Math.max(0, (scrollRef.current?.scrollWidth || 0) - (scrollRef.current?.clientWidth || 0));
  const progressPct = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)) : 0;

  return (
    <div className="relative overflow-visible h-full flex flex-col">
      {/* Botão Anterior */}
      {showNav && (
      <button
        onClick={() => scroll('left')}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full shadow-lg border hover:shadow-xl transition-all"
        style={{ color: primaryColor, backgroundColor: withAlpha(cardSurface, 0.96), borderColor: cardBorder }}
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      )}

      {/* Carrossel - Mobile com mais altura */}
      <div 
        ref={scrollRef}
        className="flex-1 flex items-stretch gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 md:pb-1 px-10 md:px-12 cursor-grab active:cursor-grabbing"
        style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-y' }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scroll('left');
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            scroll('right');
          }
        }}
        onWheel={(e) => {
          const el = scrollRef.current;
          if (!el) return;
          const absY = Math.abs(e.deltaY);
          const absX = Math.abs(e.deltaX);
          if (absY > absX) {
            el.scrollLeft += e.deltaY;
          }
        }}
        onPointerDown={(e) => {
          if (!scrollRef.current) return;
          dragStateRef.current.isDown = true;
          dragStateRef.current.didDrag = false;
          dragStateRef.current.pointerId = e.pointerId;
          dragStateRef.current.startX = e.clientX;
          dragStateRef.current.startScrollLeft = scrollRef.current.scrollLeft;
          try {
            scrollRef.current.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }}
        onPointerMove={(e) => {
          const st = dragStateRef.current;
          if (!st.isDown || !scrollRef.current) return;
          const dx = e.clientX - st.startX;
          if (Math.abs(dx) > 8) st.didDrag = true;
          scrollRef.current.scrollLeft = st.startScrollLeft - dx;
        }}
        onPointerUp={() => {
          dragStateRef.current.isDown = false;
          dragStateRef.current.pointerId = null;
          if (resetDragTimeoutRef.current) {
            clearTimeout(resetDragTimeoutRef.current);
          }
          resetDragTimeoutRef.current = setTimeout(() => {
            dragStateRef.current.didDrag = false;
            resetDragTimeoutRef.current = null;
          }, 60);
        }}
        onPointerCancel={() => {
          dragStateRef.current.isDown = false;
          dragStateRef.current.pointerId = null;
          if (resetDragTimeoutRef.current) {
            clearTimeout(resetDragTimeoutRef.current);
            resetDragTimeoutRef.current = null;
          }
          dragStateRef.current.didDrag = false;
        }}
      >
        {safeDishes.map((dish, index) => {
          const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
          const isLowStock = stockUtils?.isLowStock?.(dish.stock);
          const priceLabel = dish?.price_label || '';
          return (
            <div
              key={dish.id}
              className="flex-shrink-0 w-[280px] md:w-72 lg:w-72"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Card customizado para mobile ter mais altura */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  if (dragStateRef.current.didDrag) return;
                  if (!isOutOfStock) onDishClick(dish);
                }}
                className={`
                  relative
                  rounded-xl overflow-hidden shadow-md border-2 transition-all cursor-pointer
                  flex flex-col md:h-[clamp(200px,22vh,260px)]
                  ${isOutOfStock 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-xl hover:scale-[1.02]'
                  }
                `}
                style={isAeroCard
                  ? {
                      backgroundColor: withAlpha(cardSurface, 0.66),
                      borderColor: withAlpha(cardBorder, 0.9),
                      backdropFilter: 'blur(18px)',
                    }
                  : {
                      backgroundColor: cardSurface,
                      borderColor: cardBorder,
                    }}
              >
                {/* Imagem - Mobile maior */}
                <div className="relative w-full h-44 md:h-[clamp(110px,12vh,145px)] overflow-hidden" style={{ backgroundColor: cardAltSurface }}>
                  {dish.image ? (
                    <img 
                      src={dish.image} 
                      alt={dish.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      🍽️
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold">Esgotado</span>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {dish.is_new && (
                      <span className="px-2 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: badgeBg, color: badgeText }}>✨ NOVO</span>
                    )}
                    {dish.is_popular && (
                      <span className="px-2 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: ctaBg, color: ctaText }}>🔥 POPULAR</span>
                    )}
                  </div>
                  {dish.original_price && dish.original_price > dish.price && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: badgeBg, color: badgeText }}>
                        -{Math.round(((dish.original_price - dish.price) / dish.original_price) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo - Mobile com mais espaço */}
                <div className="p-3 md:p-2 flex-1 flex flex-col min-h-0">
                  <h3 
                    className="font-bold text-base md:text-xs mb-2 line-clamp-2 min-h-[2.25rem] md:min-h-[1.75rem]"
                    style={{ color: textPrimaryColor || 'inherit' }}
                  >
                    {dish.name}
                  </h3>
                  {dish.description && (
                    <p 
                      className="text-xs line-clamp-2 mb-3 md:mb-0 md:hidden"
                      style={{ color: textSecondaryColor || 'inherit' }}
                    >
                      {dish.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-baseline gap-2">
                    {dish.original_price && dish.original_price > dish.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency?.(dish.original_price)}
                      </span>
                    )}
                    <div className="flex flex-col">
                      {priceLabel && (
                        <span className="text-[10px] font-medium" style={{ color: textSecondaryColor || theme?.textSecondary || 'hsl(var(--muted-foreground))' }}>
                          {priceLabel}
                        </span>
                      )}
                      <span 
                        className="text-xl md:text-lg font-bold"
                        style={{ color: primaryColor }}
                      >
                        {formatCurrency?.(dish.price) || 'R$ 0,00'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Botão Próximo */}
      {showNav && (
      <button
        onClick={() => scroll('right')}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full shadow-lg border hover:shadow-xl transition-all"
        style={{ color: primaryColor, backgroundColor: withAlpha(cardSurface, 0.96), borderColor: cardBorder }}
        aria-label="Próximo"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>
      )}

      {showNav && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-[160px] h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: primaryColor }} />
        </div>
      )}
    </div>
  );
}
