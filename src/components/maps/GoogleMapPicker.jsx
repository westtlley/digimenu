/**
 * Mapa Google para seleção de ponto (clique ou arrastar marcador).
 * Requer VITE_GOOGLE_MAPS_API_KEY.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin } from 'lucide-react';

const DEFAULT_CENTER = { lat: -15.7942, lng: -47.8822 };

export default function GoogleMapPicker({ center, onPositionChange, className = '', style = {} }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [loadError, setLoadError] = useState(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    setLoadError(null);
    const c = center || DEFAULT_CENTER;
    const loader = new Loader({ apiKey, version: 'weekly' });
    loader.load().then(() => {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: c.lat ?? DEFAULT_CENTER.lat, lng: c.lng ?? DEFAULT_CENTER.lng },
        zoom: 16,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        fullscreenControl: true,
        streetViewControl: false,
      });
      const marker = new google.maps.Marker({
        map,
        position: { lat: c.lat, lng: c.lng },
        draggable: true,
        title: 'Arraste ou clique no mapa',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
      });
      marker.addListener('dragend', () => {
        const p = marker.getPosition();
        if (p && onPositionChange) onPositionChange(p.lat(), p.lng());
      });
      map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition(e.latLng);
        if (onPositionChange) onPositionChange(lat, lng);
      });
      mapInstanceRef.current = map;
      markerRef.current = marker;
    }).catch((err) => setLoadError(err?.message || 'Erro ao carregar Google Maps'));

    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
      mapInstanceRef.current = null;
    };
  }, [apiKey]);

  // Atualizar centro e marcador quando center mudar (ex.: busca, CEP)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !center) return;
    const pos = { lat: center.lat, lng: center.lng };
    mapInstanceRef.current.panTo(pos);
    markerRef.current.setPosition(pos);
  }, [center?.lat, center?.lng]);

  if (!apiKey) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ minHeight: 300, ...style }}>
        <MapPin className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-gray-500 text-sm text-center px-4">Configure VITE_GOOGLE_MAPS_API_KEY no .env para exibir o mapa.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded-lg ${className}`} style={{ minHeight: 300, ...style }}>
        <p className="text-red-600 text-sm">Erro: {loadError}</p>
      </div>
    );
  }

  return <div ref={mapRef} className={`w-full h-full min-h-[300px] rounded-lg ${className}`} style={style} />;
}
