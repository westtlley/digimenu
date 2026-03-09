import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
  Truck,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export default function GestorStatsPanel({ orders = [], entregadores = [], darkMode = false }) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeEntregadores = Array.isArray(entregadores) ? entregadores : [];

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const {
    todayOrders,
    totalRevenue,
    pendingOrders,
    inDelivery,
    avgPrepTime,
    activeEntregadores,
    availableCouriers,
    stats,
    chartByHour,
    revenueByHour,
    pieData,
    comparisonSummary,
    monthlySummary,
    operationSignal,
    delayedOrders,
    kitchenQueue,
    deliveryForecastMins,
    delayForecastMins,
    bottleneckHint,
  } = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const getDate = (o) => new Date(o.created_date || o.created_at || 0);

    const todayOrders = safeOrders.filter((o) => {
      const d = getDate(o);
      return d >= today && d < tomorrow;
    });

    const yesterdayOrders = safeOrders.filter((o) => {
      const d = getDate(o);
      return d >= yesterday && d < today;
    });

    const deliveredToday = todayOrders.filter((o) => o.status === 'delivered');
    const totalRevenue = deliveredToday.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const yesterdayRevenue = yesterdayOrders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const ticketMedio = deliveredToday.length > 0 ? totalRevenue / deliveredToday.length : 0;
    const pendingOrders = safeOrders.filter((o) => ['new', 'accepted', 'preparing'].includes(o.status)).length;
    const inDelivery = safeOrders.filter((o) => ['out_for_delivery', 'arrived_at_customer', 'going_to_store', 'picked_up'].includes(o.status)).length;
    const kitchenQueue = safeOrders.filter((o) => ['new', 'accepted', 'preparing'].includes(o.status)).length;
    const activeEntregadores = safeEntregadores.filter((e) => ['available', 'busy'].includes(e.status)).length;
    const availableCouriers = safeEntregadores.filter((e) => e.status === 'available').length;

    const withPrepTime = todayOrders.filter((o) => o.accepted_at && o.ready_at);
    const avgPrepTime =
      withPrepTime.length > 0
        ? withPrepTime.reduce(
            (sum, o) => sum + (new Date(o.ready_at).getTime() - new Date(o.accepted_at).getTime()) / 60000,
            0
          ) / withPrepTime.length
        : 0;

    const delayedOrders = safeOrders.filter((o) => {
      if (!['new', 'accepted', 'preparing'].includes(o.status)) return false;
      if (o.accepted_at) {
        const prepLimit = Number(o.prep_time || 30);
        return differenceInMinutes(now, new Date(o.accepted_at)) > prepLimit;
      }
      const createdAt = o.created_at || o.created_date;
      return createdAt ? differenceInMinutes(now, new Date(createdAt)) > 25 : false;
    }).length;

    const delayForecastMins = Math.max(0, Math.round(avgPrepTime - 28)) + Math.round(delayedOrders * 1.5);
    const deliveryLoad = inDelivery / Math.max(1, availableCouriers || activeEntregadores || 1);
    const deliveryForecastMins = Math.max(18, Math.round(22 + deliveryLoad * 6));

    const ordersDelta = todayOrders.length - yesterdayOrders.length;
    const revenueDelta = totalRevenue - yesterdayRevenue;

    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthDelivered = safeOrders.filter((o) => {
      if (o.status !== 'delivered') return false;
      const d = new Date(o.delivered_at || o.created_at || o.created_date || 0);
      return d >= firstDayThisMonth;
    }).length;
    const lastMonthDelivered = safeOrders.filter((o) => {
      if (o.status !== 'delivered') return false;
      const d = new Date(o.delivered_at || o.created_at || o.created_date || 0);
      return d >= firstDayLastMonth && d < firstDayThisMonth;
    }).length;
    const monthDeltaPct =
      lastMonthDelivered > 0
        ? (((thisMonthDelivered - lastMonthDelivered) / lastMonthDelivered) * 100).toFixed(1)
        : null;

    let operationSignal = {
      level: 'green',
      label: 'Operacao estavel',
      colorClass: 'bg-emerald-500',
      textClass: 'text-emerald-700',
      description: 'Fluxo dentro do esperado para o momento.',
    };

    if (delayedOrders >= 5 || avgPrepTime > 45 || kitchenQueue > 15 || (inDelivery >= 5 && availableCouriers === 0)) {
      operationSignal = {
        level: 'red',
        label: 'Gargalo operacional',
        colorClass: 'bg-red-500',
        textClass: 'text-red-700',
        description: 'Existem sinais de atraso relevante na operação.',
      };
    } else if (delayedOrders > 0 || avgPrepTime > 35 || kitchenQueue > 8 || (inDelivery > 0 && availableCouriers === 0)) {
      operationSignal = {
        level: 'yellow',
        label: 'Atenção',
        colorClass: 'bg-amber-500',
        textClass: 'text-amber-700',
        description: 'Operação funcional, mas exige monitoramento.',
      };
    }

    const bottleneckHint =
      kitchenQueue > inDelivery
        ? 'Fila concentrada na cozinha'
        : inDelivery > kitchenQueue
        ? 'Volume maior em rota de entrega'
        : 'Fluxo equilibrado entre cozinha e entrega';

    const stats = [
      {
        label: 'Pedidos hoje',
        value: todayOrders.length,
        icon: Package,
        color: 'blue',
        subtitle: `${pendingOrders} pendentes`,
        change: ordersDelta,
      },
      {
        label: 'Receita hoje',
        value: formatCurrency(totalRevenue),
        icon: DollarSign,
        color: 'green',
        subtitle: `${deliveredToday.length} entregues`,
        change: revenueDelta,
      },
      {
        label: 'Ticket médio',
        value: formatCurrency(ticketMedio),
        icon: TrendingUp,
        color: 'purple',
        subtitle: 'Por pedido entregue',
      },
      {
        label: 'Tempo médio',
        value: `${Math.round(avgPrepTime || 0)} min`,
        icon: Clock,
        color: 'slate',
        subtitle: 'Tempo de preparo',
      },
      {
        label: 'Em entrega',
        value: inDelivery,
        icon: Truck,
        color: 'orange',
        subtitle: `${activeEntregadores} ativos`,
      },
    ];

    const hourBuckets = Array.from({ length: 24 }, (_, h) => ({
      name: `${h}:00`,
      pedidos: 0,
      receita: 0,
    }));

    todayOrders.forEach((o) => {
      const hour = new Date(o.created_date || o.created_at || 0).getHours();
      if (Number.isFinite(hour) && hourBuckets[hour]) {
        hourBuckets[hour].pedidos += 1;
      }
      if (o.status === 'delivered' && Number.isFinite(hour) && hourBuckets[hour]) {
        hourBuckets[hour].receita += Number(o.total || 0);
      }
    });

    const chartByHour = hourBuckets.map((x) => ({ hora: x.name, quantidade: x.pedidos }));
    const revenueByHour = hourBuckets.map((x) => ({ name: x.name, receita: x.receita }));

    const prep = todayOrders.filter((o) => ['new', 'accepted', 'preparing'].includes(o.status)).length;
    const ready = todayOrders.filter((o) => ['ready', 'going_to_store', 'arrived_at_store', 'picked_up'].includes(o.status)).length;
    const route = todayOrders.filter((o) => ['out_for_delivery', 'arrived_at_customer'].includes(o.status)).length;
    const done = todayOrders.filter((o) => o.status === 'delivered').length;
    const pieData = [
      { name: 'Em preparo', value: prep, color: '#f97316' },
      { name: 'Prontos', value: ready, color: '#22c55e' },
      { name: 'Em rota', value: route, color: '#3b82f6' },
      { name: 'Entregues', value: done, color: '#64748b' },
    ].filter((x) => x.value > 0);

    return {
      todayOrders,
      totalRevenue,
      pendingOrders,
      inDelivery,
      avgPrepTime,
      activeEntregadores,
      availableCouriers,
      stats,
      chartByHour,
      revenueByHour,
      pieData,
      comparisonSummary: { ordersDelta, revenueDelta },
      monthlySummary: {
        thisMonthDelivered,
        lastMonthDelivered,
        monthDeltaPct,
      },
      operationSignal,
      delayedOrders,
      kitchenQueue,
      deliveryForecastMins,
      delayForecastMins,
      bottleneckHint,
    };
  }, [safeOrders, safeEntregadores]);

  const cardGradient = {
    blue: darkMode ? 'from-blue-900/50 to-blue-800/30 border-blue-700' : 'from-blue-50 to-blue-100 border-blue-200',
    green: darkMode ? 'from-green-900/50 to-green-800/30 border-green-700' : 'from-green-50 to-green-100 border-green-200',
    purple: darkMode ? 'from-purple-900/50 to-purple-800/30 border-purple-700' : 'from-purple-50 to-purple-100 border-purple-200',
    slate: darkMode ? 'from-slate-900/50 to-slate-800/30 border-slate-700' : 'from-slate-50 to-slate-100 border-slate-200',
    orange: darkMode ? 'from-orange-900/50 to-orange-800/30 border-orange-700' : 'from-orange-50 to-orange-100 border-orange-200',
  };

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    slate: 'text-slate-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dashboard operacional</h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Visao consolidada do restaurante em tempo real.</p>
        </div>
        <Badge className="bg-green-500 text-white">
          <Zap className="w-3 h-3 mr-1" /> Ao vivo
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const isUp = typeof stat.change === 'number' && stat.change >= 0;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-gradient-to-br ${cardGradient[stat.color]} border rounded-2xl p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${iconColors[stat.color]}`} />
                {typeof stat.change === 'number' && (
                  <span className={`text-xs font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                    {isUp ? '+' : ''}{Number.isFinite(stat.change) ? stat.change : 0}
                  </span>
                )}
              </div>
              <p className={`text-xl lg:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{stat.value}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{stat.label}</p>
              <p className="text-[10px] text-muted-foreground">{stat.subtitle}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`text-xs uppercase tracking-wide font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farol da operação</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex h-3 w-3 rounded-full ${operationSignal.colorClass}`} />
              <p className={`font-bold ${darkMode ? 'text-white' : operationSignal.textClass}`}>{operationSignal.label}</p>
            </div>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{operationSignal.description}</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Activity className="w-3.5 h-3.5" />
            {bottleneckHint}
          </Badge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-xs text-muted-foreground">Pedidos atrasados</p>
            <p className="text-lg font-bold text-red-600">{delayedOrders}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-xs text-muted-foreground">Fila cozinha</p>
            <p className="text-lg font-bold text-orange-600">{kitchenQueue}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-xs text-muted-foreground">Previsão de atraso</p>
            <p className="text-lg font-bold text-amber-600">{delayForecastMins} min</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-xs text-muted-foreground">Previsão de entrega</p>
            <p className="text-lg font-bold text-blue-600">{deliveryForecastMins} min</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
        >
          <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pedidos por hora (hoje)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByHour} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis tick={{ fontSize: 10 }} stroke={darkMode ? '#9ca3af' : '#6b7280'} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [v, 'Pedidos']} />
                <Bar dataKey="quantidade" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
        >
          <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Receita por hora (hoje)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByHour} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis tick={{ fontSize: 10 }} stroke={darkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [formatCurrency(v), 'Receita']} />
                <Area type="monotone" dataKey="receita" stroke="#16a34a" fill="#22c55e33" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
        >
          <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Distribuição de status (hoje)</h3>
          <div className="h-[200px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, idx) => (
                      <Cell key={`${entry.name}-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} />
                  <Legend fontSize={11} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`flex items-center justify-center h-full ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Sem pedidos hoje</div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
        >
          <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Comparativo com período anterior</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pedidos (hoje x ontem)</span>
              <span className={`text-sm font-semibold ${comparisonSummary.ordersDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparisonSummary.ordersDelta >= 0 ? '+' : ''}{comparisonSummary.ordersDelta}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Receita (hoje x ontem)</span>
              <span className={`text-sm font-semibold ${comparisonSummary.revenueDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparisonSummary.revenueDelta >= 0 ? '+' : ''}{formatCurrency(comparisonSummary.revenueDelta)}
              </span>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
              <p className="text-xs text-muted-foreground">Concluídos no mês</p>
              <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{monthlySummary.thisMonthDelivered}</p>
              <p className="text-xs text-muted-foreground">Mês anterior: {monthlySummary.lastMonthDelivered}</p>
              {monthlySummary.monthDeltaPct != null && (
                <p className={`text-xs font-semibold mt-1 ${Number(monthlySummary.monthDeltaPct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(monthlySummary.monthDeltaPct) >= 0 ? '+' : ''}{monthlySummary.monthDeltaPct}% vs mês passado
                </p>
              )}
            </div>
            <div className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
              <p className="text-xs text-muted-foreground">Entregadores disponíveis</p>
              <p className="text-sm font-semibold text-blue-600">{availableCouriers}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6`}
      >
        <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Radar operacional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Taxa de conclusão</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {todayOrders.length > 0 ? ((todayOrders.filter((o) => o.status === 'delivered').length / todayOrders.length) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <Progress value={(todayOrders.filter((o) => o.status === 'delivered').length / Math.max(1, todayOrders.length)) * 100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Entregadores ativos</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{activeEntregadores} / {safeEntregadores.length}</span>
            </div>
            <Progress value={(activeEntregadores / Math.max(1, safeEntregadores.length)) * 100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pedidos pendentes</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pendingOrders}</span>
            </div>
            <Progress value={Math.min(100, (pendingOrders / Math.max(1, todayOrders.length)) * 100)} className="h-2" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
