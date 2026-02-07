import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, Clock, AlertTriangle, Package, CheckCircle, 
  Truck, ShoppingBag, Bell, Settings, Maximize2, Minimize2,
  Filter, TrendingUp, Timer, User, MapPin, Phone
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { differenceInMinutes } from 'date-fns';

const STATUS_COLORS = {
  new: 'bg-red-500',
  accepted: 'bg-yellow-500',
  preparing: 'bg-orange-500',
  ready: 'bg-green-500'
};

const STATUS_LABELS = {
  new: 'Novo',
  accepted: 'Aceito',
  preparing: 'Em Preparo',
  ready: 'Pronto'
};

const DELIVERY_ICONS = {
  delivery: Truck,
  pickup: ShoppingBag,
  dine_in: Package
};

/**
 * Timer de preparo com contagem regressiva
 */
function PrepTimer({ order, prepTime }) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!order.accepted_at || !prepTime) return;
    
    const interval = setInterval(() => {
      const elapsed = differenceInMinutes(new Date(), new Date(order.accepted_at));
      setTimeElapsed(elapsed);
      setIsOverdue(elapsed > prepTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [order.accepted_at, prepTime]);

  if (!order.accepted_at || !prepTime) return null;

  const remaining = prepTime - timeElapsed;
  const isUrgent = remaining <= 5 && remaining > 0;
  const isCritical = remaining <= 0;

  return (
    <div className={`flex items-center gap-1 text-xs font-bold ${
      isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-600'
    }`}>
      <Timer className="w-3 h-3" />
      {isCritical ? (
        <span className="animate-pulse">ATRASADO {Math.abs(remaining)}min</span>
      ) : isUrgent ? (
        <span className="animate-pulse">{remaining}min</span>
      ) : (
        <span>{remaining}min</span>
      )}
    </div>
  );
}

/**
 * Card de pedido otimizado para cozinha
 */
function OrderCard({ order, onStatusChange, prepTime }) {
  const [showDetails, setShowDetails] = useState(false);
  const DeliveryIcon = DELIVERY_ICONS[order.delivery_method] || Package;
  const timeElapsed = order.accepted_at 
    ? differenceInMinutes(new Date(), new Date(order.accepted_at))
    : 0;
  const isOverdue = prepTime && timeElapsed > prepTime;
  const isUrgent = prepTime && (prepTime - timeElapsed) <= 5 && (prepTime - timeElapsed) > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative ${isOverdue ? 'ring-2 ring-red-500' : isUrgent ? 'ring-2 ring-orange-500' : ''}`}
    >
      <Card className={`overflow-hidden transition-all ${
        isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 
        isUrgent ? 'bg-orange-50 dark:bg-orange-900/20' : 
        'bg-white dark:bg-gray-800'
      }`}>
        {/* Header com código e status */}
        <div className={`p-3 ${STATUS_COLORS[order.status]} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              <span className="font-bold text-lg">#{order.order_code || order.id.slice(-6)}</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              {STATUS_LABELS[order.status]}
            </Badge>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-3">
          {/* Tipo de entrega e cliente */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <DeliveryIcon className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400 capitalize">
              {order.delivery_method === 'delivery' ? 'Entrega' : 
               order.delivery_method === 'pickup' ? 'Retirada' : 
               order.delivery_method === 'dine_in' ? 'Presencial' : 'Presencial'}
            </span>
            {order.source && (
              <>
                <span className="text-gray-300">•</span>
                <Badge variant="outline" className="text-xs">
                  {order.source === 'comanda' ? 'Comanda' : order.source === 'pdv' ? 'PDV' : 'Online'}
                </Badge>
              </>
            )}
            {order.table_name && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-600 dark:text-gray-400">Mesa: {order.table_name}</span>
              </>
            )}
            {order.customer_name && (
              <>
                <span className="text-gray-300">•</span>
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">{order.customer_name}</span>
              </>
            )}
          </div>

          {/* Timer de preparo */}
          {order.status !== 'new' && order.accepted_at && (
            <PrepTimer order={order} prepTime={prepTime || order.prep_time} />
          )}

          {/* Itens do pedido */}
          <div className="space-y-1">
            {order.items?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm">
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.quantity}x {item.name}
                  </span>
                  {item.observations && (
                    <p className="text-xs text-gray-500 italic mt-0.5">
                      Obs: {item.observations}
                    </p>
                  )}
                  {item.complements && item.complements.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.complements.map(c => c.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {order.items?.length > 3 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                +{order.items.length - 3} itens
              </button>
            )}
          </div>

          {/* Detalhes expandidos */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1 pt-2 border-t"
              >
                {order.items?.slice(3).map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.quantity}x {item.name}
                      </span>
                      {item.observations && (
                        <p className="text-xs text-gray-500 italic mt-0.5">
                          Obs: {item.observations}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Observações do pedido */}
          {order.observations && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                <strong>Pedido:</strong> {order.observations}
              </p>
            </div>
          )}

          {/* Endereço (se delivery) */}
          {order.delivery_method === 'delivery' && order.delivery_address && (
            <div className="pt-2 border-t flex items-start gap-2 text-xs">
              <MapPin className="w-3 h-3 text-gray-500 mt-0.5" />
              <span className="text-gray-600 dark:text-gray-400">
                {order.delivery_address}
              </span>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2 border-t">
            {order.status === 'new' && (
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onStatusChange(order, 'accepted')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aceitar
              </Button>
            )}
            {order.status === 'accepted' && (
              <Button
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={() => onStatusChange(order, 'preparing')}
              >
                <ChefHat className="w-4 h-4 mr-1" />
                Iniciar Preparo
              </Button>
            )}
            {order.status === 'preparing' && (
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onStatusChange(order, 'ready')}
              >
                <Package className="w-4 h-4 mr-1" />
                Pronto
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Kitchen Display System - Display otimizado para cozinha
 */
export default function KitchenDisplay({ 
  orders = [], 
  onStatusChange,
  prepTime = 30,
  isLoading = false 
}) {
  const [filter, setFilter] = useState('all'); // all, new, accepted, preparing, ready
  const [deliveryFilter, setDeliveryFilter] = useState('all'); // all, delivery, pickup, dine_in
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  // Filtrar pedidos
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filtro por status
    if (filter !== 'all') {
      filtered = filtered.filter(o => o.status === filter);
    }

    // Filtro por tipo de entrega
    if (deliveryFilter !== 'all') {
      filtered = filtered.filter(o => o.delivery_method === deliveryFilter);
    }

    // Ordenar: novos primeiro, depois por urgência (atrasados primeiro)
    return filtered.sort((a, b) => {
      // Novos sempre primeiro
      if (a.status === 'new' && b.status !== 'new') return -1;
      if (b.status === 'new' && a.status !== 'new') return 1;
      
      // Se ambos são novos, ordenar por data de criação (mais antigos primeiro)
      if (a.status === 'new' && b.status === 'new') {
        const aCreated = a.created_date || a.created_at ? new Date(a.created_date || a.created_at).getTime() : 0;
        const bCreated = b.created_date || b.created_at ? new Date(b.created_date || b.created_at).getTime() : 0;
        return aCreated - bCreated;
      }
      
      // Para pedidos aceitos/preparando: calcular urgência
      const aPrepTime = a.prep_time || prepTime;
      const bPrepTime = b.prep_time || prepTime;
      const aAccepted = a.accepted_at ? new Date(a.accepted_at).getTime() : 0;
      const bAccepted = b.accepted_at ? new Date(b.accepted_at).getTime() : 0;
      
      if (aAccepted > 0 && bAccepted > 0) {
        const now = new Date().getTime();
        const aElapsed = (now - aAccepted) / (1000 * 60); // minutos
        const bElapsed = (now - bAccepted) / (1000 * 60);
        const aRemaining = aPrepTime - aElapsed;
        const bRemaining = bPrepTime - bElapsed;
        
        // Atrasados primeiro (negativos)
        if (aRemaining < 0 && bRemaining >= 0) return -1;
        if (bRemaining < 0 && aRemaining >= 0) return 1;
        
        // Se ambos atrasados, mais atrasado primeiro
        if (aRemaining < 0 && bRemaining < 0) {
          return aRemaining - bRemaining; // mais negativo = mais atrasado
        }
        
        // Se ambos no prazo, mais urgente primeiro (menos tempo restante)
        return aRemaining - bRemaining;
      }
      
      // Fallback: por data de criação
      const aCreated = a.created_date || a.created_at ? new Date(a.created_date || a.created_at).getTime() : 0;
      const bCreated = b.created_date || b.created_at ? new Date(b.created_date || b.created_at).getTime() : 0;
      return aCreated - bCreated;
    });
  }, [orders, filter, deliveryFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const newCount = orders.filter(o => o.status === 'new').length;
    const acceptedCount = orders.filter(o => o.status === 'accepted').length;
    const preparingCount = orders.filter(o => o.status === 'preparing').length;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    
    // Calcular tempo médio de preparo
    const completedOrders = orders.filter(o => o.ready_at && o.accepted_at);
    const avgPrepTime = completedOrders.length > 0
      ? completedOrders.reduce((sum, o) => {
          const prepTime = differenceInMinutes(
            new Date(o.ready_at),
            new Date(o.accepted_at)
          );
          return sum + prepTime;
        }, 0) / completedOrders.length
      : 0;

    return {
      new: newCount,
      accepted: acceptedCount,
      preparing: preparingCount,
      ready: readyCount,
      total: orders.length,
      avgPrepTime: Math.round(avgPrepTime)
    };
  }, [orders]);

  // Detectar novos pedidos e tocar som
  useEffect(() => {
    const newCount = orders.filter(o => o.status === 'new').length;
    if (newCount > newOrdersCount && soundEnabled) {
      // Tocar som de notificação
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback: usar beep do navegador
        if (window.AudioContext || window.webkitAudioContext) {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.5);
        }
      });
    }
    setNewOrdersCount(newCount);
  }, [orders.length, soundEnabled, newOrdersCount]);

  // Modo fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-gray-100 dark:bg-gray-900`}>
      {/* Header */}
      <div className="bg-orange-600 text-white shadow-lg sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ChefHat className="w-6 h-6" />
              <h1 className="font-bold text-xl">Kitchen Display</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-orange-500"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                <Bell className={`w-4 h-4 ${soundEnabled ? '' : 'opacity-50'}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-orange-500"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="bg-white/20 rounded p-2">
              <div className="text-2xl font-bold">{stats.new}</div>
              <div className="text-xs opacity-90">Novos</div>
            </div>
            <div className="bg-white/20 rounded p-2">
              <div className="text-2xl font-bold">{stats.accepted}</div>
              <div className="text-xs opacity-90">Aceitos</div>
            </div>
            <div className="bg-white/20 rounded p-2">
              <div className="text-2xl font-bold">{stats.preparing}</div>
              <div className="text-xs opacity-90">Preparando</div>
            </div>
            <div className="bg-white/20 rounded p-2">
              <div className="text-2xl font-bold">{stats.ready}</div>
              <div className="text-xs opacity-90">Prontos</div>
            </div>
            <div className="bg-white/20 rounded p-2">
              <div className="text-2xl font-bold">{stats.avgPrepTime}</div>
              <div className="text-xs opacity-90">Média (min)</div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-2 mt-3">
            <Filter className="w-4 h-4" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white/20 text-white border-white/30 rounded px-2 py-1 text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="new">Novos</option>
              <option value="accepted">Aceitos</option>
              <option value="preparing">Em Preparo</option>
              <option value="ready">Prontos</option>
            </select>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="bg-white/20 text-white border-white/30 rounded px-2 py-1 text-sm"
            >
              <option value="all">Todos os Tipos</option>
              <option value="delivery">Entrega</option>
              <option value="pickup">Retirada</option>
              <option value="dine_in">Presencial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de pedidos */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Clock className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={onStatusChange}
                  prepTime={prepTime || order.prep_time}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
