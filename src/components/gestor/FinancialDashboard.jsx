import React, { useMemo, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, Calendar, Download, Filter, Receipt } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinancialDashboard({ orders = [], pdvSales = [] }) {
  const [periodFilter, setPeriodFilter] = useState('today'); // today, week, month, custom

  const stats = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    switch (periodFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Filtrar pedidos online
    const filteredOrders = orders.filter(o => {
      const orderDate = new Date(o.created_date);
      return orderDate >= startDate && o.status !== 'cancelled';
    });

    // Filtrar vendas PDV
    const filteredPDV = pdvSales.filter(p => {
      const saleDate = new Date(p.created_date || p.created_at);
      return saleDate >= startDate;
    });

    // Combinar todos os pedidos/vendas
    const allSales = [
      ...filteredOrders.map(o => ({
        type: 'online',
        total: o.total || 0,
        payment_method: o.payment_method || 'Não informado',
        date: o.created_date
      })),
      ...filteredPDV.map(p => ({
        type: 'pdv',
        total: p.total || 0,
        payment_method: p.payment_method || 'Não informado',
        date: p.created_date || p.created_at
      }))
    ];

    const totalRevenue = allSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalOrders = allSales.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const byPaymentMethod = allSales.reduce((acc, s) => {
      const method = s.payment_method || 'Não informado';
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count += 1;
      acc[method].total += s.total || 0;
      return acc;
    }, {});

    // Estatísticas por tipo
    const onlineRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pdvRevenue = filteredPDV.reduce((sum, p) => sum + (p.total || 0), 0);

    return { 
      totalRevenue, 
      totalOrders, 
      avgTicket, 
      byPaymentMethod,
      onlineRevenue,
      pdvRevenue,
      onlineCount: filteredOrders.length,
      pdvCount: filteredPDV.length
    };
  }, [orders, pdvSales, periodFilter]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const paymentMethodLabels = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito'
  };

  const periodLabels = {
    today: 'Hoje',
    week: 'Últimos 7 dias',
    month: 'Últimos 30 dias'
  };

  const exportData = () => {
    const csv = [
      ['Período', 'Faturamento', 'Pedidos', 'Ticket Médio', 'Online', 'PDV'].join(','),
      [
        periodLabels[periodFilter],
        stats.totalRevenue.toFixed(2),
        stats.totalOrders,
        stats.avgTicket.toFixed(2),
        stats.onlineRevenue.toFixed(2),
        stats.pdvRevenue.toFixed(2)
      ].join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro-${periodFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Resumo Financeiro
        </h2>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
            <Badge className="bg-white/20 text-xs">Hoje</Badge>
          </div>
          <p className="text-xs sm:text-sm opacity-80">Faturamento</p>
          <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8" />
            <Badge className="bg-white/20 text-xs">Hoje</Badge>
          </div>
          <p className="text-xs sm:text-sm opacity-80">Total de Pedidos</p>
          <p className="text-2xl sm:text-3xl font-bold">{stats.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 sm:p-6 shadow-lg sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
            <Badge className="bg-white/20 text-xs">Hoje</Badge>
          </div>
          <p className="text-xs sm:text-sm opacity-80">Ticket Médio</p>
          <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(stats.avgTicket)}</p>
        </div>
      </div>

      {/* Por Forma de Pagamento */}
      <div className="rounded-xl p-4 sm:p-6 shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          <h3 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text-primary)' }}>Por Forma de Pagamento</h3>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {Object.entries(stats.byPaymentMethod).map(([method, data]) => (
            <div key={method} className="flex items-center justify-between p-3 sm:p-4 rounded-lg min-h-touch" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>{paymentMethodLabels[method] || method}</p>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>{data.count} pedidos</p>
              </div>
              <p className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base ml-2 flex-shrink-0">{formatCurrency(data.total)}</p>
            </div>
          ))}
          {Object.keys(stats.byPaymentMethod).length === 0 && (
            <p className="text-center py-8 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>Nenhum pedido hoje</p>
          )}
        </div>
      </div>
    </div>
  );
}