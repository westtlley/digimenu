import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import moment from 'moment';
import { TrendingUp, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from '@/components/theme/ThemeProvider';
import { getEntityOperationalDate } from '@/utils/operationalShift';

const PERIODS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '12m', label: '12 meses' },
];

function hasEnoughPoints(series, min = 5) {
  const values = Array.isArray(series) ? series : [];
  const withValue = values.filter((value) => value != null && !Number.isNaN(value) && Number(value) !== 0);
  return withValue.length >= min;
}

function isMostlyZero(series, threshold = 0.8) {
  const values = Array.isArray(series) ? series : [];
  if (values.length === 0) return true;
  const zeros = values.filter((value) => value == null || Number(value) === 0).length;
  return zeros / values.length >= threshold;
}

function isFlat(series, epsilon = 0.001) {
  const values = Array.isArray(series) ? series : [];
  const nums = values.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
  if (nums.length < 2) return true;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min;
  const ref = Math.max(Math.abs(max), Math.abs(min), 1);
  return range / ref < epsilon;
}

function shouldShowChart(series, minPoints = 5) {
  if (!series || series.length < minPoints) return false;
  return hasEnoughPoints(series, minPoints) && !isMostlyZero(series, 0.8) && !isFlat(series, 0.001);
}

function buildDayKey(date) {
  return moment(date).format('YYYY-MM-DD');
}

export default function DashboardCharts({
  orders = [],
  pdvSales = [],
  operationalCutoffTime = '05:00',
}) {
  const [period, setPeriod] = useState('7');
  const { isDark } = useTheme();

  const chartData = useMemo(() => {
    const isMonth = period === '12m';
    const pointCount = isMonth ? 12 : (period === '7' ? 7 : 30);

    const points = Array.from({ length: pointCount }, (_, index) => {
      if (isMonth) {
        const date = moment().subtract(11 - index, 'months').startOf('month');
        return {
          key: date.format('YYYY-MM'),
          date: date.format('MMM/YY'),
          fullDate: date.toDate(),
          revenue: 0,
          orders: 0,
        };
      }

      const date = moment().subtract(pointCount - 1 - index, 'days');
      return {
        key: buildDayKey(date),
        date: date.format('DD/MM'),
        fullDate: date.toDate(),
        revenue: 0,
        orders: 0,
      };
    });

    const pointIndexByKey = new Map(points.map((point, index) => [point.key, index]));
    const addRecord = (record, amount, count = 1) => {
      const operationalDate = getEntityOperationalDate(record, operationalCutoffTime);
      if (!operationalDate) return;

      const key = isMonth
        ? String(operationalDate).slice(0, 7)
        : operationalDate;
      const pointIndex = pointIndexByKey.get(key);
      if (pointIndex == null) return;

      points[pointIndex].revenue += Number(amount || 0);
      points[pointIndex].orders += Number(count || 0);
    };

    orders
      .filter((order) => order.status !== 'cancelled')
      .forEach((order) => {
        addRecord(order, order.status === 'delivered' ? order.total : 0, 1);
      });

    pdvSales.forEach((sale) => {
      addRecord(sale, sale.total || 0, 1);
    });

    return points;
  }, [orders, pdvSales, period, operationalCutoffTime]);

  const revenueSeries = useMemo(() => (chartData || []).map((item) => item.revenue), [chartData]);
  const ordersSeries = useMemo(() => (chartData || []).map((item) => item.orders), [chartData]);
  const showRevenueChart = shouldShowChart(revenueSeries, 5);
  const showOrdersChart = shouldShowChart(ordersSeries, 5);

  const totalRevenue = useMemo(() => revenueSeries.reduce((sum, value) => sum + (Number(value) || 0), 0), [revenueSeries]);
  const totalOrders = useMemo(() => ordersSeries.reduce((sum, value) => sum + (Number(value) || 0), 0), [ordersSeries]);
  const prevPeriodRevenue = useMemo(() => {
    const pointCount = chartData.length;
    if (pointCount < 2) return 0;
    const half = Math.floor(pointCount / 2);
    return chartData.slice(0, half).reduce((sum, item) => sum + (Number(item.revenue) || 0), 0);
  }, [chartData]);
  const lastOrder = useMemo(() => {
    const validOrders = [
      ...(orders || []).filter((order) => order.status !== 'cancelled'),
      ...(pdvSales || []),
    ];
    if (validOrders.length === 0) return null;
    return validOrders.sort((a, b) => {
      const aDate = new Date(a.created_date || a.created_at || 0).getTime();
      const bDate = new Date(b.created_date || b.created_at || 0).getTime();
      return bDate - aDate;
    })[0];
  }, [orders, pdvSales]);

  const chartConfig = {
    revenue: {
      label: "Faturamento",
      color: "hsl(var(--chart-1))",
    },
    orders: {
      label: "Pedidos",
      color: "hsl(var(--chart-2))",
    },
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const gridStroke = isDark ? '#475569' : '#e5e7eb';
  const axisStroke = isDark ? '#94a3b8' : '#6b7280';

  const periodLabel = PERIODS.find((entry) => entry.value === period)?.label || '7 dias';
  const revenueGrowthPct = prevPeriodRevenue > 0
    ? (((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100).toFixed(1)
    : (totalRevenue > 0 ? '100' : '0');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card className="overflow-hidden bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3 pb-1">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <DollarSign className="w-4 h-4 text-green-500" />
            Faturamento
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[90px] h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          {showRevenueChart ? (
            <ChartContainer config={chartConfig} className="h-[120px]">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => (value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : `R$ ${value}`)} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="py-2">
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                {periodLabel}
                {prevPeriodRevenue > 0 && (
                  <span className={Number(revenueGrowthPct) >= 0 ? ' text-green-500' : ' text-destructive'}>
                    {' '}· {Number(revenueGrowthPct) >= 0 ? '+' : ''}{revenueGrowthPct}% vs anterior
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3 pb-1">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            Pedidos
          </CardTitle>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          {showOrdersChart ? (
            <ChartContainer config={chartConfig} className="h-[120px]">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="py-2">
              <p className="text-lg font-bold text-foreground">{totalOrders}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">
                {lastOrder ? `Ultimo as ${moment(lastOrder.created_date || lastOrder.created_at).format('HH:mm')}` : 'Sem dados no periodo'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
