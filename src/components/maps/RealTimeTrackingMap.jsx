import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Navigation, MapPin, Clock, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createDeliveryIcon = (isMoving = false) => {
  return L.divIcon({
    html: `
      <div style="
        background: ${isMoving ? '#3b82f6' : '#10b981'};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${isMoving ? 'pulse 2s infinite' : 'none'};
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      </style>
    `,
    className: 'custom-delivery-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const createStoreIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: #ef4444;
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

const createCustomerIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background: #8b5cf6;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">
        🏠
      </div>
    `,
    className: 'custom-customer-icon',
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

const ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI0NGE1MmYxODVhMTQ4MjFhZWFiMjUxZDFmYjhkMTg3IiwiaCI6Im11cm11cjY0In0=';

/**
 * Mapa de rastreamento em tempo real com animação de trajeto
 * Para uso no App Entregador
 */
export default function RealTimeTrackingMap({
  entregadorLocation,
  storeLocation,
  customerLocation,
  order,
  darkMode = false,
  mode = 'entregador', // 'entregador' ou 'gestor'
  onNavigate
}) {
  const [route, setRoute] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [animatedPosition, setAnimatedPosition] = useState(entregadorLocation);
  const [routeHistory, setRouteHistory] = useState([]);
  const animationRef = useRef(null);

  // Animar movimento do entregador
  useEffect(() => {
    if (!entregadorLocation) {
      setAnimatedPosition(null);
      return;
    }

    // Se for primeira vez ou mudou muito, mover instantaneamente
    if (!animatedPosition || 
        Math.abs(animatedPosition.lat - entregadorLocation.lat) > 0.01 ||
        Math.abs(animatedPosition.lng - entregadorLocation.lng) > 0.01) {
      setAnimatedPosition(entregadorLocation);
      // Adicionar ao histórico
      setRouteHistory(prev => [...prev.slice(-50), entregadorLocation]);
      return;
    }

    // Animar suavemente pequenas mudanças
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    const steps = 30;
    const latDiff = (entregadorLocation.lat - animatedPosition.lat) / steps;
    const lngDiff = (entregadorLocation.lng - animatedPosition.lng) / steps;
    
    let currentStep = 0;
    animationRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedPosition(entregadorLocation);
        setRouteHistory(prev => [...prev.slice(-50), entregadorLocation]);
        clearInterval(animationRef.current);
      } else {
        setAnimatedPosition(prev => ({
          lat: prev.lat + latDiff,
          lng: prev.lng + lngDiff
        }));
      }
    }, 50);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [entregadorLocation]);

  // Calcular rota
  useEffect(() => {
    const calculateRoute = async () => {
      if (!entregadorLocation || !customerLocation) {
        setRoute([]);
        setRouteInfo(null);
        return;
      }

      setLoading(true);
      try {
        // Determinar origem baseado no status do pedido
        let origin = entregadorLocation;
        if (order?.status === 'going_to_store' && storeLocation) {
          origin = storeLocation;
        }

        const body = {
          coordinates: [
            [origin.lng, origin.lat],
            [customerLocation.lng, customerLocation.lat],
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
          setRoute(coords);

          const summary = data.features[0].properties.summary;
          setRouteInfo({
            distance: (summary.distance / 1000).toFixed(1),
            time: Math.ceil(summary.duration / 60),
          });
        }
      } catch (error) {
        console.error('Erro ao calcular rota:', error);
        // Fallback: linha reta
        if (entregadorLocation && customerLocation) {
          setRoute([
            [entregadorLocation.lat, entregadorLocation.lng],
            [customerLocation.lat, customerLocation.lng]
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    calculateRoute();
  }, [entregadorLocation, customerLocation, storeLocation, order?.status]);

  // Determinar centro do mapa
  const mapCenter = animatedPosition || entregadorLocation || customerLocation || storeLocation || [-5.0892, -42.8019];

  // Determinar zoom baseado no status
  const getZoom = () => {
    if (order?.status === 'going_to_store') return 14;
    if (order?.status === 'out_for_delivery') return 13;
    return 12;
  };

  if (!customerLocation && !storeLocation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Carregando localizações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={getZoom()}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <FixMapResize />
        <AutoCenter center={animatedPosition ? [animatedPosition.lat, animatedPosition.lng] : null} zoom={getZoom()} />

        <TileLayer
          url={darkMode 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Rota calculada */}
        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: '#3b82f6',
              weight: 5,
              opacity: 0.7,
              dashArray: '10, 5',
            }}
          />
        )}

        {/* Histórico de rota (rastro) */}
        {routeHistory.length > 1 && (
          <Polyline
            positions={routeHistory.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: '#10b981',
              weight: 3,
              opacity: 0.4,
            }}
          />
        )}

        {/* Marcador do Restaurante */}
        {storeLocation && (
          <Marker position={[storeLocation.lat, storeLocation.lng]} icon={createStoreIcon()}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">🏪 Restaurante</p>
                {order?.status === 'going_to_store' && (
                  <p className="text-xs text-blue-600 mt-1">Destino atual</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcador do Entregador (Animado) */}
        {animatedPosition && (
          <Marker 
            position={[animatedPosition.lat, animatedPosition.lng]} 
            icon={createDeliveryIcon(!!entregadorLocation && (
              Math.abs(animatedPosition.lat - entregadorLocation.lat) > 0.0001 ||
              Math.abs(animatedPosition.lng - entregadorLocation.lng) > 0.0001
            ))}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold">🏍️ {order?.entregador_name || 'Entregador'}</p>
                <p className="text-xs text-gray-600">Posição em tempo real</p>
                {routeInfo && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-blue-600">
                      📍 {routeInfo.distance} km • ⏱️ {routeInfo.time} min
                    </p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcador do Cliente */}
        {customerLocation && (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={createCustomerIcon()}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">🏠 {order?.customer_name || 'Cliente'}</p>
                <p className="text-xs text-gray-600">Destino</p>
                {order?.address && (
                  <p className="text-xs text-gray-500 mt-1">{order.address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Info Card */}
      {routeInfo && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 left-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-800 z-[1000]"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Distância</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{routeInfo.distance} km</p>
              </div>
            </div>
            <div className="border-l pl-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tempo</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{routeInfo.time} min</p>
              </div>
            </div>
          </div>
          {loading && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 animate-pulse">Atualizando rota...</p>
          )}
        </motion.div>
      )}

      {/* Botão de Navegação */}
      {order?.address && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-xl z-[1000] transition-all"
          onClick={() => {
            if (onNavigate) {
              onNavigate(order.address);
            } else {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`, '_blank');
            }
          }}
          title="Abrir no Google Maps"
        >
          <Navigation className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
