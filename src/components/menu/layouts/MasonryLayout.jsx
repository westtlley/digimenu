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

  // Função para calcular altura variada baseada no conteúdo
  const getImageHeight = (dish, index) => {
    // Varia entre 200px e 320px baseado no índice e conteúdo
    const baseHeight = 200;
    const variation = (index % 4) * 30; // 0, 30, 60, 90
    const hasDescription = dish.description ? 40 : 0;
    return baseHeight + variation + hasDescription;
  };

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6">
      {dishes.map((dish, index) => {
        const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
        const imageHeight = getImageHeight(dish, index);
        
        return (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => !isOutOfStock && onDishClick(dish)}
            className={`
              mb-4 md:mb-6 rounded-xl overflow-hidden border-2 transition-all cursor-pointer break-inside-avoid
              bg-white dark:bg-gray-900 shadow-md hover:shadow-xl
              ${isOutOfStock 
                ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                : 'hover:scale-[1.02] border-gray-200 dark:border-gray-700'
              }
            `}
            style={!isOutOfStock ? { borderColor: 'transparent' } : {}}
          >
            {/* Imagem com altura variada - estilo Pinterest */}
            <div 
              className="w-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative"
              style={{ height: `${imageHeight}px` }}
            >
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
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                    ✨ NOVO
                  </span>
                )}
                {dish.is_popular && (
                  <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
                    🔥 POPULAR
                  </span>
                )}
              </div>
              {dish.original_price && dish.original_price > dish.price && (
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                    -{Math.round(((dish.original_price - dish.price) / dish.original_price) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Conteúdo - sempre visível */}
            <div className="p-3 md:p-4 bg-white dark:bg-gray-900">
              <h3 className="font-bold text-sm md:text-base mb-2 text-gray-900 dark:text-white line-clamp-2">
                {dish.name}
              </h3>
              {dish.description && (
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                  {dish.description}
                </p>
              )}
              <div className="flex items-baseline gap-2 flex-wrap">
                {dish.original_price && dish.original_price > dish.price && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatCurrency?.(dish.original_price)}
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
          </motion.div>
        );
      })}
    </div>
  );
}
