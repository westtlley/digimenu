import React from 'react';
import DishCardWow from '../DishCardWow';
import DishSkeleton from '../DishSkeleton';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Sparkles } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

// Featured layout component for 1-2 items
function FeaturedItem({ dish, onClick, index, isOutOfStock, isLowStock, primaryColor, textPrimaryColor, slug }) {
  const { toggleFavorite, isFavorite } = useFavorites(slug);
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Determinar badges
  const badges = [];
  if (dish.is_new) badges.push({ label: 'Novo', icon: '✨', color: 'from-green-500 to-green-600' });
  if (dish.is_popular) badges.push({ label: 'Popular', icon: '🔥', color: 'from-purple-500 to-purple-600' });
  if (dish.original_price && dish.original_price > dish.price) {
    const discount = Math.round(((dish.original_price - dish.price) / dish.original_price) * 100);
    badges.push({ label: `-${discount}%`, icon: '💥', color: 'from-red-500 to-red-600' });
  }
  if (isOutOfStock) badges.push({ label: 'Esgotado', icon: '', color: 'bg-gray-600' });
  else if (isLowStock) badges.push({ label: 'Últimas', icon: '⚠️', color: 'from-orange-500 to-orange-600' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      whileHover={isOutOfStock ? {} : { scale: 1.02 }}
      className={`
        group relative bg-card border border-border rounded-xl overflow-hidden shadow-sm cursor-pointer
        lg:shadow-md lg:hover:shadow-lg lg:transition-all lg:duration-200
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      onClick={() => !isOutOfStock && onClick(dish)}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image container - larger in featured layout */}
        <div className="relative w-full md:w-1/3 lg:w-2/5 h-48 md:h-auto md:min-h-[180px] lg:min-h-[200px] bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {dish.image ? (
            <>
              <motion.div 
                className="absolute inset-0 bg-gray-200 dark:bg-gray-700"
                animate={{ opacity: [0.5, 0.7, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <motion.img 
                src={dish.image} 
                alt={dish.name} 
                className={`w-full h-full object-cover object-center ${isOutOfStock ? 'grayscale' : ''}`}
                loading="lazy"
                onLoad={(e) => {
                  if (e.target.previousSibling) {
                    e.target.previousSibling.style.display = 'none';
                  }
                }}
                whileHover={isOutOfStock ? {} : { scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl md:text-3xl">
              🍽️
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {badges.map((badge, idx) => (
              <Badge
                key={idx}
                className={`
                  bg-gradient-to-r ${badge.color} 
                  text-white font-bold shadow-lg 
                  text-xs px-2 py-1
                `}
              >
                {badge.icon} {badge.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content container */}
        <div className="flex-1 p-4 md:p-5 lg:p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-lg md:text-xl lg:text-2xl text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {dish.name}
            </h3>
            
            {dish.description && (
              <p className="text-sm md:text-base text-muted-foreground line-clamp-3 md:line-clamp-2">
                {dish.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="space-y-1">
              {dish.original_price && dish.original_price > dish.price ? (
                <>
                  <p className="text-sm text-muted-foreground line-through">
                    {formatCurrency(dish.original_price)}
                  </p>
                  <p 
                    className="text-xl md:text-2xl lg:text-3xl font-bold"
                    style={{ color: textPrimaryColor || primaryColor }}
                  >
                    {formatCurrency(dish.price)}
                  </p>
                </>
              ) : (
                <p 
                  className="text-xl md:text-2xl lg:text-3xl font-bold"
                  style={{ color: textPrimaryColor || primaryColor }}
                >
                  {formatCurrency(dish.price)}
                </p>
              )}
            </div>

            {!isOutOfStock && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileHover={{ opacity: 1, scale: 1 }}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function GridLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  theme,
  loading = false,
  stockUtils,
  slug = null,
  gridColsDesktop = null,
  menuCardStyle = 'solid'
}) {
  const itemsCount = Array.isArray(dishes) ? dishes.length : 0;
  const gridDesktopColsClass =
    itemsCount === 1
      ? 'lg:grid-cols-1 xl:grid-cols-1 2xl:grid-cols-1'
      : itemsCount === 2
        ? 'lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2'
        : itemsCount === 3
          ? 'lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3'
          : Number(gridColsDesktop) === 2
            ? 'lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2'
            : Number(gridColsDesktop) === 3
              ? 'lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3'
              : Number(gridColsDesktop) === 4
                ? 'lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4'
                : Number(gridColsDesktop) === 5
                  ? 'lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5'
                  : 'lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

  const gridClassName = `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${gridDesktopColsClass} gap-4 md:gap-4 lg:gap-4 xl:gap-4`;

  const gridWrapperClassName =
    itemsCount === 1
      ? 'sm:max-w-md sm:mx-auto lg:max-w-3xl lg:mx-auto'
      : itemsCount > 0 && itemsCount <= 3
        ? 'lg:max-w-6xl lg:mx-auto'
      : undefined;

  if (loading) {
    return (
      <div className={gridWrapperClassName}>
        <div className={gridClassName}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <DishSkeleton key={i} />
        ))}
        </div>
      </div>
    );
  }

  // Regular grid layout
  return (
    <div className={gridWrapperClassName}>
      <div className={gridClassName}>
      {dishes.map((dish, index) => {
        const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
        const isLowStock = stockUtils?.isLowStock?.(dish.stock);
        
        // Bebidas e pratos usam o mesmo card visual
        
        return (
          <DishCardWow
            key={dish.id}
            dish={dish}
            onClick={onDishClick}
            index={index}
            isOutOfStock={isOutOfStock}
            isLowStock={isLowStock}
            primaryColor={primaryColor}
            textPrimaryColor={textPrimaryColor}
            theme={theme}
            slug={slug}
            menuCardStyle={menuCardStyle}
          />
        );
      })}
      </div>
    </div>
  );
}
