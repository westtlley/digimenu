import React, { useState } from 'react';
import { Bell, ChefHat, CheckCircle, Truck, Package, AlertTriangle, Clock as ClockIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { differenceInMinutes } from 'date-fns';

import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = [
  { id: 'new', label: 'Em preparo', icon: ChefHat, bgColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-200', statuses: ['new', 'accepted', 'preparing'] },
  { id: 'ready', label: 'Pronto', icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-200', statuses: ['ready', 'going_to_store', 'arrived_at_store', 'picked_up'] },
  { id: 'delivery', label: 'Em rota', icon: Truck, bgColor: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-200', statuses: ['out_for_delivery', 'arrived_at_customer'] },
  { id: 'done', label: 'Finalizados', icon: Package, bgColor: 'bg-gray-50', textColor: 'text-gray-600', borderColor: 'border-gray-200', statuses: ['delivered', 'cancelled'] },
];

export default function KanbanBoard({ orders, onSelectOrder }) {
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const getColumnOrders = (statuses) => {
    return orders.filter(o => statuses.includes(o.status));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getTimeElapsed = (date) => {
    if (!date) return '';
    const mins = differenceInMinutes(new Date(), new Date(date));
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const orderDate = (o) => o?.created_at || o?.created_date;
  const isLate = (order) => {
    const dt = orderDate(order);
    if (!dt) return false;
    return differenceInMinutes(new Date(), new Date(dt)) > 30 && 
           !['delivered', 'cancelled'].includes(order.status);
  };

  const toggleColumn = (columnId) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  return (
    <div className="flex gap-2.5 h-[calc(100vh-180px)]">
      {COLUMNS.map(column => {
        const columnOrders = getColumnOrders(column.statuses);
        const Icon = column.icon;
        const isCollapsed = collapsedColumns[column.id];
        
        return (
          <div 
            key={column.id} 
            className={`${isCollapsed ? 'w-10' : 'flex-1'} transition-all duration-300 flex flex-col bg-white rounded-lg border border-gray-200`}
          >
            {/* Column Header */}
            <button
              onClick={() => toggleColumn(column.id)}
              className="border-b p-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              {isCollapsed ? (
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <Icon className={`w-4 h-4 ${column.textColor}`} />
                  <span className="text-[10px] font-bold text-gray-500">
                    {columnOrders.length}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${column.textColor}`} />
                    <div className="text-left">
                      <p className="font-semibold text-xs text-gray-700">{column.label}</p>
                      <p className="text-[10px] text-gray-400">{columnOrders.length} pedidos</p>
                    </div>
                  </div>
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                </>
              )}
            </button>

            {/* Column Content */}
            {!isCollapsed && (
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                <AnimatePresence>
                  {columnOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-3">
                      <Icon className={`w-8 h-8 ${column.textColor} opacity-15 mb-1.5`} />
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        {column.id === 'new' ? 'Nenhum pedido em preparo' :
                         column.id === 'ready' ? 'Nenhum pedido pronto' :
                         column.id === 'delivery' ? 'Nenhuma entrega em rota' :
                         'Nenhum pedido finalizado'}
                      </p>
                    </div>
                  ) : (
                    columnOrders.map(order => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        whileHover={{ y: -1 }}
                        onClick={() => onSelectOrder(order)}
                        className={`bg-white rounded-md hover:shadow-md transition-all cursor-pointer p-2.5 border-l-2 ${
                          isLate(order) ? 'border-red-500 bg-red-50/30' : 'border-gray-200'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex-1">
                            <p className="font-semibold text-[11px] text-gray-900">#{order.order_code || order.id?.slice(-6)}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">
                              {(order.created_at || order.created_date) ? (
                                <>📅 {new Date(order.created_at || order.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • ⏰ {new Date(order.created_at || order.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
                              ) : '—'}
                            </p>
                            {isLate(order) && (
                              <Badge className="bg-red-500 text-white text-[8px] h-3.5 mt-0.5 px-1">
                                Atrasado
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px]">
                            {order.delivery_method === 'delivery' ? '🚴' : '🏪'}
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-gray-700 mb-1.5 truncate">{order.customer_name}</p>

                        {/* Items Summary */}
                        <div className="text-[10px] text-gray-500 mb-1.5 space-y-0.5">
                          {(order.items || []).slice(0, 2).map((item, idx) => (
                            <p key={idx} className="truncate">
                              {item.quantity}x {item.dish?.name}
                            </p>
                          ))}
                          {(order.items || []).length > 2 && (
                            <p className="text-gray-400">+{(order.items || []).length - 2} mais</p>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                          <span className="font-bold text-[11px] text-green-600">{formatCurrency(order.total)}</span>
                          <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                            <ClockIcon className="w-2.5 h-2.5" />
                            {getTimeElapsed(order.created_at || order.created_date)}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}