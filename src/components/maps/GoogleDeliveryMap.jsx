import React, { useEffect, useState, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Navigation, MapPin, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI0NGE1MmYxODVhMTQ4MjFhZWFiMjUxZDFmYjhkMTg3IiwiaCI6Im11cm11cjY0In0=';
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

/** Gera data URL do ícone da moto rotacionado (bearing: 0=Norte, 90=Leste). */
function getMotoIconUrl(bearingDeg = 0) {
  const rotation = bearingDeg - 90;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ea580c"/></linearGradient>
    </defs>
    <g transform="rotate(${rotation} 28 28)">
      <path d="M14 34 Q16 28 22 26 L34 26 Q40 26 44 28 L48 32 L46 34 L42 30 Q38 28 34 28 L22 28 Q18 30 16 34 Z" fill="url(#g)" stroke="#c2410c" stroke-width="1"/>
      <ellipse cx="28" cy="26" rx="6" ry="2.5" fill="#fef3c7" stroke="#c2410c"/>
      <circle cx="48" cy="30" r="2" fill="#fef9c3"/>
      <circle cx="14" cy="40" r="6" fill="#475569" stroke="#1e293b" stroke-width="1"/>
      <circle cx="44" cy="40" r="6" fill="#475569" stroke="#1e293b" stroke-width="1"/>
    </g>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Interpolação suave do marcador entre dois pontos (estilo iFood) — requestAnimationFrame.
 *  cancelRef.current = fn para cancelar a animação em andamento. */
function animateMarker(marker, from, to, durationMs = 2000, cancelRef) {
  if (!marker || !from || !to) return;
  let rafId;
  const start = performance.now();
  const cancel = () => { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } };
  if (cancelRef) cancelRef.current = cancel;

  function frame(time) {
    const progress = Math.min((time - start) / durationMs, 1);
    const ease = 1 - Math.pow(1 - progress, 1.5);
    const lat = from.lat + (to.lat - from.lat) * ease;
    const lng = from.lng + (to.lng - from.lng) * ease;
    marker.setPosition({ lat, lng });
    if (progress < 1) rafId = requestAnimationFrame(frame);
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
 * Requer: VITE_GOOGLE_MAPS_KEY no .env
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
  const lastPosRef = useRef(null);
  const cancelAnimRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [route, setRoute] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const apiKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_KEY;

  // Inicializar Google Maps
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    setLoadError(null);
    const loader = new Loader({ apiKey, version: 'weekly' });

    loader.load().then(() => {
      const center = customerLocation || storeLocation || entregadorLocation || DEFAULT_CENTER;
      const map = new google.maps.Map(mapRef.current, {
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

      const mkStore = new google.maps.Marker({
        map,
        position: storeLocation || center,
        title: 'Restaurante',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        visible: !!storeLocation,
      });

      const mkCustomer = new google.maps.Marker({
        map,
        position: customerLocation || center,
        title: 'Cliente',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#8b5cf6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        visible: !!customerLocation,
      });

      const pos0 = entregadorLocation || storeLocation || customerLocation || center;
      const mkEntregador = new google.maps.Marker({
        map,
        position: pos0,
        title: 'Entregador',
        icon: { url: getMotoIconUrl(0), scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) },
        visible: !!entregadorLocation,
      });

      const poly = new google.maps.Polyline({
        map,
        path: [],
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        geodesic: true,
      });

      mapInstanceRef.current = map;
      markerStoreRef.current = mkStore;
      markerCustomerRef.current = mkCustomer;
      markerEntregadorRef.current = mkEntregador;
      routePolylineRef.current = poly;
      lastPosRef.current = entregadorLocation ? { ...entregadorLocation } : null;
      setMapLoaded(true);
    }).catch((err) => {
      setLoadError(err?.message || 'Erro ao carregar Google Maps');
    });

    return () => {
      cancelAnimRef.current?.();
      routePolylineRef.current?.setMap(null);
      markerStoreRef.current?.setMap(null);
      markerCustomerRef.current?.setMap(null);
      markerEntregadorRef.current?.setMap(null);
      mapInstanceRef.current = null;
      setMapLoaded(false);
    };
  }, [apiKey]);

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

  // Calcular rota (ORS)
  useEffect(() => {
    if (!entregadorLocation || !customerLocation) {
      setRoute([]);
      setRouteInfo(null);
      return;
    }
    setRouteLoading(true);
    let origin = entregadorLocation;
    if (order?.status === 'going_to_store' && storeLocation) origin = storeLocation;

    const body = { coordinates: [[origin.lng, origin.lat], [customerLocation.lng, customerLocation.lat]] };
    fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json' },
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
  }, [entregadorLocation, customerLocation, storeLocation, order?.status]);

  // Desenhar polyline da rota
  useEffect(() => {
    const p = routePolylineRef.current;
    if (!p || !route.length) {
      if (p) p.setPath([]);
      return;
    }
    p.setPath(route.map((r) => ({ lat: r.lat, lng: r.lng })));
  }, [mapLoaded, route]);

  // Animação do entregador (estilo iFood: interpolação + rotação)
  useEffect(() => {
    if (!mapLoaded || !markerEntregadorRef.current) return;
    const mk = markerEntregadorRef.current;

    if (!entregadorLocation) {
      mk.setVisible(false);
      lastPosRef.current = null;
      return;
    }

    const from = lastPosRef.current;
    const to = { lat: entregadorLocation.lat, lng: entregadorLocation.lng };

    if (!from) {
      mk.setPosition(to);
      mk.setIcon({ url: getMotoIconUrl(0), scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) });
      mk.setVisible(true);
      lastPosRef.current = { ...to };
      return;
    }

    const dist = Math.hypot(to.lat - from.lat, to.lng - from.lng);
    const duration = Math.min(2500, Math.max(800, dist * 80000));

    const angle = calculateBearing(from, to);
    mk.setIcon({ url: getMotoIconUrl(angle), scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) });
    mk.setVisible(true);

    cancelAnimRef.current?.();
    animateMarker(mk, from, to, duration, cancelAnimRef);
    lastPosRef.current = { ...to };
  }, [mapLoaded, entregadorLocation]);

  // Centralizar no entregador quando ele se move (opcional, suave)
  useEffect(() => {
    const m = mapInstanceRef.current;
    if (!m || !entregadorLocation) return;
    m.panTo({ lat: entregadorLocation.lat, lng: entregadorLocation.lng });
  }, [mapLoaded, entregadorLocation]);

  if (!apiKey) {
    if (typeof console !== 'undefined' && console.warn) console.warn('Google Maps desativado: VITE_GOOGLE_MAPS_KEY não definida');
    return null;
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
        <p className="text-red-600 dark:text-red-400 text-sm">Erro: {loadError}</p>
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
