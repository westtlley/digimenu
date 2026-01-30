import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Search, Clock, Star, Share2, MapPin, Info, Home, Receipt, Gift, User, MessageSquare, UtensilsCrossed, Instagram, Facebook, Phone, Package } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Components
import NewDishModal from '../components/menu/NewDishModal';
import PizzaBuilder from '../components/pizza/PizzaBuilder';
import CartModal from '../components/menu/CartModal';
import CheckoutView from '../components/menu/CheckoutView';
import OrderConfirmationModal from '../components/menu/OrderConfirmationModal';
import OrderHistoryModal from '../components/menu/OrderHistoryModal';
import UpsellModal from '../components/menu/UpsellModal';
import DishSkeleton from '../components/menu/DishSkeleton';
import DishCardWow from '../components/menu/DishCardWow';
import PromotionBanner from '../components/menu/PromotionBanner';
import RecentOrders from '../components/menu/RecentOrders';
import UserAuthButton from '../components/atoms/UserAuthButton';
import CustomerProfileModal from '../components/customer/CustomerProfileModal';
import StoreClosedOverlay from '../components/menu/StoreClosedOverlay';
import ThemeToggle from '../components/ui/ThemeToggle';
import QuickSignupModal from '../components/menu/QuickSignupModal';

// Hooks
import { useCart } from '@/components/hooks/useCart';
import { useStoreStatus } from '@/components/hooks/useStoreStatus';
import { useUpsell } from '@/components/hooks/useUpsell';
import { useCoupons } from '@/components/hooks/useCoupons';
import { useCustomer } from '@/components/hooks/useCustomer';
import { useDocumentHead } from '@/hooks/useDocumentHead';

// Services & Utils
import { orderService } from '@/components/services/orderService';
import { whatsappService } from '@/components/services/whatsappService';
import { stockUtils } from '@/components/utils/stockUtils';
import { formatCurrency } from '@/components/utils/formatters';

/** Landing quando não há slug: / ou /cardapio — não exibe cardápio de nenhum estabelecimento. */
function CardapioSemLink() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center max-w-md p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-orange-500/10">
          <UtensilsCrossed className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">DigiMenu</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          O cardápio digital é acessado pelo link do estabelecimento: <strong>/s/nome-do-restaurante</strong>
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          Ex.: /s/raiz-maranhense
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/Assinar" className="px-4 py-2.5 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors">
            Assinar DigiMenu
          </Link>
          <Link to="/login/assinante" className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Já tenho conta
          </Link>
        </div>
        <a href="/" className="mt-4 inline-block text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500">Voltar ao início</a>
      </div>
    </div>
  );
}

export default function Cardapio() {
  const { slug } = useParams(); // link do assinante: /s/meu-restaurante
  const navigate = useNavigate();
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCartModal, setShowCartModal] = useState(false);
  const [currentView, setCurrentView] = useState('menu');
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showCustomerProfile, setShowCustomerProfile] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showQuickSignup, setShowQuickSignup] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  // Custom Hooks
  const { cart, addItem, updateItem, removeItem, updateQuantity, clearCart, cartTotal, cartItemsCount } = useCart();
  const { customer, setCustomer, clearCustomer } = useCustomer();

  // Cardápio público por link (sem login) — /s/:slug
  const { data: publicData, isLoading: publicLoading, isError: publicError, error: publicErrorDetails } = useQuery({
    queryKey: ['publicCardapio', slug],
    queryFn: async () => {
      try {
        const result = await base44.get(`/public/cardapio/${slug}`);
        return result;
      } catch (error) {
        console.error('❌ [Cardapio] Erro ao buscar cardápio público:', error);
        console.error('❌ [Cardapio] Slug:', slug);
        console.error('❌ [Cardapio] Endpoint:', `/public/cardapio/${slug}`);
        throw error;
      }
    },
    enabled: !!slug,
    retry: false, // Não tentar novamente em caso de erro
  });

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
    refetchOnMount: 'always',
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
  const store = _pub?.store || stores?.[0] || { name: 'Sabor do Dia', is_open: true };
  const dishesResolved = _pub?.dishes ?? dishes ?? [];
  const categoriesResolved = _pub?.categories ?? categories ?? [];
  const complementGroupsResolved = _pub?.complementGroups ?? complementGroups ?? [];
  const pizzaSizesResolved = _pub?.pizzaSizes ?? pizzaSizes ?? [];
  const pizzaFlavorsResolved = _pub?.pizzaFlavors ?? pizzaFlavors ?? [];
  const pizzaEdgesResolved = _pub?.pizzaEdges ?? pizzaEdges ?? [];
  const pizzaExtrasResolved = _pub?.pizzaExtras ?? pizzaExtras ?? [];
  const deliveryZonesResolved = _pub?.deliveryZones ?? deliveryZones ?? [];
  const couponsResolved = _pub?.coupons ?? coupons ?? [];
  const promotionsResolved = _pub?.promotions ?? promotions ?? [];
  const loadingDishes = slug ? publicLoading : dishesLoading;

  useDocumentHead(store);

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data)
  });

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data)
  });

  // Link /s/:slug inválido (404, 429, 503, etc.)
  if (slug && publicError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md p-6 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xl font-medium text-gray-800 dark:text-gray-100">Link não encontrado</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Este cardápio não existe ou o link está incorreto. Verifique com o estabelecimento.</p>
          <Link to="/Assinar" className="mt-6 inline-block px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600">Assinar DigiMenu</Link>
        </div>
      </div>
    );
  }

  const primaryColor = store.theme_primary_color || '#f97316';
  const headerBg = store.theme_header_bg || '#ffffff';
  const headerText = store.theme_header_text || '#000000';

  // Store Status
  const { isStoreUnavailable, isStoreClosed, isStorePaused, isAutoModeClosed, getNextOpenTime, getStatusDisplay } = useStoreStatus(store);
  const isStoreOpen = !isStoreUnavailable && !isStoreClosed && !isStorePaused;

  // Coupons
  const { couponCode, setCouponCode, appliedCoupon, couponError, validateAndApply, removeCoupon, calculateDiscount } = useCoupons(couponsResolved, cartTotal);

  // Upsell
  const { showUpsellModal, upsellPromotions, checkUpsell, resetUpsell, closeUpsell } = useUpsell(promotionsResolved, cartTotal);

  // Memoized calculations
  const activeDishes = useMemo(() => {
    const safeDishes = Array.isArray(dishesResolved) ? dishesResolved : [];
    // Filtra apenas pratos ativos E que tenham nome e preço definidos
    return safeDishes.filter((d) => {
      if (d.is_active === false) return false;
      if (!d.name || d.name.trim() === '') return false;
      
      // Para pizzas, verificar se tem tamanhos e sabores configurados
      if (d.product_type === 'pizza') {
        if (pizzaSizesResolved.length === 0 || pizzaFlavorsResolved.length === 0) return false;
      } else {
        // Para outros produtos, verificar se tem preço
        if (d.price === null || d.price === undefined) return false;
      }
      
      return true;
    });
  }, [dishesResolved, pizzaSizesResolved, pizzaFlavorsResolved]);
  const highlightDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    return safeActiveDishes.filter((d) => d.is_highlight);
  }, [activeDishes]);
  const activePromotions = useMemo(() => (Array.isArray(promotionsResolved) ? promotionsResolved : []).filter(p => p.is_active), [promotionsResolved]);

  const filteredDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    return safeActiveDishes.filter((dish) => {
      const matchesSearch = !searchTerm || dish.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || dish.category_id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [activeDishes, searchTerm, selectedCategory]);

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

  // Splash/loading ao abrir o cardápio (animação rápida tipo "login")
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(t);
  }, []);

  // Se não há slug, mostrar página de entrada (sem forçar redirect que quebra navegação)
  if (!slug) {
    return <CardapioSemLink />;
  }

  const handleAddToCart = async (item, isEditing = false) => {
    const dish = item.dish || item;
    
    if (!stockUtils.canAddToCart(dish)) {
      toast.error('Este produto está esgotado');
      return;
    }

    if (isEditing || editingCartItem) {
      updateItem(editingCartItem?.id || item.id, item);
      setEditingCartItem(null);
      setSelectedDish(null);
      setSelectedPizza(null);
      toast.success('Item atualizado no carrinho');
      return;
    }
    
    addItem(item);
    setSelectedDish(null);
    setSelectedPizza(null);
    
    // Rastrear combinação de pizza
    if (dish.product_type === 'pizza' && item.selections?.flavors) {
      try {
        const flavorIds = item.selections.flavors.map(f => f.id);
        await base44.functions.invoke('trackPizzaCombination', {
          pizza_id: dish.id,
          flavor_ids: flavorIds
        });
      } catch (e) {
        console.log('Erro ao rastrear combinação:', e);
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
    if (dish.product_type === 'pizza') {
      setSelectedPizza(dish);
    } else {
      setSelectedDish(dish);
    }
  };

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

  const handleApplyCoupon = () => {
    const success = validateAndApply();
    if (success) {
      const discount = calculateDiscount();
      toast.success(
        <div>
          <p className="font-bold">🎉 Cupom aplicado!</p>
          <p className="text-sm">Você economizou {formatCurrency(discount)}</p>
        </div>
      );
    } else {
      toast.error(couponError);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success('Cupom removido');
  };

  const handleEditCartItem = (item) => {
    setEditingCartItem(item);
    if (item.dish?.product_type === 'pizza') {
      setSelectedPizza(item.dish);
    } else {
      setSelectedDish(item.dish);
    }
    setShowCartModal(false);
  };

  const handleEditPizza = (item) => {
    setEditingCartItem(item);
    setSelectedPizza(item.dish);
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
    
    handleDishClick(promoItem);
    closeUpsell();
  };

  const handleSendWhatsApp = async () => {
    const orderCode = orderService.generateOrderCode();
    const fullAddress = orderService.formatFullAddress(customer);
    
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
    
    const discount = calculateDiscount();
    const { total } = orderService.calculateTotals(cartTotal, discount, calculatedDeliveryFee);

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
      discount: discount,
      coupon_code: appliedCoupon?.code,
      total: total,
      status: 'new',
      ...((customer.customer_change_request || '').trim() && {
        customer_change_request: (customer.customer_change_request || '').trim(),
        customer_change_status: 'pending',
      }),
      // Cardápio público /s/:slug: pedido deve cair no Gestor do assinante, não no do master
      ...(slug && publicData?.subscriber_email && { owner_email: publicData.subscriber_email }),
    };

    const order = await orderService.createOrder(orderData, createOrderMutation);
    await orderService.updateCouponUsage(appliedCoupon, updateCouponMutation);

    const shouldSend = whatsappService.shouldSendWhatsApp(store);

    if (shouldSend && store?.whatsapp) {
      const message = whatsappService.formatOrderMessage(
        order, 
        cart, 
        complementGroupsResolved, 
        formatCurrency
      );

      whatsappService.sendToWhatsApp(store.whatsapp, message);
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
          onClick={() => setShowOrderHistory(true)}
          className="mt-2 text-blue-600 font-medium text-sm underline"
        >
          Acompanhar pedido
        </button>
      </div>,
      { duration: 5000 }
    );
  };

  return (
    <div className="min-h-screen min-h-screen-mobile bg-background">
      <Toaster position="top-center" />

      {/* Splash rápido ao carregar o cardápio */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-900"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              {store?.logo ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                  <img src={store.logo} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl" style={{ backgroundColor: primaryColor }}>
                  <UtensilsCrossed className="w-10 h-10 text-white" />
                </div>
              )}
              <p className="text-white font-semibold text-lg">{store?.name || 'Cardápio'}</p>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="h-1 w-24 rounded-full bg-white/60"
              />
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
      {store.banner_image ? (
        <div className="relative w-full h-[200px] md:h-[240px] overflow-hidden">
          {/* Background Image */}
          <img 
            src={store.banner_image} 
            alt={store.name}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30"></div>
          
          {/* Logo e Nome do Restaurante - Topo Esquerdo (lado a lado) */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
            {store.logo && (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/95 backdrop-blur-sm p-1 shadow-2xl border-2 border-white/50 flex-shrink-0">
                <img 
                  src={store.logo} 
                  alt={store.name} 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            )}
            <div className="text-white">
              <h1 className="text-lg md:text-2xl font-bold drop-shadow-lg leading-tight">{store.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="text-xs md:text-sm font-medium">{getStatusDisplay.text}</span>
                </div>
                {store.min_order_value > 0 && (
                  <>
                    <span className="text-white/60">•</span>
                    <span className="text-xs md:text-sm opacity-90">
                      Pedido mín. <span className="font-semibold">{formatCurrency(store.min_order_value)}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Controles Superiores Direitos - Sobre o Banner */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            <button 
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-white" 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: store.name,
                    text: `Confira o cardápio de ${store.name}`,
                    url: window.location.href
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copiado!');
                }
              }}
              title="Compartilhar"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <ThemeToggle className="text-white hover:bg-white/20" />
            {/* Removido: Link do gestor - acesso apenas para assinantes via painel dedicado */}
            <button 
              className={`p-2 rounded-full backdrop-blur-sm transition-all ${isAuthenticated ? 'bg-green-500/90 hover:bg-green-600' : 'bg-white/20 hover:bg-white/30'} text-white`}
              onClick={() => {
                if (isAuthenticated) {
                  setShowCustomerProfile(true);
                } else {
                  const currentUrl = window.location.pathname;
                  window.location.href = `/login/cliente?returnUrl=${encodeURIComponent(currentUrl)}`;
                }
              }}
              title={isAuthenticated ? "Meu Perfil" : "Entrar / Cadastrar"}
            >
              <User className="w-5 h-5" />
              {isAuthenticated && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
              )}
            </button>
            {/* Ícone de carrinho - oculto no mobile, visível no desktop */}
            <button 
              className="hidden md:flex p-2 rounded-full relative bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-white" 
              onClick={() => setShowCartModal(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Campo de Pesquisa - Centralizado no Banner */}
          <div className="absolute top-20 md:top-24 left-4 right-4 z-30">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />
              <Input
                placeholder="O que você procura hoje?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 md:h-12 text-base bg-white/90 backdrop-blur-sm border-white/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Perfil da Loja - Canto Direito Inferior */}
          <div className="absolute bottom-4 right-4 z-30">
            <button 
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-white text-xs md:text-sm font-medium"
              onClick={() => {
                toast.success('Perfil da loja em breve!');
              }}
            >
              <Info className="w-4 h-4" />
              <span>Perfil da loja</span>
            </button>
          </div>
        </div>
      ) : (
        /* Header - Apenas quando NÃO tem banner */
        <header className="border-b border-border sticky top-0 z-40 md:pb-2 pb-4 bg-card">
          <div className="max-w-7xl mx-auto px-4 md:pt-3 pt-6">
            <div className="flex items-center justify-between md:mb-3 mb-6">
              <div className="flex items-center gap-3">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shadow-md" />
                ) : (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-3xl md:text-4xl shadow-md" style={{ backgroundColor: primaryColor }}>
                    🍽️
                  </div>
                )}
                <div className="hidden md:block">
                  <h1 className="font-bold text-xl md:text-2xl text-foreground">{store.name}</h1>
                  {store.min_order_value > 0 && (
                    <p className="text-xs text-muted-foreground">Pedido mín. {formatCurrency(store.min_order_value)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted hidden md:flex" 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: store.name,
                        text: `Confira o cardápio de ${store.name}`,
                        url: window.location.href
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copiado!');
                    }
                  }}
                  title="Compartilhar"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <ThemeToggle className="text-muted-foreground hover:text-foreground hover:bg-muted" />
                {/* Removido: Link do gestor - acesso apenas para assinantes via painel dedicado */}
                <button 
                  className={`relative p-2 rounded-lg transition-all ${isAuthenticated ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                  onClick={() => {
                    if (isAuthenticated) {
                      setShowCustomerProfile(true);
                    } else {
                      const currentUrl = window.location.pathname;
                      window.location.href = `/login/cliente?returnUrl=${encodeURIComponent(currentUrl)}`;
                    }
                  }}
                  title={isAuthenticated ? "Meu Perfil" : "Entrar / Cadastrar"}
                >
                  <User className="w-5 h-5 md:w-6 md:h-6" />
                  {isAuthenticated && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                  )}
                </button>
                {/* Ícone de carrinho - oculto no mobile, visível no desktop */}
                <button 
                  className="hidden md:flex p-2 rounded-lg relative transition-colors text-muted-foreground hover:text-foreground hover:bg-muted" 
                  onClick={() => setShowCartModal(true)}
                >
                  <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto md:mb-2 mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="O que você procura hoje?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 md:h-10 h-12 text-base"
              />
            </div>

            {/* Status */}
            <div className="text-center">
              <span className={`text-xs font-medium ${getStatusDisplay.color}`}>
                ● {getStatusDisplay.text}
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Category Tabs - Melhoradas */}
      <div className={`bg-card border-b border-border sticky z-30 ${store.banner_image ? 'top-0' : 'md:top-[120px] top-[165px]'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-3 md:py-3 py-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === 'all' 
                    ? 'text-white shadow-lg scale-105' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                style={selectedCategory === 'all' ? { 
                  backgroundColor: primaryColor, 
                  color: 'white'
                } : {}}
              >
                Todos
              </button>
              {categoriesResolved.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === cat.id
                      ? 'text-white shadow-lg scale-105'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  style={selectedCategory === cat.id ? { 
                    backgroundColor: primaryColor, 
                    color: 'white'
                  } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 md:max-w-[1400px]">
        {/* Banners Configuráveis */}
        {(Array.isArray(store.banners) ? store.banners : []).filter(b => b.active !== false && b.image).length > 0 && (
          <div className="mb-6 space-y-3">
            {(Array.isArray(store.banners) ? store.banners : []).filter(b => b.active !== false && b.image).map((banner, index) => (
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

        {/* Promotions Banner */}
        <div data-section="promotions">
          <PromotionBanner
            promotions={activePromotions}
            dishes={dishesResolved}
            primaryColor={primaryColor}
            onSelectPromotion={setSelectedDish}
            store={store}
          />
        </div>

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
                  <Gift className="w-5 h-5 text-white" />
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
              <Button
                onClick={() => setShowQuickSignup(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-medium px-4 py-2 h-auto whitespace-nowrap"
              >
                <Gift className="w-4 h-4 mr-2" />
                Cadastrar-se
              </Button>
            </div>
          </motion.div>
        )}

        {/* Recent Orders */}
        <RecentOrders
          dishes={activeDishes}
          onSelectDish={setSelectedDish}
          primaryColor={primaryColor}
        />

        {/* Highlights */}
        {highlightDishes.length > 0 && (
          <section className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-4 md:mb-4">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <h2 className="font-bold text-base md:text-lg text-foreground">Pratos do Dia</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3 lg:gap-4">
              {highlightDishes.map((dish, index) => {
                // Forçar badge de destaque nos highlights
                const highlightDish = { ...dish, is_popular: true };
                return (
                  <DishCardWow
                    key={dish.id}
                    dish={highlightDish}
                    onClick={handleDishClick}
                    index={index}
                    primaryColor={primaryColor}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* All Dishes */}
        <section>
          <h2 className="font-bold text-base md:text-lg mb-4 md:mb-4 text-foreground">
            {selectedCategory === 'all' 
              ? 'Cardápio Completo' 
              : categoriesResolved.find(c => c.id === selectedCategory)?.name || 'Pratos'}
          </h2>
          {loadingDishes ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3 lg:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <DishSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3 lg:gap-4">
              {filteredDishes.map((dish, index) => {
                const isOutOfStock = stockUtils.isOutOfStock(dish.stock);
                const isLowStock = stockUtils.isLowStock(dish.stock);

                return (
                  <DishCardWow
                    key={dish.id}
                    dish={dish}
                    onClick={handleDishClick}
                    index={index}
                    isOutOfStock={isOutOfStock}
                    isLowStock={isLowStock}
                    primaryColor={primaryColor}
                  />
                );
              })}
            </div>
          )}
        </section>

        {!loadingDishes && filteredDishes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum prato encontrado</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar - Barra de Navegação Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Início</span>
          </button>
          
          {store.whatsapp && (
            <a
              href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-medium">WhatsApp</span>
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
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Gift className="w-5 h-5" />
            <span className="text-[10px] font-medium">Promos</span>
          </button>
          
          <button
            onClick={() => setShowCartModal(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-colors"
            style={{ color: cart.length > 0 ? primaryColor : 'hsl(var(--muted-foreground))' }}
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartItemsCount}
              </span>
            )}
            <span className="text-[10px] font-medium">Carrinho</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Coluna 1: Info do Estabelecimento */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {store.logo && (
                  <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-xl object-cover shadow-md border-2 border-white dark:border-gray-800" />
                )}
                <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white">{store.name}</h3>
                  {store.slogan && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-0.5">"{store.slogan}"</p>
                  )}
                </div>
              </div>
              {store.address && (
                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                  <p className="text-sm">{store.address}</p>
                </div>
              )}
              {store.opening_time && store.closing_time && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <p className="text-sm">{store.opening_time} - {store.closing_time}</p>
                </div>
              )}
            </div>

            {/* Coluna 2: Redes Sociais */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Conecte-se</h3>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                {store.whatsapp && (
                  <a 
                    href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <MessageSquare className="w-5 h-5" fill="currentColor" />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">WhatsApp</p>
                      <p className="text-xs opacity-90">{store.whatsapp}</p>
                    </div>
                  </a>
                )}
                {store.instagram && (
                  <a 
                    href={store.instagram.startsWith('http') ? store.instagram : `https://instagram.com/${store.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Instagram className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">Instagram</p>
                      <p className="text-xs opacity-90">@{store.instagram.replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//, '')}</p>
                    </div>
                  </a>
                )}
                {store.facebook && (
                  <a 
                    href={store.facebook.startsWith('http') ? store.facebook : `https://facebook.com/${store.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Facebook className="w-5 h-5" fill="currentColor" />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">Facebook</p>
                      <p className="text-xs opacity-90">Siga-nos</p>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Coluna 3: Formas de Pagamento */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Pagamento</h3>
              {store.payment_methods && store.payment_methods.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {store.payment_methods.map((method, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow">
                      {method.image ? (
                        <img src={method.image} alt={method.name} className="h-7 object-contain" />
                      ) : (
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{method.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">Consulte as formas de pagamento disponíveis</p>
              )}
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-6 text-center space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} {store.name}. Todos os direitos reservados.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Powered by <span className="font-semibold" style={{ color: primaryColor }}>DigiMenu</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CartModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onEditItem={handleEditCartItem}
        onEditPizza={handleEditPizza}
        onCheckout={() => {
          setShowCartModal(false);
          setCurrentView('checkout');
        }}
        primaryColor={primaryColor}
      />

      <NewDishModal
        isOpen={!!selectedDish}
        onClose={() => {
          setSelectedDish(null);
          setEditingCartItem(null);
        }}
        dish={selectedDish}
        complementGroups={complementGroupsResolved}
        onAddToCart={handleAddToCart}
        editingItem={editingCartItem}
        primaryColor={primaryColor}
      />

      {selectedPizza && (
        <PizzaBuilder
          dish={selectedPizza}
          sizes={pizzaSizesResolved}
          flavors={pizzaFlavorsResolved}
          edges={pizzaEdgesResolved}
          extras={pizzaExtrasResolved}
          onAddToCart={handleAddToCart}
          onClose={() => {
            setSelectedPizza(null);
            setEditingCartItem(null);
          }}
          primaryColor={primaryColor}
          editingItem={editingCartItem}
        />
      )}

      <OrderHistoryModal
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
        primaryColor={primaryColor}
      />

      <CustomerProfileModal
        isOpen={showCustomerProfile}
        onClose={() => setShowCustomerProfile(false)}
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
        isOpen={showUpsellModal}
        onClose={closeUpsell}
        promotions={upsellPromotions}
        dishes={dishesResolved}
        onAccept={handleUpsellAccept}
        onDecline={closeUpsell}
        primaryColor={primaryColor}
      />

      {currentView === 'checkout' && (
        <CheckoutView
          cart={cart}
          customer={customer}
          setCustomer={setCustomer}
          onBack={() => setCurrentView('menu')}
          onSendWhatsApp={handleSendWhatsApp}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          appliedCoupon={appliedCoupon}
          couponError={couponError}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          deliveryZones={deliveryZonesResolved}
          store={store}
          primaryColor={primaryColor}
        />
      )}

    </div>
  );
}