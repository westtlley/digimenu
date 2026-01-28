import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  DollarSign, ShoppingCart, Clock, Package, Users, Star
} from 'lucide-react';
import moment from 'moment';

export default function DashboardMetrics({ orders = [], dishes = [], pdvSales = [] }) {
  const metrics = useMemo(() => {
    const today = moment().startOf('day');
    const yesterday = moment().startOf('day').subtract(1, 'day');
    const thisWeek = moment().startOf('week');
    const lastWeek = moment().startOf('week').subtract(1, 'week');
    const thisMonth = moment().startOf('month');
    const lastMonth = moment().startOf('month').subtract(1, 'month');

    const notCancelled = (o) => o.status !== 'cancelled';
    const delivered = (o) => o.status === 'delivered';

    // Pedidos de hoje (exclui cancelados)
    const todayOrders = (orders || []).filter(o => moment(o.created_date).isSame(today, 'day') && notCancelled(o));
    const todayRevenue = todayOrders.filter(delivered).reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos de ontem
    const yesterdayOrders = (orders || []).filter(o => moment(o.created_date).isSame(yesterday, 'day') && notCancelled(o));
    const yesterdayRevenue = yesterdayOrders.filter(delivered).reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos da semana
    const weekOrders = (orders || []).filter(o => moment(o.created_date).isSameOrAfter(thisWeek) && notCancelled(o));
    const weekRevenue = weekOrders.filter(delivered).reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos da semana passada
    const lastWeekOrders = (orders || []).filter(o => {
      const orderDate = moment(o.created_date);
      return orderDate.isSameOrAfter(lastWeek) && orderDate.isBefore(thisWeek) && notCancelled(o);
    });
    const lastWeekRevenue = lastWeekOrders.filter(delivered).reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos do mês
    const monthOrders = (orders || []).filter(o => moment(o.created_date).isSameOrAfter(thisMonth) && notCancelled(o));
    const monthRevenue = monthOrders.filter(delivered).reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos do mês passado
    const lastMonthOrders = (orders || []).filter(o => {
      const orderDate = moment(o.created_date);
      return orderDate.isSameOrAfter(lastMonth) && orderDate.isBefore(thisMonth) && notCancelled(o);
    });
    const lastMonthRevenue = lastMonthOrders.filter(delivered).reduce((sum, o) => sum + (o.total || 0), 0);

    // Ticket médio
    const avgTicketToday = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
    const avgTicketYesterday = yesterdayOrders.length > 0 ? yesterdayRevenue / yesterdayOrders.length : 0;
    
    // Crescimento percentual
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const revenueGrowth = calculateGrowth(todayRevenue, yesterdayRevenue);
    const ordersGrowth = calculateGrowth(todayOrders.length, yesterdayOrders.length);
    const weekRevenueGrowth = calculateGrowth(weekRevenue, lastWeekRevenue);
    const monthRevenueGrowth = calculateGrowth(monthRevenue, lastMonthRevenue);
    const avgTicketGrowth = calculateGrowth(avgTicketToday, avgTicketYesterday);

    // Top produtos (exclui cancelados)
    const dishCounts = {};
    (orders || []).filter(notCancelled).forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const dishId = item.dish_id || item.dish?.id;
          if (dishId) {
            dishCounts[dishId] = (dishCounts[dishId] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    const topProducts = Object.entries(dishCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([dishId, count]) => {
        const dish = dishes.find(d => d.id === dishId);
        return { dish, count };
      })
      .filter(item => item.dish);

    return {
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
        avgTicket: avgTicketToday,
        growth: {
          revenue: revenueGrowth,
          orders: ordersGrowth,
          avgTicket: avgTicketGrowth
        }
      },
      week: {
        orders: weekOrders.length,
        revenue: weekRevenue,
        growth: weekRevenueGrowth
      },
      month: {
        orders: monthOrders.length,
        revenue: monthRevenue,
        growth: monthRevenueGrowth
      },
      topProducts
    };
  }, [orders, dishes, pdvSales]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const GrowthIndicator = ({ value }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300';
    const bgClass = isPositive ? 'bg-green-50 dark:bg-green-950/50' : 'bg-red-50 dark:bg-red-950/50';
    
    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass} ${bgClass} px-2 py-1 rounded-full`}>
        <Icon className="w-3 h-3" />
        <span className="font-semibold">{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Métricas de Hoje */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950 dark:to-blue-900 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-200 flex items-center justify-between">
              Faturamento Hoje
              <GrowthIndicator value={metrics.today.growth.revenue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-50">{formatCurrency(metrics.today.revenue)}</div>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              {metrics.today.orders} pedido(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950 dark:to-green-900 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-200 flex items-center justify-between">
              Ticket Médio
              <GrowthIndicator value={metrics.today.growth.avgTicket} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-50">{formatCurrency(metrics.today.avgTicket)}</div>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
              Por pedido hoje
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950 dark:to-purple-900 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-200 flex items-center justify-between">
              Pedidos Hoje
              <GrowthIndicator value={metrics.today.growth.orders} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-50">{metrics.today.orders}</div>
            <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
              Recebidos hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Semana/Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-orange-200 dark:border-orange-800" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
              <span>Faturamento da Semana</span>
              <GrowthIndicator value={metrics.week.growth} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(metrics.week.revenue)}</div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{metrics.week.orders} pedidos nesta semana</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 dark:border-indigo-800" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
              <span>Faturamento do Mês</span>
              <GrowthIndicator value={metrics.month.growth} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(metrics.month.revenue)}</div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{metrics.month.orders} pedidos neste mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos */}
      {metrics.topProducts.length > 0 && (
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Star className="w-5 h-5 text-yellow-500" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topProducts.map((item, index) => (
                <div key={item.dish?.id || index} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.dish?.name || 'Produto'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.count} venda(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>#{item.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
