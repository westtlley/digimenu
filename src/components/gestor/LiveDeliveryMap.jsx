import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Navigation, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ProfessionalDeliveryMap from '../maps/ProfessionalDeliveryMap';

/**
 * Mapa ao vivo para o gestor com todos os entregadores ativos
 */
export default function LiveDeliveryMap({ orders, entregadores, onSelectOrder }) {
  const [selectedEntregador, setSelectedEntregador] = useState(null);
  const [customerLocations, setCustomerLocations] = useState({});

  // Geocodificar endereços dos pedidos
  React.useEffect(() => {
    const activeOrders = orders.filter(o => 
      o.status === 'out_for_delivery' && o.address
    );

    activeOrders.forEach(async (order) => {
      if (customerLocations[order.id]) return;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.address)}&limit=1`
        );
        const data = await res.json();
        if (data && data.length > 0) {
          setCustomerLocations(prev => ({
            ...prev,
            [order.id]: {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            }
          }));
        }
      } catch (e) {
        console.error('Erro ao geocodificar:', e);
      }
    });
  }, [orders]);

  const activeDeliveries = orders.filter(o => o.status === 'out_for_delivery');
  const activeEntregadores = entregadores.filter(e => e.status === 'busy' || e.current_order_id);

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-sm">Rastreamento em Tempo Real</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500">
              {activeDeliveries.length} em rota
            </Badge>
            <Badge variant="outline" className="text-xs">
              Atualiza a cada 3s
            </Badge>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[500px] relative">
        {activeEntregadores.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <Navigation className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-2">Nenhuma entrega ativa no momento</p>
            <p className="text-sm text-gray-400 text-center">
              Quando houver entregas em andamento, você poderá acompanhá-las aqui em tempo real
            </p>
          </div>
        ) : (
          <>
            {/* Lista de entregadores ativos */}
            <div className="absolute top-3 left-3 z-[1000] space-y-2 max-w-xs">
              {activeEntregadores.slice(0, 3).map(ent => {
                const order = orders.find(o => o.id === ent.current_order_id);
                if (!order) return null;

                return (
                  <button
                    key={ent.id}
                    onClick={() => {
                      setSelectedEntregador(ent.id);
                      if (onSelectOrder) onSelectOrder(order);
                    }}
                    className={`w-full bg-white shadow-lg rounded-lg p-2.5 text-left hover:shadow-xl transition-all border-2 ${
                      selectedEntregador === ent.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🏍️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-gray-900 truncate">{ent.name}</p>
                        <p className="text-[10px] text-gray-600 truncate">#{order.order_code}</p>
                      </div>
                      <Badge className="bg-green-500 text-white text-[9px] h-4">
                        Em rota
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mapa com primeiro entregador ativo */}
            {(() => {
              const ent = activeEntregadores[0];
              const order = orders.find(o => o.id === ent?.current_order_id);
              const deliveryLoc = ent?.current_latitude && ent?.current_longitude
                ? { lat: ent.current_latitude, lng: ent.current_longitude }
                : null;
              const customerLoc = customerLocations[order?.id];

              return (
                <ProfessionalDeliveryMap
                  mode="gestor"
                  deliveryLocation={deliveryLoc}
                  customerLocation={customerLoc}
                  deliveryName={ent?.name}
                  customerName={order?.customer_name}
                  showRoute={true}
                  order={order}
                  className="h-full"
                />
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}