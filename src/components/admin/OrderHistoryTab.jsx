import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Calendar, User, DollarSign, Filter, Download, Eye, X, Package, Phone, MapPin, CreditCard } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { formatBrazilianDateTime, formatInputDate } from '../utils/dateUtils';
import HistorySkeleton from '../skeletons/HistorySkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { usePermission } from '@/components/permissions/usePermission';
import { useOrders } from '@/hooks/useOrders';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';
import {
  buildCustomOperationalRange,
  buildOperationalRange,
  formatOperationalDateLabel,
  getEntityOperationalDate,
  normalizeOperationalDayCutoffTime,
} from '@/utils/operationalShift';

const statusConfig = {
  new: { label: 'Novo', color: 'bg-blue-500' },
  accepted: { label: 'Aceito', color: 'bg-green-500' },
  preparing: { label: 'Preparando', color: 'bg-yellow-500' },
  ready: { label: 'Pronto', color: 'bg-purple-500' },
  out_for_delivery: { label: 'Em Rota', color: 'bg-indigo-500' },
  delivered: { label: 'Entregue', color: 'bg-green-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' }
};

const isOrderPDV = (o) => !!(o?.order_code?.startsWith('PDV-') || o?.delivery_method === 'balcao');

export default function OrderHistoryTab() {
  const { subscriberData, isMaster, menuContext } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterType, setFilterType] = useState('all'); // all | delivery | pdv
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const menuContextQueryKey = getMenuContextQueryKeyParts(menuContext);
  const scopedEntityOpts = getMenuContextEntityOpts(menuContext);
  
  // Verificar se tem acesso a funcionalidades avançadas (apenas Pro e Ultra)
  const hasAdvancedAccess = isMaster || 
    (subscriberData?.plan && ['pro', 'ultra'].includes(subscriberData.plan.toLowerCase()));

  // ✅ CORREÇÃO: Usar hook useOrders com contexto automático
  const { data: orders = [], isLoading } = useOrders({
    orderBy: '-created_date'
  });
  const { data: stores = [] } = useQuery({
    queryKey: ['orderHistoryStore', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Store.list(null, scopedEntityOpts);
    },
    enabled: !!menuContext,
  });
  const store = stores[0] || null;
  const operationalCutoffTime = normalizeOperationalDayCutoffTime(store?.operational_day_cutoff_time);

  // Pull to refresh
  const { isRefreshing } = usePullToRefresh(() => {
    return queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getDisplayDate = (order) => order?.created_at || order?.created_date || null;
  const getOperationalDate = (order) => getEntityOperationalDate(order, operationalCutoffTime);
  const formatOrderDateTime = (order) => {
    const date = getDisplayDate(order);
    return date ? formatBrazilianDateTime(date) : '-';
  };
  const formatOrderOperationalDate = (order) => formatOperationalDateLabel(getOperationalDate(order));

  const filterByDate = (order) => {
    if (dateFilter === 'custom') {
      const { startKey, endKey } = buildCustomOperationalRange(
        customDateStart,
        customDateEnd,
        operationalCutoffTime
      );
      if (!startKey || !endKey) return false;
      const operationalDate = getOperationalDate(order);
      return !!operationalDate && operationalDate >= startKey && operationalDate <= endKey;
    }

    const { startKey, endKey } = buildOperationalRange(dateFilter, operationalCutoffTime);
    if (!startKey || !endKey) return true;

    const operationalDate = getOperationalDate(order);
    return !!operationalDate && operationalDate >= startKey && operationalDate <= endKey;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone?.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || order.payment_method === filterPayment;
    const matchesDate = filterByDate(order);
    const pdv = isOrderPDV(order);
    const matchesType = filterType === 'all' || (filterType === 'pdv' && pdv) || (filterType === 'delivery' && !pdv);
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate && matchesType;
  });

  const totalRevenue = filteredOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const exportToCSV = () => {
    const headers = ['Dia Operacional', 'Data/Hora', 'Código', 'Cliente', 'Status', 'Pagamento', 'Total'];
    const rows = filteredOrders.map(o => [
      formatOrderOperationalDate(o),
      formatOrderDateTime(o),
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 relative">
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Atualizando...</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold">Histórico de Pedidos</h2>
        {hasAdvancedAccess && (
          <Button onClick={exportToCSV} variant="outline" size="sm" className="min-h-touch" title="Exportar CSV (apenas Pro e Ultra)">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        )}
      </div>

      {/* Filtros - Mobile: Sheet, Desktop: Inline */}
      {isMobile ? (
        <div className="flex items-center justify-between bg-card border border-border p-3 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {filteredOrders.length} pedido(s)
            </span>
          </div>
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-touch">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4 pb-safe">
                <div>
                  <label className="text-sm font-medium mb-2 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cliente, código, telefone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 min-h-touch"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Período</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="min-h-touch">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Últimos 7 dias</SelectItem>
                      <SelectItem value="month">Último mês</SelectItem>
                      <SelectItem value="custom">Período Customizado</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dateFilter === 'custom' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                      <Input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => setCustomDateStart(e.target.value)}
                        className="min-h-touch"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Data Final</label>
                      <Input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => setCustomDateEnd(e.target.value)}
                        className="min-h-touch"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="min-h-touch">
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
                    <SelectTrigger className="min-h-touch">
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
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="min-h-touch">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="pdv">PDV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => setShowFilters(false)} 
                  className="w-full min-h-touch"
                >
                  Aplicar Filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="bg-card text-card-foreground rounded-xl p-4 shadow-sm border border-border">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                <SelectItem value="custom">Período Customizado</SelectItem>
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

          <div>
            <label className="text-sm font-medium mb-2 block">Tipo</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pdv">PDV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

          {/* Filtro de Data Customizada */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                <Input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Final</label>
                <Input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

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
      <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-muted-foreground">Nenhum pedido encontrado</p>
          </div>
        ) : isMobile ? (
          /* Mobile: Cards */
          <div className="p-3 sm:p-4 space-y-3">
            {filteredOrders.map((order) => (
              <Card 
                key={order.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedOrder(order);
                  setShowDetailModal(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded">
                          #{order.order_code || order.id?.slice(-6)}
                        </span>
                        <Badge variant="outline" className={`text-xs ${isOrderPDV(order) ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}`}>
                          {isOrderPDV(order) ? 'PDV' : 'Delivery'}
                        </Badge>
                        <Badge className={`text-xs ${statusConfig[order.status]?.color || 'bg-gray-500'}`}>
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-sm mb-1 truncate">{order.customer_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatOrderDateTime(order)} · op. {formatOrderOperationalDate(order)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 min-h-touch min-w-touch"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-xs mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span className="truncate">{order.customer_phone || '-'}</span>
                    </div>
                    {order.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{order.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="w-3 h-3" />
                      <span className="capitalize">{order.payment_method?.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      {(order.items || []).length} item(ns)
                    </div>
                    <div className="font-bold text-green-600 text-sm">
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Desktop: Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Itens</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Pagamento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => {
                    setSelectedOrder(order);
                    setShowDetailModal(true);
                  }}>
                    <td className="px-4 py-3 text-sm">
                      <div>{formatOrderDateTime(order)}</div>
                      <div className="text-xs text-muted-foreground">op. {formatOrderOperationalDate(order)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      #{order.order_code || order.id?.slice(-6)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={isOrderPDV(order) ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}>
                        {isOrderPDV(order) ? 'PDV' : 'Delivery'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.customer_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm space-y-2 max-w-xs">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="border-l-2 border-border pl-2">
                            <div className="font-medium text-foreground text-xs">
                              {item.quantity || 1}x {item.dish?.name}
                            </div>
                            {item.selections && Object.keys(item.selections).length > 0 && (
                              <div className="text-xs text-muted-foreground ml-3 mt-1 space-y-0.5">
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
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">Detalhes do Pedido #{selectedOrder?.order_code || selectedOrder?.id?.slice(-6)}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
              {/* Informações do Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Cliente</p>
                  <p className="font-semibold text-sm sm:text-base truncate">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Telefone</p>
                  <p className="font-semibold text-sm sm:text-base">{selectedOrder.customer_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Data</p>
                  <p className="font-semibold text-xs sm:text-sm">{formatOrderDateTime(selectedOrder)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Dia operacional: {formatOrderOperationalDate(selectedOrder)}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className={`text-xs ${statusConfig[selectedOrder.status]?.color || 'bg-gray-500'}`}>
                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pagamento</p>
                  <p className="font-semibold text-sm sm:text-base capitalize">{selectedOrder.payment_method?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tipo</p>
                  <Badge variant="outline" className={`text-xs ${isOrderPDV(selectedOrder) ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}`}>
                    {isOrderPDV(selectedOrder) ? 'PDV' : 'Delivery'}
                  </Badge>
                </div>
              </div>

              {/* Itens */}
              <div>
                <p className="text-xs sm:text-sm font-semibold mb-2">Itens do Pedido</p>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-2 sm:p-3">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">{item.quantity || 1}x {item.dish?.name || item.dish_name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{formatCurrency(item.unit_price || item.total_price)} un.</p>
                        </div>
                        <p className="font-bold text-green-600 text-sm sm:text-base flex-shrink-0">
                          {formatCurrency((item.total_price || item.unit_price || 0) * (item.quantity || 1))}
                        </p>
                      </div>
                      {item.selections && Object.keys(item.selections).length > 0 && (
                        <div className="text-xs text-muted-foreground ml-3 mt-2 space-y-0.5">
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
                      {item.observations && (
                        <p className="text-xs text-muted-foreground italic mt-2">📝 {item.observations}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="border-t pt-3 sm:pt-4 space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
                </div>
                {selectedOrder.delivery_fee > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Taxa de Entrega</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.delivery_fee)}</span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-red-600 text-xs sm:text-sm">
                    <span>Desconto</span>
                    <span className="font-semibold">-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Endereço (se delivery) */}
              {selectedOrder.delivery_method === 'delivery' && selectedOrder.address && (
                <div>
                  <p className="text-xs sm:text-sm font-semibold mb-2">Endereço de Entrega</p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedOrder.address}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDetailModal(false)} className="w-full sm:w-auto min-h-touch">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
