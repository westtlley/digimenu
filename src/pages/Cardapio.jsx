import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { SYSTEM_LOGO_URL, SYSTEM_NAME } from '@/config/branding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Search, Clock, Star, Share2, MapPin, Info, Home, Receipt, Gift, User, MessageSquare, UtensilsCrossed, Instagram, Facebook, Phone, Package, Music2, Calendar, Heart, LayoutGrid, Droplets, Sparkles, Flame, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Components
import NewDishModal from '../components/menu/NewDishModal';
import BeverageCard from '../components/menu/BeverageCard';
import BeverageModal from '../components/menu/BeverageModal';
import PizzaBuilderV2 from '../components/pizza/PizzaBuilderV2';
import CartModal from '../components/menu/CartModal';
import CheckoutView from '../components/menu/CheckoutView';
import OrderConfirmationModal from '../components/menu/OrderConfirmationModal';
import OrderHistoryModal from '../components/menu/OrderHistoryModal';
import UpsellModal from '../components/menu/UpsellModal';
import DishSkeleton from '../components/menu/DishSkeleton';
import DishCardWow from '../components/menu/DishCardWow';
import MenuLayoutWrapper from '../components/menu/MenuLayoutWrapper';
import PromotionBanner from '../components/menu/PromotionBanner';
import RecentOrders from '../components/menu/RecentOrders';
import UserAuthButton from '../components/atoms/UserAuthButton';
import CustomerProfileModal from '../components/customer/CustomerProfileModal';
import StoreClosedOverlay from '../components/menu/StoreClosedOverlay';
import ThemeToggle from '../components/ui/ThemeToggle';
import QuickSignupModal from '../components/menu/QuickSignupModal';
import InstallAppButton from '../components/InstallAppButton';
import WelcomeDiscountModal from '../components/menu/WelcomeDiscountModal';
import SmartUpsell from '../components/menu/SmartUpsell';
import LoyaltyDashboard from '../components/menu/LoyaltyDashboard';
import LoyaltyPointsDisplay from '../components/menu/LoyaltyPointsDisplay';
import AIChatbot from '../components/menu/AIChatbot';
import FavoritesList from '../components/menu/FavoritesList';
import ReferralCodeModal from '../components/menu/ReferralCodeModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useWebSocket } from '@/hooks/useWebSocket';
import ComboBuilderModal from '../components/menu/ComboBuilderModal';

// Hooks
import { useCart } from '@/components/hooks/useCart';
import { useStoreStatus } from '@/components/hooks/useStoreStatus';
import { useUpsell } from '@/components/hooks/useUpsell';
import { useCoupons } from '@/components/hooks/useCoupons';
import { useCustomer } from '@/components/hooks/useCustomer';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import { useAdaptedTheme } from '@/hooks/useAdaptedTheme';
import { useFavoritePromotions } from '@/hooks/useFavoritePromotions';

// Services & Utils
import { orderService } from '@/components/services/orderService';
import { whatsappService } from '@/components/services/whatsappService';
import { stockUtils } from '@/components/utils/stockUtils';
import { formatCurrency } from '@/utils/formatters';
import { COMMERCIAL_EVENTS, getCommercialSignalsForSlug, trackCommercialEvent, trackCommercialEventOnce } from '@/utils/commercialAnalytics';

/** Landing quando não há slug: / ou /cardapio — não exibe cardápio de nenhum estabelecimento. */
function CardapioSemLink() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md p-8 rounded-2xl bg-card text-card-foreground shadow-xl border border-border">
        <img src={SYSTEM_LOGO_URL} alt={SYSTEM_NAME} className="h-16 w-auto mx-auto mb-4 drop-shadow-md" />
        <h1 className="text-xl font-bold text-foreground">{SYSTEM_NAME}</h1>
        <p className="mt-3 text-muted-foreground">
          O cardápio digital é acessado pelo link do estabelecimento: <strong>/s/nome-do-restaurante</strong>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ex.: /s/raiz-maranhense
        </p>
        <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
          <strong>Master:</strong> abra o cardápio em <strong>Admin → Assinantes</strong> e use <strong>⋮ → Abrir cardápio</strong> no assinante desejado. <strong>Assinante:</strong> use o link do seu painel ou Loja.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/assinar" className="px-4 py-2.5 rounded-lg bg-orange-500 text-primary-foreground font-medium hover:bg-orange-600 transition-colors">
            Assinar {SYSTEM_NAME}
          </Link>
          <Link to="/" className="px-4 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors">
            Voltar ao início
          </Link>
        </div>
        <a href="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-orange-500">Voltar ao início</a>
      </div>
    </div>
  );
}

function MiniDishCard({ item, onClick, formatCurrency: formatPrice }) {
  return (
    <div
      className={`flex flex-col items-center w-28 flex-shrink-0 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="w-28 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
        {item?.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
        )}
      </div>
      <p className="text-xs font-medium text-foreground mt-1 text-center line-clamp-2 w-full">{item?.name}</p>
      {(item?.price_label || item?.price !== undefined) && (
        <div className="mt-1 text-center w-full">
          {item?.price_label && (
            <p className="text-[10px] font-medium text-muted-foreground">{item.price_label}</p>
          )}
          {item?.price !== undefined && (
            <p className="text-[11px] font-semibold text-foreground">
              {formatPrice ? formatPrice(Number(item.price || 0)) : item.price}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Cardapio() {
  const { slug } = useParams(); // link do assinante: /s/meu-restaurante
  const navigate = useNavigate();

  // Marcar este estabelecimento como "página de origem" do cliente (para / redirecionar sempre ao cardápio ou login dele)
  useEffect(() => {
    if (slug && typeof localStorage !== 'undefined') {
      localStorage.setItem('lastVisitedSlug', slug);
    }
  }, [slug]);

  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedBeverage, setSelectedBeverage] = useState(null);
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCartModal, setShowCartModal] = useState(false);
  const [currentView, setCurrentView] = useState('menu');
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showQuickSignup, setShowQuickSignup] = useState(false);
  const [showWelcomeDiscount, setShowWelcomeDiscount] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userProfilePicture, setUserProfilePicture] = useState(null);
  const [showSplash, setShowSplash] = useState(false);
  const [showFavoritesList, setShowFavoritesList] = useState(false);
  const [showReferralCode, setShowReferralCode] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showRecentOrdersPanel, setShowRecentOrdersPanel] = useState(true);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const bodyScrollLockRef = React.useRef(null);
  const cartSuggestionAcceptedRef = React.useRef(false);
  const checkoutSuggestionAcceptedRef = React.useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktopViewport(!!mq.matches);
    onChange();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobileViewport(!!mq.matches);
    onChange();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup defensivo para evitar toasts órfãos ao trocar de rota.
      toast.dismiss();
    };
  }, []);

  const pushMobileOverlayState = React.useCallback((overlayKey) => {
    if (!isMobileViewport || typeof window === 'undefined') return;
    const currentState = window.history.state || {};
    if (currentState.__dmMobileOverlay === overlayKey) return;
    const nextState = { ...currentState, __dmMobileOverlay: overlayKey };
    if (currentState.__dmMobileOverlay) {
      window.history.replaceState(nextState, '');
      return;
    }
    window.history.pushState(nextState, '');
  }, [isMobileViewport]);

  const closeMobileOverlay = React.useCallback((closeFn) => {
    closeFn();
    if (!isMobileViewport || typeof window === 'undefined') return;
    if (window.history.state?.__dmMobileOverlay) {
      window.history.back();
    }
  }, [isMobileViewport]);

  const openCartModal = React.useCallback(() => {
    if (isMobileViewport) {
      setShowOrderHistory(false);
      setSelectedDish(null);
      setSelectedBeverage(null);
      setSelectedPizza(null);
      setChatOpen(false);
    }
    setShowCartModal(true);
    pushMobileOverlayState('cart');
  }, [isMobileViewport, pushMobileOverlayState]);

  const closeCartModal = React.useCallback(() => {
    closeMobileOverlay(() => setShowCartModal(false));
  }, [closeMobileOverlay]);

  const openOrderHistoryModal = React.useCallback(() => {
    if (isMobileViewport) {
      setShowCartModal(false);
      setSelectedDish(null);
      setSelectedBeverage(null);
      setSelectedPizza(null);
      setChatOpen(false);
    }
    setShowOrderHistory(true);
    pushMobileOverlayState('orders');
  }, [isMobileViewport, pushMobileOverlayState]);

  const closeOrderHistoryModal = React.useCallback(() => {
    closeMobileOverlay(() => setShowOrderHistory(false));
  }, [closeMobileOverlay]);

  const openDishDetails = React.useCallback((dish) => {
    if (isMobileViewport) {
      setShowCartModal(false);
      setShowOrderHistory(false);
      setSelectedBeverage(null);
      setSelectedPizza(null);
      setChatOpen(false);
    }
    setSelectedDish(dish);
    pushMobileOverlayState('dish');
  }, [isMobileViewport, pushMobileOverlayState]);

  const closeDishDetails = React.useCallback(() => {
    closeMobileOverlay(() => {
      setSelectedDish(null);
      setEditingCartItem(null);
    });
  }, [closeMobileOverlay]);

  const openBeverageDetails = React.useCallback((dish) => {
    if (isMobileViewport) {
      setShowCartModal(false);
      setShowOrderHistory(false);
      setSelectedDish(null);
      setSelectedPizza(null);
      setChatOpen(false);
    }
    setSelectedBeverage(dish);
    pushMobileOverlayState('beverage');
  }, [isMobileViewport, pushMobileOverlayState]);

  const closeBeverageDetails = React.useCallback(() => {
    closeMobileOverlay(() => {
      setSelectedBeverage(null);
      setEditingCartItem(null);
    });
  }, [closeMobileOverlay]);

  const openPizzaBuilder = React.useCallback((dish) => {
    if (isMobileViewport) {
      setShowCartModal(false);
      setShowOrderHistory(false);
      setSelectedDish(null);
      setSelectedBeverage(null);
      setChatOpen(false);
    }
    setSelectedPizza(dish);
    pushMobileOverlayState('pizza');
  }, [isMobileViewport, pushMobileOverlayState]);

  const closePizzaBuilder = React.useCallback(() => {
    closeMobileOverlay(() => {
      setSelectedPizza(null);
      setEditingCartItem(null);
    });
  }, [closeMobileOverlay]);

  const handleChatOpenChange = React.useCallback((nextOpen) => {
    if (nextOpen) {
      if (isMobileViewport) {
        setShowCartModal(false);
        setShowOrderHistory(false);
        setSelectedDish(null);
        setSelectedBeverage(null);
        setSelectedPizza(null);
      }
      setChatOpen(true);
      pushMobileOverlayState('chat');
      return;
    }
    closeMobileOverlay(() => setChatOpen(false));
  }, [closeMobileOverlay, isMobileViewport, pushMobileOverlayState]);

  const unlockBodyScroll = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    const lockState = bodyScrollLockRef.current;
    if (!lockState) return;

    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = lockState.prevHtmlOverflow;
    body.style.overflow = lockState.prevBodyOverflow;
    body.style.position = lockState.prevBodyPosition;
    body.style.top = lockState.prevBodyTop;
    body.style.left = lockState.prevBodyLeft;
    body.style.right = lockState.prevBodyRight;
    body.style.width = lockState.prevBodyWidth;
    window.scrollTo(0, lockState.scrollY);
    bodyScrollLockRef.current = null;
  }, []);

  useEffect(() => {
    if (!isMobileViewport || typeof window === 'undefined') return;

    const onPopState = () => {
      setShowCartModal(false);
      setShowOrderHistory(false);
      setSelectedDish(null);
      setSelectedBeverage(null);
      setSelectedPizza(null);
      setChatOpen(false);
      setEditingCartItem(null);
      setShowFloatingMenu(false);
      unlockBodyScroll();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isMobileViewport, unlockBodyScroll]);

  const isMobileFullscreenOverlayOpen = isMobileViewport && (
    showCartModal ||
    showOrderHistory ||
    !!selectedDish ||
    !!selectedBeverage ||
    !!selectedPizza ||
    chatOpen
  );

  useEffect(() => {
    if (!isMobileViewport || typeof document === 'undefined') {
      unlockBodyScroll();
      return;
    }

    if (!isMobileFullscreenOverlayOpen) {
      unlockBodyScroll();
      return;
    }

    if (bodyScrollLockRef.current) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY || 0;

    bodyScrollLockRef.current = {
      prevHtmlOverflow: html.style.overflow,
      prevBodyOverflow: body.style.overflow,
      prevBodyPosition: body.style.position,
      prevBodyTop: body.style.top,
      prevBodyLeft: body.style.left,
      prevBodyRight: body.style.right,
      prevBodyWidth: body.style.width,
      scrollY
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  }, [isMobileFullscreenOverlayOpen, isMobileViewport, unlockBodyScroll]);

  useEffect(() => {
    return () => {
      unlockBodyScroll();
    };
  }, [unlockBodyScroll]);

  const queryClient = useQueryClient();

  // Custom Hooks
  const { cart, addItem, updateItem, removeItem, updateQuantity, clearCart, cartTotal, cartItemsCount, hydrateCart } = useCart(slug, { autoLoad: false });
  const safeHydrateCart = React.useCallback((items) => {
    if (typeof hydrateCart === 'function') hydrateCart(items);
  }, [hydrateCart]);
  const { customer, setCustomer, clearCustomer } = useCustomer();

  // Hook de fidelidade
  const { 
    addPoints, 
    getDiscount: getLoyaltyDiscount, 
    loyaltyData,
    generateReferralCode,
    applyReferralCode,
    checkBirthdayBonus,
    applyReviewBonus,
    checkConsecutiveOrdersBonus
  } = useLoyalty(
    customer.phone?.replace(/\D/g, ''),
    userEmail,
    slug
  );

  // WebSocket para notificações em tempo real
  useWebSocket({
    customerEmail: userEmail,
    customerPhone: customer.phone?.replace(/\D/g, ''),
    enableNotifications: true,
    onOrderUpdate: (order) => {
      // Atualizar cache do React Query
      queryClient.setQueryData(['customerOrders', userEmail], (old) => {
        if (!old) return [order];
        const index = old.findIndex(o => o.id === order.id);
        if (index >= 0) {
          const updated = [...old];
          updated[index] = order;
          return updated;
        }
        return [...old, order];
      });
    }
  });

  // Estado para timeout de carregamento
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const [desktopHighlightIndex, setDesktopHighlightIndex] = useState(0);
  const [desktopBannerIndex, setDesktopBannerIndex] = useState(0);
  const [comboBannerIndex, setComboBannerIndex] = useState(0);

  // Cardápio público por link (sem login) — /s/:slug
  const { data: publicData, isLoading: publicLoading, isError: publicError, error: publicErrorDetails } = useQuery({
    queryKey: ['publicCardapio', slug],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      try {
        const result = await base44.get(`/public/cardapio/${slug}`, {}, { signal: controller.signal });
        clearTimeout(timeoutId);
        console.log('✅ [Cardapio] Dados recebidos:', result);
        
        setLoadingTimeout(false);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
          const err = new Error('O servidor demorou para responder. Tente novamente.');
          err.isTimeout = true;
          throw err;
        }
        console.error('❌ [Cardapio] Erro ao buscar cardápio público:', error);
        setLoadingTimeout(true);
        throw error;
      }
    },
    enabled: !!slug,
    retry: 2,
    retryDelay: 1500,
    staleTime: 90 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Timeout de carregamento (3s) — mostra "Tentar novamente" cedo se a rede/backend estiver lento
  useEffect(() => {
    if (slug && publicLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
        console.warn('⚠️ [Cardapio] Timeout de carregamento atingido');
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [slug, publicLoading]);

  useEffect(() => {
    if (!slug) return;
    try {
      const key = `cardapio_show_recent_orders_${slug}`;
      const v = localStorage.getItem(key);
      if (v === '0') setShowRecentOrdersPanel(false);
    } catch {
      // ignore
    }
  }, [slug]);

  const handleCloseRecentOrdersPanel = () => {
    setShowRecentOrdersPanel(false);
    if (!slug) return;
    try {
      const key = `cardapio_show_recent_orders_${slug}`;
      localStorage.setItem(key, '0');
    } catch {
      // ignore
    }
  };

  // Dados do cardápio: só via /public/cardapio/:slug. Não carregar entidades do master em / ou /cardapio.
  const { data: dishes = [], isLoading: dishesLoading } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => base44.entities.Dish.list('order'),
    enabled: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    initialData: [],
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('order'),
    enabled: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: complementGroups = [] } = useQuery({
    queryKey: ['complementGroups'],
    queryFn: () => base44.entities.ComplementGroup.list('order'),
    enabled: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
  });

  const { data: pizzaSizes = [] } = useQuery({
    queryKey: ['pizzaSizes'],
    queryFn: () => base44.entities.PizzaSize.list('order'),
    enabled: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: pizzaFlavors = [] } = useQuery({
    queryKey: ['pizzaFlavors'],
    queryFn: () => base44.entities.PizzaFlavor.list('order'),
    enabled: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  });

  const { data: pizzaEdges = [] } = useQuery({
    queryKey: ['pizzaEdges'],
    queryFn: () => base44.entities.PizzaEdge.list('order'),
    enabled: false
  });

  const { data: pizzaExtras = [] } = useQuery({
    queryKey: ['pizzaExtras'],
    queryFn: () => base44.entities.PizzaExtra.list('order'),
    enabled: false
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
    enabled: false
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => base44.entities.Coupon.list(),
    enabled: false
  });

  const { data: deliveryZones = [] } = useQuery({
    queryKey: ['deliveryZones'],
    queryFn: () => base44.entities.DeliveryZone.list(),
    enabled: false
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list(),
    enabled: false
  });

  // Quando /s/:slug: usar dados da API pública; senão usar das queries
  const _pub = slug && publicData ? publicData : null;
  const _rawStore = _pub?.store || stores?.[0] || null;
  // Garantir nome sempre definido para não travar em "Carregando..." (ex.: loja antiga com logo mas name vazio)
  const store = _rawStore ? { ..._rawStore, name: _rawStore.name || 'Loja', loyaltyConfigs: _pub?.loyaltyConfigs } : null;
  const loyaltyConfigsResolved = _pub?.loyaltyConfigs ?? [];

  const dishesResolved = _pub?.dishes ?? dishes ?? [];
  const categoriesResolved = _pub?.categories ?? categories ?? [];
  const complementGroupsResolved = _pub?.complementGroups ?? complementGroups ?? [];
  const pizzaSizesResolved = _pub?.pizzaSizes ?? pizzaSizes ?? [];
  const pizzaFlavorsResolved = _pub?.pizzaFlavors ?? pizzaFlavors ?? [];
  const pizzaEdgesResolved = _pub?.pizzaEdges ?? pizzaEdges ?? [];
  const pizzaExtrasResolved = _pub?.pizzaExtras ?? pizzaExtras ?? [];
  const pizzaCategoriesResolved = _pub?.pizzaCategories ?? [];
  const beverageCategoriesResolved = _pub?.beverageCategories ?? [];
  const deliveryZonesResolved = _pub?.deliveryZones ?? deliveryZones ?? [];
  const couponsResolved = _pub?.coupons ?? coupons ?? [];
  const promotionsResolved = _pub?.promotions ?? promotions ?? [];
  const combosResolved = _pub?.combos ?? [];
  const loadingDishes = slug ? publicLoading : dishesLoading;

  const categoriesResolvedForAllIslands = useMemo(() => {
    const input = Array.isArray(categoriesResolved) ? categoriesResolved : [];
    const seenIds = new Set();
    const seenNames = new Set();

    return input.filter((cat) => {
      if (!cat) return false;

      const idKey = cat?.id != null ? String(cat.id) : null;
      if (idKey && seenIds.has(idKey)) return false;

      const nameKey = (cat?.name || '')
        .toString()
        .trim()
        .toLowerCase();
      if (nameKey && seenNames.has(nameKey)) return false;

      if (idKey) seenIds.add(idKey);
      if (nameKey) seenNames.add(nameKey);
      return true;
    });
  }, [categoriesResolved]);

  // ✅ CORREÇÃO: Todos os hooks devem ser chamados ANTES de qualquer return condicional
  useDocumentHead(store);

  // Detectar promoções em pratos favoritos (após dishesResolved estar definido)
  useFavoritePromotions(
    dishesResolved,
    userEmail,
    customer.phone?.replace(/\D/g, ''),
    slug
  );

  const createOrderMutation = useMutation({
    mutationFn: (data) => {
      // Garantir que owner_email e as_subscriber estão presentes
      const orderData = { ...data };
      if (slug) {
        return base44.post('/public/pedido-cardapio', {
          ...orderData,
          slug
        });
      }

      if (publicData?.subscriber_email) {
        orderData.as_subscriber = publicData.subscriber_email;
        // owner_email já está sendo setado na linha 798 do handleSubmitOrder
      }

      console.log('📦 Criando pedido com dados:', {
        owner_email: orderData.owner_email,
        as_subscriber: orderData.as_subscriber,
        customer_email: orderData.customer_email
      });
      return base44.entities.Order.create(orderData);
    },
    onSuccess: (order) => {
      console.log('✅ Pedido criado com sucesso:', order);
    },
    onError: (error) => {
      console.error('❌ Erro ao criar pedido:', error);
      toast.error('Erro ao enviar pedido: ' + (error.message || 'Erro desconhecido'));
    }
  });

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data)
  });

  // Adaptar cores do tema para modo escuro
  const adaptedTheme = useAdaptedTheme(store);
  
  const primaryColor = adaptedTheme.primary;
  const textPrimaryColor = adaptedTheme.textPrimary;
  const textSecondaryColor = adaptedTheme.textSecondary;
  const headerBg = store?.theme_header_bg || '#ffffff';
  const headerText = store?.theme_header_text || '#000000';
  const autoplayIntervalMs = Number(store?.menu_autoplay_interval_ms) > 0 ? Number(store?.menu_autoplay_interval_ms) : 4500;
  const menuLayoutMobile = store?.menu_layout_mobile || store?.menu_layout || 'grid';
  const menuLayoutDesktop = store?.menu_layout_desktop || store?.menu_layout || 'grid';
  const menuCardStyle = store?.theme_menu_card_style || 'solid';
  const menuLayout = isDesktopViewport ? menuLayoutDesktop : menuLayoutMobile; // grid, list, carousel, magazine, masonry
  const gridColsDesktop = store?.menu_grid_cols_desktop;
  const desktopCarouselMode = isDesktopViewport && menuLayout === 'carousel';

  // Store Status
  const { isStoreUnavailable, isStoreClosed, isStorePaused, isAutoModeClosed, getNextOpenTime, getStatusDisplay } = useStoreStatus(store || {});
  const isStoreOpen = !isStoreUnavailable && !isStoreClosed && !isStorePaused;

  // Coupons
  const { couponCode, setCouponCode, appliedCoupon, couponError, validateAndApply, removeCoupon, calculateDiscount } = useCoupons(couponsResolved, cartTotal, slug);

  // Upsell
  const { showUpsellModal, upsellPromotions, checkUpsell, resetUpsell, closeUpsell } = useUpsell(promotionsResolved, cartTotal);

  // Memoized calculations
  const activeDishes = useMemo(() => {
    const safeDishes = Array.isArray(dishesResolved) ? dishesResolved : [];
    return safeDishes.filter((d) => {
      if (d.product_type === 'beverage') return false;
      if (d.is_active === false) return false;
      if (!d.name || d.name.trim() === '') return false;
      if (d.product_type === 'pizza') {
        if (pizzaSizesResolved.length === 0 || pizzaFlavorsResolved.length === 0) return false;
      } else if (d.price === null || d.price === undefined) return false;
      return true;
    });
  }, [dishesResolved, pizzaSizesResolved, pizzaFlavorsResolved]);

  const activeBeverages = useMemo(() => {
    const safeDishes = Array.isArray(dishesResolved) ? dishesResolved : [];
    return safeDishes.filter((d) => {
      if (d.product_type !== 'beverage') return false;
      if (d.is_active === false) return false;
      if (!d.name || d.name.trim() === '') return false;
      if (d.price === null || d.price === undefined) return false;
      return true;
    });
  }, [dishesResolved]);

  const genericPizzaEntries = useMemo(() => {
    const safePizzaCategories = Array.isArray(pizzaCategoriesResolved)
      ? pizzaCategoriesResolved.filter((category) => category?.is_active !== false)
      : [];
    const safePizzaSizes = Array.isArray(pizzaSizesResolved)
      ? pizzaSizesResolved.filter((size) => size?.is_active !== false)
      : [];
    const safePizzaEdges = Array.isArray(pizzaEdgesResolved)
      ? pizzaEdgesResolved.filter((edge) => edge?.is_active !== false)
      : [];
    const safePizzaExtras = Array.isArray(pizzaExtrasResolved)
      ? pizzaExtrasResolved.filter((extra) => extra?.is_active !== false)
      : [];
    const safePizzaFlavors = Array.isArray(pizzaFlavorsResolved)
      ? pizzaFlavorsResolved.filter((flavor) => flavor?.is_active !== false)
      : [];
    const pizzaDishes = (Array.isArray(activeDishes) ? activeDishes : []).filter(
      (dish) => dish?.product_type === 'pizza'
    );

    return safePizzaCategories.map((pizzaCategory) => {
      const categoryId = String(pizzaCategory?.id || '');
      const relatedDishes = pizzaDishes.filter(
        (dish) => String(dish?.pizza_category_id || '') === categoryId
      );

      if (relatedDishes.length === 0) return null;

      const representative =
        relatedDishes.find((dish) => dish?.image) ||
        relatedDishes.find((dish) => dish?.is_highlight) ||
        relatedDishes[0];

      const linkedSize = safePizzaSizes.find(
        (size) => String(size?.id || '') === String(pizzaCategory?.size_id || '')
      );

      const categorySizeConfigs = relatedDishes
        .flatMap((dish) => Array.isArray(dish?.pizza_config?.sizes) ? dish.pizza_config.sizes : [])
        .filter((size) => String(size?.id || '') === String(pizzaCategory?.size_id || ''));

      const mergedSizeConfig = categorySizeConfigs.find((size) => Number(size?.price_tradicional || 0) > 0)
        || categorySizeConfigs[0]
        || linkedSize
        || null;

      const mergedFlavorIds = [...new Set(
        relatedDishes.flatMap((dish) => Array.isArray(dish?.pizza_config?.flavor_ids) ? dish.pizza_config.flavor_ids : [])
      )].filter(Boolean);

      const mergedEdgesMap = new Map();
      relatedDishes.forEach((dish) => {
        (Array.isArray(dish?.pizza_config?.edges) ? dish.pizza_config.edges : []).forEach((edge) => {
          if (!edge?.id) return;
          mergedEdgesMap.set(edge.id, edge);
        });
      });

      const mergedExtrasMap = new Map();
      relatedDishes.forEach((dish) => {
        (Array.isArray(dish?.pizza_config?.extras) ? dish.pizza_config.extras : []).forEach((extra) => {
          if (!extra?.id) return;
          mergedExtrasMap.set(extra.id, extra);
        });
      });

      const startingPrices = [
        ...categorySizeConfigs.map((size) => Number(size?.price_tradicional || 0)),
        ...categorySizeConfigs.map((size) => Number(size?.price_premium || 0)),
        Number(linkedSize?.price_tradicional || 0),
        Number(linkedSize?.price_premium || 0),
        ...relatedDishes.map((dish) => Number(dish?.price || 0))
      ].filter((price) => Number.isFinite(price) && price > 0);

      const maxFlavors = Number(
        pizzaCategory?.max_flavors ||
        mergedSizeConfig?.max_flavors ||
        linkedSize?.max_flavors ||
        1
      ) || 1;

      const flavorCountLabel = `${maxFlavors} sabor${maxFlavors > 1 ? 'es' : ''}`;
      const sizeLabel = linkedSize?.name || mergedSizeConfig?.name || 'Pizza';
      const derivedName = String(pizzaCategory?.name || '').trim()
        || `Pizza ${sizeLabel} - ${flavorCountLabel}`;

      const description = String(pizzaCategory?.description || '').trim()
        || `Monte sua pizza escolhendo ${flavorCountLabel}, borda e extras.`;

      const searchTerms = relatedDishes
        .flatMap((dish) => [dish?.name, dish?.description])
        .filter(Boolean)
        .join(' ');

      const safeFlavorIds = mergedFlavorIds.length
        ? mergedFlavorIds
        : safePizzaFlavors.map((flavor) => flavor.id).filter(Boolean);

      const safeEdges = mergedEdgesMap.size
        ? Array.from(mergedEdgesMap.values())
        : safePizzaEdges;

      const safeExtras = mergedExtrasMap.size
        ? Array.from(mergedExtrasMap.values())
        : safePizzaExtras;

      return {
        ...representative,
        id: representative?.id,
        menu_entry_id: `pizza_entry_${categoryId}`,
        name: derivedName,
        description,
        price: startingPrices.length > 0 ? Math.min(...startingPrices) : Number(representative?.price || 0),
        price_label: 'A partir de',
        cta_label: 'Montar',
        is_generic_pizza_entry: true,
        search_terms: searchTerms,
        pizza_category_id: categoryId,
        pizza_config: {
          ...(representative?.pizza_config || {}),
          sizes: mergedSizeConfig
            ? [
                {
                  ...linkedSize,
                  ...mergedSizeConfig,
                  id: pizzaCategory?.size_id || mergedSizeConfig?.id || linkedSize?.id,
                  max_flavors: maxFlavors
                }
              ]
            : [],
          flavor_ids: safeFlavorIds,
          edges: safeEdges,
          extras: safeExtras
        },
        is_highlight: relatedDishes.some((dish) => dish?.is_highlight),
        is_new: relatedDishes.some((dish) => dish?.is_new),
        is_popular: relatedDishes.some((dish) => dish?.is_popular)
      };
    }).filter(Boolean);
  }, [
    activeDishes,
    pizzaCategoriesResolved,
    pizzaEdgesResolved,
    pizzaExtrasResolved,
    pizzaFlavorsResolved,
    pizzaSizesResolved
  ]);

  const highlightDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    const regularHighlights = safeActiveDishes.filter((dish) => dish.is_highlight && dish.product_type !== 'pizza');
    const pizzaHighlights = genericPizzaEntries.filter((dish) => dish?.is_highlight);
    return [...regularHighlights, ...pizzaHighlights];
  }, [activeDishes, genericPizzaEntries]);
  const activePromotions = useMemo(() => (Array.isArray(promotionsResolved) ? promotionsResolved : []).filter(p => p.is_active), [promotionsResolved]);
  const activeCombos = useMemo(() => (Array.isArray(combosResolved) ? combosResolved : []).filter(c => c?.is_active !== false), [combosResolved]);
  const welcomeCoupon = useMemo(() => {
    const safeCoupons = Array.isArray(couponsResolved) ? couponsResolved : [];
    const now = Date.now();

    return safeCoupons.find((coupon) => {
      if (!coupon || !coupon.code) return false;
      if (!coupon.is_active) return false;

      if (coupon.expires_at) {
        const expiresAt = new Date(coupon.expires_at).getTime();
        if (!Number.isNaN(expiresAt) && expiresAt < now) return false;
      }

      const maxUses = Number(coupon.max_uses || 0);
      const currentUses = Number(coupon.current_uses || 0);
      if (maxUses > 0 && currentUses >= maxUses) return false;

      if (coupon.is_welcome === true || coupon.show_on_welcome === true) return true;

      return String(coupon.code).toUpperCase().trim() === 'BEMVINDO10';
    }) || null;
  }, [couponsResolved]);

  const desktopHighlights = useMemo(() => {
    const promos = (Array.isArray(activePromotions) ? activePromotions : [])
      .map((p) => ({ type: 'promotion', data: p }));
    const combos = (Array.isArray(activeCombos) ? activeCombos : [])
      .map((c) => ({ type: 'combo', data: c }));
    return [...promos, ...combos];
  }, [activePromotions, activeCombos]);

  const desktopBanners = useMemo(() => {
    const list = Array.isArray(store?.banners) ? store.banners : [];
    return list.filter((b) => b && b.active !== false && b.image);
  }, [store?.banners]);

  useEffect(() => {
    if (!desktopCarouselMode) return;
    if (!Array.isArray(desktopHighlights) || desktopHighlights.length <= 1) return;

    const t = setInterval(() => {
      setDesktopHighlightIndex((prev) => (prev + 1) % desktopHighlights.length);
    }, 5500);
    return () => clearInterval(t);
  }, [desktopCarouselMode, desktopHighlights]);

  useEffect(() => {
    if (!desktopCarouselMode) return;
    if (!Array.isArray(desktopBanners) || desktopBanners.length <= 1) return;

    const t = setInterval(() => {
      setDesktopBannerIndex((prev) => (prev + 1) % desktopBanners.length);
    }, 6500);
    return () => clearInterval(t);
  }, [desktopCarouselMode, desktopBanners]);

  const comboDishesForDisplay = useMemo(() => {
    const list = Array.isArray(activeCombos) ? activeCombos : [];
    return list.map((c) => ({
      id: `combo_${c.id}`,
      name: c.name,
      description: c.description,
      image: c.image,
      product_type: 'combo',
      combo_action: c.combo_action || 'add',
      price: c.combo_price,
      is_active: c.is_active,
    }));
  }, [activeCombos]);

  const visibleCombosCount = isDesktopViewport ? 2 : 1;

  const visibleCombosSlides = useMemo(() => {
    const maxSlides = comboDishesForDisplay.length;
    if (maxSlides === 0) return [];
    if (maxSlides <= visibleCombosCount) return comboDishesForDisplay;
    const out = [];
    for (let i = 0; i < visibleCombosCount; i++) {
      out.push(comboDishesForDisplay[(comboBannerIndex + i) % maxSlides]);
    }
    return out;
  }, [comboBannerIndex, comboDishesForDisplay, visibleCombosCount]);

  useEffect(() => {
    const maxSlides = comboDishesForDisplay.length;
    if (maxSlides <= visibleCombosCount) return;
    const t = setInterval(() => {
      setComboBannerIndex((prev) => (prev + 1) % maxSlides);
    }, autoplayIntervalMs);
    return () => clearInterval(t);
  }, [autoplayIntervalMs, comboDishesForDisplay.length, visibleCombosCount]);

  useEffect(() => {
    const maxSlides = comboDishesForDisplay.length;
    if (maxSlides === 0) return;
    setComboBannerIndex((prev) => Math.min(prev, Math.max(0, maxSlides - 1)));
  }, [comboDishesForDisplay.length]);

  const filteredDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    const isPizzaCategory = selectedCategory?.startsWith?.('pc_');
    const isBeverageCategory = selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_');
    if (isBeverageCategory || isPizzaCategory) return [];

    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

    return safeActiveDishes.filter((dish) => {
      if (dish?.product_type === 'pizza') return false;

      const searchableText = `${dish?.name || ''} ${dish?.description || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesCategory = selectedCategory === 'all' || dish.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeDishes, searchTerm, selectedCategory]);

  const filteredGenericPizzaEntries = useMemo(() => {
    const isBeverageCategory = selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_');
    if (isBeverageCategory) return [];

    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    const selectedPizzaCategoryId = selectedCategory?.startsWith?.('pc_')
      ? selectedCategory.replace(/^pc_/, '')
      : null;

    return genericPizzaEntries.filter((dish) => {
      const searchableText = `${dish?.name || ''} ${dish?.description || ''} ${dish?.search_terms || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesCategory = selectedCategory === 'all' || String(dish?.pizza_category_id || '') === String(selectedPizzaCategoryId || '');
      return matchesSearch && matchesCategory;
    });
  }, [genericPizzaEntries, searchTerm, selectedCategory]);

  const filteredBeverages = useMemo(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'beverages' && !selectedCategory?.startsWith?.('bc_')) return [];
    const list = Array.isArray(activeBeverages) ? activeBeverages : [];
    const bcId = selectedCategory?.startsWith?.('bc_') ? selectedCategory.replace(/^bc_/, '') : null;
    return list.filter((b) => {
      const matchesSearch = !searchTerm || b.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || selectedCategory === 'beverages' || !bcId || b.category_id === bcId;
      return matchesSearch && matchesCategory;
    });
  }, [activeBeverages, searchTerm, selectedCategory]);

  const filteredItemsForDisplay = useMemo(() => {
    if (selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_')) {
      return filteredBeverages;
    }
    if (selectedCategory === 'all') {
      return [...filteredDishes, ...filteredGenericPizzaEntries, ...filteredBeverages, ...comboDishesForDisplay];
    }
    if (selectedCategory?.startsWith?.('pc_')) {
      return filteredGenericPizzaEntries;
    }
    return filteredDishes;
  }, [selectedCategory, filteredDishes, filteredGenericPizzaEntries, filteredBeverages, comboDishesForDisplay]);

  const merchandisingEngine = useMemo(() => {
    const safeCart = Array.isArray(cart) ? cart : [];
    const safeDishes = Array.isArray(dishesResolved) ? dishesResolved : [];
    const safeCategories = Array.isArray(categoriesResolved) ? categoriesResolved : [];
    const safePromotions = Array.isArray(activePromotions) ? activePromotions : [];
    const safeCombos = Array.isArray(comboDishesForDisplay) ? comboDishesForDisplay : [];
    const crossSellConfig = store?.cross_sell_config || {};
    const crossSellEnabled = crossSellConfig?.enabled !== false;
    const comboSuggestionEnabled = crossSellEnabled && Boolean(crossSellConfig?.combo_offer?.enabled);

    const cartDishIds = new Set(safeCart.map((item) => String(item?.dish?.id || '')));
    const currentCartTotal = safeCart.reduce((sum, item) => sum + Number(item?.totalPrice || 0) * Number(item?.quantity || 1), 0);
    const findDishById = (id) => safeDishes.find((dish) => String(dish?.id || '') === String(id || ''));
    const analyticsSignals = getCommercialSignalsForSlug(slug);
    const normalizeNeighborhood = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    const getContextualMinimumOrderValue = () => {
      const storeMin = Number(
        store?.min_order_value ??
        store?.min_order ??
        store?.min_order_price ??
        store?.delivery_min_order ??
        0
      ) || 0;

      if (customer?.deliveryMethod !== 'delivery') return storeMin;

      const neighborhoodKey = normalizeNeighborhood(customer?.neighborhood);
      const zone = (Array.isArray(deliveryZonesResolved) ? deliveryZonesResolved : []).find(
        (z) => normalizeNeighborhood(z?.neighborhood) === neighborhoodKey && z?.is_active
      );
      const zoneMin = Number(zone?.min_order ?? zone?.min_order_value ?? 0) || 0;
      return Math.max(storeMin, zoneMin);
    };
    const contextualMinimumOrderValue = getContextualMinimumOrderValue();

    const isDishAvailableForSuggestion = (dish) => {
      if (!dish || dish?.is_active === false) return false;
      if (String(dish?.product_type || '').toLowerCase() === 'combo') return true;
      try {
        return stockUtils.canAddToCart(dish);
      } catch {
        return true;
      }
    };

    const categoryNameById = new Map(
      safeCategories.map((category) => [String(category?.id || ''), String(category?.name || '').toLowerCase()])
    );

    const normalizeText = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const dishTextCache = new Map();
    const getDishText = (dish) => {
      const key = String(dish?.id || '');
      if (dishTextCache.has(key)) return dishTextCache.get(key);
      const categoryName = categoryNameById.get(String(dish?.category_id || '')) || '';
      const text = normalizeText(`${dish?.name || ''} ${dish?.description || ''} ${categoryName}`);
      dishTextCache.set(key, text);
      return text;
    };

    const detectTags = (dish) => {
      const tags = new Set();
      const productType = normalizeText(dish?.product_type || '');
      if (productType) tags.add(productType);

      const text = getDishText(dish);
      if (/pizza/.test(text)) tags.add('pizza');
      if (/hamburg|burger|sanduich|sanduiche|lanche/.test(text)) tags.add('burger');
      if (/acai/.test(text)) tags.add('acai');
      if (/bebida|refriger|suco|agua|drink|cerveja|coca|guarana|fanta/.test(text)) tags.add('beverage');
      if (/sobrem|doce|brownie|bolo|pudim|mousse|sorvete/.test(text)) tags.add('dessert');
      if (/batata|frita|acompanh|porcao|porcao/.test(text)) tags.add('side');
      if (/executivo|almoco|prato/.test(text)) tags.add('main');
      if (/complement|adicional|extra/.test(text)) tags.add('complement');
      if (/combo/.test(text)) tags.add('combo');

      return tags;
    };

    const cartTagCounts = new Map();
    safeCart.forEach((item) => {
      const tags = detectTags(item?.dish || {});
      tags.forEach((tag) => {
        cartTagCounts.set(tag, Number(cartTagCounts.get(tag) || 0) + Number(item?.quantity || 1));
      });
    });
    const hasCartTag = (tag) => Number(cartTagCounts.get(tag) || 0) > 0;
    const getCartTagCount = (tag) => Number(cartTagCounts.get(tag) || 0);

    const withMerchMeta = (dish, meta = {}) => {
      if (!dish) return null;
      const offerPrice = Number(meta.offerPrice ?? dish.price ?? 0);
      const originalPrice = Number(meta.originalPrice ?? dish.original_price ?? dish.price ?? 0);
      return {
        ...dish,
        price: offerPrice,
        original_price: originalPrice,
        _merchandising: {
          source: meta.source || 'catalog',
          sourceId: meta.sourceId || null,
          priority: Number(meta.priority || 99),
          sourcePriority: Number(meta.sourcePriority || 9),
          triggerMin: Number(meta.triggerMin || 0),
          ruleKey: meta.ruleKey || null,
          label: meta.label || ''
        }
      };
    };

    const promotionItems = safePromotions
      .map((promo) => {
        const dish = findDishById(promo?.offer_dish_id);
        if (!isDishAvailableForSuggestion(dish)) return null;
        const triggerMin = Number(promo?.trigger_min_value || 0);
        return withMerchMeta(
          {
            ...dish,
            name: dish?.name || promo?.name,
            description: promo?.description || dish?.description
          },
          {
            source: 'promotion',
            sourceId: promo?.id,
            priority: 1,
            sourcePriority: triggerMin > 0 ? 4 : 1,
            triggerMin,
            offerPrice: Number(promo?.offer_price ?? dish?.price ?? 0),
            originalPrice: Number(promo?.original_price ?? dish?.price ?? 0),
            label: promo?.name || 'Oferta'
          }
        );
      })
      .filter(Boolean);

    const comboItems = safeCombos.map((combo) =>
      withMerchMeta(combo, {
        source: 'combo',
        sourceId: combo?.id,
        priority: 2,
        sourcePriority: 2,
        offerPrice: Number(combo?.price ?? combo?.combo_price ?? 0),
        originalPrice: Number(combo?.original_price ?? combo?.price ?? combo?.combo_price ?? 0),
        label: 'Combo'
      })
    ).filter(Boolean);

    const crossSellDefinitions = [
      { key: 'beverage_offer', priority: 3, defaultLabel: 'Cross-sell Bebida' },
      { key: 'dessert_offer', priority: 3, defaultLabel: 'Cross-sell Sobremesa' },
      { key: 'combo_offer', priority: 3, defaultLabel: 'Cross-sell Combo' }
    ];

    const crossSellItems = crossSellDefinitions
      .map((definition) => {
        if (!crossSellEnabled) return null;
        const config = crossSellConfig?.[definition.key];
        if (!config?.enabled || !config?.dish_id) return null;
        const dish = findDishById(config.dish_id);
        if (!isDishAvailableForSuggestion(dish)) return null;
        const discountPercent = Number(config?.discount_percent || 0);
        const computedPrice = Number(dish?.price || 0) * (1 - discountPercent / 100);
        return withMerchMeta(
          {
            ...dish,
            description: config?.message || dish?.description
          },
          {
            source: 'cross_sell',
            sourceId: definition.key,
            priority: definition.priority,
            sourcePriority: 3,
            ruleKey: definition.key,
            offerPrice: computedPrice,
            originalPrice: Number(dish?.price || 0),
            label: config?.title || definition.defaultLabel
          }
        );
      })
      .filter(Boolean);

    const contextScoreForItem = (item) => {
      const itemTags = detectTags(item);
      const productType = String(item?.product_type || '').toLowerCase();
      let score = 0;

      if (itemTags.has('beverage') && !hasCartTag('beverage') && (hasCartTag('pizza') || hasCartTag('burger') || hasCartTag('main') || hasCartTag('combo'))) {
        score += 42;
      }
      if (itemTags.has('side') && hasCartTag('burger') && !hasCartTag('side')) {
        score += 34;
      }
      if (itemTags.has('dessert') && (hasCartTag('pizza') || hasCartTag('main') || hasCartTag('burger')) && !hasCartTag('dessert')) {
        score += 30;
      }
      if ((itemTags.has('complement') || itemTags.has('dessert')) && hasCartTag('acai')) {
        score += 30;
      }
      if (itemTags.has('combo') && safeCart.length >= 2) {
        score += 14;
      }

      const sameTypeCount = getCartTagCount(productType);
      if (sameTypeCount > 0) {
        score -= Math.min(12, sameTypeCount * 3);
      }
      return score;
    };

    const analyticsScoreForItem = (item) => {
      const itemId = String(item?.id || '');
      if (!itemId) return 0;

      if (item?._merchandising?.source === 'combo' || String(item?.product_type || '').toLowerCase() === 'combo') {
        const comboId = itemId.replace(/^combo_/, '');
        return Number(analyticsSignals?.combo_added?.[comboId] || 0) * 8;
      }

      const addUnits = Number(analyticsSignals?.add_units?.[itemId] || 0);
      const addEvents = Number(analyticsSignals?.add_events?.[itemId] || 0);
      const views = Number(analyticsSignals?.product_views?.[itemId] || 0);
      const upsellAccepted = Number(analyticsSignals?.upsell_accepted?.[itemId] || 0);
      const popularityBoost = item?.is_popular ? 5 : 0;
      const usageHint = Number(item?.order_count ?? item?.times_ordered ?? item?.sales_count ?? 0) || 0;
      return (addUnits * 6) + (addEvents * 4) + (upsellAccepted * 8) + views + popularityBoost + Math.min(6, usageHint * 0.05);
    };

    const byDisplayPriority = (a, b) => {
      const sourceDiff = Number(a?._merchandising?.sourcePriority || 9) - Number(b?._merchandising?.sourcePriority || 9);
      if (sourceDiff !== 0) return sourceDiff;

      const contextDiff = contextScoreForItem(b) - contextScoreForItem(a);
      if (contextDiff !== 0) return contextDiff;

      const analyticsDiff = analyticsScoreForItem(b) - analyticsScoreForItem(a);
      if (analyticsDiff !== 0) return analyticsDiff;

      const priorityDiff = Number(a?._merchandising?.priority || 99) - Number(b?._merchandising?.priority || 99);
      if (priorityDiff !== 0) return priorityDiff;

      const aDiscount = Number(a?.original_price || 0) - Number(a?.price || 0);
      const bDiscount = Number(b?.original_price || 0) - Number(b?.price || 0);
      if (bDiscount !== aDiscount) return bDiscount - aDiscount;

      return Number(a?.price || 0) - Number(b?.price || 0);
    };

    const crossSellRuleSatisfied = (item) => {
      const ruleKey = item?._merchandising?.ruleKey;
      const config = crossSellConfig?.[ruleKey];
      if (!config) return false;

      const offeredDishId = String(item?.id || '');
      const isAlreadyInCart = cartDishIds.has(offeredDishId);
      if (isAlreadyInCart) return false;

      if (ruleKey === 'beverage_offer') {
        const triggerTypes = Array.isArray(config?.trigger_product_types) && config.trigger_product_types.length > 0
          ? config.trigger_product_types
          : ['pizza', 'dish', 'hamburger'];
        const minValue = Number(config?.min_cart_value || 0);
        const hasTriggerType = safeCart.some((cartItem) => triggerTypes.includes(cartItem?.dish?.product_type));
        const hasAnyBeverage = safeCart.some((cartItem) =>
          cartItem?.dish?.product_type === 'beverage' ||
          String(cartItem?.dish?.id || '') === offeredDishId
        );
        return hasTriggerType && currentCartTotal >= minValue && !hasAnyBeverage;
      }

      if (ruleKey === 'dessert_offer') {
        const minValue = Number(config?.min_cart_value || 0);
        return currentCartTotal >= minValue;
      }

      if (ruleKey === 'combo_offer') {
        const minPizzas = Number(config?.min_pizzas || 2);
        const pizzaCount = safeCart.filter((cartItem) => cartItem?.dish?.product_type === 'pizza').length;
        return pizzaCount >= minPizzas;
      }

      return false;
    };

    const sectionClaimed = new Set();
    const takeUnique = (items, limit = 6) => {
      const out = [];
      [...items].sort(byDisplayPriority).forEach((item) => {
        const key = String(item?.id || '');
        if (!key || sectionClaimed.has(key) || out.length >= limit) return;
        sectionClaimed.add(key);
        out.push(item);
      });
      return out;
    };

    const offerSectionItems = takeUnique(
      promotionItems.filter((item) => Number(item?._merchandising?.triggerMin || 0) <= 0),
      6
    );
    const comboSectionItems = takeUnique(comboItems, 6);
    const recommendationSectionItems = takeUnique(crossSellItems, 6);
    const upsellSectionItems = takeUnique(
      promotionItems.filter((item) => Number(item?._merchandising?.triggerMin || 0) > 0),
      6
    );

    const menuSections = [
      {
        id: 'offers',
        title: 'Ofertas da Promoção',
        icon: Flame,
        subtitle: 'Vitrine criada a partir das promoções ativas',
        items: offerSectionItems
      },
      {
        id: 'combos',
        title: 'Combos',
        icon: Package,
        subtitle: 'Combos configurados no painel comercial',
        items: comboSectionItems
      },
      {
        id: 'cross_sell',
        title: 'Recomendados',
        icon: Star,
        subtitle: 'Sugestões de cross-sell configuradas na loja',
        items: recommendationSectionItems
      },
      {
        id: 'upsell',
        title: 'Upsell do Momento',
        icon: Sparkles,
        subtitle: 'Ofertas com gatilho por valor mínimo',
        items: upsellSectionItems
      }
    ].filter((section) => section.items.length > 0);

    const cartCandidates = [];
    const seenCartSuggestion = new Set();
    const pushCartSuggestion = (item, canShow = true) => {
      if (!canShow || !item) return;
      const key = String(item?.id || '');
      if (!isDishAvailableForSuggestion(item)) return;
      if (!key || seenCartSuggestion.has(key) || cartDishIds.has(key)) return;
      seenCartSuggestion.add(key);
      cartCandidates.push(item);
    };

    const hasCartItems = safeCart.length > 0;
    if (hasCartItems) {
      promotionItems
        .filter((item) => currentCartTotal >= Number(item?._merchandising?.triggerMin || 0))
        .sort(byDisplayPriority)
        .forEach((item) => pushCartSuggestion(item, true));

      if (comboSuggestionEnabled) {
        comboItems
          .sort(byDisplayPriority)
          .forEach((item) => pushCartSuggestion(item, true));
      }

      crossSellItems
        .sort(byDisplayPriority)
        .forEach((item) => pushCartSuggestion(item, crossSellRuleSatisfied(item)));
    }

    const pickSmartSuggestions = (candidates, limit = 2) => {
      const ordered = [...candidates].sort(byDisplayPriority);
      const selected = [];

      ordered.forEach((item) => {
        if (selected.length >= limit) return;
        if (selected.length === 0) {
          selected.push(item);
          return;
        }
        const sameSource = selected.some((picked) =>
          String(picked?._merchandising?.source || '') === String(item?._merchandising?.source || '')
        );
        const sameType = selected.some((picked) =>
          String(picked?.product_type || '') === String(item?.product_type || '')
        );
        if (!sameSource || !sameType) {
          selected.push(item);
        }
      });

      if (selected.length < limit) {
        ordered.forEach((item) => {
          if (selected.length >= limit) return;
          if (!selected.some((picked) => String(picked?.id || '') === String(item?.id || ''))) {
            selected.push(item);
          }
        });
      }

      return selected.map((item, index) => ({
        ...item,
        _merchandising: {
          ...(item?._merchandising || {}),
          slot: index === 0 ? 'main' : 'alt'
        }
      }));
    };

    const cartSuggestions = pickSmartSuggestions(cartCandidates, 2);
    const checkoutSuggestion =
      cartSuggestions.find((item) => item?._merchandising?.source !== 'combo') ||
      cartSuggestions[0] ||
      null;

    const freeDeliveryMin = Number(store?.free_delivery_min_value || 0) || 0;

    const nudgeCandidates = [];
    const pushNudge = (item) => {
      if (!item?.text) return;
      nudgeCandidates.push(item);
    };

    if (contextualMinimumOrderValue > 0 && currentCartTotal > 0 && currentCartTotal < contextualMinimumOrderValue) {
      const gap = contextualMinimumOrderValue - currentCartTotal;
      pushNudge({
        id: 'minimum_order',
        priority: 1,
        gap,
        text: `Faltam ${formatCurrency(gap)} para atingir o pedido mínimo.`
      });
    }

    const nextPromotionThreshold = promotionItems
      .map((item) => ({
        triggerMin: Number(item?._merchandising?.triggerMin || 0),
        label: item?._merchandising?.label || item?.name || 'oferta'
      }))
      .filter((item) => item.triggerMin > currentCartTotal)
      .sort((a, b) => a.triggerMin - b.triggerMin)[0];

    if (nextPromotionThreshold) {
      const gap = nextPromotionThreshold.triggerMin - currentCartTotal;
      pushNudge({
        id: 'promotion_threshold',
        priority: 2,
        gap,
        text: `Falta ${formatCurrency(gap)} para liberar a oferta ${nextPromotionThreshold.label}.`
      });
    }

    const beverageOfferConfig = crossSellConfig?.beverage_offer || {};
    const dessertOfferConfig = crossSellConfig?.dessert_offer || {};
    const beverageConfigDish = beverageOfferConfig?.dish_id ? findDishById(beverageOfferConfig.dish_id) : null;
    const dessertConfigDish = dessertOfferConfig?.dish_id ? findDishById(dessertOfferConfig.dish_id) : null;
    const isBeverageConfigValid = crossSellEnabled && !!beverageOfferConfig?.enabled && !!beverageOfferConfig?.dish_id && isDishAvailableForSuggestion(beverageConfigDish);
    const isDessertConfigValid = crossSellEnabled && !!dessertOfferConfig?.enabled && !!dessertOfferConfig?.dish_id && isDishAvailableForSuggestion(dessertConfigDish);

    const dessertMinValue = Number(dessertOfferConfig?.min_cart_value || 0);
    if (isDessertConfigValid && dessertMinValue > currentCartTotal) {
      const gap = dessertMinValue - currentCartTotal;
      pushNudge({
        id: 'dessert_threshold',
        priority: 3,
        gap,
        text: `Adicione ${formatCurrency(gap)} para ativar a sugestão de sobremesa.`
      });
    }

    if (freeDeliveryMin > 0 && currentCartTotal > 0 && currentCartTotal < freeDeliveryMin) {
      const gap = freeDeliveryMin - currentCartTotal;
      pushNudge({
        id: 'free_delivery',
        priority: 4,
        gap,
        text: `Faltam ${formatCurrency(gap)} para tentar frete grátis.`
      });
    }

    const beverageTriggerTypes = Array.isArray(beverageOfferConfig?.trigger_product_types) && beverageOfferConfig.trigger_product_types.length > 0
      ? beverageOfferConfig.trigger_product_types
      : ['pizza', 'dish', 'hamburger'];
    const beverageTriggerActive = safeCart.some((cartItem) => beverageTriggerTypes.includes(cartItem?.dish?.product_type));
    const beverageMinValue = Number(beverageOfferConfig?.min_cart_value || 0);

    if (isBeverageConfigValid && beverageTriggerActive && !hasCartTag('beverage') && currentCartTotal < beverageMinValue) {
      const gap = beverageMinValue - currentCartTotal;
      pushNudge({
        id: 'beverage_threshold',
        priority: 5,
        gap,
        text: `Adicione ${formatCurrency(gap)} para ativar a sugestão de bebida.`
      });
    } else if (isBeverageConfigValid && beverageTriggerActive && !hasCartTag('beverage')) {
      pushNudge({
        id: 'beverage_context',
        priority: 5,
        gap: Number.MAX_SAFE_INTEGER,
        text: 'Complete seu pedido com uma bebida para aumentar o valor percebido.'
      });
    }

    const sortedNudges = [...nudgeCandidates].sort((a, b) => {
      const priorityDiff = Number(a?.priority || 99) - Number(b?.priority || 99);
      if (priorityDiff !== 0) return priorityDiff;
      return Number(a?.gap || Number.MAX_SAFE_INTEGER) - Number(b?.gap || Number.MAX_SAFE_INTEGER);
    });

    return {
      menuSections,
      cartSuggestions,
      checkoutSuggestion,
      cartNudgeMain: sortedNudges[0]?.text || null,
      cartNudgeSecondary: sortedNudges[1]?.text || null,
      checkoutNudge: sortedNudges[0]?.text || null
    };
  }, [
    activePromotions,
    cart,
    categoriesResolved,
    customer?.deliveryMethod,
    customer?.neighborhood,
    comboDishesForDisplay,
    deliveryZonesResolved,
    dishesResolved,
    slug,
    store?.cross_sell_config,
    store?.delivery_min_order,
    store?.free_delivery_min_value,
    store?.min_order,
    store?.min_order_price,
    store?.min_order_value
  ]);

  const commercialSections = merchandisingEngine.menuSections;
  const cartUpsellSuggestions = merchandisingEngine.cartSuggestions;
  const checkoutMerchandisingSuggestion = merchandisingEngine.checkoutSuggestion;
  const cartSmartNudgeMain = merchandisingEngine.cartNudgeMain;
  const cartSmartNudgeSecondary = merchandisingEngine.cartNudgeSecondary;
  const checkoutSmartNudge = merchandisingEngine.checkoutNudge;

  const cartSuggestionsEnabled = useMemo(() => {
    const crossSellConfig = store?.cross_sell_config || {};
    const crossSellEnabled = crossSellConfig?.enabled !== false;
    const hasCrossSellSuggestion =
      crossSellEnabled &&
      ['beverage_offer', 'dessert_offer', 'combo_offer'].some((key) => {
        const config = crossSellConfig?.[key];
        return Boolean(config?.enabled && config?.dish_id);
      });
    const hasPromotionSuggestion = Array.isArray(activePromotions) && activePromotions.length > 0;
    return hasPromotionSuggestion || hasCrossSellSuggestion;
  }, [activePromotions, store?.cross_sell_config]);

  const showCommercialSections = selectedCategory === 'all' && !searchTerm?.trim();
  const showLegacyPromotionSurface = !showCommercialSections || commercialSections.length === 0;

  useEffect(() => {
    if (showUpsellModal && Array.isArray(upsellPromotions) && upsellPromotions.length > 0) {
      const ids = upsellPromotions.map((promotion) => String(promotion?.id || '')).filter(Boolean);
      const key = `upsell_modal:${ids.join(',')}:${Math.round(Number(cartTotal || 0) * 100)}`;
      void trackCommercialEventOnce(COMMERCIAL_EVENTS.UPSELL_SHOWN, key, {
        source: 'upsell_modal',
        promotion_ids: ids,
        cart_total: Number(cartTotal || 0)
      });
    }
  }, [cartTotal, showUpsellModal, upsellPromotions]);

  useEffect(() => {
    if (!showCartModal || !Array.isArray(cartUpsellSuggestions) || cartUpsellSuggestions.length === 0) {
      return;
    }

    cartSuggestionAcceptedRef.current = false;
    const ids = cartUpsellSuggestions.map((dish) => String(dish?.id || '')).filter(Boolean);
    const key = `cart_suggestions:${ids.join(',')}:${Math.round(Number(cartTotal || 0) * 100)}`;
    void trackCommercialEventOnce(COMMERCIAL_EVENTS.UPSELL_SHOWN, key, {
      source: 'cart_suggestions',
      dish_ids: ids,
      cart_total: Number(cartTotal || 0)
    });
  }, [cartTotal, cartUpsellSuggestions, showCartModal]);

  useEffect(() => {
    if (currentView !== 'checkout' || !checkoutMerchandisingSuggestion) return;
    checkoutSuggestionAcceptedRef.current = false;
    const key = `checkout_suggestion:${String(checkoutMerchandisingSuggestion?.id || '')}:${Math.round(Number(cartTotal || 0) * 100)}`;
    void trackCommercialEventOnce(COMMERCIAL_EVENTS.UPSELL_SHOWN, key, {
      source: 'checkout_suggestion',
      dish_id: checkoutMerchandisingSuggestion?.id || null,
      dish_name: checkoutMerchandisingSuggestion?.name || null,
      cart_total: Number(cartTotal || 0)
    });
  }, [cartTotal, checkoutMerchandisingSuggestion, currentView]);

  const layoutForSelectedCategoryDesktop = useMemo(() => {
    if (desktopCarouselMode) return 'carousel';
    return menuLayout;
  }, [desktopCarouselMode, menuLayout]);

  // (Return de erro movido para depois de TODOS os hooks — ver bloco "Erro ao carregar" mais abaixo)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar token no localStorage diretamente para evitar requisições desnecessárias
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setIsAuthenticated(false);
          return;
        }
        
        // Tentar verificar autenticação
        const isAuth = await base44.auth.isAuthenticated();
        setIsAuthenticated(isAuth);
        if (isAuth) {
          try {
            const user = await base44.auth.me();
            setUserEmail(user?.email || null);
            
            // Buscar foto do perfil do customer
            if (user?.email) {
              try {
                const customers = await base44.entities.Customer.filter({ email: user.email });
                if (customers.length > 0 && customers[0].profile_picture) {
                  setUserProfilePicture(customers[0].profile_picture);
                }
              } catch (e) {
                console.log('Erro ao buscar foto do perfil (não crítico):', e);
              }
            }
          } catch (e) {
            console.log('Erro ao buscar email do usuário (não crítico):', e);
            setIsAuthenticated(false);
          }
        }
      } catch (e) {
        // Ignorar erros de autenticação em rotas públicas
        console.log('Erro ao verificar autenticação (não crítico):', e);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const cartRef = React.useRef(cart);
  React.useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const cartRecoveryCheckedSlugRef = React.useRef(null);
  const cartRecoveryToastIdRef = React.useRef(null);

  useEffect(() => {
    if (!slug) return;
    if (publicLoading) return;

    // Rodar apenas uma vez por slug (evita repetir toast ao mexer no carrinho)
    if (cartRecoveryCheckedSlugRef.current === slug) return;
    cartRecoveryCheckedSlugRef.current = slug;

    // Só oferecer recuperação se o carrinho atual estiver vazio
    if (Array.isArray(cartRef.current) && cartRef.current.length > 0) return;
    
    try {
      const savedCartKey = `cardapio_cart_${slug}`;
      const savedCart = localStorage.getItem(savedCartKey);
      const promptedKey = `cardapio_cart_recovery_prompted_${slug}`;
      const wasPrompted = localStorage.getItem(promptedKey) === '1';
      

      console.log('🛒 [CartRecovery] savedCart?', !!savedCart, 'wasPrompted?', wasPrompted);
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        console.log('🛒 [CartRecovery] parsedCart length:', Array.isArray(parsedCart) ? parsedCart.length : 'invalid');
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          if (wasPrompted) {
            safeHydrateCart(parsedCart);
            return;
          }

          // Aguardar um pouco para não mostrar imediatamente
          const timer = setTimeout(() => {
            const toastId = `cart_recovery_prompt_${slug}`;
            cartRecoveryToastIdRef.current = toastId;
            toast.dismiss(toastId);
            toast(
              (t) => (
                <div className="flex flex-col gap-2">
                  <p className="font-semibold">Você tinha itens no carrinho!</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Deseja recuperar seu pedido anterior?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        localStorage.setItem(promptedKey, '1');
                        safeHydrateCart(parsedCart);
                        toast.dismiss(t.id);
                        toast.dismiss(toastId);
                        toast.success('Carrinho recuperado!');
                      }}
                      className="px-4 py-2 bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
                    >
                      Sim, recuperar
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem(promptedKey, '1');
                        localStorage.removeItem(savedCartKey);
                        safeHydrateCart([]);
                        toast.dismiss(t.id);
                        toast.dismiss(toastId);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Não, obrigado
                    </button>
                  </div>
                </div>
              ),
              {
                id: toastId,
                duration: 10000,
                position: 'top-center',
              }
            );
          }, 400);
          
          return () => {
            clearTimeout(timer);
            if (cartRecoveryToastIdRef.current) {
              toast.dismiss(cartRecoveryToastIdRef.current);
              cartRecoveryToastIdRef.current = null;
            }
          };
        }
      }
    } catch (e) {
      console.error('Erro ao recuperar carrinho:', e);
      try {
        localStorage.removeItem(`cardapio_cart_${slug}`);
      } catch {
        // ignore
      }
      safeHydrateCart([]);
    }
  }, [slug, publicLoading, safeHydrateCart]);

  // Splash breve só quando os dados chegam pela primeira vez (não reabrir em refetch — evitava travar na tela amarela)
  const splashShownForSlugRef = React.useRef(null);
  useEffect(() => {
    if (!slug) {
      setShowSplash(false);
      splashShownForSlugRef.current = null;
      return;
    }

    if (publicLoading) return;
    if (publicData && publicData.store) {
      if (splashShownForSlugRef.current !== slug) {
        splashShownForSlugRef.current = slug;
        setShowSplash(true);
        const t = setTimeout(() => setShowSplash(false), 1200);
        return () => clearTimeout(t);
      }
      return;
    }
    if (!publicData && !publicLoading) {
      setShowSplash(false);
      splashShownForSlugRef.current = null;
    }
  }, [publicData, publicLoading, slug]);

  useEffect(() => {
    if (!slug || !store || !welcomeCoupon) return;

    const storageKey = `welcome_discount_${slug}`;
    const hasSeen = localStorage.getItem(storageKey);

    if (!hasSeen) {
      const timer = setTimeout(() => {
        setShowWelcomeDiscount(true);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [slug, store, welcomeCoupon]);

  // ✅ Erro ao carregar cardápio (404, 500, timeout, rede) — depois de TODOS os hooks
  if (slug && publicError) {
    const isTimeoutOrNetwork = publicErrorDetails?.isTimeout || publicErrorDetails?.message?.includes('fetch') || publicErrorDetails?.message?.includes('rede');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md p-6 rounded-xl bg-card text-card-foreground shadow-lg border border-border">
          <p className="text-xl font-medium text-foreground">
            {isTimeoutOrNetwork ? 'Não foi possível carregar' : 'Link não encontrado'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isTimeoutOrNetwork
              ? 'O servidor pode estar iniciando ou a conexão falhou. Tente novamente em alguns segundos.'
              : 'Este cardápio não existe ou o link está incorreto. Verifique com o estabelecimento.'}
          </p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] })}
            className="mt-4 bg-orange-500 text-primary-foreground hover:bg-orange-600"
          >
            Tentar novamente
          </Button>
          <Link to="/assinar" className="mt-4 block text-sm text-orange-600 hover:underline">Assinar {SYSTEM_NAME}</Link>
        </div>
      </div>
    );
  }

  // Se não há slug, mostrar página de entrada
  if (!slug) {
    return <CardapioSemLink />;
  }

  const handleAddToCart = async (item, isEditing = false) => {
    const dish = item.dish || item;
    
    if (dish?.product_type !== 'combo' && !stockUtils.canAddToCart(dish)) {
      toast.error('Este produto está esgotado');
      return;
    }

    if (isEditing || editingCartItem) {
      updateItem(editingCartItem?.id || item.id, item);
      setEditingCartItem(null);
      if (dish?.product_type === 'pizza') {
        closePizzaBuilder();
      } else {
        setSelectedDish(null);
        setSelectedPizza(null);
      }
      toast.success('Item atualizado no carrinho');
      return;
    }

    const comboAction = String(item?.selections?.combo_action || dish?.combo_action || '').toLowerCase();
    if (dish?.product_type === 'combo' && comboAction === 'replace') {
      clearCart();
    }
    
    addItem(item);
    void trackCommercialEvent(COMMERCIAL_EVENTS.ADD_TO_CART, {
      dish_id: dish?.id || null,
      dish_name: dish?.name || null,
      product_type: dish?.product_type || null,
      quantity: Number(item?.quantity || 1),
      item_total: Number(item?.totalPrice || dish?.price || 0),
      cart_total_estimate: Number(cartTotal || 0) + Number(item?.totalPrice || dish?.price || 0),
      merchandising_source: dish?._merchandising?.source || null,
      merchandising_label: dish?._merchandising?.label || null
    });
    if (dish?.product_type === 'combo') {
      void trackCommercialEvent(COMMERCIAL_EVENTS.COMBO_ADDED, {
        combo_id: dish?.id || null,
        combo_name: dish?.name || null,
        combo_price: Number(item?.totalPrice || dish?.price || 0)
      });
    }
    if (dish?.product_type === 'pizza') {
      closePizzaBuilder();
    } else {
      setSelectedDish(null);
      setSelectedPizza(null);
    }
    
    // Cross-sell será gerenciado pelo componente SmartUpsell baseado no carrinho
    
    // Rastrear combinação de pizza
    const pizzaFlavors = Array.isArray(item?.selections?.flavors) ? item.selections.flavors : item?.flavors;
    if (dish.product_type === 'pizza' && Array.isArray(pizzaFlavors) && pizzaFlavors.length > 0) {
      try {
        const flavorIds = pizzaFlavors.map(f => f.id).filter(Boolean);
        await base44.functions.invoke('trackPizzaCombination', {
          pizza_id: dish.id,
          flavor_ids: flavorIds
        });
      } catch (e) {
        console.error('Erro ao rastrear combinação de pizza:', e);
      }
    }
    
    toast.success(
      <div className="flex items-center gap-2">
        <span>✅</span>
        <span>Adicionado ao carrinho!</span>
      </div>,
      { duration: 2000 }
    );
    
    // Verificar upsell
    const newCartTotal = cartTotal + item.totalPrice;
    checkUpsell(newCartTotal);
  };

  const handleDishClick = (dish) => {
    void trackCommercialEvent(COMMERCIAL_EVENTS.PRODUCT_VIEW, {
      dish_id: dish?.id || null,
      dish_name: dish?.name || null,
      product_type: dish?.product_type || null,
      dish_price: Number(dish?.price || 0),
      merchandising_source: dish?._merchandising?.source || null,
      merchandising_label: dish?._merchandising?.label || null
    });

    if (dish.product_type === 'combo') {
      void trackCommercialEvent(COMMERCIAL_EVENTS.COMBO_CLICKED, {
        combo_id: dish?.id || null,
        combo_name: dish?.name || null,
        combo_price: Number(dish?.price || 0)
      });
      const comboId = (dish.id || '').toString().replace(/^combo_/, '');
      const combo = (Array.isArray(combosResolved) ? combosResolved : []).find((c) => (c?.id || '').toString() === comboId);
      if (combo) {
        setSelectedCombo(combo);
        return;
      }
    }
    
    // Se for bebida, usar modal específico de bebida
    if (dish.product_type === 'beverage') {
      openBeverageDetails(dish);
      return;
    }
    
    if (dish.product_type === 'pizza') {
      openPizzaBuilder(dish);
    } else {
      openDishDetails(dish);
    }
  };

  const resolveCommercialSuggestionAction = React.useCallback((suggestedDish) => {
    const merch = suggestedDish?._merchandising;
    if (!merch || !merch.sourceId) {
      return 'add';
    }

    if (merch.source === 'promotion') {
      const sourcePromotion = (Array.isArray(activePromotions) ? activePromotions : []).find(
        (promotion) => String(promotion?.id || '') === String(merch.sourceId || '')
      );
      return String(sourcePromotion?.type || '').toLowerCase() === 'replace' ? 'replace' : 'add';
    }

    if (merch.source === 'combo') {
      const sourceComboId = String(merch.sourceId || '').replace(/^combo_/, '');
      const sourceCombo = (Array.isArray(activeCombos) ? activeCombos : []).find(
        (combo) => String(combo?.id || '') === sourceComboId
      );
      const comboAction = String(sourceCombo?.combo_action || suggestedDish?.combo_action || 'add').toLowerCase();
      return comboAction === 'replace' ? 'replace' : 'add';
    }

    return 'add';
  }, [activePromotions, activeCombos]);

  const handleCommercialSuggestion = React.useCallback((suggestedDish, context = 'cart') => {
    if (!suggestedDish) return;
    const suggestionAction = resolveCommercialSuggestionAction(suggestedDish);
    const isReplace = suggestionAction === 'replace';
    if (context === 'checkout') {
      checkoutSuggestionAcceptedRef.current = true;
    } else {
      cartSuggestionAcceptedRef.current = true;
    }

    void trackCommercialEvent(COMMERCIAL_EVENTS.UPSELL_ACCEPTED, {
      source: context === 'checkout' ? 'checkout_suggestion' : 'cart_suggestion',
      dish_id: suggestedDish?.id || null,
      dish_name: suggestedDish?.name || null,
      product_type: suggestedDish?.product_type || null,
      merchandising_source: suggestedDish?._merchandising?.source || null,
      merchandising_label: suggestedDish?._merchandising?.label || null,
      promotion_type: suggestionAction
    });

    if (isReplace) {
      clearCart();
    }

    if (context === 'checkout') {
      setCurrentView('menu');
      setTimeout(() => handleDishClick(suggestedDish), 0);
      return;
    }

    closeCartModal();
    handleDishClick(suggestedDish);
  }, [clearCart, closeCartModal, handleDishClick, resolveCommercialSuggestionAction]);

  const handleCartModalDismiss = React.useCallback((reason = 'dismiss') => {
    const suggestions = Array.isArray(cartUpsellSuggestions) ? cartUpsellSuggestions : [];
    if (suggestions.length > 0 && !cartSuggestionAcceptedRef.current) {
      const ids = suggestions.map((dish) => String(dish?.id || '')).filter(Boolean);
      const key = `cart_skip:${reason}:${ids.join(',')}:${Math.round(Number(cartTotal || 0) * 100)}`;
      void trackCommercialEventOnce(COMMERCIAL_EVENTS.UPSELL_SKIPPED, key, {
        source: 'cart_suggestions',
        reason,
        dish_ids: ids,
        suggestion_count: ids.length,
        cart_total: Number(cartTotal || 0)
      });
    }
    closeCartModal();
  }, [cartTotal, cartUpsellSuggestions, closeCartModal]);

  const handleRemoveFromCart = (itemId) => {
    removeItem(itemId);
    toast.success('Item removido do carrinho');
    
    if (cart.length === 1) {
      resetUpsell();
    }
  };

  const handleUpdateQuantity = (itemId, delta) => {
    updateQuantity(itemId, delta);
  };

  const handleApplyCoupon = (codeFromModal) => {
    const result = validateAndApply(codeFromModal);
    if (result.success) {
      const discount = result.discount ?? calculateDiscount();
      toast.success(
        <div>
          <p className="font-bold">🎉 Cupom aplicado!</p>
          <p className="text-sm">Você economizou {formatCurrency(discount)}</p>
        </div>
      );
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success('Cupom removido');
  };

  const handleEditCartItem = (item) => {
    setEditingCartItem(item);
    if (item.dish?.product_type === 'pizza') {
      openPizzaBuilder(item.dish);
    } else if (item.dish?.product_type === 'beverage') {
      openBeverageDetails(item.dish);
    } else {
      openDishDetails(item.dish);
    }
    setShowCartModal(false);
  };

  const handleEditPizza = (item) => {
    setEditingCartItem(item);
    openPizzaBuilder(item.dish);
    setShowCartModal(false);
  };

  const handleUpsellAccept = (promotion) => {
    if (!promotion) return;
    
    const promoDish = dishesResolved.find(d => d.id === promotion.offer_dish_id);
    if (!promoDish) {
      closeUpsell();
      return;
    }
    
    if (promotion.type === 'replace') {
      clearCart();
    }
    
    const promoItem = {
      ...promoDish,
      price: promotion.offer_price,
      original_price: promotion.original_price,
      _isPromo: true
    };

    void trackCommercialEvent(COMMERCIAL_EVENTS.UPSELL_ACCEPTED, {
      source: 'upsell_modal',
      promotion_id: promotion?.id || null,
      promotion_type: promotion?.type || null,
      dish_id: promoItem?.id || null,
      dish_name: promoItem?.name || null,
      offer_price: Number(promotion?.offer_price ?? promoItem?.price ?? 0),
      original_price: Number(promotion?.original_price ?? promoDish?.price ?? 0)
    });

    handleDishClick(promoItem);
    closeUpsell();
  };

  const handleUpsellDecline = React.useCallback(() => {
    const firstPromotion = (Array.isArray(upsellPromotions) ? upsellPromotions[0] : null) || null;
    void trackCommercialEvent(COMMERCIAL_EVENTS.UPSELL_REJECTED, {
      source: 'upsell_modal',
      promotion_id: firstPromotion?.id || null,
      promotion_type: firstPromotion?.type || null,
      cart_total: Number(cartTotal || 0)
    });
    closeUpsell();
  }, [cartTotal, closeUpsell, upsellPromotions]);

  const handleCheckoutBack = React.useCallback(() => {
    if (checkoutMerchandisingSuggestion && !checkoutSuggestionAcceptedRef.current) {
      const dishId = String(checkoutMerchandisingSuggestion?.id || '');
      const key = `checkout_skip:back:${dishId}:${Math.round(Number(cartTotal || 0) * 100)}`;
      void trackCommercialEventOnce(COMMERCIAL_EVENTS.UPSELL_SKIPPED, key, {
        source: 'checkout_suggestion',
        reason: 'back_to_menu',
        dish_id: checkoutMerchandisingSuggestion?.id || null,
        dish_name: checkoutMerchandisingSuggestion?.name || null,
        cart_total: Number(cartTotal || 0)
      });
    }
    setCurrentView('menu');
  }, [cartTotal, checkoutMerchandisingSuggestion]);

  const handleSendWhatsApp = async () => {
    const orderCode = orderService.generateOrderCode();
    const fullAddress = orderService.formatFullAddress(customer);
    const normalizeNeighborhood = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    
    if (customer.deliveryMethod === 'delivery' && !customer.neighborhood) {
      toast.error('Por favor, informe o bairro para calcular a taxa de entrega');
      return;
    }
    
    const calculatedDeliveryFee = orderService.calculateDeliveryFee(
      customer.deliveryMethod, 
      customer.neighborhood, 
      deliveryZonesResolved,
      store,
      customer.latitude,
      customer.longitude
    );

    const storeMinOrder = Number(
      store?.min_order_value ??
      store?.min_order ??
      store?.min_order_price ??
      store?.delivery_min_order ??
      0
    ) || 0;
    const matchedZone = customer.deliveryMethod === 'delivery'
      ? (deliveryZonesResolved || []).find(
          (z) =>
            z?.is_active &&
            normalizeNeighborhood(z?.neighborhood) === normalizeNeighborhood(customer.neighborhood)
        )
      : null;
    const zoneMinOrder = Number(matchedZone?.min_order ?? matchedZone?.min_order_value ?? 0) || 0;
    const minimumOrderValue = Math.max(storeMinOrder, zoneMinOrder);
    if (customer.deliveryMethod === 'delivery' && minimumOrderValue > 0 && cartTotal < minimumOrderValue) {
      toast.error(`Pedido mínimo para entrega: ${formatCurrency(minimumOrderValue)}`);
      return;
    }
    
    const loyaltyConfig = (Array.isArray(loyaltyConfigsResolved) && loyaltyConfigsResolved[0])
      ? loyaltyConfigsResolved[0]
      : null;
    const isLoyaltyActive = loyaltyConfig?.is_active === true;

    // Calcular descontos
    const couponDiscount = calculateDiscount();
    const loyaltyDiscountPercent = isLoyaltyActive ? getLoyaltyDiscount() : 0;
    const loyaltyDiscountAmount = cartTotal * (loyaltyDiscountPercent / 100);
    const totalDiscount = couponDiscount + loyaltyDiscountAmount;
    
    const { total } = orderService.calculateTotals(cartTotal, totalDiscount, calculatedDeliveryFee);

    if (checkoutMerchandisingSuggestion && !checkoutSuggestionAcceptedRef.current) {
      const dishId = String(checkoutMerchandisingSuggestion?.id || '');
      const key = `checkout_skip:order:${dishId}:${Math.round(Number(cartTotal || 0) * 100)}`;
      void trackCommercialEventOnce(COMMERCIAL_EVENTS.UPSELL_SKIPPED, key, {
        source: 'checkout_suggestion',
        reason: 'order_completed_without_suggestion',
        dish_id: checkoutMerchandisingSuggestion?.id || null,
        dish_name: checkoutMerchandisingSuggestion?.name || null,
        cart_total: Number(cartTotal || 0)
      });
    }

    // Buscar email do usuário autenticado
    let userEmail = undefined;
    if (isAuthenticated) {
      try {
        const user = await base44.auth.me();
        userEmail = user?.email;
      } catch (e) {
        console.error('Erro ao buscar usuário:', e);
      }
    }

    const orderData = {
      order_code: orderCode,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: userEmail, // Email do usuário autenticado
      created_by: userEmail, // Quem criou o pedido (para rastreamento)
      customer_latitude: customer.latitude || null,
      customer_longitude: customer.longitude || null,
      delivery_method: customer.deliveryMethod,
      address_street: customer.address_street,
      address_number: customer.address_number,
      address_complement: customer.address_complement,
      address: fullAddress,
      neighborhood: customer.neighborhood,
      payment_method: customer.paymentMethod,
      needs_change: customer.needs_change || false,
      change_amount: customer.change_amount ? parseFloat(customer.change_amount) : null,
      scheduled_date: customer.scheduled_date || null,
      scheduled_time: customer.scheduled_time || null,
      items: cart,
      subtotal: cartTotal,
      delivery_fee: calculatedDeliveryFee,
      discount: totalDiscount,
      coupon_code: appliedCoupon?.code,
      loyalty_discount: loyaltyDiscountAmount,
      loyalty_tier: loyaltyData?.tier || 'bronze',
      loyalty_points_earned: (() => {
        if (!isLoyaltyActive) return 0;
        const minOrderValue = Number(loyaltyConfig?.min_order_value ?? 0);
        if (Number.isFinite(minOrderValue) && minOrderValue > 0 && total < minOrderValue) return 0;
        const pointsPerReal = Number(loyaltyConfig?.points_per_real ?? 1);
        const safePpr = Number.isFinite(pointsPerReal) && pointsPerReal > 0 ? pointsPerReal : 1;
        return Math.floor(total * safePpr);
      })(),
      total: total,
      status: 'new',
      ...((customer.customer_change_request || '').trim() && {
        customer_change_request: (customer.customer_change_request || '').trim(),
        customer_change_status: 'pending',
      }),
      // Cardápio público /s/:slug: pedido deve cair no Gestor do assinante, não no do master
      ...(slug && publicData?.subscriber_email && { owner_email: publicData.subscriber_email }),
    };

    const orderResponse = await orderService.createOrder(orderData, createOrderMutation);
    const order = orderResponse?.data || orderResponse;
    void trackCommercialEvent(COMMERCIAL_EVENTS.ORDER_COMPLETED, {
      order_id: order?.id || null,
      order_code: order?.order_code || orderCode || null,
      order_total: Number(order?.total ?? total ?? 0),
      items_count: Array.isArray(cart) ? cart.reduce((sum, item) => sum + Number(item?.quantity || 1), 0) : 0,
      payment_method: customer?.paymentMethod || null,
      delivery_method: customer?.deliveryMethod || null
    });
    try {
      await orderService.updateCouponUsage(appliedCoupon, updateCouponMutation);
    } catch (couponError) {
      console.warn('Falha ao atualizar uso do cupom, sem bloquear conclusão do pedido:', couponError);
    }

    // Adicionar pontos de fidelidade após pedido criado
    if (isLoyaltyActive && (customer.phone || userEmail)) {
      try {
        const minOrderValue = Number(loyaltyConfig?.min_order_value ?? 0);
        if (Number.isFinite(minOrderValue) && minOrderValue > 0 && total < minOrderValue) {
          throw new Error('Pedido abaixo do valor mínimo para acumular pontos');
        }
        const pointsPerReal = Number(loyaltyConfig?.points_per_real ?? 1);
        const safePpr = Number.isFinite(pointsPerReal) && pointsPerReal > 0 ? pointsPerReal : 1;
        const pointsToAdd = Math.floor(total * safePpr);
        const result = await addPoints(pointsToAdd, 'compra', { orderTotal: total });
        
        // Verificar se é primeira compra (bônus)
        if (!loyaltyData.lastOrderDate) {
          await addPoints(50, 'primeira_compra');
          toast.success('🎉 Bônus de primeira compra: +50 pontos!', { duration: 4000 });
        }
        
        // Verificar bônus de aniversário
        const birthdayBonus = await checkBirthdayBonus();
        if (birthdayBonus && birthdayBonus.success) {
          toast.success(birthdayBonus.message, { duration: 5000 });
        }
        
        // Verificar bônus de compras consecutivas
        const consecutiveBonus = await checkConsecutiveOrdersBonus();
        if (consecutiveBonus && consecutiveBonus.success) {
          toast.success(consecutiveBonus.message, { duration: 5000 });
        }
        
        toast.success(
          `✨ Você ganhou ${pointsToAdd} pontos! Total: ${result.points} pontos (${result.tier.name})`,
          { duration: 5000 }
        );
      } catch (error) {
        console.error('Erro ao adicionar pontos:', error);
      }
    }

    const shouldSend = whatsappService.shouldSendWhatsApp(store);

    if (shouldSend && store?.whatsapp) {
      const message = whatsappService.formatOrderMessage(
        order, 
        cart, 
        complementGroupsResolved, 
        formatCurrency,
        store?.name || store?.store_name || 'Restaurante'
      );

      whatsappService.sendToWhatsApp(store?.whatsapp, message);
    }

    // Limpar tudo
    clearCart();
    removeCoupon();
    clearCustomer();
    setCurrentView('menu');
    resetUpsell();
    
    toast.success(
      <div className="text-center">
        <p className="font-bold mb-1">✅ Pedido enviado com sucesso!</p>
        <p className="text-sm">Pedido #{orderCode}</p>
        <button
          onClick={() => openOrderHistoryModal()}
          className="mt-2 text-blue-600 font-medium text-sm underline"
        >
          Acompanhar pedido
        </button>
      </div>,
      { duration: 5000 }
    );
  };

  // Timeout de carregamento: após 5s mostramos "Tentar novamente" (evita ficar travado)
  const showRetryAfterTimeout = slug && publicLoading && loadingTimeout;

  // Carregamento mínimo (sem tela laranja): só spinner neutro; ao carregar, vai direto para a tela principal do restaurante
  if (slug && publicLoading) {
    return (
      <div className="min-h-screen min-h-screen-mobile flex flex-col items-center justify-center bg-background">
        {!(showRetryAfterTimeout || publicError) && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando cardápio...</p>
          </div>
        )}
        {(showRetryAfterTimeout || publicError) && (
          <div className="text-center max-w-xs px-4">
            <p className="text-foreground text-sm mb-3">
              {publicError ? (publicErrorDetails?.isTimeout ? 'O servidor demorou para responder.' : 'Não foi possível carregar o cardápio. Verifique o link e a conexão.') : 'Está demorando mais que o normal.'}
            </p>
            <Button
              onClick={() => {
                setLoadingTimeout(false);
                queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
              }}
              className="bg-orange-500 text-primary-foreground hover:bg-orange-600"
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={desktopCarouselMode
      ? "h-screen overflow-hidden bg-background flex flex-col"
      : "min-h-screen min-h-screen-mobile bg-background flex flex-col"
    }>
      {/* Splash - logo do restaurante e cor principal */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5 px-6"
            >
              {store?.logo && (
                <img
                  src={store?.logo}
                  alt={store?.name || 'Restaurante'}
                  className="h-24 w-24 max-w-[280px] object-contain drop-shadow-lg rounded-xl"
                />
              )}
              <p className="text-primary-foreground font-semibold text-xl text-center drop-shadow-sm">
                {store?.name || 'Cardápio'}
              </p>
              {loadingTimeout && publicError && (
                <div className="mt-4 text-center max-w-sm">
                  <p className="text-primary-foreground/90 text-sm mb-3">Erro ao carregar cardápio</p>
                  <Button
                    onClick={() => {
                      setLoadingTimeout(false);
                      window.location.reload();
                    }}
                    className="bg-card text-orange-500 hover:bg-muted px-4 py-2 rounded-lg font-medium"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              )}
              {!loadingTimeout && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="h-1 w-24 rounded-full bg-primary-foreground/70"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Store Closed Overlay */}
      {isStoreUnavailable && (
        <StoreClosedOverlay
          isStoreClosed={isStoreClosed}
          isAutoModeClosed={isAutoModeClosed}
          isStorePaused={isStorePaused}
          getNextOpenTime={getNextOpenTime}
          store={store}
        />
      )}

      {/* Hero Banner - Banner Superior Grande */}
      {store?.banner_image ? (
        <div className="relative w-full h-[200px] md:h-[88px] overflow-hidden">
          {/* Background Image */}
          <img 
            src={store?.banner_image} 
            alt={store?.name || 'Restaurante'}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30"></div>
          
          {/* Desktop: linha única - Logo | Search | Ícones */}
          <div className="absolute inset-0 z-30 flex flex-col md:flex-row md:items-center md:justify-between md:gap-4 md:px-4 md:py-3">
            <div className="flex items-center gap-3 pt-4 pl-4 md:pt-0 md:pl-0 md:flex-shrink-0">
              {store?.logo && (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/95 backdrop-blur-sm p-1 shadow-2xl border-2 border-white/50 flex-shrink-0">
                  <img src={store?.logo} alt={store?.name || 'Restaurante'} className="w-full h-full rounded-full object-cover" />
                </div>
              )}
              <div className="text-white">
                <h1 className="text-lg md:text-xl font-bold drop-shadow-lg leading-tight truncate max-w-[54vw] md:max-w-none">{store?.name || 'Restaurante'}</h1>
                <div className="flex items-center gap-1 md:hidden">
                  <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="text-xs font-medium">{getStatusDisplay.text}</span>
                </div>
              </div>
            </div>

            {/* Search - desktop sempre visível; mobile via ícone */}
            <div className={`absolute top-20 left-4 right-4 md:static md:flex-1 md:max-w-xl md:mx-4 z-30 ${(searchOpen || searchTerm) ? 'block' : 'hidden'} md:block`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80 md:text-muted-foreground" />
                <Input
                  placeholder="O que você procura hoje?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 md:h-10 text-base bg-white/90 md:bg-white/95 backdrop-blur-sm border-white/30 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="absolute top-4 right-4 md:static flex items-center gap-2 md:flex-shrink-0">
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="md:hidden p-2 rounded-full min-h-touch min-w-touch bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-white flex items-center justify-center"
                title="Pesquisar"
                aria-label="Pesquisar"
              >
                {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
              <ThemeToggle className="text-white hover:bg-white/20" />
              <div className="hidden md:flex items-center gap-2">
                <InstallAppButton pageName="Cardápio" compact />
                <button 
                  className="p-2 rounded-full min-h-touch min-w-touch bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-white flex items-center justify-center" 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: store?.name || 'Cardápio', text: `Confira o cardápio de ${store?.name || 'nosso restaurante'}`, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copiado!');
                    }
                  }}
                  title="Compartilhar"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button 
                  className={`p-0.5 rounded-full backdrop-blur-sm transition-all ${isAuthenticated ? 'bg-green-500/90 hover:bg-green-600' : 'bg-white/20 hover:bg-white/30'} text-white relative`}
                  onClick={() => {
                    if (isAuthenticated) setShowCustomerProfile(true);
                    else window.location.href = slug ? `/s/${slug}/login/cliente?returnUrl=${encodeURIComponent(window.location.pathname)}` : `/?returnUrl=${encodeURIComponent(window.location.pathname)}`;
                  }}
                  title={isAuthenticated ? "Meu Perfil" : "Entrar / Cadastrar"}
                >
                  {isAuthenticated && userProfilePicture ? (
                    <img 
                      src={userProfilePicture} 
                      alt="Perfil" 
                      className="w-8 h-8 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <User className="w-5 h-5 m-1.5" />
                  )}
                  {isAuthenticated && !userProfilePicture && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </button>
                <button 
                  className="p-2 rounded-full relative bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-white" 
                  onClick={() => openCartModal()}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Header - Apenas quando NÃO tem banner. Desktop: linha única com pesquisa rente */
        <header className="border-b border-border sticky top-0 z-40 pb-4 md:pb-2 lg:py-2 lg:pb-2 bg-card">
          <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-3 md:py-3 lg:px-6">
            {/* Desktop: logo | search | ícones em uma linha */}
            <div className="flex flex-col md:flex-row md:items-center md:gap-4 lg:flex-nowrap lg:justify-between lg:gap-6">
              <div className="flex items-center justify-between mb-4 md:mb-0 md:flex-shrink-0 lg:flex-shrink-0">
                <div className="flex items-center gap-3">
                  {store?.logo ? (
                    <img src={store?.logo} alt={store?.name || 'Restaurante'} className="w-16 h-16 md:w-14 md:h-14 rounded-xl object-cover shadow-md" />
                  ) : (
                    <div className="w-16 h-16 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-3xl shadow-md" style={{ backgroundColor: primaryColor }}>
                      🍽️
                    </div>
                  )}
                  <div>
                    <h1 className="font-bold text-xl md:text-lg text-foreground truncate max-w-[50vw] md:max-w-none">{store?.name || 'Restaurante'}</h1>
                    {store?.min_order_value > 0 && (
                      <p className="text-xs text-muted-foreground">Pedido mín. {formatCurrency(store?.min_order_value || 0)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 md:hidden">
                  <ThemeToggle />
                  <button onClick={() => setSearchOpen(v => !v)} className="p-2 rounded-lg min-h-touch min-w-touch text-muted-foreground hover:text-foreground" title="Pesquisar">
                    {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {/* Search - rente no desktop; collapsible no mobile */}
              <div className={`relative flex-1 md:max-w-xl md:mx-4 lg:max-w-[700px] lg:mx-auto lg:flex-1 ${searchOpen ? 'block' : 'hidden'} md:block`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder="O que você procura hoje?" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 text-base" autoFocus={searchOpen} />
              </div>
              {/* Ícones - ocultos no mobile (já estão na linha de cima); lg: destaque leve no carrinho */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0 lg:gap-1">
                <button className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => { if (navigator.share) { navigator.share({ title: store?.name || 'Cardápio', text: `Confira o cardápio de ${store?.name || 'nosso restaurante'}`, url: window.location.href }).catch(() => {}); } else { navigator.clipboard.writeText(window.location.href); toast.success('Link copiado!'); } }} title="Compartilhar"><Share2 className="w-5 h-5" /></button>
                <ThemeToggle className="text-muted-foreground hover:text-foreground hover:bg-muted" />
                <button 
                  className={`relative p-0.5 rounded-lg transition-all ${isAuthenticated ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'} text-white`} 
                  onClick={() => isAuthenticated ? setShowCustomerProfile(true) : (window.location.href = slug ? `/s/${slug}/login/cliente?returnUrl=${encodeURIComponent(window.location.pathname)}` : `/?returnUrl=${encodeURIComponent(window.location.pathname)}`)} 
                  title={isAuthenticated ? "Meu Perfil" : "Entrar"}
                >
                  {isAuthenticated && userProfilePicture ? (
                    <img 
                      src={userProfilePicture} 
                      alt="Perfil" 
                      className="w-8 h-8 rounded-full object-cover border-2 border-green-600"
                    />
                  ) : (
                    <>
                      <User className="w-5 h-5 m-1.5" />
                      {isAuthenticated && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span>}
                    </>
                  )}
                </button>
                <button className={`p-2 rounded-lg relative transition-colors text-muted-foreground hover:text-foreground hover:bg-muted lg:rounded-md ${cart.length > 0 ? 'lg:ring-2 lg:ring-primary/30 lg:bg-primary/5' : ''}`} onClick={() => openCartModal()}><ShoppingCart className="w-5 h-5" />{cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartItemsCount}</span>}</button>
              </div>
            </div>
            <div className="text-center mt-2 md:mt-1 lg:mt-1">
              <span className={`text-xs font-medium ${getStatusDisplay.color}`}>● {getStatusDisplay.text}</span>
            </div>
          </div>
        </header>
      )}

      {desktopCarouselMode && (
        <div className="border-b border-border bg-card">
          <div className={`max-w-7xl mx-auto px-4 lg:px-6 py-2`}>
            {selectedCategory === 'all' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-muted/20 p-3">
                  {desktopHighlights.length > 0 ? (
                    (() => {
                      const slide = desktopHighlights[Math.min(desktopHighlightIndex, desktopHighlights.length - 1)];
                      if (!slide) return null;
                      if (slide.type === 'promotion') {
                        const promo = slide.data;
                        const dish = dishesResolved.find(d => d.id === promo.offer_dish_id);
                        if (!dish) return null;
                        const discount = promo.original_price > promo.offer_price
                          ? Math.round(((promo.original_price - promo.offer_price) / promo.original_price) * 100)
                          : 0;
                        return (
                          <motion.div
                            key={promo.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22 }}
                            className="relative rounded-2xl overflow-hidden shadow cursor-pointer border-2"
                            style={{
                              borderColor: primaryColor + '40',
                              background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`
                            }}
                            onClick={() => handleDishClick(dish)}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                            <div className="relative p-3 flex items-center gap-3">
                              <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-white/20 shadow">
                                {dish.image ? (
                                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                                )}
                              </div>
                              <div className="flex-1 text-white min-w-0">
                                <Badge className="bg-yellow-400 text-black mb-1 font-bold h-5 px-2 text-[10px]">-{discount}%</Badge>
                                <p className="font-bold text-xs truncate">{promo.name}</p>
                                <p className="text-sm font-bold">{formatCurrency(promo.offer_price)}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }

                      const combo = slide.data;
                      const comboDish = comboDishesForDisplay.find((c) => String(c?.id) === `combo_${combo.id}`) || comboDishesForDisplay.find((c) => String(c?.id) === String(combo?.id));
                      if (!comboDish) return null;
                      return (
                        <motion.div
                          key={combo.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className="relative rounded-2xl overflow-hidden shadow cursor-pointer border-2"
                          style={{
                            borderColor: primaryColor + '40',
                            background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`
                          }}
                          onClick={() => handleDishClick(comboDish)}
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                          <div className="relative p-3 flex items-center gap-3">
                            <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-white/20 shadow">
                              {comboDish.image ? (
                                <img src={comboDish.image} alt={comboDish.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                              )}
                            </div>
                            <div className="flex-1 text-white min-w-0">
                              <Badge className="bg-yellow-400 text-black mb-1 font-bold h-5 px-2 text-[10px]">Combo</Badge>
                              <p className="font-bold text-xs truncate">{comboDish.name}</p>
                              <p className="text-sm font-bold">{formatCurrency(Number(comboDish.price || 0))}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()
                  ) : (
                    <div className="h-full" />
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden p-3">
                  {desktopBanners.length > 0 ? (
                    (() => {
                      const b = desktopBanners[Math.min(desktopBannerIndex, desktopBanners.length - 1)];
                      if (!b) return null;
                      return (
                        <motion.div
                          key={desktopBannerIndex}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className="relative w-full h-24 rounded-2xl overflow-hidden cursor-pointer"
                          onClick={() => {
                            if (b.link) window.open(b.link, '_blank');
                          }}
                        >
                          <img src={b.image} alt={b.title || 'Banner'} className="w-full h-full object-cover" />
                          {(b.title || b.subtitle) && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                              <div className="text-white">
                                {b.title && <p className="font-bold text-sm leading-tight">{b.title}</p>}
                                {b.subtitle && <p className="text-xs opacity-90 leading-tight">{b.subtitle}</p>}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })()
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1">
                <div className="rounded-2xl border border-border bg-muted/20 p-3 overflow-hidden">
                  {desktopHighlights.length > 0 ? (
                    (() => {
                      const slide = desktopHighlights[Math.min(desktopHighlightIndex, desktopHighlights.length - 1)];
                      if (!slide) return null;
                      if (slide.type === 'promotion') {
                        const promo = slide.data;
                        const dish = dishesResolved.find(d => d.id === promo.offer_dish_id);
                        if (!dish) return null;
                        const discount = promo.original_price > promo.offer_price
                          ? Math.round(((promo.original_price - promo.offer_price) / promo.original_price) * 100)
                          : 0;
                        return (
                          <motion.div
                            key={promo.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22 }}
                            className="relative rounded-2xl overflow-hidden shadow cursor-pointer border-2"
                            style={{
                              borderColor: primaryColor + '40',
                              background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`
                            }}
                            onClick={() => handleDishClick(dish)}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                            <div className="relative p-3 flex items-center gap-3">
                              <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-white/20 shadow">
                                {dish.image ? (
                                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                                )}
                              </div>
                              <div className="flex-1 text-white min-w-0">
                                <Badge className="bg-yellow-400 text-black mb-1 font-bold h-5 px-2 text-[10px]">-{discount}%</Badge>
                                <p className="font-bold text-xs truncate">{promo.name}</p>
                                <p className="text-sm font-bold">{formatCurrency(promo.offer_price)}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }

                      const combo = slide.data;
                      const comboDish = comboDishesForDisplay.find((c) => String(c?.id) === `combo_${combo.id}`) || comboDishesForDisplay.find((c) => String(c?.id) === String(combo?.id));
                      if (!comboDish) return null;
                      return (
                        <motion.div
                          key={combo.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className="relative rounded-2xl overflow-hidden shadow cursor-pointer border-2"
                          style={{
                            borderColor: primaryColor + '40',
                            background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`
                          }}
                          onClick={() => handleDishClick(comboDish)}
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                          <div className="relative p-3 flex items-center gap-3">
                            <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-white/20 shadow">
                              {comboDish.image ? (
                                <img src={comboDish.image} alt={comboDish.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                              )}
                            </div>
                            <div className="flex-1 text-white min-w-0">
                              <Badge className="bg-yellow-400 text-black mb-1 font-bold h-5 px-2 text-[10px]">Combo</Badge>
                              <p className="font-bold text-xs truncate">{comboDish.name}</p>
                              <p className="text-sm font-bold">{formatCurrency(Number(comboDish.price || 0))}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()
                  ) : desktopBanners.length > 0 ? (
                    (() => {
                      const b = desktopBanners[Math.min(desktopBannerIndex, desktopBanners.length - 1)];
                      if (!b) return null;
                      return (
                        <motion.div
                          key={desktopBannerIndex}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className="relative w-full h-24 rounded-2xl overflow-hidden cursor-pointer"
                          onClick={() => {
                            if (b.link) window.open(b.link, '_blank');
                          }}
                        >
                          <img src={b.image} alt={b.title || 'Banner'} className="w-full h-full object-cover" />
                        </motion.div>
                      );
                    })()
                  ) : (
                    <div className="h-24" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`bg-card border-b border-border z-30 ${desktopCarouselMode ? '' : 'sticky md:static'} ${store?.banner_image ? 'md:top-0 top-0' : 'md:top-[88px] top-[165px]'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between gap-3 md:py-3 py-4 lg:py-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 lg:px-4 lg:py-2 lg:rounded-lg lg:scale-100 lg:shadow-none ${
                  selectedCategory === 'all'
                    ? 'text-white shadow-lg scale-105 lg:border-b-2 lg:border-white/80 lg:rounded-b-none'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                style={selectedCategory === 'all' ? { backgroundColor: primaryColor, color: 'white' } : {}}
              >
                Todos
              </button>
              {categoriesResolvedForAllIslands.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 lg:px-4 lg:py-2 lg:rounded-lg lg:scale-100 lg:shadow-none ${
                    selectedCategory === cat.id
                      ? 'text-white shadow-lg scale-105 lg:border-b-2 lg:border-white/80 lg:rounded-b-none'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: primaryColor, color: 'white' } : {}}
                >
                  {cat.name}
                </button>
              ))}
              {pizzaCategoriesResolved?.length > 0 && pizzaCategoriesResolved.map((pc) => {
                const pcKey = `pc_${pc.id}`;
                const sz = pizzaSizesResolved?.find(s => s.id === pc.size_id);
                const label = pc.name || (sz ? `${sz.name} • ${pc.max_flavors || 1} sabor(es)` : pc.id);
                return (
                  <button
                    key={pcKey}
                    onClick={() => setSelectedCategory(pcKey)}
                    className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 lg:px-4 lg:py-2 lg:rounded-lg lg:scale-100 lg:shadow-none ${
                      selectedCategory === pcKey
                        ? 'text-white shadow-lg scale-105 lg:border-b-2 lg:border-white/80 lg:rounded-b-none'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    style={selectedCategory === pcKey ? { backgroundColor: primaryColor, color: 'white' } : {}}
                  >
                    {label}
                  </button>
                );
              })}
              {activeBeverages.length > 0 && (
                <>
                  {beverageCategoriesResolved?.length > 0 ? (
                    beverageCategoriesResolved.map((bc) => {
                      const bcKey = `bc_${bc.id}`;
                      return (
                        <button
                          key={bcKey}
                          onClick={() => setSelectedCategory(bcKey)}
                          className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 lg:px-4 lg:py-2 lg:rounded-lg lg:scale-100 lg:shadow-none ${
                            selectedCategory === bcKey
                              ? 'text-white shadow-lg scale-105 lg:border-b-2 lg:border-white/80 lg:rounded-b-none'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                          style={selectedCategory === bcKey ? { backgroundColor: primaryColor, color: 'white' } : {}}
                        >
                          {bc.name}
                        </button>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => setSelectedCategory('beverages')}
                      className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 lg:px-4 lg:py-2 lg:rounded-lg lg:scale-100 lg:shadow-none ${
                        selectedCategory === 'beverages'
                          ? 'text-white shadow-lg scale-105 lg:border-b-2 lg:border-white/80 lg:rounded-b-none'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      style={selectedCategory === 'beverages' ? { backgroundColor: primaryColor, color: 'white' } : {}}
                    >
                      Bebidas
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - lg: mais largura para grid denso */}
      <main className={desktopCarouselMode
        ? "flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 py-3 md:px-6 lg:max-w-[1600px]"
        : "flex-1 w-full max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 md:max-w-[1400px] lg:max-w-[1600px] lg:px-6"
      }>
        <div className={desktopCarouselMode ? 'h-full overflow-hidden flex flex-col min-h-0' : undefined}>
          {desktopCarouselMode ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {selectedCategory === 'all' ? (
                  <section className="h-full flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-bold text-base md:text-lg text-foreground border-l-4 pl-2" style={{ borderColor: primaryColor }}>Cardápio Completo</h2>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border items-center justify-center shadow"
                        onClick={() => {
                          const el = document.getElementById('all_islands_carousel');
                          if (!el) return;
                          el.scrollBy({ left: -700, behavior: 'smooth' });
                        }}
                        aria-label="Anterior"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur border border-border items-center justify-center shadow"
                        onClick={() => {
                          const el = document.getElementById('all_islands_carousel');
                          if (!el) return;
                          el.scrollBy({ left: 700, behavior: 'smooth' });
                        }}
                        aria-label="Próximo"
                      >
                        ›
                      </button>

                      <div
                        id="all_islands_carousel"
                        className="flex gap-4 overflow-x-auto scrollbar-hide pr-10 pl-10"
                        style={{ scrollSnapType: 'x mandatory' }}
                      >
                        {categoriesResolvedForAllIslands
                          .filter((cat) => cat?.is_active !== false)
                          .map((cat) => {
                            const items = (Array.isArray(activeDishes) ? activeDishes : [])
                              .filter((d) => d?.is_active !== false)
                              .filter((d) => d?.product_type !== 'beverage')
                              .filter((d) => (d?.product_type || 'dish') !== 'pizza')
                              .filter((d) => String(d?.category_id || '') === String(cat?.id || ''))
                              .filter((d) => !searchTerm || d?.name?.toLowerCase?.().includes(searchTerm.toLowerCase()));
                            if (items.length === 0) return null;

                            return (
                              <div
                                key={cat.id}
                                className="min-w-[560px] max-w-[560px] rounded-2xl border border-border bg-card shadow-sm p-4"
                                style={{ scrollSnapAlign: 'start' }}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-bold text-base text-foreground">{cat.name}</h3>
                                  <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedCategory(cat.id)}>
                                    Abrir
                                  </Button>
                                </div>
                                <div className="flex gap-3">
                                  {items.slice(0, 3).map((it) => (
                                    <MiniDishCard key={it.id} item={it} formatCurrency={formatCurrency} />
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                          {filteredGenericPizzaEntries.length > 0 && (
                            <div
                              className="min-w-[560px] max-w-[560px] rounded-2xl border border-border bg-card shadow-sm p-4"
                              style={{ scrollSnapAlign: 'start' }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-base text-foreground">Pizzas</h3>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => setSelectedCategory(`pc_${filteredGenericPizzaEntries[0]?.pizza_category_id}`)}
                                >
                                  Abrir
                                </Button>
                              </div>
                              <div className="flex gap-3">
                                {filteredGenericPizzaEntries.slice(0, 3).map((it) => (
                                  <MiniDishCard
                                    key={it.menu_entry_id || it.id}
                                    item={it}
                                    onClick={() => handleDishClick(it)}
                                    formatCurrency={formatCurrency}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {(Array.isArray(activeBeverages) ? activeBeverages : []).length > 0 && (
                            <div
                              className="min-w-[560px] max-w-[560px] rounded-2xl border border-border bg-card shadow-sm p-4"
                              style={{ scrollSnapAlign: 'start' }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-base text-foreground">Bebidas</h3>
                                <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedCategory('beverages')}>
                                  Abrir
                                </Button>
                              </div>
                              <div className="flex gap-3">
                                {filteredBeverages.slice(0, 3).map((it) => (
                                  <MiniDishCard key={it.id} item={it} formatCurrency={formatCurrency} />
                                ))}
                              </div>
                            </div>
                          )}

                          {comboDishesForDisplay.length > 0 && (
                            <div
                              className="min-w-[560px] max-w-[560px] rounded-2xl border border-border bg-card shadow-sm p-4"
                              style={{ scrollSnapAlign: 'start' }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-base text-foreground">Combos</h3>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    const first = comboDishesForDisplay[0];
                                    if (first) handleDishClick(first);
                                  }}
                                >
                                  Abrir
                                </Button>
                              </div>
                              <div className="flex gap-3">
                                {comboDishesForDisplay.slice(0, 3).map((it) => (
                                  <MiniDishCard key={it.id} item={it} formatCurrency={formatCurrency} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                  </section>
                ) : (
                  <section className="h-full flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2" />
                    <div className="flex-1 min-h-0">
                    <MenuLayoutWrapper
                      layout={layoutForSelectedCategoryDesktop}
                      dishes={filteredItemsForDisplay}
                      onDishClick={handleDishClick}
                      primaryColor={primaryColor}
                      textPrimaryColor={textPrimaryColor}
                      textSecondaryColor={textSecondaryColor}
                      loading={loadingDishes}
                      stockUtils={stockUtils}
                      formatCurrency={formatCurrency}
                      slug={slug}
                      gridColsDesktop={gridColsDesktop}
                      menuCardStyle={menuCardStyle}
                    />
                    </div>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              {/* Banners Configuráveis */}
              {(Array.isArray(store?.banners) ? store.banners : []).filter(b => b.active !== false && b.image).length > 0 && (
                <div className="mb-6 space-y-3">
                  {(Array.isArray(store?.banners) ? store.banners : []).filter(b => b.active !== false && b.image).map((banner, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative w-full h-32 md:h-40 rounded-2xl overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (banner.link) {
                          window.open(banner.link, '_blank');
                        }
                      }}
                    >
                      <img 
                        src={banner.image} 
                        alt={banner.title || 'Banner promocional'} 
                        className="w-full h-full object-cover"
                      />
                      {(banner.title || banner.subtitle) && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                          <div className="text-white">
                            {banner.title && (
                              <h3 className="font-bold text-lg md:text-xl mb-1">{banner.title}</h3>
                            )}
                            {banner.subtitle && (
                              <p className="text-sm md:text-base opacity-90">{banner.subtitle}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}

              {showLegacyPromotionSurface && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-start" data-section="promotions">
                  <PromotionBanner
                    promotions={activePromotions}
                    dishes={dishesResolved}
                    primaryColor={primaryColor}
                    onSelectPromotion={setSelectedDish}
                    store={store}
                    autoplayIntervalMs={autoplayIntervalMs}
                  />

                  {comboDishesForDisplay.length > 0 && (
                    <section className="mb-6 md:mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5" style={{ color: primaryColor }} />
                        <h2 className="font-bold text-base md:text-lg text-foreground">Combos</h2>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {visibleCombosSlides.map((combo, slotIdx) => (
                          <motion.div
                            key={`${combo.id}_${slotIdx}_${comboBannerIndex}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22 }}
                            whileHover={{ y: -4, scale: 1.02 }}
                            className="relative h-32 rounded-2xl overflow-hidden shadow-lg cursor-pointer border-2"
                            style={{
                              borderColor: primaryColor + '40',
                              background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}bb)`
                            }}
                            onClick={() => handleDishClick(combo)}
                          >
                            <div className="absolute inset-0 bg-black/30" />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                            <div className="relative p-4 flex items-center gap-4">
                              <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-white/20 shadow-lg">
                                {combo.image ? (
                                  <img src={combo.image} alt={combo.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                                )}
                              </div>
                              <div className="flex-1 text-white min-w-0" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                                <Badge className="bg-white/90 text-black mb-2 font-bold">
                                  Combo
                                </Badge>
                                <h3 className="font-bold text-base mb-1 truncate">{combo.name}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xl font-bold">{formatCurrency(combo.price)}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Botão de Cadastro Opcional - Apenas se não estiver autenticado */}
              {!isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          Cadastre-se gratuitamente
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Ganhe pontos, promoções exclusivas e muito mais
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => {
                          window.location.href = slug
                            ? `/s/${slug}/login/cliente?returnUrl=${encodeURIComponent(window.location.pathname)}`
                            : `/?returnUrl=${encodeURIComponent(window.location.pathname)}`;
                        }}
                        variant="outline"
                        className="text-sm font-medium px-4 py-2 h-auto whitespace-nowrap w-full sm:w-auto"
                      >
                        Entrar
                      </Button>
                      <Button
                        onClick={() => setShowQuickSignup(true)}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-medium px-4 py-2 h-auto whitespace-nowrap w-full sm:w-auto"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Cadastrar-se
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              <RecentOrders
                dishes={activeDishes}
                onSelectDish={setSelectedDish}
                primaryColor={primaryColor}
              />

              {showCommercialSections && commercialSections.length > 0 && (
                <section className="mb-6 md:mb-8 space-y-6" data-section="promotions">
                  {commercialSections.map((section) => {
                    const SectionIcon = section.icon;
                    return (
                      <div key={section.id} className="rounded-2xl border border-border/70 bg-card/70 p-4 md:p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <h2 className="font-bold text-base md:text-lg text-foreground flex items-center gap-2">
                              <SectionIcon className="w-5 h-5" style={{ color: primaryColor }} />
                              {section.title}
                            </h2>
                            <p className="text-xs md:text-sm text-muted-foreground mt-1">
                              {section.subtitle}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium border"
                            style={{ borderColor: `${primaryColor}55`, color: primaryColor }}
                          >
                            {section.items.length} itens
                          </Badge>
                        </div>
                        <MenuLayoutWrapper
                          layout={menuLayout}
                          dishes={section.items}
                          onDishClick={handleDishClick}
                          primaryColor={primaryColor}
                          textPrimaryColor={textPrimaryColor}
                          textSecondaryColor={textSecondaryColor}
                          loading={loadingDishes}
                          stockUtils={stockUtils}
                          formatCurrency={formatCurrency}
                          slug={slug}
                          gridColsDesktop={gridColsDesktop}
                          autoplayIntervalMs={autoplayIntervalMs}
                          menuCardStyle={menuCardStyle}
                        />
                      </div>
                    );
                  })}
                </section>
              )}

              {/* Highlights */}
              {highlightDishes.length > 0 && (
                <section className="mb-6 md:mb-8">
                  <div className="flex items-center gap-2 mb-4 md:mb-4">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <h2 className="font-bold text-base md:text-lg text-foreground">Pratos do Dia</h2>
                  </div>
                  <div className={`grid grid-cols-2 md:grid-cols-3 ${Number(gridColsDesktop) === 2 ? 'lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2' : Number(gridColsDesktop) === 3 ? 'lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3' : Number(gridColsDesktop) === 4 ? 'lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4' : Number(gridColsDesktop) === 5 ? 'lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5' : 'lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'} gap-4 md:gap-3 lg:gap-3 xl:gap-3`}>
                    {highlightDishes.map((dish, index) => {
                      return (
                        <DishCardWow
                          key={dish.id}
                          dish={dish}
                          onClick={handleDishClick}
                          index={index}
                          primaryColor={primaryColor}
                          textPrimaryColor={textPrimaryColor}
                          slug={slug}
                          gridColsDesktop={gridColsDesktop}
                          menuCardStyle={menuCardStyle}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
          </>
        )}

        {/* All Dishes / Bebidas */}
        {!desktopCarouselMode && (
          <AnimatePresence mode="sync">
            <motion.div
              key="static"
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              {selectedCategory === 'all' ? (
                <section>
                  <h2 className="font-bold text-base md:text-lg mb-4 text-foreground border-l-4 pl-2" style={{ borderColor: primaryColor }}>Cardápio Completo</h2>

                  <>
                    {categoriesResolvedForAllIslands
                      .filter((cat) => cat?.is_active !== false)
                      .map((cat) => {
                        const items = (Array.isArray(activeDishes) ? activeDishes : [])
                          .filter((d) => d?.is_active !== false)
                          .filter((d) => d?.product_type !== 'beverage')
                          .filter((d) => (d?.product_type || 'dish') !== 'pizza')
                          .filter((d) => String(d?.category_id || '') === String(cat?.id || ''))
                          .filter((d) => !searchTerm || d?.name?.toLowerCase?.().includes(searchTerm.toLowerCase()));

                        if (items.length === 0) return null;

                        return (
                          <div key={cat.id} className="mb-6 md:mb-8">
                            <div className="flex items-center gap-2 mb-4">
                              {(() => { const n = (cat.name||'').toLowerCase(); if (n.includes('bebida')||n.includes('refriger')||n.includes('suco')||n.includes('drink')) return <Droplets className="w-4 h-4 flex-shrink-0" style={{color:primaryColor}} />; if (n.includes('especial')||n.includes('destaque')||n.includes('chef')) return <Sparkles className="w-4 h-4 flex-shrink-0" style={{color:primaryColor}} />; if (n.includes('pizza')||n.includes('massa')) return <Flame className="w-4 h-4 flex-shrink-0" style={{color:primaryColor}} />; return <UtensilsCrossed className="w-4 h-4 flex-shrink-0" style={{color:primaryColor}} />; })()}
                              <h3 className="font-bold text-base md:text-lg text-foreground border-l-4 pl-2" style={{ borderColor: primaryColor }}>{cat.name}</h3>
                              <span className="text-xs text-muted-foreground">({items.length})</span>
                            </div>
                            <MenuLayoutWrapper
                              layout={menuLayout}
                              dishes={items}
                              onDishClick={handleDishClick}
                              primaryColor={primaryColor}
                              textPrimaryColor={textPrimaryColor}
                              textSecondaryColor={textSecondaryColor}
                              loading={loadingDishes}
                              stockUtils={stockUtils}
                              formatCurrency={formatCurrency}
                              slug={slug}
                              gridColsDesktop={gridColsDesktop}
                              autoplayIntervalMs={autoplayIntervalMs}
                              menuCardStyle={menuCardStyle}
                            />
                          </div>
                        );
                      })}

                    {filteredGenericPizzaEntries.length > 0 && (
                      <div className="mb-6 md:mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Flame className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                          <h3 className="font-bold text-base md:text-lg text-foreground border-l-4 pl-2" style={{ borderColor: primaryColor }}>
                            Pizzas
                          </h3>
                          <span className="text-xs text-muted-foreground">({filteredGenericPizzaEntries.length})</span>
                        </div>
                        <MenuLayoutWrapper
                          layout={menuLayout}
                          dishes={filteredGenericPizzaEntries}
                          onDishClick={handleDishClick}
                          primaryColor={primaryColor}
                          textPrimaryColor={textPrimaryColor}
                          textSecondaryColor={textSecondaryColor}
                          loading={loadingDishes}
                          stockUtils={stockUtils}
                          formatCurrency={formatCurrency}
                          slug={slug}
                          gridColsDesktop={gridColsDesktop}
                          autoplayIntervalMs={autoplayIntervalMs}
                          menuCardStyle={menuCardStyle}
                        />
                      </div>
                    )}

                    {beverageCategoriesResolved
                      .filter((cat) => cat?.is_active !== false)
                      .map((cat) => {
                        const items = (Array.isArray(activeBeverages) ? activeBeverages : [])
                          .filter((b) => b?.is_active !== false)
                          .filter((b) => String(b?.category_id || '') === String(cat?.id || ''))
                          .filter((b) => !searchTerm || b?.name?.toLowerCase?.().includes(searchTerm.toLowerCase()));

                        if (items.length === 0) return null;

                        return (
                          <div key={`bev_${cat.id}`} className="mb-6 md:mb-8">
                            <div className="flex items-center gap-2 mb-4">
                              <Droplets className="w-4 h-4 flex-shrink-0" style={{color:primaryColor}} />
                              <h3 className="font-bold text-base md:text-lg text-foreground border-l-4 pl-2" style={{ borderColor: primaryColor }}>{cat.name}</h3>
                              <span className="text-xs text-muted-foreground">({items.length})</span>
                            </div>
                            <MenuLayoutWrapper
                              layout={menuLayout}
                              dishes={items}
                              onDishClick={handleDishClick}
                              primaryColor={primaryColor}
                              textPrimaryColor={textPrimaryColor}
                              textSecondaryColor={textSecondaryColor}
                              loading={loadingDishes}
                              stockUtils={stockUtils}
                              formatCurrency={formatCurrency}
                              slug={slug}
                              gridColsDesktop={gridColsDesktop}
                              autoplayIntervalMs={autoplayIntervalMs}
                              menuCardStyle={menuCardStyle}
                            />
                          </div>
                        );
                      })}
                  </>

                  {!loadingDishes && (Array.isArray(filteredItemsForDisplay) ? filteredItemsForDisplay : []).length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground">Nenhum prato encontrado</p>
                    </div>
                  )}
                </section>
              ) : (
                <section>
                  <h2 className="font-bold text-base md:text-lg mb-4 md:mb-4 text-foreground">
                    {selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_')
                      ? (selectedCategory?.startsWith?.('bc_')
                          ? beverageCategoriesResolved?.find(c => c.id === selectedCategory.replace(/^bc_/, ''))?.name || 'Bebidas'
                          : 'Bebidas')
                      : selectedCategory?.startsWith?.('pc_')
                        ? (() => {
                            const pcId = selectedCategory.replace(/^pc_/, '');
                            const pc = pizzaCategoriesResolved?.find(c => c.id === pcId);
                            const sz = pc ? pizzaSizesResolved?.find(s => s.id === pc.size_id) : null;
                            return pc?.name || (pc && sz ? `${sz.name} • ${pc.max_flavors || 1} sabor(es)` : 'Pizzas');
                          })()
                        : categoriesResolved.find(c => c.id === selectedCategory)?.name || 'Pratos'}
                  </h2>
                  <MenuLayoutWrapper
                    layout={menuLayout}
                    dishes={filteredItemsForDisplay}
                    onDishClick={handleDishClick}
                    primaryColor={primaryColor}
                    textPrimaryColor={textPrimaryColor}
                    textSecondaryColor={textSecondaryColor}
                    loading={loadingDishes}
                    stockUtils={stockUtils}
                    formatCurrency={formatCurrency}
                    slug={slug}
                    gridColsDesktop={gridColsDesktop}
                    autoplayIntervalMs={autoplayIntervalMs}
                    menuCardStyle={menuCardStyle}
                  />
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        )}
        </div>
      </main>

      {/* Bottom Navigation Bar - Barra de Navegação Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 md:hidden shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-all active:scale-95"
            title="Início"
          >
            <Home className="w-6 h-6" />
          </button>
          
          {store?.whatsapp && (
            <a 
              href={`https://wa.me/55${store?.whatsapp?.replace(/\D/g, '') || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center flex-1 h-full text-green-500 hover:text-green-600 transition-all active:scale-95"
              title="WhatsApp"
            >
              {/* Ícone Oficial do WhatsApp */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </a>
          )}
          
          <button
            onClick={() => {
              const promotionsSection = document.querySelector('[data-section="promotions"]');
              if (promotionsSection) {
                promotionsSection.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-all active:scale-95"
            title="Promoções"
          >
            <Gift className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => openCartModal()}
            className="flex items-center justify-center flex-1 h-full relative transition-all active:scale-95"
            style={{ color: cart.length > 0 ? primaryColor : 'hsl(var(--muted-foreground))' }}
            title="Carrinho"
          >
            <span className="relative inline-flex">
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[1.1rem] h-[1.1rem] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg">
                  {cartItemsCount}
                </span>
              )}
            </span>
          </button>

          <button
            onClick={() => isAuthenticated ? setShowCustomerProfile(true) : (window.location.href = slug ? `/s/${slug}/login/cliente?returnUrl=${encodeURIComponent(window.location.pathname)}` : `/?returnUrl=${encodeURIComponent(window.location.pathname)}`)}
            className="flex items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-all active:scale-95"
            title={isAuthenticated ? "Meu Perfil" : "Entrar"}
          >
            <span className="relative inline-flex items-center justify-center">
              {isAuthenticated && userProfilePicture ? (
                <img
                  src={userProfilePicture}
                  alt="Perfil"
                  className="w-6 h-6 rounded-full object-cover border border-border"
                />
              ) : (
                <User className="w-6 h-6" />
              )}
              {isAuthenticated && !userProfilePicture && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border border-card" />
              )}
            </span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      {!desktopCarouselMode && (
      <footer className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Bloco Esquerdo: Logo + Nome + Endereço + Horário */}
            <div className="flex items-center gap-3 min-w-0">
              {store?.logo && (
                <img src={store?.logo} alt={store?.name || 'Restaurante'} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{store?.name || 'Restaurante'}</p>
                {store?.slogan && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs italic truncate">"{store?.slogan}"</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {store?.address && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: primaryColor }} />
                      <span className="truncate">{store?.address}</span>
                    </span>
                  )}
                  {store?.opening_time && store?.closing_time && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3 flex-shrink-0" style={{ color: primaryColor }} />
                      {store?.opening_time} - {store?.closing_time}
                      {store?.working_days && store.working_days.length > 0 && (() => {
                        const daysMap = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
                        const names = store.working_days.sort((a,b)=>a-b).map(d=>daysMap[d]);
                        if (names.length===7) return ' • Todos os dias';
                        if (names.length===5 && names.join(',')===('Seg,Ter,Qua,Qui,Sex')) return ' • Seg–Sex';
                        if (names.length===6 && names.join(',')===('Seg,Ter,Qua,Qui,Sex,Sáb')) return ' • Seg–Sáb';
                        return ` • ${names.join(', ')}`;
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco Direito: Ícones de redes sociais apenas */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500 mr-1 hidden sm:inline">Siga-nos</span>
              <div className="flex gap-2">
                {store?.whatsapp && (
                  <a 
                    href={`https://wa.me/55${store?.whatsapp?.replace(/\D/g, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </a>
                )}
                {store?.instagram && (
                  <a 
                    href={store?.instagram?.startsWith('http') ? store.instagram : `https://instagram.com/${store?.instagram?.replace(/^@/, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {store?.facebook && (
                  <a 
                    href={store?.facebook?.startsWith('http') ? store.facebook : `https://facebook.com/${store?.facebook || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {store?.tiktok && (
                  <a 
                    href={store?.tiktok?.startsWith('http') ? store.tiktok : `https://tiktok.com/@${store?.tiktok?.replace(/^@/, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 bg-black hover:bg-gray-800 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="TikTok"
                  >
                    <Music2 className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 mt-3 pt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">&copy; {new Date().getFullYear()} {store?.name || 'Restaurante'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Powered by <span className="font-semibold" style={{ color: primaryColor }}>{SYSTEM_NAME}</span></p>
          </div>
        </div>
      </footer>
      )}

      {desktopCarouselMode && (
        <div className="hidden lg:flex items-center justify-between gap-4 px-6 py-2 border-t border-border bg-card text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
            <span className="truncate">
              {store?.working_days && store.working_days.length > 0 ? store.working_days.join(' • ') : 'Funcionamento'}
              {store?.opening_time && store?.closing_time ? ` — ${store.opening_time} - ${store.closing_time}` : ''}
            </span>
          </div>
          <div className="text-center font-medium text-foreground/80">
            {SYSTEM_NAME}
          </div>
          <div className="flex items-center gap-2">
            {store?.instagram && (
              <a 
                href={store?.instagram?.startsWith('http') ? store.instagram : `https://instagram.com/${store?.instagram?.replace(/^@/, '') || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {store?.facebook && (
              <a 
                href={store?.facebook?.startsWith('http') ? store.facebook : `https://facebook.com/${store?.facebook || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {store?.tiktok && (
              <a 
                href={store?.tiktok?.startsWith('http') ? store.tiktok : `https://tiktok.com/@${store?.tiktok?.replace(/^@/, '') || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="TikTok"
              >
                <Music2 className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}
      

      {/* Modals */}
      <CartModal
        isOpen={showCartModal}
        onClose={() => handleCartModalDismiss('close_cart')}
        onBack={() => handleCartModalDismiss('back_cart')}
        mobileFullScreen={isMobileViewport}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onEditItem={handleEditCartItem}
        onEditPizza={handleEditPizza}
        onCheckout={() => {
          if (Array.isArray(cartUpsellSuggestions) && cartUpsellSuggestions.length > 0 && !cartSuggestionAcceptedRef.current) {
            const ids = cartUpsellSuggestions.map((dish) => String(dish?.id || '')).filter(Boolean);
            const key = `cart_skip:continue_checkout:${ids.join(',')}:${Math.round(Number(cartTotal || 0) * 100)}`;
            void trackCommercialEventOnce(COMMERCIAL_EVENTS.UPSELL_SKIPPED, key, {
              source: 'cart_suggestions',
              reason: 'continue_checkout',
              dish_ids: ids,
              suggestion_count: ids.length,
              cart_total: Number(cartTotal || 0)
            });
          }
          void trackCommercialEvent(COMMERCIAL_EVENTS.CHECKOUT_STARTED, {
            cart_items_count: Number(cartItemsCount || 0),
            cart_total: Number(cartTotal || 0),
            suggestion_count: Array.isArray(cartUpsellSuggestions) ? cartUpsellSuggestions.length : 0
          });
          closeCartModal();
          setCurrentView('checkout');
        }}
        smartSuggestions={cartUpsellSuggestions}
        smartNudgeMain={cartSmartNudgeMain}
        smartNudgeSecondary={cartSmartNudgeSecondary}
        enableSmartSuggestions={cartSuggestionsEnabled}
        onSelectSuggestion={(suggestedDish) => {
          handleCommercialSuggestion(suggestedDish, 'cart');
        }}
        primaryColor={primaryColor}
        store={store}
        onReviewBonus={applyReviewBonus}
      />

      <NewDishModal
        isOpen={!!selectedDish}
        onClose={closeDishDetails}
        onBack={() => closeDishDetails()}
        mobileFullScreen={isMobileViewport}
        dish={selectedDish}
        complementGroups={complementGroupsResolved}
        onAddToCart={handleAddToCart}
        editingItem={editingCartItem}
        primaryColor={primaryColor}
      />

      {/* Modal específico para bebidas */}
      <BeverageModal
        beverage={selectedBeverage}
        isOpen={!!selectedBeverage}
        onClose={closeBeverageDetails}
        onBack={() => closeBeverageDetails()}
        mobileFullScreen={isMobileViewport}
        onAddToCart={handleAddToCart}
        primaryColor={primaryColor}
      />

      {selectedPizza && (
        <PizzaBuilderV2
          dish={selectedPizza}
          sizes={pizzaSizesResolved}
          flavors={pizzaFlavorsResolved}
          edges={pizzaEdgesResolved}
          extras={pizzaExtrasResolved}
          categories={pizzaCategoriesResolved}
          onAddToCart={handleAddToCart}
          onClose={closePizzaBuilder}
          primaryColor={primaryColor}
          editingItem={editingCartItem}
          store={store}
        />
      )}

      <OrderHistoryModal
        isOpen={showOrderHistory}
        onClose={closeOrderHistoryModal}
        onBack={() => closeOrderHistoryModal()}
        mobileFullScreen={isMobileViewport}
        primaryColor={primaryColor}
        onReorder={(order) => {
          // Adicionar todos os itens do pedido anterior ao carrinho
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              // Reconstruir o item no formato esperado pelo carrinho
              const cartItem = {
                dish: item.dish,
                selections: item.selections || {},
                totalPrice: item.totalPrice,
                quantity: item.quantity || 1
              };
              addItem(cartItem);
            });
          }
        }}
      />

      <WelcomeDiscountModal
        isOpen={showWelcomeDiscount}
        onClose={() => setShowWelcomeDiscount(false)}
        onApplyCoupon={(code) => handleApplyCoupon(code)}
        primaryColor={primaryColor}
        slug={slug}
        coupon={welcomeCoupon}
      />

      <ComboBuilderModal
        open={!!selectedCombo}
        onOpenChange={(open) => {
          if (!open) setSelectedCombo(null);
        }}
        combo={selectedCombo}
        dishes={dishesResolved}
        categories={categoriesResolved}
        beverageCategories={beverageCategoriesResolved}
        pizzaCategories={pizzaCategoriesResolved}
        complementGroups={complementGroupsResolved}
        primaryColor={primaryColor}
        onAddToCart={handleAddToCart}
      />

      <ReferralCodeModal
        isOpen={showReferralCode}
        onClose={() => setShowReferralCode(false)}
        referralCode={loyaltyData?.referralCode || ''}
        onApplyReferralCode={applyReferralCode}
        primaryColor={primaryColor}
      />

      {/* 🎯 Cross-sell Inteligente */}
      {currentView === 'menu' && !showUpsellModal && cartUpsellSuggestions.length === 0 && (
        <SmartUpsell
          cart={cart}
          dishes={dishesResolved}
          onAddToCart={handleAddToCart}
          primaryColor={primaryColor}
          store={store}
        />
      )}

      <CustomerProfileModal
        isOpen={showCustomerProfile}
        onClose={() => setShowCustomerProfile(false)}
        primaryColor={primaryColor}
      />

      <QuickSignupModal
        isOpen={showQuickSignup}
        onClose={() => setShowQuickSignup(false)}
        onSuccess={(user) => {
          setIsAuthenticated(true);
          setUserEmail(user?.email || null);
          toast.success('Bem-vindo! Agora você pode aproveitar todos os benefícios.');
        }}
        returnUrl={window.location.pathname}
      />

      <UpsellModal
        isOpen={showUpsellModal && cartUpsellSuggestions.length === 0}
        onClose={handleUpsellDecline}
        promotions={upsellPromotions}
        dishes={dishesResolved}
        onAccept={handleUpsellAccept}
        onDecline={handleUpsellDecline}
        primaryColor={primaryColor}
      />

      {currentView === 'checkout' && (
        <CheckoutView
          cart={cart}
          customer={customer}
          setCustomer={setCustomer}
          onBack={handleCheckoutBack}
          onSendWhatsApp={handleSendWhatsApp}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          appliedCoupon={appliedCoupon}
          couponError={couponError}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          deliveryZones={deliveryZonesResolved}
          store={store}
          loyaltyConfigs={loyaltyConfigsResolved}
          primaryColor={primaryColor}
          userEmail={userEmail}
          slug={slug}
          checkoutSuggestion={checkoutMerchandisingSuggestion}
          checkoutNudge={checkoutSmartNudge}
          onCheckoutSuggestion={(suggestedDish) => {
            handleCommercialSuggestion(suggestedDish, 'checkout');
          }}
        />
      )}

      {/* ❤️ Favoritos - Lista em Sheet */}
      {currentView === 'menu' && slug && (
        <Sheet open={showFavoritesList} onOpenChange={setShowFavoritesList}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Meus Favoritos
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FavoritesList
                dishes={[...(dishesResolved || []), ...(activeBeverages || [])].filter(Boolean)}
                onDishClick={(dish) => {
                  setShowFavoritesList(false);
                  handleDishClick(dish);
                }}
                slug={slug}
                primaryColor={primaryColor}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* FAB único: ao clicar abre opções em vertical (Chat e Favoritos) */}
      {currentView === 'menu' && (
        <div className="fixed bottom-20 right-2 z-[45] flex flex-col items-center gap-2">
          <AnimatePresence>
            {showFloatingMenu && (
              <>
                {/* Favoritos (topo) */}
                {slug && (
                  <motion.button
                    initial={{ opacity: 0, y: 8, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={() => {
                      setShowFloatingMenu(false);
                      setShowFavoritesList(true);
                    }}
                    className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:shadow-2xl transition-all"
                    aria-label="Favoritos"
                  >
                    <Heart className="w-6 h-6 text-red-500" />
                  </motion.button>
                )}
                {/* Chat */}
                <motion.button
                  initial={{ opacity: 0, y: 8, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.05 }}
                  onClick={() => {
                    setShowFloatingMenu(false);
                    handleChatOpenChange(true);
                  }}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:shadow-2xl transition-all"
                  aria-label="Chat"
                >
                  <MessageSquare className="w-6 h-6" />
                </motion.button>
              </>
            )}
          </AnimatePresence>
          {/* Botão principal: abre/fecha o menu */}
          <motion.button
            onClick={() => setShowFloatingMenu((v) => !v)}
            className="text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all"
            style={{ backgroundColor: primaryColor }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={showFloatingMenu ? 'Fechar menu' : 'Abrir atalhos'}
          >
            <LayoutGrid className="w-6 h-6" />
          </motion.button>
        </div>
      )}

      {/* 🤖 Chatbot com IA (controlado pelo FAB) */}
      {currentView === 'menu' && (
        <AIChatbot
          dishes={dishesResolved}
          categories={categoriesResolved}
          complementGroups={complementGroupsResolved}
          deliveryZones={deliveryZonesResolved}
          store={store}
          onAddToCart={handleAddToCart}
          onOrderCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['customerOrdersForChatbot'] });
            queryClient.invalidateQueries({ queryKey: ['customerOrders'] });
          }}
          open={chatOpen}
          onOpenChange={handleChatOpenChange}
          slug={slug}
          storeName={store?.name}
          primaryColor={primaryColor}
        />
      )}

    </div>
  );
}
