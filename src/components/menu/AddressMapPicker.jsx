/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, X, Loader2 } from 'lucide-react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import GoogleMapPicker from '@/components/maps/GoogleMapPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { buscarCEP } from '@/utils/cepService';
import {
  SAO_LUIS_MA_CENTER,
  buildNominatimViewbox,
  createLocationBias,
  extractAddressData,
  extractAddressDataFromNominatim,
  formatCEP,
  resolveMapCenter,
  toFiniteNumber,
} from '@/utils/addressSearch';
import toast from 'react-hot-toast';

const GOOGLE_FIELDS = ['formattedAddress', 'location', 'addressComponents'];

function formattableToString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') return value.toString();
  return '';
}

function toLatLngLiteral(location) {
  if (!location) return null;

  const lat = typeof location.lat === 'function' ? location.lat() : toFiniteNumber(location.lat);
  const lng = typeof location.lng === 'function' ? location.lng() : toFiniteNumber(location.lng);

  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function buildGoogleBounds(center, radiusKm = 35) {
  const resolvedCenter = resolveMapCenter(center, SAO_LUIS_MA_CENTER);
  const maps = window.google?.maps;

  if (!maps?.LatLngBounds) return null;

  const latDelta = radiusKm / 111;
  const cosine = Math.cos((resolvedCenter.lat * Math.PI) / 180);
  const safeCosine = Math.abs(cosine) < 0.01 ? 0.01 : Math.abs(cosine);
  const lngDelta = radiusKm / (111 * safeCosine);

  return new maps.LatLngBounds(
    { lat: resolvedCenter.lat - latDelta, lng: resolvedCenter.lng - lngDelta },
    { lat: resolvedCenter.lat + latDelta, lng: resolvedCenter.lng + lngDelta }
  );
}

async function ensureGoogleAddressServices(apiKey, servicesRef, servicesPromiseRef) {
  if (!apiKey) return null;
  if (servicesRef.current) return servicesRef.current;

  if (!servicesPromiseRef.current) {
    servicesPromiseRef.current = (async () => {
      if (!window.google?.maps?.importLibrary) {
        setOptions({ apiKey, version: 'weekly' });
      }

      const [{ AutocompleteSuggestion, AutocompleteSessionToken }, { Geocoder }] = await Promise.all([
        importLibrary('places'),
        importLibrary('geocoding'),
      ]);

      const services = {
        AutocompleteSuggestion,
        AutocompleteSessionToken,
        geocoder: new Geocoder(),
      };

      servicesRef.current = services;
      return services;
    })().catch((error) => {
      servicesPromiseRef.current = null;
      throw error;
    });
  }

  return servicesPromiseRef.current;
}

function getAutocompleteSession(servicesRef, sessionTokenRef) {
  const Token = servicesRef.current?.AutocompleteSessionToken;
  if (!Token) return null;

  if (!sessionTokenRef.current) {
    sessionTokenRef.current = new Token();
  }

  return sessionTokenRef.current;
}

function resetAutocompleteSession(sessionTokenRef) {
  sessionTokenRef.current = null;
}

async function fetchNominatimJson(url) {
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`);
  }

  return response.json();
}

function mapGoogleSuggestion(suggestion) {
  const prediction = suggestion?.placePrediction;
  const title =
    formattableToString(prediction?.mainText) ||
    formattableToString(prediction?.text) ||
    '';
  const subtitle =
    formattableToString(prediction?.secondaryText) ||
    formattableToString(prediction?.text) ||
    '';

  return {
    id: prediction?.placeId || title || subtitle,
    title,
    subtitle,
    source: 'google',
    raw: suggestion,
  };
}

function mapNominatimSuggestion(item) {
  const address = item?.address || {};
  const title =
    address.road ||
    address.pedestrian ||
    address.footway ||
    item?.display_name?.split(',')?.[0]?.trim() ||
    'Endereco';

  return {
    id: item?.place_id || item?.osm_id || item?.display_name,
    title,
    subtitle: item?.display_name || '',
    source: 'nominatim',
    raw: item,
  };
}

async function fetchGoogleSuggestions(query, biasCenter, apiKey, servicesRef, servicesPromiseRef, sessionTokenRef) {
  const services = await ensureGoogleAddressServices(apiKey, servicesRef, servicesPromiseRef);
  if (!services?.AutocompleteSuggestion) return [];

  const sessionToken = getAutocompleteSession(servicesRef, sessionTokenRef);
  const locationBias = createLocationBias(biasCenter, 30000);
  const response = await services.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query,
    language: 'pt-BR',
    region: 'BR',
    includedRegionCodes: ['BR'],
    locationBias,
    origin: locationBias.center,
    sessionToken,
  });

  return (response?.suggestions || []).map(mapGoogleSuggestion);
}

async function fetchNominatimSuggestions(query, biasCenter) {
  const viewbox = buildNominatimViewbox(biasCenter, 35);
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br` +
    `&accept-language=pt-BR&bounded=0&viewbox=${encodeURIComponent(viewbox)}` +
    `&q=${encodeURIComponent(`${query}, Brasil`)}`;

  const data = await fetchNominatimJson(url);
  return (Array.isArray(data) ? data : []).map(mapNominatimSuggestion);
}

async function geocodePlaceIdWithGoogle(placeId, apiKey, servicesRef, servicesPromiseRef) {
  const services = await ensureGoogleAddressServices(apiKey, servicesRef, servicesPromiseRef);
  if (!services?.geocoder || !placeId) return null;

  const response = await services.geocoder.geocode({
    placeId,
    language: 'pt-BR',
    region: 'BR',
  });

  const result = response?.results?.[0];
  if (!result) return null;

  return {
    position: toLatLngLiteral(result.geometry?.location),
    addressData: extractAddressData(result),
  };
}

async function resolveGoogleSuggestion(suggestion, apiKey, servicesRef, servicesPromiseRef) {
  const placePrediction = suggestion?.raw?.placePrediction;
  const place = placePrediction?.toPlace?.();

  if (place) {
    try {
      await place.fetchFields({ fields: GOOGLE_FIELDS });

      const position = toLatLngLiteral(place.location);
      if (position) {
        return {
          position,
          addressData: extractAddressData(place),
        };
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do place selecionado:', error);
    }
  }

  return geocodePlaceIdWithGoogle(placePrediction?.placeId, apiKey, servicesRef, servicesPromiseRef);
}

async function resolveNominatimSuggestion(suggestion) {
  const latitude = toFiniteNumber(suggestion?.raw?.lat);
  const longitude = toFiniteNumber(suggestion?.raw?.lon);

  if (latitude == null || longitude == null) return null;

  return {
    position: { lat: latitude, lng: longitude },
    addressData: extractAddressDataFromNominatim(suggestion.raw),
  };
}

async function geocodeTextWithGoogle(query, biasCenter, apiKey, servicesRef, servicesPromiseRef) {
  const services = await ensureGoogleAddressServices(apiKey, servicesRef, servicesPromiseRef);
  if (!services?.geocoder) return null;

  const response = await services.geocoder.geocode({
    address: `${query}, Brasil`,
    language: 'pt-BR',
    region: 'BR',
    bounds: buildGoogleBounds(biasCenter, 35) || undefined,
  });

  const result = response?.results?.[0];
  if (!result) return null;

  return {
    position: toLatLngLiteral(result.geometry?.location),
    addressData: extractAddressData(result),
  };
}

async function geocodeTextWithNominatim(query, biasCenter) {
  const viewbox = buildNominatimViewbox(biasCenter, 35);
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=br` +
    `&accept-language=pt-BR&bounded=0&viewbox=${encodeURIComponent(viewbox)}` +
    `&q=${encodeURIComponent(`${query}, Brasil`)}`;

  const data = await fetchNominatimJson(url);
  const firstResult = Array.isArray(data) ? data[0] : null;

  if (!firstResult) return null;

  return resolveNominatimSuggestion({ raw: firstResult });
}

async function reverseGeocodeWithGoogle(lat, lng, apiKey, servicesRef, servicesPromiseRef) {
  const services = await ensureGoogleAddressServices(apiKey, servicesRef, servicesPromiseRef);
  if (!services?.geocoder) return null;

  const response = await services.geocoder.geocode({
    location: { lat, lng },
    language: 'pt-BR',
    region: 'BR',
  });

  const result = response?.results?.[0];
  if (!result) return null;

  return {
    position: { lat, lng },
    addressData: extractAddressData(result),
  };
}

async function reverseGeocodeWithNominatim(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1` +
    `&accept-language=pt-BR&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  const data = await fetchNominatimJson(url);
  if (!data?.address) return null;

  return {
    position: { lat, lng },
    addressData: extractAddressDataFromNominatim(data),
  };
}

export default function AddressMapPicker({
  isOpen,
  onClose,
  onConfirm,
  initialAddress = '',
  initialPosition = null,
  fallbackCenter = null,
  initialCep = '',
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const initialLat = initialPosition?.lat ?? initialPosition?.latitude;
  const initialLng = initialPosition?.lng ?? initialPosition?.longitude;
  const fallbackLat = fallbackCenter?.lat ?? fallbackCenter?.latitude;
  const fallbackLng = fallbackCenter?.lng ?? fallbackCenter?.longitude;
  const startingCenter = resolveMapCenter(initialPosition, fallbackCenter, SAO_LUIS_MA_CENTER);

  const [position, setPosition] = useState(startingCenter);
  const [biasCenter, setBiasCenter] = useState(startingCenter);
  const [address, setAddress] = useState('');
  const [resolvedAddressData, setResolvedAddressData] = useState(null);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [searching, setSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [cep, setCep] = useState(formatCEP(initialCep));
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef(null);
  const searchAreaRef = useRef(null);
  const servicesRef = useRef(null);
  const servicesPromiseRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const autocompleteRequestIdRef = useRef(0);
  const reverseRequestIdRef = useRef(0);
  const skipNextReverseRef = useRef(false);
  const skipNextAutocompleteRef = useRef(false);
  const positionLat = position?.lat;
  const positionLng = position?.lng;

  const applyResolvedResult = useCallback((resolved, options = {}) => {
    if (!resolved) return;

    const nextPosition = resolved.position
      ? resolveMapCenter(resolved.position, biasCenter, fallbackCenter, SAO_LUIS_MA_CENTER)
      : null;
    const nextFullAddress =
      resolved.addressData?.fullAddress ||
      options.fullAddress ||
      '';
    const normalizedCep = formatCEP(resolved.addressData?.cep || options.cep || '');
    const nextAddressData = resolved.addressData
      ? {
          ...resolved.addressData,
          cep: normalizedCep,
          fullAddress: nextFullAddress,
        }
      : null;

    if (nextPosition) {
      skipNextReverseRef.current = options.skipNextReverse === true;
      setPosition(nextPosition);
      setBiasCenter(nextPosition);
    }

    if (nextAddressData) {
      setResolvedAddressData(nextAddressData);
      setAddress(nextFullAddress);

      if (options.syncQuery !== false && nextFullAddress) {
        skipNextAutocompleteRef.current = true;
        setSearchQuery(nextFullAddress);
      }

      if (normalizedCep) {
        setCep(normalizedCep);
      }
    }

    if (options.closeSuggestions !== false) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      setShowSuggestions(false);
    }
  }, [biasCenter, fallbackCenter]);

  const runReverseGeocode = useCallback(async (lat, lng, options = {}) => {
    const requestId = ++reverseRequestIdRef.current;
    setReverseGeocoding(true);

    try {
      let resolved = null;

      try {
        resolved = await reverseGeocodeWithGoogle(lat, lng, apiKey, servicesRef, servicesPromiseRef);
      } catch (error) {
        console.error('Erro no reverse geocode do Google:', error);
      }

      if (!resolved) {
        resolved = await reverseGeocodeWithNominatim(lat, lng);
      }

      if (requestId !== reverseRequestIdRef.current) return null;

      if (resolved) {
        applyResolvedResult(resolved, options);
        return resolved.addressData;
      }
    } catch (error) {
      if (!options.silent) {
        console.error('Erro ao localizar endereco:', error);
      }
    } finally {
      if (requestId === reverseRequestIdRef.current) {
        setReverseGeocoding(false);
      }
    }

    return null;
  }, [apiKey, applyResolvedResult]);

  const handleSelectSuggestion = useCallback(async (suggestion) => {
    if (!suggestion) return;

    setSearching(true);

    try {
      let resolved = null;

      if (suggestion.source === 'google') {
        resolved = await resolveGoogleSuggestion(suggestion, apiKey, servicesRef, servicesPromiseRef);
      } else {
        resolved = await resolveNominatimSuggestion(suggestion);
      }

      if (!resolved) {
        toast.error('Nao foi possivel selecionar este endereco agora.');
        return;
      }

      resetAutocompleteSession(sessionTokenRef);
      applyResolvedResult(resolved, { skipNextReverse: true });
    } catch (error) {
      console.error('Erro ao selecionar sugestao:', error);
      toast.error('Nao foi possivel selecionar este endereco agora.');
    } finally {
      setSearching(false);
    }
  }, [apiKey, applyResolvedResult]);

  const handleSearch = useCallback(async (query = searchQuery) => {
    const trimmedQuery = String(query || '').trim();
    if (!trimmedQuery) return;

    setSearching(true);
    setShowSuggestions(false);

    try {
      const highlightedSuggestion =
        highlightedIndex >= 0 ? suggestions[highlightedIndex] : null;

      if (highlightedSuggestion) {
        await handleSelectSuggestion(highlightedSuggestion);
        return;
      }

      let searchSuggestions = suggestions;

      if (!searchSuggestions.length) {
        try {
          searchSuggestions = await fetchGoogleSuggestions(
            trimmedQuery,
            biasCenter,
            apiKey,
            servicesRef,
            servicesPromiseRef,
            sessionTokenRef
          );
        } catch (error) {
          console.error('Erro ao buscar autocomplete do Google:', error);
        }

        if (!searchSuggestions.length) {
          searchSuggestions = await fetchNominatimSuggestions(trimmedQuery, biasCenter);
        }
      }

      if (searchSuggestions[0]) {
        await handleSelectSuggestion(searchSuggestions[0]);
        return;
      }

      let resolved = null;

      try {
        resolved = await geocodeTextWithGoogle(
          trimmedQuery,
          biasCenter,
          apiKey,
          servicesRef,
          servicesPromiseRef
        );
      } catch (error) {
        console.error('Erro no geocode do Google:', error);
      }

      if (!resolved) {
        resolved = await geocodeTextWithNominatim(trimmedQuery, biasCenter);
      }

      if (!resolved) {
        toast.error('Nao encontramos um endereco valido. Tente rua, numero e bairro.');
        return;
      }

      resetAutocompleteSession(sessionTokenRef);
      applyResolvedResult(resolved, { skipNextReverse: true });
    } catch (error) {
      console.error('Erro ao buscar endereco:', error);
      toast.error('Nao foi possivel buscar esse endereco agora.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, highlightedIndex, suggestions, handleSelectSuggestion, biasCenter, apiKey, applyResolvedResult]);

  const handleCEPBlur = useCallback(async () => {
    const cleanCEP = String(cep || '').replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    setLoadingCEP(true);

    try {
      const endereco = await buscarCEP(cleanCEP);
      const composedAddress = [
        endereco.logradouro,
        endereco.bairro,
        endereco.cidade,
        endereco.estado,
      ].filter(Boolean).join(', ');

      let resolved = null;

      try {
        resolved = await geocodeTextWithGoogle(
          composedAddress,
          biasCenter,
          apiKey,
          servicesRef,
          servicesPromiseRef
        );
      } catch (error) {
        console.error('Erro ao geocodificar CEP com Google:', error);
      }

      if (!resolved) {
        resolved = await geocodeTextWithNominatim(composedAddress, biasCenter);
      }

      const fallbackAddressData = {
        street: endereco.logradouro || '',
        number: '',
        complement: '',
        neighborhood: endereco.bairro || '',
        city: endereco.cidade || '',
        state: endereco.estado || '',
        cep: formatCEP(endereco.cep || cleanCEP),
        fullAddress: endereco.enderecoCompleto || composedAddress,
      };

      if (resolved) {
        applyResolvedResult(
          {
            position: resolved.position,
            addressData: {
              ...resolved.addressData,
              street: resolved.addressData?.street || fallbackAddressData.street,
              neighborhood: resolved.addressData?.neighborhood || fallbackAddressData.neighborhood,
              city: resolved.addressData?.city || fallbackAddressData.city,
              state: resolved.addressData?.state || fallbackAddressData.state,
              cep: fallbackAddressData.cep,
              fullAddress: resolved.addressData?.fullAddress || fallbackAddressData.fullAddress,
            },
          },
          { skipNextReverse: true }
        );

        toast.success('Endereco preenchido automaticamente!');
        return;
      }

      applyResolvedResult(
        { position: null, addressData: fallbackAddressData },
        { closeSuggestions: true }
      );
      toast.success('Endereco preenchido! Ajuste o ponto no mapa para confirmar a localizacao.');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('CEP nao encontrado. Preencha o endereco manualmente.');
    } finally {
      setLoadingCEP(false);
    }
  }, [cep, biasCenter, apiKey, applyResolvedResult]);

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocalizacao nao suportada pelo navegador.');
      return;
    }

    setLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      async (coords) => {
        const nextPosition = {
          lat: coords.coords.latitude,
          lng: coords.coords.longitude,
        };

        setLocatingUser(false);
        skipNextReverseRef.current = true;
        setPosition(nextPosition);
        setBiasCenter(nextPosition);

        const addressData = await runReverseGeocode(nextPosition.lat, nextPosition.lng, {
          syncQuery: true,
          silent: false,
        });

        if (addressData) {
          toast.success('Localizacao atual aplicada.');
        } else {
          toast.success('Localizacao capturada. Ajuste o ponto no mapa se precisar.');
        }
      },
      (error) => {
        setLocatingUser(false);

        const messages = {
          1: 'Permissao de localizacao negada.',
          2: 'Nao foi possivel obter sua localizacao.',
          3: 'A busca da localizacao expirou. Tente novamente.',
        };

        toast.error(messages[error?.code] || 'Nao foi possivel obter sua localizacao.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [runReverseGeocode]);

  const handleConfirm = useCallback(async () => {
    if (!position) return;

    let nextAddressData = resolvedAddressData;

    if (!nextAddressData && position) {
      nextAddressData = await runReverseGeocode(position.lat, position.lng, {
        syncQuery: false,
        silent: false,
      });
    }

    const normalizedCep = formatCEP(nextAddressData?.cep || cep || '');

    onConfirm({
      latitude: position.lat,
      longitude: position.lng,
      addressData: {
        street: nextAddressData?.street || '',
        number: nextAddressData?.number || '',
        complement: nextAddressData?.complement || '',
        neighborhood: nextAddressData?.neighborhood || '',
        city: nextAddressData?.city || '',
        state: nextAddressData?.state || '',
        fullAddress: nextAddressData?.fullAddress || address || searchQuery,
        cep: normalizedCep,
      },
      cep: normalizedCep,
    });
  }, [resolvedAddressData, position, runReverseGeocode, cep, onConfirm, address, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const nextStartingCenter = resolveMapCenter(
      { lat: initialLat, lng: initialLng },
      { lat: fallbackLat, lng: fallbackLng },
      SAO_LUIS_MA_CENTER
    );
    const hasInitialPosition =
      toFiniteNumber(initialLat) != null && toFiniteNumber(initialLng) != null;

    autocompleteRequestIdRef.current += 1;
    reverseRequestIdRef.current += 1;
    skipNextAutocompleteRef.current = Boolean(initialAddress);

    setPosition(nextStartingCenter);
    setBiasCenter(nextStartingCenter);
    setAddress(initialAddress || '');
    setResolvedAddressData(null);
    setSearchQuery(initialAddress || '');
    setSuggestions([]);
    setHighlightedIndex(-1);
    setShowSuggestions(false);
    setCep(formatCEP(initialCep || ''));

    let cancelled = false;

    const bootstrap = async () => {
      try {
        await ensureGoogleAddressServices(apiKey, servicesRef, servicesPromiseRef);
      } catch (error) {
        console.error('Google Places/Geocoding indisponivel, usando fallback:', error);
      }

      if (cancelled) return;

      if (hasInitialPosition && (!initialAddress || !initialCep)) {
        skipNextReverseRef.current = true;
        await runReverseGeocode(nextStartingCenter.lat, nextStartingCenter.lng, {
          syncQuery: !initialAddress,
          closeSuggestions: false,
          silent: true,
        });
        return;
      }

      if (!hasInitialPosition && initialAddress) {
        await handleSearch(initialAddress);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    apiKey,
    initialAddress,
    initialCep,
    initialLat,
    initialLng,
    fallbackLat,
    fallbackLng,
    handleSearch,
    runReverseGeocode,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (searchAreaRef.current?.contains(event.target)) return;
      setShowSuggestions(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const query = String(debouncedSearchQuery || '').trim();

    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }

    if (query.length < 3) {
      setLoadingSuggestions(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
      setShowSuggestions(false);
      return;
    }

    const requestId = ++autocompleteRequestIdRef.current;

    const loadSuggestions = async () => {
      setLoadingSuggestions(true);

      try {
        let nextSuggestions = [];

        try {
          nextSuggestions = await fetchGoogleSuggestions(
            query,
            biasCenter,
            apiKey,
            servicesRef,
            servicesPromiseRef,
            sessionTokenRef
          );
        } catch (error) {
          console.error('Erro ao buscar autocomplete do Google:', error);
        }

        if (!nextSuggestions.length) {
          nextSuggestions = await fetchNominatimSuggestions(query, biasCenter);
        }

        if (requestId !== autocompleteRequestIdRef.current) return;

        setSuggestions(nextSuggestions);
        setHighlightedIndex(nextSuggestions.length ? 0 : -1);
        setShowSuggestions(document.activeElement === inputRef.current);
      } catch (error) {
        if (requestId !== autocompleteRequestIdRef.current) return;

        console.error('Erro ao buscar sugestoes:', error);
        setSuggestions([]);
        setHighlightedIndex(-1);
        setShowSuggestions(document.activeElement === inputRef.current);
      } finally {
        if (requestId === autocompleteRequestIdRef.current) {
          setLoadingSuggestions(false);
        }
      }
    };

    loadSuggestions();
  }, [debouncedSearchQuery, biasCenter, apiKey, isOpen]);

  useEffect(() => {
    if (!isOpen || positionLat == null || positionLng == null) return;

    if (skipNextReverseRef.current) {
      skipNextReverseRef.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      runReverseGeocode(positionLat, positionLng, {
        syncQuery: true,
        silent: true,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [positionLat, positionLng, isOpen, runReverseGeocode]);

  const isDropdownVisible =
    showSuggestions &&
    (loadingSuggestions || suggestions.length > 0 || String(searchQuery || '').trim().length >= 3);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl h-[90vh] p-0"
        onClick={(event) => event.stopPropagation()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="p-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-orange-500" />
            Selecione sua localizacao
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div ref={searchAreaRef} className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    placeholder="Digite seu endereco ou arraste o marcador no mapa"
                    value={searchQuery}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSearchQuery(nextValue);

                      if (nextValue.trim().length >= 3) {
                        setShowSuggestions(true);
                      } else {
                        setSuggestions([]);
                        setHighlightedIndex(-1);
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (String(searchQuery || '').trim().length >= 3) {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown' && suggestions.length > 0) {
                        event.preventDefault();
                        setShowSuggestions(true);
                        setHighlightedIndex((current) =>
                          current < suggestions.length - 1 ? current + 1 : 0
                        );
                        return;
                      }

                      if (event.key === 'ArrowUp' && suggestions.length > 0) {
                        event.preventDefault();
                        setShowSuggestions(true);
                        setHighlightedIndex((current) =>
                          current > 0 ? current - 1 : suggestions.length - 1
                        );
                        return;
                      }

                      if (event.key === 'Enter') {
                        event.preventDefault();

                        if (showSuggestions && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                          handleSelectSuggestion(suggestions[highlightedIndex]);
                        } else {
                          handleSearch();
                        }
                        return;
                      }

                      if (event.key === 'Escape') {
                        setShowSuggestions(false);
                      }
                    }}
                    className="pr-16"
                  />

                  {(loadingSuggestions || searching) && (
                    <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-500" />
                  )}

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                        setHighlightedIndex(-1);
                        setShowSuggestions(false);
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={searching || !String(searchQuery || '').trim()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              <div
                className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-64 overflow-y-auto transition-all duration-150 ${
                  isDropdownVisible
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-1 pointer-events-none'
                }`}
              >
                {loadingSuggestions && (
                  <div className="flex items-center gap-2 p-3 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    Buscando enderecos proximos...
                  </div>
                )}

                {!loadingSuggestions && suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.source}-${suggestion.id}-${index}`}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={`w-full text-left p-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                      highlightedIndex === index
                        ? 'bg-orange-50'
                        : 'hover:bg-orange-50 active:bg-orange-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {suggestion.title || 'Endereco'}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {suggestion.subtitle || suggestion.title}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {!loadingSuggestions && !suggestions.length && String(searchQuery || '').trim().length >= 3 && (
                  <div className="p-3 text-sm text-gray-500">
                    Nenhum endereco encontrado perto da regiao atual. Tente rua, numero e bairro.
                  </div>
                )}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCurrentLocation}
              variant="outline"
              className="w-full h-8"
              size="sm"
              disabled={locatingUser}
            >
              {locatingUser ? (
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3 mr-2" />
              )}
              {locatingUser ? 'Buscando localizacao atual...' : 'Usar minha localizacao atual'}
            </Button>

            <div>
              <Input
                id="map-picker-cep"
                placeholder="CEP para preencher mais rapido"
                value={cep}
                onChange={(event) => setCep(formatCEP(event.target.value))}
                onBlur={handleCEPBlur}
                className="h-9"
              />
              {loadingCEP && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Localizando CEP...
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 relative min-h-[400px] max-h-[500px] overflow-hidden">
            <GoogleMapPicker
              center={position}
              onPositionChange={(lat, lng) => {
                setPosition({ lat, lng });
                setBiasCenter({ lat, lng });
              }}
              className="absolute inset-0"
              style={{ height: '100%', width: '100%', zIndex: 1 }}
            />

            {address && (
              <div className="absolute top-2 left-2 right-2 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border-2 border-orange-200">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900">Endereco:</p>
                    <p className="text-xs text-gray-700 line-clamp-2">{address}</p>
                    {reverseGeocoding && (
                      <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Atualizando endereco...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-blue-500 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-medium">
              Clique no mapa ou arraste o marcador
            </div>
          </div>

          <div className="p-3 border-t bg-white space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!position || reverseGeocoding || searching}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {reverseGeocoding ? 'Processando...' : 'Confirmar localizacao'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
