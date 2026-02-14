import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/utils/formatters';

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
  const recentDishes = safeDishes
    .filter(d => {
      // Só incluir se estiver nos pedidos recentes
      if (!recentDishIds.has(d.id)) return false;
      // Só incluir se estiver ativo/disponível
      if (d.is_active === false) return false;
      // Verificar se tem nome válido
      if (!d.name || d.name.trim() === '') return false;
      // Verificar se tem preço válido (exceto pizzas)
      if (d.product_type !== 'pizza' && (d.price === null || d.price === undefined)) return false;
      return true;
    })
    .slice(0, 4);

  if (recentDishes.length === 0) return null;

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
    <section className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4" style={{ color: primaryColor }} />
        <h2 className="font-bold text-sm md:text-base text-foreground">Peça de Novo</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {recentDishes.map((dish) => {
          const quantity = getDishQuantity(dish.id);
          return (
            <motion.div
              key={dish.id}
              whileHover={{ y: -2, scale: 1.02 }}
              className="flex-shrink-0 w-28 md:w-32 bg-card rounded-xl overflow-hidden shadow-sm border border-border cursor-pointer"
              onClick={() => onSelectDish(dish)}
            >
              {/* Thumbnail */}
              <div className="relative h-20 md:h-24 bg-gray-100 dark:bg-gray-800">
                {dish.image ? (
                  <img 
                    src={dish.image} 
                    alt={dish.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                )}
                {/* Badge de quantidade */}
                {quantity > 1 && (
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    {quantity}x
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3 className="font-medium text-xs mb-1 line-clamp-2 min-h-[2rem] text-foreground">{dish.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm" style={{ color: primaryColor }}>
                    {formatCurrency(dish.price)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}