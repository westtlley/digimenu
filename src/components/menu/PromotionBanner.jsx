import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Zap, Percent } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PromotionBanner({ promotions = [], dishes = [], primaryColor, onSelectPromotion }) {
  if (promotions.length === 0) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        <h2 className="font-bold text-lg">Promoções Ativas</h2>
      </div>
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
              whileHover={{ y: -4 }}
              className="relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
              onClick={() => onSelectPromotion && onSelectPromotion(dish)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="relative p-4 flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-white/20">
                  {dish.image ? (
                    <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                  )}
                </div>
                <div className="flex-1 text-white">
                  <Badge className="bg-yellow-400 text-black mb-2">
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