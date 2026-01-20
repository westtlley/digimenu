/**
 * Mapa Google para o Gestor acompanhar múltiplos entregadores em tempo real.
 * Substitui MultiDeliveryTrackingMap (Leaflet). Requer VITE_GOOGLE_MAPS_API_KEY.
 */
import React, { useEffect, useState, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Navigation, MapPin, Clock, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const DEFAULT_CENTER = { lat: -5.0892, lng: -42.8019 };

function getMotoIconUrl(bearing = 0, color = '#22c55e') {
  const r = (bearing - 90) * (Math.PI / 180);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g transform="rotate(${(bearing - 90)} 24 24)"><path fill="${color}" stroke="#166534" stroke-width="1" d="M12 30q2-1 4-2t4-1l-2-4h-4q-1 2-2 4t-2 3zm8-14l4 8 8-2-4-8q-2 1-4 2t-4 2zm-8 20q-2 0-4-1t-4-3 -2-4q0-3 2.5-5.5T20 28q3 0 5.5 2.5T28 36q0 2-1 4t-3 4-4 2q-3 0-5.5-2.5T12 36z"/><circle cx="36" cy="36" r="6" fill="#475569"/></g></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export default function GoogleMultiDeliveryTrackingMap({
  entregadores = [],
  orders = [],
  stores = [],
  onSelectEntregador,
  onSelectOrder,
  darkMode = false,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [customerLocations, setCustomerLocations] = useState({});
  const [routes, setRoutes] = useState({});
  const [selectedEntregador, setSelectedEntregador] = useState(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Geocodificar endereços (Nominatim)
  useEffect(() => {
    orders.filter(o => ['going_to_store', 'out_for_delivery'].includes(o.status) && o.address).forEach(async (order) => {
      if (customerLocations[order.id]) return;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.address)}&limit=1`);
        const data = await res.json();
        if (data?.[0]) setCustomerLocations(prev => ({ ...prev, [order.id]: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } }));
      } catch (e) { console.error(e); }
    });
  }, [orders]);

  // Rotas ORS — chave em VITE_ORS_KEY no .env
  const orsKey = import.meta.env.VITE_ORS_KEY;
  useEffect(() => {
    if (!orsKey) return;
    entregadores.filter(e => e.status === 'busy' && e.current_latitude && e.current_longitude).forEach(async (ent) => {
      const order = orders.find(o => o.id === ent.current_order_id);
      if (!order || !customerLocations[order.id]) return;
      const key = `${ent.id}-${order.id}`;
      if (routes[key]) return;
      try {
        const body = { coordinates: [[ent.current_longitude, ent.current_latitude], [customerLocations[order.id].lng, customerLocations[order.id].lat]] };
        const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', { method: 'POST', headers: { Authorization: orsKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (data?.features?.[0]) {
          const path = data.features[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
          setRoutes(prev => ({ ...prev, [key]: { path, distance: (data.features[0].properties.summary.distance / 1000).toFixed(1), time: Math.ceil(data.features[0].properties.summary.duration / 60) } }));
        }
      } catch (e) { console.error(e); }
    });
  }, [entregadores, orders, customerLocations, orsKey]);

  const activeEntregadores = entregadores.filter(e => (e.status === 'busy' || e.current_order_id) && e.current_latitude && e.current_longitude);
  const pendingOrders = orders.filter(o => o.status === 'ready' && o.delivery_method === 'delivery');

  const allPoints = [
    ...activeEntregadores.map(e => ({ lat: e.current_latitude, lng: e.current_longitude })),
    ...Object.values(customerLocations),
    ...stores.filter(s => s.store_latitude && s.store_longitude).map(s => ({ lat: s.store_latitude, lng: s.store_longitude })),
  ];
  const center = allPoints.length > 0
    ? { lat: allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length, lng: allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length }
    : DEFAULT_CENTER;

  // Inicializar mapa Google (API nova: setOptions + importLibrary)
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    setLoadError(null);
    setOptions({ apiKey, version: 'weekly' });

    (async () => {
      try {
        await importLibrary('maps');
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          zoomControl: true,
          mapTypeControl: true,
          fullscreenControl: true,
          styles: darkMode ? [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          ] : undefined,
        });
        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (e) {
        setLoadError(e?.message || 'Erro ao carregar Google Maps');
      }
    })();

    return () => {
      Object.values(markersRef.current).forEach(m => m?.setMap?.(null));
      Object.values(polylinesRef.current).forEach(p => p?.setMap?.(null));
      markersRef.current = {};
      polylinesRef.current = {};
      mapInstanceRef.current = null;
      setMapLoaded(false);
    };
  }, [apiKey]);

  // Atualizar tema
  useEffect(() => {
    const m = mapInstanceRef.current;
    if (!m) return;
    m.setOptions({ styles: darkMode ? [{ elementType: 'geometry', stylers: [{ color: '#242f3e' }] }, { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }] : undefined });
  }, [mapLoaded, darkMode]);

  // Marcadores e polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    // Limpar anteriores
    Object.values(markersRef.current).forEach(m => m?.setMap?.(null));
    Object.values(polylinesRef.current).forEach(p => p?.setMap?.(null));
    markersRef.current = {};
    polylinesRef.current = {};

    // Lojas
    stores.forEach(s => {
      if (!s.store_latitude || !s.store_longitude) return;
      const m = new google.maps.Marker({ map, position: { lat: s.store_latitude, lng: s.store_longitude }, title: s.name || 'Restaurante', icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 8, fillColor: '#8b5cf6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      markersRef.current[`store-${s.id}`] = m;
    });

    // Rotas
    activeEntregadores.forEach(ent => {
      const order = orders.find(o => o.id === ent.current_order_id);
      if (!order || !customerLocations[order.id]) return;
      const r = routes[`${ent.id}-${order.id}`];
      if (!r?.path?.length) return;
      const poly = new google.maps.Polyline({ map, path: r.path, strokeColor: selectedEntregador === ent.id ? '#3b82f6' : '#10b981', strokeWeight: selectedEntregador === ent.id ? 6 : 4, strokeOpacity: 0.7 });
      polylinesRef.current[`route-${ent.id}`] = poly;
    });

    // Entregadores (moto)
    activeEntregadores.forEach(ent => {
      const order = orders.find(o => o.id === ent.current_order_id);
      const r = order ? routes[`${ent.id}-${order.id}`] : null;
      let bearing = 0;
      if (r?.path?.length >= 2) {
        const from = r.path[0], to = r.path[1];
        const dL = ((to.lng - from.lng) * Math.PI) / 180;
        bearing = (Math.atan2(Math.sin(dL) * Math.cos(to.lat * Math.PI / 180), Math.cos(from.lat * Math.PI / 180) * Math.sin(to.lat * Math.PI / 180) - Math.sin(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.cos(dL)) * 180 / Math.PI + 360) % 360;
      }
      const color = selectedEntregador === ent.id ? '#3b82f6' : (ent.status === 'busy' ? '#eab308' : '#22c55e');
      const m = new google.maps.Marker({
        map,
        position: { lat: ent.current_latitude, lng: ent.current_longitude },
        title: ent.name,
        icon: { url: getMotoIconUrl(bearing, color), scaledSize: new google.maps.Size(44, 44), anchor: new google.maps.Point(22, 22) },
      });
      m.addListener('click', () => { setSelectedEntregador(ent.id); onSelectEntregador?.(ent); if (order) onSelectOrder?.(order); });
      markersRef.current[`ent-${ent.id}`] = m;
    });

    // Clientes
    Object.entries(customerLocations).forEach(([orderId, loc]) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      const m = new google.maps.Marker({ map, position: loc, title: order.customer_name, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      m.addListener('click', () => onSelectOrder?.(order));
      markersRef.current[`cust-${orderId}`] = m;
    });

    // Pendentes
    pendingOrders.forEach(order => {
      const loc = customerLocations[order.id];
      if (!loc) return;
      const m = new google.maps.Marker({ map, position: loc, title: `#${order.order_code}`, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      m.addListener('click', () => onSelectOrder?.(order));
      markersRef.current[`pend-${order.id}`] = m;
    });
  }, [mapLoaded, activeEntregadores, customerLocations, routes, stores, orders, pendingOrders, selectedEntregador, onSelectEntregador, onSelectOrder]);

  // Ajustar bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || allPoints.length < 2) return;
    const b = new google.maps.LatLngBounds();
    allPoints.forEach(p => b.extend(p));
    map.fitBounds(b, 60);
  }, [mapLoaded, allPoints.length]);

  if (!apiKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6">
        <MapPin className="w-12 h-12 text-amber-500 mb-2" />
        <p className="text-amber-800 dark:text-amber-200 text-sm font-medium text-center mb-1">Chave do Google Maps não configurada</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs text-center max-w-xs">Adicione <code className="bg-black/5 dark:bg-white/10 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> (ou <code className="bg-black/5 dark:bg-white/10 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>) no <code className="bg-black/5 dark:bg-white/10 px-1 rounded">.env</code> na raiz e reinicie (<code>npm run dev</code>). Na Vercel: Settings → Environment Variables.</p>
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

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="w-full h-full rounded-xl" />

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[1000]">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-full" /><span className="text-gray-700 dark:text-gray-300">Disponível</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded-full" /><span className="text-gray-700 dark:text-gray-300">Em entrega</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-500 rounded-lg" /><span className="text-gray-700 dark:text-gray-300">Restaurante</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded-full" /><span className="text-gray-700 dark:text-gray-300">Cliente/Pedido</span></div>
        </div>
      </div>

      {/* Ativos */}
      <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-[1000]">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="font-bold text-sm text-gray-900 dark:text-white">Ativos</p>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-xs">🏍️ {activeEntregadores.length} entregadores</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs">📦 {pendingOrders.length} aguardando</p>
      </div>
    </div>
  );
}
