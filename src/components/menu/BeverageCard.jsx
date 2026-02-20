import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Droplets, Wine, ThermometerSnowflake, Thermometer, Package } from 'lucide-react';

/**
 * Card customizado para bebidas
 * Mostra informações específicas como volume, temperatura, tipo
 */
export default function BeverageCard({ 
  beverage, 
  onClick, 
  index = 0,
  isOutOfStock = false,
  primaryColor = '#06b6d4', // Cyan para bebidas
  textPrimaryColor
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Ícone de temperatura
  const getTempIcon = () => {
    if (beverage.serving_temp === 'cold') return <ThermometerSnowflake className="w-3 h-3 text-blue-500" />;
    if (beverage.serving_temp === 'hot') return <Thermometer className="w-3 h-3 text-orange-500" />;
    return null;
  };

  // Ícone de tipo
  const getTypeIcon = () => {
    if (beverage.beverage_type === 'natural') return <Droplets className="w-3 h-3 text-green-500" />;
    return <Package className="w-3 h-3 text-gray-500" />;
  };

  // Badges
  const badges = [];
  if (beverage.is_new) badges.push({ 
    label: 'Novo', 
    icon: '✨', 
    color: 'from-green-500 to-green-600', 
    position: 'top-left',
    pulse: true
  });
  if (beverage.original_price && beverage.original_price > beverage.price) {
    const discount = Math.round(((beverage.original_price - beverage.price) / beverage.original_price) * 100);
    badges.push({ 
      label: `-${discount}%`, 
      icon: '💥', 
      color: 'from-red-500 to-red-600', 
      position: 'top-right',
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
        delay: index * 0.05,
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
        lg:shadow-md lg:hover:shadow-lg lg:transition-shadow
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      onClick={() => !isOutOfStock && onClick(beverage)}
    >
      {/* Shimmer Effect */}
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

      {/* Imagem — mobile: mais espaço, preenche toda a área */}
      <div className="relative aspect-[4/5] md:aspect-square bg-cyan-50 dark:bg-cyan-900/20 overflow-hidden min-h-[140px] md:min-h-0">
        {beverage.image ? (
          <>
            <motion.div 
              className="absolute inset-0 bg-cyan-100 dark:bg-cyan-800/30"
              animate={{ opacity: [0.5, 0.7, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <motion.img 
              src={beverage.image} 
              alt={beverage.name} 
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
            <Wine className="w-12 h-12 md:w-10 md:h-10 text-cyan-400" />
          </div>
        )}

        {!isOutOfStock && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        )}
      </div>

      {/* Info da Bebida - lg: nome e preço mais legíveis no desktop */}
      <div className="p-3 md:p-2.5 lg:p-2.5 space-y-2 md:space-y-1.5 bg-card">
        <h3 className="font-bold text-sm md:text-xs lg:text-sm text-foreground line-clamp-2 min-h-[36px] md:min-h-[32px] lg:min-h-[2.5rem] group-hover:text-cyan-600 transition-colors">
          {beverage.name}
        </h3>
        
        {/* Características da bebida */}
        <div className="flex flex-wrap items-center gap-1.5">
          {beverage.volume_ml && (
            <Badge variant="outline" className="text-[10px] border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-400">
              {beverage.volume_ml}ml
            </Badge>
          )}
          {beverage.beverage_type === 'natural' && (
            <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 flex items-center gap-0.5">
              {getTypeIcon()} Natural
            </Badge>
          )}
          {beverage.serving_temp && (
            <span className="flex items-center">
              {getTempIcon()}
            </span>
          )}
          {beverage.sugar_free && (
            <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">
              Zero
            </Badge>
          )}
          {beverage.alcoholic && (
            <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">
              🍷 Alcoólico
            </Badge>
          )}
        </div>
        
        <div className="flex items-end justify-between pt-1">
          {/* Preço */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {beverage.original_price && beverage.original_price > beverage.price ? (
              <div className="space-y-0.5">
                <p className="text-[10px] md:text-[9px] text-muted-foreground line-through">
                  {formatCurrency(beverage.original_price)}
                </p>
                <p 
                  className="text-base md:text-sm lg:text-base font-bold text-cyan-600 dark:text-cyan-400"
                >
                  {formatCurrency(beverage.price)}
                </p>
              </div>
            ) : (
              <p 
                className="text-base md:text-sm lg:text-base font-bold text-cyan-600 dark:text-cyan-400"
              >
                {formatCurrency(beverage.price)}
              </p>
            )}
          </motion.div>

          {/* Ícone de adicionar */}
          {!isOutOfStock && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileHover={{ opacity: 1, scale: 1 }}
              className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Wine className="w-4 h-4" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
