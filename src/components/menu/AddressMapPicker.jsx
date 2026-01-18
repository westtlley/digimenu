import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para centralizar mapa quando posição muda
function AutoCenter({ center, zoom = 16 }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom, {
        animate: true,
        duration: 0.5
      });
    }
  }, [center, zoom, map]);
  
  return null;
}

// Componente para ajustar tamanho do mapa
function FixMapResize() {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
}

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  // Criar ícone customizado para o marcador
  const customIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return position ? <Marker position={position} icon={customIcon} draggable={true} eventHandlers={{
    dragend: (e) => {
      const marker = e.target;
      const position = marker.getLatLng();
      setPosition(position);
    }
  }} /> : null;
}

export default function AddressMapPicker({ isOpen, onClose, onConfirm, initialAddress = '' }) {
  const [position, setPosition] = useState({ lat: -5.0892, lng: -42.8019 });
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searching, setSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialAddress && isOpen) {
      setSearchQuery(initialAddress);
      handleSearch(initialAddress);
    }
  }, [isOpen, initialAddress]);

  // Buscar sugestões de endereço enquanto digita (autocompletar)
  const fetchSuggestions = async (query) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Brasil')}&limit=5&countrycodes=br`
      );
      const data = await res.json();
      
      if (data && data.length > 0) {
        setSuggestions(data);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (e) {
      console.error('Erro ao buscar sugestões:', e);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Debounce para autocompletar
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery && searchQuery.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Selecionar sugestão e aplicar
  const handleSelectSuggestion = async (suggestion) => {
    const newPos = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };
    setPosition(newPos);
    setAddress(suggestion.display_name);
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Aguardar um pouco e fazer reverse geocoding para preencher campos
    setTimeout(() => {
      reverseGeocode(newPos.lat, newPos.lng);
    }, 200);
  };

  // Buscar endereço a partir de texto (busca final)
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    setSearching(true);
    setShowSuggestions(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Brasil')}&limit=1&countrycodes=br`
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
        setSearchQuery(bestMatch.display_name);
        
        // Fazer reverse geocoding para preencher campos detalhados
        setTimeout(() => {
          reverseGeocode(newPos.lat, newPos.lng);
        }, 300);
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
          <div className="p-3 border-b space-y-2 relative">
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Digite seu endereço ou arraste o marcador no mapa"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                      setShowSuggestions(false);
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className="flex-1 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                      setShowSuggestions(false);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {/* Sugestões de Autocompletar */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="w-full text-left p-3 hover:bg-orange-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {suggestion.display_name.split(',')[0]}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {suggestion.display_name}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
          <div className="flex-1 relative min-h-[400px]">
            <MapContainer
              center={[position.lat, position.lng]}
              zoom={16}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <FixMapResize />
              <AutoCenter center={[position.lat, position.lng]} zoom={16} />
              
              {/* TileLayer com visual melhorado */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
                minZoom={3}
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