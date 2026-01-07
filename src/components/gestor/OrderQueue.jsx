import React from 'react';
import { 
  Bell, Clock, ChefHat, CheckCircle, Truck, XCircle,
  Search, Filter, Package
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { differenceInMinutes } from 'date-fns';

const STATUS_CONFIG = {
  new: { label: 'Novo', color: 'bg-red-500', icon: Bell },
  accepted: { label: 'Aceito', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'Preparando', color: 'bg-yellow-500', icon: ChefHat },
  ready: { label: 'Pronto', color: 'bg-green-500', icon: CheckCircle },
  out_for_delivery: { label: 'Em Entrega', color: 'bg-blue-500', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-400', icon: XCircle },
};

export default function OrderQueue({ 
  orders, 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter,
  onSelectOrder 
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getTimeElapsed = (date) => {
    if (!date) return '-';
    const mins = differenceInMinutes(new Date(), new Date(date));
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por código ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Novos</SelectItem>
            <SelectItem value="preparing">Em Preparo</SelectItem>
            <SelectItem value="ready">Prontos</SelectItem>
            <SelectItem value="out_for_delivery">Em Entrega</SelectItem>
            <SelectItem value="delivered">Entregues</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nenhum pedido encontrado</p>
          </div>
        ) : (
          orders.map(order => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
            const StatusIcon = status.icon;
            const elapsed = getTimeElapsed(order.created_date);
            const isLate = differenceInMinutes(new Date(), new Date(order.created_date)) > 30;
            const isNew = order.status === 'new';

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className={`bg-white rounded-xl p-3 sm:p-4 shadow-sm border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isNew ? 'border-red-400 animate-pulse' : 'border-transparent hover:border-orange-300'
                } ${isLate && !['delivered', 'cancelled'].includes(order.status) ? 'ring-2 ring-red-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">
                      #{order.order_code || order.id?.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <Badge className={`${status.color} text-xs`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>

                <h4 className="font-semibold mb-1 text-sm sm:text-base">{order.customer_name}</h4>
                <p className="text-xs text-gray-500 mb-2">{order.customer_phone}</p>

                <div className="flex flex-wrap gap-1 mb-2">
                  {(order.items || []).slice(0, 2).map((item, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {item.dish?.name || 'Item'}
                    </span>
                  ))}
                  {(order.items || []).length > 2 && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      +{(order.items || []).length - 2}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {order.delivery_method === 'delivery' && (
                      <Badge variant="outline" className="text-xs">
                        <Truck className="w-3 h-3 mr-1" /> Entrega
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${isLate ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                      {elapsed}
                    </p>
                    <p className="font-bold text-green-600 text-sm">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}