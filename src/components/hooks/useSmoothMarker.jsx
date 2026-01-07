import { useState, useEffect, useRef } from 'react';

/**
 * Hook para suavizar movimento do marker no mapa
 * Animação fluida estilo Uber/99 com aceleração e desaceleração
 */
export function useSmoothMarker(targetLocation, options = {}) {
  const {
    smoothingFactor = 0.15, // Suavização otimizada para movimento realista
    updateInterval = 50, // Atualização a cada 50ms para fluidez
    minSpeed = 0.00001 // Velocidade mínima para evitar paradas bruscas
  } = options;

  const [displayLocation, setDisplayLocation] = useState(targetLocation);
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const velocityRef = useRef({ lat: 0, lng: 0 });
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Validar localização alvo
    if (!targetLocation || !targetLocation.lat || !targetLocation.lng || 
        isNaN(targetLocation.lat) || isNaN(targetLocation.lng)) {
      if (isMountedRef.current) {
        setDisplayLocation(null);
      }
      return;
    }

    if (!displayLocation) {
      if (isMountedRef.current) {
        setDisplayLocation(targetLocation);
        velocityRef.current = { lat: 0, lng: 0 };
      }
      return;
    }

    // Animar suavemente com aceleração/desaceleração
    const animate = () => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      const timeDiff = now - lastUpdateRef.current;
      
      if (timeDiff < updateInterval) {
        if (isMountedRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return;
      }

      setDisplayLocation(prev => {
        if (!prev || !isMountedRef.current) return prev || targetLocation;

        try {
          const latDiff = targetLocation.lat - prev.lat;
          const lngDiff = targetLocation.lng - prev.lng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

          // Se muito próximo, ir direto ao alvo
          if (distance < 0.000005) {
            velocityRef.current = { lat: 0, lng: 0 };
            return targetLocation;
          }

          // Calcular aceleração com easing (acelera se longe, desacelera se perto)
          const acceleration = Math.min(1, distance * 10000);
          const damping = 0.95; // Amortecimento para suavidade

          // Atualizar velocidade com física suave
          velocityRef.current.lat = velocityRef.current.lat * damping + latDiff * smoothingFactor * acceleration;
          velocityRef.current.lng = velocityRef.current.lng * damping + lngDiff * smoothingFactor * acceleration;

          // Aplicar velocidade mínima para evitar movimento muito lento
          const velMagnitude = Math.sqrt(velocityRef.current.lat ** 2 + velocityRef.current.lng ** 2);
          if (velMagnitude < minSpeed && distance > 0.00001) {
            const factor = minSpeed / velMagnitude;
            velocityRef.current.lat *= factor;
            velocityRef.current.lng *= factor;
          }

          // Calcular nova posição
          const newLat = prev.lat + velocityRef.current.lat;
          const newLng = prev.lng + velocityRef.current.lng;

          // Validar nova posição
          if (isNaN(newLat) || isNaN(newLng)) {
            return prev;
          }

          return { lat: newLat, lng: newLng };
        } catch (error) {
          console.error('Erro na animação do marker:', error);
          return prev;
        }
      });

      lastUpdateRef.current = now;
      if (isMountedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (isMountedRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targetLocation, smoothingFactor, updateInterval, minSpeed]);

  return displayLocation;
}