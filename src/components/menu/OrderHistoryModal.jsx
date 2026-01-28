import React from 'react';
import { X, Clock, Package, Truck, CheckCircle, Ban, Settings, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const statusConfig = {
  new: { label: 'Novo', color: 'bg-blue-500', icon: Clock },
  accepted: { label: 'Aceito', color: 'bg-green-500', icon: Package },
  preparing: { label: 'Preparando', color: 'bg-yellow-500', icon: Package },
  ready: { label: 'Pronto', color: 'bg-purple-500', icon: CheckCircle },
  going_to_store: { label: 'Entregador indo ao Restaurante', color: 'bg-blue-400', icon: Truck },
  arrived_at_store: { label: 'Entregador no Restaurante', color: 'bg-blue-500', icon: Package },
  picked_up: { label: 'Pedido Coletado', color: 'bg-green-500', icon: Package },
  out_for_delivery: { label: 'Saiu para Entrega', color: 'bg-indigo-500', icon: Truck },
  arrived_at_customer: { label: 'Entregador Chegou', color: 'bg-green-500', icon: MapPin },
  delivered: { label: 'Entregue', color: 'bg-green-600', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: Ban }
};

export default function OrderHistoryModal({ isOpen, onClose, primaryColor = '#f97316' }) {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showRatingModal, setShowRatingModal] = React.useState(null);
  const [restaurantRating, setRestaurantRating] = React.useState(0);
  const [deliveryRating, setDeliveryRating] = React.useState(0);
  const [comment, setComment] = React.useState('');

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user?.role === 'admin');
        const allOrders = await base44.entities.Order.list('-created_date');
        return allOrders.filter(o => o.customer_email === user.email || o.created_by === user.email);
      } catch {
        return [];
      }
    },
    enabled: isOpen,
    refetchInterval: 3000
  });

  const submitRatingMutation = useMutation({
    mutationFn: async ({ orderId, ratings }) => {
      const order = orders.find(o => o.id === orderId);
      
      // Criar avaliação do entregador se houver
      if (order.entregador_id && ratings.deliveryRating > 0) {
        await base44.entities.DeliveryRating.create({
          order_id: orderId,
          entregador_id: order.entregador_id,
          rating: ratings.deliveryRating,
          comment: ratings.comment,
          rated_by: 'customer'
        });
      }
      
      // Salvar avaliação do restaurante no pedido
      await base44.entities.Order.update(orderId, {
        ...order,
        restaurant_rating: ratings.restaurantRating,
        rating_comment: ratings.comment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      setShowRatingModal(null);
      setRestaurantRating(0);
      setDeliveryRating(0);
      setComment('');
      alert('Avaliação enviada! Obrigado pelo feedback.');
    }
  });

  const handleSubmitRating = () => {
    if (restaurantRating === 0) {
      alert('Por favor, avalie o restaurante');
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (!isOpen) return null;

  return (
    <>
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
            className="bg-white md:rounded-none rounded-2xl shadow-2xl w-full md:w-[400px] max-w-lg md:max-w-none h-auto md:h-full max-h-[85vh] md:max-h-none overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: primaryColor }} />
                <h2 className="text-lg font-bold text-gray-900">Meus Pedidos</h2>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link to={createPageUrl('Admin')}>
                    <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Acessar Admin">
                      <Settings className="w-5 h-5 text-gray-600" />
                    </button>
                  </Link>
                )}
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-gray-500">Nenhum pedido encontrado</p>
                </div>
              ) : (
                orders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.new;
                  const StatusIcon = status.icon;

                  return (
                    <div key={order.id} className="bg-gray-50 rounded-xl p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-sm">Pedido #{order.order_code || order.id?.slice(-6)}</p>
                          <p className="text-xs text-gray-500">
                            {order.created_date && format(new Date(order.created_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${status.color} text-white flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {order.status === 'delivered' && !order.restaurant_rating && (
                            <button
                              onClick={() => setShowRatingModal(order)}
                              className="text-xs px-3 py-1 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors"
                            >
                              ⭐ Avaliar
                            </button>
                          )}
                          {order.restaurant_rating && (
                            <span className="text-xs text-amber-600">
                              ⭐ {order.restaurant_rating}/5
                            </span>
                          )}
                        </div>
                      </div>

                      {order.status === 'arrived_at_customer' && order.delivery_code && (
                        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 mb-3 text-center">
                          <p className="text-xs text-yellow-800 font-medium mb-1">Código de Validação</p>
                          <p className="text-2xl font-bold text-yellow-900 tracking-widest">
                            {order.delivery_code}
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Forneça ao entregador
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 mb-3">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="text-xs border-l-2 border-gray-300 pl-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-medium">{item.quantity || 1}x</span>
                              <span className="text-gray-900 font-semibold flex-1">{item.dish?.name}</span>
                              <span className="text-gray-900 font-medium">
                                {formatCurrency(item.totalPrice * (item.quantity || 1))}
                              </span>
                            </div>
                            {item.selections && Object.keys(item.selections).length > 0 && (
                              <div className="ml-5 mt-1 space-y-0.5 text-gray-600">
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

                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="font-bold text-base" style={{ color: primaryColor }}>
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      {order.delivery_method === 'delivery' && order.address && (
                        <div className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                          <Truck className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{order.address}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Rating Modal */}
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
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-2">Avalie sua experiência</h3>
            <p className="text-sm text-gray-600 mb-4">Pedido #{showRatingModal.order_code}</p>
            
            {/* Restaurante */}
            <div className="space-y-2 mb-4">
              <label className="font-medium">Restaurante</label>
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
                <label className="font-medium">Entregador</label>
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
              <label className="font-medium">Comentário (opcional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos sobre sua experiência..."
                className="w-full p-3 border rounded-lg resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={restaurantRating === 0 || submitRatingMutation.isPending}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {submitRatingMutation.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}