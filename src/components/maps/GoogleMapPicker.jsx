/**
 * Mapa Google para seleção de ponto (clique ou arrastar marcador).
 * Requer VITE_GOOGLE_MAPS_API_KEY.
 */
import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { SAO_LUIS_MA_CENTER, resolveMapCenter } from '@/utils/addressSearch';
import {
  canUseGoogleMaps,
  ensureGoogleMapsLoaded,
  getGoogleMapsApiKey,
  onGoogleMapsAuthFailure,
} from '@/utils/googleMapsLoader';

const DEFAULT_CENTER = SAO_LUIS_MA_CENTER;
const GOOGLE_MAP_ERROR_MESSAGE =
  'Google Maps indisponivel neste ambiente. Use a busca de endereco ou o CEP para localizar.';

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function detectGoogleMapOverlayError(container) {
  if (!container) return false;

  if (container.querySelector('.gm-err-container, .gm-err-message')) {
    return true;
  }

  const text = normalizeText(container.textContent || '');

  return [
    'esta pagina nao carregou o google maps corretamente',
    "this page didn't load google maps correctly",
    'for development purposes only',
    'voce e o proprietario deste site',
  ].some((pattern) => text.includes(pattern));
}

export default function GoogleMapPicker({
  center,
  onPositionChange,
  onLoadError,
  className = '',
  style = {},
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const hasReportedLoadErrorRef = useRef(false);
  const [loadError, setLoadError] = useState(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const apiKey = getGoogleMapsApiKey();

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let cancelled = false;
    let observer = null;
    let errorCheckTimeoutId = null;
    let delayedErrorCheckTimeoutId = null;
    let mapReadyTimeoutId = null;

    hasReportedLoadErrorRef.current = false;

    const failMapLoading = (message = GOOGLE_MAP_ERROR_MESSAGE) => {
      if (cancelled) return;

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      if (errorCheckTimeoutId) {
        clearTimeout(errorCheckTimeoutId);
        errorCheckTimeoutId = null;
      }

      if (delayedErrorCheckTimeoutId) {
        clearTimeout(delayedErrorCheckTimeoutId);
        delayedErrorCheckTimeoutId = null;
      }

      if (mapReadyTimeoutId) {
        clearTimeout(mapReadyTimeoutId);
        mapReadyTimeoutId = null;
      }

      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      mapInstanceRef.current = null;
      setIsMapVisible(false);
      setLoadError(message);

      if (!hasReportedLoadErrorRef.current) {
        hasReportedLoadErrorRef.current = true;
        onLoadError?.(message);
      }
    };

    setLoadError(null);
    setIsMapVisible(false);
    const c = resolveMapCenter(center, DEFAULT_CENTER);
    const unsubscribeAuthFailure = onGoogleMapsAuthFailure(() => {
      failMapLoading();
    });

    (async () => {
      try {
        await ensureGoogleMapsLoaded();
        if (cancelled || !mapRef.current) return;
        if (!canUseGoogleMaps()) {
          failMapLoading();
          return;
        }

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

        const syncGoogleOverlayState = () => {
          if (cancelled || !mapRef.current) return;
          if (!canUseGoogleMaps() || detectGoogleMapOverlayError(mapRef.current)) {
            failMapLoading();
            return;
          }

          setIsMapVisible(true);
        };

        syncGoogleOverlayState();

        observer = new MutationObserver(syncGoogleOverlayState);
        observer.observe(mapRef.current, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        errorCheckTimeoutId = setTimeout(syncGoogleOverlayState, 250);
        delayedErrorCheckTimeoutId = setTimeout(syncGoogleOverlayState, 1200);
        mapReadyTimeoutId = setTimeout(syncGoogleOverlayState, 1800);
      } catch (err) {
        failMapLoading(err?.message || 'Erro ao carregar Google Maps');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeAuthFailure();

      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      if (observer) {
        observer.disconnect();
      }

      if (errorCheckTimeoutId) {
        clearTimeout(errorCheckTimeoutId);
      }

      if (delayedErrorCheckTimeoutId) {
        clearTimeout(delayedErrorCheckTimeoutId);
      }

      if (mapReadyTimeoutId) {
        clearTimeout(mapReadyTimeoutId);
      }

      mapInstanceRef.current = null;
    };
  }, [apiKey, onLoadError]);

  // Atualizar centro e marcador quando center mudar (ex.: busca, CEP)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !center) return;
    const pos = resolveMapCenter(center, DEFAULT_CENTER);
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
      <div className={`flex flex-col items-center justify-center gap-2 bg-amber-50 rounded-lg ${className}`} style={{ minHeight: 300, ...style }}>
        <MapPin className="w-10 h-10 text-amber-500" />
        <p className="text-amber-700 text-sm text-center px-4">{loadError}</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ minHeight: 300, ...style }}>
      {!isMapVisible && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-100/95 text-gray-500">
          <MapPin className="w-10 h-10 text-gray-400" />
          <p className="text-sm text-center px-4">Carregando mapa...</p>
        </div>
      )}
      <div
        ref={mapRef}
        className={`w-full h-full min-h-[300px] rounded-lg transition-opacity duration-200 ${
          isMapVisible ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
        }`}
      />
    </div>
  );
}
