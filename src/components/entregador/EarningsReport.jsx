import React, { useState } from 'react';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EarningsReport({ entregador, orders, darkMode }) {
  const [period, setPeriod] = useState('today'); // today, week, month
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const filterOrdersByPeriod = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return orders.filter(order => {
      const orderDate = new Date(order.delivered_at || order.created_date);
      if (period === 'today') return orderDate >= today;
      if (period === 'week') return orderDate >= weekAgo;
      if (period === 'month') return orderDate >= monthAgo;
      return true;
    });
  };

  const filteredOrders = filterOrdersByPeriod();
  const totalEarnings = filteredOrders.reduce((sum, order) => sum + (order.delivery_fee || 0), 0);
  const totalDeliveries = filteredOrders.length;
  const avgPerDelivery = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;

  const exportReport = () => {
    const data = filteredOrders.map(order => ({
      data: new Date(order.delivered_at || order.created_date).toLocaleDateString('pt-BR'),
      pedido: order.order_code,
      cliente: order.customer_name,
      valor: order.delivery_fee
    }));
    
    const csv = [
      ['Data', 'Pedido', 'Cliente', 'Valor'],
      ...data.map(row => [row.data, row.pedido, row.cliente, row.valor])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${period}.csv`;
    a.click();
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Relatório de Ganhos
        </h3>
        <Button variant="outline" size="sm" onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filtros de período */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPeriod('today')}
          className={`px-3 py-1 rounded-lg text-sm ${
            period === 'today'
              ? 'bg-blue-500 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Hoje
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={`px-3 py-1 rounded-lg text-sm ${
            period === 'week'
              ? 'bg-blue-500 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}
        >
          7 Dias
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-3 py-1 rounded-lg text-sm ${
            period === 'month'
              ? 'bg-blue-500 text-white'
              : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}
        >
          30 Dias
        </button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
          <DollarSign className="w-5 h-5 text-green-600 mb-1" />
          <p className="text-xs text-gray-500">Total</p>
          <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-green-700'}`}>
            {formatCurrency(totalEarnings)}
          </p>
        </div>
        
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <TrendingUp className="w-5 h-5 text-blue-600 mb-1" />
          <p className="text-xs text-gray-500">Entregas</p>
          <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-blue-700'}`}>
            {totalDeliveries}
          </p>
        </div>
        
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
          <Calendar className="w-5 h-5 text-purple-600 mb-1" />
          <p className="text-xs text-gray-500">Média</p>
          <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-purple-700'}`}>
            {formatCurrency(avgPerDelivery)}
          </p>
        </div>
      </div>

      {/* Lista de entregas */}
      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
        {filteredOrders.map(order => (
          <div
            key={order.id}
            className={`p-2 rounded-lg flex justify-between items-center ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}
          >
            <div>
              <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                #{order.order_code}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(order.delivered_at || order.created_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className="font-bold text-green-600">
              {formatCurrency(order.delivery_fee)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}