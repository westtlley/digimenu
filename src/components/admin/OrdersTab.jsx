import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, MapPin, CreditCard, Trash2, Printer, Calendar, Filter, ShoppingCart } from 'lucide-react';
import jsPDF from 'jspdf';
import { getFullAddress } from '@/utils/gestorExport';
import EmptyState from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OrdersSkeleton from '../skeletons/OrdersSkeleton';

const STATUS_CONFIG = {
  new: { label: 'Novo', color: 'bg-red-100 text-red-800' },
  accepted: { label: 'Aceito', color: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: 'Preparando', color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Pronto', color: 'bg-green-100 text-green-800' },
  out_for_delivery: { label: 'Em Entrega', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Entregue', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-300 text-gray-600' },
};

const PAYMENT_LABELS = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

const isOrderPDV = (o) => !!(o?.order_code?.startsWith('PDV-') || o?.delivery_method === 'balcao');

export default function OrdersTab({ isMaster, user, subscriberData }) {
  const [dateFilter, setDateFilter] = useState('');
  const [filterType, setFilterType] = useState('all');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Order.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const printOrder = (order) => {
    const pdf = new jsPDF({ unit: 'mm', format: [80, 297] });
    const margin = 5;
    const maxW = 70;
    const lineH = 4.5;
    const addText = (text, bold = false) => {
      if (!text) return;
      pdf.setFont('courier', bold ? 'bold' : 'normal');
      const lines = pdf.splitTextToSize(String(text), maxW);
      lines.forEach(line => { pdf.text(line, margin, y); y += lineH; });
    };
    let y = 10;
    pdf.setFontSize(12);
    pdf.setFont('courier', 'bold');
    pdf.text('COMANDA', 40, y, { align: 'center' });
    y += 8;
    pdf.setFontSize(9);
    pdf.setFont('courier', 'normal');
    addText(`Pedido: #${order.order_code || order.id?.slice(-6).toUpperCase()}`);
    const orderDate = order.created_at || order.created_date;
    addText(`Data: ${orderDate ? format(new Date(orderDate), "dd/MM/yyyy HH:mm") : '—'}`);
    y += 2;
    addText(`Cliente: ${order.customer_name || ''}`);
    addText(`Tel: ${order.customer_phone || ''}`);
    const fullAddr = getFullAddress(order);
    if (order.delivery_method === 'delivery' && fullAddr) {
      addText(`Entrega: ${fullAddr}`);
    } else if (order.delivery_method !== 'delivery') {
      addText('Retirada no local');
    }
    addText(`Pagamento: ${PAYMENT_LABELS[order.payment_method] || order.payment_method}`);
    if (order.payment_method === 'dinheiro' && order.needs_change && order.change_amount) {
      addText(`Troco para: ${formatCurrency(order.change_amount)}`);
    }
    if (order.scheduled_date && order.scheduled_time) {
      addText(`AGENDADO: ${order.scheduled_date} às ${order.scheduled_time}`);
    }
    y += 2;
    pdf.text('--------------------------------', margin, y);
    y += lineH;
    (order.items || []).forEach((item, idx) => {
      const isPizza = item.dish?.product_type === 'pizza';
      const size = item.size || item.selections?.size;
      const flavors = item.flavors || item.selections?.flavors;
      const edge = item.edge || item.selections?.edge;
      const extras = item.extras || item.selections?.extras;
      addText(`${idx + 1}. ${item.dish?.name || 'Item'} x${item.quantity || 1} - ${formatCurrency((item.totalPrice || 0) * (item.quantity || 1))}`);
      if (isPizza && size) {
        addText(`   ${size.name} (${size.slices || ''} fatias)`);
        if (flavors?.length) {
          const f = flavors.reduce((a, x) => { a[x.name] = (a[x.name]||0)+1; return a; }, {});
          Object.entries(f).forEach(([n, c]) => addText(`   • ${c}/${size.slices || ''} ${n}`));
        }
        if (edge) addText(`   Borda: ${edge.name}`);
        if (extras?.length) extras.forEach(e => addText(`   + ${e.name}`));
      } else if (item.selections && Object.keys(item.selections).length > 0) {
        Object.values(item.selections).forEach(sel => {
          if (Array.isArray(sel)) sel.forEach(opt => opt?.name && addText(`   • ${opt.name}`));
          else if (sel?.name) addText(`   • ${sel.name}`);
        });
      }
      if (item.specifications) addText(`   Obs: ${item.specifications}`);
      if (item.observations) addText(`   Obs: ${item.observations}`);
    });
    pdf.text('--------------------------------', margin, y);
    y += lineH;
    addText(`Subtotal: ${formatCurrency(order.subtotal)}`);
    if (order.delivery_fee > 0) addText(`Taxa: ${formatCurrency(order.delivery_fee)}`);
    if (order.discount > 0) addText(`Desconto: -${formatCurrency(order.discount)}`);
    pdf.setFont('courier', 'bold');
    addText(`TOTAL: ${formatCurrency(order.total)}`, true);
    pdf.save(`comanda-${order.order_code || order.id?.slice(-6)}.pdf`);
  };

  const filteredOrders = orders.filter(order => {
    const orderDate = order.created_at || order.created_date;
    const matchDate = !dateFilter || (orderDate && format(new Date(orderDate), 'yyyy-MM-dd') === dateFilter);
    const pdv = isOrderPDV(order);
    const matchType = filterType === 'all' || (filterType === 'pdv' && pdv) || (filterType === 'delivery' && !pdv);
    return matchDate && matchType;
  });

  if (isLoading) {
    return <OrdersSkeleton />;
  }

  if (orders.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShoppingCart}
          title="Você ainda não possui pedidos"
          description="Os pedidos feitos pelos clientes aparecerão aqui automaticamente"
          actionLabel="Ir para o Cardápio"
          action={() => {
            const slug = user?.is_master ? user?.slug : subscriberData?.slug;
            const url = slug ? `/s/${slug}` : createPageUrl('Cardapio');
            window.open(url, '_blank');
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Filter */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-600">Data:</span>
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-auto text-sm"
        />
        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="text-xs">
            Limpar
          </Button>
        )}
        <span className="text-xs sm:text-sm text-gray-400 ml-auto">
          {filteredOrders.length} pedido(s)
        </span>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    #{order.order_code || order.id.slice(-6).toUpperCase()}
                  </span>
                  <Badge variant="outline" className={`text-xs ${isOrderPDV(order) ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'}`}>
                    {isOrderPDV(order) ? 'PDV' : 'Delivery'}
                  </Badge>
                  <Badge className={(STATUS_CONFIG[order.status] || STATUS_CONFIG.new).color + " text-xs"}>
                    {(STATUS_CONFIG[order.status] || STATUS_CONFIG.new).label}
                  </Badge>
                </div>
                <h3 className="font-bold text-base sm:text-lg">{order.customer_name}</h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  {(order.created_at || order.created_date) && format(new Date(order.created_at || order.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => printOrder(order)}
                  title="Imprimir Comanda"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Select
                  value={STATUS_CONFIG[order.status] ? order.status : 'new'}
                  onValueChange={(value) => updateMutation.mutate({
                    id: order.id,
                    data: { ...order, status: value },
                  })}
                >
                  <SelectTrigger className="w-28 sm:w-36 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => {
                    if (confirm('Excluir este pedido?')) {
                      deleteMutation.mutate(order.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Info do cliente */}
            <div className="grid md:grid-cols-3 gap-3 mb-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{order.customer_phone}</span>
              </div>
              {order.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{order.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="w-4 h-4" />
                <span>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
              </div>
            </div>

            {/* Itens */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-sm mb-2 text-gray-700">Itens do Pedido:</h4>
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="text-sm py-2 border-b border-gray-100 last:border-0 border-l-2 border-gray-300 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.dish?.name || 'Item'}</span>
                    <span className="text-gray-500">
                      {item.quantity > 1 && <span className="text-gray-400 mr-2">x{item.quantity}</span>}
                      {formatCurrency(item.totalPrice * (item.quantity || 1))}
                    </span>
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

            {/* Totais */}
            <div className="flex justify-end gap-6 text-sm">
              <div className="text-gray-500">
                Subtotal: {formatCurrency(order.subtotal)}
              </div>
              {order.delivery_fee > 0 && (
                <div className="text-gray-500">
                  Entrega: {formatCurrency(order.delivery_fee)}
                </div>
              )}
              <div className="font-bold text-green-600">
                Total: {formatCurrency(order.total)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}