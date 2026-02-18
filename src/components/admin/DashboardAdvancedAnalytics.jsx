import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import moment from 'moment';
import { Clock, CreditCard, TrendingUp, Users, AlertTriangle, Calendar, Target, ShoppingCart, Package, BarChart3 } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

  const deliveredCount = (orders || []).filter((o) => o.status === 'delivered').length;
  const showDemandForecast = deliveredCount >= 10;
  const paymentSingle = paymentMethodsData.length === 1;
  const paymentTotalRev = paymentMethodsData.reduce((s, m) => s + m.revenue, 0);
  const peakTop3 = useMemo(() => peakHoursData.filter((h) => h.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 3), [peakHoursData]);
  const weekdaysWithOrders = weekdaysData.filter((d) => d.orders > 0).length;
  const showWeekdaysChart = weekdaysWithOrders >= 3;
  const categoriesTotalRev = categoriesData.reduce((s, c) => s + c.revenue, 0);
  const showCategoriesChart = categoriesData.length >= 3 && categoriesTotalRev > 0;

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

      {/* Indicadores secundários: 1 card compacto */}
      <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <CardHeader className="py-1.5 px-3 pb-0">
          <CardTitle className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Indicadores</CardTitle>
        </CardHeader>
        <CardContent className="py-1.5 px-3 pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--text-secondary)' }}>Cancelamento</span>
              <span style={{ color: 'var(--text-primary)' }}>{orders.length ? `${cancellationRate}%` : '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--text-secondary)' }}>Tempo médio</span>
              <span style={{ color: 'var(--text-primary)' }}>{avgPrepTime != null ? `${avgPrepTime} min` : '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--text-secondary)' }}>Recorrentes</span>
              <span style={{ color: 'var(--text-primary)' }}>{recurringCustomers.total ? `${recurringCustomers.percentage}%` : '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--text-secondary)' }}>Abandono</span>
              <span style={{ color: 'var(--text-primary)' }}>{cartAbandonmentRate.total ? `${cartAbandonmentRate.rate}%` : '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--text-secondary)' }}>Taxa entrega</span>
              <span style={{ color: 'var(--text-primary)' }}>{deliveryRate.total ? `${deliveryRate.rate}%` : '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: 'var(--text-secondary)' }}>Método mais usado</span>
              <span className="truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }} title={paymentMethodsData[0]?.name}>{paymentMethodsData[0]?.name || '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métodos de Pagamento: 100% um método => texto; >=2 => top 3 lista */}
      {paymentMethodsData.length > 0 && (
        <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="py-2 px-3 pb-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <CreditCard className="w-4 h-4 text-green-500" />
              Métodos de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1 px-3 pb-3">
            {paymentSingle ? (
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>100% {paymentMethodsData[0].name}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {paymentMethodsData.slice(0, 3).map((m, i) => {
                  const pct = paymentTotalRev > 0 ? ((m.revenue / paymentTotalRev) * 100).toFixed(0) : 0;
                  return (
                    <li key={m.name} className="flex justify-between items-center">
                      <span style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{pct}% · {formatCurrency(m.revenue)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insights Avançados: colapsado por padrão */}
      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="insights" className="border rounded-lg px-3" style={{ borderColor: 'var(--border-color)' }}>
          <AccordionTrigger className="py-2 text-sm hover:no-underline">
            <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <BarChart3 className="w-4 h-4" />
              Insights Avançados
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-3 pt-0">
            <div className="space-y-4">
              {/* Previsão de Demanda: só com volume suficiente */}
              {showDemandForecast && (
                <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <CardHeader className="py-2 px-3 pb-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Previsão de Demanda (7 dias)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1 px-3 pb-3">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(demandForecast.avgDailyRevenue)}</span>
                      <Badge variant={demandForecast.trend === 'up' ? 'default' : 'secondary'} className="text-xs">{demandForecast.trend === 'up' ? 'Alta' : 'Baixa'}</Badge>
                    </div>
                    <ChartContainer config={{ predicted: { label: "Previsão", color: "#22c55e" } }} className="h-[100px]">
                      <LineChart data={demandForecast.forecast} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="date" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v)} />} />
                        <Line type="monotone" dataKey="predicted" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 2 }} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Horários de Pico: altura reduzida + top 3 texto */}
              <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <CardHeader className="py-2 px-3 pb-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Clock className="w-4 h-4 text-orange-500" />
                    Horários de Pico
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 px-3 pb-3">
                  {peakTop3.length > 0 && (
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Top 3: {peakTop3.map((h) => h.label).join(', ')}</p>
                  )}
                  <ChartContainer config={{ orders: { label: "Pedidos", color: "#f97316" } }} className="h-[100px]">
                    <BarChart data={peakHoursData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="label" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Categorias: gráfico só se >=3 e receita; senão Top 3 texto */}
              <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <CardHeader className="py-2 px-3 pb-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Categorias Mais Vendidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 px-3 pb-3">
                  {showCategoriesChart ? (
                    <ChartContainer config={{ revenue: { label: "Faturamento", color: "#3b82f6" } }} className="h-[120px]">
                      <BarChart data={categoriesData} layout="vertical" margin={{ top: 5, right: 5, left: 50, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis type="number" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} width={48} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(v)} />} />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {categoriesData.slice(0, 3).map((c) => (
                        <li key={c.name} className="flex justify-between">
                          <span style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(c.revenue)}</span>
                        </li>
                      ))}
                      {categoriesData.length === 0 && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sem dados</p>}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Performance por Dia da Semana */}
              <Card className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <CardHeader className="py-2 px-3 pb-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Calendar className="w-4 h-4 text-purple-500" />
                    Performance por Dia da Semana
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 px-3 pb-3">
                  {showWeekdaysChart ? (
                    <ChartContainer config={{ orders: { label: "Pedidos", color: "#8b5cf6" } }} className="h-[100px]">
                      <BarChart data={weekdaysData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="day" stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke={axisStroke} fontSize={10} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {weekdaysData.filter((d) => d.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 3).map((d) => (
                        <li key={d.day} className="flex justify-between">
                          <span style={{ color: 'var(--text-primary)' }}>{d.day}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{d.orders} pedidos</span>
                        </li>
                      ))}
                      {weekdaysData.every((d) => d.orders === 0) && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sem dados</p>}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Tabela Métodos (dentro do accordion) */}
              {paymentMethodsData.length > 1 && (
                <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <CardHeader className="py-2 px-3 pb-0">
                    <CardTitle className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Detalhamento Métodos de Pagamento</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1 px-3 pb-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottomColor: 'var(--border-color)' }}>
                            <th className="text-left py-1 px-2 font-semibold" style={{ color: 'var(--text-primary)' }}>Método</th>
                            <th className="text-right py-1 px-2 font-semibold" style={{ color: 'var(--text-primary)' }}>Pedidos</th>
                            <th className="text-right py-1 px-2 font-semibold" style={{ color: 'var(--text-primary)' }}>Faturamento</th>
                            <th className="text-right py-1 px-2 font-semibold" style={{ color: 'var(--text-primary)' }}>%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentMethodsData.map((method, index) => {
                            const percentage = paymentTotalRev > 0 ? ((method.revenue / paymentTotalRev) * 100).toFixed(1) : 0;
                            return (
                              <tr key={method.name} style={{ borderBottomColor: 'var(--border-color)' }}>
                                <td className="py-1 px-2 flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                  <span style={{ color: 'var(--text-primary)' }}>{method.name}</span>
                                </td>
                                <td className="text-right py-1 px-2" style={{ color: 'var(--text-primary)' }}>{method.count}</td>
                                <td className="text-right py-1 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(method.revenue)}</td>
                                <td className="text-right py-1 px-2"><Badge variant="outline" className="text-[10px] px-1 py-0">{percentage}%</Badge></td>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </div>
  );
}
