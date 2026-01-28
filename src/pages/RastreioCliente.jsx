import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { Package, Clock, CheckCircle, MapPin, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DeliveryProgress from '../components/delivery/DeliveryProgress';
import DeliveryStatusCard from '../components/delivery/DeliveryStatusCard';

/**
 * Página de rastreamento para o cliente
 * Acompanhar entrega em tempo real
 */
export default function RastreioCliente() {
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    // Obter order_id da URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('order_id');
    setOrderId(id);
  }, []);

  // Buscar pedido
  const { data: order, isLoading } = useQuery({
    queryKey: ['customerOrder', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ id: orderId });
      console.log('Order fetched:', orders[0]?.status, orders[0]?.pickup_code, orders[0]?.delivery_code);
      return orders[0];
    },
    enabled: !!orderId,
    refetchInterval: 2000 // Atualizar a cada 2s
  });

  // Buscar entregador
  const { data: entregador } = useQuery({
    queryKey: ['orderEntregador', order?.entregador_id],
    queryFn: () => base44.entities.Entregador.filter({ id: order.entregador_id }).then(e => e[0]),
    enabled: !!order?.entregador_id,
    refetchInterval: 3000
  });

  // Buscar ETA e distância
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  
  useEffect(() => {
    if (!order || !entregador || !['going_to_store', 'out_for_delivery'].includes(order.status)) {
      setEta(null);
      setDistance(null);
      return;
    }

    const fetchETA = async () => {
      try {
        const origin = { lat: entregador.current_latitude, lng: entregador.current_longitude };
        const destination = order.status === 'going_to_store'
          ? { lat: order.store_latitude, lng: order.store_longitude }
          : { lat: order.customer_latitude, lng: order.customer_longitude };

        if (!origin.lat || !destination.lat) return;

        const response = await base44.functions.invoke('getGoogleMapsRoute', { origin, destination });
        if (response.data && !response.data.error) {
          setEta(Math.ceil(response.data.duration / 60));
          setDistance(response.data.distanceText);
        }
      } catch (error) {
        console.error('Erro ao buscar ETA:', error);
      }
    };

    fetchETA();
    const interval = setInterval(fetchETA, 30000);
    return () => clearInterval(interval);
  }, [order, entregador]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h2>
          <p className="text-gray-600">
            Não foi possível localizar este pedido. Verifique o link de rastreamento.
          </p>
        </div>
      </div>
    );
  }



  const statusConfig = {
    new: { label: 'Pedido Recebido', color: 'bg-blue-500', icon: Package },
    accepted: { label: 'Pedido Aceito', color: 'bg-yellow-500', icon: Clock },
    preparing: { label: 'Em Preparo', color: 'bg-orange-500', icon: Clock },
    ready: { label: 'Pronto para Retirada', color: 'bg-green-500', icon: CheckCircle },
    going_to_store: { label: 'Entregador indo ao Restaurante', color: 'bg-blue-400', icon: Package },
    arrived_at_store: { label: 'Entregador no Restaurante', color: 'bg-blue-500', icon: CheckCircle },
    picked_up: { label: 'Pedido Coletado', color: 'bg-green-500', icon: Package },
    out_for_delivery: { label: 'Saiu para Entrega', color: 'bg-blue-600', icon: Package },
    arrived_at_customer: { label: 'Entregador Chegou', color: 'bg-green-500', icon: MapPin },
    delivered: { label: 'Entregue', color: 'bg-green-600', icon: CheckCircle }
  };

  const currentStatus = statusConfig[order.status] || statusConfig.new;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Rastreio do Pedido</h1>
              <p className="text-sm text-blue-100">#{order.order_code}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Status Card */}
        <DeliveryStatusCard
          order={order}
          entregador={entregador}
          eta={eta}
          distance={distance}
        />

        {/* Delivery Progress */}
        {['going_to_store', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'arrived_at_customer', 'delivered'].includes(order.status) && (
          <DeliveryProgress
            currentStatus={order.status}
            eta={eta}
            distance={distance}
          />
        )}



        {/* Address */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-bold text-lg mb-3">Endereço de Entrega</h3>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{order.address}</p>
              {order.address_complement && (
                <p className="text-sm text-gray-600">{order.address_complement}</p>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Code - apenas quando entregador chegou */}
        {order.delivery_code && order.status === 'arrived_at_customer' && (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-2 text-yellow-900">Código de Validação</h3>
            <p className="text-sm text-yellow-700 mb-4">
              Forneça este código ao entregador para confirmar o recebimento:
            </p>
            <div className="bg-white rounded-xl p-6 text-center">
              <p className="text-5xl font-bold text-yellow-600 tracking-[0.5em] mb-2">
                {order.delivery_code}
              </p>
              <p className="text-xs text-gray-500">Código de 4 dígitos</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}