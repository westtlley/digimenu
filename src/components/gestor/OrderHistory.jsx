import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Filter, Calendar, Package, CheckCircle, XCircle,
  Download, Eye
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  delivered: { label: 'Entregue', color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
};

export default function OrderHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('7');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ['orderHistory'],
    queryFn: () => base44.entities.Order.filter(
      { status: { $in: ['delivered', 'cancelled'] } },
      '-created_date',
      500
    ),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['orderLogs', selectedOrder?.id],
    queryFn: () => base44.entities.OrderLog.filter({ order_id: selectedOrder?.id }, 'created_date'),
    enabled: !!selectedOrder,
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Search
    const matchesSearch = !searchTerm || 
      order.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    // Date
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const orderDate = new Date(order.created_date);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());
      matchesDate = isWithinInterval(orderDate, { start: startDate, end: endDate });
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats
  const totalRevenue = filteredOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  
  const totalOrders = filteredOrders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm text-center">
          <p className="text-lg sm:text-2xl font-bold text-green-600">{totalOrders}</p>
          <p className="text-xs sm:text-sm text-gray-500">Entregues</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm text-center">
          <p className="text-lg sm:text-2xl font-bold text-red-600">{cancelledOrders}</p>
          <p className="text-xs sm:text-sm text-gray-500">Cancelados</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm text-center">
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs sm:text-sm text-gray-500">Faturamento</p>
        </div>
      </div>

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
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="delivered">Entregues</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Pedido</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Cliente</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Data</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum pedido encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const status = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-400' };
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-sm">
                          #{order.order_code || order.id?.slice(-6).toUpperCase()}
                        </span>
                        <p className="text-xs text-gray-500 sm:hidden">{order.customer_name}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="font-medium text-sm">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">{order.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                        {order.created_date && format(new Date(order.created_date), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-sm">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={status.color + " text-xs"}>
                          {order.status === 'delivered' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrder?.order_code || selectedOrder?.id?.slice(-6).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Cliente:</span>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Telefone:</span>
                  <p className="font-medium">{selectedOrder.customer_phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">Data:</span>
                  <p className="font-medium">
                    {selectedOrder.created_date && format(new Date(selectedOrder.created_date), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>
                  <p className="font-medium text-green-600">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Itens</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity || 1}x {item.dish?.name || 'Item'}</span>
                      <span>{formatCurrency(item.totalPrice * (item.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.rejection_reason && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800">Motivo do cancelamento:</p>
                  <p className="text-sm text-red-700">{selectedOrder.rejection_reason}</p>
                </div>
              )}

              {logs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Histórico de Ações</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="text-xs border-b pb-2 last:border-0">
                        <p className="font-medium">{log.action}</p>
                        <p className="text-gray-500">
                          {log.user_email} · {log.created_date && format(new Date(log.created_date), "dd/MM HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}