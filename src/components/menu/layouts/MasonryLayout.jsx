import React from 'react';
import { motion } from 'framer-motion';
import { withAlpha } from '@/utils/storefrontTheme';

export default function MasonryLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  textSecondaryColor,
  theme,
  loading = false,
  stockUtils,
  formatCurrency,
  menuCardStyle = 'solid'
}) {
  const isAeroCard = menuCardStyle === 'aero';
  const cardSurface = theme?.surface || 'hsl(var(--card))';
  const cardAltSurface = theme?.surfaceAlt || 'hsl(var(--muted))';
  const cardBorder = theme?.borderColor || 'hsl(var(--border))';
  const badgeBg = theme?.badgeBg || primaryColor;
  const badgeText = theme?.badgeText || '#ffffff';
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {dishes.map((dish, index) => {
        const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
        const priceLabel = dish?.price_label || '';
        
        return (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isOutOfStock && onDishClick(dish)}
            className={`
              rounded-xl overflow-hidden border-2 transition-all cursor-pointer
              shadow-md hover:shadow-xl
              ${isOutOfStock 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-[1.02]'
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
            {/* Imagem com altura fixa para harmonia visual */}
            <div className="w-full overflow-hidden relative h-44 md:h-36 lg:h-40" style={{ backgroundColor: cardAltSurface }}>
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
                  <span className="text-white text-sm font-bold">Esgotado</span>
                </div>
              )}
              
              {/* Badges sobrepostas */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {dish.is_new && (
                  <span className="px-2 py-1 text-xs font-bold rounded-full shadow-lg" style={{ backgroundColor: badgeBg, color: badgeText }}>
                    ✨ NOVO
                  </span>
                )}
                {dish.is_popular && (
                  <span className="px-2 py-1 text-xs font-bold rounded-full shadow-lg" style={{ backgroundColor: primaryColor, color: theme?.ctaText || '#ffffff' }}>
                    🔥 POPULAR
                  </span>
                )}
              </div>
              {dish.original_price && dish.original_price > dish.price && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 text-xs font-bold rounded-full shadow-lg" style={{ backgroundColor: badgeBg, color: badgeText }}>
                    -{Math.round(((dish.original_price - dish.price) / dish.original_price) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Conteúdo - sempre visível */}
            <div className="p-3 md:p-4">
              <h3 
                className="font-bold text-sm md:text-base mb-2 line-clamp-2"
                style={{ color: textPrimaryColor || 'inherit' }}
              >
                {dish.name}
              </h3>
              {dish.description && (
                <p 
                  className="text-xs md:text-sm line-clamp-3 mb-3"
                  style={{ color: textSecondaryColor || 'inherit' }}
                >
                  {dish.description}
                </p>
              )}
              <div className="flex items-baseline gap-2 flex-wrap">
                {dish.original_price && dish.original_price > dish.price && (
                  <span className="text-sm line-through" style={{ color: theme?.textSecondary || 'hsl(var(--muted-foreground))' }}>
                    {formatCurrency?.(dish.original_price)}
                  </span>
                )}
                <div className="flex flex-col">
                  {priceLabel && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {priceLabel}
                    </span>
                  )}
                  <span 
                    className="text-lg md:text-xl font-bold"
                    style={{ color: primaryColor }}
                  >
                    {formatCurrency?.(dish.price) || 'R$ 0,00'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
