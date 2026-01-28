import React, { useState } from 'react';
import { Package, DollarSign, Clock, Star, Calendar, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';

export default function DeliveryHistory({ orders, darkMode }) {
  const [periodFilter, setPeriodFilter] = useState('all');

  const completedOrders = orders.filter(o => o.status === 'delivered').sort((a, b) => 
    new Date(b.delivered_at) - new Date(a.delivered_at)
  );

  const filteredOrders = completedOrders.filter(order => {
    const deliveredDate = new Date(order.delivered_at);
    const now = new Date();
    
    if (periodFilter === 'today') {
      return deliveredDate.toDateString() === now.toDateString();
    } else if (periodFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return deliveredDate >= weekAgo;
    } else if (periodFilter === 'month') {
      return deliveredDate.getMonth() === now.getMonth();
    }
    return true;
  });

  const totalEarnings = filteredOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (order) => {
    const start = new Date(order.accepted_at || order.created_date);
    const end = new Date(order.delivered_at);
    const minutes = Math.round((end - start) / 60000);
    return `${minutes}min`;
  };

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Histórico de Entregas
            </h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredOrders.length} entregas • {formatCurrency(totalEarnings)} ganhos
            </p>
          </div>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tudo</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
            <Package className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-blue-700'}`}>
              {filteredOrders.length}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Entregas
            </p>
          </div>
          <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
            <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-green-700'}`}>
              {formatCurrency(totalEarnings)}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total
            </p>
          </div>
          <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
            <DollarSign className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-orange-700'}`}>
              {filteredOrders.length > 0 ? formatCurrency(totalEarnings / filteredOrders.length) : '—'}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Média
            </p>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-12 text-center border`}>
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              Nenhuma entrega no período selecionado
            </p>
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-500 text-white">
                      #{order.order_code}
                    </Badge>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatTime(order.delivered_at)}
                    </span>
                  </div>
                  <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {order.customer_name}
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {order.address}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(order.delivery_fee || 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-3 border-t">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {calculateDuration(order)}
                  </span>
                </div>
                {order.customer_rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {order.customer_rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}