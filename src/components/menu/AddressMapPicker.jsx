import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, X, Loader2 } from 'lucide-react';
import GoogleMapPicker from '@/components/maps/GoogleMapPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { buscarCEP } from '@/utils/cepService';
import toast from 'react-hot-toast';

export default function AddressMapPicker({ isOpen, onClose, onConfirm, initialAddress = '' }) {
  const [position, setPosition] = useState({ lat: -15.7942, lng: -47.8822 });
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searching, setSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cep, setCep] = useState('');
  const [loadingCEP, setLoadingCEP] = useState(false);
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

  // Formatar CEP
  const formatCEP = (value) => {
    const cleanCEP = value.replace(/\D/g, '');
    if (cleanCEP.length <= 8) {
      return cleanCEP.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  // Buscar endereço por CEP
  const handleCEPBlur = async () => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setLoadingCEP(true);
      try {
        const endereco = await buscarCEP(cleanCEP);
        
        // Buscar coordenadas do endereço encontrado
        const searchQuery = `${endereco.logradouro}, ${endereco.bairro}, ${endereco.cidade}, ${endereco.estado}`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Brasil')}&limit=1&countrycodes=br`
        );
        const geoData = await res.json();
        
        if (geoData && geoData.length > 0) {
          const newPos = {
            lat: parseFloat(geoData[0].lat),
            lng: parseFloat(geoData[0].lon)
          };
          setPosition(newPos);
          setAddress(geoData[0].display_name);
          setSearchQuery(geoData[0].display_name);
          
          // Preencher campos detalhados
          const addressData = await reverseGeocode(newPos.lat, newPos.lng);
          if (addressData) {
            // Atualizar CEP formatado
            setCep(endereco.cep || formatCEP(cleanCEP));
            toast.success('Endereço preenchido automaticamente!');
          }
        } else {
          // Se não encontrar coordenadas, preencher só os campos
          setAddress(endereco.enderecoCompleto);
          setCep(endereco.cep || formatCEP(cleanCEP));
          toast.success('Endereço preenchido! Selecione no mapa para confirmar coordenadas.');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        toast.error('CEP não encontrado. Preencha o endereço manualmente.');
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  // Quando o usuário move o marcador, buscar o endereço (debounced)
  useEffect(() => {
    if (!position || !isOpen) return;
    
    const timeoutId = setTimeout(() => {
      reverseGeocode(position.lat, position.lng);
    }, 500); // Delay para evitar muitas chamadas
    
    return () => clearTimeout(timeoutId);
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
    
    // Incluir CEP nos dados retornados
    const confirmData = {
      latitude: position.lat,
      longitude: position.lng,
      addressData: addressData ? { ...addressData, cep: cep } : { cep: cep },
      cep: cep
    };
    
    onConfirm(confirmData);
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
                    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
                      e.preventDefault();
                      setShowSuggestions(true);
                    }
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={(e) => {
                    // Delay para permitir que o clique na sugestão seja processado
                    setTimeout(() => {
                      // Só fechar se não estiver focando em uma sugestão
                      if (!e.relatedTarget?.closest('.suggestions-dropdown')) {
                        setShowSuggestions(false);
                      }
                    }, 200);
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
                      className="suggestions-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()} // Prevenir que o input perca o foco
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectSuggestion(suggestion);
                          }}
                          className="w-full text-left p-3 hover:bg-orange-50 active:bg-orange-100 border-b border-gray-100 last:border-b-0 transition-colors"
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

          {/* Map - Google Maps */}
          <div className="flex-1 relative min-h-[400px] max-h-[500px] overflow-hidden">
            <GoogleMapPicker
              center={position}
              onPositionChange={(lat, lng) => setPosition({ lat, lng })}
              className="absolute inset-0"
              style={{ height: '100%', width: '100%', zIndex: 1 }}
            />

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