import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiClient as base44 } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function DeliveryProofModal({ order, entregador, onClose, onConfirm, darkMode }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const createProofMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryProof.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryOrders'] });
      queryClient.invalidateQueries({ queryKey: ['allDeliveryOrders'] });
      if (onConfirm) onConfirm();
      onClose();
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'delivery-proofs');
      setPhotoUrl(url);
    } catch (error) {
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    createProofMutation.mutate({
      order_id: order.id,
      entregador_id: entregador.id,
      photo_url: photoUrl,
      notes: notes,
      delivered_at: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-lg w-full p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Comprovante de Entrega
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Upload de foto */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Foto da Entrega (Opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Comprovante" className="w-full h-48 object-cover rounded-lg" />
                <button
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center ${
                  darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                }`}
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Tirar foto</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Observações (Opcional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entregue na portaria, deixado com vizinho..."
              rows={3}
            />
          </div>

          {/* Botão de confirmar */}
          <Button
            onClick={handleSubmit}
            disabled={createProofMutation.isPending}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            <Check className="w-5 h-5 mr-2" />
            Confirmar Entrega
          </Button>
        </div>
      </div>
    </div>
  );
}