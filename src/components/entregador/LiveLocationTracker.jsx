import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function LiveLocationTracker({ entregador, onLocationUpdate }) {
  useEffect(() => {
    if (!entregador || entregador._isVirtual) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Atualizar estado local
        onLocationUpdate({ lat: latitude, lng: longitude });

        // Atualizar banco de dados
        try {
          await base44.entities.Entregador.update(entregador.id, {
            current_latitude: latitude,
            current_longitude: longitude
          });
        } catch (error) {
          console.error('Erro ao atualizar localização:', error);
        }
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [entregador, onLocationUpdate]);

  return null;
}