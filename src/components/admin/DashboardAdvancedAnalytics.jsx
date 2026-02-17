import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import moment from 'moment';
import { Clock, CreditCard, TrendingUp, Users, AlertTriangle, Calendar, Target, ShoppingCart, TrendingDown, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from '@/components/theme/ThemeProvider';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardAdvancedAnalytics({ orders = [], dishes = [], categories = [] }) {
  const [period, setPeriod] = useState('7');
  const [revenueTarget, setRevenueTarget] = useState(() => {
    const saved = localStorage.getItem('dashboard_revenue_target');
    return saved ? parseFloat(saved) : 0;
  });
  const { isDark } = useTheme();

  useEffect(() => {
    if (revenueTarget > 0) {
      localStorage.setItem('dashboard_revenue_target', revenueTarget.toString());
    }
  }, [revenueTarget]);

  // Análise de Horários de Pico
  const peakHoursData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, orders: 0, revenue: 0 }));
    
    const validOrders = (orders || []).filter(o => o.status !== 'cancelled');
    validOrders.forEach(order => {
      const hour = moment(order.created_date).hour();
      hours[hour].orders += 1;
      if (order.status === 'delivered') {
        hours[hour].revenue += order.total || 0;
      }
    });

    return hours.map(h => ({
      ...h,
      label: `${h.hour.toString().padStart(2, '0')}:00`
    }));
  }, [orders]);

  // Análise de Métodos de Pagamento
  const paymentMethodsData = useMemo(() => {
    const methods = {};
    const validOrders = (orders || []).filter(o => o.status === 'delivered');
    
    validOrders.forEach(order => {
      const method = order.payment_method || 'Não informado';
      if (!methods[method]) {
        methods[method] = { name: method, count: 0, revenue: 0 };
      }
      methods[method].count += 1;
      methods[method].revenue += order.total || 0;
    });

    return Object.values(methods).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // Análise de Categorias Mais Vendidas
  const categoriesData = useMemo(() => {
    const catMap = {};
    const validOrders = (orders || []).filter(o => o.status !== 'cancelled');
    
    validOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const dish = dishes.find(d => d.id === (item.dish_id || item.dish?.id));
          if (dish && dish.category_id) {
            const category = categories.find(c => c.id === dish.category_id);
            const catName = category?.name || 'Sem categoria';
            if (!catMap[catName]) {
              catMap[catName] = { name: catName, count: 0, revenue: 0 };
            }
            const quantity = item.quantity || 1;
            catMap[catName].count += quantity;
            if (order.status === 'delivered') {
              catMap[catName].revenue += (item.unit_price || dish.price || 0) * quantity;
            }
          }
        });
      }
    });

    return Object.values(catMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders, dishes, categories]);

  // Análise de Dias da Semana
  const weekdaysData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekData = days.map((day, index) => ({ day, orders: 0, revenue: 0 }));
    
    const validOrders = (orders || []).filter(o => o.status !== 'cancelled');
    validOrders.forEach(order => {
      const dayOfWeek = moment(order.created_date).day();
      weekData[dayOfWeek].orders += 1;
      if (order.status === 'delivered') {
        weekData[dayOfWeek].revenue += order.total || 0;
      }
    });

    return weekData;
  }, [orders]);

  // Taxa de Cancelamento
  const cancellationRate = useMemo(() => {
    const total = orders.length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    return total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0;
  }, [orders]);

  // Tempo Médio de Preparo
  const avgPrepTime = useMemo(() => {
    const deliveredOrders = orders.filter(o => 
      o.status === 'delivered' && 
      o.created_date && 
      o.delivered_date
    );
    
    if (deliveredOrders.length === 0) return null;
    
    const totalMinutes = deliveredOrders.reduce((sum, order) => {
      const start = moment(order.created_date);
      const end = moment(order.delivered_date);
      return sum + end.diff(start, 'minutes');
    }, 0);
    
    return Math.round(totalMinutes / deliveredOrders.length);
  }, [orders]);

  // Clientes Recorrentes
  const recurringCustomers = useMemo(() => {
    const customerOrders = {};
    const validOrders = (orders || []).filter(o => o.status !== 'cancelled');
    
    validOrders.forEach(order => {
      const customerId = order.customer_phone || order.customer_name || 'unknown';
      if (!customerOrders[customerId]) {
        customerOrders[customerId] = 0;
      }
      customerOrders[customerId] += 1;
    });

    const recurring = Object.values(customerOrders).filter(count => count > 1).length;
    const total = Object.keys(customerOrders).length;
    
    return {
      count: recurring,
      percentage: total > 0 ? ((recurring / total) * 100).toFixed(1) : 0,
      total
    };
  }, [orders]);

  // Meta de Faturamento vs Realizado
  const revenueProgress = useMemo(() => {
    const thisMonth = moment().startOf('month');
    const monthOrders = (orders || []).filter(o => 
      moment(o.created_date).isSameOrAfter(thisMonth) && 
      o.status === 'delivered'
    );
    const actualRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const progress = revenueTarget > 0 ? (actualRevenue / revenueTarget) * 100 : 0;
    
    return {
      target: revenueTarget,
      actual: actualRevenue,
      progress: Math.min(progress, 100),
      remaining: Math.max(0, revenueTarget - actualRevenue)
    };
  }, [orders, revenueTarget]);

  // Taxa de Abandono de Carrinho
  const cartAbandonmentRate = useMemo(() => {
    // Contar carrinhos salvos no localStorage (abandonados)
    let abandonedCarts = 0;
    let completedOrders = 0;
    
    try {
      // Contar chaves de carrinho no localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cardapio_cart_')) {
          const cartData = localStorage.getItem(key);
          if (cartData) {
            try {
              const cart = JSON.parse(cartData);
              if (cart && cart.length > 0) {
                abandonedCarts++;
              }
            } catch (e) {
              // Ignorar erros de parse
            }
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao calcular carrinhos abandonados:', e);
    }

    // Contar pedidos completados (delivered)
    completedOrders = (orders || []).filter(o => o.status === 'delivered').length;
    
    const total = abandonedCarts + completedOrders;
    const rate = total > 0 ? ((abandonedCarts / total) * 100).toFixed(1) : 0;
    
    return {
      abandoned: abandonedCarts,
      completed: completedOrders,
      rate: parseFloat(rate),
      total
    };
  }, [orders]);

  // Previsão de Demanda (ML Simples - Média Móvel)
  const demandForecast = useMemo(() => {
    const days = 7;
    const dailyRevenue = {};
    const validOrders = (orders || []).filter(o => o.status === 'delivered');
    
    // Calcular receita por dia nos últimos 7 dias
    for (let i = 0; i < days; i++) {
      const date = moment().subtract(i, 'days').startOf('day');
      const dayOrders = validOrders.filter(o => 
        moment(o.created_date).isSame(date, 'day')
      );
      const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      dailyRevenue[date.format('YYYY-MM-DD')] = revenue;
    }
    
    // Calcular média móvel
    const values = Object.values(dailyRevenue);
    const avgRevenue = values.length > 0 
      ? values.reduce((sum, v) => sum + v, 0) / values.length 
      : 0;
    
    // Previsão para os próximos 7 dias (usando tendência simples)
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const date = moment().add(i, 'days');
      forecast.push({
        date: date.format('DD/MM'),
        predicted: avgRevenue * (1 + (i * 0.02)), // Crescimento de 2% por dia
        confidence: Math.max(60, 100 - (i * 5)) // Confiança diminui com o tempo
      });
    }
    
    return {
      avgDailyRevenue: avgRevenue,
      forecast,
      trend: values.length >= 2 
        ? (values[0] > values[values.length - 1] ? 'up' : 'down')
        : 'stable'
    };
  }, [orders]);

  // Taxa de Entrega (delivery rate)
  const deliveryRate = useMemo(() => {
    const totalOrders = (orders || []).filter(o => o.status !== 'cancelled');
    const deliveredOrders = totalOrders.filter(o => o.status === 'delivered');
    const deliveryOrders = totalOrders.filter(o => 
      o.delivery_type === 'delivery' || o.delivery_type === 'entrega'
    );
    
    return {
      total: totalOrders.length,
      delivered: deliveredOrders.length,
      delivery: deliveryOrders.length,
      rate: totalOrders.length > 0 
        ? ((deliveredOrders.length / totalOrders.length) * 100).toFixed(1)
        : 0,
      deliveryPercentage: totalOrders.length > 0
        ? ((deliveryOrders.length / totalOrders.length) * 100).toFixed(1)
        : 0
    };
  }, [orders]);

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
  const textColor = isDark ? '#e2e8f0' : '#1e293b';

  return (
    <div className="space-y-4">
      {/* Meta de Faturamento */}
      {revenueTarget > 0 && (
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-2 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Target className="w-4 h-4 text-blue-500" />
                Meta de Faturamento do Mês
              </CardTitle>
              <Input
                type="number"
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(parseFloat(e.target.value) || 0)}
                className="w-32"
                placeholder="Meta (R$)"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>Realizado: {formatCurrency(revenueProgress.actual)}</span>
                  <span>Meta: {formatCurrency(revenueProgress.target)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      revenueProgress.progress >= 100 
                        ? 'bg-green-500' 
                        : revenueProgress.progress >= 75 
                        ? 'bg-blue-500' 
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(revenueProgress.progress, 100)}%` }}
                  />
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {revenueProgress.progress.toFixed(1)}% da meta
                  {revenueProgress.remaining > 0 && (
                    <span className="ml-2">• Faltam {formatCurrency(revenueProgress.remaining)}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Avançadas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-1.5 px-3 pb-0">
            <CardTitle className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              Taxa Cancel.
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1.5 px-3 pb-2">
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{cancellationRate}%</div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{orders.filter(o => o.status === 'cancelled').length}/{orders.length} pedidos</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-1.5 px-3 pb-0">
            <CardTitle className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1.5 px-3 pb-2">
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{avgPrepTime ? `${avgPrepTime} min` : 'N/A'}</div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Preparo</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-1.5 px-3 pb-0">
            <CardTitle className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <Users className="w-3.5 h-3.5 text-green-500" />
              Recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1.5 px-3 pb-2">
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{recurringCustomers.percentage}%</div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{recurringCustomers.count}/{recurringCustomers.total} clientes</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-1.5 px-3 pb-0">
            <CardTitle className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <CreditCard className="w-3.5 h-3.5 text-purple-500" />
              Método Mais Usado
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1.5 px-3 pb-2">
            <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }} title={paymentMethodsData[0]?.name}>{paymentMethodsData[0]?.name || 'N/A'}</div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{paymentMethodsData[0]?.count || 0} pedidos</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-1.5 px-3 pb-0">
            <CardTitle className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <ShoppingCart className="w-3.5 h-3.5 text-red-500" />
              Abandono
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1.5 px-3 pb-2">
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{cartAbandonmentRate.rate}%</div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{cartAbandonmentRate.abandoned}/{cartAbandonmentRate.total}</p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-1.5 px-3 pb-0">
            <CardTitle className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <Package className="w-3.5 h-3.5 text-indigo-500" />
              Taxa Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1.5 px-3 pb-2">
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{deliveryRate.rate}%</div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{deliveryRate.delivered}/{deliveryRate.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Previsão de Demanda */}
      <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-4 h-4 text-green-500" />
            Previsão de Demanda (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Receita Média Diária</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(demandForecast.avgDailyRevenue)}
                </p>
              </div>
              <Badge variant={demandForecast.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                {demandForecast.trend === 'up' ? 'Alta' : 'Baixa'}
              </Badge>
            </div>
            <ChartContainer config={{ predicted: { label: "Previsão", color: "#22c55e" } }} className="h-[140px]">
              <LineChart data={demandForecast.forecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis 
                  dataKey="date" 
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />}
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                />
              </LineChart>
            </ChartContainer>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {demandForecast.forecast.map((day, index) => (
                <div key={index} className="text-center py-1.5 px-1 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{day.date}</p>
                  <p style={{ color: 'var(--text-secondary)' }}>{formatCurrency(day.predicted)}</p>
                  <p className="opacity-80" style={{ color: 'var(--text-secondary)' }}>{day.confidence}%</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Horários de Pico */}
        <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-2 px-4 pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Clock className="w-4 h-4 text-orange-500" />
              Horários de Pico
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <ChartContainer config={{ orders: { label: "Pedidos", color: "#f97316" } }} className="h-[180px]">
              <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis 
                  dataKey="label" 
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Métodos de Pagamento */}
        <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-2 px-4 pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <CreditCard className="w-4 h-4 text-green-500" />
              Métodos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <ChartContainer config={{ revenue: { label: "Faturamento", color: "#22c55e" } }} className="h-[180px]">
              <PieChart>
                <Pie
                  data={paymentMethodsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {paymentMethodsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Categorias Mais Vendidas */}
        <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-2 px-4 pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Categorias Mais Vendidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <ChartContainer config={{ revenue: { label: "Faturamento", color: "#3b82f6" } }} className="h-[180px]">
              <BarChart 
                data={categoriesData} 
                layout="vertical"
                margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis 
                  type="number"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(value)} />}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Dias da Semana */}
        <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-2 px-4 pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Calendar className="w-4 h-4 text-purple-500" />
              Performance por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <ChartContainer config={{ orders: { label: "Pedidos", color: "#8b5cf6" } }} className="h-[180px]">
              <BarChart data={weekdaysData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis 
                  dataKey="day" 
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Métodos de Pagamento */}
      {paymentMethodsData.length > 0 && (
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Detalhamento de Métodos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottomColor: 'var(--border-color)' }}>
                    <th className="text-left py-1.5 px-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Método</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Pedidos</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Faturamento</th>
                    <th className="text-right py-1.5 px-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethodsData.map((method, index) => {
                    const totalRevenue = paymentMethodsData.reduce((sum, m) => sum + m.revenue, 0);
                    const percentage = totalRevenue > 0 ? ((method.revenue / totalRevenue) * 100).toFixed(1) : 0;
                    return (
                      <tr key={method.name} style={{ borderBottomColor: 'var(--border-color)' }}>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{method.name}</span>
                          </div>
                        </td>
                        <td className="text-right py-1.5 px-2 text-xs" style={{ color: 'var(--text-primary)' }}>{method.count}</td>
                        <td className="text-right py-1.5 px-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(method.revenue)}</td>
                        <td className="text-right py-1.5 px-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{percentage}%</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
