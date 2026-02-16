import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { SYSTEM_LOGO_URL, SYSTEM_NAME } from '@/config/branding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Search, Clock, Star, Share2, MapPin, Info, Home, Receipt, Gift, User, MessageSquare, UtensilsCrossed, Instagram, Facebook, Phone, Package, Music2, Calendar, Heart, LayoutGrid } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Components
import NewDishModal from '../components/menu/NewDishModal';
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

/** Landing quando não há slug: / ou /cardapio — não exibe cardápio de nenhum estabelecimento. */
function CardapioSemLink() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center max-w-md p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
        <img src={SYSTEM_LOGO_URL} alt={SYSTEM_NAME} className="h-16 w-auto mx-auto mb-4 drop-shadow-md" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{SYSTEM_NAME}</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          O cardápio digital é acessado pelo link do estabelecimento: <strong>/s/nome-do-restaurante</strong>
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          Ex.: /s/raiz-maranhense
        </p>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-3">
          <strong>Master:</strong> abra o cardápio em <strong>Admin → Assinantes</strong> e use <strong>⋮ → Abrir cardápio</strong> no assinante desejado. <strong>Assinante:</strong> use o link do seu painel ou Loja.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/assinar" className="px-4 py-2.5 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors">
            Assinar {SYSTEM_NAME}
          </Link>
          <Link to="/" className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Voltar ao início
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

  // Marcar este estabelecimento como "página de origem" do cliente (para / redirecionar sempre ao cardápio ou login dele)
  useEffect(() => {
    if (slug && typeof localStorage !== 'undefined') {
      localStorage.setItem('lastVisitedSlug', slug);
    }
  }, [slug]);

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
  const [showWelcomeDiscount, setShowWelcomeDiscount] = useState(false);
  const [showSmartUpsell, setShowSmartUpsell] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userProfilePicture, setUserProfilePicture] = useState(null);
  const [showSplash, setShowSplash] = useState(false);
  const [showFavoritesList, setShowFavoritesList] = useState(false);
  const [showReferralCode, setShowReferralCode] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const queryClient = useQueryClient();

  // Custom Hooks
  const { cart, addItem, updateItem, removeItem, updateQuantity, clearCart, cartTotal, cartItemsCount } = useCart(slug);
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
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
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
  const _rawStore = _pub?.store || stores?.[0] || null;
  // Garantir nome sempre definido para não travar em "Carregando..." (ex.: loja antiga com logo mas name vazio)
  const store = _rawStore ? { ..._rawStore, name: _rawStore.name || 'Loja' } : null;
  
  // Debug: log dos dados recebidos
  useEffect(() => {
    if (slug && publicData) {
      console.log('📊 [Cardapio] Dados do cardápio público:', {
        slug,
        is_master: publicData.is_master,
        subscriber_email: publicData.subscriber_email,
        store: store ? { name: store.name, logo: store.logo, primary_color: store.primary_color } : null,
        dishes_count: publicData.dishes?.length || 0,
        categories_count: publicData.categories?.length || 0
      });
    }
  }, [slug, publicData, store]);
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
  const loadingDishes = slug ? publicLoading : dishesLoading;

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
      if (slug && publicData?.subscriber_email) {
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
  const menuLayout = store?.menu_layout || 'grid'; // grid, list, carousel, magazine, masonry

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
  const highlightDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    return safeActiveDishes.filter((d) => d.is_highlight);
  }, [activeDishes]);
  const activePromotions = useMemo(() => (Array.isArray(promotionsResolved) ? promotionsResolved : []).filter(p => p.is_active), [promotionsResolved]);

  const filteredDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    const isPizzaCategory = selectedCategory?.startsWith?.('pc_');
    const isBeverageCategory = selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_');
    if (isBeverageCategory) return [];
    const pizzaCatId = isPizzaCategory ? selectedCategory.replace(/^pc_/, '') : null;
    return safeActiveDishes.filter((dish) => {
      const matchesSearch = !searchTerm || dish.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all'
        || (isPizzaCategory && dish.product_type === 'pizza' && dish.pizza_category_id === pizzaCatId)
        || (!isPizzaCategory && dish.category_id === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [activeDishes, searchTerm, selectedCategory]);

  const filteredBeverages = useMemo(() => {
    if (selectedCategory !== 'beverages' && !selectedCategory?.startsWith?.('bc_')) return [];
    const list = Array.isArray(activeBeverages) ? activeBeverages : [];
    const bcId = selectedCategory?.startsWith?.('bc_') ? selectedCategory.replace(/^bc_/, '') : null;
    return list.filter((b) => {
      const matchesSearch = !searchTerm || b.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'beverages' || !bcId || b.category_id === bcId;
      return matchesSearch && matchesCategory;
    });
  }, [activeBeverages, searchTerm, selectedCategory]);

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

  // 🛒 Recuperação de Carrinho Abandonado
  useEffect(() => {
    if (!slug || cart.length > 0) return;
    
    try {
      const savedCartKey = `cardapio_cart_${slug}`;
      const savedCart = localStorage.getItem(savedCartKey);
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          // Aguardar um pouco para não mostrar imediatamente
          const timer = setTimeout(() => {
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
                        parsedCart.forEach(item => addItem(item));
                        localStorage.removeItem(savedCartKey);
                        toast.dismiss(t.id);
                        toast.success('Carrinho recuperado!');
                      }}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Sim, recuperar
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem(savedCartKey);
                        toast.dismiss(t.id);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Não, obrigado
                    </button>
                  </div>
                </div>
              ),
              {
                duration: 10000,
                position: 'top-center',
              }
            );
          }, 2000);
          
          return () => clearTimeout(timer);
        }
      }
    } catch (e) {
      console.error('Erro ao recuperar carrinho:', e);
    }
  }, [slug, cart.length, addItem]);

  // 🎁 Modal de Boas-vindas com Cupom
  useEffect(() => {
    if (!slug || !store) return;
    
    const storageKey = `welcome_discount_${slug}`;
    const hasSeen = localStorage.getItem(storageKey);
    
    if (!hasSeen) {
      // Mostrar modal após 10 segundos
      const timer = setTimeout(() => {
        setShowWelcomeDiscount(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [slug, store]);

  // ✅ Erro ao carregar cardápio (404, 500, timeout, rede) — depois de TODOS os hooks
  if (slug && publicError) {
    const isTimeoutOrNetwork = publicErrorDetails?.isTimeout || publicErrorDetails?.message?.includes('fetch') || publicErrorDetails?.message?.includes('rede');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md p-6 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xl font-medium text-gray-800 dark:text-gray-100">
            {isTimeoutOrNetwork ? 'Não foi possível carregar' : 'Link não encontrado'}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isTimeoutOrNetwork
              ? 'O servidor pode estar iniciando ou a conexão falhou. Tente novamente em alguns segundos.'
              : 'Este cardápio não existe ou o link está incorreto. Verifique com o estabelecimento.'}
          </p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] })}
            className="mt-4 bg-orange-500 text-white hover:bg-orange-600"
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
    
    // Cross-sell será gerenciado pelo componente SmartUpsell baseado no carrinho
    
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
    console.log('🍕 Clicou no prato:', dish.name, 'Tipo:', dish.product_type);
    if (dish.product_type === 'pizza') {
      console.log('✅ É pizza! Abrindo PizzaBuilder...');
      setSelectedPizza(dish);
    } else {
      console.log('📦 Não é pizza, abrindo modal normal');
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
    
    // Calcular descontos
    const couponDiscount = calculateDiscount();
    const loyaltyDiscountPercent = getLoyaltyDiscount();
    const loyaltyDiscountAmount = cartTotal * (loyaltyDiscountPercent / 100);
    const totalDiscount = couponDiscount + loyaltyDiscountAmount;
    
    const { total } = orderService.calculateTotals(cartTotal, totalDiscount, calculatedDeliveryFee);

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
      loyalty_points_earned: Math.floor(total),
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

    // Adicionar pontos de fidelidade após pedido criado
    if (customer.phone || userEmail) {
      try {
        const pointsToAdd = Math.floor(total); // 1 ponto por real gasto
        const result = await addPoints(pointsToAdd, 'compra');
        
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
          onClick={() => setShowOrderHistory(true)}
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
      <div className="min-h-screen min-h-screen-mobile flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Toaster position="top-center" />
        {!(showRetryAfterTimeout || publicError) && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando cardápio...</p>
          </div>
        )}
        {(showRetryAfterTimeout || publicError) && (
          <div className="text-center max-w-xs px-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
              {publicError ? (publicErrorDetails?.isTimeout ? 'O servidor demorou para responder.' : 'Não foi possível carregar o cardápio. Verifique o link e a conexão.') : 'Está demorando mais que o normal.'}
            </p>
            <Button
              onClick={() => {
                setLoadingTimeout(false);
                queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
              }}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-screen-mobile bg-background">
      <Toaster position="top-center" />

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
                  src={store.logo}
                  alt={store.name || 'Restaurante'}
                  className="h-24 w-24 max-w-[280px] object-contain drop-shadow-lg rounded-xl"
                />
              )}
            <p className="text-white font-semibold text-xl text-center drop-shadow-sm">
              {store?.name || (publicLoading ? 'Carregando...' : 'Cardápio')}
            </p>
            {loadingTimeout && publicError && (
              <div className="mt-4 text-center max-w-sm">
                <p className="text-white/90 text-sm mb-3">Erro ao carregar cardápio</p>
                <Button
                  onClick={() => {
                    setLoadingTimeout(false);
                    window.location.reload();
                  }}
                  className="bg-white text-orange-500 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}
            {!loadingTimeout && (
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="h-1 w-24 rounded-full bg-white/70"
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
                <h1 className="text-lg md:text-xl font-bold drop-shadow-lg leading-tight">{store?.name || 'Restaurante'}</h1>
                <div className="flex items-center gap-3 mt-0.5 md:mt-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    <span className="text-xs font-medium">{getStatusDisplay.text}</span>
                  </div>
                  {store?.min_order_value > 0 && (
                    <>
                      <span className="text-white/60">•</span>
                      <span className="text-xs opacity-90">
                        Pedido mín. <span className="font-semibold">{formatCurrency(store?.min_order_value || 0)}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Search - rente aos ícones no desktop */}
            <div className="absolute top-20 left-4 right-4 md:static md:flex-1 md:max-w-xl md:mx-4 z-30">
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
              <ThemeToggle className="text-white hover:bg-white/20" />
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
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
                )}
              </button>
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
          </div>
        </div>
      ) : (
        /* Header - Apenas quando NÃO tem banner. Desktop: linha única com pesquisa rente */
        <header className="border-b border-border sticky top-0 z-40 pb-4 md:pb-2 bg-card">
          <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-3 md:py-3">
            {/* Desktop: logo | search | ícones em uma linha */}
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
              <div className="flex items-center justify-between mb-4 md:mb-0 md:flex-shrink-0">
                <div className="flex items-center gap-3">
                  {store?.logo ? (
                    <img src={store?.logo} alt={store?.name || 'Restaurante'} className="w-16 h-16 md:w-14 md:h-14 rounded-xl object-cover shadow-md" />
                  ) : (
                    <div className="w-16 h-16 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-3xl shadow-md" style={{ backgroundColor: primaryColor }}>
                      🍽️
                    </div>
                  )}
                  <div>
                    <h1 className="font-bold text-xl md:text-lg text-foreground">{store?.name || 'Restaurante'}</h1>
                    {store?.min_order_value > 0 && (
                      <p className="text-xs text-muted-foreground">Pedido mín. {formatCurrency(store?.min_order_value || 0)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 md:hidden">
                  <InstallAppButton pageName="Cardápio" compact />
                  <button className="p-2 rounded-lg min-h-touch min-w-touch text-muted-foreground" onClick={() => { if (navigator.share) { navigator.share({ title: store?.name || 'Cardápio', text: `Confira o cardápio de ${store?.name || 'nosso restaurante'}`, url: window.location.href }).catch(() => {}); } else { navigator.clipboard.writeText(window.location.href); toast.success('Link copiado!'); } }}><Share2 className="w-5 h-5" /></button>
                  <ThemeToggle />
                  <button 
                    className={`p-0.5 rounded-lg relative ${isAuthenticated ? 'text-green-600' : 'text-muted-foreground'}`} 
                    onClick={() => isAuthenticated ? setShowCustomerProfile(true) : (window.location.href = slug ? `/s/${slug}/login/cliente?returnUrl=${encodeURIComponent(window.location.pathname)}` : `/?returnUrl=${encodeURIComponent(window.location.pathname)}`)}
                  >
                    {isAuthenticated && userProfilePicture ? (
                      <img 
                        src={userProfilePicture} 
                        alt="Perfil" 
                        className="w-8 h-8 rounded-full object-cover border-2 border-green-600"
                      />
                    ) : (
                      <User className="w-5 h-5 m-1.5" />
                    )}
                  </button>
                  <button className="p-2 rounded-lg relative text-muted-foreground" onClick={() => setShowCartModal(true)}><ShoppingCart className="w-5 h-5" />{cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartItemsCount}</span>}</button>
                </div>
              </div>
              {/* Search - rente no desktop */}
              <div className="relative flex-1 md:max-w-xl md:mx-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder="O que você procura hoje?" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-12 md:h-10 text-base" />
              </div>
              {/* Ícones - ocultos no mobile (já estão na linha de cima) */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <button className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => { if (navigator.share) { navigator.share({ title: store?.name || 'Cardápio', text: `Confira o cardápio de ${store?.name || 'nosso restaurante'}`, url: window.location.href }).catch(() => {}); } else { navigator.clipboard.writeText(window.location.href); toast.success('Link copiado!'); } }} title="Compartilhar"><Share2 className="w-5 h-5" /></button>
                <ThemeToggle className="text-muted-foreground hover:text-foreground hover:bg-muted" />
                <button 
                  className={`relative p-0.5 rounded-lg transition-all ${isAuthenticated ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`} 
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
                <button className="p-2 rounded-lg relative transition-colors text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setShowCartModal(true)}><ShoppingCart className="w-5 h-5" />{cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartItemsCount}</span>}</button>
              </div>
            </div>
            <div className="text-center mt-2 md:mt-1">
              <span className={`text-xs font-medium ${getStatusDisplay.color}`}>● {getStatusDisplay.text}</span>
            </div>
          </div>
        </header>
      )}

      {/* Category Tabs - Melhoradas */}
      <div className={`bg-card border-b border-border sticky z-30 ${store?.banner_image ? 'md:top-0 top-0' : 'md:top-[88px] top-[165px]'}`}>
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
              {pizzaCategoriesResolved?.length > 0 && pizzaCategoriesResolved.map((pc) => {
                const pcKey = `pc_${pc.id}`;
                const sz = pizzaSizesResolved?.find(s => s.id === pc.size_id);
                const label = pc.name || (sz ? `${sz.name} • ${pc.max_flavors || 1} sabor(es)` : pc.id);
                return (
                  <button
                    key={pcKey}
                    onClick={() => setSelectedCategory(pcKey)}
                    className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 ${
                      selectedCategory === pcKey
                        ? 'text-white shadow-lg scale-105'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    style={selectedCategory === pcKey ? { 
                      backgroundColor: primaryColor, 
                      color: 'white'
                    } : {}}
                  >
                    {label}
                  </button>
                );
              })}
              {activeBeverages.length > 0 && (
                <>
                  <button
                    onClick={() => setSelectedCategory('beverages')}
                    className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 ${
                      selectedCategory === 'beverages' ? 'text-white shadow-lg scale-105' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    style={selectedCategory === 'beverages' ? { backgroundColor: primaryColor, color: 'white' } : {}}
                  >
                    Bebidas
                  </button>
                  {beverageCategoriesResolved?.map((bc) => {
                    const bcKey = `bc_${bc.id}`;
                    return (
                      <button
                        key={bcKey}
                        onClick={() => setSelectedCategory(bcKey)}
                        className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-sm md:text-base font-semibold whitespace-nowrap transition-all duration-200 ${
                          selectedCategory === bcKey ? 'text-white shadow-lg scale-105' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        style={selectedCategory === bcKey ? { backgroundColor: primaryColor, color: 'white' } : {}}
                      >
                        {bc.name}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12 md:max-w-[1400px]">
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
                    textPrimaryColor={textPrimaryColor}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* All Dishes / Bebidas */}
        <section>
          <h2 className="font-bold text-base md:text-lg mb-4 md:mb-4 text-foreground">
            {selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_')
              ? (selectedCategory?.startsWith?.('bc_')
                  ? beverageCategoriesResolved?.find(c => c.id === selectedCategory.replace(/^bc_/, ''))?.name || 'Bebidas'
                  : 'Bebidas')
              : selectedCategory === 'all'
                ? 'Cardápio Completo' 
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
            dishes={selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_') ? filteredBeverages : filteredDishes}
            onDishClick={handleDishClick}
            primaryColor={primaryColor}
            textPrimaryColor={textPrimaryColor}
            textSecondaryColor={textSecondaryColor}
            loading={loadingDishes}
            stockUtils={stockUtils}
            formatCurrency={formatCurrency}
          />
        </section>

        {!loadingDishes && (selectedCategory === 'beverages' || selectedCategory?.startsWith?.('bc_') ? filteredBeverages : filteredDishes).length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum prato encontrado</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar - Barra de Navegação Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden shadow-lg">
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
            onClick={() => setShowCartModal(true)}
            className="flex items-center justify-center flex-1 h-full relative transition-all active:scale-95"
            style={{ color: cart.length > 0 ? primaryColor : 'hsl(var(--muted-foreground))' }}
            title="Carrinho"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Coluna 1: Info do Estabelecimento */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {store?.logo && (
                  <img src={store?.logo} alt={store?.name || 'Restaurante'} className="w-16 h-16 rounded-xl object-cover shadow-md border-2 border-white dark:border-gray-800" />
                )}
                <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white">{store?.name || 'Restaurante'}</h3>
                  {store?.slogan && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-0.5">"{store?.slogan}"</p>
                  )}
                </div>
              </div>
              
              {store?.address && (
                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                  <p className="text-sm">{store?.address}</p>
                </div>
              )}

              {/* Horário de Funcionamento */}
              {store?.opening_time && store?.closing_time && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                    <p className="text-sm font-semibold">Horário de Funcionamento</p>
                  </div>
                  <div className="ml-6 space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {store?.opening_time} - {store?.closing_time}
                    </p>
                    {store?.working_days && store.working_days.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(() => {
                            const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                            const workingDayNames = store?.working_days
                              .sort((a, b) => a - b)
                              .map(day => daysMap[day]);
                            
                            // Se trabalha todos os dias
                            if (workingDayNames.length === 7) return 'Todos os dias';
                            
                            // Se trabalha de segunda a sexta
                            if (workingDayNames.length === 5 && 
                                workingDayNames.join(',') === 'Seg,Ter,Qua,Qui,Sex') {
                              return 'Segunda a Sexta';
                            }
                            
                            // Se trabalha de segunda a sábado
                            if (workingDayNames.length === 6 && 
                                workingDayNames.join(',') === 'Seg,Ter,Qua,Qui,Sex,Sáb') {
                              return 'Segunda a Sábado';
                            }
                            
                            // Caso contrário, mostrar todos os dias
                            return workingDayNames.join(', ');
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna 2: Redes Sociais */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Conecte-se Conosco</h3>
              
              {/* Desktop: Ícones com texto */}
              <div className="hidden sm:flex flex-wrap gap-3">
                {store?.whatsapp && (
                  <a 
                    href={`https://wa.me/55${store?.whatsapp?.replace(/\D/g, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </a>
                )}
                {store?.instagram && (
                  <a 
                    href={store?.instagram?.startsWith('http') ? store.instagram : `https://instagram.com/${store?.instagram?.replace(/^@/, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    title="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="text-sm font-medium">Instagram</span>
                  </a>
                )}
                {store?.facebook && (
                  <a 
                    href={store?.facebook?.startsWith('http') ? store.facebook : `https://facebook.com/${store?.facebook || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    title="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                    <span className="text-sm font-medium">Facebook</span>
                  </a>
                )}
                {store?.tiktok && (
                  <a 
                    href={store?.tiktok?.startsWith('http') ? store.tiktok : `https://tiktok.com/@${store?.tiktok?.replace(/^@/, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    title="TikTok"
                  >
                    <Music2 className="w-5 h-5" />
                    <span className="text-sm font-medium">TikTok</span>
                  </a>
                )}
              </div>

              {/* Mobile: Apenas ícones circulares */}
              <div className="flex sm:hidden gap-4 justify-center">
                {store?.whatsapp && (
                  <a 
                    href={`https://wa.me/55${store?.whatsapp?.replace(/\D/g, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-6 h-6" />
                  </a>
                )}
                {store?.instagram && (
                  <a 
                    href={store?.instagram?.startsWith('http') ? store.instagram : `https://instagram.com/${store?.instagram?.replace(/^@/, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="Instagram"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                )}
                {store?.facebook && (
                  <a 
                    href={store?.facebook?.startsWith('http') ? store.facebook : `https://facebook.com/${store?.facebook || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="Facebook"
                  >
                    <Facebook className="w-6 h-6" />
                  </a>
                )}
                {store?.tiktok && (
                  <a 
                    href={store?.tiktok?.startsWith('http') ? store.tiktok : `https://tiktok.com/@${store?.tiktok?.replace(/^@/, '') || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 bg-black hover:bg-gray-800 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                    title="TikTok"
                  >
                    <Music2 className="w-6 h-6" />
                  </a>
                )}
              </div>

              {/* Telefone (se houver) */}
              {store?.phone && (
                <a 
                  href={`tel:${store?.phone?.replace(/\D/g, '') || ''}`}
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mt-4"
                >
                  <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                  <span className="text-sm">{store?.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-200 dark:border-gray-800 mt-6 pt-4 text-center space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} {store?.name || 'Restaurante'}. Todos os direitos reservados.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Powered by <span className="font-semibold" style={{ color: primaryColor }}>{SYSTEM_NAME}</span>
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
        store={store}
        onReviewBonus={applyReviewBonus}
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
        <>
          {console.log('🍕 Renderizando PizzaBuilderV2 para:', selectedPizza.name)}
          {console.log('📏 Tamanhos disponíveis:', pizzaSizesResolved.length)}
          {console.log('🎨 Sabores disponíveis:', pizzaFlavorsResolved.length)}
          <PizzaBuilderV2
            dish={selectedPizza}
            sizes={pizzaSizesResolved}
            flavors={pizzaFlavorsResolved}
            edges={pizzaEdgesResolved}
            extras={pizzaExtrasResolved}
            categories={pizzaCategoriesResolved}
            onAddToCart={handleAddToCart}
            onClose={() => {
              console.log('❌ Fechando PizzaBuilderV2');
              setSelectedPizza(null);
              setEditingCartItem(null);
            }}
            primaryColor={primaryColor}
            editingItem={editingCartItem}
            store={store}
          />
        </>
      )}

      <OrderHistoryModal
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
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
      />

      <ReferralCodeModal
        isOpen={showReferralCode}
        onClose={() => setShowReferralCode(false)}
        referralCode={loyaltyData?.referralCode || ''}
        onApplyReferralCode={applyReferralCode}
        primaryColor={primaryColor}
      />

      {/* 🎯 Cross-sell Inteligente */}
      {currentView === 'menu' && (
        <SmartUpsell
          cart={cart}
          dishes={dishesResolved}
          onAddToCart={handleAddToCart}
          primaryColor={primaryColor}
          onClose={() => setShowSmartUpsell(false)}
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
          userEmail={userEmail}
          slug={slug}
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
                dishes={dishesResolved}
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

      {/* FAB único: ao clicar abre opções em vertical (Carrinho, Chat, Favoritos) */}
      {currentView === 'menu' && (
        <div className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-2">
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
                    setChatOpen(true);
                  }}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:shadow-2xl transition-all"
                  aria-label="Chat"
                >
                  <MessageSquare className="w-6 h-6" />
                </motion.button>
                {/* Carrinho */}
                <motion.button
                  initial={{ opacity: 0, y: 8, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
                  onClick={() => {
                    setShowFloatingMenu(false);
                    setShowCartModal(true);
                  }}
                  className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl transition-all"
                  aria-label="Carrinho"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold shadow">
                      {cartItemsCount}
                    </span>
                  )}
                </motion.button>
              </>
            )}
          </AnimatePresence>
          {/* Botão principal: abre/fecha o menu */}
          <motion.button
            onClick={() => setShowFloatingMenu((v) => !v)}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:shadow-orange-500/40 transition-all"
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
          open={chatOpen}
          onOpenChange={setChatOpen}
          slug={slug}
          storeName={store?.name}
        />
      )}

    </div>
  );
}