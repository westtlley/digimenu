import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Navigation, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DeliveryMap({ order, entregadorLocation, darkMode }) {
  const [route, setRoute] = useState([]);
  const [customerLocation, setCustomerLocation] = useState(null);
  
  // Coordenadas padrão (ajustar conforme localização do restaurante)
  const storeLocation = [-23.5505, -46.6333]; // São Paulo, exemplo

  useEffect(() => {
    // Tentar geocodificar o endereço
    const geocodeAddress = async () => {
      if (order.address) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.address)}&limit=1`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            setCustomerLocation([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          }
        } catch (error) {
          console.error('Erro ao geocodificar endereço:', error);
          // Fallback para coordenada exemplo
          setCustomerLocation([-23.5615, -46.6565]);
        }
      } else {
        setCustomerLocation([-23.5615, -46.6565]);
      }
    };
    
    geocodeAddress();
  }, [order.address]);

  useEffect(() => {
    if (entregadorLocation && customerLocation) {
      setRoute([entregadorLocation, customerLocation]);
    }
  }, [entregadorLocation, customerLocation]);

  const openInNavigation = () => {
    if (!customerLocation) return;
    
    const address = encodeURIComponent(order.address);
    
    // Detectar sistema operacional
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Apple Maps com endereço
      window.open(`maps://maps.apple.com/?daddr=${address}`);
    } else {
      // Google Maps com endereço
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`);
    }
  };
  
  if (!customerLocation) {
    return (
      <div className="h-64 rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div className="relative h-64 rounded-lg overflow-hidden">
      <MapContainer
        center={entregadorLocation || storeLocation}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          url={darkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* Marcador da loja */}
        <Marker position={storeLocation}>
          <Popup>Restaurante</Popup>
        </Marker>
        
        {/* Marcador do cliente */}
        <Marker position={customerLocation}>
          <Popup>
            <div>
              <p className="font-bold">{order.customer_name}</p>
              <p className="text-xs">{order.address}</p>
            </div>
          </Popup>
        </Marker>
        
        {/* Marcador do entregador */}
        {entregadorLocation && (
          <Marker position={entregadorLocation}>
            <Popup>Você está aqui</Popup>
          </Marker>
        )}
        
        {/* Linha da rota */}
        {route.length > 0 && (
          <Polyline positions={route} color="blue" />
        )}
      </MapContainer>
      
      {/* Botão de navegação */}
      <button
        onClick={openInNavigation}
        className="absolute bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 z-[1000]"
      >
        <Navigation className="w-5 h-5" />
      </button>
    </div>
  );
}