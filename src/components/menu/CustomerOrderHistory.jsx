import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  new: { label: 'Novo', color: 'bg-red-500', icon: Clock },
  accepted: { label: 'Aceito', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'Preparando', color: 'bg-yellow-500', icon: Clock },
  ready: { label: 'Pronto', color: 'bg-green-500', icon: CheckCircle },
  out_for_delivery: { label: 'Em Entrega', color: 'bg-blue-500', icon: Truck },
  delivered: { label: 'Entregue', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-400', icon: XCircle },
};

export default function CustomerOrderHistory({ userEmail, onBack, onReorder, darkMode, primaryColor }) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customerOrders', userEmail],
    queryFn: () => base44.entities.Order.filter({ customer_email: userEmail }, '-created_date', 50),
    enabled: !!userEmail,
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const handleReorder = (order) => {
    if (onReorder) {
      onReorder(order.items);
    }
    setSelectedOrder(null);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm sticky top-0 z-40`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg sm:text-xl">Meus Pedidos</h1>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{orders.length} pedidos</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Nenhum pedido ainda
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Seus pedidos aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
              const StatusIcon = status.icon;

              return (
                <div 
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-bold text-sm">
                        #{order.order_code || order.id?.slice(-6).toUpperCase()}
                      </span>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {order.created_date && format(new Date(order.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge className={status.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>

                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'itens'}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
                    <span className="font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(order.total)}
                    </span>
                    <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className={`max-w-lg mx-4 max-h-[80vh] overflow-y-auto ${darkMode ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrder?.order_code || selectedOrder?.id?.slice(-6).toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_CONFIG[selectedOrder.status]?.color || 'bg-gray-500'}>
                  {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selectedOrder.created_date && format(new Date(selectedOrder.created_date), "dd/MM/yyyy 'às' HH:mm")}
                </span>
              </div>

              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-3`}>
                <h4 className="font-medium mb-2 text-sm">Itens</h4>
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: darkMode ? '#4b5563' : '#e5e7eb' }}>
                    <div>
                      <p className="font-medium text-sm">{item.quantity || 1}x {item.dish?.name || 'Item'}</p>
                      {item.selections && Object.keys(item.selections).length > 0 && (
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {Object.values(item.selections).map((sel, i) => {
                            if (Array.isArray(sel)) return sel.map(s => s.name).join(', ');
                            return sel?.name;
                          }).filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium">{formatCurrency((item.totalPrice || 0) * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Desconto</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                {selectedOrder.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Entrega</span>
                    <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ borderColor: darkMode ? '#4b5563' : '#e5e7eb' }}>
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              <Button 
                onClick={() => handleReorder(selectedOrder)}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Pedir Novamente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}