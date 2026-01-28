/**
 * Mapa de entrega no fluxo do entregador. Usa Google Maps.
 * Geocodifica order.address (Nominatim) e renderiza GoogleDeliveryMap.
 */
import React, { useEffect, useState } from 'react';
import GoogleDeliveryMap from '../maps/GoogleDeliveryMap';

const DEFAULT_STORE = { lat: -15.7942, lng: -47.8822 };

export default function DeliveryMap({ order, entregadorLocation, darkMode }) {
  const [customerLocation, setCustomerLocation] = useState(null);

  useEffect(() => {
    if (!order?.address) {
      setCustomerLocation(null);
      return;
    }
    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.address)}&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data?.[0]) return;
        setCustomerLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      })
      .catch(() => setCustomerLocation(null));
    return () => { cancelled = true; };
  }, [order?.address]);

  const storeLocation = order?.store_latitude && order?.store_longitude
    ? { lat: order.store_latitude, lng: order.store_longitude }
    : DEFAULT_STORE;

  return (
    <div className="relative h-64 rounded-lg overflow-hidden">
      <GoogleDeliveryMap
        entregadorLocation={entregadorLocation}
        storeLocation={storeLocation}
        customerLocation={customerLocation}
        order={order}
        darkMode={darkMode}
        mode="entregador"
        onNavigate={(address) => {
          const a = address || order?.address;
          if (!a) return;
          if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            window.open(`maps://maps.apple.com/?daddr=${encodeURIComponent(a)}`);
          } else {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a)}`);
          }
        }}
      />
    </div>
  );
}
