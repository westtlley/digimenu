import React, { useState } from 'react';
import { Package, MapPin, DollarSign, Clock, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import RejectOrderModal from './RejectOrderModal';

/**
 * Modal bloqueante para novo pedido disponível
 * Som contínuo até decisão (aceitar/rejeitar)
 */
export default function OrderAlertModal({ order, onAccept, onReject }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value || 0);
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      await onAccept(order.id);
    } catch (e) {
      console.error('Erro ao aceitar:', e);
      setProcessing(false);
    }
  };

  const handleReject = async (reason) => {
    setProcessing(true);
    try {
      await onReject(order.id, reason);
      setShowRejectModal(false);
    } catch (e) {
      console.error('Erro ao rejeitar:', e);
      setProcessing(false);
    }
  };

  if (showRejectModal) {
    return (
      <RejectOrderModal
        order={order}
        onConfirm={handleReject}
        onCancel={() => setShowRejectModal(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ 
          scale: 1, 
          y: 0,
          boxShadow: [
            "0 0 0 0 rgba(239, 68, 68, 0)",
            "0 0 0 20px rgba(239, 68, 68, 0.2)",
            "0 0 0 0 rgba(239, 68, 68, 0)"
          ]
        }}
        transition={{
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
          <div className="flex items-center gap-3 text-white">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Package className="w-6 h-6" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">🔔 Novo Pedido Disponível!</h3>
              <p className="text-xs text-red-100">Tome uma decisão agora</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Pedido</span>
              <span className="font-bold text-gray-900">#{order.order_code}</span>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Entregar em:</p>
                <p className="text-sm font-medium text-gray-900">{order.address}</p>
                {order.neighborhood && (
                  <p className="text-xs text-gray-600 mt-0.5">{order.neighborhood}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500">Valor</p>
                  <p className="font-bold text-green-600">{formatCurrency(order.total)}</p>
                </div>
              </div>

              {order.delivery_fee > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Taxa entrega</p>
                    <p className="font-bold text-blue-600">{formatCurrency(order.delivery_fee)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 font-medium mb-1">Cliente</p>
            <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>
            <p className="text-xs text-gray-600">{order.customer_phone}</p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700 text-center">
              ⏰ Responda rapidamente para não perder este pedido
            </p>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="p-4 bg-gray-50 border-t space-y-2">
          <Button
            onClick={handleAccept}
            disabled={processing}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 text-base"
          >
            <Check className="w-5 h-5 mr-2" />
            {processing ? 'Aceitando...' : 'Aceitar Pedido'}
          </Button>
          
          <Button
            onClick={() => setShowRejectModal(true)}
            disabled={processing}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 py-3"
          >
            <X className="w-5 h-5 mr-2" />
            Rejeitar Pedido
          </Button>
        </div>
      </motion.div>
    </div>
  );
}