/**
 * Mapa Google para entrega: loja, entregador (moto), cliente, rota.
 * Mesma API que ProfessionalDeliveryMap (Leaflet). Requer VITE_GOOGLE_MAPS_API_KEY.
 */
import React, { useEffect, useState, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Navigation, MapPin, Clock } from 'lucide-react';

const ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImI0NGE1MmYxODVhMTQ4MjFhZWFiMjUxZDFmYjhkMTg3IiwiaCI6Im11cm11cjY0In0=';
const DEFAULT = { lat: -15.7942, lng: -47.8822 };

function getMotoIconUrl(bearing = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><g transform="rotate(${bearing - 90} 28 28)"><path fill="#f97316" stroke="#c2410c" d="M14 34 Q16 28 22 26 L34 26 Q40 26 44 28 L48 32 L46 34 L42 30 Q38 28 34 28 L22 28 Q18 30 16 34 Z"/><circle cx="14" cy="40" r="6" fill="#475569"/><circle cx="44" cy="40" r="6" fill="#475569"/></g></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export default function GoogleProfessionalDeliveryMap({
  mode = 'gestor',
  deliveryLocation,
  customerLocation,
  storeLocation,
  deliveryName,
  customerName,
  showRoute = true,
  order,
  darkMode = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [route, setRoute] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const polyRef = useRef(null);
  const markerRefs = useRef({});

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const store = storeLocation || DEFAULT;
  const center = deliveryLocation || customerLocation || store;

  // Rota ORS
  useEffect(() => {
    if (!showRoute || !deliveryLocation || !customerLocation) { setRoute([]); setInfo(null); return; }
    setLoading(true);
    const body = { coordinates: [[deliveryLocation.lng, deliveryLocation.lat], [customerLocation.lng, customerLocation.lat]] };
    fetch('https://api.openrouteservice.org/v2/directions/driving-car', { method: 'POST', headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => r.json())
      .then(data => {
        if (data?.features?.[0]) {
          setRoute(data.features[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })));
          const s = data.features[0].properties.summary;
          setInfo({ distance: (s.distance / 1000).toFixed(1), time: Math.ceil(s.duration / 60) });
        } else setRoute([]);
      })
      .catch(() => setRoute([]))
      .finally(() => setLoading(false));
  }, [showRoute, deliveryLocation, customerLocation]);

  // Inicializar mapa (API nova: setOptions + importLibrary)
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    setLoadError(null);
    setOptions({ apiKey, version: 'weekly' });

    (async () => {
      try {
        await importLibrary('maps');
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 14,
          zoomControl: true,
          mapTypeControl: true,
          fullscreenControl: true,
          styles: darkMode ? [{ elementType: 'geometry', stylers: [{ color: '#242f3e' }] }] : undefined,
        });
        mapInstanceRef.current = map;

        const mkStore = new google.maps.Marker({ map, position: store, title: 'Restaurante', icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 10, fillColor: '#8b5cf6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }, visible: !!storeLocation });
        const mkDel = new google.maps.Marker({ map, position: deliveryLocation || center, title: deliveryName || 'Entregador', icon: { url: getMotoIconUrl(0), scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) }, visible: !!deliveryLocation });
        const mkCust = new google.maps.Marker({ map, position: customerLocation || center, title: customerName || 'Cliente', icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#8b5cf6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }, visible: !!customerLocation });
        const poly = new google.maps.Polyline({ map, path: [], strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 5 });

        markerRefs.current = { store: mkStore, delivery: mkDel, customer: mkCust };
        polyRef.current = poly;
        setMapLoaded(true);
      } catch (e) {
        setLoadError(e?.message || 'Erro ao carregar Google Maps');
      }
    })();

    return () => {
      Object.values(markerRefs.current || {}).forEach(m => m?.setMap?.(null));
      polyRef.current?.setMap?.(null);
      mapInstanceRef.current = null;
      setMapLoaded(false);
    };
  }, [apiKey]);

  // Atualizar marcadores e polyline
  useEffect(() => {
    const { store: ms, delivery: md, customer: mc } = markerRefs.current || {};
    if (ms) { ms.setPosition(store); ms.setVisible(!!storeLocation); }
    if (md) { md.setPosition(deliveryLocation || center); md.setVisible(!!deliveryLocation); if (deliveryLocation) md.setIcon({ url: getMotoIconUrl(route.length >= 2 ? Math.atan2(route[1].lng - route[0].lng, route[1].lat - route[0].lat) * 180 / Math.PI + 90 : 0), scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) }); }
    if (mc) { mc.setPosition(customerLocation || center); mc.setVisible(!!customerLocation); }
    if (polyRef.current) polyRef.current.setPath(route.map(p => ({ lat: p.lat, lng: p.lng })));
  }, [mapLoaded, deliveryLocation, customerLocation, storeLocation, store, center, route]);

  // Pan ao entregador
  useEffect(() => {
    const m = mapInstanceRef.current;
    if (m && deliveryLocation) m.panTo({ lat: deliveryLocation.lat, lng: deliveryLocation.lng });
  }, [mapLoaded, deliveryLocation]);

  if (!apiKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
        <MapPin className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center px-4">Configure VITE_GOOGLE_MAPS_API_KEY no .env para exibir o mapa.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-xl">
        <p className="text-red-600 dark:text-red-400 text-sm">Erro: {loadError}</p>
      </div>
    );
  }

  if (!customerLocation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl">
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      {info && (
        <div className="absolute top-3 left-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[1000]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div><p className="text-[10px] text-gray-500">Distância</p><p className="font-bold text-gray-900 dark:text-white">{info.distance} km</p></div>
            </div>
            <div className="border-l pl-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <div><p className="text-[10px] text-gray-500">Tempo</p><p className="font-bold text-gray-900 dark:text-white">{info.time} min</p></div>
            </div>
          </div>
          {loading && <p className="text-xs text-blue-600 mt-1 animate-pulse">Atualizando rota...</p>}
        </div>
      )}
      {order?.address && (
        <button
          className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-[1000]"
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`, '_blank')}
          title="Abrir no Google Maps"
        >
          <Navigation className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
