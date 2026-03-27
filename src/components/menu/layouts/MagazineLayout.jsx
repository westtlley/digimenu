import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { withAlpha } from '@/utils/storefrontTheme';

export default function MagazineLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  textSecondaryColor,
  theme,
  loading = false,
  stockUtils,
  formatCurrency,
  menuCardStyle = 'solid',
  beverageHintMap = {}
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = dishes.length;
  const isAeroCard = menuCardStyle === 'aero';
  const cardSurface = theme?.surface || 'hsl(var(--card))';
  const cardAltSurface = theme?.surfaceAlt || 'hsl(var(--muted))';
  const cardBorder = theme?.borderColor || 'hsl(var(--border))';
  const badgeBg = theme?.badgeBg || primaryColor;
  const badgeText = theme?.badgeText || '#ffffff';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md h-96 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (dishes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center px-6 py-10">
          <div className="text-4xl mb-2">🍽️</div>
          <p className="font-semibold text-gray-900 dark:text-white">Sem itens nessa categoria</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Escolha outra categoria acima.</p>
        </div>
      </div>
    );
  }

  const currentDish = dishes[currentPage];
  const isOutOfStock = stockUtils?.isOutOfStock?.(currentDish?.stock);
  const priceLabel = currentDish?.price_label || '';
  const beverageHint = beverageHintMap?.[currentDish?.id] || null;

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
        <span className="text-sm" style={{ color: textSecondaryColor || theme?.textSecondary || 'hsl(var(--muted-foreground))' }}>
          Página {currentPage + 1} de {totalPages}
        </span>
      </div>

      {/* Container da Página - Responsivo */}
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Desktop: Horizontal */}
        <div className="hidden md:block">
          <div
            className="relative aspect-[4/3] rounded-2xl shadow-2xl overflow-hidden border-2"
            style={isAeroCard
              ? { backgroundColor: withAlpha(cardSurface, 0.66), borderColor: withAlpha(cardBorder, 0.9), backdropFilter: 'blur(18px)' }
              : { backgroundColor: cardSurface, borderColor: cardBorder }}
          >
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
                    <div className="w-full h-full flex items-center justify-center text-6xl" style={{ backgroundColor: cardAltSurface }}>
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
                <div className="w-1/2 p-8 flex flex-col justify-between" style={{ background: `linear-gradient(135deg, ${withAlpha(cardAltSurface, 0.9)}, ${cardSurface})` }}>
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
                    {beverageHint?.text && !isOutOfStock && (
                      <p className="text-xs font-semibold mb-4" style={{ color: primaryColor }}>
                        {beverageHint.text}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      {currentDish?.is_highlight && (
                        <span className="text-2xl">⭐</span>
                      )}
                      {currentDish?.is_new && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: badgeBg, color: badgeText }}>
                          NOVO
                        </span>
                      )}
                      {currentDish?.is_popular && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: primaryColor, color: theme?.ctaText || '#ffffff' }}>
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
                    <div className="flex flex-col">
                      {priceLabel && (
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {priceLabel}
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
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: Vertical */}
        <div className="md:hidden">
          <div
            className="relative min-h-[70vh] rounded-2xl shadow-2xl overflow-hidden border-2"
            style={isAeroCard
              ? { backgroundColor: withAlpha(cardSurface, 0.66), borderColor: withAlpha(cardBorder, 0.9), backdropFilter: 'blur(18px)' }
              : { backgroundColor: cardSurface, borderColor: cardBorder }}
          >
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
                    <div className="w-full h-full flex items-center justify-center text-5xl" style={{ backgroundColor: cardAltSurface }}>
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
                <div className="flex-1 p-6 flex flex-col justify-between" style={{ background: `linear-gradient(135deg, ${withAlpha(cardAltSurface, 0.9)}, ${cardSurface})` }}>
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
                    {beverageHint?.text && !isOutOfStock && (
                      <p className="text-xs font-semibold mb-3" style={{ color: primaryColor }}>
                        {beverageHint.text}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {currentDish?.is_highlight && (
                        <span className="text-xl">⭐</span>
                      )}
                      {currentDish?.is_new && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: badgeBg, color: badgeText }}>
                          NOVO
                        </span>
                      )}
                      {currentDish?.is_popular && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: primaryColor, color: theme?.ctaText || '#ffffff' }}>
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
                    <div className="flex flex-col">
                      {priceLabel && (
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {priceLabel}
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
