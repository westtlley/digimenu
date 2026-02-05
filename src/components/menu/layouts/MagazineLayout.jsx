import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

export default function MagazineLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  textSecondaryColor,
  loading = false,
  stockUtils,
  formatCurrency 
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = dishes.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md h-96 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (dishes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Nenhum prato encontrado</p>
      </div>
    );
  }

  const currentDish = dishes[currentPage];
  const isOutOfStock = stockUtils?.isOutOfStock?.(currentDish?.stock);

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

  // Efeito de virar página - horizontal no desktop, vertical no mobile
  const pageVariants = {
    enter: (direction) => ({
      x: direction === 'next' ? '100%' : '-100%',
      opacity: 0,
      rotateY: direction === 'next' ? 90 : -90,
    }),
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0,
    },
    exit: (direction) => ({
      x: direction === 'next' ? '-100%' : '100%',
      opacity: 0,
      rotateY: direction === 'next' ? -90 : 90,
    }),
  };

  const [direction, setDirection] = useState('next');

  const handleNext = () => {
    setDirection('next');
    nextPage();
  };

  const handlePrev = () => {
    setDirection('prev');
    prevPage();
  };

  return (
    <div className="relative w-full">
      {/* Indicador de Página */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <BookOpen className="w-4 h-4" style={{ color: primaryColor }} />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Página {currentPage + 1} de {totalPages}
        </span>
      </div>

      {/* Container da Página - Responsivo */}
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Desktop: Horizontal */}
        <div className="hidden md:block">
          <div className="relative aspect-[4/3] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentPage}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ 
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="absolute inset-0 flex"
                style={{ perspective: '1000px' }}
              >
                {/* Imagem lado esquerdo */}
                <div className="w-1/2 relative overflow-hidden">
                  {currentDish?.image ? (
                    <img 
                      src={currentDish.image} 
                      alt={currentDish.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-6xl">
                      🍽️
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Esgotado</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo lado direito */}
                <div className="w-1/2 p-8 flex flex-col justify-between bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                  <div>
                    <h2 
                      className="text-3xl font-bold mb-4"
                      style={{ color: textPrimaryColor || 'inherit' }}
                    >
                      {currentDish?.name}
                    </h2>
                    {currentDish?.description && (
                      <p 
                        className="text-base mb-6 leading-relaxed"
                        style={{ color: textSecondaryColor || 'inherit' }}
                      >
                        {currentDish.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      {currentDish?.is_highlight && (
                        <span className="text-2xl">⭐</span>
                      )}
                      {currentDish?.is_new && (
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                          NOVO
                        </span>
                      )}
                      {currentDish?.is_popular && (
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold">
                          🔥 POPULAR
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3">
                    {currentDish?.original_price && currentDish.original_price > currentDish.price && (
                      <span className="text-xl text-gray-400 line-through">
                        {formatCurrency?.(currentDish.original_price)}
                      </span>
                    )}
                    <span 
                      className="text-4xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      {formatCurrency?.(currentDish?.price) || 'R$ 0,00'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: Vertical */}
        <div className="md:hidden">
          <div className="relative min-h-[70vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentPage}
                custom={direction}
                variants={{
                  enter: (dir) => ({
                    y: dir === 'next' ? '100%' : '-100%',
                    opacity: 0,
                    rotateX: dir === 'next' ? 90 : -90,
                  }),
                  center: {
                    y: 0,
                    opacity: 1,
                    rotateX: 0,
                  },
                  exit: (dir) => ({
                    y: dir === 'next' ? '-100%' : '100%',
                    opacity: 0,
                    rotateX: dir === 'next' ? -90 : 90,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ 
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="absolute inset-0 flex flex-col"
                style={{ perspective: '1000px' }}
              >
                {/* Imagem topo */}
                <div className="w-full h-64 relative overflow-hidden">
                  {currentDish?.image ? (
                    <img 
                      src={currentDish.image} 
                      alt={currentDish.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-5xl">
                      🍽️
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold">Esgotado</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo embaixo */}
                <div className="flex-1 p-6 flex flex-col justify-between bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                  <div>
                    <h2 
                      className="text-2xl font-bold mb-3"
                      style={{ color: textPrimaryColor || 'inherit' }}
                    >
                      {currentDish?.name}
                    </h2>
                    {currentDish?.description && (
                      <p 
                        className="text-sm mb-4 leading-relaxed"
                        style={{ color: textSecondaryColor || 'inherit' }}
                      >
                        {currentDish.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {currentDish?.is_highlight && (
                        <span className="text-xl">⭐</span>
                      )}
                      {currentDish?.is_new && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                          NOVO
                        </span>
                      )}
                      {currentDish?.is_popular && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold">
                          🔥 POPULAR
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    {currentDish?.original_price && currentDish.original_price > currentDish.price && (
                      <span className="text-lg text-gray-400 line-through">
                        {formatCurrency?.(currentDish.original_price)}
                      </span>
                    )}
                    <span 
                      className="text-3xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      {formatCurrency?.(currentDish?.price) || 'R$ 0,00'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={handlePrev}
          disabled={currentPage === 0}
          className="p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          style={{ 
            backgroundColor: currentPage === 0 ? 'transparent' : primaryColor,
            color: currentPage === 0 ? '#9ca3af' : 'white'
          }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentPage ? 'next' : 'prev');
                setCurrentPage(i);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentPage ? 'opacity-100 scale-125' : 'opacity-30'
              }`}
              style={{ backgroundColor: primaryColor }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages - 1}
          className="p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          style={{ 
            backgroundColor: currentPage === totalPages - 1 ? 'transparent' : primaryColor,
            color: currentPage === totalPages - 1 ? '#9ca3af' : 'white'
          }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
