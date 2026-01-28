import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Bell, Clock, ChefHat, CheckCircle, Truck, XCircle,
  Printer, MessageSquare, Phone, MapPin, CreditCard, User,
  Timer, AlertTriangle, Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

const STATUS_CONFIG = {
  new: { label: 'Novo', color: 'bg-red-500', icon: Bell, next: 'accepted' },
  accepted: { label: 'Aceito', color: 'bg-yellow-500', icon: Clock, next: 'preparing' },
  preparing: { label: 'Preparando', color: 'bg-yellow-500', icon: ChefHat, next: 'ready' },
  ready: { label: 'Pronto', color: 'bg-green-500', icon: CheckCircle, next: 'out_for_delivery' },
  out_for_delivery: { label: 'Em Entrega', color: 'bg-blue-500', icon: Truck, next: 'delivered' },
  delivered: { label: 'Entregue', color: 'bg-gray-500', icon: CheckCircle, next: null },
  cancelled: { label: 'Cancelado', color: 'bg-gray-400', icon: XCircle, next: null },
};

const REJECTION_REASONS = [
  'Loja fechada',
  'Produto indisponível',
  'Problema no endereço',
  'Área fora de cobertura',
  'Pedido duplicado',
  'Outro motivo',
];

const PAYMENT_LABELS = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

export default function OrderDetail({ order, entregadores, onBack, onOrderUpdate, user }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedEntregador, setSelectedEntregador] = useState('');
  const [prepTime, setPrepTime] = useState(order.prep_time || 30);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Order.update(id, data);
      // Log the action
      await base44.entities.OrderLog.create({
        order_id: id,
        action: `Status alterado para ${data.status}`,
        old_status: order.status,
        new_status: data.status,
        user_email: user?.email,
      });
      return data.status;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
      onOrderUpdate?.();
      
      // Mensagens de confirmação
      const messages = {
        'accepted': '✅ Pedido aceito!',
        'preparing': '👨‍🍳 Em preparo!',
        'ready': '✅ Pedido pronto!',
        'out_for_delivery': '🚚 Saiu para entrega!',
        'delivered': '✅ Pedido entregue!',
        'cancelled': '❌ Pedido cancelado',
      };
      
      if (messages[newStatus]) {
        // Criar toast de confirmação
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 z-[9999] bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top';
        toast.innerHTML = `
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <p class="font-bold">${messages[newStatus]}</p>
            <p class="text-sm opacity-90">Status atualizado</p>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    },
  });

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
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const handleAccept = () => {
    updateMutation.mutate({
      id: order.id,
      data: { 
        ...order, 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        prep_time: prepTime,
      }
    });
  };

  const handleAdvanceStatus = () => {
    const currentStatus = STATUS_CONFIG[order.status];
    if (!currentStatus?.next) return;

    const updateData = { 
      ...order, 
      status: currentStatus.next 
    };

    if (currentStatus.next === 'ready') {
      updateData.ready_at = new Date().toISOString();
    }
    if (currentStatus.next === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    updateMutation.mutate({ id: order.id, data: updateData });
  };

  const handleReject = () => {
    updateMutation.mutate({
      id: order.id,
      data: { 
        ...order, 
        status: 'cancelled',
        rejection_reason: rejectionReason,
      }
    });
    setShowRejectModal(false);
  };

  const handleAssignDelivery = () => {
    updateMutation.mutate({
      id: order.id,
      data: { 
        ...order, 
        status: 'out_for_delivery',
        entregador_id: selectedEntregador,
      }
    });
    
    // Update entregador status
    base44.entities.Entregador.update(selectedEntregador, {
      status: 'busy',
      current_order_id: order.id,
    });
    
    setShowDeliveryModal(false);
  };

  const handlePrint = () => {
    const pdf = new jsPDF({ unit: 'mm', format: [80, 200] });
    let y = 10;
    
    pdf.setFontSize(12);
    pdf.setFont('courier', 'bold');
    pdf.text('COMANDA', 40, y, { align: 'center' });
    y += 8;
    
    pdf.setFontSize(10);
    pdf.setFont('courier', 'normal');
    pdf.text(`#${order.order_code || order.id?.slice(-6).toUpperCase()}`, 5, y);
    y += 5;
    pdf.text(`${format(new Date(order.created_date), "dd/MM/yyyy HH:mm")}`, 5, y);
    y += 8;
    
    pdf.text(`Cliente: ${order.customer_name}`, 5, y);
    y += 5;
    pdf.text(`Tel: ${order.customer_phone}`, 5, y);
    y += 5;
    
    if (order.delivery_method === 'delivery') {
      pdf.text(`Entrega: ${order.address}`, 5, y);
      y += 5;
    } else {
      pdf.text('Retirada no local', 5, y);
      y += 5;
    }
    
    pdf.text(`Pagamento: ${PAYMENT_LABELS[order.payment_method] || order.payment_method}`, 5, y);
    y += 8;
    
    pdf.text('--------------------------------', 5, y);
    y += 5;
    
    (order.items || []).forEach((item, idx) => {
      const qty = item.quantity || 1;
      pdf.text(`${qty}x ${item.dish?.name || 'Item'}`, 5, y);
      y += 4;
      pdf.text(`   ${formatCurrency(item.totalPrice * qty)}`, 5, y);
      y += 5;
    });
    
    if (order.notes) {
      y += 3;
      pdf.text(`OBS: ${order.notes}`, 5, y);
      y += 5;
    }
    
    pdf.text('--------------------------------', 5, y);
    y += 5;
    
    pdf.text(`Subtotal: ${formatCurrency(order.subtotal)}`, 5, y);
    y += 5;
    if (order.delivery_fee > 0) {
      pdf.text(`Entrega: ${formatCurrency(order.delivery_fee)}`, 5, y);
      y += 5;
    }
    pdf.setFont('courier', 'bold');
    pdf.text(`TOTAL: ${formatCurrency(order.total)}`, 5, y);
    
    pdf.save(`pedido-${order.order_code || order.id?.slice(-6)}.pdf`);
  };

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
  const StatusIcon = status.icon;
  const elapsed = getTimeElapsed(order.created_date);
  const isLate = differenceInMinutes(new Date(), new Date(order.created_date)) > 30;

  const availableEntregadores = entregadores.filter(e => e.status === 'available');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-lg sm:text-xl">
              Pedido #{order.order_code || order.id?.slice(-6).toUpperCase()}
            </h2>
            <Badge className={`${status.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            {isLate && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Badge className="bg-red-600">
                <AlertTriangle className="w-3 h-3 mr-1" /> Atrasado
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {order.created_date && format(new Date(order.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {' · '}{elapsed}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Cliente
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${order.customer_phone}`} className="text-blue-500 hover:underline">
                  {order.customer_phone}
                </a>
              </div>
              {order.delivery_method === 'delivery' && order.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span>{order.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400" />
                <span>{order.delivery_method === 'delivery' ? 'Entrega' : 'Retirada'}</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3">Itens do Pedido</h3>
            <div className="space-y-3">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base">
                      {item.quantity || 1}x {item.dish?.name || 'Item'}
                    </p>
                    {item.selections && Object.keys(item.selections).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {Object.values(item.selections).map((sel, i) => {
                          if (Array.isArray(sel)) {
                            return sel.map(s => s.name).join(', ');
                          }
                          return sel?.name;
                        }).filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-sm">
                    {formatCurrency((item.totalPrice || 0) * (item.quantity || 1))}
                  </span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">Observações:</p>
                <p className="text-sm text-yellow-700">{order.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Taxa de entrega</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3">Ações</h3>
            <div className="space-y-2">
              {order.status === 'new' && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Tempo de preparo:</span>
                    <select 
                      value={prepTime}
                      onChange={(e) => setPrepTime(parseInt(e.target.value))}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                  <Button 
                    onClick={handleAccept}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" /> Aceitar Pedido
                  </Button>
                  <Button 
                    onClick={() => setShowRejectModal(true)}
                    variant="outline"
                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                  </Button>
                </>
              )}

              {['accepted', 'preparing'].includes(order.status) && (
                <Button 
                  onClick={handleAdvanceStatus}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> 
                  {order.status === 'accepted' ? 'Iniciar Preparo' : 'Marcar como Pronto'}
                </Button>
              )}

              {order.status === 'ready' && order.delivery_method === 'delivery' && (
                <Button 
                  onClick={() => setShowDeliveryModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="w-4 h-4 mr-2" /> Chamar Entregador
                </Button>
              )}

              {order.status === 'ready' && order.delivery_method === 'pickup' && (
                <Button 
                  onClick={handleAdvanceStatus}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Marcar como Entregue
                </Button>
              )}

              {order.status === 'out_for_delivery' && (
                <Button 
                  onClick={handleAdvanceStatus}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Entrega
                </Button>
              )}

              <Button 
                onClick={handlePrint}
                variant="outline"
                className="w-full"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>

              <Button 
                variant="outline"
                className="w-full"
                onClick={() => {
                  const phone = order.customer_phone?.replace(/\D/g, '');
                  window.open(`https://wa.me/55${phone}`, '_blank');
                }}
              >
                <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Pedido recebido</span>
                <span className="text-gray-400 ml-auto text-xs">
                  {order.created_date && format(new Date(order.created_date), "HH:mm")}
                </span>
              </div>
              {order.accepted_at && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Pedido aceito</span>
                  <span className="text-gray-400 ml-auto text-xs">
                    {format(new Date(order.accepted_at), "HH:mm")}
                  </span>
                </div>
              )}
              {order.ready_at && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Pronto</span>
                  <span className="text-gray-400 ml-auto text-xs">
                    {format(new Date(order.ready_at), "HH:mm")}
                  </span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Entregue</span>
                  <span className="text-gray-400 ml-auto text-xs">
                    {format(new Date(order.delivered_at), "HH:mm")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Rejeitar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Selecione o motivo da rejeição:</p>
            <div className="space-y-2">
              {REJECTION_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full p-3 rounded-lg border-2 text-left text-sm transition-colors ${
                    rejectionReason === reason 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleReject}
                disabled={!rejectionReason}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Chamar Entregador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableEntregadores.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Nenhum entregador disponível no momento
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500">Selecione o entregador:</p>
                <div className="space-y-2">
                  {availableEntregadores.map(ent => (
                    <button
                      key={ent.id}
                      onClick={() => setSelectedEntregador(ent.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedEntregador === ent.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">{ent.name}</p>
                      <p className="text-sm text-gray-500">{ent.phone}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeliveryModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleAssignDelivery}
                disabled={!selectedEntregador}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}