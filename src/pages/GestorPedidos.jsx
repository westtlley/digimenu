import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Bell, Volume2, VolumeX, RefreshCw, Search,
  ChefHat, CheckCircle, Truck, Grid3x3, LayoutGrid, Menu, X as CloseIcon, LogOut,
  Clock, AlertTriangle, Settings, ChevronLeft, Lock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import toast, { Toaster } from 'react-hot-toast';

import KanbanBoard from '../components/gestor/KanbanBoard';
import EnhancedKanbanBoard from '../components/gestor/EnhancedKanbanBoard';
import OrderDetailModal from '../components/gestor/OrderDetailModal';
import DeliveryPanel from '../components/gestor/DeliveryPanel';
import GestorSettings from '../components/gestor/GestorSettings';
import GestorStatsPanel from '../components/gestor/GestorStatsPanel';
import AdvancedOrderFilters from '../components/gestor/AdvancedOrderFilters';
import UserAuthButton from '../components/atoms/UserAuthButton';
import { usePermission } from '../components/permissions/usePermission';

export default function GestorPedidos() {
  const [activeTab, setActiveTab] = useState('now'); // now, scheduled
  const [viewMode, setViewMode] = useState('kanban'); // kanban, delivery, settings
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('gestor_notification_config');
      if (saved) {
        const config = JSON.parse(saved);
        return config.soundEnabled !== false;
      }
    } catch (e) {}
    return true;
  });
  const [notificationConfig, setNotificationConfig] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('gestor-sidebar-collapsed');
    return saved === 'true';
  });
  
  const audioRef = useRef(null);
  const prevOrderCountRef = useRef(0);
  const queryClient = useQueryClient();
  const { isMaster, hasModuleAccess, loading: permLoading, user } = usePermission();
  
  const hasAccess = isMaster || hasModuleAccess('gestor_pedidos');
  const backPage = isMaster ? 'Admin' : 'PainelAssinante';

  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['gestorOrders'],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.list('-created_date');
      // Filtrar apenas pedidos do cardápio (não do PDV/Balcão)
      return allOrders.filter(order => {
        // Bloquear pedidos PDV e de Balcão
        const isPDV = order.order_code?.startsWith('PDV-');
        const isBalcao = order.delivery_method === 'balcao';
        return !isPDV && !isBalcao;
      });
    },
    refetchInterval: 3000, // Atualizar a cada 3 segundos para GPS em tempo real
  });

  const { data: entregadores = [] } = useQuery({
    queryKey: ['entregadores'],
    queryFn: () => base44.entities.Entregador.list(),
    refetchInterval: 3000, // Atualizar localização em tempo real
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
  });

  // Carregar configurações de notificação
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gestor_notification_config');
      if (saved) {
        const config = JSON.parse(saved);
        setNotificationConfig(config);
        setSoundEnabled(config.soundEnabled !== false);
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de notificação:', e);
    }
  }, []);

  // Verificar mudanças de status e notificar conforme configuração
  useEffect(() => {
    if (!notificationConfig || orders.length === 0) return;

    const statusCounts = {};
    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    // Notificar apenas se configurado para o status específico
    const shouldNotify = (status) => {
      return notificationConfig.notifyOnStatus?.[status] !== false;
    };

    // Notificar novos pedidos
    const newOrders = orders.filter(o => o.status === 'new');
    if (newOrders.length > prevOrderCountRef.current && shouldNotify('new') && newOrders.length > 0) {
      if (soundEnabled && notificationConfig.soundEnabled !== false) {
        playNotificationSound();
      }
      
      // Vibrar se disponível
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // Show browser notification
      if (notificationConfig.browserNotificationEnabled !== false &&
          'Notification' in window && 
          Notification.permission === 'granted') {
        new Notification('Novo Pedido!', {
          body: `${newOrders.length} novo(s) pedido(s) recebido(s)`,
          icon: '/favicon.ico',
          tag: 'new-order'
        });
      }
    }
    prevOrderCountRef.current = newOrders.length;
  }, [orders, soundEnabled, notificationConfig]);

  // Auto-cancel late orders
  useEffect(() => {
    const checkLateOrders = async () => {
      const now = new Date();
      for (const order of orders) {
        if (!order.accepted_at || ['delivered', 'cancelled'].includes(order.status)) continue;
        
        const acceptedTime = new Date(order.accepted_at);
        const prepTime = order.prep_time || 30;
        const minutesElapsed = (now - acceptedTime) / 1000 / 60;
        
        if (minutesElapsed > prepTime + 10) {
          // Auto-cancel
          await base44.entities.Order.update(order.id, {
            ...order,
            status: 'cancelled',
            rejection_reason: 'Cancelado automaticamente por atraso (tempo de preparo excedido)'
          });
          queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
        }
      }
    };
    
    const interval = setInterval(checkLateOrders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [orders, queryClient]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Esc - Fechar modal
      if (e.key === 'Escape') {
        if (selectedOrder) {
          setSelectedOrder(null);
        }
        if (showMobileMenu) {
          setShowMobileMenu(false);
        }
        return;
      }

      // Ctrl+F ou Cmd+F - Focar busca (apenas se não estiver em input/textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Buscar"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Atalhos numéricos para status (1-5) - apenas se não estiver digitando
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const firstNewOrder = filteredOrders.find(o => o.status === 'new');
      if (firstNewOrder && ['1', '2', '3', '4', '5'].includes(e.key)) {
        // Status rápidos (via modal, não implementado completamente por falta de contexto)
        // Poderia abrir modal automaticamente e aplicar status
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrder, showMobileMenu, filteredOrders]);

  // Aplicar filtros básicos (aba agora/agendados)
  const baseFilteredOrders = useMemo(() => {
    return orders.filter(order => {
      const isScheduled = order.scheduled_date && order.scheduled_time;
      
      if (activeTab === 'now') {
        // Aba "Agora": pedidos não agendados OU pedidos agendados que já foram aceitos
        return !isScheduled || (isScheduled && order.status !== 'new');
      } else if (activeTab === 'scheduled') {
        // Aba "Agendados": apenas pedidos agendados que ainda estão pendentes
        return isScheduled && order.status === 'new';
      }
      
      return true;
    });
  }, [orders, activeTab]);

  // Inicializar filteredOrders com baseFilteredOrders quando necessário
  useEffect(() => {
    // Apenas inicializar se não houver filtros ativos
    if (!searchTerm && filteredOrders.length === 0) {
      setFilteredOrders(baseFilteredOrders);
    }
  }, [baseFilteredOrders]);

  const handleFilterChange = (filtered) => {
    setFilteredOrders(filtered);
  };

  const handleLogout = () => base44.auth.logout();

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('gestor-sidebar-collapsed', newState.toString());
  };

  if (permLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Gestor de Pedidos</h2>
          <p className="text-gray-600 mb-6">Esta funcionalidade não está disponível no seu plano atual.</p>
          <div className="space-y-3">
            <Link to={createPageUrl('PainelAssinante')}>
              <Button className="w-full bg-red-500 hover:bg-red-600">Voltar ao Painel</Button>
            </Link>
            <Link to={createPageUrl('Cardapio')}>
              <Button variant="outline" className="w-full">Ver Cardápio</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const store = stores[0] || { name: 'Gestor de Pedidos' };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <audio ref={audioRef} preload="auto" volume="1.0">
        <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
      </audio>
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            {/* Left */}
            <div className="flex items-center gap-3">
              <Link to={createPageUrl(backPage)} className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-red-500" />
                  )}
                </Button>
              </Link>
              <div className="hidden lg:flex items-center gap-3">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="font-bold text-lg">{store.name}</h1>
                  <p className="text-xs text-gray-500">Gestor de Pedidos</p>
                </div>
              </div>
            </div>

            {/* Center - Advanced Filters */}
            <div className="flex-1 max-w-2xl mx-4 hidden md:block">
              <AdvancedOrderFilters
                orders={baseFilteredOrders}
                onFilterChange={handleFilterChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-9 w-9"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['gestorOrders'] })}
                className="h-9 w-9"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Link to={createPageUrl(backPage)} className="hidden lg:block">
                <Button variant="outline" size="sm">Voltar</Button>
              </Link>
              <UserAuthButton />
            </div>
          </div>

          {/* Mobile Search/Filters */}
          <div className="mt-3 md:hidden">
            <AdvancedOrderFilters
              orders={baseFilteredOrders}
              onFilterChange={handleFilterChange}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex">
              <button
                onClick={() => setActiveTab('now')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'now' 
                    ? 'border-red-500 text-red-500' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Agora
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'scheduled' 
                    ? 'border-red-500 text-red-500' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Agendados
              </button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(true)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block fixed left-0 top-[57px] h-[calc(100vh-57px)] bg-white border-r z-40 transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-14' : 'w-52'
      }`}>
        <div className="h-full flex flex-col">
          {/* Toggle Button */}
          <div className="p-2 border-b">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center py-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
              title={sidebarCollapsed ? 'Expandir' : 'Recolher'}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-1.5 space-y-0.5 overflow-y-auto">
            <button
              onClick={() => setViewMode('kanban')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-200 ${
                viewMode === 'kanban' 
                  ? 'bg-red-50 text-red-600' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'Quadros' : ''}
            >
              <LayoutGrid className="w-4 h-4 flex-shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>
                Quadros
              </span>
            </button>

            <button
              onClick={() => setViewMode('delivery')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-200 ${
                viewMode === 'delivery' 
                  ? 'bg-red-50 text-red-600' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'Entregadores' : ''}
            >
              <Truck className="w-4 h-4 flex-shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>
                Entregadores
              </span>
            </button>

            <button
              onClick={() => setViewMode('settings')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-200 ${
                viewMode === 'settings' 
                  ? 'bg-red-50 text-red-600' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'Ajustes' : ''}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>
                Ajustes
              </span>
            </button>
          </nav>

          {/* Footer with badge count */}
          <div className="p-2 border-t">
            {!sidebarCollapsed ? (
              <div className="text-center py-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ativos</p>
                <p className="text-xl font-bold text-red-500">{orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setShowMobileMenu(false)}
        >
          <div 
            className="w-72 h-full bg-white shadow-2xl animate-in slide-in-from-left duration-300" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="flex items-center gap-2">
                <Menu className="w-5 h-5" />
                <h2 className="font-bold">Menu</h2>
              </div>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Items */}
            <nav className="p-3 space-y-2">
              <button
                onClick={() => {
                  setViewMode('kanban');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  viewMode === 'kanban' 
                    ? 'bg-red-500 text-white shadow-sm' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
                <span className="font-medium">Quadros</span>
                {viewMode === 'kanban' && (
                  <CheckCircle className="w-4 h-4 ml-auto" />
                )}
              </button>

              <button
                onClick={() => {
                  setViewMode('delivery');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  viewMode === 'delivery' 
                    ? 'bg-red-500 text-white shadow-sm' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Truck className="w-5 h-5" />
                <span className="font-medium">Entregadores</span>
                {viewMode === 'delivery' && (
                  <CheckCircle className="w-4 h-4 ml-auto" />
                )}
              </button>

              <button
                onClick={() => {
                  setViewMode('settings');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  viewMode === 'settings' 
                    ? 'bg-red-500 text-white shadow-sm' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Ajustes</span>
                {viewMode === 'settings' && (
                  <CheckCircle className="w-4 h-4 ml-auto" />
                )}
              </button>
            </nav>

            {/* Mobile Stats */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">Pedidos Ativos</p>
                  <p className="text-xl font-bold text-red-500">
                    {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">Novos</p>
                  <p className="text-xl font-bold text-orange-500">
                    {orders.filter(o => o.status === 'new').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Content */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-52'}`}>
        <div className="max-w-[1240px] mx-auto p-4">
        {/* Stats Panel - Mostrar apenas no modo kanban */}
        {viewMode === 'kanban' && (
          <div className="mb-6">
            <GestorStatsPanel 
              orders={orders}
              entregadores={entregadores}
              darkMode={false}
            />
          </div>
        )}
        {viewMode === 'kanban' && (
          <EnhancedKanbanBoard 
            orders={filteredOrders}
            onSelectOrder={setSelectedOrder}
            darkMode={false}
          />
        )}
        {viewMode === 'delivery' && (
          <DeliveryPanel 
            entregadores={entregadores}
            orders={orders}
            stores={stores}
          />
        )}
        {viewMode === 'settings' && (
          <GestorSettings />
        )}
        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          entregadores={entregadores}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
            setSelectedOrder(null);
          }}
          user={user}
        />
      )}
    </div>
  );
}