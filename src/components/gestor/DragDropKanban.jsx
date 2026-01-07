import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, User, MapPin, DollarSign, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const columns = [
  { id: 'new', label: 'Novos', icon: Clock, color: 'bg-blue-500', statuses: ['new'] },
  { id: 'preparing', label: 'Em Preparo', icon: Clock, color: 'bg-yellow-500', statuses: ['accepted', 'preparing'] },
  { id: 'ready', label: 'Prontos', icon: Clock, color: 'bg-green-500', statuses: ['ready'] },
  { id: 'delivery', label: 'Em Rota', icon: Clock, color: 'bg-purple-500', statuses: ['out_for_delivery'] },
  { id: 'completed', label: 'Finalizados', icon: Clock, color: 'bg-gray-500', statuses: ['delivered'] }
];

export default function DragDropKanban({ orders, onOrderClick }) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }) => {
      return base44.entities.Order.update(orderId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getTimeSince = (date) => {
    const minutes = Math.floor((new Date() - new Date(date)) / 60000);
    if (minutes < 60) return `${minutes}min`;
    return `${Math.floor(minutes / 60)}h${minutes % 60}m`;
  };

  const isLate = (order) => {
    if (!order.prep_time || !order.accepted_at) return false;
    const elapsed = Math.floor((new Date() - new Date(order.accepted_at)) / 60000);
    return elapsed > order.prep_time;
  };

  const getTimeColor = (order) => {
    if (!order.accepted_at) return 'text-gray-500';
    const elapsed = Math.floor((new Date() - new Date(order.accepted_at)) / 60000);
    const prepTime = order.prep_time || 30;
    if (elapsed >= prepTime) return 'text-red-600';
    if (elapsed >= prepTime * 0.8) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceColumn = result.source.droppableId;
    const destColumn = result.destination.droppableId;

    if (sourceColumn === destColumn) return;

    const orderId = result.draggableId;
    let newStatus = 'new';

    // Mapear coluna para status
    switch (destColumn) {
      case 'new':
        newStatus = 'new';
        break;
      case 'preparing':
        newStatus = 'preparing';
        break;
      case 'ready':
        newStatus = 'ready';
        break;
      case 'delivery':
        newStatus = 'out_for_delivery';
        break;
      case 'completed':
        newStatus = 'delivered';
        break;
    }

    updateStatusMutation.mutate({ orderId, newStatus });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) =>
            column.statuses.includes(order.status)
          );

          return (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4 ${
                    snapshot.isDraggingOver ? 'bg-gray-100 ring-2 ring-blue-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`} />
                      <h3 className="font-bold text-gray-800">{column.label}</h3>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {columnOrders.length}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {columnOrders.map((order, index) => (
                      <Draggable key={order.id} draggableId={order.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onOrderClick(order)}
                            className={`bg-white rounded-lg p-4 shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                              snapshot.isDragging ? 'shadow-2xl rotate-3' : ''
                            } ${isLate(order) ? 'border-red-300' : 'border-gray-200'}`}
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-bold text-lg">#{order.order_code || order.id?.slice(-6)}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  <span className={getTimeColor(order)}>
                                    {order.created_date && getTimeSince(order.created_date)}
                                  </span>
                                </p>
                              </div>
                              {isLate(order) && (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                              )}
                            </div>

                            {/* Cliente */}
                            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                              <User className="w-4 h-4" />
                              <span className="truncate">{order.customer_name}</span>
                            </div>

                            {/* Itens */}
                            <div className="mb-3 space-y-1">
                              {order.items?.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="text-xs text-gray-600">
                                  {item.quantity || 1}x {item.dish?.name}
                                </div>
                              ))}
                              {order.items?.length > 2 && (
                                <p className="text-xs text-gray-400">+{order.items.length - 2} itens</p>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                {order.delivery_method === 'delivery' && <MapPin className="w-3 h-3" />}
                                <span>{order.delivery_method === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                              </div>
                              <div className="flex items-center gap-1 font-bold text-green-600">
                                <DollarSign className="w-4 h-4" />
                                {formatCurrency(order.total)}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {columnOrders.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Arraste pedidos aqui
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}