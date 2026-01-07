import React from 'react';
import { motion } from 'framer-motion';
import { 
  Package, DollarSign, Clock, TrendingUp, 
  CheckCircle, AlertTriangle, Users, Zap, Truck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/**
 * Painel de estatísticas profissional para Gestor de Pedidos
 */
export default function GestorStatsPanel({ 
  orders = [], 
  entregadores = [],
  darkMode = false 
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Calcular métricas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  });

  const totalRevenue = todayOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrders = orders.filter(o => 
    ['new', 'accepted', 'preparing'].includes(o.status)
  ).length;

  const inDelivery = orders.filter(o => 
    ['out_for_delivery', 'going_to_store', 'picked_up'].includes(o.status)
  ).length;

  const avgPrepTime = todayOrders
    .filter(o => o.accepted_at && o.ready_at)
    .reduce((sum, o) => {
      const accepted = new Date(o.accepted_at);
      const ready = new Date(o.ready_at);
      return sum + (ready - accepted) / 60000; // minutos
    }, 0) / Math.max(1, todayOrders.filter(o => o.accepted_at && o.ready_at).length);

  const activeEntregadores = entregadores.filter(e => 
    e.status === 'available' || e.status === 'busy'
  ).length;

  const stats = [
    {
      label: 'Pedidos Hoje',
      value: todayOrders.length,
      icon: Package,
      color: 'blue',
      change: '+15%',
      trend: 'up',
      subtitle: `${pendingOrders} pendentes`
    },
    {
      label: 'Receita Hoje',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'green',
      change: '+22%',
      trend: 'up',
      subtitle: `${todayOrders.filter(o => o.status === 'delivered').length} entregues`
    },
    {
      label: 'Tempo Médio',
      value: `${Math.round(avgPrepTime)}min`,
      icon: Clock,
      color: 'purple',
      change: '-3min',
      trend: 'down',
      subtitle: 'Tempo de preparo'
    },
    {
      label: 'Em Entrega',
      value: inDelivery,
      icon: Truck,
      color: 'orange',
      change: `${activeEntregadores} ativos`,
      trend: 'neutral',
      subtitle: 'Entregas em rota'
    }
  ];


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Estatísticas em Tempo Real
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Visão geral do desempenho de hoje
          </p>
        </div>
        <Badge className="bg-green-500 text-white">
          <Zap className="w-3 h-3 mr-1" />
          Ao vivo
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: darkMode ? 'from-blue-900/50 to-blue-800/30 border-blue-700' : 'from-blue-50 to-blue-100 border-blue-200',
            green: darkMode ? 'from-green-900/50 to-green-800/30 border-green-700' : 'from-green-50 to-green-100 border-green-200',
            purple: darkMode ? 'from-purple-900/50 to-purple-800/30 border-purple-700' : 'from-purple-50 to-purple-100 border-purple-200',
            orange: darkMode ? 'from-orange-900/50 to-orange-800/30 border-orange-700' : 'from-orange-50 to-orange-100 border-orange-200',
          };

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={`bg-gradient-to-br ${colorClasses[stat.color]} border rounded-2xl p-4 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'purple' ? 'text-purple-600' :
                  'text-orange-600'
                }`} />
                {stat.trend !== 'neutral' && (
                  <span className={`text-xs font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                {stat.value}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                {stat.label}
              </p>
              {stat.subtitle && (
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {stat.subtitle}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6`}
      >
        <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Visão Geral de Performance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Taxa de Conclusão
              </span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {todayOrders.length > 0 
                  ? ((todayOrders.filter(o => o.status === 'delivered').length / todayOrders.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <Progress 
              value={(todayOrders.filter(o => o.status === 'delivered').length / Math.max(1, todayOrders.length)) * 100} 
              className="h-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Entregadores Ativos
              </span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {activeEntregadores} / {entregadores.length}
              </span>
            </div>
            <Progress 
              value={(activeEntregadores / Math.max(1, entregadores.length)) * 100} 
              className="h-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Pedidos Pendentes
              </span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {pendingOrders}
              </span>
            </div>
            <Progress 
              value={(pendingOrders / Math.max(1, todayOrders.length)) * 100} 
              className="h-2"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
