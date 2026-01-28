import React from 'react';
import { motion } from 'framer-motion';
import { 
  Package, DollarSign, TrendingUp, Clock, MapPin, 
  CheckCircle, AlertCircle, Star, Zap, Target
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/**
 * Dashboard profissional para entregador com estatísticas em tempo real
 */
export default function DeliveryDashboard({ 
  entregador, 
  activeOrders = [], 
  completedOrdersToday = [],
  darkMode = false 
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Calcular métricas
  const todayEarnings = completedOrdersToday.reduce((sum, order) => 
    sum + (order.delivery_fee || 0), 0
  );
  
  const avgDeliveryTime = completedOrdersToday.length > 0
    ? completedOrdersToday.reduce((sum, order) => {
        if (!order.picked_up_at || !order.delivered_at) return sum;
        const picked = new Date(order.picked_up_at);
        const delivered = new Date(order.delivered_at);
        return sum + (delivered - picked) / 60000; // minutos
      }, 0) / completedOrdersToday.length
    : 0;

  const completionRate = entregador.total_deliveries > 0
    ? ((completedOrdersToday.length / entregador.total_deliveries) * 100).toFixed(1)
    : 0;

  const stats = [
    {
      label: 'Entregas Hoje',
      value: completedOrdersToday.length,
      icon: Package,
      color: 'blue',
      change: '+12%',
      trend: 'up'
    },
    {
      label: 'Ganhos Hoje',
      value: formatCurrency(todayEarnings),
      icon: DollarSign,
      color: 'green',
      change: '+8%',
      trend: 'up'
    },
    {
      label: 'Tempo Médio',
      value: formatTime(Math.round(avgDeliveryTime)),
      icon: Clock,
      color: 'purple',
      change: '-5min',
      trend: 'down'
    },
    {
      label: 'Taxa de Conclusão',
      value: `${completionRate}%`,
      icon: Target,
      color: 'orange',
      change: '+2%',
      trend: 'up'
    }
  ];

  const quickActions = [
    { label: 'Ver Histórico', icon: CheckCircle, color: 'blue' },
    { label: 'Relatórios', icon: TrendingUp, color: 'green' },
    { label: 'Configurações', icon: Zap, color: 'purple' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Dashboard
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Visão geral do seu desempenho
          </p>
        </div>
        <Badge className="bg-green-500 text-white">
          <Star className="w-3 h-3 mr-1" />
          {entregador.rating?.toFixed(1) || '5.0'}
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
                <span className={`text-xs font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                {stat.value}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Performance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6`}
      >
        <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Desempenho Semanal
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Entregas Concluídas
              </span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {completedOrdersToday.length} / {entregador.total_deliveries || 0}
              </span>
            </div>
            <Progress 
              value={(completedOrdersToday.length / (entregador.total_deliveries || 1)) * 100} 
              className="h-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Meta de Ganhos
              </span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(todayEarnings)} / {formatCurrency(entregador.total_earnings || 0)}
              </span>
            </div>
            <Progress 
              value={(todayEarnings / (entregador.total_earnings || 1)) * 100} 
              className="h-2"
            />
          </div>
        </div>
      </motion.div>

      {/* Active Orders Summary */}
      {activeOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`${darkMode ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} border rounded-2xl p-4`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Entregas em Andamento
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activeOrders.length} {activeOrders.length === 1 ? 'entrega ativa' : 'entregas ativas'}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            {activeOrders.slice(0, 3).map((order, index) => (
              <div
                key={order.id}
                className={`${darkMode ? 'bg-gray-800/50' : 'bg-white/50'} rounded-lg p-3 flex items-center justify-between`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      #{order.order_code}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {order.customer_name}
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-500 text-white text-xs">
                  {order.status === 'going_to_store' ? 'Indo ao restaurante' :
                   order.status === 'picked_up' ? 'Coletado' :
                   order.status === 'out_for_delivery' ? 'Em rota' : 'Aguardando'}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
