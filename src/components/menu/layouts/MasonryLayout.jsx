import React from 'react';
import { motion } from 'framer-motion';

export default function MasonryLayout({ 
  dishes, 
  onDishClick, 
  primaryColor, 
  loading = false,
  stockUtils,
  formatCurrency 
}) {
  if (loading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="mb-4 h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse break-inside-avoid" />
        ))}
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
      {dishes.map((dish, index) => {
        const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
        
        return (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isOutOfStock && onDishClick(dish)}
            className={`
              mb-4 rounded-xl overflow-hidden border-2 transition-all cursor-pointer break-inside-avoid
              ${isOutOfStock 
                ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                : 'hover:shadow-xl border-gray-200 dark:border-gray-700'
              }
            `}
            style={!isOutOfStock ? { borderColor: 'transparent' } : {}}
          >
            {/* Imagem */}
            <div className="w-full aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
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
            </div>

            {/* Conteúdo */}
            <div className="p-3 bg-white dark:bg-gray-900">
              <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white line-clamp-2">
                {dish.name}
              </h3>
              {dish.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {dish.description}
                </p>
              )}
              <span 
                className="text-base font-bold"
                style={{ color: primaryColor }}
              >
                {formatCurrency?.(dish.price) || `R$ ${dish.price?.toFixed(2) || '0,00'}`}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
