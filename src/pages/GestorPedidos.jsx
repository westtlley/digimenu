import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Bell, Volume2, VolumeX, RefreshCw,
  CheckCircle, Truck, LayoutGrid, Menu, X as CloseIcon,
  Settings, ChevronLeft, Lock, DollarSign, Download, Printer, Home,
  BarChart2, Headphones, MessageCircle, Check, HelpCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SYSTEM_NAME } from '@/config/branding';
import toast, { Toaster } from 'react-hot-toast';

import EnhancedKanbanBoard from '../components/gestor/EnhancedKanbanBoard';
import OrderDetailModal from '../components/gestor/OrderDetailModal';
import DeliveryPanel from '../components/gestor/DeliveryPanel';
import GestorSettings from '../components/gestor/GestorSettings';
import GestorStatsPanel from '../components/gestor/GestorStatsPanel';
import GestorLoading from '../components/gestor/GestorLoading';
import GestorDicasAtalhos from '../components/gestor/GestorDicasAtalhos';
import AdvancedOrderFilters from '../components/gestor/AdvancedOrderFilters';
import FinancialDashboard from '../components/gestor/FinancialDashboard';
import UserAuthButton from '../components/atoms/UserAuthButton';
import { usePermission } from '../components/permissions/usePermission';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import { useSlugContext } from '@/hooks/useSlugContext';
import { downloadOrdersCSV, exportGestorReportPDF, printOrdersInQueue } from '../utils/gestorExport';
import { getNotificationSoundConfig } from '@/utils/gestorSounds';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import InstallAppButton from '../components/InstallAppButton';
import { useManagerialAuth } from '@/hooks/useManagerialAuth';

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
  const [onlyNew, setOnlyNew] = useState(false);
  const [printQueue, setPrintQueue] = useState([]);
  const [quickStatusKey, setQuickStatusKey] = useState(null);
  const [showAreYouThereModal, setShowAreYouThereModal] = useState(false);
  const [showAtalhosModal, setShowAtalhosModal] = useState(false);
  
  const { requireAuthorization, modal: authModal } = useManagerialAuth();
  const areYouTherePausedRef = useRef(false);
  const areYouThereTimerRef = useRef(null);
  const prevOrderCountRef = useRef(0);
  const autoAcceptedIdsRef = useRef(new Set());
  const queryClient = useQueryClient();
  const { isMaster, hasModuleAccess, loading: permLoading, user } = usePermission();
  const { slug, subscriberEmail, inSlugContext, loading: slugLoading, error: slugError } = useSlugContext();

  const hasAccess = isMaster || hasModuleAccess('gestor_pedidos');
  const backPage = isMaster ? 'Admin' : 'PainelAssinante';
  // Em /s/:slug, master usa as_subscriber; assinante/colaborador já é filtrado pelo backend
  const asSub = (inSlugContext && isMaster && subscriberEmail) ? subscriberEmail : undefined;
  const canAccessSlug = !inSlugContext || isMaster || (user?.email || '').toLowerCase() === (subscriberEmail || '').toLowerCase() || (user?.subscriber_email || '').toLowerCase() === (subscriberEmail || '').toLowerCase();

  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['gestorOrders', asSub ?? 'me'],
    queryFn: async () => {
      const opts = asSub ? { as_subscriber: asSub } : {};
      const allOrders = await base44.entities.Order.list('-created_date', opts);
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

  const { data: entregadoresData } = useQuery({
    queryKey: ['entregadores', asSub ?? 'me'],
    queryFn: () => base44.entities.Entregador.list(null, asSub ? { as_subscriber: asSub } : {}),
    refetchInterval: 3000,
    retry: false,
  });
  const entregadores = useMemo(() => (entregadoresData != null ? entregadoresData : []), [entregadoresData]);

  const { data: stores = [] } = useQuery({
    queryKey: ['store', asSub ?? 'me'],
    queryFn: () => base44.entities.Store.list(null, asSub ? { as_subscriber: asSub } : {}),
  });
  const store = stores[0] || { name: 'Gestor de Pedidos' };
  useDocumentHead(store);

  const loadGestorSettings = () => {
    try {
      const saved = localStorage.getItem('gestor_notification_config');
      if (saved) {
        const config = JSON.parse(saved);
        setNotificationConfig(config);
        setSoundEnabled(config.soundEnabled !== false);
      }
      const gs = localStorage.getItem('gestorSettings');
      const gestorSettings = gs ? JSON.parse(gs) : {};
      if (gestorSettings.sound_notifications === false) setSoundEnabled(false);
    } catch (e) {
      console.error('Erro ao carregar configurações de notificação:', e);
    }
  };

  useEffect(() => { loadGestorSettings(); }, []);

  useEffect(() => {
    const onUpdated = () => { loadGestorSettings(); };
    window.addEventListener('gestorSettingsUpdated', onUpdated);
    window.addEventListener('gestorNotificationConfigUpdated', onUpdated);
    return () => {
      window.removeEventListener('gestorSettingsUpdated', onUpdated);
      window.removeEventListener('gestorNotificationConfigUpdated', onUpdated);
    };
  }, []);

  // Aceitar automaticamente (quando ativado em Configurações do gestor)
  useEffect(() => {
    try {
      const gs = localStorage.getItem('gestorSettings');
      const gestorSettings = gs ? JSON.parse(gs) : {};
      if (!gestorSettings.auto_accept || !orders.length) return;

      const prepTime = Math.max(5, Math.min(180, Number(gestorSettings.default_prep_time) || 30));
      const newOrders = orders.filter(o => o.status === 'new');

      (async () => {
        for (const o of newOrders) {
          if (autoAcceptedIdsRef.current.has(o.id)) continue;
          autoAcceptedIdsRef.current.add(o.id);
          try {
            await base44.entities.Order.update(o.id, {
              ...o,
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              prep_time: prepTime,
            }, asSub ? { as_subscriber: asSub } : {});
            queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
          } catch (e) {
            autoAcceptedIdsRef.current.delete(o.id);
          }
        }
      })();
    } catch (_) {}
  }, [orders, queryClient]);

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

  // "Está aí?" (inatividade): após N min sem interação, modal
  useEffect(() => {
    try {
      const gs = JSON.parse(localStorage.getItem('gestorSettings') || '{}');
      if (!gs.are_you_there_enabled) return;
      const mins = Math.max(1, Math.min(120, Number(gs.are_you_there_minutes) || 15));
      const ms = mins * 60 * 1000;
      const schedule = () => {
        if (areYouTherePausedRef.current) return;
        if (areYouThereTimerRef.current) clearTimeout(areYouThereTimerRef.current);
        areYouThereTimerRef.current = setTimeout(() => {
          if (areYouTherePausedRef.current) return;
          setShowAreYouThereModal(true);
        }, ms);
      };
      const onActivity = () => { if (!areYouTherePausedRef.current) schedule(); };
      window.addEventListener('mousemove', onActivity);
      window.addEventListener('keydown', onActivity);
      window.addEventListener('click', onActivity);
      window.addEventListener('scroll', onActivity);
      schedule();
      return () => {
        if (areYouThereTimerRef.current) clearTimeout(areYouThereTimerRef.current);
        window.removeEventListener('mousemove', onActivity);
        window.removeEventListener('keydown', onActivity);
        window.removeEventListener('click', onActivity);
        window.removeEventListener('scroll', onActivity);
      };
    } catch (_) {}
  }, []);

  // Auto-cancel late orders (configurável em Ajustes: desligado / só alertar / cancelar após X min)
  useEffect(() => {
    const checkLateOrders = async () => {
      try {
        const gs = JSON.parse(localStorage.getItem('gestorSettings') || '{}');
        const mode = gs.auto_cancel_mode || 'off'; // 'off' | 'alert' | 'cancel'
        if (mode === 'off') return;
        const marginMins = Math.max(0, Math.min(60, Number(gs.auto_cancel_minutes) ?? 10));
        const now = new Date();
        let didUpdate = false;
        for (const order of orders) {
          if (!order.accepted_at || ['delivered', 'cancelled'].includes(order.status)) continue;
          const acceptedTime = new Date(order.accepted_at);
          const prepTime = order.prep_time || 30;
          const minutesElapsed = (now - acceptedTime) / 1000 / 60;
          if (minutesElapsed <= prepTime + marginMins) continue;
          if (mode === 'alert') {
            toast(`Pedido ${order.order_code || order.id} atrasado (prep ${prepTime} min + ${marginMins} min)`, { icon: '⚠️', duration: 5000 });
            continue;
          }
          // mode === 'cancel'
          await base44.entities.Order.update(order.id, {
            ...order,
            status: 'cancelled',
            rejection_reason: 'Cancelado automaticamente por atraso (tempo de preparo excedido)'
          }, asSub ? { as_subscriber: asSub } : {});
          didUpdate = true;
        }
        if (didUpdate) queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
      } catch (_) {}
    };
    const interval = setInterval(checkLateOrders, 60000);
    return () => clearInterval(interval);
  }, [orders, queryClient, asSub]);

  const playNotificationSound = () => {
    try {
      const { url, volume } = getNotificationSoundConfig();
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch(() => {});
    } catch (_) {}
  };

  // Atalhos de teclado avançados
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar se estiver digitando em input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        // Permitir apenas atalhos com Ctrl/Cmd mesmo em inputs
        if (!(e.ctrlKey || e.metaKey)) return;
      }

      // Esc: Fechar modais/menus
      if (e.key === 'Escape') {
        if (showAtalhosModal) setShowAtalhosModal(false);
        else if (selectedOrder) setSelectedOrder(null);
        else if (showMobileMenu) setShowMobileMenu(false);
        return;
      }

      // Ctrl/Cmd + F: Buscar
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Buscar"]')?.focus();
        return;
      }

      // Ctrl/Cmd + R: Refresh (prevenir reload padrão)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
        toast.success('Pedidos atualizados!');
        return;
      }

      // Navegação entre views (apenas se não estiver em input)
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
        // K: Kanban
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          setViewMode('kanban');
          toast.success('Quadros', { duration: 1000 });
          return;
        }
        // D: Delivery
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          setViewMode('delivery');
          toast.success('Entregadores', { duration: 1000 });
          return;
        }
        // R: Resumo
        if (e.key === 'r' || e.key === 'R') {
          if (!(e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            setViewMode('resumo');
            toast.success('Resumo', { duration: 1000 });
            return;
          }
        }
        // S: Settings
        if (e.key === 's' || e.key === 'S') {
          if (!(e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            setViewMode('settings');
            toast.success('Ajustes', { duration: 1000 });
            return;
          }
        }
        // H: Home/Início
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          setViewMode('inicio');
          toast.success('Início', { duration: 1000 });
          return;
        }
        // N: Só novos
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          setOnlyNew(!onlyNew);
          toast.success(onlyNew ? 'Mostrando todos' : 'Só novos', { duration: 1000 });
          return;
        }
      }

      // Atalhos numéricos para status (quando modal aberto)
      if (selectedOrder && ['1', '2', '3', '4', '5'].includes(e.key)) {
        const map = { 
          '1': 'accepted', 
          '2': 'preparing', 
          '3': 'ready', 
          '4': 'out_for_delivery', 
          '5': 'delivered' 
        };
        setQuickStatusKey(map[e.key]);
        return;
      }

      // Atalhos com Shift
      if (e.shiftKey) {
        // Shift + F: Filtros
        if (e.key === 'F') {
          e.preventDefault();
          document.querySelector('button:has(svg[class*="Filter"])')?.click();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrder, showMobileMenu, showAtalhosModal, onlyNew, queryClient, viewMode]);

  // Aplicar filtros básicos (aba agora/agendados)
  const baseFilteredOrders = useMemo(() => {
    return orders.filter(order => {
      const isScheduled = order.scheduled_date && order.scheduled_time;
      
      if (activeTab === 'now') {
        return !isScheduled || (isScheduled && order.status !== 'new');
      } else if (activeTab === 'scheduled') {
        return isScheduled && order.status === 'new';
      }
      
      return true;
    });
  }, [orders, activeTab]);

  // Tempo de preparo sugerido (média dos últimos pedidos com accepted_at e ready_at)
  const suggestedPrepTime = useMemo(() => {
    const withPrep = orders.filter(o => o.accepted_at && o.ready_at);
    if (withPrep.length === 0) return 30;
    const avg = withPrep.reduce((s, o) => s + (new Date(o.ready_at) - new Date(o.accepted_at)) / 60000, 0) / withPrep.length;
    return Math.max(5, Math.min(180, Math.round(avg))) || 30;
  }, [orders]);

  const kanbanOrders = onlyNew ? filteredOrders.filter(o => o.status === 'new') : filteredOrders;
  const newOrdersCount = orders.filter(o => o.status === 'new').length;

  // Sincronizar filteredOrders quando busca estiver vazia (evitar lista vazia ao limpar busca)
  useEffect(() => {
    if (!searchTerm) setFilteredOrders(baseFilteredOrders);
  }, [searchTerm, baseFilteredOrders]);

  const handleFilterChange = (filtered) => {
    setFilteredOrders(filtered);
  };

  const handleLogout = () => base44.auth.logout();

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('gestor-sidebar-collapsed', newState.toString());
  };

  if (permLoading) {
    return <GestorLoading />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Sessão expirada ou não autenticado.</p>
        <Link to="/login">
          <Button className="bg-orange-500 hover:bg-orange-600">Fazer login</Button>
        </Link>
      </div>
    );
  }

  if (inSlugContext && slugLoading) {
    return <GestorLoading />;
  }
  if (inSlugContext && slugError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-gray-600 mb-4">Link não encontrado.</p>
          <Link to="/"><Button>Ir ao cardápio</Button></Link>
        </div>
      </div>
    );
  }
  if (inSlugContext && subscriberEmail && !canAccessSlug) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <Lock className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Acesso negado</h2>
          <p className="text-sm text-gray-500 mt-2">Você não tem permissão para acessar o Gestor deste estabelecimento.</p>
          <Link to="/" className="mt-4 inline-block"><Button variant="outline">Voltar</Button></Link>
        </div>
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
            <Link to={createPageUrl('PainelAssinante', slug || undefined)}>
              <Button className="w-full bg-orange-500 hover:bg-orange-600">Voltar ao Painel</Button>
            </Link>
            <Link to={createPageUrl('Cardapio', slug || undefined)}>
              <Button variant="outline" className="w-full">Ver Cardápio</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const backUrl = createPageUrl(backPage, isMaster ? undefined : slug || undefined);

  return (
    <div className="min-h-screen min-h-screen-mobile bg-gray-50 flex flex-col">
      <Toaster position="top-center" />
      
      {/* Header - estilo iFood */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-14 flex-shrink-0">
        <div className="px-4 h-full">
          <div className="flex items-center justify-between h-full max-w-screen-2xl mx-auto">
            {/* Left: logo + loja + status */}
            <div className="flex items-center gap-3 min-w-0">
              <Link to={backUrl} className="lg:hidden flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-orange-500" />
                  )}
                </Button>
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="font-semibold text-base truncate">{store.name}</h1>
                  <p className={`text-xs font-medium ${store.is_open ? 'text-green-600' : 'text-red-600'}`}>
                    {store.is_open ? 'Loja aberta' : 'Loja fechada'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: ícones + ações */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <InstallAppButton pageName="Gestor" compact />
              <Button variant="ghost" size="icon" className="h-9 w-9 min-h-touch min-w-touch" onClick={() => setViewMode('resumo')} title="Resumo">
                <BarChart2 className="w-4 h-4 text-gray-600" />
              </Button>
              <a href="#suporte" className="hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-600 hover:bg-gray-100" title="Suporte">
                <Headphones className="w-4 h-4" />
              </a>
              <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex" title="Chat">
                <MessageCircle className="w-4 h-4 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowAtalhosModal(true)} title="Atalhos de teclado">
                <HelpCircle className="w-4 h-4 text-gray-600" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Download className="w-4 h-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => requireAuthorization('exportar', () => { downloadOrdersCSV(filteredOrders, `pedidos_${new Date().toISOString().slice(0,10)}.csv`); toast.success('CSV baixado'); })}>
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requireAuthorization('exportar', () => { exportGestorReportPDF(orders, 'today'); toast.success('PDF baixado'); })}>
                    Relatório do dia (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requireAuthorization('exportar', () => { exportGestorReportPDF(orders, 'week'); toast.success('PDF baixado'); })}>
                    Últimos 7 dias (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => requireAuthorization('exportar', () => { exportGestorReportPDF(orders, 'month'); toast.success('PDF baixado'); })}>
                    Últimos 30 dias (PDF)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? 'Desligar som' : 'Ligar som'}>
                {soundEnabled ? <Volume2 className="w-4 h-4 text-gray-600" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => queryClient.invalidateQueries({ queryKey: ['gestorOrders'] })} title="Atualizar">
                <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Link to={backUrl} className="hidden lg:inline-flex">
                <Button variant="outline" size="sm" className="h-9">Voltar</Button>
              </Link>
              <UserAuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Agora/Agendados - apenas no modo kanban */}
      {viewMode === 'kanban' && (
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="px-4 max-w-screen-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('now')}
                  className={`px-5 py-2.5 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'now' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Agora
                </button>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`px-5 py-2.5 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'scheduled' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Agendados
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowMobileMenu(true)} className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200 z-40 transition-all duration-300 ease-in-out ${
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
              onClick={() => setViewMode('inicio')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-r-md border-l-4 transition-all duration-200 ${
                viewMode === 'inicio' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'Início' : ''}
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Início</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`relative w-full flex items-center gap-2 px-2 py-2 rounded-r-md border-l-4 transition-all duration-200 ${
                viewMode === 'kanban' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? (newOrdersCount ? `Quadros (${newOrdersCount} novos)` : 'Quadros') : ''}
            >
              <LayoutGrid className="w-4 h-4 flex-shrink-0" />
              {newOrdersCount > 0 && (
                <span className="absolute left-6 top-1.5 min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                  {newOrdersCount > 99 ? '99+' : newOrdersCount}
                </span>
              )}
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>
                Quadros {newOrdersCount > 0 && !sidebarCollapsed ? `(${newOrdersCount})` : ''}
              </span>
            </button>

            <button
              onClick={() => setViewMode('delivery')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-r-md border-l-4 transition-all duration-200 ${
                viewMode === 'delivery' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-gray-600 hover:bg-gray-50'
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
              onClick={() => setViewMode('resumo')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-r-md border-l-4 transition-all duration-200 ${
                viewMode === 'resumo' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'Resumo' : ''}
            >
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Resumo</span>
            </button>
            <button
              onClick={() => setViewMode('settings')}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-r-md border-l-4 transition-all duration-200 ${
                viewMode === 'settings' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
              title={sidebarCollapsed ? 'Ajustes' : ''}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}>Ajustes</span>
            </button>
          </nav>

          {/* Footer with badge count */}
          <div className="p-2 border-t">
            {!sidebarCollapsed ? (
              <div className="text-center py-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ativos</p>
                <p className="text-xl font-bold text-orange-500">{orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
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
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="flex items-center gap-2">
                <Menu className="w-5 h-5" />
                <h2 className="font-bold">Menu</h2>
              </div>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Fechar menu"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Items */}
            <nav className="p-3 space-y-2">
              <button
                onClick={() => { setViewMode('inicio'); setShowMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  viewMode === 'inicio' ? 'bg-orange-500 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Início</span>
                {viewMode === 'inicio' && <CheckCircle className="w-4 h-4 ml-auto" />}
              </button>
              <button
                onClick={() => {
                  setViewMode('kanban');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  viewMode === 'kanban' 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
                <span className="font-medium">Quadros</span>
                {newOrdersCount > 0 && (
                  <span className="ml-auto min-w-[22px] h-[22px] rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                    {newOrdersCount > 99 ? '99+' : newOrdersCount}
                  </span>
                )}
                {viewMode === 'kanban' && newOrdersCount === 0 && (
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
                    ? 'bg-orange-500 text-white shadow-sm' 
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
                onClick={() => { setViewMode('resumo'); setShowMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  viewMode === 'resumo' ? 'bg-orange-500 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span className="font-medium">Resumo</span>
                {viewMode === 'resumo' && <CheckCircle className="w-4 h-4 ml-auto" />}
              </button>
              <button
                onClick={() => { setViewMode('settings'); setShowMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  viewMode === 'settings' ? 'bg-orange-500 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Ajustes</span>
                {viewMode === 'settings' && <CheckCircle className="w-4 h-4 ml-auto" />}
              </button>
            </nav>

            {/* Mobile Stats */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t bg-gray-50">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-xs text-gray-500">Pedidos Ativos</p>
                  <p className="text-xl font-bold text-orange-500">
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
      <main className={`flex-1 transition-all duration-300 pb-20 lg:pb-0 ${sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-52'}`}>
        <div className="max-w-[1240px] mx-auto p-4 xl:pr-14">
        {/* Breadcrumb / título contextual */}
        <p className="text-xs text-gray-500 mb-2 font-medium">
          {viewMode === 'inicio' && 'Início'}
          {viewMode === 'kanban' && `Quadros • ${activeTab === 'now' ? 'Agora' : 'Agendados'}`}
          {viewMode === 'delivery' && 'Entregadores'}
          {viewMode === 'resumo' && 'Resumo financeiro'}
          {viewMode === 'settings' && 'Ajustes'}
        </p>
        {viewMode === 'inicio' && (
          <GestorDicasAtalhos onNavigate={setViewMode} />
        )}
        {/* Kanban: filtros, quadros (em cima), depois estatísticas */}
        {viewMode === 'kanban' && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <AdvancedOrderFilters
                orders={baseFilteredOrders}
                onFilterChange={handleFilterChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                entregadores={entregadores}
              />
            </div>
            <Button
              variant={onlyNew ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOnlyNew(!onlyNew)}
              className="h-9 shrink-0"
              title="Só novos"
            >
              <Bell className="w-4 h-4 mr-1" />
              Só novos {orders.filter(o => o.status === 'new').length > 0 && `(${orders.filter(o => o.status === 'new').length})`}
            </Button>
          </div>
        )}
        {/* Quadros de pedidos em cima (Kanban) */}
        {viewMode === 'kanban' && (
          <EnhancedKanbanBoard 
            orders={kanbanOrders}
            onSelectOrder={setSelectedOrder}
            darkMode={false}
            isLoading={isLoading}
          />
        )}
        {/* Stats Panel - abaixo dos quadros no modo kanban */}
        {viewMode === 'kanban' && (
          <div className="mt-6">
            <GestorStatsPanel 
              orders={orders}
              entregadores={entregadores}
              darkMode={false}
            />
          </div>
        )}
        {viewMode === 'resumo' && (
          <FinancialDashboard orders={orders} />
        )}
        {viewMode === 'delivery' && (
          <DeliveryPanel entregadores={entregadores} orders={orders} stores={stores} />
        )}
        {viewMode === 'settings' && (
          <GestorSettings />
        )}
        </div>
      </main>

      {/* Footer fixo mobile: Quadros + Entregadores */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-bottom flex">
        <button
          onClick={() => setViewMode('kanban')}
          className={`relative flex-1 flex flex-col items-center justify-center py-3 min-h-touch gap-0.5 ${
            viewMode === 'kanban' ? 'text-orange-500 bg-orange-50 font-semibold' : 'text-gray-500'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-xs">Quadros</span>
          {newOrdersCount > 0 && (
            <span className="absolute top-2 right-1/3 min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
              {newOrdersCount > 99 ? '99+' : newOrdersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode('delivery')}
          className={`flex-1 flex flex-col items-center justify-center py-3 min-h-touch gap-0.5 ${
            viewMode === 'delivery' ? 'text-orange-500 bg-orange-50 font-semibold' : 'text-gray-500'
          }`}
        >
          <Truck className="w-5 h-5" />
          <span className="text-xs">Entregadores</span>
        </button>
      </div>

      {/* Footer global - estilo iFood (desktop) */}
      <footer className="hidden lg:block flex-shrink-0 border-t border-gray-200 bg-gray-100 py-2 px-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-center gap-2 text-sm text-gray-600">
          <Check className="w-4 h-4 text-green-600" />
          <span>{SYSTEM_NAME} • Gestor de Pedidos</span>
        </div>
      </footer>

      {/* Aba flutuante "Avalie a plataforma" */}
      <a
        href="#avalie"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 hidden xl:flex items-center justify-center w-10 h-24 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-l-lg shadow-lg writing-mode-vertical cursor-pointer"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        title="Avalie a plataforma"
      >
        Avalie a plataforma
      </a>

      {/* Fila de impressão - botão flutuante */}
      {printQueue.length > 0 && (
        <button
          onClick={() => { printOrdersInQueue(orders, printQueue); setPrintQueue([]); toast.success(`${printQueue.length} comanda(s) enviada(s) para impressão`); }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl shadow-lg"
        >
          <Printer className="w-5 h-5" />
          Imprimir {printQueue.length} comanda(s)
        </button>
      )}

      {/* Modal "Está aí?" (inatividade) */}
      <Dialog open={showAreYouThereModal} onOpenChange={(o) => { if (!o) setShowAreYouThereModal(false); }}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Você ainda está aí?</DialogTitle>
          <p className="text-sm text-gray-600">O gestor está pausado. Toque em Continuar para seguir recebendo avisos.</p>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setShowAreYouThereModal(false)} className="flex-1 bg-orange-500 hover:bg-orange-600 uppercase font-bold">
              Continuar
            </Button>
            <Button
              variant="outline"
              onClick={() => { areYouTherePausedRef.current = true; setShowAreYouThereModal(false); }}
              className="flex-1"
            >
              Desligar (sessão)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Atalhos de teclado */}
      <Dialog open={showAtalhosModal} onOpenChange={setShowAtalhosModal}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            Atalhos de teclado
          </DialogTitle>
          <div className="grid gap-2 text-sm">
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">K</kbd> Quadros</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">D</kbd> Entregadores</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">R</kbd> Resumo</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">S</kbd> Ajustes</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">H</kbd> Início</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">N</kbd> Só novos</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">1</kbd>-<kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">5</kbd> Status (com modal aberto)</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">Ctrl+F</kbd> Buscar</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">Ctrl+R</kbd> Atualizar</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">Esc</kbd> Fechar modal</p>
          </div>
        </DialogContent>
      </Dialog>

      {authModal}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          entregadores={entregadores}
          onClose={() => setSelectedOrder(null)}
          onUpdate={(updatedOrder) => {
            queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
            setSelectedOrder(updatedOrder ?? null);
          }}
          user={user}
          asSub={asSub}
          suggestedPrepTime={suggestedPrepTime}
          quickStatusKey={quickStatusKey}
          onClearQuickStatus={() => setQuickStatusKey(null)}
          onViewMap={() => { setViewMode('delivery'); setSelectedOrder(null); }}
          onDuplicate={(o) => {
            requireAuthorization('duplicar', async () => {
              const { id, order_code, created_date, delivered_at, accepted_at, ready_at, ...rest } = o;
              try {
                const data = { ...rest, status: 'new', created_date: new Date().toISOString(), ...(asSub && { as_subscriber: asSub }) };
                await base44.entities.Order.create(data);
                queryClient.invalidateQueries({ queryKey: ['gestorOrders'] });
                toast.success('Pedido duplicado.');
                setSelectedOrder(null);
              } catch (e) { toast.error(e?.message || 'Erro ao duplicar.'); }
            });
          }}
          onAddToPrintQueue={() => setPrintQueue(q => q.includes(selectedOrder.id) ? q : [...q, selectedOrder.id])}
        />
      )}
    </div>
  );
}