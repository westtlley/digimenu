import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Package, Clock, X } from 'lucide-react';
import { formatBrazilianDateTime, formatScheduledDateTime } from '../utils/dateUtils';

const STATUS_CONFIG = {
  new: { label: 'Novo', color: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Aceito', color: 'bg-purple-100 text-purple-800' },
  preparing: { label: 'Preparando', color: 'bg-yellow-100 text-yellow-800' },
  ready: { label: 'Pronto', color: 'bg-green-100 text-green-800' },
  out_for_delivery: { label: 'Saiu p/ Entrega', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Entregue', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

const PAYMENT_LABELS = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

export default function CustomerOrdersHistory({ userEmail }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['myOrders', userEmail],
    queryFn: () => base44.entities.Order.filter({ created_by: userEmail }, '-created_date'),
    enabled: !!userEmail,
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum pedido ainda</h3>
        <p className="text-gray-400">Seus pedidos aparecerão aqui</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Meus Pedidos</h2>
        
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    #{order.order_code || order.id.slice(-6).toUpperCase()}
                  </span>
                  <Badge className={STATUS_CONFIG[order.status || 'new'].color}>
                    {STATUS_CONFIG[order.status || 'new'].label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {order.created_date && formatBrazilianDateTime(order.created_date)}
                </p>
              </div>
              <span className="font-bold text-green-600">{formatCurrency(order.total)}</span>
            </div>

            <div className="text-sm text-gray-600">
              <p><span className="text-gray-400">Itens:</span> {(order.items || []).length}</p>
              <p><span className="text-gray-400">Tipo:</span> {order.delivery_method === 'delivery' ? 'Entrega 🚴' : 'Retirada 🏪'}</p>
              {order.address && <p className="text-xs mt-1">📍 {order.address}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog open={true} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-500 text-white p-4 z-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-lg">COMANDA</h2>
                <button onClick={() => setSelectedOrder(null)} className="text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm opacity-90">
                Pedido #{selectedOrder.order_code || selectedOrder.id.slice(-6).toUpperCase()}
              </p>
              <p className="text-xs opacity-75">
                {formatBrazilianDateTime(selectedOrder.created_date)}
              </p>
            </div>

            <div className="p-4 space-y-4 font-mono text-sm">
              {/* Client Info */}
              <div>
                <p className="font-bold mb-1">Cliente: {selectedOrder.customer_name}</p>
                <p>Contato: {selectedOrder.customer_phone}</p>
                <p>Tipo: {selectedOrder.delivery_method === 'delivery' ? 'Entrega 🚴' : 'Retirada 🏪'}</p>
                {selectedOrder.address && <p>Endereço: {selectedOrder.address}</p>}
                <p>Pagamento: {PAYMENT_LABELS[selectedOrder.payment_method] || selectedOrder.payment_method}</p>
                {selectedOrder.payment_method === 'dinheiro' && selectedOrder.needs_change && (
                  <p className="text-orange-600">
                    Troco para: {formatCurrency(selectedOrder.change_amount)} 
                    (Troco: {formatCurrency(selectedOrder.change_amount - selectedOrder.total)})
                  </p>
                )}
                {selectedOrder.scheduled_date && selectedOrder.scheduled_time && (
                  <p className="text-blue-600 font-bold mt-2">
                    ⏰ AGENDADO: {formatScheduledDateTime(selectedOrder.scheduled_date, selectedOrder.scheduled_time)}
                  </p>
                )}
              </div>

              {/* Delivery Code - só mostra quando entregador sair para entrega */}
              {selectedOrder.delivery_method === 'delivery' && 
               selectedOrder.delivery_code && 
               selectedOrder.status === 'out_for_delivery' && (
                <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-3">
                  <p className="text-xs text-orange-700 mb-1">CÓDIGO DE ENTREGA:</p>
                  <p className="text-3xl font-bold text-center text-orange-600 tracking-widest">
                    {selectedOrder.delivery_code}
                  </p>
                  <p className="text-xs text-orange-600 mt-1 text-center">
                    Informe este código ao entregador
                  </p>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="font-bold mb-2">--- Pedido ---</p>
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="mb-3">
                    <p className="font-bold">#{idx + 1} - {item.dish?.name} x{item.quantity || 1}</p>
                    {item.selections && Object.keys(item.selections).length > 0 && (
                      <div className="ml-2 text-xs text-gray-600">
                        {Object.entries(item.selections).map(([groupId, sel]) => {
                          if (Array.isArray(sel)) {
                            return <p key={groupId}>{sel.map(opt => opt.name).join(', ')}</p>;
                          } else if (sel) {
                            return <p key={groupId}>{sel.name}</p>;
                          }
                          return null;
                        })}
                      </div>
                    )}
                    <p>Valor: {formatCurrency(item.totalPrice * (item.quantity || 1))}</p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-2">
                <p>Subtotal itens: {formatCurrency(selectedOrder.subtotal)}</p>
                {selectedOrder.delivery_fee > 0 && (
                  <p>Taxa de entrega: {formatCurrency(selectedOrder.delivery_fee)}</p>
                )}
                {selectedOrder.discount > 0 && (
                  <p className="text-green-600">Desconto: -{formatCurrency(selectedOrder.discount)}</p>
                )}
                <p className="font-bold text-lg mt-1">TOTAL: {formatCurrency(selectedOrder.total)}</p>
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-500 text-center pt-3 border-t">
                Enviado em {formatBrazilianDateTime(selectedOrder.created_date)}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}