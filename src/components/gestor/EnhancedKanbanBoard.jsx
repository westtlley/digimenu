import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Bell, ChefHat, CheckCircle, Truck, Package, AlertTriangle, Clock as ClockIcon, ChevronDown, ChevronUp, Filter, Search, X, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const COLUMNS = [
  { 
    id: 'new', 
    label: 'Em preparo', 
    icon: ChefHat, 
    bgColor: 'bg-orange-50', 
    textColor: 'text-orange-600', 
    borderColor: 'border-orange-200', 
    statuses: ['new', 'accepted', 'preparing'],
    darkBg: 'bg-orange-900/20',
    darkBorder: 'border-orange-700'
  },
  { 
    id: 'ready', 
    label: 'Pronto', 
    icon: CheckCircle, 
    bgColor: 'bg-green-50', 
    textColor: 'text-green-600', 
    borderColor: 'border-green-200', 
    statuses: ['ready', 'going_to_store', 'arrived_at_store', 'picked_up'],
    darkBg: 'bg-green-900/20',
    darkBorder: 'border-green-700'
  },
  { 
    id: 'delivery', 
    label: 'Em rota', 
    icon: Truck, 
    bgColor: 'bg-blue-50', 
    textColor: 'text-blue-600', 
    borderColor: 'border-blue-200', 
    statuses: ['out_for_delivery', 'arrived_at_customer'],
    darkBg: 'bg-blue-900/20',
    darkBorder: 'border-blue-700'
  },
  { 
    id: 'done', 
    label: 'Finalizados', 
    icon: Package, 
    bgColor: 'bg-gray-50', 
    textColor: 'text-gray-600', 
    borderColor: 'border-gray-200', 
    statuses: ['delivered', 'cancelled'],
    darkBg: 'bg-gray-900/20',
    darkBorder: 'border-gray-700'
  },
];

/**
 * Kanban melhorado com drag-and-drop, filtros e busca
 */
export default function EnhancedKanbanBoard({ orders, onSelectOrder, darkMode = false, isLoading = false }) {
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [compact, setCompact] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reduceMotion, setReduceMotion] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(m.matches);
    const f = () => setReduceMotion(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);

  // Atualizar "Há X min" a cada 1 min
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      const order = orders.find(o => String(o.id) === String(orderId));
      if (!order) throw new Error('Pedido não encontrado');
      const payload = { ...order, status: newStatus };
      if (newStatus === 'ready') {
        payload.ready_at = new Date().toISOString();
        if (!order.pickup_code) payload.pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
        if (!order.delivery_code && order.delivery_method === 'delivery') payload.delivery_code = Math.floor(1000 + Math.random() * 9000).toString();
      }
      if (newStatus === 'delivered') payload.delivered_at = new Date().toISOString();
      await base44.entities.Order.update(orderId, payload);
      return { orderId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar pedido');
    }
  });

  const getColumnOrders = (statuses) => {
    let filtered = orders.filter(o => statuses.includes(o.status));
    
    // Aplicar filtros
    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_phone?.includes(searchTerm)
      );
    }
    
    if (filterMethod !== 'all') {
      filtered = filtered.filter(o => o.delivery_method === filterMethod);
    }
    
    return filtered;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getTimeElapsed = (date) => {
    if (!date) return '';
    const mins = differenceInMinutes(new Date(now), new Date(date));
    if (mins < 1) return 'Agora';
    if (mins < 60) return `Há ${mins} min`;
    return `Há ${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  const isLate = (order) => {
    if (!order.created_date) return false;
    return differenceInMinutes(new Date(now), new Date(order.created_date)) > 30 && 
           !['delivered', 'cancelled'].includes(order.status);
  };

  const isVeryLate = (order) => {
    if (!order.created_date) return false;
    return differenceInMinutes(new Date(now), new Date(order.created_date)) > 45 && 
           !['delivered', 'cancelled'].includes(order.status);
  };

  const toggleColumn = (columnId) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const onDragEnd = useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const targetColumn = COLUMNS.find(col => col.id === destination.droppableId);
    if (!targetColumn) return;

    const order = orders.find(o => String(o.id) === String(draggableId));
    if (!order) return;

    let newStatus;
    if (targetColumn.id === 'new') {
      newStatus = ['new', 'accepted', 'preparing'].includes(order.status) ? order.status : 'preparing';
    } else if (targetColumn.id === 'ready') {
      newStatus = 'ready';
    } else if (targetColumn.id === 'delivery') {
      if (order.status === 'ready' || order.status === 'picked_up') newStatus = 'out_for_delivery';
      else { toast.error('Pedido precisa estar pronto antes de ir para entrega'); return; }
    } else if (targetColumn.id === 'done') {
      if (['out_for_delivery', 'arrived_at_customer'].includes(order.status)) newStatus = 'delivered';
      else { toast.error('Pedido precisa estar em entrega para ser finalizado'); return; }
    } else return;

    // Otimista: atualizar cache antes da API para o arraste fluir
    const prev = queryClient.getQueryData(['gestorOrders']) || [];
    queryClient.setQueryData(['gestorOrders'], prev.map(o =>
      String(o.id) === String(draggableId) ? { ...o, status: newStatus } : o
    ));

    updateOrderMutation.mutate(
      { orderId: draggableId, newStatus },
      {
        onError: () => {
          queryClient.setQueryData(['gestorOrders'], prev);
        },
      }
    );
  }, [updateOrderMutation, orders, queryClient]);

  // Skeleton quando isLoading e ainda sem pedidos (evita flash vazio)
  const showSkeleton = isLoading && orders.length === 0;
  if (showSkeleton) {
    return (
      <div className="space-y-4">
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
          <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
            <Skeleton height={40} className="mb-3" enableAnimation={!reduceMotion} />
            <div className="flex gap-2">
              <Skeleton width={140} height={36} enableAnimation={!reduceMotion} />
              <Skeleton width={80} height={36} enableAnimation={!reduceMotion} />
            </div>
          </SkeletonTheme>
        </div>
        <div className="flex gap-2.5 h-[calc(100vh-280px)]">
          {COLUMNS.map(col => (
            <div key={col.id} className={`flex-1 flex flex-col ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-2`}>
              <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
                <Skeleton height={36} className="mb-2" enableAnimation={!reduceMotion} />
                <Skeleton count={3} height={100} style={{ marginBottom: 8 }} enableAnimation={!reduceMotion} />
              </SkeletonTheme>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Busca e Filtros */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className={`w-[140px] ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="delivery">Entrega</SelectItem>
                <SelectItem value="pickup">Retirada</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={darkMode ? 'border-gray-600' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCompact(c => !c)} className="h-9" title={compact ? 'Expandir' : 'Compacto'}>
              {compact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-2.5 h-[calc(100vh-280px)]">
          {COLUMNS.map(column => {
            const columnOrders = getColumnOrders(column.statuses);
            const Icon = column.icon;
            const isCollapsed = collapsedColumns[column.id];
            
            return (
              <div 
                key={column.id} 
                className={`${isCollapsed ? 'w-10' : 'flex-1'} transition-all duration-300 flex flex-col ${
                  darkMode 
                    ? `${column.darkBg} ${column.darkBorder} border` 
                    : `${column.bgColor} ${column.borderColor} border`
                } rounded-lg`}
              >
                {/* Column Header */}
                <button
                  onClick={() => toggleColumn(column.id)}
                  className={`border-b p-2.5 flex items-center justify-between hover:opacity-80 transition-opacity ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  {isCollapsed ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                      <Icon className={`w-4 h-4 ${column.textColor}`} />
                      <span className={`text-[10px] font-bold ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {columnOrders.length}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${column.textColor}`} />
                        <div className="text-left">
                          <p className={`font-semibold text-xs ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                            {column.label}
                          </p>
                          <p className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                            {columnOrders.length} pedidos
                          </p>
                        </div>
                      </div>
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    </>
                  )}
                </button>

                {/* Column Content */}
                {!isCollapsed && (
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-1.5 space-y-1.5 transition-colors ${
                          snapshot.isDraggingOver 
                            ? darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
                            : ''
                        }`}
                      >
                        <AnimatePresence>
                          {columnOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center px-3">
                              <Icon className={`w-8 h-8 ${column.textColor} opacity-15 mb-1.5`} />
                              <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} leading-relaxed`}>
                                {column.id === 'new' ? 'Nenhum pedido em preparo' :
                                 column.id === 'ready' ? 'Nenhum pedido pronto' :
                                 column.id === 'delivery' ? 'Nenhuma entrega em rota' :
                                 'Nenhum pedido finalizado'}
                              </p>
                            </div>
                          ) : (
                            columnOrders.map((order, index) => (
                              <Draggable key={order.id} draggableId={order.id} index={index}>
                                {(provided, snapshot) => (
                                  <motion.div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ 
                                      opacity: snapshot.isDragging ? 0.8 : 1, 
                                      scale: snapshot.isDragging ? 1.05 : 1 
                                    }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    whileHover={{ y: -2 }}
                                    onClick={() => onSelectOrder(order)}
                                    className={`${
                                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                    } rounded-md hover:shadow-md transition-all cursor-pointer border-l-2 ${
                                      compact ? 'p-1.5' : 'p-2.5'
                                    } ${
                                      isVeryLate(order)
                                        ? 'border-red-600 bg-red-100/50 dark:bg-red-900/30 ring-1 ring-red-300'
                                        : isLate(order) 
                                        ? 'border-red-500 bg-red-50/30 dark:bg-red-900/20' 
                                        : order.priority === 'alta'
                                        ? 'border-orange-400 dark:border-orange-500'
                                        : darkMode ? 'border-gray-600' : 'border-gray-200'
                                    } ${snapshot.isDragging ? 'shadow-xl' : ''}`}
                                  >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-1.5">
                                      <div className="flex-1">
                                        <p className={`font-semibold text-[11px] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                          #{order.order_code || order.id?.slice(-6)}
                                        </p>
                                        {isLate(order) && (
                                          <Badge className="bg-red-500 text-white text-[8px] h-3.5 mt-0.5 px-1 flex items-center gap-0.5">
                                            {isVeryLate(order) && <Bell className="w-2.5 h-2.5" />}
                                            Atrasado
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-[11px]">
                                        {order.delivery_method === 'delivery' ? '🚴' : '🏪'}
                                      </span>
                                    </div>

                                    <p className={`text-[11px] font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1.5 truncate`}>
                                      {order.customer_name}
                                    </p>

                                    {/* Items Summary */}
                                    <div className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1.5 space-y-0.5`}>
                                      {(order.items || []).slice(0, 2).map((item, idx) => (
                                        <p key={idx} className="truncate">
                                          {item.quantity}x {item.dish?.name}
                                        </p>
                                      ))}
                                      {(order.items || []).length > 2 && (
                                        <p className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                                          +{(order.items || []).length - 2} mais
                                        </p>
                                      )}
                                    </div>

                                    {/* Footer */}
                                    <div className={`flex items-center justify-between pt-1.5 border-t ${
                                      darkMode ? 'border-gray-700' : 'border-gray-100'
                                    }`}>
                                      <span className={`font-bold text-[11px] ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                        {formatCurrency(order.total)}
                                      </span>
                                      <span className={`text-[9px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-0.5`}>
                                        <ClockIcon className="w-2.5 h-2.5" />
                                        {getTimeElapsed(order.created_date)}
                                      </span>
                                    </div>
                                  </motion.div>
                                )}
                              </Draggable>
                            ))
                          )}
                        </AnimatePresence>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
