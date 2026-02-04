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
  stockUtils 
}) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
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
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
        style={{ color: primaryColor }}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Carrossel */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-12"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {dishes.map((dish, index) => {
          const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
          const isLowStock = stockUtils?.isLowStock?.(dish.stock);
          return (
            <div
              key={dish.id}
              className="flex-shrink-0 w-64 md:w-72"
              style={{ scrollSnapAlign: 'start' }}
            >
              <DishCardWow
                dish={dish}
                onClick={onDishClick}
                index={index}
                isOutOfStock={isOutOfStock}
                isLowStock={isLowStock}
                primaryColor={primaryColor}
              />
            </div>
          );
        })}
      </div>

      {/* Botão Próximo */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
        style={{ color: primaryColor }}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
