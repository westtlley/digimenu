import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SAO_LUIS_MA_CENTER, resolveMapCenter } from '@/utils/addressSearch';

const DEFAULT_CENTER = SAO_LUIS_MA_CENTER;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapCenterSync({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function MapSizeSync() {
  const map = useMap();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [map]);

  return null;
}

function MapClickHandler({ onPositionChange }) {
  useMapEvents({
    click(event) {
      onPositionChange?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function LeafletMapPicker({ center, onPositionChange, className = '', style = {} }) {
  const resolvedCenter = resolveMapCenter(center, DEFAULT_CENTER);
  const markerPosition = [resolvedCenter.lat, resolvedCenter.lng];

  return (
    <div className={`overflow-hidden rounded-lg ${className}`} style={{ minHeight: 300, ...style }}>
      <MapContainer
        center={markerPosition}
        zoom={16}
        scrollWheelZoom
        className="h-full w-full min-h-[300px]"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapSizeSync />
        <MapCenterSync center={resolvedCenter} />
        <MapClickHandler onPositionChange={onPositionChange} />
        <Marker
          position={markerPosition}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const nextPosition = event.target.getLatLng();
              onPositionChange?.(nextPosition.lat, nextPosition.lng);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}
