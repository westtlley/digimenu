import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecentOrders({ dishes = [], onSelectDish, primaryColor }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['myRecentOrders'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const allOrders = await base44.entities.Order.list('-created_date');
        return allOrders
          .filter(o => o.customer_email === user.email || o.created_by === user.email)
          .slice(0, 3);
      } catch {
        return [];
      }
    },
  });

  if (orders.length === 0) return null;

  // Extrair pratos únicos dos pedidos recentes
  const recentDishIds = new Set();
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (item.dish?.id) recentDishIds.add(item.dish.id);
    });
  });

  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const recentDishes = safeDishes.filter(d => recentDishIds.has(d.id)).slice(0, 4);

  if (recentDishes.length === 0) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Agrupar pratos por pedido para mostrar quantidade
  const getDishQuantity = (dishId) => {
    let total = 0;
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (item.dish?.id === dishId) {
          total += item.quantity || 1;
        }
      });
    });
    return total;
  };

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex items-center gap-2 mb-4 md:mb-4">
        <Clock className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="font-bold text-base md:text-lg text-foreground">Peça de Novo</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {recentDishes.map((dish) => {
          const quantity = getDishQuantity(dish.id);
          return (
            <motion.div
              key={dish.id}
              whileHover={{ y: -4, scale: 1.05 }}
              className="flex-shrink-0 w-36 bg-card rounded-2xl overflow-hidden shadow-md border border-border cursor-pointer"
              onClick={() => onSelectDish(dish)}
            >
              {/* Thumbnail Circular */}
              <div className="relative h-32 bg-gray-100 dark:bg-gray-800">
                {dish.image ? (
                  <img 
                    src={dish.image} 
                    alt={dish.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                )}
                {/* Badge de quantidade */}
                {quantity > 1 && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {quantity}x
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm mb-2 line-clamp-2 min-h-[2.5rem] text-foreground">{dish.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base" style={{ color: primaryColor }}>
                    {formatCurrency(dish.price)}
                  </span>
                </div>
                {/* Botão removido no mobile - card inteiro é clicável */}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}