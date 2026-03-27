import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Droplets } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { withAlpha } from '@/utils/storefrontTheme';

/**
 * 🎯 DishCard com efeitos WOW épicos
 * - Animações de entrada suaves
 * - Hover dramático com scale e sombra
 * - Shimmer effect na imagem
 * - Badges animadas
 * - Efeito de brilho em destaque
 */
export default function DishCardWow({ 
  dish, 
  onClick, 
  index = 0,
  isOutOfStock = false,
  isLowStock = false,
  primaryColor = '#f97316',
  textPrimaryColor,
  theme,
  slug = null,
  menuCardStyle = 'solid',
  beverageHint = null
}) {
  const { toggleFavorite, isFavorite } = useFavorites(slug);
  const isAeroCard = menuCardStyle === 'aero';
  const cardSurface = theme?.surface || 'hsl(var(--card))';
  const cardBorder = theme?.borderColor || 'hsl(var(--border))';
  const cardAltSurface = theme?.surfaceAlt || 'hsl(var(--muted))';
  const titleColor = theme?.textPrimary || textPrimaryColor || 'hsl(var(--foreground))';
  const descriptionColor = theme?.textSecondary || 'hsl(var(--muted-foreground))';
  const ctaBg = theme?.ctaBg || primaryColor;
  const ctaText = theme?.ctaText || '#ffffff';
  const priceLabel = dish?.price_label || '';
  const actionLabel = dish?.cta_label || (dish?.product_type === 'pizza' ? 'Montar' : 'Adicionar');
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Determinar badges (com lógica otimizada)
  const badges = [];
  if (dish.is_new) badges.push({ 
    label: 'Novo', 
    icon: '✨', 
    color: 'from-green-500 to-green-600', 
    position: 'top-left',
    pulse: true
  });
  if (dish.is_popular) badges.push({ 
    label: 'Popular', 
    icon: '🔥', 
    color: 'from-purple-500 to-purple-600', 
    position: badges.length === 0 ? 'top-left' : 'top-right',
    pulse: true
  });
  if (dish.original_price && dish.original_price > dish.price) {
    const discount = Math.round(((dish.original_price - dish.price) / dish.original_price) * 100);
    badges.push({ 
      label: `-${discount}%`, 
      icon: '💥', 
      color: 'from-red-500 to-red-600', 
      position: badges.length === 0 ? 'top-right' : 'bottom-right',
      pulse: true
    });
  }
  if (isOutOfStock) badges.push({ 
    label: 'Esgotado', 
    icon: '', 
    color: 'bg-gray-600', 
    position: 'top-right',
    pulse: false
  });
  else if (isLowStock) badges.push({ 
    label: 'Últimas', 
    icon: '⚠️', 
    color: 'from-orange-500 to-orange-600', 
    position: 'top-right',
    pulse: true
  });

  // Variantes de animação (entrada escalonada)
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: index * 0.05, // Stagger effect
      }
    },
    hover: {
      y: -8,
      scale: 1.03,
      boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={isOutOfStock ? {} : "hover"}
      className={`
        group relative rounded-xl md:rounded-lg
        overflow-hidden shadow-sm cursor-pointer h-full flex flex-col
        lg:shadow-md lg:hover:shadow-lg lg:transition-shadow
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      style={isAeroCard
        ? {
            backgroundColor: withAlpha(cardSurface, 0.68),
            border: `1px solid ${withAlpha(cardBorder, 0.9)}`,
            backdropFilter: 'blur(18px)',
          }
        : {
            backgroundColor: cardSurface,
            border: `1px solid ${cardBorder}`,
          }}
      onClick={() => !isOutOfStock && onClick(dish)}
    >
      {/* Shimmer/Shine Effect (só em hover) */}
      {!isOutOfStock && (
        <motion.div
          className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          initial={{ x: '-100%', opacity: 0 }}
          whileHover={{ 
            x: '200%', 
            opacity: 1,
            transition: { duration: 0.6, ease: "easeInOut" }
          }}
        />
      )}

      {/* Badges */}
      {badges.map((badge, idx) => (
        <motion.div
          key={idx}
          className={`
            absolute z-20 
            ${badge.position === 'top-left' ? 'top-2 left-2' : ''}
            ${badge.position === 'top-right' ? 'top-2 right-2' : ''}
            ${badge.position === 'bottom-right' ? 'bottom-2 right-2' : ''}
          `}
          animate={badge.pulse ? { scale: [1, 1.05, 1] } : {}}
          transition={badge.pulse ? { 
            repeat: Infinity, 
            duration: 2,
            ease: "easeInOut"
          } : {}}
        >
          <Badge 
            className={`
              bg-gradient-to-r ${badge.color} 
              text-white font-bold shadow-lg 
              text-[10px] md:text-[9px] px-1.5 md:px-1 py-0.5
              backdrop-blur-sm
            `}
          >
            {badge.icon} {badge.label}
          </Badge>
        </motion.div>
      ))}

      {/* Imagem — ícone do cardápio quadrado em todas as telas */}
      <div className="relative h-44 md:h-36 lg:h-40 overflow-hidden shrink-0" style={{ backgroundColor: cardAltSurface }}>
        {dish.image ? (
          <>
            {/* Placeholder com pulse */}
            <motion.div 
              className="absolute inset-0 bg-gray-200 dark:bg-gray-700"
              animate={{ opacity: [0.5, 0.7, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <motion.img 
              src={dish.image} 
              alt={dish.name} 
              className={`
                w-full h-full object-cover object-center
                ${isOutOfStock ? 'grayscale' : ''}
              `}
              loading="lazy"
              onLoad={(e) => {
                if (e.target.previousSibling) {
                  e.target.previousSibling.style.display = 'none';
                }
              }}
              whileHover={isOutOfStock ? {} : { scale: 1.1 }}
              transition={{ duration: 0.3 }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl md:text-2xl">
            🍽️
          </div>
        )}

        {/* Gradient overlay (aparece no hover) */}
        {!isOutOfStock && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        )}
      </div>

      {/* Info do Prato - lg: nome e preço mais legíveis no desktop */}
      <div className="p-4 md:p-3 lg:p-4 space-y-2 md:space-y-2 lg:space-y-3 flex-1 flex flex-col">
        <h3 className="font-bold text-sm md:text-xs lg:text-base line-clamp-2 min-h-[40px] md:min-h-[36px] lg:min-h-[2.75rem] transition-colors" style={{ color: titleColor }}>
          {dish.name}
        </h3>
        
        {dish.description && (
          <p className="text-xs line-clamp-1 md:hidden" style={{ color: descriptionColor }}>
            {dish.description}
          </p>
        )}

        {beverageHint?.text && !isOutOfStock && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 max-w-full"
            style={{
              borderColor: withAlpha(ctaBg, 0.18),
              backgroundColor: withAlpha(ctaBg, 0.08),
              color: descriptionColor,
            }}
          >
            <Droplets className="w-3 h-3 flex-shrink-0" style={{ color: ctaBg }} />
            <p className="text-[11px] md:text-[10px] font-medium truncate">
              {beverageHint.text}
            </p>
          </div>
        )}
        
        <div className="flex items-end justify-between mt-auto">
          {/* Preço com animação */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {priceLabel && (
              <p className="text-[10px] md:text-[9px] font-medium mb-0.5" style={{ color: descriptionColor }}>
                {priceLabel}
              </p>
            )}
            {dish.original_price && dish.original_price > dish.price ? (
              <div className="space-y-0.5">
                <p className="text-[10px] md:text-[9px] text-muted-foreground line-through">
                  {formatCurrency(dish.original_price)}
                </p>
                <p 
                  className="text-base md:text-sm lg:text-lg lg:font-bold"
                  style={{ color: textPrimaryColor || primaryColor }}
                >
                  {formatCurrency(dish.price)}
                </p>
              </div>
            ) : (
              <p 
                className="text-base md:text-sm lg:text-lg lg:font-bold"
                style={{ color: textPrimaryColor || primaryColor }}
              >
                {formatCurrency(dish.price)}
              </p>
            )}
          </motion.div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(dish); }}
              className="p-1.5 rounded-full transition-colors"
              style={{ backgroundColor: isFavorite(dish.id) ? withAlpha(ctaBg, 0.12) : 'transparent' }}
              aria-label={isFavorite(dish.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Heart className={`w-4 h-4 transition-colors ${isFavorite(dish.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-400'}`} />
            </button>
            {!isOutOfStock && (
              <Button
                size="sm"
                className="h-8 px-3 text-xs font-semibold"
                style={{ backgroundColor: ctaBg, color: ctaText, boxShadow: `0 12px 22px ${withAlpha(ctaBg, 0.24)}` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(dish);
                }}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
