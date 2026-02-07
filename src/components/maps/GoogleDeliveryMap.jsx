import React, { useEffect, useState, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Navigation, MapPin, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const DEFAULT_CENTER = { lat: -15.7942, lng: -47.8822 };

function calculateBearing(from, to) {
  if (!from || !to) return 0;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Gera data URL do ícone da moto rotacionado com sombra animada (bearing: 0=Norte, 90=Leste). */
function getMotoIconUrl(bearingDeg = 0, pulse = false) {
  const rotation = bearingDeg - 90;
  const pulseOpacity = pulse ? 0.3 : 0.2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ea580c"/></linearGradient>
      <filter id="shadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="0" dy="2" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <g transform="rotate(${rotation} 28 28)">
      <!-- Sombra animada (pulso) -->
      <circle cx="28" cy="28" r="20" fill="#000" opacity="${pulseOpacity}" filter="url(#shadow)"/>
      <!-- Moto -->
      <path d="M14 34 Q16 28 22 26 L34 26 Q40 26 44 28 L48 32 L46 34 L42 30 Q38 28 34 28 L22 28 Q18 30 16 34 Z" fill="url(#g)" stroke="#c2410c" stroke-width="1" filter="url(#shadow)"/>
      <ellipse cx="28" cy="26" rx="6" ry="2.5" fill="#fef3c7" stroke="#c2410c"/>
      <circle cx="48" cy="30" r="2" fill="#fef9c3"/>
      <circle cx="14" cy="40" r="6" fill="#475569" stroke="#1e293b" stroke-width="1"/>
      <circle cx="44" cy="40" r="6" fill="#475569" stroke="#1e293b" stroke-width="1"/>
    </g>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Easing function para animação suave (estilo Uber/iFood) */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Interpolação suave do marcador entre dois pontos (estilo Uber/iFood/99) — requestAnimationFrame.
 *  cancelRef.current = fn para cancelar a animação em andamento.
 *  onProgress = callback chamado durante a animação com progresso e posição atual. */
function animateMarker(marker, from, to, durationMs = 2000, cancelRef, onProgress = null) {
  if (!marker || !from || !to) return;
  let rafId;
  const start = performance.now();
  const cancel = () => { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } };
  if (cancelRef) cancelRef.current = cancel;

  function frame(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = easeInOutCubic(progress);
    
    const lat = from.lat + (to.lat - from.lat) * eased;
    const lng = from.lng + (to.lng - from.lng) * eased;
    
    marker.setPosition({ lat, lng });
    
    if (onProgress) {
      onProgress({ progress, eased, position: { lat, lng } });
    }
    
    if (progress < 1) {
      rafId = requestAnimationFrame(frame);
    }
  }
  rafId = requestAnimationFrame(frame);
}

/** Anima marcador ao longo de uma rota (array de pontos) - estilo Uber/iFood */
function animateMarkerAlongRoute(marker, route, durationMs = 3000, cancelRef, onProgress = null) {
  if (!marker || !route || route.length < 2) return;
  
  let rafId;
  const start = performance.now();
  const cancel = () => { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } };
  if (cancelRef) cancelRef.current = cancel;

  function frame(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = easeInOutCubic(progress);
    
    const totalSegments = route.length - 1;
    const segmentProgress = eased * totalSegments;
    const segmentIndex = Math.floor(segmentProgress);
    const segmentT = segmentProgress - segmentIndex;
    
    if (segmentIndex >= totalSegments) {
      marker.setPosition(route[route.length - 1]);
      if (onProgress) onProgress({ progress: 1, eased: 1, position: route[route.length - 1] });
      return;
    }
    
    const from = route[segmentIndex];
    const to = route[segmentIndex + 1];
    const lat = from.lat + (to.lat - from.lat) * segmentT;
    const lng = from.lng + (to.lng - from.lng) * segmentT;
    
    marker.setPosition({ lat, lng });
    
    if (onProgress) {
      onProgress({ progress, eased, position: { lat, lng }, segmentIndex, segmentT });
    }
    
    if (progress < 1) {
      rafId = requestAnimationFrame(frame);
    }
  }
  rafId = requestAnimationFrame(frame);
}

const DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

/**
 * Mapa de entrega com Google Maps — entregador animado em tempo real (estilo iFood).
 * - Interpolação suave com requestAnimationFrame (sem teleporte)
 * - Rotação do ícone da moto conforme a direção do movimento
 * - Rota via OpenRouteService; overlay de distância/tempo e botão de navegação
 *
 * Requer: VITE_GOOGLE_MAPS_KEY (ou VITE_GOOGLE_MAPS_API_KEY) no .env — API 2.x
 */
export default function GoogleDeliveryMap({
  entregadorLocation,
  storeLocation,
  customerLocation,
  order,
  darkMode = false,
  mode = 'entregador',
  onNavigate,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerStoreRef = useRef(null);
  const markerCustomerRef = useRef(null);
  const markerEntregadorRef = useRef(null);
  const routePolylineRef = useRef(null);
  const trailPolylineRef = useRef(null);
  const lastPosRef = useRef(null);
  const cancelAnimRef = useRef(null);
  const trailHistoryRef = useRef([]);
  const pulseIntervalRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [route, setRoute] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasLocations = !!(customerLocation || storeLocation);

  // Inicializar Google Maps — API 2.x: setOptions + importLibrary("maps") + new Map(element, options)
  // hasLocations: só monta o mapa quando há loja ou cliente (o div ref={mapRef} existe)
  useEffect(() => {
    if (!apiKey || !hasLocations || !mapRef.current) return;

    setLoadError(null);
    setOptions({ apiKey, language: 'pt-BR', region: 'BR' });

    (async () => {
      try {
        const [{ Map, Marker: MarkerFromMaps }, { Marker: MarkerFromLib }] = await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
        ]);
        const Marker = MarkerFromLib ?? MarkerFromMaps;
        if (typeof Marker !== 'function') throw new Error('Marker não disponível. Verifique importLibrary("maps") e importLibrary("marker").');

        const center = customerLocation || storeLocation || entregadorLocation || DEFAULT_CENTER;
        const map = new Map(mapRef.current, {
          center: { lat: center.lat ?? DEFAULT_CENTER.lat, lng: center.lng ?? DEFAULT_CENTER.lng },
          zoom: 14,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          fullscreenControl: true,
          streetViewControl: false,
          styles: darkMode ? DARK_STYLES : undefined,
        });

        // google.maps disponível após importLibrary('maps') — SymbolPath, Size, Point, Polyline
        const g = typeof google !== 'undefined' ? google.maps : null;
        if (!g) throw new Error('google.maps não disponível após importLibrary.');

        const mkStore = new Marker({
          map,
          position: storeLocation || center,
          title: 'Restaurante',
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          visible: !!storeLocation,
        });

        const mkCustomer = new Marker({
          map,
          position: customerLocation || center,
          title: 'Cliente',
          icon: {
            path: g.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#8b5cf6',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
          visible: !!customerLocation,
        });

        const pos0 = entregadorLocation || storeLocation || customerLocation || center;
        const mkEntregador = new Marker({
          map,
          position: pos0,
          title: 'Entregador',
          icon: { url: getMotoIconUrl(0), scaledSize: new g.Size(44, 44), anchor: new g.Point(22, 22) },
          visible: !!entregadorLocation,
        });

        const poly = new g.Polyline({
          map,
          path: [],
          strokeColor: '#3b82f6',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          geodesic: true,
        });

        // Polyline para rastro/trail do entregador (estilo Uber/iFood)
        const trailPoly = new g.Polyline({
          map,
          path: [],
          strokeColor: '#f97316',
          strokeOpacity: 0.4,
          strokeWeight: 3,
          geodesic: true,
          zIndex: 1,
        });

        mapInstanceRef.current = map;
        markerStoreRef.current = mkStore;
        markerCustomerRef.current = mkCustomer;
        markerEntregadorRef.current = mkEntregador;
        routePolylineRef.current = poly;
        trailPolylineRef.current = trailPoly;
        lastPosRef.current = entregadorLocation ? { ...entregadorLocation } : null;
        trailHistoryRef.current = entregadorLocation ? [{ ...entregadorLocation }] : [];
        setMapLoaded(true);
      } catch (err) {
        setLoadError(err?.message || 'Erro ao carregar Google Maps');
      }
    })();

    return () => {
      cancelAnimRef.current?.();
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      routePolylineRef.current?.setMap(null);
      trailPolylineRef.current?.setMap(null);
      markerStoreRef.current?.setMap(null);
      markerCustomerRef.current?.setMap(null);
      markerEntregadorRef.current?.setMap(null);
      mapInstanceRef.current = null;
      trailHistoryRef.current = [];
      setMapLoaded(false);
    };
  }, [apiKey, hasLocations, darkMode]);

  // Aplicar tema escuro quando mudar
  useEffect(() => {
    const m = mapInstanceRef.current;
    if (!m) return;
    m.setOptions({ styles: darkMode ? DARK_STYLES : undefined });
  }, [mapLoaded, darkMode]);

  // Atualizar marcadores de loja e cliente
  useEffect(() => {
    if (!mapLoaded) return;
    const ms = markerStoreRef.current;
    const mc = markerCustomerRef.current;
    if (storeLocation && ms) {
      ms.setPosition(storeLocation);
      ms.setVisible(true);
    } else if (ms) ms.setVisible(false);
    if (customerLocation && mc) {
      mc.setPosition(customerLocation);
      mc.setVisible(true);
    } else if (mc) mc.setVisible(false);
  }, [mapLoaded, storeLocation, customerLocation]);

  // Calcular rota (ORS) — chave em VITE_ORS_KEY no .env
  const orsKey = import.meta.env.VITE_ORS_KEY;
  useEffect(() => {
    if (!entregadorLocation || !customerLocation) {
      setRoute([]);
      setRouteInfo(null);
      return;
    }
    if (!orsKey) {
      setRoute([]);
      setRouteInfo(null);
      setRouteLoading(false);
      return;
    }
    setRouteLoading(true);
    let origin = entregadorLocation;
    if (order?.status === 'going_to_store' && storeLocation) origin = storeLocation;

    const body = { coordinates: [[origin.lng, origin.lat], [customerLocation.lng, customerLocation.lat]] };
    fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.features?.[0]) {
          const coords = data.features[0].geometry.coordinates.map((c) => ({ lat: c[1], lng: c[0] }));
          setRoute(coords);
          const s = data.features[0].properties.summary;
          setRouteInfo({ distance: (s.distance / 1000).toFixed(1), time: Math.ceil(s.duration / 60) });
        } else setRoute([]);
      })
      .catch(() => setRoute([]))
      .finally(() => setRouteLoading(false));
  }, [entregadorLocation, customerLocation, storeLocation, order?.status, orsKey]);

  // Desenhar polyline da rota
  useEffect(() => {
    const p = routePolylineRef.current;
    if (!p || !route.length) {
      if (p) p.setPath([]);
      return;
    }
    p.setPath(route.map((r) => ({ lat: r.lat, lng: r.lng })));
  }, [mapLoaded, route]);

  // Animação do entregador (estilo Uber/iFood/99: interpolação suave + rotação + rastro)
  useEffect(() => {
    if (!mapLoaded || !markerEntregadorRef.current) return;
    const mk = markerEntregadorRef.current;
    const g = typeof google !== 'undefined' ? google.maps : null;
    if (!g) return;

    if (!entregadorLocation) {
      mk.setVisible(false);
      lastPosRef.current = null;
      trailHistoryRef.current = [];
      if (trailPolylineRef.current) trailPolylineRef.current.setPath([]);
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      return;
    }

    const from = lastPosRef.current;
    const to = { lat: entregadorLocation.lat, lng: entregadorLocation.lng };

    // Primeira vez: posicionar sem animação
    if (!from) {
      mk.setPosition(to);
      mk.setIcon({ url: getMotoIconUrl(0, false), scaledSize: new g.Size(48, 48), anchor: new g.Point(24, 24) });
      mk.setVisible(true);
      lastPosRef.current = { ...to };
      trailHistoryRef.current = [{ ...to }];
      
      // Iniciar pulso do marcador
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      let pulseState = false;
      pulseIntervalRef.current = setInterval(() => {
        if (!mk.getVisible()) return;
        pulseState = !pulseState;
        const currentAngle = lastPosRef.current ? calculateBearing(lastPosRef.current, to) : 0;
        mk.setIcon({ url: getMotoIconUrl(currentAngle, pulseState), scaledSize: new g.Size(48, 48), anchor: new g.Point(24, 24) });
      }, 1000);
      return;
    }

    // Calcular distância e duração da animação
    const dist = Math.hypot(to.lat - from.lat, to.lng - from.lng);
    // Velocidade baseada na distância (mais rápido para distâncias maiores)
    const baseSpeed = 0.0001; // graus por ms
    const duration = Math.min(3000, Math.max(500, dist / baseSpeed));

    // Calcular ângulo de direção
    const angle = calculateBearing(from, to);
    
    // Se temos uma rota calculada, animar ao longo dela
    if (route.length >= 2) {
      // Encontrar o ponto mais próximo na rota para o entregador
      let closestRouteIndex = 0;
      let minDist = Infinity;
      route.forEach((point, idx) => {
        const d = Math.hypot(point.lat - to.lat, point.lng - to.lng);
        if (d < minDist) {
          minDist = d;
          closestRouteIndex = idx;
        }
      });
      
      // Animar ao longo da rota a partir do ponto mais próximo
      const routeSegment = route.slice(Math.max(0, closestRouteIndex - 1), Math.min(route.length, closestRouteIndex + 3));
      if (routeSegment.length >= 2) {
        cancelAnimRef.current?.();
        animateMarkerAlongRoute(
          mk,
          routeSegment,
          duration,
          cancelAnimRef,
          ({ position }) => {
            // Atualizar rastro durante a animação
            trailHistoryRef.current.push({ ...position });
            if (trailHistoryRef.current.length > 20) {
              trailHistoryRef.current.shift();
            }
            if (trailPolylineRef.current && trailHistoryRef.current.length >= 2) {
              trailPolylineRef.current.setPath(trailHistoryRef.current.map(p => ({ lat: p.lat, lng: p.lng })));
            }
            
            // Atualizar rotação durante movimento
            if (trailHistoryRef.current.length >= 2) {
              const prev = trailHistoryRef.current[trailHistoryRef.current.length - 2];
              const curr = position;
              const moveAngle = calculateBearing(prev, curr);
              mk.setIcon({ url: getMotoIconUrl(moveAngle, false), scaledSize: new g.Size(48, 48), anchor: new g.Point(24, 24) });
            }
          }
        );
      } else {
        // Fallback: animação linear
        cancelAnimRef.current?.();
        animateMarker(mk, from, to, duration, cancelAnimRef, ({ position }) => {
          trailHistoryRef.current.push({ ...position });
          if (trailHistoryRef.current.length > 20) trailHistoryRef.current.shift();
          if (trailPolylineRef.current && trailHistoryRef.current.length >= 2) {
            trailPolylineRef.current.setPath(trailHistoryRef.current.map(p => ({ lat: p.lat, lng: p.lng })));
          }
        });
      }
    } else {
      // Sem rota: animação linear simples
      cancelAnimRef.current?.();
      animateMarker(mk, from, to, duration, cancelAnimRef, ({ position }) => {
        trailHistoryRef.current.push({ ...position });
        if (trailHistoryRef.current.length > 20) trailHistoryRef.current.shift();
        if (trailPolylineRef.current && trailHistoryRef.current.length >= 2) {
          trailPolylineRef.current.setPath(trailHistoryRef.current.map(p => ({ lat: p.lat, lng: p.lng })));
        }
      });
    }

    // Atualizar ícone com rotação
    mk.setIcon({ url: getMotoIconUrl(angle, false), scaledSize: new g.Size(48, 48), anchor: new g.Point(24, 24) });
    mk.setVisible(true);
    lastPosRef.current = { ...to };
    
    // Adicionar ao histórico de rastro
    trailHistoryRef.current.push({ ...to });
    if (trailHistoryRef.current.length > 20) {
      trailHistoryRef.current.shift();
    }
    
    // Atualizar polyline do rastro
    if (trailPolylineRef.current && trailHistoryRef.current.length >= 2) {
      trailPolylineRef.current.setPath(trailHistoryRef.current.map(p => ({ lat: p.lat, lng: p.lng })));
    }
  }, [mapLoaded, entregadorLocation, route]);

  // Centralizar no entregador quando ele se move (opcional, suave)
  useEffect(() => {
    const m = mapInstanceRef.current;
    if (!m || !entregadorLocation) return;
    m.panTo({ lat: entregadorLocation.lat, lng: entregadorLocation.lng });
  }, [mapLoaded, entregadorLocation]);

  if (!apiKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
        <span className="text-4xl mb-2">🗺️</span>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center px-4">Configure VITE_GOOGLE_MAPS_KEY no .env para exibir o mapa.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
        <p className="text-red-600 dark:text-red-400 text-sm text-center mb-2">O mapa não abriu corretamente.</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs text-center mb-4">Chave do Google Maps, rede ou restrição de domínio (ex.: Vercel) podem causar isso.</p>
        {order?.address && (
          <button
            type="button"
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`, '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm"
          >
            <Navigation className="w-4 h-4" />
            Abrir no Google Maps
          </button>
        )}
      </div>
    );
  }

  if (!customerLocation && !storeLocation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">Carregando localizações...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="w-full h-full rounded-xl" />

      {/* Card distância / tempo */}
      {routeInfo && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 left-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[1000]"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-[10px] text-gray-500">Distância</p>
                <p className="font-bold text-gray-900 dark:text-white">{routeInfo.distance} km</p>
              </div>
            </div>
            <div className="border-l pl-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-[10px] text-gray-500">Tempo</p>
                <p className="font-bold text-gray-900 dark:text-white">{routeInfo.time} min</p>
              </div>
            </div>
          </div>
          {routeLoading && <p className="text-[10px] text-blue-600 mt-1 animate-pulse">Atualizando rota...</p>}
        </motion.div>
      )}

      {/* Botão abrir no Google Maps */}
      {order?.address && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-[1000]"
          onClick={() => (onNavigate ? onNavigate(order.address) : window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`, '_blank'))}
          title="Abrir no Google Maps"
        >
          <Navigation className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
}
