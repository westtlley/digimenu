import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Zap, Percent, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/utils/formatters';

export default function PromotionBanner({ promotions = [], dishes = [], primaryColor, onSelectPromotion, store }) {
  if (promotions.length === 0) return null;

  // Verificar se há promoção de entrega grátis
  const hasFreeDelivery = store?.free_delivery_threshold && store.free_delivery_threshold > 0;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        <h2 className="font-bold text-lg">Promoções Ativas</h2>
      </div>
      
      {/* Banner de Entrega Grátis - Estilo das imagens */}
      {hasFreeDelivery && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl overflow-hidden shadow-lg"
        >
          <div className="p-4 flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 text-white">
              <h3 className="font-bold text-base md:text-lg mb-1">Entrega grátis em algumas regiões</h3>
              <p className="text-sm md:text-base opacity-90">Aproveite já!</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Promoções de Produtos */}
      <div className="grid sm:grid-cols-2 gap-4">
        {promotions.slice(0, 4).map((promo) => {
          const dish = dishes.find(d => d.id === promo.offer_dish_id);
          if (!dish) return null;

          const discount = promo.original_price > promo.offer_price 
            ? Math.round(((promo.original_price - promo.offer_price) / promo.original_price) * 100)
            : 0;

          return (
            <motion.div
              key={promo.id}
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative rounded-2xl overflow-hidden shadow-lg cursor-pointer border-2"
              style={{ 
                borderColor: primaryColor + '40',
                background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`
              }}
              onClick={() => onSelectPromotion && onSelectPromotion(dish)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="relative p-4 flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-white/20 shadow-lg">
                  {dish.image ? (
                    <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                  )}
                </div>
                <div className="flex-1 text-white">
                  <Badge className="bg-yellow-400 text-black mb-2 font-bold">
                    <Percent className="w-3 h-3 mr-1" />
                    -{discount}%
                  </Badge>
                  <h3 className="font-bold text-base mb-1">{promo.name}</h3>
                  <div className="flex items-center gap-2">
                    {promo.original_price > promo.offer_price && (
                      <span className="text-sm line-through opacity-75">
                        {formatCurrency(promo.original_price)}
                      </span>
                    )}
                    <span className="text-xl font-bold">{formatCurrency(promo.offer_price)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}