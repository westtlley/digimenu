import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function ProductGrid({ dishes = [], onDishClick, formatCurrency }) {
  const safeDishes = Array.isArray(dishes) ? dishes : [];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
      {safeDishes.map((dish, index) => {
        const isOutOfStock = dish.stock !== null && dish.stock !== undefined && dish.stock <= 0;
        
        return (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-lg active:scale-95 ${
                isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-400'
              }`}
              onClick={() => !isOutOfStock && onDishClick(dish)}
            >
              <CardContent className="p-2 sm:p-3">
                <div className="relative mb-2">
                  {dish.image ? (
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-20 sm:h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-20 sm:h-24 bg-gray-100 rounded flex items-center justify-center text-3xl">
                      🍽️
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                      <Badge className="bg-red-500">Esgotado</Badge>
                    </div>
                  )}
                  {!isOutOfStock && dish.stock > 0 && dish.stock <= 5 && (
                    <Badge className="absolute top-1 right-1 bg-orange-500 text-[10px] px-1">
                      {dish.stock}
                    </Badge>
                  )}
                </div>
                <p className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 min-h-[2rem]">
                  {dish.name}
                </p>
                <p className="text-orange-600 font-bold text-sm sm:text-base">
                  {formatCurrency(dish.price)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}