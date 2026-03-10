import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  X, Phone, MapPin, CreditCard, Clock, Check, XCircle,
  Printer, MessageSquare, Timer, ChefHat, CheckCircle, Truck, RefreshCw, Send, Copy
} from 'lucide-react';
import OrderChatModal from './OrderChatModal';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatBrazilianDateTime, formatScheduledDateTime } from '../utils/dateUtils';
import { printComanda as printComandaTicket } from '@/utils/gestorExport';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { OrderTimeline } from '../molecules/OrderTimeline';

const PAYMENT_LABELS = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'CartÃ£o de CrÃ©dito',
  cartao_debito: 'CartÃ£o de DÃ©bito',
};

const REJECTION_REASONS = [
  'Loja fechada',
  'Produto indisponÃ­vel',
  'Problema no endereÃ§o',
  'Ãrea fora de cobertura',
  'Pedido duplicado',
  'Outro motivo',
];

export default function OrderDetailModal({ 
  order, entregadores, onClose, onUpdate, user,
  asSub,
  suggestedPrepTime = 30, quickStatusKey, onClearQuickStatus,
  onViewMap, onDuplicate, onAddToPrintQueue,
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showRejectChangeModal, setShowRejectChangeModal] = useState(false);
  const [changeRejectMotivo, setChangeRejectMotivo] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [customRejectionError, setCustomRejectionError] = useState(false);
  const [selectedEntregador, setSelectedEntregador] = useState('');
  const [prepTime, setPrepTime] = useState(order.prep_time || suggestedPrepTime || 30);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [internalNotes, setInternalNotes] = useState(order.internal_notes || '');
  const [priority, setPriority] = useState(order.priority || 'normal');

  const canAlterPrepPerOrder = (() => {
    try {
      const g = JSON.parse(localStorage.getItem('gestorSettings') || '{}');
      return g.can_alter_prep_per_order !== false;
    } catch { return true; }
  })();

  const queryClient = useQueryClient();
  const gestorOrdersKey = useMemo(() => ['gestorOrders', asSub ?? 'me'], [asSub]);

  // Atalho 1â€“4: aplicar status e limpar
  React.useEffect(() => {
    if (!quickStatusKey || updateMutation.isPending) return;
    const run = () => {
      if (quickStatusKey === 'accepted' && order.status === 'new') {
        const p = canAlterPrepPerOrder ? prepTime : (suggestedPrepTime || 30);
        updateMutation.mutate({ id: order.id, updates: { status: 'accepted', accepted_at: new Date().toISOString(), prep_time: p } }, { onSuccess: () => onClearQuickStatus?.() });
        return;
      }
      if (quickStatusKey === 'ready' && ['accepted', 'preparing'].includes(order.status)) {
        const u = { status: 'ready', ready_at: new Date().toISOString() };
        if (!order.pickup_code) u.pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
        if (!order.delivery_code && order.delivery_method === 'delivery') u.delivery_code = Math.floor(1000 + Math.random() * 9000).toString();
        updateMutation.mutate({ id: order.id, updates: u }, { onSuccess: () => onClearQuickStatus?.() });
        return;
      }
      if (quickStatusKey === 'out_for_delivery' && ['ready', 'picked_up'].includes(order.status)) {
        updateMutation.mutate({ id: order.id, updates: { status: 'out_for_delivery' } }, { onSuccess: () => onClearQuickStatus?.() });
        return;
      }
      if (quickStatusKey === 'delivered' && ['ready', 'out_for_delivery', 'arrived_at_customer'].includes(order.status)) {
        updateMutation.mutate({ id: order.id, updates: { status: 'delivered', delivered_at: new Date().toISOString() } }, { onSuccess: () => onClearQuickStatus?.() });
        return;
      }
      onClearQuickStatus?.();
    };
    run();
  }, [quickStatusKey]);

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
        throw new Error('Pedidos em andamento nÃ£o podem ser cancelados');
      }
      
      // Validar tempo de preparo ao aceitar
      if (updates.status === 'accepted' && (!updates.prep_time || updates.prep_time < 5)) {
        throw new Error('Tempo de preparo deve ser no mÃ­nimo 5 minutos');
      }
      
      // Gerar cÃ³digos automaticamente quando ficar pronto
      if (updates.status === 'ready') {
        if (!order.pickup_code) {
          updates.pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
        }
        if (!order.delivery_code && order.delivery_method === 'delivery') {
          updates.delivery_code = Math.floor(1000 + Math.random() * 9000).toString();
        }
      }
      
      const payload = { ...order, ...updates };
      const updateOpts = asSub ? { as_subscriber: asSub } : {};
      const res = await base44.entities.Order.update(id, payload, updateOpts);
      
      try {
        await base44.entities.OrderLog.create({
          order_id: id,
          action: `Status alterado para ${updates.status}`,
          old_status: order.status,
          new_status: updates.status,
          user_email: user?.email,
          details: updates.rejection_reason || null,
          ...(asSub && { as_subscriber: asSub })
        });
      } catch (e) {
        console.log('Log error:', e);
      }
      
      return { status: updates.status, order: res || payload };
    },
    onSuccess: (data) => {
      const newStatus = data?.status;
      const updatedOrder = data?.order || order;
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
      queryClient.invalidateQueries({ queryKey: ['orderLogs', order.id] });
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      const messages = {
        'accepted': 'âœ… Pedido aceito!',
        'preparing': 'ðŸ‘¨â€ðŸ³ Em preparo!',
        'ready': 'âœ… Pronto!',
        'out_for_delivery': 'ðŸšš Saiu para entrega!',
        'delivered': 'âœ… Entregue!',
        'cancelled': 'âŒ Cancelado',
      };
      if (messages[newStatus]) toast.success(messages[newStatus]);

      if (newStatus === 'accepted' && isAutoPrintEnabled()) {
        const printed = printComandaTicket(updatedOrder);
        if (!printed) {
          toast.error('Popup bloqueado. Permita popups para impressÃƒÂ£o automÃƒÂ¡tica.');
        }
      }

      onUpdate(updatedOrder);
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

  const isAutoPrintEnabled = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('gestorSettings') || '{}');
      return settings.auto_print === true;
    } catch (_) {
      return false;
    }
  };

  const handleAccept = async () => {
    if (updateMutation.isPending) return;
    const effectivePrep = canAlterPrepPerOrder ? prepTime : (suggestedPrepTime || 30);
    if (!effectivePrep || effectivePrep < 5 || effectivePrep > 180) {
      toast.error('Tempo de preparo deve ser entre 5 e 180 minutos');
      return;
    }
    if (order.status !== 'new') {
      toast.error('Este pedido jÃ¡ foi processado');
      return;
    }
    updateMutation.mutate({
      id: order.id,
      updates: { 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        prep_time: effectivePrep,
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
      toast.error('Este pedido nÃ£o pode mais ser cancelado');
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
      setCustomRejectionError(true);
      toast.error('Descreva o motivo da rejeiÃ§Ã£o');
      return;
    }
    
    if (finalReason.length < 5) {
      if (rejectionReason === 'Outro motivo') setCustomRejectionError(true);
      toast.error('Motivo muito curto. MÃ­nimo de 5 caracteres');
      return;
    }
    
    setCustomRejectionError(false);
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
    setCustomRejectionError(false);
  };

  const handleAssignDelivery = async () => {
    if (updateMutation.isPending) return;
    
    // ValidaÃ§Ãµes
    if (!selectedEntregador) {
      toast.error('Selecione um entregador');
      return;
    }
    
    const entregador = entregadores.find(e => e.id === selectedEntregador);
    if (!entregador) {
      toast.error('Entregador nÃ£o encontrado');
      return;
    }
    
    if (entregador.status !== 'available') {
      toast.error('Entregador nÃ£o estÃ¡ disponÃ­vel');
      return;
    }
    
    try {
      // Buscar configuraÃ§Ã£o da loja para coordenadas
      const stores = await base44.entities.Store.list(null, asSub ? { as_subscriber: asSub } : {});
      const store = stores[0];
      
      const entregador = entregadores.find(e => e.id === selectedEntregador);
      
      // Gerar cÃ³digos se ainda nÃ£o existirem
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
        const updOpts = asSub ? { as_subscriber: asSub } : {};
        await base44.entities.Entregador.update(selectedEntregador, {
          ...entregador,
          current_order_id: order.id,
          status: 'busy'
        }, updOpts);
      }
      
      setShowDeliveryModal(false);
      toast.success(`Entregador ${entregador.name} estÃ¡ indo buscar o pedido`);
    } catch (e) {
      console.error('Assign delivery error:', e);
      toast.error('Erro ao atribuir entregador');
    }
  };

  const handleApproveChangeRequest = async () => {
    try {
      const opts = asSub ? { as_subscriber: asSub } : {};
      await base44.entities.Order.update(order.id, { ...order, customer_change_status: 'approved' }, opts);
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
      toast.success('AlteraÃ§Ã£o do cliente aceita.');
      onUpdate();
    } catch (e) {
      toast.error(e?.message || 'Erro ao aceitar alteraÃ§Ã£o.');
    }
  };

  const handleRejectChangeRequest = async () => {
    const motivo = (changeRejectMotivo || '').trim();
    if (motivo.length < 3) {
      toast.error('Informe um breve motivo da reprovaÃ§Ã£o (mÃ­n. 3 caracteres).');
      return;
    }
    try {
      const opts = asSub ? { as_subscriber: asSub } : {};
      await base44.entities.Order.update(order.id, { ...order, customer_change_status: 'rejected', customer_change_response: motivo }, opts);
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
      toast.success('AlteraÃ§Ã£o reprovada.');
      setShowRejectChangeModal(false);
      setChangeRejectMotivo('');
      onUpdate();
    } catch (e) {
      toast.error(e?.message || 'Erro ao reprovar alteraÃ§Ã£o.');
    }
  };

  const handlePrint = () => {
    const printed = printComandaTicket(order);
    if (!printed) {
      toast.error('Popup bloqueado. Permita popups para imprimir.');
      return;
    }
    toast.success('Comanda enviada para impressÃ£o!');
  };

  const availableEntregadores = entregadores.filter(e => e.status === 'available');

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0" aria-describedby={undefined}>
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-500 text-white p-4 z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <DialogTitle className="font-bold text-lg text-white">COMANDA</DialogTitle>
                <p className="text-sm opacity-90">
                  Pedido #{order.order_code || order.id?.slice(-6).toUpperCase()}
                </p>
                <p className="text-xs opacity-75">
                  {(order.created_at || order.created_date) ? formatBrazilianDateTime(order.created_at || order.created_date) : 'â€”'}
                </p>
              </div>
              <button onClick={onClose} className="text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* CÃ³digo de Retirada para Entregador - Apenas para o Gestor */}
            {['ready', 'going_to_store', 'arrived_at_store', 'picked_up'].includes(order.status) && order.pickup_code && (
              <div className="bg-white/20 backdrop-blur-sm border-2 border-white/50 rounded-xl p-3 text-center mt-3">
                <p className="text-xs font-semibold mb-1">
                  {order.status === 'picked_up' ? 'âœ… CÃ³digo Validado' : 'CÃ³digo de Retirada'}
                </p>
                <p className="text-4xl font-bold tracking-widest">
                  {order.pickup_code}
                </p>
                <p className="text-[10px] opacity-90 mt-1">
                  {order.status === 'picked_up' ? 'Pedido coletado' : order.status === 'ready' ? 'Pronto para coleta' : 'ForneÃ§a ao entregador'}
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
                <p className="text-xs text-gray-600">ðŸ“ {order.address}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {order.delivery_method === 'delivery' ? 'ðŸš´ Entrega' : 'ðŸª Retirada'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                </Badge>
              </div>
              {order.scheduled_date && order.scheduled_time && (
                <p className="text-xs text-blue-600 font-bold bg-blue-50 p-2 rounded">
                  â° AGENDADO: {formatScheduledDateTime(order.scheduled_date, order.scheduled_time)}
                </p>
              )}
            </div>

            {/* SolicitaÃ§Ã£o de alteraÃ§Ã£o/adicional do cliente */}
            {order.customer_change_request && (
              <div className={`rounded-lg p-3 border ${
                order.customer_change_status === 'approved' ? 'bg-green-50 border-green-200' :
                order.customer_change_status === 'rejected' ? 'bg-red-50 border-red-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                <p className="text-xs font-semibold text-gray-700 mb-1">âœï¸ SolicitaÃ§Ã£o do cliente</p>
                <p className="text-sm text-gray-800">{order.customer_change_request}</p>
                {(!order.customer_change_status || order.customer_change_status === 'pending') && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleApproveChangeRequest} className="rounded bg-green-600 hover:bg-green-700 uppercase font-bold transition-all duration-100">
                      <Check className="w-3.5 h-3.5 mr-1" /> Aceitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowRejectChangeModal(true)} className="rounded border-red-300 text-red-600 hover:bg-red-50 uppercase font-bold transition-all duration-100">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reprovar
                    </Button>
                  </div>
                )}
                {order.customer_change_status === 'approved' && (
                  <Badge className="mt-2 bg-green-600">AlteraÃ§Ã£o aceita</Badge>
                )}
                {order.customer_change_status === 'rejected' && (
                  <div className="mt-2">
                    <Badge variant="outline" className="border-red-300 text-red-700">Reprovada</Badge>
                    {order.customer_change_response && (
                      <p className="text-xs text-gray-600 mt-1">Motivo: {order.customer_change_response}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notas internas e Prioridade */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Notas internas</label>
                <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="SÃ³ vocÃª vÃª" rows={2} className="resize-none text-sm focus:border-gray-800 focus:ring-1 focus:ring-gray-800/20 focus:outline-none" />
                <Button type="button" size="sm" variant="ghost" className="mt-1 h-7 text-xs" onClick={() => updateMutation.mutate({ id: order.id, updates: { internal_notes: internalNotes } })} disabled={updateMutation.isPending}>
                  Salvar notas
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Prioridade:</span>
                <select value={priority} onChange={(e) => { const v = e.target.value; setPriority(v); updateMutation.mutate({ id: order.id, updates: { priority: v } }); }} className="border rounded px-2 py-1 text-xs font-medium min-h-[52px] focus:border-gray-800 focus:ring-1 focus:ring-gray-800/20 focus:outline-none">
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </div>

            {/* Timeline Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full"
            >
              <Clock className="w-4 h-4 mr-2" />
              {showTimeline ? 'Ocultar HistÃ³rico' : 'Ver HistÃ³rico do Pedido'}
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
                  const isCombo = item.dish?.product_type === 'combo' || Array.isArray(item?.selections?.combo_groups);
                  
                  return (
                    <div key={idx} className="border-l-2 border-gray-300 pl-2">
                      <p className="font-bold text-sm">{item.quantity || 1}x {item.dish?.name}</p>
                      
                      

                      {isCombo && Array.isArray(item?.selections?.combo_groups) && (
                        <div className="ml-2 text-xs text-gray-600 mt-1 space-y-0.5">
                          {item.selections.combo_groups.map((g, gi) => {
                            if (!g) return null;
                            const title = g.title || 'Itens do combo';
                            const isDrinkGroup = /bebid/i.test(title);
                            const groupEmoji = isDrinkGroup ? 'ðŸ¥¤' : 'ðŸ½ï¸';
                            const groupLabel = isDrinkGroup ? 'BEBIDAS' : 'PRATOS';
                            const items = Array.isArray(g.items) ? g.items : [];
                            if (items.length === 0) return null;

                            return (
                              <div key={gi} className="space-y-0.5">
                                <p className="font-semibold text-gray-700">{groupEmoji} {groupLabel}: {title}</p>
                                {items.map((it, ii) => {
                                  if (!it) return null;
                                  const name = it?.dish_name || it?.dishName || 'Item';
                                  const instances = Array.isArray(it?.instances) && it.instances.length > 0
                                    ? it.instances
                                    : Array.from({ length: Math.max(1, it?.quantity || 1) }, () => null);

                                  return (
                                    <div key={ii} className="ml-2">
                                      {instances.map((inst, instIdx) => {
                                        const showIndex = instances.length > 1;
                                        return (
                                          <div key={instIdx} className="space-y-0.5">
                                            <p>â€¢ {showIndex ? `${isDrinkGroup ? 'Bebida' : 'Prato'} ${instIdx + 1}: ` : ''}{name}</p>
                                            {inst?.selections && typeof inst.selections === 'object' && (
                                              <div className="ml-3 space-y-0.5">
                                                {Object.values(inst.selections).flatMap((groupSel, si) => {
                                                  if (Array.isArray(groupSel)) {
                                                    return groupSel.map((opt, oi) => (
                                                      opt?.name ? <p key={`${si}_${oi}`}>â†³ {opt.name}</p> : null
                                                    ));
                                                  }
                                                  if (groupSel?.name) return [<p key={si}>â†³ {groupSel.name}</p>];
                                                  return [null];
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isPizza && !isCombo && item.selections && Object.keys(item.selections).length > 0 && (
                        <div className="ml-2 text-xs text-gray-600 mt-1 space-y-0.5">
                          {Object.entries(item.selections).map(([groupId, sel]) => {
                            if (Array.isArray(sel)) {
                              return sel.map((opt, i) => <p key={i}>â€¢ {opt.name}</p>);
                            } else if (sel) {
                              return <p key={groupId}>â€¢ {sel.name}</p>;
                            }
                            return null;
                          })}
                        </div>
                      )}
                      

                      {item.observations && (
                        <p className="ml-2 text-xs text-gray-600 italic mt-1">
                          ðŸ“ {item.observations}
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
                  {canAlterPrepPerOrder && (
                    <div className="flex items-center gap-2 mb-2 bg-white p-2 rounded border flex-wrap">
                      <Timer className="w-4 h-4 text-gray-600" />
                      <span className="text-xs">Tempo de preparo:</span>
                      <select 
                        value={prepTime}
                        onChange={(e) => setPrepTime(parseInt(e.target.value))}
                        className="border rounded px-2 py-1 text-xs font-medium min-h-[52px] focus:border-gray-800 focus:ring-1 focus:ring-gray-800/20 focus:outline-none"
                      >
                        {[10,15,20,25,30,40,45,60,90].map(m => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </select>
                      {suggestedPrepTime && suggestedPrepTime !== prepTime && (
                        <button type="button" onClick={() => setPrepTime(suggestedPrepTime)} className="text-[10px] text-blue-600 underline">Sugerido: {suggestedPrepTime}min</button>
                      )}
                    </div>
                  )}
                  {!canAlterPrepPerOrder && (
                    <p className="text-xs text-gray-500 mb-2">Tempo de preparo: {suggestedPrepTime || 30} min (padrÃ£o)</p>
                  )}
                  <Button 
                    onClick={handleAccept} 
                    className="rounded w-full bg-green-600 hover:bg-green-700 h-12 font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-100"
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
                    className="rounded w-full border-red-300 text-red-600 hover:bg-red-50 h-10 uppercase font-bold transition-all duration-100"
                    disabled={updateMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                  </Button>
                </>
              )}

              {order.status === 'accepted' && (
                <Button onClick={handleNextStatus} className="rounded w-full bg-yellow-600 hover:bg-yellow-700 h-12 font-semibold transition-all duration-100">
                  <ChefHat className="w-5 h-5 mr-2" /> Iniciar Preparo
                </Button>
              )}

              {order.status === 'preparing' && (
                <Button onClick={handleNextStatus} className="rounded w-full bg-green-600 hover:bg-green-700 h-12 font-semibold transition-all duration-100">
                  <CheckCircle className="w-5 h-5 mr-2" /> Marcar como Pronto
                </Button>
              )}

              {order.status === 'ready' && order.delivery_method === 'delivery' && (
                <Button onClick={() => setShowDeliveryModal(true)} className="rounded w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold transition-all duration-100">
                  <Truck className="w-5 h-5 mr-2" /> Chamar Entregador
                </Button>
              )}

              {/* CÃ³digos exibidos no cabeÃ§alho do modal */}

              {order.status === 'ready' && order.delivery_method === 'pickup' && (
                <Button onClick={handleNextStatus} className="rounded w-full bg-green-600 hover:bg-green-700 h-12 font-semibold transition-all duration-100">
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
<Button onClick={handleNextStatus} className="rounded w-full bg-green-600 hover:bg-green-700 h-12 font-semibold transition-all duration-100">
                  <CheckCircle className="w-5 h-5 mr-2" /> Confirmar Entrega
                </Button>
                </>
              )}

              {/* Status rÃ¡pido: botÃµes em destaque para toque */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-gray-200">
                <Button
                  size="sm"
                  variant={order.status === 'new' ? 'default' : 'outline'}
                  className="min-h-touch bg-green-600 hover:bg-green-700 text-white border-0"
                  disabled={order.status !== 'new' || updateMutation.isPending}
                  onClick={() => { const p = canAlterPrepPerOrder ? prepTime : (suggestedPrepTime || 30); updateMutation.mutate({ id: order.id, updates: { status: 'accepted', accepted_at: new Date().toISOString(), prep_time: p } }); }}
                >
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant={['accepted', 'preparing'].includes(order.status) ? 'default' : 'outline'}
                  className="min-h-touch bg-yellow-600 hover:bg-yellow-700 text-white border-0"
                  disabled={!['accepted', 'preparing'].includes(order.status) || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: order.id, updates: { status: 'preparing' } })}
                >
                  Preparo
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'ready' ? 'default' : 'outline'}
                  className="min-h-touch bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                  disabled={!['accepted', 'preparing'].includes(order.status) || updateMutation.isPending}
                  onClick={() => {
                    const u = { status: 'ready', ready_at: new Date().toISOString() };
                    if (!order.pickup_code) u.pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
                    if (!order.delivery_code && order.delivery_method === 'delivery') u.delivery_code = Math.floor(1000 + Math.random() * 9000).toString();
                    updateMutation.mutate({ id: order.id, updates: u });
                  }}
                >
                  Pronto
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'out_for_delivery' ? 'default' : 'outline'}
                  className="min-h-touch bg-blue-600 hover:bg-blue-700 text-white border-0"
                  disabled={!['ready', 'picked_up'].includes(order.status) || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: order.id, updates: { status: 'out_for_delivery' } })}
                >
                  Saiu
                </Button>
                <Button
                  size="sm"
                  variant={order.status === 'delivered' ? 'default' : 'outline'}
                  className="min-h-touch bg-gray-700 hover:bg-gray-800 text-white border-0"
                  disabled={!['ready', 'out_for_delivery', 'arrived_at_customer'].includes(order.status) || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: order.id, updates: { status: 'delivered', delivered_at: new Date().toISOString() } })}
                >
                  Entregue
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm" className="rounded uppercase font-bold transition-all duration-100 min-h-touch">
                  <Printer className="w-4 h-4 mr-1" /> Imprimir
                </Button>
                {onAddToPrintQueue && (
                  <Button onClick={onAddToPrintQueue} variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-1" /> Na fila
                  </Button>
                )}
                {order.customer_phone && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { const p = order.customer_phone?.replace(/\D/g, ''); const msg = `OlÃ¡! Seu pedido #${order.order_code || order.id} estÃ¡: ${order.status}.`; window.open(`https://wa.me/55${p}?text=${encodeURIComponent(msg)}`, '_blank'); }}>
                      <Send className="w-4 h-4 mr-1" /> Enviar status
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/55${order.customer_phone?.replace(/\D/g, '')}`, '_blank')}>
                      <MessageSquare className="w-4 h-4 mr-1" /> WhatsApp
                    </Button>
                  </>
                )}
                {onViewMap && order.delivery_method === 'delivery' && order.address && (
                  <Button onClick={onViewMap} variant="outline" size="sm">
                    <MapPin className="w-4 h-4 mr-1" /> Ver no mapa
                  </Button>
                )}
                {onDuplicate && (
                  <Button onClick={() => onDuplicate(order)} variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-1" /> Duplicar
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">1â€“4: atalhos de status | Esc: fechar</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            <DialogTitle className="font-bold text-lg text-red-600">âš ï¸ Rejeitar Pedido</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Tem certeza? Selecione o motivo da rejeiÃ§Ã£o. Esta aÃ§Ã£o nÃ£o pode ser desfeita.
            </DialogDescription>
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
                <label className={`text-sm font-medium mb-2 block ${customRejectionError ? 'text-red-500' : 'text-gray-700'}`}>
                  Descreva o motivo *
                </label>
                <Textarea
                  value={customRejectionReason}
                  onChange={(e) => { setCustomRejectionReason(e.target.value); setCustomRejectionError(false); }}
                  placeholder="Ex: Cliente solicitou cancelamento..."
                  rows={3}
                  className={`resize-none min-h-[52px] focus:outline-none focus:ring-1 focus:ring-gray-800/20 focus:border-gray-800 ${customRejectionError ? 'border-2 border-red-500' : ''}`}
                />
                <p className={`text-xs mt-1 ${customRejectionError ? 'text-red-500' : 'text-gray-500'}`}>
                  MÃ­nimo de 5 caracteres
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setCustomRejectionReason('');
                  setCustomRejectionError(false);
                }} 
                className="flex-1 bg-[#a6a6a5] hover:bg-[#929290] text-white border-0 rounded transition-all duration-100"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleReject} 
                disabled={!rejectionReason || updateMutation.isPending} 
                className="rounded flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all duration-100"
              >
                {updateMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Confirmar RejeiÃ§Ã£o'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reprovar alteraÃ§Ã£o do cliente */}
      <Dialog open={showRejectChangeModal} onOpenChange={(open) => { setShowRejectChangeModal(open); if (!open) setChangeRejectMotivo(''); }}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            <DialogTitle className="font-bold text-lg text-amber-700">Reprovar alteraÃ§Ã£o solicitada</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Informe um breve motivo para o cliente (mÃ­n. 3 caracteres). Ex.: &quot;Ingrediente indisponÃ­vel&quot;.
            </DialogDescription>
            <Textarea
              value={changeRejectMotivo}
              onChange={(e) => setChangeRejectMotivo(e.target.value)}
              placeholder="Motivo da reprovaÃ§Ã£o..."
              rows={3}
              className="resize-none min-h-[52px] focus:border-gray-800 focus:ring-1 focus:ring-gray-800/20 focus:outline-none"
            />
            <div className="flex gap-3">
              <Button onClick={() => { setShowRejectChangeModal(false); setChangeRejectMotivo(''); }} className="flex-1 bg-[#a6a6a5] hover:bg-[#929290] text-white border-0 rounded transition-all duration-100">
                Cancelar
              </Button>
              <Button onClick={handleRejectChangeRequest} disabled={(changeRejectMotivo || '').trim().length < 3} className="rounded flex-1 bg-amber-600 hover:bg-amber-700 transition-all duration-100">
                Reprovar alteraÃ§Ã£o
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <div className="space-y-4">
            <DialogTitle className="font-bold text-lg">Chamar Entregador</DialogTitle>
            {availableEntregadores.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Nenhum entregador disponÃ­vel</p>
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
                  <Button onClick={() => setShowDeliveryModal(false)} className="flex-1 bg-[#a6a6a5] hover:bg-[#929290] text-white border-0 rounded transition-all duration-100">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAssignDelivery} 
                    disabled={!selectedEntregador || updateMutation.isPending} 
                    className="rounded flex-1 bg-blue-600 disabled:opacity-50 transition-all duration-100"
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


