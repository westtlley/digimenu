import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, Edit, Package, Clock, ChefHat, CheckCircle, Truck, MapPin, Ban } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { format } from 'date-fns';

const statusConfig = {
  new: { label: 'Novo', color: 'bg-blue-500', icon: Clock },
  accepted: { label: 'Aceito', color: 'bg-green-500', icon: Package },
  preparing: { label: 'Preparando', color: 'bg-yellow-500', icon: ChefHat },
  ready: { label: 'Pronto', color: 'bg-purple-500', icon: CheckCircle },
  going_to_store: { label: 'Entregador indo ao Restaurante', color: 'bg-blue-400', icon: Truck },
  arrived_at_store: { label: 'Entregador no Restaurante', color: 'bg-blue-500', icon: Package },
  picked_up: { label: 'Pedido Coletado', color: 'bg-green-500', icon: Package },
  out_for_delivery: { label: 'Saiu para Entrega', color: 'bg-indigo-500', icon: Truck },
  arrived_at_customer: { label: 'Entregador Chegou', color: 'bg-green-500', icon: MapPin },
  delivered: { label: 'Entregue', color: 'bg-green-600', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: Ban }
};

export default function CartModal({ isOpen, onClose, cart, onUpdateQuantity, onRemoveItem, onCheckout, onEditItem, onEditPizza, darkMode = false, primaryColor = '#f97316' }) {
  const [activeTab, setActiveTab] = useState('cart'); // 'cart' ou 'orders'

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * (item.quantity || 1), 0);

  // Buscar pedidos do cliente autenticado
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customerOrdersInCart'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const allOrders = await base44.entities.Order.list('-created_date');
        // Filtrar apenas pedidos do cliente que não estão finalizados ou cancelados
        return allOrders.filter(o => 
          (o.customer_email === user.email || o.created_by === user.email) &&
          o.status !== 'delivered' && 
          o.status !== 'cancelled'
        );
      } catch {
        return [];
      }
    },
    enabled: isOpen,
    refetchInterval: 3000 // Atualizar a cada 3 segundos
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center md:items-stretch md:justify-end justify-center p-4 md:p-0"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} md:rounded-none rounded-2xl shadow-2xl w-full md:w-[400px] max-w-lg md:max-w-none h-auto md:h-full max-h-[85vh] md:max-h-none overflow-hidden flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Carrinho</h2>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
            <button
              onClick={() => setActiveTab('cart')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'cart'
                  ? darkMode ? 'text-white border-b-2' : 'text-gray-900 border-b-2'
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === 'cart' ? { borderBottomColor: primaryColor } : {}}
            >
              Carrinho {cart.length > 0 && `(${cart.length})`}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'orders'
                  ? darkMode ? 'text-white border-b-2' : 'text-gray-900 border-b-2'
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === 'orders' ? { borderBottomColor: primaryColor } : {}}
            >
              Meus Pedidos {orders.length > 0 && (
                <span className={`absolute top-1 right-2 w-5 h-5 ${statusConfig[orders[0]?.status]?.color || 'bg-red-500'} text-white text-xs rounded-full flex items-center justify-center font-bold`}>
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTab === 'cart' ? (
              // Carrinho
              cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }} />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Carrinho vazio</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className={`flex gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    {/* Image */}
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                      {item.dish?.image ? (
                        <img src={item.dish.image} alt={item.dish.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Sem foto
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.dish?.name}
                      </h3>
                      {item.selections && Object.keys(item.selections).length > 0 && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'} line-clamp-2`}>
                          {Object.values(item.selections).map(sel => {
                            if (Array.isArray(sel)) return sel.map(s => s.name).join(', ');
                            return sel.name;
                          }).filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-sm" style={{ color: primaryColor }}>
                          {formatCurrency(item.totalPrice)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`text-sm font-medium w-6 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.quantity || 1}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          if (item.dish?.product_type === 'pizza' && onEditPizza) {
                            onEditPizza(item);
                          } else {
                            onEditItem(item);
                          }
                        }}
                        className={`p-1 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Pedidos do Cliente
              ordersLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }} />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Carregando pedidos...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }} />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Nenhum pedido ativo</p>
                </div>
              ) : (
                orders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.new;
                  const StatusIcon = status.icon;

                  return (
                    <div key={order.id} className={`rounded-xl p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      {/* Header do Pedido */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Pedido #{order.order_code || order.id?.slice(-6)}
                          </p>
                          {order.created_date && (
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {format(new Date(order.created_date), 'dd/MM/yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        <Badge className={`${status.color} text-white flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </div>

                      {/* Itens do Pedido */}
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className={`text-xs border-l-2 pl-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {item.quantity || 1}x
                                </span>
                                <span className={`font-semibold flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.dish?.name}
                                </span>
                                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {formatCurrency(item.totalPrice * (item.quantity || 1))}
                                </span>
                              </div>
                              {item.selections && Object.keys(item.selections).length > 0 && (
                                <div className={`ml-5 mt-1 space-y-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
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
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Total e Endereço */}
                      <div className={`flex items-center justify-between pt-3 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</span>
                        <span className="font-bold text-base" style={{ color: primaryColor }}>
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      {order.delivery_method === 'delivery' && order.address && (
                        <div className={`mt-2 text-xs flex items-start gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Truck className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{order.address}</span>
                        </div>
                      )}

                      {order.status === 'arrived_at_customer' && order.delivery_code && (
                        <div className={`mt-3 rounded-lg p-3 text-center border-2 ${darkMode ? 'bg-yellow-900/20 border-yellow-600' : 'bg-yellow-100 border-yellow-400'}`}>
                          <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                            Código de Validação
                          </p>
                          <p className={`text-2xl font-bold tracking-widest ${darkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>
                            {order.delivery_code}
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                            Forneça ao entregador
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer - Apenas para a aba do carrinho */}
          {activeTab === 'cart' && cart.length > 0 && (
            <div className={`border-t p-4 space-y-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</span>
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Continuar
                </Button>
                <Button
                  onClick={onCheckout}
                  className="flex-1 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Finalizar Pedido
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}