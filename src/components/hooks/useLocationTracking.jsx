import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook profissional de rastreamento GPS com suavização
 * Validação de accuracy, velocidade plausível e interpolação suave
 */
export function useLocationTracking({ enabled = true, updateInterval = 4000 }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);
  const lastValidLocationRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);

  // Validar se a localização é plausível
  const isLocationValid = useCallback((newLocation, accuracy) => {
    // Rejeitar se accuracy muito ruim (>30m)
    if (accuracy > 30) {
      console.log('Location rejected: poor accuracy', accuracy);
      return false;
    }

    // Se não há localização anterior, aceitar
    if (!lastValidLocationRef.current) {
      return true;
    }

    // Calcular distância da última localização válida
    const distance = calculateDistance(
      lastValidLocationRef.current.lat,
      lastValidLocationRef.current.lng,
      newLocation.lat,
      newLocation.lng
    );

    // Calcular tempo decorrido
    const now = Date.now();
    const timeDiff = lastUpdateTimeRef.current 
      ? (now - lastUpdateTimeRef.current) / 1000 
      : updateInterval / 1000;

    // Validar velocidade (máximo 120 km/h = 33.3 m/s)
    const speed = distance * 1000 / timeDiff; // m/s
    const maxSpeed = 40; // m/s (~144 km/h com margem)

    if (speed > maxSpeed) {
      console.log('Location rejected: implausible speed', speed, 'm/s');
      return false;
    }

    // Validar salto máximo (500m)
    if (distance > 0.5) {
      console.log('Location rejected: jump too large', distance, 'km');
      return false;
    }

    return true;
  }, [updateInterval]);

  // Calcular distância entre dois pontos (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg) => deg * (Math.PI / 180);

  // Iniciar rastreamento
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada');
      return;
    }

    setIsTracking(true);
    setError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const newAccuracy = position.coords.accuracy;

        // Validar localização
        if (isLocationValid(newLocation, newAccuracy)) {
          setCurrentLocation(newLocation);
          setAccuracy(newAccuracy);
          lastValidLocationRef.current = newLocation;
          lastUpdateTimeRef.current = Date.now();
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(error.message);
      },
      options
    );
  }, [isLocationValid]);

  // Parar rastreamento
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Auto-start/stop
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [enabled, startTracking, stopTracking]);

  return {
    currentLocation,
    accuracy,
    isTracking,
    error,
    startTracking,
    stopTracking
  };
}