import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

export default function ListLayout({ 
  dishes, 
  onDishClick, 
  primaryColor,
  textPrimaryColor,
  textSecondaryColor,
  loading = false,
  stockUtils,
  formatCurrency,
  slug = null,
  autoplayIntervalMs = 4500
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const safeItems = Array.isArray(dishes) ? dishes : [];
  const comboItems = safeItems.filter((d) => d?.product_type === 'combo');
  const regularItems = safeItems.filter((d) => d?.product_type !== 'combo');
  const hasCombos = comboItems.length > 0;

  const [comboIndex, setComboIndex] = useState(0);

  useEffect(() => {
    if (comboItems.length <= 1) return;
    const ms = Number(autoplayIntervalMs) > 0 ? Number(autoplayIntervalMs) : 4500;
    const t = setInterval(() => {
      setComboIndex((prev) => (prev + 1) % comboItems.length);
    }, ms);
    return () => clearInterval(t);
  }, [autoplayIntervalMs, comboItems.length]);

  useEffect(() => {
    if (comboItems.length === 0) return;
    setComboIndex((prev) => Math.min(prev, Math.max(0, comboItems.length - 1)));
  }, [comboItems.length]);

  const visibleCombo = useMemo(() => {
    if (comboItems.length === 0) return null;
    return comboItems[Math.min(comboIndex, comboItems.length - 1)];
  }, [comboIndex, comboItems]);

  const Card = ({ dish, index }) => {
    const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
    const { toggleFavorite, isFavorite } = useFavorites(slug);
    return (
      <motion.div
        key={dish.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => !isOutOfStock && onDishClick(dish)}
        className={`
          flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-all cursor-pointer
          ${isOutOfStock 
            ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
            : 'hover:shadow-lg border-gray-200 dark:border-gray-700 hover:border-opacity-80'
          }
        `}
        style={!isOutOfStock ? { borderColor: 'transparent' } : {}}
      >
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
          </div>
        </div>

        {/* Favorito */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(dish); }}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors self-center"
          aria-label={isFavorite(dish.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart className={`w-4 h-4 transition-colors ${isFavorite(dish.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-400'}`} />
        </button>

        {/* Imagem */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 order-last">
          {dish.image ? (
            <img 
              src={dish.image} 
              alt={dish.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.5 0-3 .6-4 1.8A5.98 5.98 0 0 0 6 9c0 2.5 1.5 4.5 3.5 5.4V17H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-1.5v-2.6C16.5 13.5 18 11.5 18 9c0-1.7-.7-3.2-2-4.2C15 3.6 13.5 3 12 3Z" /><path strokeLinecap="round" d="M9.5 17h5" /></svg>
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">Esgotado</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const ComboCard = ({ dish, index }) => {
    const isOutOfStock = stockUtils?.isOutOfStock?.(dish.stock);
    return (
      <motion.div
        key={dish.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => !isOutOfStock && onDishClick(dish)}
        className="relative flex items-center gap-3 p-3 md:p-4 rounded-xl overflow-hidden shadow-lg cursor-pointer border"
        style={{
          borderColor: primaryColor + '40',
          background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
        <div className="relative flex-1 min-w-0 text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
          <div className="inline-flex items-center px-2 py-1 rounded-md bg-white/90 text-black text-xs font-bold mb-2">
            Combo
          </div>
          <h3 className="font-bold text-base mb-1 truncate">{dish.name}</h3>
          <div className="text-xl font-bold">{formatCurrency?.(dish.price) || `R$ ${dish.price?.toFixed(2) || '0,00'}`}</div>
        </div>
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0">
          {dish.image ? (
            <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-40" fill="none" stroke="white" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.5 0-3 .6-4 1.8A5.98 5.98 0 0 0 6 9c0 2.5 1.5 4.5 3.5 5.4V17H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-1.5v-2.6C16.5 13.5 18 11.5 18 9c0-1.7-.7-3.2-2-4.2C15 3.6 13.5 3 12 3Z" /><path strokeLinecap="round" d="M9.5 17h5" /></svg>
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">Esgotado</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (!hasCombos) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {regularItems.map((dish, index) => (
          <Card dish={dish} index={index} key={dish.id} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
      <div className="grid grid-cols-1 gap-3">
        {regularItems.map((dish, index) => (
          <Card dish={dish} index={index} key={dish.id} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {visibleCombo && (
          <motion.div
            key={`${visibleCombo.id}_${comboIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <ComboCard dish={visibleCombo} index={0} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
