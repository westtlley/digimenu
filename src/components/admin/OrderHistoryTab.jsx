import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, User, DollarSign, Filter, Download } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBrazilianDateTime, formatInputDate } from '../utils/dateUtils';
import HistorySkeleton from '../skeletons/HistorySkeleton';

const statusConfig = {
  new: { label: 'Novo', color: 'bg-blue-500' },
  accepted: { label: 'Aceito', color: 'bg-green-500' },
  preparing: { label: 'Preparando', color: 'bg-yellow-500' },
  ready: { label: 'Pronto', color: 'bg-purple-500' },
  out_for_delivery: { label: 'Em Rota', color: 'bg-indigo-500' },
  delivered: { label: 'Entregue', color: 'bg-green-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' }
};

export default function OrderHistoryTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orderHistory'],
    queryFn: () => base44.entities.Order.list('-created_date')
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const filterByDate = (order) => {
    if (!order.created_date) return false;
    const orderDate = new Date(order.created_date);
    const today = new Date();
    
    switch (dateFilter) {
      case 'today':
        return orderDate.toDateString() === today.toDateString();
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return orderDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return orderDate >= monthAgo;
      case 'all':
        return true;
      default:
        return true;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone?.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || order.payment_method === filterPayment;
    const matchesDate = filterByDate(order);
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const totalRevenue = filteredOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const exportToCSV = () => {
    const headers = ['Data', 'Código', 'Cliente', 'Status', 'Pagamento', 'Total'];
    const rows = filteredOrders.map(o => [
      formatBrazilianDateTime(o.created_date),
      o.order_code || o.id?.slice(-6),
      o.customer_name,
      statusConfig[o.status]?.label || o.status,
      o.payment_method,
      o.total
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    a.download = `pedidos-${day}-${month}-${year}.csv`;
    a.click();
  };

  if (isLoading) {
    return <HistorySkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Histórico de Pedidos</h2>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cliente, código, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Período</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Pagamento</label>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">Total de Pedidos</p>
          <p className="text-3xl font-bold text-blue-700">{filteredOrders.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-600 mb-1">Faturamento</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <p className="text-sm text-purple-600 mb-1">Ticket Médio</p>
          <p className="text-3xl font-bold text-purple-700">
            {formatCurrency(filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0)}
          </p>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itens</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {order.created_date && formatBrazilianDateTime(order.created_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      #{order.order_code || order.id?.slice(-6)}
                    </td>
                    <td className="px-4 py-3 text-sm">{order.customer_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm space-y-2 max-w-xs">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="border-l-2 border-gray-300 pl-2">
                            <div className="font-medium text-gray-900 text-xs">
                              {item.quantity || 1}x {item.dish?.name}
                            </div>
                            {item.selections && Object.keys(item.selections).length > 0 && (
                              <div className="text-xs text-gray-600 ml-3 mt-1 space-y-0.5">
                                {Object.entries(item.selections).map(([gId, sel]) => {
                                  if (Array.isArray(sel)) {
                                    return sel.map((s, i) => <p key={i}>• {s.name}</p>);
                                  } else if (sel) {
                                    return <p key={gId}>• {sel.name}</p>;
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={statusConfig[order.status]?.color || 'bg-gray-500'}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{order.payment_method?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}