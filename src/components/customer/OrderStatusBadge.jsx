import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Clock, CheckCircle, Truck, MapPin, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient as base44 } from '@/api/apiClient';

const STATUS_CONFIG = {
  new: { label: 'Pedido Recebido', color: 'bg-blue-500', icon: Package },
  accepted: { label: 'Pedido Aceito', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'Em Preparo', color: 'bg-orange-500', icon: Clock },
  ready: { label: 'Pronto', color: 'bg-green-500', icon: CheckCircle },
  going_to_store: { label: 'Indo ao Restaurante', color: 'bg-blue-400', icon: Truck },
  picked_up: { label: 'Coletado', color: 'bg-green-500', icon: Package },
  out_for_delivery: { label: 'Saiu para Entrega', color: 'bg-blue-600', icon: Truck },
  arrived_at_customer: { label: 'Entregador Chegou', color: 'bg-green-500', icon: MapPin },
  delivered: { label: 'Entregue', color: 'bg-green-600', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: X },
};

/**
 * Badge flutuante mostrando status do pedido mais recente
 * Aparece no Cardapio quando há pedido ativo
 */
export default function OrderStatusBadge({ userEmail, onOrderClick }) {
  const { data: recentOrder } = useQuery({
    queryKey: ['customerRecentOrder', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      
      const orders = await base44.entities.Order.list('-created_date');
      // Buscar pedido mais recente do cliente que não está finalizado
      const activeOrder = orders.find(o => 
        (o.customer_email === userEmail || o.customer_phone) &&
        !['delivered', 'cancelled'].includes(o.status)
      );
      
      return activeOrder || null;
    },
    enabled: !!userEmail,
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  if (!recentOrder) return null;

  const statusInfo = STATUS_CONFIG[recentOrder.status] || STATUS_CONFIG.new;
  const StatusIcon = statusInfo.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
        onClick={() => onOrderClick?.(recentOrder)}
      >
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 cursor-pointer hover:border-blue-400 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${statusInfo.color} rounded-xl flex items-center justify-center shadow-lg`}>
              <StatusIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-gray-900 mb-1">
                Pedido #{recentOrder.order_code}
              </p>
              <Badge className={`${statusInfo.color} text-white text-xs`}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          {recentOrder.status === 'out_for_delivery' && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              🚚 Entregador a caminho
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}