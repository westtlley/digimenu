import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Navigation, MapPin, Clock, Loader2, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createMotoMarkerIcon, computeBearing } from '@/components/maps/MotoMarkerIcon';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI0NGE1MmYxODVhMTQ4MjFhZWFiMjUxZDFmYjhkMTg3IiwiaCI6Im11cm11cjY0In0=';

const createOrderIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: #ef4444;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">
        📦
      </div>
    `,
    className: 'custom-order-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createStoreIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: #8b5cf6;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">
        🏪
      </div>
    `,
    className: 'custom-store-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Component to auto-center map
function AutoCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

// Component to fix map resize
function FixMapResize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map) map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/**
 * Mapa para o Gestor acompanhar múltiplos entregadores em tempo real
 */
export default function MultiDeliveryTrackingMap({
  entregadores = [],
  orders = [],
  stores = [],
  onSelectEntregador,
  onSelectOrder,
  darkMode = false
}) {
  const [selectedEntregador, setSelectedEntregador] = useState(null);
  const [customerLocations, setCustomerLocations] = useState({});
  const [routes, setRoutes] = useState({});
  const [loading, setLoading] = useState({});

  // Geocodificar endereços dos pedidos
  useEffect(() => {
    const activeOrders = orders.filter(o => 
      ['going_to_store', 'out_for_delivery'].includes(o.status) && o.address
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

  // Calcular rotas para entregadores ativos
  useEffect(() => {
    const activeEntregadores = entregadores.filter(e => 
      e.status === 'busy' && e.current_latitude && e.current_longitude
    );

    activeEntregadores.forEach(async (entregador) => {
      const order = orders.find(o => o.id === entregador.current_order_id);
      if (!order || !customerLocations[order.id]) return;

      const routeKey = `${entregador.id}-${order.id}`;
      if (routes[routeKey]) return;

      setLoading(prev => ({ ...prev, [routeKey]: true }));

      try {
        const origin = {
          lat: entregador.current_latitude,
          lng: entregador.current_longitude
        };
        const destination = customerLocations[order.id];

        const body = {
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
        };

        const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
          method: 'POST',
          headers: {
            Authorization: ORS_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (data.features && data.features[0]) {
          const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoutes(prev => ({
            ...prev,
            [routeKey]: {
              path: coords,
              distance: (data.features[0].properties.summary.distance / 1000).toFixed(1),
              time: Math.ceil(data.features[0].properties.summary.duration / 60),
            }
          }));
        }
      } catch (error) {
        console.error('Erro ao calcular rota:', error);
      } finally {
        setLoading(prev => ({ ...prev, [routeKey]: false }));
      }
    });
  }, [entregadores, orders, customerLocations]);

  const activeEntregadores = entregadores.filter(e => 
    (e.status === 'busy' || e.current_order_id) && e.current_latitude && e.current_longitude
  );

  const pendingOrders = orders.filter(o => 
    o.status === 'ready' && o.delivery_method === 'delivery'
  );

  // Calcular centro do mapa
  const allPoints = [
    ...activeEntregadores.map(e => [e.current_latitude, e.current_longitude]),
    ...Object.values(customerLocations).map(loc => [loc.lat, loc.lng]),
    ...stores.map(s => s.store_latitude && s.store_longitude ? [s.store_latitude, s.store_longitude] : null).filter(Boolean)
  ];

  const center = allPoints.length > 0
    ? [
        allPoints.reduce((sum, p) => sum + p[0], 0) / allPoints.length,
        allPoints.reduce((sum, p) => sum + p[1], 0) / allPoints.length
      ]
    : [-5.0892, -42.8019];

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <FixMapResize />
        <AutoCenter center={center} zoom={13} />

        <TileLayer
          url={darkMode 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
        />

        {/* Rotas dos entregadores */}
        {activeEntregadores.map(entregador => {
          const order = orders.find(o => o.id === entregador.current_order_id);
          if (!order || !customerLocations[order.id]) return null;

          const routeKey = `${entregador.id}-${order.id}`;
          const route = routes[routeKey];

          if (!route) return null;

          return (
            <Polyline
              key={routeKey}
              positions={route.path}
              pathOptions={{
                color: selectedEntregador === entregador.id ? '#3b82f6' : '#10b981',
                weight: selectedEntregador === entregador.id ? 6 : 4,
                opacity: 0.7,
                dashArray: '10, 5',
              }}
            />
          );
        })}

        {/* Marcadores dos Restaurantes */}
        {stores.map(store => {
          if (!store.store_latitude || !store.store_longitude) return null;
          return (
            <Marker
              key={store.id}
              position={[store.store_latitude, store.store_longitude]}
              icon={createStoreIcon()}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-bold">🏪 {store.name || 'Restaurante'}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marcadores dos Entregadores – Moto em movimento */}
        {activeEntregadores.map(entregador => {
          const order = orders.find(o => o.id === entregador.current_order_id);
          const isSelected = selectedEntregador === entregador.id;
          const routeKey = `${entregador.id}-${order?.id}`;
          const route = routes[routeKey];
          let bearing = 0;
          if (route?.path?.length >= 2) {
            const from = { lat: route.path[0][0], lng: route.path[0][1] };
            const to = { lat: route.path[1][0], lng: route.path[1][1] };
            bearing = computeBearing(from, to);
          }

          return (
            <Marker
              key={entregador.id}
              position={[entregador.current_latitude, entregador.current_longitude]}
              icon={createMotoMarkerIcon({
                bearing,
                isMoving: entregador.status === 'busy',
                size: isSelected ? 56 : 52,
                accentColor: isSelected ? '#3b82f6' : (entregador.status === 'busy' ? '#eab308' : '#22c55e'),
              })}
              eventHandlers={{
                click: () => {
                  setSelectedEntregador(entregador.id);
                  if (onSelectEntregador) onSelectEntregador(entregador);
                  if (order && onSelectOrder) onSelectOrder(order);
                }
              }}
            >
              <Popup>
                <div className="text-center min-w-[150px]">
                  <p className="font-bold text-sm">🏍️ {entregador.name}</p>
                  <Badge className={`mt-1 ${
                    entregador.status === 'busy' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    {entregador.status === 'busy' ? 'Em entrega' : 'Disponível'}
                  </Badge>
                  {order && (
                    <>
                      <p className="text-xs text-gray-600 mt-2">Pedido: #{order.order_code}</p>
                      <p className="text-xs text-gray-500">{order.customer_name}</p>
                      {routes[`${entregador.id}-${order.id}`] && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-blue-600">
                            📍 {routes[`${entregador.id}-${order.id}`].distance} km • 
                            ⏱️ {routes[`${entregador.id}-${order.id}`].time} min
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Marcadores dos Clientes */}
        {Object.entries(customerLocations).map(([orderId, location]) => {
          const order = orders.find(o => o.id === orderId);
          if (!order) return null;

          return (
            <Marker
              key={`customer-${orderId}`}
              position={[location.lat, location.lng]}
              icon={createOrderIcon()}
              eventHandlers={{
                click: () => {
                  if (onSelectOrder) onSelectOrder(order);
                }
              }}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-sm">🏠 {order.customer_name}</p>
                  <p className="text-xs text-gray-600">Pedido: #{order.order_code}</p>
                  <p className="text-xs text-gray-500 mt-1">{order.address}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Pedidos pendentes (sem entregador) */}
        {pendingOrders.map(order => {
          const location = customerLocations[order.id];
          if (!location) return null;

          return (
            <Marker
              key={`pending-${order.id}`}
              position={[location.lat, location.lng]}
              icon={createOrderIcon()}
              eventHandlers={{
                click: () => {
                  if (onSelectOrder) onSelectOrder(order);
                }
              }}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-sm">📦 #{order.order_code}</p>
                  <Badge className="bg-orange-500 mt-1">Aguardando</Badge>
                  <p className="text-xs text-gray-600 mt-1">{order.customer_name}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 z-[1000]">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">Em entrega</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded-lg"></div>
            <span className="text-gray-700 dark:text-gray-300">Restaurante</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-gray-700 dark:text-gray-300">Cliente/Pedido</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-800 z-[1000]">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="font-bold text-sm text-gray-900 dark:text-white">Ativos</p>
        </div>
        <div className="space-y-1 text-xs">
          <p className="text-gray-600 dark:text-gray-400">
            🏍️ {activeEntregadores.length} entregadores
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            📦 {pendingOrders.length} aguardando
          </p>
        </div>
      </div>
    </div>
  );
}
