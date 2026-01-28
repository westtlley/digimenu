import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';

const REJECT_REASONS = [
  'Muito longe da minha localização',
  'Problema no veículo',
  'Fora da minha rota atual',
  'Horário de pausa/descanso',
  'Outro motivo'
];

/**
 * Modal de rejeição com motivo obrigatório
 * Não pode ser fechado sem preencher
 */
export default function RejectOrderModal({ order, onConfirm, onCancel }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  const isValid = selectedReason && (
    selectedReason !== 'Outro motivo' || customReason.trim()
  );

  const handleConfirm = async () => {
    if (!isValid) return;

    setConfirming(true);
    const finalReason = selectedReason === 'Outro motivo' 
      ? customReason 
      : selectedReason;

    try {
      await onConfirm(finalReason);
    } catch (e) {
      console.error('Erro ao rejeitar:', e);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Rejeitar Pedido</h3>
              <p className="text-xs text-orange-100">Informe o motivo da recusa</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Pedido que será rejeitado:</p>
            <p className="font-semibold text-gray-900">#{order.order_code}</p>
            <p className="text-xs text-gray-600 mt-1">{order.address}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Motivo da rejeição *
            </label>
            <div className="space-y-2">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedReason === reason
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{reason}</span>
                    {selectedReason === reason && (
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedReason === 'Outro motivo' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo..."
                className="min-h-[80px]"
              />
            </motion.div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700 text-center">
              ⚠️ Este motivo será registrado e enviado ao gestor
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t space-y-2">
          <Button
            onClick={handleConfirm}
            disabled={!isValid || confirming}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3"
          >
            {confirming ? 'Rejeitando...' : 'Confirmar Rejeição'}
          </Button>
          
          <Button
            onClick={onCancel}
            disabled={confirming}
            variant="outline"
            className="w-full"
          >
            Voltar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}