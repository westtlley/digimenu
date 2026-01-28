import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bike, MapPin, Star, Package, Zap } from 'lucide-react';

export default function AutoAssignModal({ isOpen, onClose, order, entregadores, onAssign }) {
  const [selectedMethod, setSelectedMethod] = useState('nearest'); // nearest, least_busy, best_rated

  // Calcular distância simples (em produção usar API de geocoding)
  const calculateDistance = (entregador) => {
    // Mock: retorna distância aleatória entre 0.5 e 5km
    return (Math.random() * 4.5 + 0.5).toFixed(1);
  };

  // Filtrar entregadores disponíveis
  const availableEntregadores = entregadores.filter(e => e.status === 'available');

  // Ordenar por método selecionado
  const sortedEntregadores = [...availableEntregadores].sort((a, b) => {
    if (selectedMethod === 'nearest') {
      return parseFloat(calculateDistance(a)) - parseFloat(calculateDistance(b));
    } else if (selectedMethod === 'least_busy') {
      return (a.total_deliveries || 0) - (b.total_deliveries || 0);
    } else if (selectedMethod === 'best_rated') {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  const bestMatch = sortedEntregadores[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Atribuição Automática de Entregador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <p className="font-bold text-sm mb-1">Pedido #{order?.order_code}</p>
            <p className="text-xs text-gray-600">{order?.customer_name}</p>
            <p className="text-xs text-gray-500">{order?.address}</p>
          </div>

          {/* Method Selection */}
          <div>
            <p className="text-sm font-medium mb-2">Método de seleção:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedMethod('nearest')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedMethod === 'nearest' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MapPin className="w-4 h-4 mb-1 text-orange-500" />
                <p className="font-medium text-xs">Mais Próximo</p>
              </button>
              <button
                onClick={() => setSelectedMethod('least_busy')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedMethod === 'least_busy' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4 mb-1 text-orange-500" />
                <p className="font-medium text-xs">Menos Ocupado</p>
              </button>
              <button
                onClick={() => setSelectedMethod('best_rated')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedMethod === 'best_rated' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Star className="w-4 h-4 mb-1 text-orange-500" />
                <p className="font-medium text-xs">Melhor Avaliado</p>
              </button>
            </div>
          </div>

          {/* Best Match */}
          {bestMatch && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Bike className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">Melhor Opção: {bestMatch.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-green-600 text-xs">Disponível</Badge>
                    <span className="text-xs text-gray-600">
                      ~{calculateDistance(bestMatch)}km de distância
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/50 rounded p-2">
                  <p className="text-gray-600">Entregas</p>
                  <p className="font-bold">{bestMatch.total_deliveries || 0}</p>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <p className="text-gray-600">Avaliação</p>
                  <p className="font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {bestMatch.rating?.toFixed(1) || 'N/A'}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-2">
                  <p className="text-gray-600">Veículo</p>
                  <p className="font-bold uppercase">{bestMatch.vehicle_type || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Other Options */}
          <div>
            <p className="text-sm font-medium mb-2">Outras opções disponíveis:</p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {sortedEntregadores.slice(1, 5).map(entregador => (
                <div
                  key={entregador.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => onAssign?.(order.id, entregador.id)}
                >
                  <div className="flex items-center gap-3">
                    <Bike className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-sm">{entregador.name}</p>
                      <p className="text-xs text-gray-500">~{calculateDistance(entregador)}km</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      ⭐ {entregador.rating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (bestMatch) {
                onAssign?.(order.id, bestMatch.id);
                onClose();
              }
            }}
            className="bg-green-600 hover:bg-green-700"
            disabled={!bestMatch}
          >
            <Zap className="w-4 h-4 mr-2" />
            Atribuir para {bestMatch?.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}