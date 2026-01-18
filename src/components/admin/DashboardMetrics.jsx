import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  DollarSign, ShoppingCart, Clock, Package, Users, Star
} from 'lucide-react';
import moment from 'moment';

export default function DashboardMetrics({ orders = [], dishes = [] }) {
  const metrics = useMemo(() => {
    const today = moment().startOf('day');
    const yesterday = moment().startOf('day').subtract(1, 'day');
    const thisWeek = moment().startOf('week');
    const lastWeek = moment().startOf('week').subtract(1, 'week');
    const thisMonth = moment().startOf('month');
    const lastMonth = moment().startOf('month').subtract(1, 'month');

    // Pedidos de hoje
    const todayOrders = orders.filter(o => moment(o.created_date).isSame(today, 'day'));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos de ontem
    const yesterdayOrders = orders.filter(o => moment(o.created_date).isSame(yesterday, 'day'));
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos da semana
    const weekOrders = orders.filter(o => moment(o.created_date).isSameOrAfter(thisWeek));
    const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos da semana passada
    const lastWeekOrders = orders.filter(o => {
      const orderDate = moment(o.created_date);
      return orderDate.isSameOrAfter(lastWeek) && orderDate.isBefore(thisWeek);
    });
    const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos do mês
    const monthOrders = orders.filter(o => moment(o.created_date).isSameOrAfter(thisMonth));
    const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    // Pedidos do mês passado
    const lastMonthOrders = orders.filter(o => {
      const orderDate = moment(o.created_date);
      return orderDate.isSameOrAfter(lastMonth) && orderDate.isBefore(thisMonth);
    });
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

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

    // Top produtos (simplificado)
    const dishCounts = {};
    orders.forEach(order => {
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
  }, [orders, dishes]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const GrowthIndicator = ({ value, isRevenue = false }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    const bgClass = isPositive ? 'bg-green-50' : 'bg-red-50';
    
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
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center justify-between">
              Faturamento Hoje
              <GrowthIndicator value={metrics.today.growth.revenue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{formatCurrency(metrics.today.revenue)}</div>
            <p className="text-xs text-blue-600 mt-1">
              {metrics.today.orders} pedido(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center justify-between">
              Ticket Médio
              <GrowthIndicator value={metrics.today.growth.avgTicket} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{formatCurrency(metrics.today.avgTicket)}</div>
            <p className="text-xs text-green-600 mt-1">
              Por pedido hoje
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center justify-between">
              Pedidos Hoje
              <GrowthIndicator value={metrics.today.growth.orders} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{metrics.today.orders}</div>
            <p className="text-xs text-purple-600 mt-1">
              Recebidos hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Semana/Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Faturamento da Semana</span>
              <GrowthIndicator value={metrics.week.growth} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.week.revenue)}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.week.orders} pedidos nesta semana</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Faturamento do Mês</span>
              <GrowthIndicator value={metrics.month.growth} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.month.revenue)}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.month.orders} pedidos neste mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos */}
      {metrics.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topProducts.map((item, index) => (
                <div key={item.dish?.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.dish?.name || 'Produto'}</p>
                      <p className="text-xs text-gray-500">{item.count} venda(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">#{item.count}</p>
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
