import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, DollarSign, Clock, TrendingUp, Zap, Truck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

/**
 * Painel de estatísticas profissional para Gestor de Pedidos
 * - Métricas reais (comparação com ontem)
 * - Ticket médio
 * - Gráfico de pedidos por hora
 * - Pizza por status (Em preparo / Prontos / Em rota / Entregues)
 */
export default function GestorStatsPanel({ 
  orders = [], 
  entregadores = [],
  darkMode = false 
}) {
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const { todayOrders, yesterdayOrders, totalRevenue, pendingOrders, inDelivery, avgPrepTime, activeEntregadores, ticketMedio, stats, chartByHour, pieData } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = orders.filter(o => {
      const d = new Date(o.created_date);
      return d >= today && d < tomorrow;
    });

    const yesterdayOrders = orders.filter(o => {
      const d = new Date(o.created_date);
      return d >= yesterday && d < today;
    });

    const deliveredToday = todayOrders.filter(o => o.status === 'delivered');
    const totalRevenue = deliveredToday.reduce((s, o) => s + (o.total || 0), 0);
    const ticketMedio = deliveredToday.length > 0 ? totalRevenue / deliveredToday.length : 0;

    const pendingOrders = orders.filter(o => ['new', 'accepted', 'preparing'].includes(o.status)).length;
    const inDelivery = orders.filter(o => ['out_for_delivery', 'going_to_store', 'picked_up'].includes(o.status)).length;

    const withPrep = todayOrders.filter(o => o.accepted_at && o.ready_at);
    const avgPrepTime = withPrep.length > 0
      ? withPrep.reduce((s, o) => s + (new Date(o.ready_at) - new Date(o.accepted_at)) / 60000, 0) / withPrep.length
      : 0;

    const activeEntregadores = entregadores.filter(e => e.status === 'available' || e.status === 'busy').length;

    // Variação real vs ontem
    const prevCount = yesterdayOrders.length;
    const currCount = todayOrders.length;
    const pctOrders = prevCount > 0 ? (((currCount - prevCount) / prevCount) * 100).toFixed(0) : null;

    const prevRev = yesterdayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
    const pctRevenue = prevRev > 0 ? (((totalRevenue - prevRev) / prevRev) * 100).toFixed(0) : null;

    const stats = [
      {
        label: 'Pedidos Hoje',
        value: currCount,
        icon: Package,
        color: 'blue',
        change: pctOrders != null ? `${Number(pctOrders) >= 0 ? '+' : ''}${pctOrders}%` : null,
        trend: pctOrders != null ? (Number(pctOrders) >= 0 ? 'up' : 'down') : 'neutral',
        subtitle: `${pendingOrders} pendentes`
      },
      {
        label: 'Receita Hoje',
        value: formatCurrency(totalRevenue),
        icon: DollarSign,
        color: 'green',
        change: pctRevenue != null ? `${Number(pctRevenue) >= 0 ? '+' : ''}${pctRevenue}%` : null,
        trend: pctRevenue != null ? (Number(pctRevenue) >= 0 ? 'up' : 'down') : 'neutral',
        subtitle: `${deliveredToday.length} entregues`
      },
      {
        label: 'Ticket Médio',
        value: formatCurrency(ticketMedio),
        icon: TrendingUp,
        color: 'purple',
        change: null,
        trend: 'neutral',
        subtitle: 'Por pedido entregue'
      },
      {
        label: 'Tempo Médio',
        value: `${Math.round(avgPrepTime)}min`,
        icon: Clock,
        color: 'slate',
        change: null,
        trend: 'neutral',
        subtitle: 'Tempo de preparo'
      },
      {
        label: 'Em Entrega',
        value: inDelivery,
        icon: Truck,
        color: 'orange',
        change: null,
        trend: 'neutral',
        subtitle: `${activeEntregadores} ativos`
      }
    ];

    // Gráfico por hora (0–23)
    const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hora: `${h}h`, quantidade: 0 }));
    todayOrders.forEach(o => {
      const h = new Date(o.created_date).getHours();
      hourBuckets[h].quantidade += 1;
    });
    const chartByHour = hourBuckets.map((x, i) => ({ ...x, name: `${i}:00` }));

    // Pizza: Em preparo | Prontos | Em rota | Entregues
    const prep = todayOrders.filter(o => ['new', 'accepted', 'preparing'].includes(o.status)).length;
    const ready = todayOrders.filter(o => ['ready', 'going_to_store', 'arrived_at_store', 'picked_up'].includes(o.status)).length;
    const route = todayOrders.filter(o => ['out_for_delivery', 'arrived_at_customer'].includes(o.status)).length;
    const done = todayOrders.filter(o => o.status === 'delivered').length;
    const pieData = [
      { name: 'Em preparo', value: prep, color: '#f97316' },
      { name: 'Prontos', value: ready, color: '#22c55e' },
      { name: 'Em rota', value: route, color: '#3b82f6' },
      { name: 'Entregues', value: done, color: '#64748b' }
    ].filter(d => d.value > 0);

    return { todayOrders, yesterdayOrders, totalRevenue, pendingOrders, inDelivery, avgPrepTime, activeEntregadores, ticketMedio, stats, chartByHour, pieData };
  }, [orders, entregadores]);

  const colorClasses = {
    blue: darkMode ? 'from-blue-900/50 to-blue-800/30 border-blue-700' : 'from-blue-50 to-blue-100 border-blue-200',
    green: darkMode ? 'from-green-900/50 to-green-800/30 border-green-700' : 'from-green-50 to-green-100 border-green-200',
    purple: darkMode ? 'from-purple-900/50 to-purple-800/30 border-purple-700' : 'from-purple-50 to-purple-100 border-purple-200',
    slate: darkMode ? 'from-slate-900/50 to-slate-800/30 border-slate-700' : 'from-slate-50 to-slate-100 border-slate-200',
    orange: darkMode ? 'from-orange-900/50 to-orange-800/30 border-orange-700' : 'from-orange-50 to-orange-100 border-orange-200',
  };

  const iconColors = { blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600', slate: 'text-slate-600', orange: 'text-orange-600' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Estatísticas em Tempo Real</h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Visão geral do desempenho de hoje</p>
        </div>
        <Badge className="bg-green-500 text-white">
          <Zap className="w-3 h-3 mr-1" /> Ao vivo
        </Badge>
      </div>

      {/* Cards: 5 colunas em lg */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={`bg-gradient-to-br ${colorClasses[stat.color]} border rounded-2xl p-4 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${iconColors[stat.color]}`} />
                {stat.trend !== 'neutral' && stat.change && (
                  <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{stat.change}</span>
                )}
              </div>
              <p className={`text-xl lg:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{stat.value}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{stat.label}</p>
              {stat.subtitle && <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{stat.subtitle}</p>}
            </motion.div>
          );
        })}
      </div>

      {/* Gráficos: Barra (por hora) + Pizza (por status) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
        >
          <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Status (hoje)</h3>
          <div className="h-[200px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} />
                  <Legend fontSize={11} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`flex items-center justify-center h-full ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhum pedido hoje</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6`}
      >
        <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Visão Geral de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Taxa de Conclusão</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {todayOrders.length > 0 ? ((todayOrders.filter(o => o.status === 'delivered').length / todayOrders.length) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <Progress value={(todayOrders.filter(o => o.status === 'delivered').length / Math.max(1, todayOrders.length)) * 100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Entregadores Ativos</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{activeEntregadores} / {entregadores.length}</span>
            </div>
            <Progress value={(activeEntregadores / Math.max(1, entregadores.length)) * 100} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pedidos Pendentes</span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pendingOrders}</span>
            </div>
            <Progress value={Math.min(100, (pendingOrders / Math.max(1, todayOrders.length)) * 100)} className="h-2" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
