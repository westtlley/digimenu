import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import moment from 'moment';
import { TrendingUp, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from '@/components/theme/ThemeProvider';

const PERIODS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '12m', label: '12 meses' },
];

export default function DashboardCharts({ orders = [] }) {
  const [period, setPeriod] = useState('7');
  const { isDark } = useTheme();

  // Ignorar cancelados; faturamento só de entregues; contagem só não cancelados
  const chartData = useMemo(() => {
    const isMonth = period === '12m';
    const n = isMonth ? 12 : (period === '7' ? 7 : 30);

    const points = Array.from({ length: n }, (_, i) => {
      if (isMonth) {
        const date = moment().subtract(11 - i, 'months');
        return {
          date: date.format('MMM/YY'),
          fullDate: date.toDate(),
          revenue: 0,
          orders: 0,
        };
      }
      const date = moment().subtract(n - 1 - i, 'days');
      return {
        date: date.format('DD/MM'),
        fullDate: date.toDate(),
        revenue: 0,
        orders: 0,
      };
    });

    const matchPoint = (orderMoment, pt) => {
      if (isMonth) return orderMoment.isSame(pt.fullDate, 'month');
      return orderMoment.isSame(pt.fullDate, 'day');
    };

    const validOrders = (orders || []).filter(o => o.status !== 'cancelled');
    validOrders.forEach((order) => {
      const orderDate = moment(order.created_date);
      const idx = points.findIndex((d) => matchPoint(orderDate, d));
      if (idx !== -1) {
        // Faturamento: só pedidos entregues
        if (order.status === 'delivered') {
          points[idx].revenue += order.total || 0;
        }
        points[idx].orders += 1;
      }
    });

    return points;
  }, [orders, period]);

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
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const gridStroke = isDark ? '#475569' : '#e5e7eb';
  const axisStroke = isDark ? '#94a3b8' : '#6b7280';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Faturamento */}
      <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <DollarSign className="w-5 h-5 text-green-600" />
            Faturamento
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis 
                dataKey="date" 
                stroke={axisStroke}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={axisStroke}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
                  return `R$ ${value}`;
                }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value) => formatCurrency(value)}
                />} 
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Pedidos */}
      <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Pedidos
          </CardTitle>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{PERIODS.find((p) => p.value === period)?.label}</span>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis 
                dataKey="date" 
                stroke={axisStroke}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke={axisStroke}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />} 
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
