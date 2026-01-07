import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Search, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import 'leaflet/dist/leaflet.css';

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function AddressMapPicker({ isOpen, onClose, onConfirm, initialAddress = '' }) {
  const [position, setPosition] = useState({ lat: -5.0892, lng: -42.8019 });
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searching, setSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  useEffect(() => {
    if (initialAddress && isOpen) {
      setSearchQuery(initialAddress);
      handleSearch(initialAddress);
    }
  }, [isOpen, initialAddress]);

  // Buscar endereço a partir de texto
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Brasil')}&limit=5`
      );
      const data = await res.json();
      
      if (data && data.length > 0) {
        const bestMatch = data[0];
        const newPos = {
          lat: parseFloat(bestMatch.lat),
          lng: parseFloat(bestMatch.lon)
        };
        setPosition(newPos);
        setAddress(bestMatch.display_name);
      }
    } catch (e) {
      console.error('Erro ao buscar endereço:', e);
    } finally {
      setSearching(false);
    }
  };

  // Buscar endereço a partir de coordenadas (reverse geocoding)
  const reverseGeocode = async (lat, lng) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      
      if (data && data.address) {
        const addr = data.address;
        const formattedAddress = data.display_name;
        setAddress(formattedAddress);
        
        return {
          street: addr.road || '',
          number: addr.house_number || '',
          neighborhood: addr.suburb || addr.neighbourhood || addr.city_district || '',
          city: addr.city || addr.town || addr.municipality || '',
          state: addr.state || '',
          fullAddress: formattedAddress
        };
      }
    } catch (e) {
      console.error('Erro ao buscar endereço:', e);
    } finally {
      setReverseGeocoding(false);
    }
    return null;
  };

  // Quando o usuário move o marcador, buscar o endereço
  useEffect(() => {
    if (position && isOpen) {
      reverseGeocode(position.lat, position.lng);
    }
  }, [position, isOpen]);

  // Obter localização atual do usuário
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (error) => {
          alert('Não foi possível obter sua localização');
        }
      );
    } else {
      alert('Geolocalização não suportada pelo navegador');
    }
  };

  const handleConfirm = async () => {
    const addressData = await reverseGeocode(position.lat, position.lng);
    
    onConfirm({
      latitude: position.lat,
      longitude: position.lng,
      addressData
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] p-0" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-orange-500" />
            Selecione sua Localização
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Digite seu endereço ou arraste o marcador no mapa"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button
                onClick={() => handleSearch()}
                disabled={searching || !searchQuery.trim()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              onClick={handleCurrentLocation}
              variant="outline"
              className="w-full h-8"
              size="sm"
            >
              <Navigation className="w-3 h-3 mr-2" />
              Usar Minha Localização Atual
            </Button>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              key={`${position.lat}-${position.lng}`}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>

            {/* Endereço detectado */}
            {address && (
              <div className="absolute top-2 left-2 right-2 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border-2 border-orange-200">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900">Endereço:</p>
                    <p className="text-xs text-gray-700 line-clamp-2">{address}</p>
                    {reverseGeocoding && (
                      <p className="text-xs text-orange-600 mt-0.5 animate-pulse">
                        Atualizando...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instrução */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium">
              👆 Clique no mapa ou arraste o marcador
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-white space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!position || reverseGeocoding}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {reverseGeocoding ? 'Processando...' : 'Confirmar Localização'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}