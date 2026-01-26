import React, { useMemo } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, CreditCard } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function FinancialDashboard({ orders }) {
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.created_date).toDateString();
      return orderDate === today && o.status !== 'cancelled';
    });

    const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = todayOrders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const byPaymentMethod = todayOrders.reduce((acc, o) => {
      const method = o.payment_method || 'Não informado';
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count += 1;
      acc[method].total += o.total || 0;
      return acc;
    }, {});

    return { totalRevenue, totalOrders, avgTicket, byPaymentMethod };
  }, [orders]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const paymentMethodLabels = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito'
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Resumo do Dia</h2>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8" />
            <Badge className="bg-white/20">Hoje</Badge>
          </div>
          <p className="text-sm opacity-80">Faturamento</p>
          <p className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="w-8 h-8" />
            <Badge className="bg-white/20">Hoje</Badge>
          </div>
          <p className="text-sm opacity-80">Total de Pedidos</p>
          <p className="text-3xl font-bold">{stats.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8" />
            <Badge className="bg-white/20">Hoje</Badge>
          </div>
          <p className="text-sm opacity-80">Ticket Médio</p>
          <p className="text-3xl font-bold">{formatCurrency(stats.avgTicket)}</p>
        </div>
      </div>

      {/* Por Forma de Pagamento */}
      <div className="rounded-xl p-6 shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5" />
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Por Forma de Pagamento</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(stats.byPaymentMethod).map(([method, data]) => (
            <div key={method} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{paymentMethodLabels[method] || method}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.count} pedidos</p>
              </div>
              <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(data.total)}</p>
            </div>
          ))}
          {Object.keys(stats.byPaymentMethod).length === 0 && (
            <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>Nenhum pedido hoje</p>
          )}
        </div>
      </div>
    </div>
  );
}