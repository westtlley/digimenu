import React from 'react';
import { Clock, MapPin, Phone, Store, TruckIcon, Package, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DeliveryStatusCard({ order, entregador, eta, distance }) {
  const getStatusConfig = () => {
    switch (order.status) {
      case 'going_to_store':
        return {
          icon: TruckIcon,
          title: 'Entregador Indo ao Restaurante',
          subtitle: eta ? `Chegando em ~${eta} minutos` : 'Buscando seu pedido',
          color: 'from-blue-500 to-blue-600',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600'
        };
      case 'arrived_at_store':
        return {
          icon: Store,
          title: 'Entregador no Restaurante',
          subtitle: 'Aguardando coleta do pedido',
          color: 'from-yellow-500 to-yellow-600',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600'
        };
      case 'picked_up':
        return {
          icon: Package,
          title: 'Pedido Coletado!',
          subtitle: 'Entregador saindo para entrega',
          color: 'from-green-500 to-green-600',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600'
        };
      case 'out_for_delivery':
        return {
          icon: TruckIcon,
          title: 'Pedido a Caminho',
          subtitle: eta ? `Chegando em ~${eta} minutos` : 'Indo para o endereço de entrega',
          color: 'from-blue-500 to-blue-600',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600'
        };
      case 'arrived_at_customer':
        return {
          icon: MapPin,
          title: 'Entregador Chegou!',
          subtitle: 'Prepare-se para receber o pedido',
          color: 'from-green-500 to-green-600',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600'
        };
      case 'delivered':
        return {
          icon: CheckCircle,
          title: 'Pedido Entregue',
          subtitle: 'Obrigado pela preferência!',
          color: 'from-green-600 to-green-700',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600'
        };
      default:
        return {
          icon: Clock,
          title: 'Preparando Pedido',
          subtitle: 'Aguarde...',
          color: 'from-gray-500 to-gray-600',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`bg-gradient-to-r ${config.color} text-white rounded-2xl shadow-lg p-6`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center`}>
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-xl mb-1">{config.title}</h2>
          <p className="text-sm opacity-90">{config.subtitle}</p>
          {distance && (
            <p className="text-xs opacity-75 mt-1">📍 {distance}</p>
          )}
        </div>
      </div>

      {/* Entregador Info */}
      {entregador && ['going_to_store', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'arrived_at_customer'].includes(order.status) && (
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            {entregador.photo ? (
              <img src={entregador.photo} alt={entregador.name} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
            ) : (
              <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-white">{entregador.name}</p>
              <div className="flex items-center gap-2 text-xs">
                <Badge className="bg-white/30 text-white border-0">
                  ⭐ {entregador.rating?.toFixed(1) || '5.0'}
                </Badge>
                <span className="text-white/90">
                  {entregador.vehicle_type === 'bike' ? '🚴 Bicicleta' :
                   entregador.vehicle_type === 'motorcycle' ? '🏍️ Moto' :
                   entregador.vehicle_type === 'car' ? '🚗 Carro' : 'Veículo'}
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              const phone = entregador.phone?.replace(/\D/g, '');
              window.open(`https://wa.me/55${phone}?text=Olá! Sou o cliente do pedido ${order.order_code}`, '_blank');
            }}
            className="w-full bg-white text-blue-600 hover:bg-white/90"
            size="sm"
          >
            <Phone className="w-4 h-4 mr-2" />
            Entrar em Contato
          </Button>
        </div>
      )}
    </div>
  );
}