import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Star } from 'lucide-react';
import { buildOperationalRange, getEntityOperationalDate, isRecordInOperationalRange } from '@/utils/operationalShift';

function calculateGrowth(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default function DashboardMetrics({
  orders = [],
  dishes = [],
  pdvSales = [],
  operationalCutoffTime = '05:00',
}) {
  const metrics = useMemo(() => {
    const todayRange = buildOperationalRange('today', operationalCutoffTime);
    const weekRange = buildOperationalRange('week', operationalCutoffTime);
    const monthRange = buildOperationalRange('month', operationalCutoffTime);

    const yesterdayKey = todayRange.startKey ? getPreviousOperationalDate(todayRange.startKey) : null;
    const previousWeekRange = weekRange.startKey && weekRange.endKey
      ? {
          startKey: shiftOperationalDate(weekRange.startKey, -7),
          endKey: shiftOperationalDate(weekRange.endKey, -7),
        }
      : { startKey: null, endKey: null };
    const previousMonthRange = monthRange.startKey && monthRange.endKey
      ? {
          startKey: shiftOperationalDate(monthRange.startKey, -30),
          endKey: shiftOperationalDate(monthRange.endKey, -30),
        }
      : { startKey: null, endKey: null };

    const notCancelled = (order) => order.status !== 'cancelled';
    const delivered = (order) => order.status === 'delivered';

    const todayOrders = (orders || []).filter((order) => (
      notCancelled(order) &&
      getEntityOperationalDate(order, operationalCutoffTime) === todayRange.startKey
    ));
    const yesterdayOrders = (orders || []).filter((order) => (
      notCancelled(order) &&
      getEntityOperationalDate(order, operationalCutoffTime) === yesterdayKey
    ));
    const weekOrders = (orders || []).filter((order) => (
      notCancelled(order) &&
      isRecordInOperationalRange(order, weekRange.startKey, weekRange.endKey, operationalCutoffTime)
    ));
    const lastWeekOrders = (orders || []).filter((order) => (
      notCancelled(order) &&
      isRecordInOperationalRange(order, previousWeekRange.startKey, previousWeekRange.endKey, operationalCutoffTime)
    ));
    const monthOrders = (orders || []).filter((order) => (
      notCancelled(order) &&
      isRecordInOperationalRange(order, monthRange.startKey, monthRange.endKey, operationalCutoffTime)
    ));
    const lastMonthOrders = (orders || []).filter((order) => (
      notCancelled(order) &&
      isRecordInOperationalRange(order, previousMonthRange.startKey, previousMonthRange.endKey, operationalCutoffTime)
    ));

    const todayRevenue = sumRevenue(todayOrders, delivered) + sumTotalsByRange(pdvSales, todayRange, operationalCutoffTime);
    const yesterdayRevenue = sumRevenue(yesterdayOrders, delivered) + sumTotalsByDate(pdvSales, yesterdayKey, operationalCutoffTime);
    const weekRevenue = sumRevenue(weekOrders, delivered) + sumTotalsByRange(pdvSales, weekRange, operationalCutoffTime);
    const lastWeekRevenue = sumRevenue(lastWeekOrders, delivered) + sumTotalsByRange(pdvSales, previousWeekRange, operationalCutoffTime);
    const monthRevenue = sumRevenue(monthOrders, delivered) + sumTotalsByRange(pdvSales, monthRange, operationalCutoffTime);
    const lastMonthRevenue = sumRevenue(lastMonthOrders, delivered) + sumTotalsByRange(pdvSales, previousMonthRange, operationalCutoffTime);

    const totalTodayCount = todayOrders.length + countByDate(pdvSales, todayRange.startKey, operationalCutoffTime);
    const totalYesterdayCount = yesterdayOrders.length + countByDate(pdvSales, yesterdayKey, operationalCutoffTime);
    const avgTicketToday = totalTodayCount > 0 ? todayRevenue / totalTodayCount : 0;
    const avgTicketYesterday = totalYesterdayCount > 0 ? yesterdayRevenue / totalYesterdayCount : 0;

    const dishCounts = {};
    (orders || []).filter(notCancelled).forEach((order) => {
      (order.items || []).forEach((item) => {
        const dishId = item.dish_id || item.dish?.id;
        if (dishId) {
          dishCounts[dishId] = (dishCounts[dishId] || 0) + (item.quantity || 1);
        }
      });
    });

    const topProducts = Object.entries(dishCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([dishId, count]) => {
        const dish = dishes.find((candidate) => candidate.id === dishId);
        return { dish, count };
      })
      .filter((item) => item.dish);

    return {
      today: {
        orders: totalTodayCount,
        revenue: todayRevenue,
        avgTicket: avgTicketToday,
        growth: {
          revenue: calculateGrowth(todayRevenue, yesterdayRevenue),
          orders: calculateGrowth(totalTodayCount, totalYesterdayCount),
          avgTicket: calculateGrowth(avgTicketToday, avgTicketYesterday),
        },
      },
      week: {
        orders: weekOrders.length + countByRange(pdvSales, weekRange, operationalCutoffTime),
        revenue: weekRevenue,
        growth: calculateGrowth(weekRevenue, lastWeekRevenue),
      },
      month: {
        orders: monthOrders.length + countByRange(pdvSales, monthRange, operationalCutoffTime),
        revenue: monthRevenue,
        growth: calculateGrowth(monthRevenue, lastMonthRevenue),
      },
      topProducts,
    };
  }, [orders, dishes, pdvSales, operationalCutoffTime]);

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-card border-border border-l-4 border-l-blue-500">
          <CardHeader className="py-2 px-4 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Faturamento Hoje
              <GrowthIndicator value={metrics.today.growth.revenue} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-3">
            <div className="text-xl font-bold text-foreground">{formatCurrency(metrics.today.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metrics.today.orders} pedido(s)/venda(s)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-green-500">
          <CardHeader className="py-2 px-4 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Ticket Medio
              <GrowthIndicator value={metrics.today.growth.avgTicket} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-3">
            <div className="text-xl font-bold text-foreground">{formatCurrency(metrics.today.avgTicket)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Por pedido hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-violet-500">
          <CardHeader className="py-2 px-4 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              Pedidos Hoje
              <GrowthIndicator value={metrics.today.growth.orders} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-3">
            <div className="text-xl font-bold text-foreground">{metrics.today.orders}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Recebidos no dia operacional</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardHeader className="py-2 px-4 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Faturamento da Semana</span>
              <GrowthIndicator value={metrics.week.growth} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-3">
            <div className="text-lg font-bold text-foreground">{formatCurrency(metrics.week.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{metrics.week.orders} pedidos nesta semana operacional</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="py-2 px-4 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Faturamento do Mes</span>
              <GrowthIndicator value={metrics.month.growth} />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-4 pb-3">
            <div className="text-lg font-bold text-foreground">{formatCurrency(metrics.month.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{metrics.month.orders} pedidos neste mes operacional</p>
          </CardContent>
        </Card>
      </div>

      {metrics.topProducts.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Star className="w-4 h-4 text-primary" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <div className="space-y-2">
              {metrics.topProducts.map((item, index) => (
                <div key={item.dish?.id || index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-xs text-foreground">{item.dish?.name || 'Produto'}</p>
                      <p className="text-[10px] text-muted-foreground">{item.count} venda(s)</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">#{item.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function sumRevenue(orders, predicate) {
  return (orders || []).filter(predicate).reduce((sum, order) => sum + Number(order.total || 0), 0);
}

function sumTotalsByRange(records, range, cutoffTime) {
  return (records || [])
    .filter((record) => isRecordInOperationalRange(record, range.startKey, range.endKey, cutoffTime))
    .reduce((sum, record) => sum + Number(record.total || 0), 0);
}

function sumTotalsByDate(records, dateKey, cutoffTime) {
  return (records || [])
    .filter((record) => getEntityOperationalDate(record, cutoffTime) === dateKey)
    .reduce((sum, record) => sum + Number(record.total || 0), 0);
}

function countByRange(records, range, cutoffTime) {
  return (records || []).filter((record) => (
    isRecordInOperationalRange(record, range.startKey, range.endKey, cutoffTime)
  )).length;
}

function countByDate(records, dateKey, cutoffTime) {
  return (records || []).filter((record) => getEntityOperationalDate(record, cutoffTime) === dateKey).length;
}

function getPreviousOperationalDate(dateKey) {
  if (!dateKey) return null;
  return shiftOperationalDate(dateKey, -1);
}

function shiftOperationalDate(dateKey, days) {
  const [year, month, day] = String(dateKey).split('-').map((part) => parseInt(part, 10));
  const utcDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  utcDate.setUTCDate(utcDate.getUTCDate() + Number(days || 0));
  const yyyy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
