import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, MapPin, CheckCircle, Truck, ArrowLeft, User, Phone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserAuthButton from '../components/atoms/UserAuthButton';
import { formatCurrency } from '@/utils/formatters';

export default function EntregadorPanel() {
  const [entregador, setEntregador] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadEntregador();
  }, []);

  const loadEntregador = async () => {
    try {
      const user = await base44.auth.me();
      const entregadores = await base44.entities.Entregador.list();
      const myData = entregadores.find(e => e.email === user.email);
      setEntregador(myData);
    } catch (error) {
      console.error('Erro ao carregar entregador:', error);
    }
  };

  const { data: orders = [] } = useQuery({
    queryKey: ['deliveryOrders'],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.list('-created_date');
      return allOrders.filter(o => ['ready', 'out_for_delivery'].includes(o.status));
    },
    refetchInterval: 5000
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryOrders'] });
    }
  });

  const updateEntregadorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entregador.update(id, data),
    onSuccess: () => {
      loadEntregador();
    }
  });

  const handleAcceptDelivery = (order) => {
    if (!entregador) return;
    
    updateOrderMutation.mutate({
      id: order.id,
      data: { ...order, status: 'out_for_delivery', entregador_id: entregador.id }
    });

    updateEntregadorMutation.mutate({
      id: entregador.id,
      data: { ...entregador, status: 'busy', current_order_id: order.id }
    });
  };

  const handleDelivered = (order) => {
    if (!entregador) return;

    updateOrderMutation.mutate({
      id: order.id,
      data: { ...order, status: 'delivered', delivered_at: new Date().toISOString() }
    });

    updateEntregadorMutation.mutate({
      id: entregador.id,
      data: { 
        ...entregador, 
        status: 'available', 
        current_order_id: null,
        total_deliveries: (entregador.total_deliveries || 0) + 1
      }
    });
  };

  const myActiveOrder = entregador ? orders.find(o => o.entregador_id === entregador.id && o.status === 'out_for_delivery') : null;
  const availableOrders = orders.filter(o => o.status === 'ready');

  if (!entregador) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Truck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Carregando dados do entregador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="font-bold text-lg">{entregador.name}</h1>
                <Badge className={entregador.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'}>
                  {entregador.status === 'available' ? 'Disponível' : 'Em Entrega'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-500">Entregas Hoje</p>
                <p className="font-bold text-2xl text-blue-600">{entregador.total_deliveries || 0}</p>
              </div>
              <UserAuthButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Entrega Ativa */}
        {myActiveOrder && (
          <section>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Entrega Atual
            </h2>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm opacity-80">Pedido</p>
                  <p className="text-2xl font-bold">#{myActiveOrder.order_code || myActiveOrder.id?.slice(-6)}</p>
                </div>
                <Badge className="bg-white text-blue-600 font-bold">
                  {formatCurrency(myActiveOrder.total)}
                </Badge>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <User className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{myActiveOrder.customer_name}</p>
                    <p className="text-sm opacity-80 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {myActiveOrder.customer_phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm opacity-80">Endereço</p>
                    <p className="font-medium">{myActiveOrder.address}</p>
                    {myActiveOrder.neighborhood && (
                      <p className="text-sm opacity-80">{myActiveOrder.neighborhood}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm opacity-80 mb-2">Itens do Pedido:</p>
                {myActiveOrder.items?.map((item, idx) => (
                  <div key={idx} className="bg-white/10 rounded-lg p-2 text-sm">
                    {item.quantity || 1}x {item.dish?.name}
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => handleDelivered(myActiveOrder)}
                className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-6 text-lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmar Entrega
              </Button>
            </div>
          </section>
        )}

        {/* Pedidos Disponíveis */}
        {!myActiveOrder && availableOrders.length > 0 && (
          <section>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pedidos Prontos para Entrega
            </h2>
            <div className="space-y-3">
              {availableOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg">#{order.order_code || order.id?.slice(-6)}</p>
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      {formatCurrency(order.total)}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p>{order.address}</p>
                      {order.neighborhood && (
                        <p className="text-xs text-gray-400">{order.neighborhood}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleAcceptDelivery(order)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Aceitar Entrega
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {!myActiveOrder && availableOrders.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhum pedido disponível no momento</p>
            <p className="text-sm text-gray-400 mt-2">Aguardando novos pedidos...</p>
          </div>
        )}
      </div>
    </div>
  );
}