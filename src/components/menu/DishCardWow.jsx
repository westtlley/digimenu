import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Sparkles } from 'lucide-react';

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
  primaryColor = '#f97316'
}) {
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
        group relative bg-card border border-border rounded-xl md:rounded-lg
        overflow-hidden shadow-sm cursor-pointer
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}
      `}
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

      {/* Imagem com efeito de zoom suave */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
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
                w-full h-full object-cover 
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

      {/* Info do Prato */}
      <div className="p-3 md:p-2.5 space-y-2 md:space-y-1.5 bg-card">
        <h3 className="font-bold text-sm md:text-xs text-foreground line-clamp-2 min-h-[36px] md:min-h-[32px] group-hover:text-primary transition-colors">
          {dish.name}
        </h3>
        
        {dish.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 md:hidden">
            {dish.description}
          </p>
        )}
        
        <div className="flex items-end justify-between">
          {/* Preço com animação */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {dish.original_price && dish.original_price > dish.price ? (
              <div className="space-y-0.5">
                <p className="text-[10px] md:text-[9px] text-muted-foreground line-through">
                  {formatCurrency(dish.original_price)}
                </p>
                <p className="text-base md:text-sm font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(dish.price)}
                </p>
              </div>
            ) : (
              <p className="text-base md:text-sm font-bold" style={{ color: primaryColor }}>
                {formatCurrency(dish.price)}
              </p>
            )}
          </motion.div>

          {/* Ícone de adicionar (aparece no hover) */}
          {!isOutOfStock && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileHover={{ opacity: 1, scale: 1 }}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
