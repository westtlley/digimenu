import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

// Ícones customizados
const deliveryIcon = L.divIcon({
  className: 'custom-delivery-marker',
  html: `
    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; border: 4px solid white; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5); display: flex; align-items: center; justify-content: center;">
      <div style="color: white; font-size: 24px;">🏍️</div>
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25]
});

const customerIcon = L.divIcon({
  className: 'custom-customer-marker',
  html: `<div style="width: 35px; height: 35px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="color: white; font-size: 18px;">📍</div></div>`,
  iconSize: [35, 35],
  iconAnchor: [17.5, 17.5]
});

const storeIcon = L.divIcon({
  className: 'custom-store-marker',
  html: `<div style="width: 35px; height: 35px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="color: white; font-size: 18px;">🏪</div></div>`,
  iconSize: [35, 35],
  iconAnchor: [17.5, 17.5]
});

export default function DeliveryMap({
  mode = 'customer',
  deliveryLocation,
  customerLocation,
  storeLocation,
  order,
  className = ''
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);

  // Inicializar mapa UMA ÚNICA VEZ
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Validar coordenadas iniciais
    const validCenter = customerLocation?.lat && customerLocation?.lng
      ? [customerLocation.lat, customerLocation.lng]
      : storeLocation?.lat && storeLocation?.lng
      ? [storeLocation.lat, storeLocation.lng]
      : [-5.0892, -42.8019];

    mapInstanceRef.current = L.map(mapRef.current, {
      center: validCenter,
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Atualizar markers conforme localizações
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Store marker
    if (storeLocation?.lat && storeLocation?.lng && mode !== 'customer') {
      if (storeMarkerRef.current) {
        storeMarkerRef.current.setLatLng([storeLocation.lat, storeLocation.lng]);
      } else {
        storeMarkerRef.current = L.marker([storeLocation.lat, storeLocation.lng], { icon: storeIcon })
          .bindPopup('<b>Restaurante</b><br>Ponto de origem')
          .addTo(mapInstanceRef.current);
      }
    }

    // Customer marker
    if (customerLocation?.lat && customerLocation?.lng) {
      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([customerLocation.lat, customerLocation.lng]);
      } else {
        customerMarkerRef.current = L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
          .bindPopup(`<b>${order?.customer_name || 'Cliente'}</b><br>Destino`)
          .addTo(mapInstanceRef.current);
      }
    }

    // Delivery marker
    if (deliveryLocation?.lat && deliveryLocation?.lng) {
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setLatLng([deliveryLocation.lat, deliveryLocation.lng]);
      } else {
        deliveryMarkerRef.current = L.marker([deliveryLocation.lat, deliveryLocation.lng], { icon: deliveryIcon })
          .bindPopup('<b>Entregador</b><br>Em movimento')
          .addTo(mapInstanceRef.current);
      }
    }

    // Ajustar bounds
    const bounds = [];
    if (storeLocation?.lat && storeLocation?.lng && mode !== 'customer') {
      bounds.push([storeLocation.lat, storeLocation.lng]);
    }
    if (customerLocation?.lat && customerLocation?.lng) {
      bounds.push([customerLocation.lat, customerLocation.lng]);
    }
    if (deliveryLocation?.lat && deliveryLocation?.lng) {
      bounds.push([deliveryLocation.lat, deliveryLocation.lng]);
    }

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [deliveryLocation, customerLocation, storeLocation, mode, order]);

  // Buscar e atualizar rota
  useEffect(() => {
    if (!mapInstanceRef.current || !deliveryLocation?.lat || !deliveryLocation?.lng) return;

    const destination = ['going_to_store', 'arrived_at_store'].includes(order?.status)
      ? storeLocation
      : customerLocation;

    if (!destination?.lat || !destination?.lng) return;

    const fetchRoute = async () => {
      try {
        const response = await base44.functions.invoke('getGoogleMapsRoute', {
          origin: deliveryLocation,
          destination
        });

        if (response.data && !response.data.error) {
          setEta(Math.ceil(response.data.duration / 60));
          setDistance(response.data.distanceText);

          // Atualizar polyline
          if (response.data.points && response.data.points.length > 0) {
            if (routePolylineRef.current) {
              routePolylineRef.current.setLatLngs(response.data.points);
            } else {
              routePolylineRef.current = L.polyline(response.data.points, {
                color: '#3b82f6',
                weight: 5,
                opacity: 0.8
              }).addTo(mapInstanceRef.current);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar rota:', error);
      }
    };

    fetchRoute();
    const interval = setInterval(fetchRoute, 30000);
    return () => clearInterval(interval);
  }, [deliveryLocation, customerLocation, storeLocation, order?.status]);

  if (!customerLocation?.lat && !storeLocation?.lat) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Aguardando localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* ETA Badge */}
      {deliveryLocation && eta && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white shadow-lg rounded-full px-4 py-2 border-2 border-blue-500">
          <p className="text-xs text-gray-600 text-center">
            {['going_to_store', 'arrived_at_store'].includes(order?.status)
              ? 'Entregador indo ao restaurante'
              : 'Previsão de chegada'}
          </p>
          <p className="font-bold text-blue-600 text-center">
            🗺️ ~{eta} min
          </p>
          {distance && (
            <p className="text-[10px] text-gray-500 text-center">{distance}</p>
          )}
        </div>
      )}

      {/* Status Card */}
      {mode === 'customer' && deliveryLocation && (
        <div className={`absolute top-20 left-4 right-4 z-[1000] text-white shadow-lg rounded-xl p-3 ${
          ['going_to_store', 'arrived_at_store'].includes(order?.status)
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
            : 'bg-gradient-to-r from-green-500 to-green-600'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">
                {['going_to_store', 'arrived_at_store'].includes(order?.status)
                  ? 'Entregador indo ao restaurante 🏪'
                  : 'Seu pedido está a caminho! 🚴'}
              </p>
              <p className="text-xs opacity-90">
                {['going_to_store', 'arrived_at_store'].includes(order?.status)
                  ? 'Aguarde enquanto o entregador busca seu pedido'
                  : 'Acompanhe o entregador em tempo real'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapRef} className="h-full w-full rounded-lg" />

      {/* Navigation Button */}
      {mode === 'entregador' && customerLocation && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          {distance && (
            <Badge className="bg-green-500 text-white text-xs shadow-lg mb-2">
              🗺️ Google Maps
            </Badge>
          )}
          <Button
            size="sm"
            onClick={() => {
              const dest = ['going_to_store', 'arrived_at_store'].includes(order?.status)
                ? storeLocation
                : customerLocation;
              const address = order?.address || `${dest.lat},${dest.lng}`;
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`);
            }}
            className="bg-blue-500 hover:bg-blue-600 shadow-lg block"
          >
            <Navigation className="w-4 h-4 mr-1" />
            Abrir GPS
          </Button>
        </div>
      )}
    </div>
  );
}