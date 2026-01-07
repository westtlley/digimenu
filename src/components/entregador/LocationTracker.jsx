import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Play, Square, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function LocationTracker({ entregador, currentOrder }) {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);

  useEffect(() => {
    // Auto-start tracking if there's an active order
    if (currentOrder && !isTracking) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [currentOrder]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste dispositivo');
      return;
    }

    setIsTracking(true);

    // High accuracy options
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setLocation(coords);
        setAccuracy(position.coords.accuracy);

        // Update backend immediately and then every 15 seconds
        const updateLocation = async () => {
          if (!entregador._isVirtual && entregador.id) {
            try {
              await base44.entities.Entregador.update(entregador.id, {
                ...entregador,
                current_latitude: coords.lat,
                current_longitude: coords.lng,
                status: currentOrder ? 'busy' : entregador.status
              });

              // Check proximity to delivery location if there's an active order
              if (currentOrder && currentOrder.address) {
                await checkProximityAndUpdateOrder(coords, currentOrder);
              }
            } catch (error) {
              console.error('Error updating location:', error);
            }
          }
        };

        // Update immediately
        updateLocation();

        // Set interval for periodic updates
        if (!updateIntervalRef.current) {
          updateIntervalRef.current = setInterval(updateLocation, 15000);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMsg = 'Erro ao obter localização';
        if (error.code === 1) {
          errorMsg = 'Permissão de localização negada. Ative nas configurações do navegador.';
        } else if (error.code === 2) {
          errorMsg = 'Localização indisponível no momento';
        } else if (error.code === 3) {
          errorMsg = 'Tempo esgotado ao buscar localização';
        }
        toast.error(errorMsg);
        stopTracking();
      },
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setIsTracking(false);
  };

  const checkProximityAndUpdateOrder = async (currentLocation, order) => {
    // Aproximação: considerar dentro de 100m como "chegou ao destino"
    const deliveryLocation = order.coordinates || getDefaultLocation();
    const distance = calculateDistance(
      currentLocation.lat, 
      currentLocation.lng,
      deliveryLocation.lat,
      deliveryLocation.lng
    );

    // Se está a menos de 100m e status ainda não é "pronto para confirmar"
    if (distance < 0.1 && order.status === 'out_for_delivery') {
      toast.success('📍 Você chegou ao destino! Confirme a entrega.');
      
      // Opcional: atualizar status automaticamente
      // await base44.entities.Order.update(order.id, {
      //   status: 'ready_to_confirm'
      // });
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toRad = (deg) => deg * (Math.PI / 180);

  const getDefaultLocation = () => ({
    lat: -5.0892,
    lng: -42.8019
  });

  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className={`w-5 h-5 ${isTracking ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="font-bold">Rastreamento GPS</h3>
        </div>
        <Badge className={isTracking ? 'bg-green-500' : 'bg-gray-500'}>
          {isTracking ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {location && (
        <div className="bg-blue-50 rounded-lg p-3 mb-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-900 font-medium">Localização Atual</p>
              <p className="text-blue-700 text-xs mt-1">
                Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
              </p>
              {accuracy && (
                <p className="text-blue-600 text-xs mt-1">
                  Precisão: ±{Math.round(accuracy)}m
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!isTracking && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <p className="text-xs text-yellow-800">
              Ative o rastreamento para que o restaurante possa acompanhar sua localização em tempo real.
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={isTracking ? stopTracking : startTracking}
        className={`w-full ${isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
      >
        {isTracking ? (
          <>
            <Square className="w-4 h-4 mr-2" />
            Parar Rastreamento
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Iniciar Rastreamento
          </>
        )}
      </Button>

      {currentOrder && isTracking && (
        <div className="mt-3 text-center text-xs text-gray-600">
          <p>🚴 Em rota para o cliente</p>
          <p className="font-medium">{currentOrder.customer_name}</p>
        </div>
      )}
    </div>
  );
}