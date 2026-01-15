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

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="font-bold text-lg">Peça Novamente</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {recentDishes.map((dish) => (
          <motion.div
            key={dish.id}
            whileHover={{ y: -4 }}
            className="flex-shrink-0 w-36 bg-white rounded-xl overflow-hidden shadow-sm border cursor-pointer"
            onClick={() => onSelectDish(dish)}
          >
            <div className="relative h-32 bg-gray-100">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm mb-1 line-clamp-1">{dish.name}</h3>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm" style={{ color: primaryColor }}>
                  {formatCurrency(dish.price)}
                </span>
                <button 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}