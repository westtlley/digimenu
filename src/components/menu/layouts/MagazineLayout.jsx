import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

export default function MagazineLayout({ 
  dishes, 
  onDishClick, 
  primaryColor, 
  loading = false,
  stockUtils,
  formatCurrency 
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 6; // 2 colunas x 3 linhas
  const totalPages = Math.ceil(dishes.length / itemsPerPage);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const currentDishes = dishes.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="relative">
      {/* Indicador de Página */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <BookOpen className="w-4 h-4" style={{ color: primaryColor }} />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Página {currentPage + 1} de {totalPages}
        </span>
      </div>

      {/* Conteúdo da Página */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 gap-4 md:gap-6"
        >
          {currentDishes.map((dish, index) => {
            const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
            const globalIndex = currentPage * itemsPerPage + index;
            
            return (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => !isOutOfStock && onDishClick(dish)}
                className={`
                  relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer
                  ${isOutOfStock 
                    ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
                    : 'hover:shadow-xl border-gray-200 dark:border-gray-700 hover:scale-[1.02]'
                  }
                `}
                style={!isOutOfStock ? { borderColor: 'transparent' } : {}}
              >
                {/* Imagem */}
                <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
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
                </div>

                {/* Conteúdo */}
                <div className="p-4 bg-white dark:bg-gray-900">
                  <h3 className="font-bold text-base mb-1 text-gray-900 dark:text-white line-clamp-2">
                    {dish.name}
                  </h3>
                  {dish.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {dish.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-lg font-bold"
                      style={{ color: primaryColor }}
                    >
                      {formatCurrency?.(dish.price) || `R$ ${dish.price?.toFixed(2) || '0,00'}`}
                    </span>
                    {dish.is_highlight && (
                      <span className="text-yellow-500">⭐</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Navegação */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ 
            backgroundColor: currentPage === 0 ? 'transparent' : primaryColor,
            color: currentPage === 0 ? '#9ca3af' : 'white'
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentPage ? 'opacity-100' : 'opacity-30'
              }`}
              style={{ backgroundColor: primaryColor }}
            />
          ))}
        </div>

        <button
          onClick={nextPage}
          disabled={currentPage === totalPages - 1}
          className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ 
            backgroundColor: currentPage === totalPages - 1 ? 'transparent' : primaryColor,
            color: currentPage === totalPages - 1 ? '#9ca3af' : 'white'
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
