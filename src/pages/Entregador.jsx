import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, MapPin, Phone, Clock, DollarSign, User, LogOut, 
  CheckCircle, Navigation, AlertTriangle, Bell, Settings as SettingsIcon,
  TrendingUp, HelpCircle, Star, Camera, Menu, X as CloseIcon, X, Lock, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useSlugContext } from '@/hooks/useSlugContext';
import { useEntregador } from '@/hooks/useEntregador';
import { useDeliveryOrders } from '@/hooks/useDeliveryOrders';
import { useOperationalOrdersRealtime } from '@/hooks/useOperationalOrdersRealtime';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatPhone, formatRelativeTime } from '@/utils/formatters';
import { VEHICLE_ICONS, ORDER_STATUS, DEBOUNCE_DELAYS } from '@/utils/constants';
import {
  ACTIVE_DELIVERY_FLOW_STATUSES,
  getOrderDeliveryStatus,
  getOrderDisplayStatus,
  ORDER_DELIVERY_STATUS,
} from '@/utils/orderLifecycle';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

import DeliveryMap from '../components/entregador/DeliveryMap';
import EarningsReport from '../components/entregador/EarningsReport';
import EarningsView from '../components/entregador/EarningsView';
import DeliveryProofModal from '../components/entregador/DeliveryProofModal';
import RatingModal from '../components/entregador/RatingModal';
import TutorialModal from '../components/entregador/TutorialModal';
import ColaboradorProfile from '../components/colaboradores/ColaboradorProfile';
import SettingsModal from '../components/entregador/SettingsModal';
import PushNotifications from '../components/entregador/PushNotifications';
import CriticalMessageModal from '../components/entregador/CriticalMessageModal';
import OrderAlertModal from '../components/entregador/OrderAlertModal';
import LiveLocationTracker from '../components/entregador/LiveLocationTracker';
import GoogleDeliveryMap from '../components/maps/GoogleDeliveryMap';
import { useCriticalNotifications } from '../components/hooks/useCriticalNotifications';

import RouteOptimizer from '../components/entregador/RouteOptimizer';
import DeliveryProgressBar from '../components/entregador/DeliveryProgressBar';
import EmergencyButton from '../components/entregador/EmergencyButton';
import InstallAppButton from '../components/InstallAppButton';
import BatteryAlert from '../components/entregador/BatteryAlert';
import PauseModal from '../components/entregador/PauseModal';
import QuickReportModal from '../components/entregador/QuickReportModal';
import OrderItemsDetail from '../components/entregador/OrderItemsDetail';
import DeliveryDashboard from '../components/entregador/DeliveryDashboard';
import { usePermission } from '../components/permissions/usePermission';
import { buildTenantEntityOpts, getTenantScopeKey, userMatchesTenant } from '@/utils/tenantScope';

function upsertOrderById(currentOrders, incomingOrder) {
  const list = Array.isArray(currentOrders) ? [...currentOrders] : [];
  const existingIndex = list.findIndex((order) => String(order?.id) === String(incomingOrder?.id));

  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      ...incomingOrder,
    };
    return list;
  }

  return [incomingOrder, ...list];
}

function removeOrderById(currentOrders, orderId) {
  const list = Array.isArray(currentOrders) ? currentOrders : [];
  return list.filter((order) => String(order?.id) !== String(orderId));
}

export default function Entregador() {
  const [deliveryCodeInput, setDeliveryCodeInput] = useState({});
  const [pickupCodeInput, setPickupCodeInput] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showProofModal, setShowProofModal] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [entregadorLocation, setEntregadorLocation] = useState(null);
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showQuickReport, setShowQuickReport] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseEndTime, setPauseEndTime] = useState(null);
  const [cancelModal, setCancelModal] = useState({ open: false, order: null, stage: null, reason: '' });
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [statusTransitionLoading, setStatusTransitionLoading] = useState({});
  
  const audioRef = useRef(null);
  const statusTransitionLocksRef = useRef(new Set());
  const queryClient = useQueryClient();
  const { slug, subscriberEmail, inSlugContext } = useSlugContext();
  const { isMaster: isMasterPerm, hasModuleAccess, loading: permissionLoading } = usePermission();
  
  // Plano básico não tem acesso ao App Entregador
  
  // Hook customizado para entregador
  // ✅ SIMPLIFICADO: Backend valida acesso - se entregador não existir e não for master/entregador, mostrar erro
  const { user, setUser, entregador, setEntregador, loading, asSubscriber, asSubscriberId, tenantSubscriberId, tenantIdentifier, isMaster } = useEntregador();
  
  // Hook customizado para pedidos
  const { orders: displayOrders, activeOrders, completedOrders, completedOrdersToday, stats: orderStats } = useDeliveryOrders(
    entregador?.id,
    asSubscriber,
    asSubscriberId,
    isMaster
  );
  const isMasterUser = isMasterPerm || isMaster;
  const roles = user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : [];
  const isGerente = roles.includes('gerente');
  const isEntregador = user?.profile_role === 'entregador' || roles.includes('entregador');
  const normalizedSlugSubscriber = (subscriberEmail || '').toLowerCase().trim();
  const tenantResolved = !inSlugContext || !!normalizedSlugSubscriber;
  const tenantMatchesSlug =
    !inSlugContext ||
    (tenantResolved && userMatchesTenant(user, {
      subscriberId: tenantSubscriberId,
      subscriberEmail,
    }));
  const hasRoleAccess = isMasterUser || isEntregador || isGerente || userMatchesTenant(user, {
    subscriberId: tenantSubscriberId,
    subscriberEmail,
  });
  const hasOperationalModules = hasModuleAccess('orders') || hasModuleAccess('gestor_pedidos');
  const hasPlanAccess = isMasterUser || (hasModuleAccess('colaboradores') && hasOperationalModules);
  const canAccessDeliveryApp = tenantResolved && tenantMatchesSlug && hasPlanAccess && hasRoleAccess;
  const isEntregadorOperatorOnly = isEntregador && !isGerente && !isMasterUser;
  const fallbackBackUrl = isMasterUser
    ? createPageUrl('Admin')
    : isEntregadorOperatorOnly
      ? createPageUrl('ColaboradorHome')
      : createPageUrl('PainelAssinante', slug || undefined);
  const tenantScope = getTenantScopeKey(asSubscriberId ?? tenantSubscriberId, asSubscriber ?? tenantIdentifier, 'self');
  const entityOpts = useMemo(() => buildTenantEntityOpts({
    subscriberId: asSubscriberId,
    subscriberEmail: asSubscriber,
  }), [asSubscriber, asSubscriberId]);
  const deliveryOrdersKey = useMemo(() => ['deliveryOrders', entregador?.id, asSubscriberId ?? asSubscriber ?? 'me'], [entregador?.id, asSubscriber, asSubscriberId]);
  const allDeliveryOrdersKey = useMemo(() => ['allDeliveryOrders', asSubscriberId ?? asSubscriber ?? 'me'], [asSubscriber, asSubscriberId]);
  const availableOrdersKey = useMemo(() => ['availableOrders', tenantScope], [tenantScope]);
  const gestorOrdersKey = useMemo(() => ['gestorOrders', asSubscriberId ?? asSubscriber ?? 'me'], [asSubscriber, asSubscriberId]);
  const entregadoresKey = useMemo(() => ['entregadores', asSubscriberId ?? asSubscriber ?? 'me'], [asSubscriber, asSubscriberId]);
  const realtimeRefetchTimeoutRef = useRef(null);
  const updateOrder = (orderId, payload) => base44.entities.Order.update(orderId, payload, entityOpts);
  const updateEntregador = (entregadorId, payload) => base44.entities.Entregador.update(entregadorId, payload, entityOpts);
  const listStores = () => base44.entities.Store.list(null, entityOpts);

  const normalizeTenantEmail = useCallback((value) => {
    const normalized = String(value || '').toLowerCase().trim();
    return normalized || null;
  }, []);

  const isTenantOrder = useCallback((order) => {
    const orderTenantId = order?.subscriber_id ?? null;
    const orderTenant = normalizeTenantEmail(order?.owner_email || order?.subscriber_email);
    return Boolean(
      order?.id &&
      ((tenantSubscriberId != null && orderTenantId != null && String(orderTenantId) === String(tenantSubscriberId)) ||
        (tenantIdentifier && (!orderTenant || orderTenant === tenantIdentifier)))
    );
  }, [normalizeTenantEmail, tenantIdentifier, tenantSubscriberId]);

  const isAvailableDeliveryOrder = useCallback((order) => {
    return (
      isTenantOrder(order) &&
      order?.delivery_method === 'delivery' &&
      getOrderDisplayStatus(order) === ORDER_STATUS.READY &&
      getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.WAITING_DRIVER &&
      !order?.entregador_id
    );
  }, [isTenantOrder]);

  const isTrackedActiveDeliveryOrder = useCallback((order) => {
    return (
      isTenantOrder(order) &&
      order?.delivery_method === 'delivery' &&
      ACTIVE_DELIVERY_FLOW_STATUSES.has(getOrderDeliveryStatus(order))
    );
  }, [isTenantOrder]);

  const isAssignedToCurrentEntregador = useCallback((order) => {
    if (!isTenantOrder(order) || !entregador?.id) return false;
    return order?.delivery_method === 'delivery' && String(order?.entregador_id || '') === String(entregador.id);
  }, [entregador?.id, isTenantOrder]);

  const scheduleRealtimeSync = useCallback(() => {
    if (realtimeRefetchTimeoutRef.current) return;

    realtimeRefetchTimeoutRef.current = setTimeout(() => {
      realtimeRefetchTimeoutRef.current = null;
      queryClient.invalidateQueries({ queryKey: deliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: allDeliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: availableOrdersKey });
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
    }, 250);
  }, [allDeliveryOrdersKey, availableOrdersKey, deliveryOrdersKey, gestorOrdersKey, queryClient]);

  const handleRealtimeDeliveryOrder = useCallback((order) => {
    if (!isTenantOrder(order)) return;

    queryClient.setQueryData(availableOrdersKey, (current) => {
      if (isAvailableDeliveryOrder(order)) {
        return upsertOrderById(current, order);
      }
      return removeOrderById(current, order.id);
    });

    queryClient.setQueryData(deliveryOrdersKey, (current) => {
      if (!entregador?.id) return current;
      if (isAssignedToCurrentEntregador(order)) {
        return upsertOrderById(current, order);
      }
      return removeOrderById(current, order.id);
    });

    queryClient.setQueryData(allDeliveryOrdersKey, (current) => {
      if (isTrackedActiveDeliveryOrder(order)) {
        return upsertOrderById(current, order);
      }
      return removeOrderById(current, order.id);
    });

    scheduleRealtimeSync();
  }, [
    allDeliveryOrdersKey,
    availableOrdersKey,
    deliveryOrdersKey,
    entregador?.id,
    isAssignedToCurrentEntregador,
    isAvailableDeliveryOrder,
    isTenantOrder,
    isTrackedActiveDeliveryOrder,
    queryClient,
    scheduleRealtimeSync,
  ]);

  // Critical Notifications System
  const criticalNotifications = useCriticalNotifications(entregador?.id, {
    asSubscriber,
    asSubscriberId,
    tenantScope,
  });

  // Efeito para dark mode
  useEffect(() => {
    if (entregador) {
      setDarkMode(entregador.dark_mode || false);
    }
  }, [entregador]);

  // Verificar se é primeira vez e mostrar tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('entregador_tutorial_seen');
    const neverShowAgain = localStorage.getItem('entregador_tutorial_never_show');
    if (!hasSeenTutorial && !neverShowAgain && entregador) {
      setTimeout(() => setShowTutorial(true), 1000);
    }
  }, [entregador]);

  const prevOrderCountRef = useRef(0);

  // Tocar som quando novo pedido chega
  useEffect(() => {
    const activeCount = activeOrders.filter((order) => getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.OUT_FOR_DELIVERY).length;
    if (activeCount > prevOrderCountRef.current && entregador?.sound_enabled !== false) {
      if (audioRef.current) {
        audioRef.current.volume = 1.0;
        audioRef.current.play().catch(() => {});
      }
      // Vibrar se disponível
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
    }
    prevOrderCountRef.current = activeCount;
  }, [activeOrders, entregador]);

  // Hook para geocodificação do endereço do cliente
  const activeOrder = activeOrders[0];
  const { coordinates: geocodedLocation } = useGeocoding(activeOrder?.address);
  
  // Configurar localização do cliente do pedido ativo
  useEffect(() => {
    if (!activeOrder) {
      setCustomerLocation(null);
      return;
    }

    // Usar coordenadas salvas no pedido se disponíveis
    if (activeOrder.customer_latitude && activeOrder.customer_longitude) {
      setCustomerLocation({
        lat: activeOrder.customer_latitude,
        lng: activeOrder.customer_longitude
      });
      return;
    }

    // Usar geocodificação
    if (geocodedLocation) {
      setCustomerLocation(geocodedLocation);
    } else if (activeOrder.store_latitude != null && activeOrder.store_longitude != null) {
      setCustomerLocation({
        lat: activeOrder.store_latitude,
        lng: activeOrder.store_longitude
      });
    }
  }, [activeOrder, geocodedLocation]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, deliveryStatus }) => updateOrder(orderId, { 
      delivery_status: deliveryStatus,
      delivered_at: deliveryStatus === ORDER_DELIVERY_STATUS.DELIVERED ? new Date().toISOString() : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: allDeliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: availableOrdersKey });
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao atualizar status da entrega');
    },
  });

  // Buscar pedidos disponíveis para aceitar (status: ready, delivery)
  const { data: availableOrders = [] } = useQuery({
    queryKey: availableOrdersKey,
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({
        status: 'ready',
        delivery_method: 'delivery',
        ...entityOpts,
      });
      // Filtrar apenas pedidos sem entregador atribuído
      return orders.filter(o => !o.entregador_id);
    },
    enabled: !!entregador && entregador.status === 'available',
    refetchInterval: 10000,
  });

  useOperationalOrdersRealtime({
    roomType: 'delivery',
    enabled: canAccessDeliveryApp && (!!tenantIdentifier || tenantSubscriberId != null) && !!user,
    asSubscriber: asSubscriber || null,
    asSubscriberId: asSubscriberId ?? tenantSubscriberId ?? null,
    onOrderCreated: handleRealtimeDeliveryOrder,
    onOrderUpdated: handleRealtimeDeliveryOrder,
    onSocketUnavailable: () => {
      console.warn('Realtime do entregador indisponivel. Polling segue como fallback.');
    },
  });

  useEffect(() => () => {
    if (realtimeRefetchTimeoutRef.current) {
      clearTimeout(realtimeRefetchTimeoutRef.current);
      realtimeRefetchTimeoutRef.current = null;
    }
  }, []);

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async () => {
      const newStatus = entregador.status === 'available' ? 'offline' : 'available';
      
      if (entregador._isVirtual || entregador._isMaster) {
        return { ...entregador, status: newStatus };
      }
      
      return await updateEntregador(entregador.id, { 
        ...entregador,
        status: newStatus 
      });
    },
    onSuccess: (data) => {
      setEntregador(data);
      queryClient.invalidateQueries({ queryKey: entregadoresKey });
    },
  });

  const handleConfirmDelivery = (order) => {
    const inputCode = deliveryCodeInput[order.id] || '';
    
    if (!inputCode) {
      toast.error('Por favor, informe o código de entrega fornecido pelo cliente');
      return;
    }
    
    if (inputCode !== order.delivery_code) {
      toast.error('Código de entrega inválido! Verifique com o cliente.');
      return;
    }
    
    setShowProofModal(order);
    setDeliveryCodeInput(prev => {
      const newState = { ...prev };
      delete newState[order.id];
      return newState;
    });
  };

  const handleProofSubmitted = () => {
    const order = showProofModal;
    
    // Atualizar status para entregue
    updateStatusMutation.mutate({
      orderId: order.id,
      deliveryStatus: ORDER_DELIVERY_STATUS.DELIVERED,
    });
    
    // Atualizar entregador
    if (!entregador._isMaster) {
      updateEntregador(entregador.id, {
        status: 'available',
        current_order_id: null,
        total_deliveries: (entregador.total_deliveries || 0) + 1,
        total_earnings: (entregador.total_earnings || 0) + (order.delivery_fee || 0)
      });
    } else {
      setEntregador(prev => ({ 
        ...prev, 
        status: 'available',
        total_deliveries: (prev.total_deliveries || 0) + 1,
        total_earnings: (prev.total_earnings || 0) + (order.delivery_fee || 0)
      }));
    }
    
    setShowProofModal(null);
    
    // Mostrar modal de avaliação
    setTimeout(() => setShowRatingModal(order), 500);
  };

  const handleTutorialClose = () => {
    localStorage.setItem('entregador_tutorial_seen', 'true');
    setShowTutorial(false);
  };




  const handlePause = (duration, reason) => {
    setIsPaused(true);
    const endTime = new Date(Date.now() + duration * 60000);
    setPauseEndTime(endTime);
    
    // Auto-resume after duration
    setTimeout(() => {
      setIsPaused(false);
      setPauseEndTime(null);
    }, duration * 60000);
  };

  const getTimeSince = (date) => {
    if (date == null || date === '') return '—';
    const created = new Date(date);
    if (Number.isNaN(created.getTime())) return '—';
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0 || !Number.isFinite(diffMins)) return '—';
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${Math.floor(diffHours / 24)}d atrás`;
  };

  const statusMeta = useMemo(() => ({
    going_to_store: {
      label: 'Indo ao restaurante',
      badge: 'bg-blue-500 text-white',
      nextStep: 'Chegar ao restaurante e validar coleta',
    },
    arrived_at_store: {
      label: 'No restaurante',
      badge: 'bg-indigo-500 text-white',
      nextStep: 'Confirmar codigo de retirada',
    },
    picked_up: {
      label: 'Pedido coletado',
      badge: 'bg-green-500 text-white',
      nextStep: 'Sair para entrega',
    },
    out_for_delivery: {
      label: 'Em rota',
      badge: 'bg-cyan-500 text-white',
      nextStep: 'Chegar ao cliente',
    },
    arrived_at_customer: {
      label: 'No cliente',
      badge: 'bg-emerald-500 text-white',
      nextStep: 'Confirmar codigo de entrega',
    },
  }), []);

  const openWhatsApp = (phone, message = '') => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`);
  };

  const callPhone = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const cancelReasonSuggestions = {
    store: ['Restaurante fechado', 'Pedido cancelado'],
    route: ['Endereço não encontrado', 'Cliente não atende'],
    customer: ['Endereço não encontrado', 'Cliente não atende'],
  };

  const openCancelModal = (order, stage) => {
    setCancelModal({ open: true, order, stage, reason: '' });
  };

  const closeCancelModal = () => {
    setCancelModal({ open: false, order: null, stage: null, reason: '' });
  };

  const confirmCancelOrder = async () => {
    const order = cancelModal.order;
    const reason = (cancelModal.reason || '').trim();
    if (!order || reason.length < 3) {
      toast.error('Informe um motivo com pelo menos 3 caracteres');
      return;
    }

    setCancelSubmitting(true);
    try {
      await updateOrder(order.id, {
        delivery_status: ORDER_DELIVERY_STATUS.CANCELLED,
        rejection_reason: `Cancelado pelo entregador: ${reason}`,
      });

      if (!entregador?._isVirtual) {
        await updateEntregador(entregador.id, {
          ...entregador,
          status: 'available',
          current_order_id: null,
        });
      }

      queryClient.invalidateQueries({ queryKey: deliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: allDeliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: availableOrdersKey });
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
      toast.success('Entrega cancelada com sucesso');
      closeCancelModal();
    } catch (error) {
      toast.error(error?.message || 'Erro ao cancelar a entrega');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const isStatusTransitionLoading = (orderId, nextStatus) =>
    Boolean(statusTransitionLoading[`${orderId}:${nextStatus}`]);

  const runStatusTransition = async ({
    order,
    nextStatus,
    payload,
    successMessage,
    errorMessage,
    onSuccess,
  }) => {
    const transitionKey = `${order?.id}:${nextStatus}`;
    if (!order?.id || statusTransitionLocksRef.current.has(transitionKey)) return;

    statusTransitionLocksRef.current.add(transitionKey);
    setStatusTransitionLoading(prev => ({ ...prev, [transitionKey]: true }));

    try {
      await updateOrder(order.id, payload);
      queryClient.invalidateQueries({ queryKey: deliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: allDeliveryOrdersKey });
      queryClient.invalidateQueries({ queryKey: availableOrdersKey });
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
      toast.success(successMessage);
      if (typeof onSuccess === 'function') onSuccess();
    } catch (error) {
      toast.error(error?.message || errorMessage || 'Erro ao atualizar status da entrega');
    } finally {
      statusTransitionLocksRef.current.delete(transitionKey);
      setStatusTransitionLoading(prev => {
        const next = { ...prev };
        delete next[transitionKey];
        return next;
      });
    }
  };


  if (loading || permissionLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Bloqueio por permissões centralizadas
  if (!canAccessDeliveryApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <Lock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">App Entregador</h2>
          <p className="text-gray-600 mb-6">
            Este app não está habilitado para seu perfil/plano atual.
          </p>
          <Link to={fallbackBackUrl}>
            <Button className="bg-blue-500 hover:bg-blue-600">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }
  if (!entregador) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-8 max-w-md text-center`}>
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Acesso Negado
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Você não está cadastrado como entregador.
          </p>
          <Link to={fallbackBackUrl}>
            <Button className="w-full bg-blue-500 hover:bg-blue-600">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50'}`}>
      <audio ref={audioRef} preload="auto" volume="1.0">
        <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
      </audio>

      {/* Push Notifications */}
        <PushNotifications 
          entregador={entregador} 
          enabled={entregador?.notifications_enabled !== false && !isPaused}
          asSubscriber={asSubscriber}
          asSubscriberId={asSubscriberId}
          tenantScope={tenantScope}
      />

      {/* Battery Alert */}
      <BatteryAlert darkMode={darkMode} />

      {/* Emergency Button */}
      <EmergencyButton darkMode={darkMode} />

      {/* Header */}
      <header className={`${darkMode ? 'bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-r from-white via-gray-50 to-white border-gray-200'} border-b-2 sticky top-0 z-40 backdrop-blur-lg shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {entregador.photo ? (
                <motion.img 
                  whileHover={{ scale: 1.1 }}
                  src={entregador.photo} 
                  alt={entregador.name} 
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500 shadow-lg" 
                />
              ) : (
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg"
                >
                  <User className="w-6 h-6 text-white" />
                </motion.div>
              )}
              <div>
                <h1 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {entregador.name}
                </h1>
                <div className="flex items-center gap-2">
                  {entregador.vehicle_type && (
                    <span className="text-base">{VEHICLE_ICONS[entregador.vehicle_type] || '🚗'}</span>
                  )}
                  <div className="flex items-center gap-1 bg-yellow-100 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 text-yellow-600 fill-yellow-600" />
                    <span className="text-xs font-bold text-yellow-700">
                      {entregador.rating?.toFixed(1) || '5.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <InstallAppButton pageName="Entregador" compact />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTutorial(true)}
                className="hidden md:flex min-h-touch min-w-touch"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="hidden md:flex"
              >
                <SettingsIcon className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => base44.auth.logout()}
                className="hidden md:flex text-red-600"
              >
                <LogOut className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileMenu(true)}
                className="md:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileMenu(false)}>
          <div className={`w-64 h-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Menu</h2>
              <button onClick={() => setShowMobileMenu(false)}>
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  setShowProfile(true);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Perfil</span>
              </button>
              <button
                onClick={() => {
                  setShowEarnings(true);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span>Ganhos</span>
              </button>
              <button
                onClick={() => {
                  setShowSettings(true);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <SettingsIcon className="w-5 h-5" />
                <span>Configurações</span>
              </button>
              <button
                onClick={() => {
                  setShowTutorial(true);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <HelpCircle className="w-5 h-5" />
                <span>Tutorial</span>
              </button>
              <button
                onClick={() => base44.auth.logout()}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-500 ${
                  darkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-50'
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Profissional */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <DeliveryDashboard
          entregador={entregador}
          activeOrders={activeOrders}
          completedOrdersToday={completedOrdersToday}
          darkMode={darkMode}
        />
      </div>

      {/* Status Card */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${darkMode ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-white via-gray-50 to-white'} rounded-3xl p-4 md:p-6 shadow-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className={`text-lg md:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                Status de Disponibilidade
              </h2>
              <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {entregador.status === 'available' ? 'Você está disponível para receber pedidos' : 'Você está offline'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleAvailabilityMutation.mutate()}
                disabled={toggleAvailabilityMutation.isPending || isPaused}
                className={`flex-1 px-6 py-3 md:py-4 rounded-2xl font-bold text-sm md:text-base text-white transition-all shadow-lg ${
                  isPaused
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 cursor-not-allowed'
                    : entregador.status === 'available'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                }`}
              >
                {isPaused ? (
                  <span className="flex items-center justify-center gap-2">
                    ⏸️ Em Pausa
                  </span>
                ) : entregador.status === 'available' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full animate-pulse"></span>
                    Disponível
                  </span>
                ) : (
                  '⚫ Offline'
                )}
              </motion.button>
              {entregador.status === 'available' && !isPaused && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPauseModal(true)}
                  className="flex-1 sm:flex-none sm:px-8 px-4 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                >
                  ⏸️ Pausar
                </motion.button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className={`p-3 md:p-5 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700' : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200'} backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 md:w-7 h-5 md:h-7 text-blue-600" />
                {activeOrders.length > 0 && (
                  <span className="w-5 h-5 md:w-6 md:h-6 bg-blue-600 text-white rounded-full text-[10px] md:text-xs font-bold flex items-center justify-center">
                    {activeOrders.length}
                  </span>
                )}
              </div>
              <p className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-blue-700'} mb-1`}>
                {activeOrders.length}
              </p>
              <p className={`text-[10px] md:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Entregas Ativas</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className={`p-3 md:p-5 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700' : 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'} backdrop-blur-sm`}
            >
              <CheckCircle className="w-5 md:w-7 h-5 md:h-7 text-green-600 mb-2" />
              <p className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-green-700'} mb-1`}>
                {entregador.total_deliveries || 0}
              </p>
              <p className={`text-[10px] md:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Total de Entregas</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className={`p-3 md:p-5 rounded-2xl ${darkMode ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700' : 'bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200'} backdrop-blur-sm`}
            >
              <DollarSign className="w-5 md:w-7 h-5 md:h-7 text-purple-600 mb-2" />
              <p className={`text-lg md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-purple-700'} mb-1 break-words`}>
                {formatCurrency(entregador.total_earnings || 0)}
              </p>
              <p className={`text-[10px] md:text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Ganhos Totais</p>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 mt-4 md:mt-6">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setShowProfile(true)}
                variant="outline"
                className={`w-full h-10 md:h-12 rounded-xl font-semibold text-sm ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <User className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
                Perfil
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setShowEarnings(true)}
                variant="outline"
                className={`w-full h-10 md:h-12 rounded-xl font-semibold text-sm ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                <TrendingUp className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
                Relatório
              </Button>
            </motion.div>
          </div>

        </motion.div>
      </div>



      {/* Live Location Tracker */}
      <LiveLocationTracker 
        entregador={entregador}
        onLocationUpdate={setEntregadorLocation}
        entityOpts={entityOpts}
      />

      {/* Mapa de Rastreamento em Tempo Real */}
      {activeOrders.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-3xl overflow-hidden shadow-2xl border-2`}
          >
            <div className={`p-4 border-b ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Rota em Tempo Real
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {entregadorLocation ? 'Navegação GPS ativa' : 'Aguardando localização...'}
                    </p>
                  </div>
                </div>
                <Badge className={entregadorLocation ? "bg-green-500 text-white" : "bg-yellow-500 text-white"}>
                  {entregadorLocation ? 'Ao vivo' : 'Carregando'}
                </Badge>
              </div>
            </div>
            <div className="h-[400px] md:h-[500px]">
              <GoogleDeliveryMap
                entregadorLocation={entregadorLocation}
                storeLocation={
                  activeOrders[0]?.store_latitude && activeOrders[0]?.store_longitude
                    ? { lat: activeOrders[0].store_latitude, lng: activeOrders[0].store_longitude }
                    : null
                }
                customerLocation={customerLocation}
                order={activeOrders[0]}
                darkMode={darkMode}
                mode="entregador"
                onNavigate={(address) => {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
                }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Pause Timer */}
      {isPaused && pauseEndTime && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-2xl text-center"
          >
            <h3 className="text-xl font-bold mb-2">⏸️ Você está em pausa</h3>
            <p className="text-3xl font-bold mb-2">
              {Math.max(0, Math.ceil((pauseEndTime - new Date()) / 60000))} minutos restantes
            </p>
            <p className="text-sm opacity-90 mb-4">
              Você não receberá novos pedidos até o fim da pausa
            </p>
            <Button
              onClick={() => {
                setIsPaused(false);
                setPauseEndTime(null);
              }}
              variant="outline"
              className="bg-white text-orange-600 hover:bg-gray-100"
            >
              Retomar Agora
            </Button>
          </motion.div>
        </div>
      )}

      {/* Available Orders for Accepting */}
      {entregador.status === 'available' && !isPaused && !activeOrders.length && availableOrders && availableOrders.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Pedidos Disponíveis ({availableOrders.length})
            </h2>
            <Badge className="bg-green-500 text-white animate-pulse">
              Novos!
            </Badge>
          </div>
          <div className="space-y-4">
            {availableOrders.map((order) => (
              <div 
                key={order.id} 
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge className="bg-orange-500 text-white mb-2">
                      #{order.order_code}
                    </Badge>
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {order.customer_name}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {order.customer_phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(order.delivery_fee || 0)}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Taxa de entrega
                    </p>
                  </div>
                </div>
                <div className={`p-3 rounded-lg mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {order.address || 'Endereço não informado'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      // Buscar configuração da loja para pegar coordenadas
                      const stores = await listStores();
                      const store = stores[0];

                      await updateOrder(order.id, {
                        entregador_id: entregador.id,
                        delivery_status: ORDER_DELIVERY_STATUS.GOING_TO_STORE,
                        store_latitude: store?.store_latitude || -5.0892,
                        store_longitude: store?.store_longitude || -42.8019
                      });

                      if (!entregador._isVirtual) {
                        await updateEntregador(entregador.id, {
                          ...entregador,
                          status: 'busy',
                          current_order_id: order.id
                        });
                      }

                      queryClient.invalidateQueries({ queryKey: deliveryOrdersKey });
                      queryClient.invalidateQueries({ queryKey: allDeliveryOrdersKey });
                      queryClient.invalidateQueries({ queryKey: availableOrdersKey });
                      queryClient.invalidateQueries({ queryKey: entregadoresKey });
                      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
                      toast.success('Entrega aceita com sucesso');

                      if (audioRef.current) {
                        audioRef.current.play().catch(() => {});
                      }
                    } catch (e) {
                      toast.error('Erro ao aceitar entrega');
                    }
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 h-12"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Aceitar Entrega
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Deliveries */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Entregas Ativas ({activeOrders.length})
          </h2>
          {activeOrders.length > 1 && (
            <Button
              onClick={() => setShowRouteOptimizer(true)}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Otimizar Rota
            </Button>
          )}
        </div>
        
        {activeOrders.length === 0 ? (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-12 text-center`}>
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {entregador.status === 'available' ? 'Aguardando pedidos...' : 'Você está offline'}
            </p>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              {entregador.status === 'available' 
                ? 'Novos pedidos aparecerão aqui quando estiverem prontos para entrega'
                : 'Mude seu status para "Disponível" para receber pedidos'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, y: -2 }}
                className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} rounded-3xl p-4 md:p-6 shadow-2xl border-2`}
                >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-0 mb-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold px-2 md:px-3 py-1 shadow-lg text-xs">
                        #{order.order_code}
                      </Badge>
                      <Badge className={statusMeta[getOrderDeliveryStatus(order)]?.badge || 'bg-gray-500 text-white'}>
                        {statusMeta[getOrderDeliveryStatus(order)]?.label || 'Em andamento'}
                      </Badge>
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {getTimeSince(order.created_date)}
                      </span>
                    </div>
                    <h3 className={`font-bold text-lg md:text-xl ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                      {order.customer_name}
                    </h3>
                    <p className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-2`}>
                      <span>📱</span> {order.customer_phone}
                    </p>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className={`text-center sm:text-right ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} px-3 md:px-4 py-2 md:py-3 rounded-2xl border-2 ${darkMode ? 'border-green-700' : 'border-green-200'} w-full sm:w-auto`}
                  >
                    <p className={`text-[10px] md:text-xs ${darkMode ? 'text-green-400' : 'text-green-700'} font-semibold mb-1`}>
                      Taxa de Entrega
                    </p>
                    <p className="font-bold text-xl md:text-2xl text-green-600">
                      {formatCurrency(order.delivery_fee || 0)}
                    </p>
                  </motion.div>
                </div>

                {/* Progress Bar */}
                <div className="mb-5">
                  <DeliveryProgressBar status={getOrderDisplayStatus(order)} darkMode={darkMode} />
                </div>

                {/* Order Items Detail */}
                <div className="mb-5">
                  <OrderItemsDetail order={order} darkMode={darkMode} />
                </div>

                {/* Address */}
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className={`p-5 rounded-2xl mb-5 ${darkMode ? 'bg-gray-700/70 border-gray-600' : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'} border-2 shadow-inner`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-bold ${darkMode ? 'text-red-400' : 'text-red-700'} mb-1 uppercase tracking-wide`}>
                        Endereço de Entrega
                      </p>
                      <p className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                        {order.address}
                      </p>
                      {order.neighborhood && (
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          📍 {order.neighborhood}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* GPS Button */}
                  {(order.customer_latitude && order.customer_longitude) || order.address ? (
                    <Button
                      onClick={() => {
                        let url = '';
                        const address = order.address || '';
                        const lat = order.customer_latitude;
                        const lng = order.customer_longitude;
                        
                        // Tentar usar coordenadas primeiro
                        if (lat && lng) {
                          // Google Maps
                          url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                        } else if (address) {
                          // Usar endereço se não tiver coordenadas
                          url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
                        }
                        
                        if (url) {
                          // Abrir em nova aba
                          window.open(url, '_blank');
                        } else {
                          toast.error('Endereço não disponível para navegação');
                        }
                      }}
                      className={`w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold h-10`}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Ir até o Cliente (Google Maps)
                    </Button>
                  ) : null}
                </motion.div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => openWhatsApp(order.customer_phone, `Olá! Sou o entregador do seu pedido #${order.order_code}. Estou a caminho!`)}
                      variant="outline"
                      className={`w-full h-10 md:h-12 rounded-xl font-semibold text-xs ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-green-50 hover:border-green-300'}`}
                    >
                      <span className="mr-1">💬</span>
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => callPhone(order.customer_phone)}
                      variant="outline"
                      className={`w-full h-10 md:h-12 rounded-xl font-semibold text-xs ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-blue-50 hover:border-blue-300'}`}
                    >
                      <Phone className="w-3 md:w-4 h-3 md:h-4 mr-1" />
                      <span className="hidden sm:inline">Ligar</span>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() => setShowQuickReport(true)}
                      variant="outline"
                      className={`w-full h-10 md:h-12 rounded-xl font-semibold text-xs ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-orange-50 hover:border-orange-300'}`}
                    >
                      <AlertTriangle className="w-3 md:w-4 h-3 md:h-4 mr-1" />
                      <span className="hidden sm:inline">Reportar</span>
                    </Button>
                  </motion.div>
                </div>

                <div className={`mb-3 p-3 rounded-xl border ${darkMode ? 'bg-gray-800/70 border-gray-700 text-gray-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <p className="text-[11px] uppercase tracking-wide font-semibold opacity-80 mb-1">Proxima acao operacional</p>
                  <p className="text-sm font-semibold">{statusMeta[getOrderDeliveryStatus(order)]?.nextStep || 'Acompanhar progresso da entrega'}</p>
                </div>

                {/* Botões baseados no status */}
                {getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.GOING_TO_STORE ? (
                  // Indo ao restaurante - botão cheguei
                  <div className="space-y-3">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'} border-2 rounded-2xl p-4`}
                    >
                      <p className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-900'} mb-2 flex items-center gap-2`}>
                        <MapPin className="w-4 h-4" />
                        Indo ao Restaurante
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Clique em "Cheguei" quando você estiver no restaurante para solicitar o código de coleta.
                      </p>
                    </motion.div>
                    
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => openCancelModal(order, 'store')}
                          variant="outline"
                          className={`w-full h-10 md:h-12 rounded-xl font-semibold text-xs md:text-sm border-2 ${darkMode ? 'border-red-700 text-red-400 hover:bg-red-900/30' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                        >
                          <X className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
                          Cancelar
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => {
                            runStatusTransition({
                              order,
                              nextStatus: 'arrived_at_store',
                              payload: {
                                delivery_status: ORDER_DELIVERY_STATUS.ARRIVED_AT_STORE,
                              },
                              successMessage: 'Chegada ao restaurante confirmada',
                              errorMessage: 'Erro ao confirmar chegada ao restaurante'
                            });
                          }}
                          disabled={isStatusTransitionLoading(order.id, 'arrived_at_store')}
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-10 md:h-12 text-xs md:text-base font-bold rounded-xl shadow-lg shadow-blue-500/30"
                        >
                          <CheckCircle className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
                          {isStatusTransitionLoading(order.id, 'arrived_at_store') ? 'Confirmando...' : 'Cheguei ao Restaurante'}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                ) : getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.ARRIVED_AT_STORE ? (
                  // Chegou no restaurante - aguardando código
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-xs md:text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wide`}>
                        Código de Retirada do Restaurante
                      </label>
                      <Input
                        placeholder="Digite o código do restaurante"
                        value={pickupCodeInput[order.id] || ''}
                        onChange={(e) => setPickupCodeInput(prev => ({
                          ...prev,
                          [order.id]: e.target.value
                        }))}
                        maxLength={4}
                        className={`text-center text-2xl md:text-3xl font-bold tracking-[0.3em] md:tracking-[0.5em] h-14 md:h-16 rounded-2xl ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-gradient-to-r from-gray-50 to-white border-2 border-gray-300 text-gray-900'
                        } focus:ring-4 focus:ring-blue-500/30`}
                      />
                      <p className={`text-[10px] md:text-xs mt-2 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} font-medium`}>
                        O restaurante fornecerá este código para liberar o pedido
                      </p>
                    </div>
                    
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => {
                          const inputCode = pickupCodeInput[order.id] || '';

                          if (!inputCode) {
                            toast.error('Digite o código fornecido pelo restaurante');
                            return;
                          }

                          if (inputCode !== order.pickup_code) {
                            toast.error('Código inválido! Verifique com o restaurante.');
                            return;
                          }

                          runStatusTransition({
                            order,
                            nextStatus: 'picked_up',
                            payload: {
                              delivery_status: ORDER_DELIVERY_STATUS.PICKED_UP,
                              picked_up_at: new Date().toISOString()
                            },
                            successMessage: 'Coleta confirmada',
                            errorMessage: 'Erro ao confirmar coleta',
                            onSuccess: () => {
                              setPickupCodeInput(prev => {
                                const newState = { ...prev };
                                delete newState[order.id];
                                return newState;
                              });
                            }
                          });
                        }}
                        disabled={!pickupCodeInput[order.id] || pickupCodeInput[order.id].length !== 4 || isStatusTransitionLoading(order.id, 'picked_up')}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-10 md:h-12 text-xs md:text-base font-bold rounded-xl shadow-lg shadow-green-500/30"
                      >
                        <Package className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
                        {isStatusTransitionLoading(order.id, 'picked_up') ? 'Confirmando...' : 'Confirmar Coleta'}
                      </Button>
                    </motion.div>
                  </div>
                ) : getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.PICKED_UP ? (
                  // Coletou o pedido - agora pode sair para entrega
                  <div className="space-y-3">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`${darkMode ? 'bg-green-900/30 border-green-700' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'} border-2 rounded-2xl p-4`}
                    >
                      <p className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-900'} mb-2 flex items-center gap-2`}>
                        <CheckCircle className="w-4 h-4" />
                        Pedido Coletado com Sucesso!
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Clique em "Sair para Entrega" quando estiver pronto para ir até o cliente.
                      </p>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => {
                          runStatusTransition({
                            order,
                            nextStatus: 'out_for_delivery',
                            payload: {
                              delivery_status: ORDER_DELIVERY_STATUS.OUT_FOR_DELIVERY,
                            },
                            successMessage: 'Entrega iniciada',
                            errorMessage: 'Erro ao iniciar entrega'
                          });
                        }}
                        disabled={isStatusTransitionLoading(order.id, 'out_for_delivery')}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 md:h-14 text-base font-bold rounded-xl shadow-lg shadow-blue-500/30"
                      >
                        <Navigation className="w-5 h-5 mr-2" />
                        {isStatusTransitionLoading(order.id, 'out_for_delivery') ? 'Iniciando...' : 'Sair para Entrega'}
                      </Button>
                    </motion.div>
                  </div>
                ) : getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.OUT_FOR_DELIVERY ? (
                  // Indo ao cliente - botão cheguei
                  <div className="space-y-3">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'} border-2 rounded-2xl p-4`}
                    >
                      <p className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-900'} mb-2 flex items-center gap-2`}>
                        <Navigation className="w-4 h-4" />
                        A Caminho do Cliente
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Clique em "Cheguei" quando estiver no local de entrega para solicitar o código do cliente.
                      </p>
                    </motion.div>
                    
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => openCancelModal(order, 'route')}
                          variant="outline"
                          className={`w-full h-10 md:h-12 rounded-xl font-semibold text-xs md:text-sm border-2 ${darkMode ? 'border-red-700 text-red-400 hover:bg-red-900/30' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                        >
                          <X className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
                          Cancelar
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => {
                            runStatusTransition({
                              order,
                              nextStatus: 'arrived_at_customer',
                              payload: {
                                delivery_status: ORDER_DELIVERY_STATUS.ARRIVED_AT_CUSTOMER,
                              },
                              successMessage: 'Chegada ao cliente confirmada',
                              errorMessage: 'Erro ao confirmar chegada ao cliente'
                            });
                          }}
                          disabled={isStatusTransitionLoading(order.id, 'arrived_at_customer')}
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-10 md:h-12 text-xs md:text-base font-bold rounded-xl shadow-lg shadow-blue-500/30"
                        >
                          <CheckCircle className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
                          {isStatusTransitionLoading(order.id, 'arrived_at_customer') ? 'Confirmando...' : 'Cheguei no Local'}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                ) : getOrderDeliveryStatus(order) === ORDER_DELIVERY_STATUS.ARRIVED_AT_CUSTOMER ? (
                  // Chegou no cliente - validação de código
                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className={`block text-xs md:text-sm font-bold mb-2 md:mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'} uppercase tracking-wide`}>
                        Código de Validação do Cliente
                      </label>
                      <motion.div whileFocus={{ scale: 1.02 }}>
                        <Input
                          placeholder="Digite os 4 dígitos"
                          value={deliveryCodeInput[order.id] || ''}
                          onChange={(e) => setDeliveryCodeInput(prev => ({
                            ...prev,
                            [order.id]: e.target.value
                          }))}
                          maxLength={4}
                          className={`text-center text-2xl md:text-3xl font-bold tracking-[0.3em] md:tracking-[0.5em] h-14 md:h-16 rounded-2xl ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-gradient-to-r from-gray-50 to-white border-2 border-gray-300 text-gray-900'
                          } focus:ring-4 focus:ring-blue-500/30`}
                        />
                      </motion.div>
                      <p className={`text-[10px] md:text-xs mt-2 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} font-medium px-2`}>
                        O cliente irá fornecer este código ao receber o pedido
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => openCancelModal(order, 'customer')}
                          variant="outline"
                          className={`w-full h-10 md:h-12 rounded-xl font-semibold text-xs md:text-sm border-2 ${darkMode ? 'border-red-700 text-red-400 hover:bg-red-900/30' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                        >
                          <X className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
                          Cancelar
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => handleConfirmDelivery(order)}
                          disabled={!deliveryCodeInput[order.id] || deliveryCodeInput[order.id].length !== 4}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-10 md:h-14 text-xs md:text-base font-bold rounded-xl shadow-lg shadow-green-500/30"
                        >
                          <CheckCircle className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
                          <span className="hidden sm:inline">Confirmar Entrega</span>
                          <span className="sm:hidden">Confirmar</span>
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Deliveries */}
      {completedOrders.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Entregas Concluídas Hoje ({completedOrders.length})
          </h2>
          <div className="space-y-3">
            {completedOrders.slice(0, 5).map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01, x: 4 }}
                className={`${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-r from-white to-gray-50 border-gray-200'} rounded-2xl p-5 flex items-center justify-between border-2 shadow-md`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                      #{order.order_code} - {order.customer_name}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-2`}>
                      <Clock className="w-3 h-3" />
                      {new Date(order.delivered_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} border-2 ${darkMode ? 'border-green-700' : 'border-green-200'}`}>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(order.delivery_fee || 0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showProofModal && (
        <DeliveryProofModal
          order={showProofModal}
          entregador={entregador}
          onClose={() => setShowProofModal(null)}
          onConfirm={handleProofSubmitted}
          darkMode={darkMode}
          entityOpts={entityOpts}
        />
      )}

      {showRatingModal && (
        <RatingModal
          order={showRatingModal}
          entregador={entregador}
          onClose={() => setShowRatingModal(null)}
          darkMode={darkMode}
          entityOpts={entityOpts}
        />
      )}

      {showTutorial && (
        <TutorialModal
          onClose={handleTutorialClose}
          darkMode={darkMode}
        />
      )}

      {showProfile && user && (
        <ColaboradorProfile
          user={user}
          profileRole="entregador"
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => {
            setUser(updatedUser);
            if (entregador) {
              setEntregador({ ...entregador, ...updatedUser });
            }
            queryClient.invalidateQueries({ queryKey: entregadoresKey });
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          entregador={entregador}
          onClose={() => setShowSettings(false)}
          onDarkModeChange={setDarkMode}
          entityOpts={entityOpts}
        />
      )}

      {/* Earnings Modal */}
      {showEarnings && entregador?.id && (
        <EarningsView
          entregadorId={entregador.id}
          darkMode={darkMode}
          isOpen={showEarnings}
          onClose={() => setShowEarnings(false)}
        />
      )}

      {/* Critical Notifications - New Orders */}
      {criticalNotifications.orders.pendingOrders.length > 0 && (
        <OrderAlertModal
          order={criticalNotifications.orders.pendingOrders[0]}
          onAccept={(orderId) => criticalNotifications.orders.acceptOrder(orderId, entregador.id)}
          onReject={criticalNotifications.orders.rejectOrder}
        />
      )}



      {/* Route Optimizer */}
      {showRouteOptimizer && (
        <RouteOptimizer
          isOpen={showRouteOptimizer}
          onClose={() => setShowRouteOptimizer(false)}
          orders={activeOrders}
          currentLocation={entregadorLocation}
          darkMode={darkMode}
        />
      )}

      {/* Pause Modal */}
      <PauseModal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onPause={handlePause}
        darkMode={darkMode}
      />

      {/* Quick Report Modal */}
      <QuickReportModal
        isOpen={showQuickReport}
        onClose={() => setShowQuickReport(false)}
        order={activeOrders[0]}
        entregador={entregador}
        darkMode={darkMode}
        entityOpts={entityOpts}
      />

      <Dialog
        open={cancelModal.open}
        onOpenChange={(open) => {
          if (!open && !cancelSubmitting) {
            closeCancelModal();
          }
        }}
      >
        <DialogContent className={darkMode ? 'bg-gray-900 border-gray-700 text-white' : ''}>
          <DialogHeader>
            <DialogTitle>Cancelar entrega</DialogTitle>
            <DialogDescription className={darkMode ? 'text-gray-300' : ''}>
              Informe o motivo do cancelamento. Isso será registrado no pedido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {(cancelReasonSuggestions[cancelModal.stage] || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(cancelReasonSuggestions[cancelModal.stage] || []).map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={cancelSubmitting}
                    onClick={() => setCancelModal((prev) => ({ ...prev, reason }))}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            )}

            <Textarea
              value={cancelModal.reason}
              onChange={(event) => setCancelModal((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Descreva o motivo do cancelamento"
              rows={4}
              disabled={cancelSubmitting}
              className={darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-400' : ''}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCancelModal} disabled={cancelSubmitting}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={confirmCancelOrder} disabled={cancelSubmitting}>
              {cancelSubmitting ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ErrorBoundary>
  );
}

