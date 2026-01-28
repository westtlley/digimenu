import React from 'react';
import { Package, DollarSign, Clock, Star, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardStats({ entregador, orders, darkMode }) {
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => 
    o.status === 'delivered' && new Date(o.delivered_at).toDateString() === today
  );
  
  const thisWeek = orders.filter(o => {
    if (o.status !== 'delivered') return false;
    const deliveredDate = new Date(o.delivered_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return deliveredDate >= weekAgo;
  });

  const thisMonth = orders.filter(o => {
    if (o.status !== 'delivered') return false;
    const deliveredDate = new Date(o.delivered_at);
    return deliveredDate.getMonth() === new Date().getMonth();
  });

  const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const weekEarnings = thisWeek.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const monthEarnings = thisMonth.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);

  const avgDeliveryTime = todayOrders.length > 0
    ? todayOrders.reduce((sum, o) => {
        const start = new Date(o.accepted_at || o.created_date);
        const end = new Date(o.delivered_at);
        return sum + (end - start) / 60000;
      }, 0) / todayOrders.length
    : 0;

  const lastDelivery = orders
    .filter(o => o.status === 'delivered')
    .sort((a, b) => new Date(b.delivered_at) - new Date(a.delivered_at))[0];

  const stats = [
    {
      label: 'Entregas Hoje',
      value: todayOrders.length,
      icon: Package,
      color: 'text-blue-600',
      bgColor: darkMode ? 'bg-gray-700' : 'bg-blue-50',
      detail: `${thisWeek.length} esta semana`
    },
    {
      label: 'Ganhos Hoje',
      value: `R$ ${todayEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: darkMode ? 'bg-gray-700' : 'bg-green-50',
      detail: `R$ ${weekEarnings.toFixed(2)} esta semana`
    },
    {
      label: 'Tempo Médio',
      value: avgDeliveryTime > 0 ? `${Math.round(avgDeliveryTime)}min` : '—',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: darkMode ? 'bg-gray-700' : 'bg-orange-50',
      detail: 'Por entrega hoje'
    },
    {
      label: 'Avaliação',
      value: entregador.rating?.toFixed(1) || '5.0',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: darkMode ? 'bg-gray-700' : 'bg-yellow-50',
      detail: `${entregador.total_ratings || 0} avaliações`
    }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.bgColor} rounded-xl p-4 ${darkMode ? '' : 'border'}`}
            >
              <Icon className={`w-6 h-6 ${stat.color} mb-2`} />
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {stat.label}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                {stat.detail}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Performance Summary */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Resumo do Mês
          </h3>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {thisMonth.length}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Entregas
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold text-green-600`}>
              {formatCurrency(monthEarnings)}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Faturamento
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {thisMonth.length > 0 ? formatCurrency(monthEarnings / thisMonth.length) : '—'}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Média/Entrega
            </p>
          </div>
        </div>
      </div>

      {/* Last Delivery */}
      {lastDelivery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-gradient-to-r from-green-50 to-emerald-50'} rounded-xl p-4 border ${darkMode ? '' : 'border-green-200'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-green-700'} mb-1`}>
                Última Entrega
              </p>
              <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                #{lastDelivery.order_code} - {lastDelivery.customer_name}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} mt-1`}>
                {new Date(lastDelivery.delivered_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(lastDelivery.delivery_fee || 0)}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-green-700'}`}>
                Ganho
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}