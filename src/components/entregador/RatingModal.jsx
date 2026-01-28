import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function RatingModal({ order, entregador, onClose, darkMode }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const queryClient = useQueryClient();

  const createRatingMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryRating.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryOrders'] });
      onClose();
    }
  });

  const handleSubmit = () => {
    createRatingMutation.mutate({
      order_id: order.id,
      entregador_id: entregador.id,
      rating: rating,
      comment: comment,
      rated_by: 'entregador'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-lg w-full p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Avaliar Cliente
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Como foi sua experiência com este cliente?
            </p>
            <p className="font-bold text-lg mb-4">{order.customer_name}</p>
            
            {/* Estrelas */}
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      (hoveredRating || rating) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <p className="text-sm text-gray-500">
              {rating === 1 && 'Muito ruim'}
              {rating === 2 && 'Ruim'}
              {rating === 3 && 'Regular'}
              {rating === 4 && 'Bom'}
              {rating === 5 && 'Excelente'}
            </p>
          </div>

          {/* Comentário */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Comentário (Opcional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deixe um comentário sobre o atendimento..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Pular
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createRatingMutation.isPending}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            >
              Enviar Avaliação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}