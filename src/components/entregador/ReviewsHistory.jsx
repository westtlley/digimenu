import React from 'react';
import { X, Star, MessageSquare, Calendar, ThumbsUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ReviewsHistory({ entregador, onClose, darkMode }) {
  const { data: ratings = [] } = useQuery({
    queryKey: ['deliveryRatings', entregador.id],
    queryFn: () => base44.entities.DeliveryRating.filter({ entregador_id: entregador.id }, '-created_date'),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['ratedOrders', entregador.id],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.filter({ 
        entregador_id: entregador.id,
        status: 'delivered'
      });
      return allOrders.filter(o => o.restaurant_rating || o.rating_comment);
    },
  });

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
    : '5.0';

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => r.rating === star).length,
    percentage: ratings.length > 0 ? (ratings.filter(r => r.rating === star).length / ratings.length) * 100 : 0
  }));

  const allReviews = [
    ...ratings.map(r => ({
      ...r,
      type: 'delivery',
      date: r.created_date,
      rating: r.rating,
      comment: r.comment
    })),
    ...orders.map(o => ({
      ...o,
      type: 'restaurant',
      date: o.delivered_at,
      rating: o.restaurant_rating,
      comment: o.rating_comment
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-2xl max-h-[90vh] ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Histórico de Avaliações</h2>
              <p className="text-white/80 text-sm">Suas avaliações de clientes e restaurantes</p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500">{avgRating}</div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(parseFloat(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-500">Média Geral</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">{allReviews.length}</div>
              <p className="text-xs text-gray-500 mt-2">Total de Avaliações</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">
                {allReviews.filter(r => r.rating >= 4).length}
              </div>
              <p className="text-xs text-gray-500 mt-2">Positivas</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{star}</span>
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="overflow-y-auto max-h-[400px] p-6 space-y-4">
          {allReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma avaliação ainda</p>
            </div>
          ) : (
            allReviews.map((review, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      review.type === 'delivery' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {review.type === 'delivery' ? '👤 Cliente' : '🍽️ Restaurante'}
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(review.date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                {review.comment && (
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} mt-2`}>
                    "{review.comment}"
                  </p>
                )}
                {review.order_code && (
                  <p className="text-xs text-gray-400 mt-2">
                    Pedido #{review.order_code}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'} text-center`}>
          <p className="text-xs text-gray-500">
            Continue fazendo um ótimo trabalho para receber mais avaliações positivas! 🌟
          </p>
        </div>
      </motion.div>
    </div>
  );
}