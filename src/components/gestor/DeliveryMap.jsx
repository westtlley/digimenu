import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import { Badge } from "@/components/ui/badge";

const createDeliveryIcon = (status) => {
  const color = status === 'available' ? '#22c55e' : status === 'busy' ? '#eab308' : '#9ca3af';
  
  if (typeof window === 'undefined' || !window.L) return null;
  
  return window.L.divIcon({
    html: `<div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createOrderIcon = () => {
  if (typeof window === 'undefined' || !window.L) return null;
  
  return window.L.divIcon({
    html: `<div style="background: #ef4444; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M3 3h18v18H3V3z"/>
      </svg>
    </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export default function DeliveryMap({ entregadores, orders, onSelectEntregador, onSelectOrder, optimizedRoute }) {
  // Default center (adjust to your city)
  const defaultCenter = [-5.0892, -42.8016]; // Teresina, PI
  
  const activeEntregadores = entregadores.filter(e => 
    e.status !== 'offline' && e.current_latitude && e.current_longitude
  );

  const pendingOrders = orders.filter(o => 
    o.status === 'ready' && o.delivery_method === 'delivery'
  );

  // Extrair coordenadas da rota otimizada
  const routeCoordinates = optimizedRoute?.optimizedOrders?.map(order => {
    const lat = order.coordinates?.lat || (defaultCenter[0] + (Math.random() - 0.5) * 0.02);
    const lng = order.coordinates?.lng || (defaultCenter[1] + (Math.random() - 0.5) * 0.02);
    return [lat, lng];
  }) || [];

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Entregadores */}
        {activeEntregadores.map(entregador => (
          <Marker
            key={entregador.id}
            position={[entregador.current_latitude, entregador.current_longitude]}
            icon={createDeliveryIcon(entregador.status)}
            eventHandlers={{
              click: () => onSelectEntregador?.(entregador),
            }}
          >
            <Popup>
              <div className="p-2">
                <p className="font-bold text-sm">{entregador.name}</p>
                <Badge className={
                  entregador.status === 'available' ? 'bg-green-500' :
                  entregador.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                }>
                  {entregador.status === 'available' ? 'Disponível' :
                   entregador.status === 'busy' ? 'Ocupado' : 'Offline'}
                </Badge>
              </div>
            </Popup>
            {/* Raio de cobertura (3km) */}
            <Circle
              center={[entregador.current_latitude, entregador.current_longitude]}
              radius={3000}
              pathOptions={{
                color: entregador.status === 'available' ? '#22c55e' : '#eab308',
                fillColor: entregador.status === 'available' ? '#22c55e' : '#eab308',
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </Marker>
        ))}

        {/* Pedidos pendentes (mock coordinates - em produção viria do endereço geocodificado) */}
        {pendingOrders.map((order, idx) => {
          // Mock: adiciona pequeno offset ao centro para visualização
          const lat = defaultCenter[0] + (Math.random() - 0.5) * 0.02;
          const lng = defaultCenter[1] + (Math.random() - 0.5) * 0.02;
          
          return (
            <Marker
              key={order.id}
              position={[lat, lng]}
              icon={createOrderIcon()}
              eventHandlers={{
                click: () => onSelectOrder?.(order),
              }}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-bold text-sm">#{order.order_code}</p>
                  <p className="text-xs text-gray-600">{order.customer_name}</p>
                  <p className="text-xs text-gray-500">{order.address}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Linha da rota otimizada */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: 0.7,
              dashArray: '10, 10',
            }}
          />
        )}

        {/* Marcadores numerados da rota */}
        {optimizedRoute?.optimizedOrders?.map((order, index) => {
          const lat = order.coordinates?.lat || (defaultCenter[0] + (Math.random() - 0.5) * 0.02);
          const lng = order.coordinates?.lng || (defaultCenter[1] + (Math.random() - 0.5) * 0.02);
          
          const numberIcon = window.L?.divIcon({
            html: `<div style="background: #3b82f6; color: white; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${index + 1}</div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          return (
            <Marker
              key={`route-${order.id}`}
              position={[lat, lng]}
              icon={numberIcon}
            >
              <Popup>
                <div className="p-2">
                  <p className="text-xs font-bold text-blue-600">Parada {index + 1}</p>
                  <p className="font-bold text-sm">#{order.order_code}</p>
                  <p className="text-xs text-gray-600">{order.customer_name}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}