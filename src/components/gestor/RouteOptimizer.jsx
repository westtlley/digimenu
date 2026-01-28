import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Algoritmo de otimização de rota (Nearest Neighbor)
const optimizeRoute = (orders, startPoint = { lat: -5.0892, lng: -42.8019 }) => {
  if (orders.length === 0) return { optimizedOrders: [], totalDistance: 0, estimatedTime: 0 };
  
  const unvisited = [...orders];
  const route = [];
  let currentPoint = startPoint;
  let totalDistance = 0;
  
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = calculateDistance(currentPoint, unvisited[0].coordinates || getRandomCoordinates());
    
    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistance(currentPoint, unvisited[i].coordinates || getRandomCoordinates());
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearestOrder = unvisited.splice(nearestIndex, 1)[0];
    route.push(nearestOrder);
    currentPoint = nearestOrder.coordinates || getRandomCoordinates();
    totalDistance += minDistance;
  }
  
  // Estimar tempo: 30 km/h médio + 5 min por parada
  const estimatedTime = Math.round((totalDistance / 30) * 60 + route.length * 5);
  
  return { 
    optimizedOrders: route, 
    totalDistance: Math.round(totalDistance * 10) / 10, 
    estimatedTime 
  };
};

// Calcular distância entre dois pontos (Haversine)
const calculateDistance = (point1, point2) => {
  const R = 6371; // Raio da Terra em km
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

// Gerar coordenadas aleatórias (Teresina como referência)
const getRandomCoordinates = () => ({
  lat: -5.0892 + (Math.random() - 0.5) * 0.1,
  lng: -42.8019 + (Math.random() - 0.5) * 0.1
});

export default function RouteOptimizer({ isOpen, onClose, entregador, orders }) {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const queryClient = useQueryClient();

  // Filtrar pedidos prontos para entrega
  const availableOrders = orders.filter(o => 
    o.status === 'ready' && 
    o.delivery_method === 'delivery' &&
    !o.entregador_id
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedOrders([]);
      setOptimizedRoute(null);
    }
  }, [isOpen]);

  const toggleOrderSelection = (order) => {
    setSelectedOrders(prev => {
      const isSelected = prev.some(o => o.id === order.id);
      if (isSelected) {
        return prev.filter(o => o.id !== order.id);
      } else {
        return [...prev, order];
      }
    });
  };

  const handleOptimize = () => {
    if (selectedOrders.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    setOptimizing(true);
    
    // Simular delay de processamento
    setTimeout(() => {
      const ordersWithCoords = selectedOrders.map(order => ({
        ...order,
        coordinates: order.coordinates || getRandomCoordinates()
      }));

      const result = optimizeRoute(ordersWithCoords);
      setOptimizedRoute(result);
      setOptimizing(false);
      toast.success('Rota otimizada com sucesso!');
    }, 800);
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!optimizedRoute) return;

      // Atualizar todos os pedidos com o entregador
      for (const order of optimizedRoute.optimizedOrders) {
        await base44.entities.Order.update(order.id, {
          status: 'out_for_delivery',
          entregador_id: entregador.id
        });
      }

      // Atualizar status do entregador
      await base44.entities.Entregador.update(entregador.id, {
        ...entregador,
        status: 'busy',
        current_order_id: optimizedRoute.optimizedOrders[0].id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Rota atribuída ao entregador!');
      onClose();
    },
    onError: () => {
      toast.error('Erro ao atribuir rota');
    }
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            Otimização de Rota - {entregador?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <MapPin className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-900">{selectedOrders.length}</p>
              <p className="text-xs text-blue-700">Entregas</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-900">
                {optimizedRoute ? `${optimizedRoute.totalDistance}km` : '-'}
              </p>
              <p className="text-xs text-green-700">Distância</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
              <Clock className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className="text-2xl font-bold text-orange-900">
                {optimizedRoute ? `${optimizedRoute.estimatedTime}min` : '-'}
              </p>
              <p className="text-xs text-orange-700">Tempo Est.</p>
            </div>
          </div>

          {/* Available Orders */}
          {!optimizedRoute && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Pedidos Disponíveis ({availableOrders.length})</h3>
                <Button 
                  onClick={handleOptimize}
                  disabled={selectedOrders.length === 0 || optimizing}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Otimizando...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Otimizar Rota
                    </>
                  )}
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {availableOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum pedido disponível para entrega</p>
                  </div>
                ) : (
                  availableOrders.map((order) => {
                    const isSelected = selectedOrders.some(o => o.id === order.id);
                    return (
                      <div
                        key={order.id}
                        onClick={() => toggleOrderSelection(order)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold">#{order.order_code}</p>
                              <Badge className="text-xs bg-green-500">Pronto</Badge>
                            </div>
                            <p className="text-sm text-gray-700">{order.customer_name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {order.address}
                            </p>
                            <p className="text-sm font-bold text-green-600 mt-2">
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Optimized Route */}
          {optimizedRoute && (
            <div>
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-4 border-2 border-blue-200">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-blue-600" />
                  Rota Otimizada
                </h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Total de Entregas</p>
                    <p className="font-bold text-lg">{optimizedRoute.optimizedOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Distância Total</p>
                    <p className="font-bold text-lg">{optimizedRoute.totalDistance} km</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tempo Estimado</p>
                    <p className="font-bold text-lg">{optimizedRoute.estimatedTime} min</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Sequência de Entrega:</h4>
                {optimizedRoute.optimizedOrders.map((order, index) => (
                  <div key={order.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold">#{order.order_code}</p>
                        <Badge className="text-xs">{order.customer_name}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{order.address}</span>
                      </p>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-yellow-900 mb-1">💡 Dica de Otimização:</p>
                <p className="text-yellow-800">
                  Esta rota foi calculada usando o algoritmo de vizinho mais próximo, 
                  priorizando menor distância entre pontos de entrega.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {optimizedRoute ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setOptimizedRoute(null)}
              >
                Voltar
              </Button>
              <Button
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atribuindo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar e Iniciar Entregas
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}