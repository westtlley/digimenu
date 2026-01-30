import React from 'react';
import { 
  Bell, Clock, ChefHat, CheckCircle, Truck, XCircle,
  TrendingUp, Timer, Package, DollarSign
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  new: { label: 'Novo', color: 'bg-red-500', icon: Bell },
  accepted: { label: 'Aceito', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'Preparando', color: 'bg-yellow-500', icon: ChefHat },
  ready: { label: 'Pronto', color: 'bg-green-500', icon: CheckCircle },
  out_for_delivery: { label: 'Em Entrega', color: 'bg-blue-500', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-400', icon: XCircle },
};

export default function OrdersDashboard({ orders, orderCounts, onSelectOrder }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Calculate metrics
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.created_date);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todayOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const avgPrepTime = todayOrders
    .filter(o => o.accepted_at && o.ready_at)
    .reduce((sum, o, _, arr) => {
      const diff = differenceInMinutes(new Date(o.ready_at), new Date(o.accepted_at));
      return sum + diff / arr.length;
    }, 0);

  // New orders (most recent first)
  const newOrders = orders.filter(o => o.status === 'new').slice(0, 5);
  const preparingOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status)).slice(0, 5);
  const readyOrders = orders.filter(o => o.status === 'ready').slice(0, 5);

  const getTimeElapsed = (date) => {
    if (!date) return '-';
    const mins = differenceInMinutes(new Date(), new Date(date));
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const OrderCard = ({ order, highlight }) => {
    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
    const StatusIcon = status.icon;
    const elapsed = getTimeElapsed(order.created_date);
    const isLate = differenceInMinutes(new Date(), new Date(order.created_date)) > 30;

    return (
      <div 
        onClick={() => onSelectOrder(order)}
        className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
          highlight ? 'animate-pulse border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-orange-300'
        } ${isLate && order.status !== 'delivered' && order.status !== 'cancelled' ? 'ring-2 ring-red-500' : ''}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm sm:text-base">
                #{order.order_code || order.id?.slice(-6).toUpperCase()}
              </span>
              <Badge className={`${status.color} text-xs`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
            📅 {new Date(order.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} • 
            ⏰ {new Date(order.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
          <span className={`text-xs sm:text-sm font-medium ${isLate ? 'text-red-600' : 'text-gray-500'}`}>
            Há {elapsed}
          </span>
        </div>
        
        <h4 className="font-semibold text-sm sm:text-base mb-1">{order.customer_name}</h4>
        
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-500">
            {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'itens'}
          </span>
          <span className="font-bold text-green-600">{formatCurrency(order.total)}</span>
        </div>

        {order.delivery_method === 'delivery' && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <Truck className="w-3 h-3" /> Entrega
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Pedidos Hoje</p>
              <p className="text-xl sm:text-2xl font-bold">{todayOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Faturamento</p>
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(todayRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Timer className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Tempo Médio</p>
              <p className="text-xl sm:text-2xl font-bold">{Math.round(avgPrepTime) || '-'}min</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Aguardando</p>
              <p className="text-xl sm:text-2xl font-bold">{orderCounts.new}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Columns */}
      <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
        {/* New Orders */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <h3 className="font-bold text-sm sm:text-base">Novos Pedidos</h3>
            <Badge className="bg-red-500">{orderCounts.new}</Badge>
          </div>
          <div className="space-y-3">
            {newOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl text-sm">
                Nenhum pedido novo
              </div>
            ) : (
              newOrders.map(order => (
                <OrderCard key={order.id} order={order} highlight />
              ))
            )}
          </div>
        </div>

        {/* Preparing */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <h3 className="font-bold text-sm sm:text-base">Em Preparo</h3>
            <Badge className="bg-yellow-500">{orderCounts.preparing}</Badge>
          </div>
          <div className="space-y-3">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl text-sm">
                Nenhum em preparo
              </div>
            ) : (
              preparingOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* Ready */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h3 className="font-bold text-sm sm:text-base">Prontos</h3>
            <Badge className="bg-green-500">{orderCounts.ready}</Badge>
          </div>
          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl text-sm">
                Nenhum pronto
              </div>
            ) : (
              readyOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}