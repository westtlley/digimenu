import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Navigation, Clock, TrendingUp, CheckCircle, Loader2, 
  Zap, X, ArrowRight, Route as RouteIcon
} from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Algoritmo de otimização de rota (Nearest Neighbor)
const optimizeRoute = (orders, startPoint) => {
  if (orders.length === 0) return { optimizedOrders: [], totalDistance: 0, estimatedTime: 0 };
  
  const unvisited = [...orders];
  const route = [];
  let currentPoint = startPoint;
  let totalDistance = 0;
  
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = calculateDistance(currentPoint, unvisited[0].coordinates);
    
    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentPoint, unvisited[i].coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearestOrder = unvisited.splice(nearestIndex, 1)[0];
    route.push(nearestOrder);
    currentPoint = nearestOrder.coordinates;
    totalDistance += minDistance;
  }
  
  // Estimar tempo: 25 km/h médio + 7 min por parada
  const estimatedTime = Math.round((totalDistance / 25) * 60 + route.length * 7);
  
  return { 
    optimizedOrders: route, 
    totalDistance: Math.round(totalDistance * 10) / 10, 
    estimatedTime 
  };
};

// Calcular distância entre dois pontos (Haversine)
const calculateDistance = (point1, point2) => {
  const R = 6371;
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

// Geocodificar endereço
const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.error('Erro ao geocodificar:', e);
  }
  return null;
};

// Mapa Google para rota otimizada
function RouteMap({ orders, currentLocation, onNavigate }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const polyRef = React.useRef(null);
  const infoRef = React.useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  React.useEffect(() => {
    if (!apiKey || !mapRef.current || (!currentLocation && (!orders || orders.length === 0))) return;
    const center = currentLocation || (orders?.[0]?.coordinates) || { lat: -5.0892, lng: -42.8019 };
    setOptions({ apiKey, version: 'weekly' });

    (async () => {
      try {
        await importLibrary('maps');
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 13,
          zoomControl: true,
          mapTypeControl: true,
          fullscreenControl: true,
        });
        mapInstanceRef.current = map;

        if (currentLocation) {
          const m = new google.maps.Marker({
            map,
            position: { lat: currentLocation.lat, lng: currentLocation.lng },
            title: 'Sua Localização',
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          });
          markersRef.current.push(m);
        }

        (orders || []).forEach((order, index) => {
          const c = order.coordinates;
          if (!c) return;
          const mk = new google.maps.Marker({
            map,
            position: { lat: c.lat, lng: c.lng },
            title: `Parada ${index + 1}: #${order.order_code}`,
            label: { text: String(index + 1), color: 'white', fontWeight: 'bold' },
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          });
          const inf = new google.maps.InfoWindow({
            content: `<div class="p-2" style="min-width:180px"><p class="font-bold text-sm mb-1">Parada ${index + 1}</p><p class="font-semibold">#${order.order_code}</p><p class="text-xs text-gray-600 mb-2">${order.customer_name || ''}</p><button id="nav-${order.id}" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-2 rounded text-sm">Navegar</button></div>`,
          });
          mk.addListener('click', () => {
            infoRef.current?.close();
            infoRef.current = inf;
            inf.open(map, mk);
            setTimeout(() => {
              document.getElementById(`nav-${order.id}`)?.addEventListener('click', () => { onNavigate?.(c); inf.close(); });
            }, 50);
          });
          markersRef.current.push(mk);
        });

        const routePoints = currentLocation && (orders || []).length > 0
          ? [currentLocation, ...(orders || []).map(o => o.coordinates).filter(Boolean)]
          : [];
        if (routePoints.length > 1) {
          const poly = new google.maps.Polyline({
            map,
            path: routePoints.map(p => ({ lat: p.lat, lng: p.lng })),
            strokeColor: '#3b82f6',
            strokeWeight: 4,
            strokeOpacity: 0.7,
          });
          polyRef.current = poly;
        }

        const all = [currentLocation, ...(orders || []).map(o => o.coordinates).filter(Boolean)].filter(Boolean);
        if (all.length >= 2) {
          const b = new google.maps.LatLngBounds();
          all.forEach(p => b.extend({ lat: p.lat, lng: p.lng }));
          map.fitBounds(b, 50);
        }
      } catch (e) {
        console.error('Erro ao carregar Google Maps:', e);
      }
    })();

    return () => {
      infoRef.current?.close();
      markersRef.current.forEach(m => m?.setMap?.(null));
      markersRef.current = [];
      polyRef.current?.setMap?.(null);
      mapInstanceRef.current = null;
    };
  }, [apiKey, currentLocation, orders, onNavigate]);

  if (!apiKey) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center bg-gray-100 rounded-xl">
        <MapPin className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-gray-500 text-sm text-center px-4">Configure VITE_GOOGLE_MAPS_API_KEY no .env para exibir o mapa.</p>
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '12px' }} className="z-0" />;
}

export default function RouteOptimizer({ isOpen, onClose, orders, currentLocation, darkMode }) {
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const handleOptimize = async () => {
    if (!currentLocation) {
      alert('Não foi possível obter sua localização atual');
      return;
    }

    setOptimizing(true);
    setGeocoding(true);

    try {
      // Geocodificar todos os endereços
      const ordersWithCoords = await Promise.all(
        orders.map(async (order) => {
          const coords = await geocodeAddress(order.address);
          return {
            ...order,
            coordinates: coords || {
              lat: -5.0892 + (Math.random() - 0.5) * 0.05,
              lng: -42.8019 + (Math.random() - 0.5) * 0.05
            }
          };
        })
      );

      setGeocoding(false);

      // Simular delay de processamento
      setTimeout(() => {
        const result = optimizeRoute(ordersWithCoords, currentLocation);
        setOptimizedRoute(result);
        setOptimizing(false);
      }, 800);
    } catch (e) {
      console.error('Erro ao otimizar rota:', e);
      setOptimizing(false);
      setGeocoding(false);
      alert('Erro ao otimizar rota');
    }
  };

  const handleNavigateToNext = () => {
    if (optimizedRoute && optimizedRoute.optimizedOrders.length > 0) {
      const nextOrder = optimizedRoute.optimizedOrders[0];
      const coords = nextOrder.coordinates;
      
      // Abrir no Google Maps
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
      window.open(url, '_blank');
    }
  };

  const handleNavigateToCoords = (coords) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
    window.open(url, '_blank');
  };

  const totalEarnings = orders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RouteIcon className="w-5 h-5 text-blue-600" />
            Otimização de Rota
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-lg p-3 text-center border ${darkMode ? 'border-gray-600' : 'border-blue-200'}`}>
              <MapPin className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-blue-900'}`}>{orders.length}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-blue-700'}`}>Entregas</p>
            </div>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-green-50'} rounded-lg p-3 text-center border ${darkMode ? 'border-gray-600' : 'border-green-200'}`}>
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-green-900'}`}>
                {optimizedRoute ? `${optimizedRoute.totalDistance}km` : '-'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-green-700'}`}>Distância</p>
            </div>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-orange-50'} rounded-lg p-3 text-center border ${darkMode ? 'border-gray-600' : 'border-orange-200'}`}>
              <Clock className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-orange-900'}`}>
                {optimizedRoute ? `${optimizedRoute.estimatedTime}min` : '-'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-orange-700'}`}>Tempo Est.</p>
            </div>
          </div>

          {/* Earnings Summary */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-green-50 to-emerald-50'} rounded-lg p-4 border ${darkMode ? 'border-gray-600' : 'border-green-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ganho Total Estimado</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Média por Entrega</p>
                <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(totalEarnings / orders.length)}
                </p>
              </div>
            </div>
          </div>

          {!optimizedRoute ? (
            <>
              {/* Orders List */}
              <div>
                <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Suas Entregas Ativas ({orders.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orders.map((order, index) => (
                    <div
                      key={order.id}
                      className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                            <Badge className="bg-blue-500 text-white text-xs">
                              #{order.order_code}
                            </Badge>
                          </div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {order.customer_name}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 flex items-start gap-1`}>
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{order.address}</span>
                          </p>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(order.delivery_fee || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimize Button */}
              <Button
                onClick={handleOptimize}
                disabled={optimizing || !currentLocation}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-bold"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {geocoding ? 'Localizando endereços...' : 'Otimizando rota...'}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Otimizar Rota Agora
                  </>
                )}
              </Button>

              {!currentLocation && (
                <p className="text-xs text-amber-600 text-center">
                  ⚠️ Aguardando localização GPS...
                </p>
              )}
            </>
          ) : (
            <>
              {/* Map */}
              <div className="rounded-xl overflow-hidden">
                <RouteMap
                  orders={optimizedRoute.optimizedOrders}
                  currentLocation={currentLocation}
                  onNavigate={handleNavigateToCoords}
                />
              </div>

              {/* Optimized Route Summary */}
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} rounded-lg p-4 border ${darkMode ? 'border-gray-600' : 'border-blue-200'}`}>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Rota Otimizada
                </h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Paradas</p>
                    <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {optimizedRoute.optimizedOrders.length}
                    </p>
                  </div>
                  <div>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Distância</p>
                    <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {optimizedRoute.totalDistance} km
                    </p>
                  </div>
                  <div>
                    <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Tempo</p>
                    <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ~{optimizedRoute.estimatedTime} min
                    </p>
                  </div>
                </div>
              </div>

              {/* Route Sequence */}
              <div>
                <h4 className={`font-semibold text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Sequência Otimizada de Entrega:
                </h4>
                <div className="space-y-2">
                  {optimizedRoute.optimizedOrders.map((order, index) => (
                    <div
                      key={order.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        index === 0 
                          ? (darkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300')
                          : (darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200')
                      }`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            #{order.order_code}
                          </p>
                          <Badge className="text-xs bg-gray-500">
                            {order.customer_name}
                          </Badge>
                          {index === 0 && (
                            <Badge className="text-xs bg-green-500 animate-pulse">
                              Próxima
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-start gap-1`}>
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{order.address}</span>
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(order.delivery_fee || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-yellow-50'} border ${darkMode ? 'border-gray-600' : 'border-yellow-200'} rounded-lg p-3 text-sm`}>
                <p className={`font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-900'} mb-1`}>
                  💡 Dica Inteligente:
                </p>
                <p className={darkMode ? 'text-gray-300' : 'text-yellow-800'}>
                  Essa rota economiza tempo priorizando entregas mais próximas. 
                  Clique em "Iniciar Navegação" para começar pela primeira parada.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setOptimizedRoute(null)}
                  className="h-12"
                >
                  <X className="w-4 h-4 mr-2" />
                  Recalcular
                </Button>
                <Button
                  onClick={handleNavigateToNext}
                  className="bg-green-600 hover:bg-green-700 h-12 text-base font-bold"
                >
                  <Navigation className="w-5 h-5 mr-2" />
                  Iniciar Navegação
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}