import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Navigation, Clock, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { createMotoMarkerIcon, computeBearing } from './MotoMarkerIcon';

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

function AutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function ProfessionalDeliveryMap({ 
  mode = 'gestor', // 'gestor' ou 'entregador'
  deliveryLocation, 
  customerLocation, 
  storeLocation,
  deliveryName,
  customerName,
  showRoute = true,
  order,
  darkMode = false 
}) {
  const [route, setRoute] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [animatedPosition, setAnimatedPosition] = useState(deliveryLocation);

  const defaultStore = storeLocation || { lat: -5.0892, lng: -42.8019 };
  const defaultDelivery = deliveryLocation || defaultStore;

  // Animar movimento do veículo
  useEffect(() => {
    if (!deliveryLocation) {
      setAnimatedPosition(null);
      return;
    }

    // Se for primeira vez ou mudou muito, mover instantaneamente
    if (!animatedPosition || 
        Math.abs(animatedPosition.lat - deliveryLocation.lat) > 0.01 ||
        Math.abs(animatedPosition.lng - deliveryLocation.lng) > 0.01) {
      setAnimatedPosition(deliveryLocation);
      return;
    }

    // Animar suavemente pequenas mudanças
    const steps = 20;
    const latDiff = (deliveryLocation.lat - animatedPosition.lat) / steps;
    const lngDiff = (deliveryLocation.lng - animatedPosition.lng) / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedPosition(deliveryLocation);
        clearInterval(interval);
      } else {
        setAnimatedPosition(prev => ({
          lat: prev.lat + latDiff,
          lng: prev.lng + lngDiff
        }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [deliveryLocation]);

  const orsKey = import.meta.env.VITE_ORS_KEY;
  useEffect(() => {
    if (!showRoute || !deliveryLocation || !customerLocation) {
      setRoute([]);
      setInfo(null);
      return;
    }
    if (!orsKey) {
      setRoute([]);
      setInfo(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const body = {
          coordinates: [
            [deliveryLocation.lng, deliveryLocation.lat],
            [customerLocation.lng, customerLocation.lat],
          ],
        };

        const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
          method: 'POST',
          headers: {
            Authorization: orsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (data.features && data.features[0]) {
          const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoute(coords);

          const summary = data.features[0].properties.summary;
          setInfo({
            distance: (summary.distance / 1000).toFixed(1),
            time: Math.ceil(summary.duration / 60),
          });
        }
      } catch (error) {
        console.error('Erro ao buscar rota:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [deliveryLocation, customerLocation, showRoute, orsKey]);

  if (!customerLocation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    );
  }

  const mapCenter = deliveryLocation || customerLocation || defaultStore;

  return (
    <div className="h-full w-full relative">
      <MapContainer 
        center={[mapCenter.lat, mapCenter.lng]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <FixMapResize />
        <AutoCenter center={deliveryLocation ? [deliveryLocation.lat, deliveryLocation.lng] : null} />

        <TileLayer
          url={darkMode 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          }
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />

        {/* Rota */}
        {route.length > 0 && (
          <Polyline 
            positions={route} 
            color="#3b82f6" 
            weight={5}
            opacity={0.7}
          />
        )}

        {/* Marcador da Loja */}
        {storeLocation && (
          <Marker position={[storeLocation.lat, storeLocation.lng]}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">🏪 Restaurante</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcador do Entregador – Moto em movimento */}
        {animatedPosition && (
          <Marker
            position={[animatedPosition.lat, animatedPosition.lng]}
            icon={createMotoMarkerIcon({
              bearing: route.length >= 2
                ? computeBearing({ lat: route[0][0], lng: route[0][1] }, { lat: route[1][0], lng: route[1][1] })
                : 0,
              isMoving: !!deliveryLocation,
            })}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold">🏍️ {deliveryName || 'Entregador'}</p>
                <p className="text-xs text-gray-600">Posição atual</p>
                {info && (
                  <p className="text-xs text-blue-600 mt-1">
                    {info.distance} km • {info.time} min
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcador do Cliente */}
        {customerLocation && (
          <Marker position={[customerLocation.lat, customerLocation.lng]}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">🏡 {customerName || 'Cliente'}</p>
                <p className="text-xs text-gray-600">Destino</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Info Card */}
      {info && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border-2 border-blue-200 z-[1000]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Distância</p>
                <p className="text-base font-bold text-gray-900">{info.distance} km</p>
              </div>
            </div>
            <div className="border-l pl-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Tempo</p>
                <p className="text-base font-bold text-gray-900">{info.time} min</p>
              </div>
            </div>
          </div>
          {loading && (
            <p className="text-xs text-blue-600 mt-2 animate-pulse">Atualizando rota...</p>
          )}
        </div>
      )}

      {/* Navegação Google Maps */}
      {order?.address && (
        <button
          className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-xl z-[1000] transition-all hover:scale-110"
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`, '_blank')}
          title="Abrir no Google Maps"
        >
          <Navigation className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}