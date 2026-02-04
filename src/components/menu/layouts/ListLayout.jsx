import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function ListLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  textSecondaryColor,
  loading = false,
  stockUtils,
  formatCurrency 
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dishes.map((dish, index) => {
        const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
        const isLowStock = stockUtils?.isLowStock?.(dish.stock);
        
        return (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isOutOfStock && onDishClick(dish)}
            className={`
              flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer
              ${isOutOfStock 
                ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                : 'hover:shadow-lg border-gray-200 dark:border-gray-700 hover:border-opacity-80'
              }
            `}
            style={!isOutOfStock ? { borderColor: 'transparent' } : {}}
          >
            {/* Imagem */}
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden flex-shrink-0">
              {dish.image ? (
                <img 
                  src={dish.image} 
                  alt={dish.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl">
                  🍽️
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Esgotado</span>
                </div>
              )}
            </div>

            {/* Conteúdo */}
              <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 
                  className="font-bold text-base md:text-lg line-clamp-2"
                  style={{ color: textPrimaryColor || 'inherit' }}
                >
                  {dish.name}
                </h3>
                {dish.is_highlight && (
                  <span className="text-yellow-500 text-sm">⭐</span>
                )}
                {dish.is_new && (
                  <span className="text-green-500 text-xs font-bold bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">NOVO</span>
                )}
              </div>
              {dish.description && (
                <p 
                  className="text-sm line-clamp-2 mb-2"
                  style={{ color: textSecondaryColor || 'inherit' }}
                >
                  {dish.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span 
                  className="text-xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {formatCurrency?.(dish.price) || `R$ ${dish.price?.toFixed(2) || '0,00'}`}
                </span>
                {!isOutOfStock && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDishClick(dish);
                    }}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: primaryColor, color: 'white' }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
