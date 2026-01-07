import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

export default function EntregadorRating({ isOpen, onClose, entregador, orderId }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const createRatingMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.DeliveryRating.create(data);
      
      // Atualizar média do entregador
      const currentRating = entregador.rating || 5;
      const currentTotal = entregador.total_ratings || 0;
      const newTotal = currentTotal + 1;
      const newAvg = ((currentRating * currentTotal) + data.rating) / newTotal;
      
      await base44.entities.Entregador.update(entregador.id, {
        ...entregador,
        rating: newAvg,
        total_ratings: newTotal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Avaliação registrada com sucesso!');
      onClose();
      setRating(0);
      setComment('');
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }

    createRatingMutation.mutate({
      order_id: orderId,
      entregador_id: entregador.id,
      rating,
      comment: comment.trim() || undefined,
      rated_by: 'customer'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Entregador</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entregador Info */}
          <div className="text-center">
            <p className="font-bold text-lg">{entregador?.name}</p>
            <p className="text-sm text-gray-500">
              {entregador?.total_deliveries || 0} entregas • 
              ⭐ {entregador?.rating?.toFixed(1) || 'N/A'}
            </p>
          </div>

          {/* Rating Stars */}
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p className="text-center text-sm font-medium">
              {rating === 1 && 'Péssimo'}
              {rating === 2 && 'Ruim'}
              {rating === 3 && 'Regular'}
              {rating === 4 && 'Bom'}
              {rating === 5 && 'Excelente'}
            </p>
          )}

          {/* Comment */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Comentário (opcional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deixe um comentário sobre a entrega..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || createRatingMutation.isPending}
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            {createRatingMutation.isPending ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}