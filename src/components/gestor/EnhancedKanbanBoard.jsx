import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Bell, ChefHat, CheckCircle, Truck, Package, ShoppingBag, AlertTriangle, Clock as ClockIcon, ChevronDown, ChevronUp, Filter, Search, X, Maximize2, Minimize2 } from 'lucide-react';
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
    label: 'Novo', 
    icon: Bell, 
    bgColor: 'bg-orange-50', 
    textColor: 'text-orange-600', 
    borderColor: 'border-orange-200', 
    statuses: ['new'],
    darkBg: 'bg-orange-900/20',
    darkBorder: 'border-orange-700'
  },
  { 
    id: 'accepted', 
    label: 'Aceito', 
    icon: CheckCircle, 
    bgColor: 'bg-amber-50', 
    textColor: 'text-amber-600', 
    borderColor: 'border-amber-200', 
    statuses: ['accepted'],
    darkBg: 'bg-amber-900/20',
    darkBorder: 'border-amber-700'
  },
  { 
    id: 'preparing', 
    label: 'Preparando', 
    icon: ChefHat, 
    bgColor: 'bg-orange-50', 
    textColor: 'text-orange-600', 
    borderColor: 'border-orange-200', 
    statuses: ['preparing'],
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
    statuses: ['ready'],
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
    statuses: ['going_to_store', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'arrived_at_customer'],
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
export default function EnhancedKanbanBoard({ orders, onSelectOrder, darkMode = false, isLoading = false, asSub }) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [compact, setCompact] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reduceMotion, setReduceMotion] = useState(false);
  const queryClient = useQueryClient();
  const gestorOrdersKey = React.useMemo(() => ['gestorOrders', asSub ?? 'me'], [asSub]);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(m.matches);
    const f = () => setReduceMotion(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);

  // Atualizar "HÃ¡ X min" a cada 1 min
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      const order = safeOrders.find(o => String(o.id) === String(orderId));
      if (!order) throw new Error('Pedido não encontrado');
      const payload = { ...order, status: newStatus };
      if (newStatus === 'ready') {
        payload.ready_at = new Date().toISOString();
        if (!order.pickup_code) payload.pickup_code = Math.floor(1000 + Math.random() * 9000).toString();
        if (!order.delivery_code && order.delivery_method === 'delivery') payload.delivery_code = Math.floor(1000 + Math.random() * 9000).toString();
      }
      if (newStatus === 'delivered') payload.delivered_at = new Date().toISOString();
      await base44.entities.Order.update(orderId, payload, asSub ? { as_subscriber: asSub } : {});
      return { orderId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao atualizar pedido');
    }
  });

  const normalizedOrders = useMemo(() => {
    let filtered = [...safeOrders];

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_code?.toLowerCase().includes(normalizedSearch) ||
        o.customer_name?.toLowerCase().includes(normalizedSearch) ||
        o.customer_phone?.includes(searchTerm)
      );
    }

    if (filterMethod !== 'all') {
      filtered = filtered.filter(o => o.delivery_method === filterMethod);
    }

    return filtered.sort((a, b) => {
      const da = new Date(a.created_at || a.created_date || 0).getTime();
      const db = new Date(b.created_at || b.created_date || 0).getTime();
      return da - db;
    });
  }, [safeOrders, searchTerm, filterMethod]);

  const columnOrdersMap = useMemo(() => {
    const byColumn = {};
    for (const column of COLUMNS) {
      byColumn[column.id] = normalizedOrders.filter(order => column.statuses.includes(order.status));
    }
    return byColumn;
  }, [normalizedOrders]);

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

  const orderDate = (o) => o?.created_at || o?.created_date;
  const isLate = (order) => {
    const dt = orderDate(order);
    if (!dt) return false;
    return differenceInMinutes(new Date(now), new Date(dt)) > 30 && 
           !['delivered', 'cancelled'].includes(order.status);
  };

  const isVeryLate = (order) => {
    const dt = orderDate(order);
    if (!dt) return false;
    return differenceInMinutes(new Date(now), new Date(dt)) > 45 && 
           !['delivered', 'cancelled'].includes(order.status);
  };

  // UrgÃªncia por tempo de preparo (aceitos / em preparo): amarelo perto do limite, vermelho passou
  const prepMinutesElapsed = (order) => {
    if (!order.accepted_at) return null;
    return differenceInMinutes(new Date(now), new Date(order.accepted_at));
  };
  const isPrepUrgent = (order) => {
    const mins = prepMinutesElapsed(order);
    const prep = order.prep_time || 30;
    return mins != null && mins >= prep - 5 && mins < prep && !['delivered', 'cancelled'].includes(order.status);
  };
  const isPrepLate = (order) => {
    const mins = prepMinutesElapsed(order);
    const prep = order.prep_time || 30;
    return mins != null && mins >= prep && !['delivered', 'cancelled'].includes(order.status);
  };

  const getPriorityMeta = (order) => {
    if (isVeryLate(order) || isPrepLate(order)) {
      return { label: 'Atraso', badgeClass: 'bg-red-500 text-white' };
    }
    if (isLate(order) || isPrepUrgent(order)) {
      return { label: 'Atenção', badgeClass: 'bg-amber-500 text-white' };
    }
    return { label: 'Normal', badgeClass: 'bg-emerald-500 text-white' };
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

    const order = safeOrders.find(o => String(o.id) === String(draggableId));
    if (!order) return;

    let newStatus;
    if (targetColumn.id === 'new') {
      newStatus = 'new';
    } else if (targetColumn.id === 'accepted') {
      newStatus = 'accepted';
    } else if (targetColumn.id === 'preparing') {
      newStatus = 'preparing';
    } else if (targetColumn.id === 'ready') {
      newStatus = 'ready';
    } else if (targetColumn.id === 'delivery') {
      if (['ready', 'going_to_store', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'arrived_at_customer'].includes(order.status)) {
        newStatus = order.status === 'ready' ? 'out_for_delivery' : order.status;
      } else { toast.error('Pedido precisa estar pronto antes de ir para entrega'); return; }
    } else if (targetColumn.id === 'done') {
      if (['out_for_delivery', 'arrived_at_customer', 'picked_up', 'going_to_store', 'arrived_at_store'].includes(order.status)) newStatus = 'delivered';
      else { toast.error('Pedido precisa estar em entrega para ser finalizado'); return; }
    } else return;

    // Otimista: atualizar cache antes da API para o arraste fluir
    const prev = queryClient.getQueryData(gestorOrdersKey) || [];
    queryClient.setQueryData(gestorOrdersKey, prev.map(o =>
      String(o.id) === String(draggableId) ? { ...o, status: newStatus } : o
    ));

    updateOrderMutation.mutate(
        { orderId: draggableId, newStatus },
        {
          onError: () => {
            queryClient.setQueryData(gestorOrdersKey, prev);
          },
        }
      );
  }, [updateOrderMutation, queryClient, gestorOrdersKey, safeOrders]);

  // Skeleton quando isLoading e ainda sem pedidos (evita flash vazio)
  const showSkeleton = isLoading && safeOrders.length === 0;
  if (showSkeleton) {
    return (
      <div className="space-y-4">
        <div className={`${darkMode ? 'bg-gray-800/95 border-gray-600 shadow-sm' : 'bg-white/95 border-gray-300 shadow-sm'} border rounded-lg p-4`}>
          <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
            <Skeleton height={40} className="mb-3" enableAnimation={!reduceMotion} />
            <div className="flex gap-2">
              <Skeleton width={140} height={36} enableAnimation={!reduceMotion} />
              <Skeleton width={80} height={36} enableAnimation={!reduceMotion} />
            </div>
          </SkeletonTheme>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2.5 h-[calc(100dvh-18rem)] min-h-[460px] max-h-[78vh] min-w-[1180px]">
            {COLUMNS.map(col => (
              <div key={col.id} className={`flex-1 min-w-[190px] flex flex-col ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} border rounded-lg p-2`}>
                <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
                  <Skeleton height={36} className="mb-2" enableAnimation={!reduceMotion} />
                  <Skeleton count={3} height={100} style={{ marginBottom: 8 }} enableAnimation={!reduceMotion} />
                </SkeletonTheme>
              </div>
            ))}
          </div>
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
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2.5 h-[calc(100dvh-18rem)] min-h-[460px] max-h-[78vh] min-w-[1180px]">
          {COLUMNS.map(column => {
            const columnOrders = columnOrdersMap[column.id] || [];
            const Icon = column.icon;
            const isCollapsed = collapsedColumns[column.id];
            
            return (
              <div 
                key={column.id} 
                className={`${isCollapsed ? 'w-10' : 'flex-1 min-w-[190px]'} transition-all duration-300 flex flex-col ${
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
                      <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
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
                            {column.id === 'new' && columnOrders.some(o => o.status === 'new') && (
                              <span className={`ml-1 font-medium ${column.textColor}`}>
                                · {columnOrders.filter(o => o.status === 'new').length} novo(s)
                              </span>
                            )}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
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
                              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} leading-relaxed`}>
                                {column.id === 'new' ? 'Nenhum pedido novo' :
                                 column.id === 'accepted' ? 'Nenhum pedido aceito' :
                                 column.id === 'preparing' ? 'Nenhum pedido em preparo' :
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
                                      isVeryLate(order) || isPrepLate(order)
                                        ? 'border-red-600 bg-red-100/50 dark:bg-red-900/30 ring-1 ring-red-300'
                                        : isLate(order) 
                                        ? 'border-red-500 bg-red-50/30 dark:bg-red-900/20' 
                                        : isPrepUrgent(order)
                                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20'
                                        : order.priority === 'alta'
                                        ? 'border-orange-400 dark:border-orange-500'
                                        : darkMode ? 'border-gray-600' : 'border-gray-200'
                                    } ${snapshot.isDragging ? 'shadow-xl' : ''}`}
                                  >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-1.5">
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                          #{order.order_code || order.id?.slice(-6)}
                                        </p>
                                        {(isLate(order) || isPrepLate(order)) && (
                                          <Badge className="bg-red-500 text-white text-xs h-4 mt-0.5 px-1.5 flex items-center gap-0.5 w-fit">
                                            {isVeryLate(order) && <Bell className="w-2.5 h-2.5" />}
                                            Atrasado
                                          </Badge>
                                        )}
                                        {isPrepUrgent(order) && !isPrepLate(order) && (
                                          <Badge className="bg-amber-500 text-white text-xs h-4 mt-0.5 px-1.5 flex items-center w-fit">
                                            Quase no limite
                                          </Badge>
                                        )}
                                      </div>
                                      {(() => {
                                        const DeliveryMethodIcon = order.delivery_method === 'delivery'
                                          ? Truck
                                          : order.delivery_method === 'pickup'
                                          ? ShoppingBag
                                          : Package;
                                        return (
                                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <Badge className={`${getPriorityMeta(order).badgeClass} text-xs h-4 px-1.5`}>
                                          {getPriorityMeta(order).label}
                                        </Badge>
                                            <DeliveryMethodIcon
                                              className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}
                                              title={order.delivery_method === 'delivery' ? 'Entrega' : order.delivery_method === 'pickup' ? 'Retirada' : 'Presencial'}
                                            />
                                      </div>
                                        );
                                      })()}
                                    </div>

                                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1 truncate`}>
                                      {order.customer_name}
                                    </p>

                                    {/* Items: uma linha */}
                                    <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1.5 truncate`}>
                                      {(order.items || []).slice(0, 3).map((item) => `${item.quantity}x ${item.name || item.dish?.name || 'Item'}`).join(', ')}
                                      {(order.items || []).length > 3 && ` +${(order.items || []).length - 3}`}
                                    </p>

                                    {/* Footer */}
                                    <div className={`flex items-center justify-between pt-1.5 border-t ${
                                      darkMode ? 'border-gray-700' : 'border-gray-100'
                                    }`}>
                                      <span className={`font-bold text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                        {formatCurrency(order.total)}
                                      </span>
                                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-0.5`}>
                                        <ClockIcon className="w-2.5 h-2.5" />
                                        {getTimeElapsed(order.created_at || order.created_date)}
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
        </div>
      </DragDropContext>
    </div>
  );
}

