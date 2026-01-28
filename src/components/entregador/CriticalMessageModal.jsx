import React from 'react';
import { AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

/**
 * Modal bloqueante para mensagens administrativas críticas
 * Não pode ser fechado sem confirmação
 */
export default function CriticalMessageModal({ message, onConfirm }) {
  const [confirming, setConfirming] = React.useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(message.id);
    } catch (e) {
      console.error('Erro ao confirmar:', e);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mensagem Importante</h3>
              <p className="text-xs text-red-100">Confirmação de leitura obrigatória</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {message.title || 'Mensagem do Gestor'}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {message.message}
                </p>
              </div>
            </div>
          </div>

          {message.priority === 'urgent' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ Esta é uma mensagem urgente que requer sua atenção imediata
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            Você precisa confirmar que leu esta mensagem antes de continuar
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t">
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3"
          >
            {confirming ? 'Confirmando...' : '✓ Confirmar Leitura'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}