import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DishCardWow from '../DishCardWow';
import DishSkeleton from '../DishSkeleton';

export default function CarouselLayout({ 
  dishes, 
  onDishClick, 
  primaryColor, 
  loading = false,
  stockUtils,
  formatCurrency 
}) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth < 768 ? 280 : 320;
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

  return (
    <div className="relative">
      {/* Botão Anterior */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
        style={{ color: primaryColor }}
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Carrossel - Mobile com mais altura */}
      <div 
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-10 md:px-12"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {dishes.map((dish, index) => {
          const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
          const isLowStock = stockUtils?.isLowStock?.(dish.stock);
          return (
            <div
              key={dish.id}
              className="flex-shrink-0 w-[280px] md:w-72"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Card customizado para mobile ter mais altura */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => !isOutOfStock && onDishClick(dish)}
                className={`
                  bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-md border-2 transition-all cursor-pointer
                  ${isOutOfStock 
                    ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                    : 'hover:shadow-xl border-gray-200 dark:border-gray-700 hover:scale-[1.02]'
                  }
                `}
                style={!isOutOfStock ? { borderColor: 'transparent' } : {}}
              >
                {/* Imagem - Mobile maior */}
                <div className="w-full h-56 md:h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
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
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">✨ NOVO</span>
                    )}
                    {dish.is_popular && (
                      <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">🔥 POPULAR</span>
                    )}
                  </div>
                  {dish.original_price && dish.original_price > dish.price && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        -{Math.round(((dish.original_price - dish.price) / dish.original_price) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo - Mobile com mais espaço */}
                <div className="p-4 md:p-3">
                  <h3 className="font-bold text-base md:text-sm mb-2 text-gray-900 dark:text-white line-clamp-2 min-h-[2.5rem] md:min-h-[2rem]">
                    {dish.name}
                  </h3>
                  {dish.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 md:mb-2">
                      {dish.description}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2">
                    {dish.original_price && dish.original_price > dish.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency?.(dish.original_price)}
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
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Botão Próximo */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
        style={{ color: primaryColor }}
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  );
}
