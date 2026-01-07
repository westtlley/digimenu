import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  X, Phone, MapPin, CreditCard, Clock, Check, XCircle,
  Printer, MessageSquare, Timer, ChefHat, CheckCircle, Truck, RefreshCw, Send
} from 'lucide-react';
import OrderChatModal from './OrderChatModal';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatBrazilianDateTime, formatScheduledDateTime } from '../utils/dateUtils';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { OrderTimeline } from '../molecules/OrderTimeline';

const PAYMENT_LABELS = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

const REJECTION_REASONS = [
  'Loja fechada',
  'Produto indisponível',
  'Problema no endereço',
  'Área fora de cobertura',
  'Pedido duplicado',
  'Outro motivo',
];

export default function OrderDetailModal({ order, entregadores, onClose, onUpdate, user }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [selectedEntregador, setSelectedEntregador] = useState('');
  const [prepTime, setPrepTime] = useState(order.prep_time || 30);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);

  const queryClient = useQueryClient();

  // Buscar logs do pedido
  const { data: orderLogs = [] } = useQuery({
    queryKey: ['orderLogs', order.id],
    queryFn: () => base44.entities.OrderLog.filter({ order_id: order.id }, '-created_date'),
    enabled: !!order.id
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      // Validar status atual
      if (updates.status === 'accepted' && order.status !== 'new') {
        throw new Error('Apenas pedidos novos podem ser aceitos');
      }
      
      if (updates.status === 'cancelled' && !['new', 'accepted'].includes(order.status)) {
        throw new Error('Pedidos em andamento não podem ser cancelados');
      }
      
      // Validar tempo de preparo ao aceitar
      if (updates.status === 'accepted' && (!updates.prep_time || updates.prep_time < 5)) {
        throw new Error('Tempo de preparo deve ser no mínimo 5 minutos');
      }
      
      // Gerar códigos automaticamente quando ficar pronto
      if (updates.status === 'ready') {
        if (!order.pickup_code) {
          updates.pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
        }
        if (!order.delivery_code && order.delivery_method === 'delivery') {
          updates.delivery_code = Math.floor(1000 + Math.random() * 9000).toString();
        }
      }
      
      const updatedOrder = await base44.entities.Order.update(id, updates);
      
      try {
        await base44.entities.OrderLog.create({
          order_id: id,
          action: `Status alterado para ${updates.status}`,
          old_status: order.status,
          new_status: updates.status,
          user_email: user?.email,
          details: updates.rejection_reason || null
        });
      } catch (e) {
        console.log('Log error:', e);
      }
      
      return { status: updates.status, order: updatedOrder };
    },
    onSuccess: ({ status: newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orderLogs', order.id] });
      
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      
      const messages = {
        'accepted': '✅ Pedido aceito com sucesso!',
        'preparing': '👨‍🍳 Pedido em preparo!',
        'ready': '✅ Pedido pronto para retirada/entrega!',
        'out_for_delivery': '🚚 Pedido saiu para entrega!',
        'delivered': '✅ Pedido entregue!',
        'cancelled': '❌ Pedido cancelado',
      };
      
      if (messages[newStatus]) {
        toast.success(messages[newStatus]);
      }
      
      onUpdate();
    },
    onError: (error) => {
      console.error('Update error:', error);
      const errorMessage = error.message || 'Erro ao atualizar pedido. Tente novamente.';
      toast.error(errorMessage);
    }
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const handleAccept = async () => {
    if (updateMutation.isPending) return;
    
    // Validações
    if (!prepTime || prepTime < 5 || prepTime > 180) {
      toast.error('Tempo de preparo deve ser entre 5 e 180 minutos');
      return;
    }
    
    if (order.status !== 'new') {
      toast.error('Este pedido já foi processado');
      return;
    }
    
    updateMutation.mutate({
      id: order.id,
      updates: { 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        prep_time: prepTime,
      }
    });
  };

  const handleNextStatus = () => {
    const statusFlow = {
      'accepted': 'preparing',
      'preparing': 'ready',
      'ready': order.delivery_method === 'delivery' ? 'ready' : 'delivered',
      'out_for_delivery': 'delivered',
    };

    const nextStatus = statusFlow[order.status];
    if (!nextStatus) return;

    const updates = { status: nextStatus };
    if (nextStatus === 'ready') {
      updates.ready_at = new Date().toISOString();
    }
    if (nextStatus === 'delivered') updates.delivered_at = new Date().toISOString();

    updateMutation.mutate({ id: order.id, updates });
  };

  const handleReject = async () => {
    if (updateMutation.isPending) return;
    
    if (!['new', 'accepted'].includes(order.status)) {
      toast.error('Este pedido não pode mais ser cancelado');
      return;
    }
    
    if (!rejectionReason) {
      toast.error('Selecione um motivo para rejeitar o pedido');
      return;
    }
    
    const finalReason = rejectionReason === 'Outro motivo' 
      ? customRejectionReason.trim() 
      : rejectionReason;
    
    if (rejectionReason === 'Outro motivo' && !customRejectionReason.trim()) {
      toast.error('Descreva o motivo da rejeição');
      return;
    }
    
    if (finalReason.length < 5) {
      toast.error('Motivo muito curto. Mínimo de 5 caracteres');
      return;
    }
    
    updateMutation.mutate({
      id: order.id,
      updates: { 
        status: 'cancelled', 
        rejection_reason: finalReason,
      }
    });
    setShowRejectModal(false);
    setRejectionReason('');
    setCustomRejectionReason('');
  };

  const handleAssignDelivery = async () => {
    if (updateMutation.isPending) return;
    
    // Validações
    if (!selectedEntregador) {
      toast.error('Selecione um entregador');
      return;
    }
    
    const entregador = entregadores.find(e => e.id === selectedEntregador);
    if (!entregador) {
      toast.error('Entregador não encontrado');
      return;
    }
    
    if (entregador.status !== 'available') {
      toast.error('Entregador não está disponível');
      return;
    }
    
    try {
      // Buscar configuração da loja para coordenadas
      const stores = await base44.entities.Store.list();
      const store = stores[0];
      
      const entregador = entregadores.find(e => e.id === selectedEntregador);
      
      // Gerar códigos se ainda não existirem
      const updates = { 
        status: 'going_to_store', 
        entregador_id: selectedEntregador,
        store_latitude: store?.store_latitude || -5.0892,
        store_longitude: store?.store_longitude || -42.8019
      };
      
      if (!order.pickup_code) {
        updates.pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
      }
      if (!order.delivery_code) {
        updates.delivery_code = Math.floor(1000 + Math.random() * 9000).toString();
      }
      
      updateMutation.mutate({
        id: order.id,
        updates
      });
      
      // Atualizar entregador
      if (entregador) {
        await base44.entities.Entregador.update(selectedEntregador, {
          ...entregador,
          current_order_id: order.id,
          status: 'busy'
        });
      }
      
      setShowDeliveryModal(false);
      toast.success(`Entregador ${entregador.name} está indo buscar o pedido`);
    } catch (e) {
      console.error('Assign delivery error:', e);
      toast.error('Erro ao atribuir entregador');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const paymentLabel = {
      pix: 'PIX',
      dinheiro: 'Dinheiro',
      cartao_credito: 'Cartão de Crédito',
      cartao_debito: 'Cartão de Débito',
    }[order.payment_method] || order.payment_method;

    let itemsHTML = '';
    (order.items || []).forEach((item, idx) => {
      const isPizza = item.dish?.product_type === 'pizza';
      
      itemsHTML += `<div style="margin-bottom: 12px; border-left: 3px solid #666; padding-left: 8px;">`;
      itemsHTML += `<p style="margin: 0; font-weight: bold;">#${idx + 1} - ${item.dish?.name} x${item.quantity || 1}</p>`;
      
      // Pizza detalhada
      if (isPizza && item.size) {
        itemsHTML += `<p style="margin: 4px 0 0 12px; font-size: 10px; font-weight: bold;">🍕 ${item.size.name} (${item.size.slices} fatias • ${item.flavors?.length || 0} sabores)</p>`;
        
        if (item.flavors && item.flavors.length > 0) {
          itemsHTML += `<p style="margin: 2px 0 0 12px; font-size: 10px;">Sabores:</p>`;
          const flavorCounts = item.flavors.reduce((acc, f) => {
            acc[f.name] = (acc[f.name] || 0) + 1;
            return acc;
          }, {});
          Object.entries(flavorCounts).forEach(([name, count]) => {
            itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 24px;">  • ${count}/${item.size.slices} ${name}</p>`;
          });
        }
        
        if (item.edge) {
          itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 12px;">🧀 Borda: ${item.edge.name}</p>`;
        }
        
        if (item.extras && item.extras.length > 0) {
          itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 12px;">Extras:</p>`;
          item.extras.forEach(extra => {
            itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 24px;">  • ${extra.name}</p>`;
          });
        }
        
        if (item.specifications) {
          itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 12px; font-style: italic;">📝 ${item.specifications}</p>`;
        }
      } 
      // Prato normal
      else if (item.selections && Object.keys(item.selections).length > 0) {
        Object.values(item.selections).forEach(sel => {
          if (Array.isArray(sel)) {
            sel.forEach(opt => {
              itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 12px;">  • ${opt.name}</p>`;
            });
          } else if (sel) {
            itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 12px;">  • ${sel.name}</p>`;
          }
        });
      }
      
      if (item.observations) {
        itemsHTML += `<p style="margin: 2px 0; font-size: 10px; margin-left: 12px; font-style: italic;">📝 ${item.observations}</p>`;
      }
      
      itemsHTML += `<p style="margin: 4px 0 0 0;">Valor: ${formatCurrency(item.totalPrice * (item.quantity || 1))}</p>`;
      itemsHTML += `</div>`;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Comanda #${order.order_code || order.id?.slice(-6).toUpperCase()}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              padding: 10mm;
              margin: 0;
              width: 80mm;
            }
            h1 {
              text-align: center;
              font-size: 16px;
              margin: 0 0 5px 0;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 2px dashed #000;
            }
            .section {
              margin: 10px 0;
            }
            .total {
              border-top: 2px solid #000;
              margin-top: 10px;
              padding-top: 10px;
              font-weight: bold;
              font-size: 14px;
            }
            .code-box {
              background: #fff3cd;
              border: 2px solid #ff9800;
              padding: 10px;
              margin: 10px 0;
              text-align: center;
            }
            .code-box .code {
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>COMANDA</h1>
            <p style="margin: 0;">Pedido #${order.order_code || order.id?.slice(-6).toUpperCase()}</p>
            <p style="margin: 0; font-size: 11px;">${formatBrazilianDateTime(order.created_date)}</p>
          </div>
          
          <div class="section">
            <p style="margin: 0;"><strong>Cliente:</strong> ${order.customer_name}</p>
            <p style="margin: 0;"><strong>Contato:</strong> ${order.customer_phone}</p>
            <p style="margin: 0;"><strong>Tipo:</strong> ${order.delivery_method === 'delivery' ? 'Entrega 🚴' : 'Retirada 🏪'}</p>
            ${order.address ? `<p style="margin: 0;"><strong>Endereço:</strong> ${order.address}</p>` : ''}
            <p style="margin: 0;"><strong>Pagamento:</strong> ${paymentLabel}</p>
            ${order.payment_method === 'dinheiro' && order.needs_change && order.change_amount ? 
              `<p style="margin: 0; color: #ff6600;"><strong>Troco para:</strong> ${formatCurrency(order.change_amount)} (Troco: ${formatCurrency(order.change_amount - order.total)})</p>` 
            : ''}
            ${order.scheduled_date && order.scheduled_time ? 
              `<p style="margin: 0; color: #0066cc; font-weight: bold;">⏰ AGENDADO: ${formatScheduledDateTime(order.scheduled_date, order.scheduled_time)}</p>` 
            : ''}
          </div>


          
          <div class="section">
            <p style="margin: 0; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px;">--- Pedido ---</p>
            ${itemsHTML}
          </div>
          
          <div class="total">
            <p style="margin: 0;">Subtotal itens: ${formatCurrency(order.subtotal)}</p>
            ${order.delivery_fee > 0 ? `<p style="margin: 0;">Taxa de entrega: ${formatCurrency(order.delivery_fee)}</p>` : ''}
            ${order.discount > 0 ? `<p style="margin: 0; color: green;">Desconto: -${formatCurrency(order.discount)}</p>` : ''}
            <p style="margin: 5px 0 0 0; font-size: 16px;">TOTAL: ${formatCurrency(order.total)}</p>
          </div>

          <div style="text-align: center; margin-top: 15px; font-size: 10px; color: #666;">
            Enviado em ${formatBrazilianDateTime(order.created_date)}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const availableEntregadores = entregadores.filter(e => e.status === 'available');

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-500 text-white p-4 z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <h2 className="font-bold text-lg">COMANDA</h2>
                <p className="text-sm opacity-90">
                  Pedido #{order.order_code || order.id?.slice(-6).toUpperCase()}
                </p>
                <p className="text-xs opacity-75">
                  {order.created_date && formatBrazilianDateTime(order.created_date)}
                </p>
              </div>
              <button onClick={onClose} className="text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Código de Retirada para Entregador - Apenas para o Gestor */}
            {['ready', 'going_to_store', 'arrived_at_store', 'picked_up'].includes(order.status) && order.pickup_code && (
              <div className="bg-white/20 backdrop-blur-sm border-2 border-white/50 rounded-xl p-3 text-center mt-3">
                <p className="text-xs font-semibold mb-1">
                  {order.status === 'picked_up' ? '✅ Código Validado' : 'Código de Retirada'}
                </p>
                <p className="text-4xl font-bold tracking-widest">
                  {order.pickup_code}
                </p>
                <p className="text-[10px] opacity-90 mt-1">
                  {order.status === 'picked_up' ? 'Pedido coletado' : order.status === 'ready' ? 'Pronto para coleta' : 'Forneça ao entregador'}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3 text-sm">
            {/* Customer Info */}
            <div className="space-y-1">
              <p className="font-bold text-base">{order.customer_name}</p>
              <p className="text-xs text-gray-600">{order.customer_phone}</p>
              {order.delivery_method === 'delivery' && order.address && (
                <p className="text-xs text-gray-600">📍 {order.address}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {order.delivery_method === 'delivery' ? '🚴 Entrega' : '🏪 Retirada'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                </Badge>
              </div>
              {order.scheduled_date && order.scheduled_time && (
                <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2 rounded">
                  ⏰ AGENDADO: {formatScheduledDateTime(order.scheduled_date, order.scheduled_time)}
                </p>
              )}
            </div>

            {/* Timeline Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full"
            >
              <Clock className="w-4 h-4 mr-2" />
              {showTimeline ? 'Ocultar Histórico' : 'Ver Histórico do Pedido'}
            </Button>

            {showTimeline && (
              <div className="bg-gray-50 rounded-lg p-3">
                <OrderTimeline order={order} logs={orderLogs} />
              </div>
            )}

            {/* Items */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-bold mb-2 text-xs text-gray-500">ITENS DO PEDIDO</p>
              <div className="space-y-3">
                {(order.items || []).map((item, idx) => {
                  const isPizza = item.dish?.product_type === 'pizza';
                  
                  return (
                    <div key={idx} className="border-l-2 border-gray-300 pl-2">
                      <p className="font-bold text-sm">{item.quantity || 1}x {item.dish?.name}</p>
                      
                      {isPizza && item.size && (
                        <div className="ml-2 text-xs mt-1 space-y-1">
                          <p className="font-semibold text-gray-700">
                            🍕 {item.size.name} ({item.size.slices} fatias • {item.flavors?.length || 0} sabores)
                          </p>
                          
                          {item.flavors && item.flavors.length > 0 && (
                            <div className="ml-2">
                              <p className="font-medium text-gray-600">Sabores:</p>
                              {Object.entries(
                                item.flavors.reduce((acc, f) => {
                                  acc[f.name] = (acc[f.name] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([name, count]) => (
                                <p key={name} className="ml-2 text-gray-600">
                                  • {count}/{item.size.slices} {name}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {item.edge && (
                            <p className="font-medium text-gray-600 ml-2">
                              🧀 Borda: {item.edge.name}
                            </p>
                          )}
                          
                          {item.extras && item.extras.length > 0 && (
                            <div className="ml-2">
                              <p className="font-medium text-gray-600">Extras:</p>
                              {item.extras.map((extra, i) => (
                                <p key={i} className="ml-2 text-gray-600">• {extra.name}</p>
                              ))}
                            </div>
                          )}
                          
                          {item.specifications && (
                            <p className="text-gray-600 ml-2 italic">
                              📝 {item.specifications}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {!isPizza && item.selections && Object.keys(item.selections).length > 0 && (
                        <div className="ml-2 text-xs text-gray-600 mt-1 space-y-0.5">
                          {Object.entries(item.selections).map(([groupId, sel]) => {
                            if (Array.isArray(sel)) {
                              return sel.map((opt, i) => <p key={i}>• {opt.name}</p>);
                            } else if (sel) {
                              return <p key={groupId}>• {sel.name}</p>;
                            }
                            return null;
                          })}
                        </div>
                      )}
                      
                      {item.observations && (
                        <p className="ml-2 text-xs text-gray-600 italic mt-1">
                          📝 {item.observations}
                        </p>
                      )}
                      
                      <p className="font-semibold text-sm text-green-700 mt-1">
                        {formatCurrency(item.totalPrice * (item.quantity || 1))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Taxa de entrega</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>TOTAL</span>
                <span className="text-green-600">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 space-y-2">
            {/* Actions */}
            <div className="space-y-2">
              {order.status === 'new' && (
                <>
                  <div className="flex items-center gap-2 mb-2 bg-white p-2 rounded border">
                    <Timer className="w-4 h-4 text-gray-600" />
                    <span className="text-xs">Tempo de preparo:</span>
                    <select 
                      value={prepTime}
                      onChange={(e) => setPrepTime(parseInt(e.target.value))}
                      className="border rounded px-2 py-1 text-xs font-medium"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                  <Button 
                    onClick={handleAccept} 
                    className="w-full bg-green-600 hover:bg-green-700 h-12 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Processando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" /> Aceitar Pedido
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => setShowRejectModal(true)} 
                    variant="outline" 
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 h-10"
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                  </Button>
                </>
              )}

              {order.status === 'accepted' && (
                <Button onClick={handleNextStatus} className="w-full bg-yellow-600 hover:bg-yellow-700 h-12 font-semibold">
                  <ChefHat className="w-5 h-5 mr-2" /> Iniciar Preparo
                </Button>
              )}

              {order.status === 'preparing' && (
                <Button onClick={handleNextStatus} className="w-full bg-green-600 hover:bg-green-700 h-12 font-semibold">
                  <CheckCircle className="w-5 h-5 mr-2" /> Marcar como Pronto
                </Button>
              )}

              {order.status === 'ready' && order.delivery_method === 'delivery' && (
                <Button onClick={() => setShowDeliveryModal(true)} className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold">
                  <Truck className="w-5 h-5 mr-2" /> Chamar Entregador
                </Button>
              )}

              {/* Códigos exibidos no cabeçalho do modal */}

              {order.status === 'ready' && order.delivery_method === 'pickup' && (
                <Button onClick={handleNextStatus} className="w-full bg-green-600 hover:bg-green-700 h-12 font-semibold">
                  <CheckCircle className="w-5 h-5 mr-2" /> Marcar como Entregue
                </Button>
              )}

              {order.status === 'out_for_delivery' && (
                <>
                  {order.entregador_id && (
                    <Button 
                      onClick={() => setShowSendMessage(true)}
                      variant="outline"
                      className="w-full border-blue-500 text-blue-600 hover:bg-blue-50 h-10 font-medium mb-2"
                    >
                      <Send className="w-4 h-4 mr-2" /> Enviar Mensagem ao Entregador
                    </Button>
                  )}
                  <Button onClick={handleNextStatus} className="w-full bg-green-600 hover:bg-green-700 h-12 font-semibold">
                    <CheckCircle className="w-5 h-5 mr-2" /> Confirmar Entrega
                  </Button>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-1" /> Imprimir
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const phone = order.customer_phone?.replace(/\D/g, '');
                    window.open(`https://wa.me/55${phone}`, '_blank');
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-1" /> WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-red-600">⚠️ Rejeitar Pedido</h3>
            <p className="text-sm text-gray-600">
              Selecione o motivo da rejeição. Esta ação não pode ser desfeita.
            </p>
            <div className="space-y-2">
              {REJECTION_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full p-3 rounded-lg border-2 text-left text-sm transition-colors ${
                    rejectionReason === reason 
                      ? 'border-red-500 bg-red-50 font-medium' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {rejectionReason === 'Outro motivo' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Descreva o motivo *
                </label>
                <Textarea
                  value={customRejectionReason}
                  onChange={(e) => setCustomRejectionReason(e.target.value)}
                  placeholder="Ex: Cliente solicitou cancelamento..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo de 5 caracteres
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setCustomRejectionReason('');
                }} 
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleReject} 
                disabled={!rejectionReason || updateMutation.isPending} 
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Confirmar Rejeição'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Chamar Entregador</h3>
            {availableEntregadores.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Nenhum entregador disponível</p>
            ) : (
              <>
                <div className="space-y-2">
                  {availableEntregadores.map(ent => (
                    <button
                      key={ent.id}
                      onClick={() => setSelectedEntregador(ent.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left ${
                        selectedEntregador === ent.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <p className="font-medium">{ent.name}</p>
                      <p className="text-sm text-gray-500">{ent.phone}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowDeliveryModal(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAssignDelivery} 
                    disabled={!selectedEntregador || updateMutation.isPending} 
                    className="flex-1 bg-blue-600 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Processando...' : 'Confirmar'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Chat Modal */}
      {showSendMessage && order.entregador_id && (
        <OrderChatModal
          order={order}
          entregador={entregadores.find(e => e.id === order.entregador_id)}
          onClose={() => setShowSendMessage(false)}
        />
      )}
    </>
  );
}