import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_COORDINATES } from '@/utils/constants';
import { SYSTEM_NAME_SHORT } from '@/config/branding';

/**
 * Hook para geocodificação de endereços
 */
export function useGeocoding(address) {
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const geocode = useCallback(async (addr) => {
    if (!addr || !addr.trim()) {
      setCoordinates(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`,
        {
          headers: {
            'User-Agent': `${SYSTEM_NAME_SHORT}/1.0`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar coordenadas');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        setCoordinates({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
      } else {
        setCoordinates(DEFAULT_COORDINATES);
        setError('Endereço não encontrado');
      }
    } catch (err) {
      console.error('Erro na geocodificação:', err);
      setCoordinates(DEFAULT_COORDINATES);
      setError(err.message || 'Erro ao buscar coordenadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (address) {
      geocode(address);
    } else {
      setCoordinates(null);
    }
  }, [address, geocode]);

  return { coordinates, loading, error, geocode };
}
