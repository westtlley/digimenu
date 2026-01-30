import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, Edit, Package, Clock, ChefHat, CheckCircle, Truck, MapPin, Ban, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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
  const [showRatingModal, setShowRatingModal] = useState(null);
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const prevOrdersRef = useRef([]);
  const queryClient = useQueryClient();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * (item.quantity || 1), 0);

  // Buscar pedidos do cliente autenticado (incluindo entregues recentemente)
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customerOrdersInCart'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user || !user.email) {
          console.log('❌ Usuário não autenticado ou sem email');
          return [];
        }

        console.log('🔍 Buscando pedidos para:', user.email);
        const allOrders = await base44.entities.Order.list('-created_date');
        console.log('📦 Total de pedidos no sistema:', allOrders.length);
        
        // Filtrar apenas pedidos do cliente que não estão finalizados ou cancelados
        // Mas também incluir entregues recentemente (últimas 5 horas) para avaliação
        const fiveHoursAgo = new Date();
        fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
        
        const customerOrders = allOrders.filter(o => {
          // Verificar se é pedido do cliente (por email ou telefone)
          const isCustomerByEmail = o.customer_email === user.email || o.created_by === user.email;
          
          // Caso o cliente não esteja autenticado, também buscar por telefone
          // (se o telefone do usuário estiver disponível no perfil)
          const isCustomerByPhone = user.phone && o.customer_phone && 
            o.customer_phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '');
          
          const isCustomerOrder = isCustomerByEmail || isCustomerByPhone;
          
          // Incluir pedidos ativos (não entregues nem cancelados)
          const isActive = o.status !== 'delivered' && o.status !== 'cancelled';
          
          // Incluir pedidos entregues recentemente (para avaliação)
          const isDeliveredRecently = o.status === 'delivered' && 
            o.delivered_at && 
            new Date(o.delivered_at) > fiveHoursAgo && 
            !o.restaurant_rating;
          
          return isCustomerOrder && (isActive || isDeliveredRecently);
        });

        console.log('✅ Pedidos do cliente encontrados:', customerOrders.length);
        if (customerOrders.length > 0) {
          console.log('📋 IDs dos pedidos:', customerOrders.map(o => `#${o.order_code} (${o.status})`).join(', '));
        }
        
        return customerOrders;
      } catch (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        return [];
      }
    },
    enabled: isOpen,
    refetchInterval: 2000, // ⚡ Atualizar a cada 2 segundos (tempo real)
    refetchOnWindowFocus: true, // Atualizar quando voltar para a aba
    refetchOnMount: true // Atualizar ao abrir o modal
  });

  // Detectar mudanças de status em tempo real e notificar o cliente
  useEffect(() => {
    if (!isOpen || ordersLoading || orders.length === 0) return;

    const prevOrders = prevOrdersRef.current;

    // Detectar pedidos entregues (para modal de avaliação)
    const currentDelivered = orders.filter(o => o.status === 'delivered' && !o.restaurant_rating);
    const prevDelivered = prevOrders.filter(o => o.status === 'delivered' && !o.restaurant_rating);

    const newDelivered = currentDelivered.find(o => 
      !prevDelivered.find(p => p.id === o.id)
    );

    if (newDelivered && !showRatingModal) {
      setTimeout(() => {
        setShowRatingModal(newDelivered);
      }, 1000);
    }

    // Detectar mudanças de status (para notificação)
    if (prevOrders.length > 0) {
      orders.forEach(order => {
        const prevOrder = prevOrders.find(p => p.id === order.id);
        
        // Se o pedido existia antes e mudou de status
        if (prevOrder && prevOrder.status !== order.status) {
          const config = statusConfig[order.status];
          const Icon = config?.icon || Clock;
          
          console.log(`🔔 Status atualizado: Pedido #${order.order_code} → ${config?.label || order.status}`);
          
          // Notificação visual
          toast.success(
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              <div>
                <p className="font-bold">Status atualizado!</p>
                <p className="text-sm">Pedido #{order.order_code}: {config?.label || order.status}</p>
              </div>
            </div>,
            {
              duration: 4000,
              position: 'top-center',
              style: {
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }
            }
          );

          // Som de notificação (apenas para status importantes)
          if (['ready', 'out_for_delivery', 'arrived_at_customer', 'delivered'].includes(order.status)) {
            try {
              const audio = new Audio('/notification.mp3'); // Você pode adicionar um arquivo de áudio
              audio.volume = 0.5;
              audio.play().catch(() => {}); // Ignorar erro se não tiver permissão
            } catch (e) {
              // Silenciosamente ignorar se não conseguir tocar o som
            }
          }
        }
      });
    }

    prevOrdersRef.current = orders;
  }, [orders, ordersLoading, isOpen, showRatingModal]);

  // Mutation para salvar avaliação
  const submitRatingMutation = useMutation({
    mutationFn: async ({ orderId, ratings }) => {
      const order = orders.find(o => o.id === orderId);
      
      // Criar avaliação do entregador se houver
      if (order.entregador_id && ratings.deliveryRating > 0) {
        try {
          await base44.entities.DeliveryRating.create({
            order_id: orderId,
            entregador_id: order.entregador_id,
            rating: ratings.deliveryRating,
            comment: ratings.comment,
            rated_by: 'customer'
          });
        } catch (e) {
          console.log('Erro ao criar avaliação do entregador:', e);
        }
      }
      
      // Salvar avaliação do restaurante no pedido
      await base44.entities.Order.update(orderId, {
        ...order,
        restaurant_rating: ratings.restaurantRating,
        rating_comment: ratings.comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerOrdersInCart'] });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      queryClient.invalidateQueries({ queryKey: ['customerOrders'] });
      setShowRatingModal(null);
      setRestaurantRating(0);
      setDeliveryRating(0);
      setComment('');
      toast.success('Avaliação enviada! Obrigado pelo feedback.');
    },
    onError: (error) => {
      console.error('Erro ao enviar avaliação:', error);
      toast.error('Erro ao enviar avaliação. Tente novamente.');
    }
  });

  const handleSubmitRating = () => {
    if (restaurantRating === 0) {
      toast.error('Por favor, avalie o restaurante');
      return;
    }
    
    submitRatingMutation.mutate({
      orderId: showRatingModal.id,
      ratings: {
        restaurantRating,
        deliveryRating: showRatingModal.delivery_method === 'delivery' ? deliveryRating : 0,
        comment
      }
    });
  };

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
              <span className="flex items-center justify-center gap-2">
                Meus Pedidos
                {activeTab === 'orders' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded uppercase">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </span>
              {orders.length > 0 && (
                <span className={`absolute top-1 right-2 w-5 h-5 ${statusConfig[orders[0]?.status]?.color || 'bg-red-500'} text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse`}>
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
                <div className="text-center py-12 px-4">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }} />
                  <p className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nenhum pedido ativo
                  </p>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Seus pedidos em andamento aparecerão aqui com atualização em tempo real
                  </p>
                  <div className={`text-xs p-3 rounded-lg ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                    💡 Faça um pedido e acompanhe o status em tempo real!
                  </div>
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

                      {/* Botão de Avaliação para pedidos entregues */}
                      {order.status === 'delivered' && !order.restaurant_rating && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: darkMode ? '#4b5563' : '#e5e7eb' }}>
                          <button
                            onClick={() => setShowRatingModal(order)}
                            className={`w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
                            style={{ 
                              backgroundColor: primaryColor,
                              color: 'white'
                            }}
                          >
                            <Star className="w-4 h-4 fill-current" />
                            Avaliar Pedido
                          </button>
                        </div>
                      )}

                      {/* Mostrar avaliação já feita */}
                      {order.status === 'delivered' && order.restaurant_rating && (
                        <div className={`mt-3 pt-3 border-t flex items-center justify-center gap-1 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Avaliado: {order.restaurant_rating}/5
                          </span>
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

      {/* Modal de Avaliação */}
      {showRatingModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowRatingModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
          >
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Avalie sua experiência
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Pedido #{showRatingModal.order_code || showRatingModal.id?.slice(-6)}
            </p>
            
            {/* Restaurante */}
            <div className="space-y-2 mb-4">
              <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Restaurante *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRestaurantRating(star)}
                    className="text-3xl transition-transform hover:scale-110"
                  >
                    {star <= restaurantRating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Entregador */}
            {showRatingModal.delivery_method === 'delivery' && (
              <div className="space-y-2 mb-4">
                <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Entregador (opcional)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setDeliveryRating(star)}
                      className="text-3xl transition-transform hover:scale-110"
                    >
                      {star <= deliveryRating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comentário */}
            <div className="space-y-2 mb-4">
              <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Comentário (opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos sobre sua experiência..."
                className={`w-full p-3 border rounded-lg resize-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowRatingModal(null)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={restaurantRating === 0 || submitRatingMutation.isPending}
                className="flex-1 text-white"
                style={{ 
                  backgroundColor: (restaurantRating === 0 || submitRatingMutation.isPending) ? '#d1d5db' : primaryColor 
                }}
              >
                {submitRatingMutation.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}