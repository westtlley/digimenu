import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, X, Zap } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function UpsellModal({ 
  isOpen, 
  onClose, 
  promotions = [], 
  dishes = [],
  onAccept, 
  onDecline,
  primaryColor,
  darkMode 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);

  const promotion = promotions[currentIndex];
  const dish = dishes.find(d => d.id === promotion?.offer_dish_id);

  if (!promotion || !dish) return null;

  const discount = promotion.original_price > promotion.offer_price 
    ? Math.round(((promotion.original_price - promotion.offer_price) / promotion.original_price) * 100)
    : 0;

  const handleDragEnd = (event, info) => {
    const threshold = 100;
    if (info.offset.x < -threshold) {
      // Arrastou para esquerda = não quero
      handleDecline();
    } else if (info.offset.x > threshold) {
      // Arrastou para direita = aceitar
      handleAccept();
    }
    setDragX(0);
  };

  const handleDecline = () => {
    if (currentIndex < promotions.length - 1) {
      // Tem mais promoções, mostrar próxima
      setCurrentIndex(currentIndex + 1);
    } else {
      // Era a última, fechar modal
      onDecline();
      setCurrentIndex(0);
    }
  };

  const handleAccept = () => {
    onAccept(promotion);
    setCurrentIndex(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            key={currentIndex}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDrag={(e, info) => setDragX(info.offset.x)}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
            style={{
              rotate: dragX * 0.05,
            }}
          >
            {/* Drag Indicator */}
            {Math.abs(dragX) > 20 && (
              <div className={`absolute top-1/2 -translate-y-1/2 text-6xl ${dragX < 0 ? 'right-8' : 'left-8'}`}>
                {dragX < 0 ? '👎' : '👍'}
              </div>
            )}

            {/* Header with image */}
            <div className="relative">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="w-full h-56 object-cover" />
              ) : (
                <div className="w-full h-56 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                  <Zap className="w-16 h-16 text-white" />
                </div>
              )}
              
              <button 
                onClick={onClose}
                className="absolute top-3 right-3 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {discount > 0 && (
                <Badge className="absolute top-3 left-3 bg-red-500 text-white text-lg px-4 py-1.5 font-bold shadow-lg">
                  🔥 OFERTA -{discount}%
                </Badge>
              )}

              <Badge 
                className="absolute bottom-3 left-3 text-white font-semibold px-3 py-1"
                style={{ backgroundColor: promotion.type === 'add' ? '#3b82f6' : '#8b5cf6' }}
              >
                {promotion.type === 'add' ? (
                  <><Plus className="w-3 h-3 mr-1" /> Adicionar ao Pedido</>
                ) : (
                  <><RefreshCw className="w-3 h-3 mr-1" /> Trocar Pedido</>
                )}
              </Badge>

              {/* Progress indicator */}
              {promotions.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs">
                  {currentIndex + 1}/{promotions.length}
                </div>
              )}
            </div>

            <div className="p-5">
              <h3 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {promotion.name}
              </h3>
              <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {dish.name}
              </p>

              {promotion.description && (
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {promotion.description}
                </p>
              )}

              <div className="flex items-center gap-2 mb-5">
                {promotion.original_price > promotion.offer_price && (
                  <span className={`text-xl line-through ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {formatCurrency(promotion.original_price)}
                  </span>
                )}
                <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(promotion.offer_price)}
                </span>
              </div>

              <p className="text-xs text-gray-400 text-center mb-4">
                👈 Arraste para {promotions.length > 1 && currentIndex < promotions.length - 1 ? 'próxima' : 'recusar'} · Arraste para aceitar 👉
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={handleDecline}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Não, obrigado
                </button>
                <button 
                  onClick={handleAccept}
                  className="flex-1 py-3 rounded-xl text-white font-semibold shadow-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  {promotion.type === 'add' ? 'Adicionar' : 'Aceitar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}