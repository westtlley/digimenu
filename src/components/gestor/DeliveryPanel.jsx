import React, { useState } from 'react';
import { Bike, MapPin, Star, Package, MessageSquare, Zap, Map as MapIcon, List, Edit, Trash2, Phone, Mail, CheckCircle, Clock, Plus, Award } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AutoAssignModal from './AutoAssignModal';
import EntregadorMessaging from './EntregadorMessaging';
import EntregadorRating from './EntregadorRating';
import RouteOptimizer from './RouteOptimizer';
import LiveDeliveryMap from './LiveDeliveryMap';
import GoogleMultiDeliveryTrackingMap from './GoogleMultiDeliveryTrackingMap';
import ReviewsHistory from '../entregador/ReviewsHistory';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import { format } from 'date-fns';

export default function DeliveryPanel({ entregadores, orders, stores = [] }) {
  const [viewMode, setViewMode] = useState('list');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [selectedEntregador, setSelectedEntregador] = useState(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [editingEntregador, setEditingEntregador] = useState(null);
  const [showNewEntregadorModal, setShowNewEntregadorModal] = useState(false);
  const queryClient = useQueryClient();

  // Buscar avaliações de todos os entregadores
  const { data: allRatings = [] } = useQuery({
    queryKey: ['entregadorRatings'],
    queryFn: () => base44.entities.DeliveryRating.list(),
  });

  // Calcular média de avaliações por entregador
  const getEntregadorRating = (entregadorId) => {
    const ratings = allRatings.filter(r => r.entregador_id === entregadorId && r.rated_by === 'customer');
    if (ratings.length === 0) return null;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  // Buscar histórico de entregas de cada entregador
  const getEntregadorHistory = (entregadorId) => {
    return orders.filter(o => o.entregador_id === entregadorId && o.status === 'delivered');
  };

  const assignMutation = useMutation({
    mutationFn: async ({ orderId, entregadorId }) => {
      const order = orders.find(o => o.id === orderId);
      const entregador = entregadores.find(e => e.id === entregadorId);
      
      await base44.entities.Order.update(orderId, {
        ...order,
        entregador_id: entregadorId,
        status: 'out_for_delivery'
      });

      await base44.entities.Entregador.update(entregadorId, {
        ...entregador,
        status: 'busy',
        current_order_id: orderId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador atribuído com sucesso!');
    }
  });

  const availableEntregadores = entregadores.filter(e => e.status === 'available');
  const busyEntregadores = entregadores.filter(e => e.status === 'busy');
  const readyOrders = orders.filter(o => o.status === 'ready' && o.delivery_method === 'delivery');

  const [entregadorFormData, setEntregadorFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const createEntregadorMutation = useMutation({
    mutationFn: (data) => base44.entities.Entregador.create({
      ...data,
      status: 'offline',
      total_deliveries: 0,
      total_earnings: 0,
      rating: 5,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      setShowNewEntregadorModal(false);
      setEntregadorFormData({ name: '', phone: '', email: '' });
      toast.success('Entregador cadastrado com sucesso!');
    },
  });

  const updateEntregadorMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const entregador = entregadores.find(e => e.id === id);
      return await base44.entities.Entregador.update(id, { ...entregador, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      setEditingEntregador(null);
      toast.success('Entregador atualizado!');
    },
  });

  const deleteEntregadorMutation = useMutation({
    mutationFn: (id) => base44.entities.Entregador.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador removido!');
    },
  });

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 font-medium">Disponíveis</p>
              <p className="text-2xl font-bold text-green-600">{availableEntregadores.length}</p>
            </div>
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xl">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-700 font-medium">Em entrega</p>
              <p className="text-2xl font-bold text-yellow-600">{busyEntregadores.length}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-xl">🚴</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-700 font-medium">Aguardando</p>
              <p className="text-2xl font-bold text-orange-600">{readyOrders.length}</p>
            </div>
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 bg-white rounded-lg p-1 border w-fit">
        <Button
          size="sm"
          variant={viewMode === 'map' ? 'default' : 'ghost'}
          onClick={() => setViewMode('map')}
          className={viewMode === 'map' ? 'bg-red-500 hover:bg-red-600' : ''}
        >
          <MapIcon className="w-4 h-4 mr-1" />
          Mapa ao Vivo
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'bg-red-500 hover:bg-red-600' : ''}
        >
          <List className="w-4 h-4 mr-1" />
          Lista
        </Button>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-[400px] min-h-[300px] lg:h-[480px] rounded-xl overflow-hidden border border-gray-200">
            <GoogleMultiDeliveryTrackingMap
              orders={orders}
              entregadores={entregadores}
              stores={stores}
              onSelectOrder={setSelectedOrder}
              onSelectEntregador={(ent) => {
                const order = orders.find(o => o.id === ent.current_order_id);
                if (order) setSelectedOrder(order);
              }}
              darkMode={false}
            />
          </div>
          <div className="space-y-3">
            <div className="bg-white border rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                Pedidos Prontos ({readyOrders.length})
              </h4>
              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {readyOrders.slice(0, 10).map(order => (
                  <div key={order.id} className="bg-gray-50 p-2 rounded text-xs">
                    <p className="font-bold text-gray-900">#{order.order_code}</p>
                    <p className="text-gray-600">{order.customer_name}</p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowAutoAssign(true);
                      }}
                      className="w-full mt-2 h-7 text-xs bg-orange-500 hover:bg-orange-600"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Atribuir
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          <div className="flex justify-end mb-3">
            <Button onClick={() => setShowNewEntregadorModal(true)} className="bg-red-500 hover:bg-red-600">
              <Plus className="w-4 h-4 mr-2" />
              Novo Entregador
            </Button>
          </div>

          {entregadores.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border">
              <Bike className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhum entregador cadastrado</p>
              <Button onClick={() => setShowNewEntregadorModal(true)} className="bg-red-500 hover:bg-red-600">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Entregador
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
            {entregadores.map(entregador => {
              const currentOrder = entregador.current_order_id 
                ? orders.find(o => o.id === entregador.current_order_id)
                : null;
              const history = getEntregadorHistory(entregador.id);
              const avgRating = getEntregadorRating(entregador.id);

              return (
                <div key={entregador.id} className="bg-white rounded-lg border p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {entregador.photo ? (
                        <img src={entregador.photo} alt={entregador.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          entregador.status === 'available' ? 'bg-green-100' :
                          entregador.status === 'busy' ? 'bg-yellow-100' : 'bg-gray-100'
                        }`}>
                          <Bike className={`w-6 h-6 ${
                            entregador.status === 'available' ? 'text-green-600' :
                            entregador.status === 'busy' ? 'text-yellow-600' : 'text-gray-400'
                          }`} />
                        </div>
                      )}
                      <div>
                       <h3 className="font-bold text-base">{entregador.name}</h3>
                       <div className="flex flex-col gap-0.5 mt-0.5">
                         <span className="text-xs text-gray-600 flex items-center gap-1">
                           <Phone className="w-3 h-3" />
                           {entregador.phone}
                         </span>
                         {entregador.email && (
                           <span className="text-xs text-gray-600 flex items-center gap-1">
                             <Mail className="w-3 h-3" />
                             {entregador.email}
                           </span>
                         )}
                       </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-[10px] h-5 ${
                        entregador.status === 'available' ? 'bg-green-500' :
                        entregador.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}>
                        {entregador.status === 'available' ? 'Online' :
                         entregador.status === 'busy' ? 'Ocupado' : 'Offline'}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingEntregador(entregador)}
                        className="h-7 w-7"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-md p-2 text-center">
                      <Package className="w-4 h-4 mx-auto mb-0.5 text-blue-600" />
                      <p className="text-lg font-bold text-blue-700">{entregador.total_deliveries || 0}</p>
                      <p className="text-[9px] text-gray-600">Entregas</p>
                    </div>
                    <div className="bg-yellow-50 rounded-md p-2 text-center">
                      <Star className="w-4 h-4 mx-auto mb-0.5 text-yellow-500" />
                      <p className="text-lg font-bold text-yellow-600">{avgRating || '5.0'}</p>
                      <p className="text-[9px] text-gray-600">Nota</p>
                    </div>
                    <div className="bg-green-50 rounded-md p-2 text-center">
                      <CheckCircle className="w-4 h-4 mx-auto mb-0.5 text-green-600" />
                      <p className="text-lg font-bold text-green-700">{history.length}</p>
                      <p className="text-[9px] text-gray-600">Hoje</p>
                    </div>
                    <div className="bg-purple-50 rounded-md p-2 text-center">
                      <Bike className="w-4 h-4 mx-auto mb-0.5 text-purple-600" />
                      <p className="text-base font-bold text-purple-700">
                        {entregador.vehicle_type === 'bike' ? '🚴' : 
                         entregador.vehicle_type === 'motorcycle' ? '🏍️' : 
                         entregador.vehicle_type === 'car' ? '🚗' : 'N/A'}
                      </p>
                      <p className="text-[9px] text-gray-600">Veículo</p>
                    </div>
                    <div className="bg-orange-50 rounded-md p-2 text-center">
                      <Clock className="w-4 h-4 mx-auto mb-0.5 text-orange-600" />
                      <p className="text-xs font-bold text-orange-700">
                        {formatCurrency(entregador.total_earnings || 0)}
                      </p>
                      <p className="text-[9px] text-gray-600">Ganhos</p>
                    </div>
                  </div>

                  {/* Current Order */}
                  {currentOrder && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2.5 mb-3">
                      <p className="font-semibold text-blue-900 mb-1 text-xs flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        Em entrega agora:
                      </p>
                      <p className="text-xs text-blue-700 font-medium">#{currentOrder.order_code} • {currentOrder.customer_name}</p>
                      <p className="text-[10px] text-blue-600 truncate">{currentOrder.address}</p>
                    </div>
                  )}

                  {/* Recent History - Compacto */}
                  {history.length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-semibold text-xs text-gray-600 mb-1.5">Últimas 3 entregas</h4>
                      <div className="space-y-1">
                        {history.slice(0, 3).map(order => (
                          <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-md p-1.5 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span className="font-medium truncate">#{order.order_code}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 flex-shrink-0">
                              {order.delivered_at && format(new Date(order.delivered_at), 'HH:mm')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-1.5">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       setSelectedEntregador(entregador);
                       setShowMessaging(true);
                     }}
                     className="text-xs h-8"
                   >
                     <MessageSquare className="w-3.5 h-3.5 mr-1" />
                     Msg
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       setSelectedEntregador(entregador);
                       setShowRating(true);
                     }}
                     className="text-xs h-8"
                   >
                     <Star className="w-3.5 h-3.5 mr-1" />
                     Avaliar
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       setSelectedEntregador(entregador);
                       setShowReviews(true);
                     }}
                     className="text-xs h-8"
                   >
                     <Award className="w-3.5 h-3.5 mr-1" />
                     Notas
                   </Button>
                  </div>

                  {/* View Order Button */}
                  {currentOrder && (
                   <Button
                     size="sm"
                     onClick={() => {
                       setSelectedEntregador(entregador);
                       setSelectedOrder(currentOrder);
                       setShowMessaging(true);
                     }}
                     className="w-full bg-blue-500 hover:bg-blue-600 text-xs h-8 mt-1.5"
                   >
                     <MapPin className="w-3.5 h-3.5 mr-1" />
                     Ver Entrega Ativa
                   </Button>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showAutoAssign && selectedOrder && (
        <AutoAssignModal
          isOpen={showAutoAssign}
          onClose={() => {
            setShowAutoAssign(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          entregadores={entregadores}
          onAssign={(orderId, entregadorId) => assignMutation.mutate({ orderId, entregadorId })}
        />
      )}

      {showMessaging && selectedEntregador && (
        <EntregadorMessaging
          isOpen={showMessaging}
          onClose={() => {
            setShowMessaging(false);
            setSelectedEntregador(null);
          }}
          entregador={selectedEntregador}
        />
      )}

      {showRating && selectedEntregador && (
        <EntregadorRating
          isOpen={showRating}
          onClose={() => {
            setShowRating(false);
            setSelectedEntregador(null);
          }}
          entregador={selectedEntregador}
          orderId={selectedEntregador.current_order_id}
        />
      )}

      {showRouteOptimizer && selectedEntregador && (
        <RouteOptimizer
          isOpen={showRouteOptimizer}
          onClose={() => {
            setShowRouteOptimizer(false);
            setSelectedEntregador(null);
          }}
          entregador={selectedEntregador}
          orders={orders}
        />
      )}

      {showReviews && selectedEntregador && (
        <ReviewsHistory
          entregador={selectedEntregador}
          onClose={() => {
            setShowReviews(false);
            setSelectedEntregador(null);
          }}
          darkMode={false}
        />
      )}

      {/* Modal Novo Entregador */}
      <Dialog open={showNewEntregadorModal} onOpenChange={setShowNewEntregadorModal}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Novo Entregador</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createEntregadorMutation.mutate(entregadorFormData);
          }} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={entregadorFormData.name}
                onChange={(e) => setEntregadorFormData({ ...entregadorFormData, name: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={entregadorFormData.phone}
                onChange={(e) => setEntregadorFormData({ ...entregadorFormData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={entregadorFormData.email}
                onChange={(e) => setEntregadorFormData({ ...entregadorFormData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowNewEntregadorModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-red-500 hover:bg-red-600">
                Cadastrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Entregador */}
      {editingEntregador && (
        <Dialog open={!!editingEntregador} onOpenChange={() => setEditingEntregador(null)}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Editar Entregador</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateEntregadorMutation.mutate({ 
                id: editingEntregador.id, 
                data: editingEntregador 
              });
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit_name">Nome *</Label>
                <Input
                  id="edit_name"
                  value={editingEntregador.name}
                  onChange={(e) => setEditingEntregador({ ...editingEntregador, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Telefone *</Label>
                <Input
                  id="edit_phone"
                  value={editingEntregador.phone}
                  onChange={(e) => setEditingEntregador({ ...editingEntregador, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editingEntregador.email || ''}
                  onChange={(e) => setEditingEntregador({ ...editingEntregador, email: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingEntregador(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-red-500 hover:bg-red-600">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}