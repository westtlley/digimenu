import React, { useState, useMemo, useEffect } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Search, Clock, Star, Share2, MapPin, Info, Home, Receipt, Gift } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Components
import NewDishModal from '../components/menu/NewDishModal';
import PizzaBuilder from '../components/pizza/PizzaBuilder';
import CartModal from '../components/menu/CartModal';
import CheckoutView from '../components/menu/CheckoutView';
import OrderHistoryModal from '../components/menu/OrderHistoryModal';
import UpsellModal from '../components/menu/UpsellModal';
import DishSkeleton from '../components/menu/DishSkeleton';
import PromotionBanner from '../components/menu/PromotionBanner';
import RecentOrders from '../components/menu/RecentOrders';
import AdvancedFilters from '../components/menu/AdvancedFilters';
import UserAuthButton from '../components/atoms/UserAuthButton';
import StoreClosedOverlay from '../components/menu/StoreClosedOverlay';
import ThemeToggle from '../components/ui/ThemeToggle';

// Hooks
import { useCart } from '@/components/hooks/useCart';
import { useStoreStatus } from '@/components/hooks/useStoreStatus';
import { useUpsell } from '@/components/hooks/useUpsell';
import { useCoupons } from '@/components/hooks/useCoupons';
import { useCustomer } from '@/components/hooks/useCustomer';

// Services & Utils
import { orderService } from '@/components/services/orderService';
import { whatsappService } from '@/components/services/whatsappService';
import { stockUtils } from '@/components/utils/stockUtils';
import { formatCurrency } from '@/components/utils/formatters';

export default function Cardapio() {
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCartModal, setShowCartModal] = useState(false);
  const [currentView, setCurrentView] = useState('menu');
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ priceRange: null, tags: [] });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Custom Hooks
  const { cart, addItem, updateItem, removeItem, updateQuantity, clearCart, cartTotal, cartItemsCount } = useCart();
  const { customer, setCustomer, clearCustomer } = useCustomer();

  // Data Fetching
  const { data: dishes = [], isLoading: dishesLoading } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => base44.entities.Dish.list('order'),
    refetchInterval: 5000, // Atualiza a cada 5 segundos
    staleTime: 0, // Sempre considera os dados como desatualizados
    initialData: [], // 👈 ESSENCIAL: garante que dishes nunca seja undefined
    gcTime: 0, // Remove do cache imediatamente
    refetchOnMount: true // Sempre refaz a requisição ao montar
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('order')
  });

  const { data: complementGroups = [] } = useQuery({
    queryKey: ['complementGroups'],
    queryFn: () => base44.entities.ComplementGroup.list('order')
  });

  const { data: pizzaSizes = [] } = useQuery({
    queryKey: ['pizzaSizes'],
    queryFn: () => base44.entities.PizzaSize.list('order')
  });

  const { data: pizzaFlavors = [] } = useQuery({
    queryKey: ['pizzaFlavors'],
    queryFn: () => base44.entities.PizzaFlavor.list('order')
  });

  const { data: pizzaEdges = [] } = useQuery({
    queryKey: ['pizzaEdges'],
    queryFn: () => base44.entities.PizzaEdge.list('order')
  });

  const { data: pizzaExtras = [] } = useQuery({
    queryKey: ['pizzaExtras'],
    queryFn: () => base44.entities.PizzaExtra.list('order')
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => base44.entities.Coupon.list()
  });

  const { data: deliveryZones = [] } = useQuery({
    queryKey: ['deliveryZones'],
    queryFn: () => base44.entities.DeliveryZone.list()
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list()
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data)
  });

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data)
  });

  // Store data
  const store = stores[0] || { name: 'Sabor do Dia', is_open: true };
  const primaryColor = store.theme_primary_color || '#f97316';
  const headerBg = store.theme_header_bg || '#ffffff';
  const headerText = store.theme_header_text || '#000000';

  // Store Status
  const { isStoreUnavailable, isStoreClosed, isStorePaused, isAutoModeClosed, getNextOpenTime, getStatusDisplay } = useStoreStatus(store);

  // Coupons
  const { couponCode, setCouponCode, appliedCoupon, couponError, validateAndApply, removeCoupon, calculateDiscount } = useCoupons(coupons, cartTotal);

  // Upsell
  const { showUpsellModal, upsellPromotions, checkUpsell, resetUpsell, closeUpsell } = useUpsell(promotions, cartTotal);

  // Memoized calculations
  const activeDishes = useMemo(() => {
    // Garantir que dishes seja um array
    const safeDishes = Array.isArray(dishes) ? dishes : [];
    // Filtra apenas pratos ativos E que tenham nome e preço definidos
    return safeDishes.filter((d) => {
      if (d.is_active === false) return false;
      if (!d.name || d.name.trim() === '') return false;
      
      // Para pizzas, verificar se tem tamanhos e sabores configurados
      if (d.product_type === 'pizza') {
        if (pizzaSizes.length === 0 || pizzaFlavors.length === 0) return false;
      } else {
        // Para outros produtos, verificar se tem preço
        if (d.price === null || d.price === undefined) return false;
      }
      
      return true;
    });
  }, [dishes, pizzaSizes, pizzaFlavors]);
  const highlightDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    return safeActiveDishes.filter((d) => d.is_highlight);
  }, [activeDishes]);
  const activePromotions = useMemo(() => promotions.filter(p => p.is_active), [promotions]);

  const filteredDishes = useMemo(() => {
    const safeActiveDishes = Array.isArray(activeDishes) ? activeDishes : [];
    return safeActiveDishes.filter((dish) => {
      const matchesSearch = !searchTerm || dish.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || dish.category_id === selectedCategory;
      
      const matchesPrice = !advancedFilters.priceRange || 
        (dish.price >= advancedFilters.priceRange.min && dish.price <= advancedFilters.priceRange.max);
      
      const matchesTags = !advancedFilters.tags?.length || 
        advancedFilters.tags.every(tag => dish.tags?.includes(tag));
      
      return matchesSearch && matchesCategory && matchesPrice && matchesTags;
    });
  }, [activeDishes, searchTerm, selectedCategory, advancedFilters]);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      setIsAuthenticated(isAuth);
    };
    checkAuth();
  }, []);

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
    
    const promoDish = dishes.find(d => d.id === promotion.offer_dish_id);
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
      deliveryZones
    );
    
    const discount = calculateDiscount();
    const { total } = orderService.calculateTotals(cartTotal, discount, calculatedDeliveryFee);

    const orderData = {
      order_code: orderCode,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: isAuthenticated ? (await base44.auth.me()).email : undefined,
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
      status: 'new'
    };

    const order = await orderService.createOrder(orderData, createOrderMutation);
    await orderService.updateCouponUsage(appliedCoupon, updateCouponMutation);

    const shouldSend = await whatsappService.shouldSendWhatsApp();

    if (shouldSend) {
      const message = whatsappService.formatOrderMessage(
        order, 
        cart, 
        complementGroups, 
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
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      
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
      {store.banner_image || highlightDishes.length > 0 ? (
        <div className="relative w-full h-[200px] md:h-[300px] overflow-hidden">
          {/* Background Image */}
          {store.banner_image ? (
            <img 
              src={store.banner_image} 
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : highlightDishes[0]?.image ? (
            <img 
              src={highlightDishes[0].image} 
              alt="Destaque"
              className="w-full h-full object-cover"
            />
          ) : null}
          
          {/* Logo como Ícone sobre o Banner */}
          {store.logo && (
            <div className="absolute top-4 left-4 z-20">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 backdrop-blur-sm p-1 shadow-lg">
                <img 
                  src={store.logo} 
                  alt={store.name} 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
          )}
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-lg">{store.name}</h1>
              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="font-medium">{getStatusDisplay.text}</span>
                </div>
                {store.min_order_value > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="opacity-80">Pedido mín.</span>
                    <span className="font-bold">{formatCurrency(store.min_order_value)}</span>
                  </div>
                )}
                <button 
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors text-sm"
                  onClick={() => {
                    // TODO: Implementar modal de perfil da loja
                    toast.success('Perfil da loja em breve!');
                  }}
                >
                  <Info className="w-4 h-4" />
                  Perfil da loja
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
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
              <UserAuthButton />
              <button 
                className="p-2 rounded-lg relative transition-colors text-muted-foreground hover:text-foreground hover:bg-muted" 
                onClick={() => setShowCartModal(true)}
              >
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartItemsCount}
                  </span>
                )}
              </button>
              <button 
                className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted hidden md:flex" 
                onClick={() => setShowOrderHistory(true)}
                title="Meus Pedidos"
              >
                <Clock className="w-5 h-5 md:w-6 md:h-6" />
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

      {/* Category Tabs - Melhoradas */}
      <div className={`bg-card border-b border-border sticky z-30 ${store.banner_image || highlightDishes.length > 0 ? 'md:top-0 top-0' : 'md:top-[120px] top-[165px]'}`}>
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
              {categories.map((cat) => (
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
            <AdvancedFilters 
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
              primaryColor={primaryColor}
              availableTags={store.available_tags}
              tagLabels={store.tag_labels}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-12">
        {/* Banners Configuráveis */}
        {store.banners && store.banners.filter(b => b.active !== false && b.image).length > 0 && (
          <div className="mb-6 space-y-3">
            {store.banners.filter(b => b.active !== false && b.image).map((banner, index) => (
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
            dishes={dishes}
            primaryColor={primaryColor}
            onSelectPromotion={setSelectedDish}
            store={store}
          />
        </div>

        {/* Recent Orders */}
        <RecentOrders
          dishes={activeDishes}
          onSelectDish={setSelectedDish}
          primaryColor={primaryColor}
        />

        {/* Highlights */}
        {highlightDishes.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <h2 className="font-bold text-lg text-foreground">Pratos do Dia</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {highlightDishes.map((dish) => (
                <motion.div
                  key={dish.id}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer relative transition-all duration-300"
                  onClick={() => handleDishClick(dish)}
                >
                  <Badge className="absolute top-3 left-3 z-10 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold shadow-lg">
                    ⭐ Destaque
                  </Badge>
                  <div className="relative h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    {dish.image ? (
                      <>
                        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        <img 
                          src={dish.image} 
                          alt={dish.name} 
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                          loading="lazy"
                          onLoad={(e) => {
                            e.target.previousSibling.style.display = 'none';
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🍽️
                      </div>
                    )}
                  </div>
                    <div className="p-4">
                      <h3 className="font-bold text-base mb-1 text-foreground">{dish.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{dish.description}</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {dish.original_price && dish.original_price > dish.price && (
                            <span className="text-xs text-muted-foreground line-through block mb-0.5">
                              {formatCurrency(dish.original_price)}
                            </span>
                          )}
                          <span className="font-bold text-lg md:text-xl block truncate" style={{ color: primaryColor }}>
                            {dish.product_type === 'pizza' 
                              ? `A partir de ${formatCurrency(pizzaSizes[0]?.price_tradicional || 0)}`
                              : formatCurrency(dish.price)
                            }
                          </span>
                        </div>
                        <button
                          className="px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all flex-shrink-0"
                          style={{ backgroundColor: primaryColor }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDishClick(dish);
                          }}
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* All Dishes */}
        <section>
          <h2 className="font-bold text-lg mb-4 text-foreground">
            {selectedCategory === 'all' 
              ? 'Cardápio Completo' 
              : categories.find(c => c.id === selectedCategory)?.name || 'Pratos'}
          </h2>
          {dishesLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <DishSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredDishes.map((dish) => {
                const isOutOfStock = stockUtils.isOutOfStock(dish.stock);
                const isLowStock = stockUtils.isLowStock(dish.stock);

                return (
                  <motion.div
                    key={dish.id}
                    whileHover={{ y: isOutOfStock ? 0 : -6, scale: isOutOfStock ? 1 : 1.02 }}
                    className={`bg-card border border-border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${
                      isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onClick={() => !isOutOfStock && handleDishClick(dish)}
                  >
                    <div className="relative h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {dish.image ? (
                        <>
                          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          <img 
                            src={dish.image} 
                            alt={dish.name} 
                            className={`w-full h-full object-cover transition-transform duration-300 hover:scale-110 ${isOutOfStock ? 'grayscale' : ''}`}
                            loading="lazy"
                            onLoad={(e) => {
                              if (e.target.previousSibling) {
                                e.target.previousSibling.style.display = 'none';
                              }
                            }}
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                        {isOutOfStock && (
                          <Badge className="bg-gray-600 dark:bg-gray-800 text-white font-semibold shadow-lg">
                            Esgotado
                          </Badge>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg">
                            Últimas unidades
                          </Badge>
                        )}
                        {dish.original_price && dish.original_price > dish.price && (
                          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold shadow-lg">
                            🔥 Oferta
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {dish.is_new && (
                          <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg">
                            ✨ Novo
                          </Badge>
                        )}
                        {dish.is_popular && (
                          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold shadow-lg">
                            🔥 Mais Vendido
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm md:text-base mb-1 text-foreground line-clamp-1">{dish.name}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">{dish.description}</p>
                      {dish.prep_time && (
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{dish.prep_time} min
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                       <div className="flex-1 min-w-0">
                         {dish.original_price && dish.original_price > dish.price && (
                           <span className="text-xs md:text-sm text-muted-foreground line-through block mb-0.5 font-medium">
                             {formatCurrency(dish.original_price)}
                           </span>
                         )}
                         <span className="font-bold text-lg md:text-xl block truncate" style={{ color: primaryColor }}>
                           {dish.product_type === 'pizza' 
                             ? `A partir de ${formatCurrency(pizzaSizes[0]?.price_tradicional || 0)}`
                             : formatCurrency(dish.price)
                           }
                         </span>
                       </div>
                        <button
                          disabled={isOutOfStock}
                          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-white text-xs md:text-sm font-semibold flex-shrink-0 shadow-md hover:shadow-lg transition-all ${
                            isOutOfStock ? 'bg-gray-400 cursor-not-allowed' : ''
                          }`}
                          style={!isOutOfStock ? { backgroundColor: primaryColor } : {}}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) handleDishClick(dish);
                          }}
                        >
                          {isOutOfStock ? 'Esgotado' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {!dishesLoading && filteredDishes.length === 0 && (
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
          
          <button
            onClick={() => setShowOrderHistory(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-medium">Pedidos</span>
          </button>
          
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
      <footer className="bg-card border-t border-border text-foreground mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              {store.logo && (
                <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-lg object-cover mb-4" />
              )}
              <h3 className="font-bold text-lg mb-2">{store.name}</h3>
              {store.slogan && (
                <p className="text-muted-foreground text-sm italic mb-4">"{store.slogan}"</p>
              )}
              {store.address && (
                <p className="text-muted-foreground text-sm mb-2">📍 {store.address}</p>
              )}
              {store.whatsapp && (
                <p className="text-muted-foreground text-sm mb-2">📱 {store.whatsapp}</p>
              )}
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Redes Sociais</h3>
              <div className="space-y-2">
                {store.instagram && (
                  <a 
                    href={store.instagram.startsWith('http') ? store.instagram : `https://instagram.com/${store.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>📷</span>
                    <span className="text-sm">Instagram</span>
                  </a>
                )}
                {store.facebook && (
                  <a 
                    href={store.facebook.startsWith('http') ? store.facebook : `https://facebook.com/${store.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>👥</span>
                    <span className="text-sm">Facebook</span>
                  </a>
                )}
                {store.whatsapp && (
                  <a 
                    href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>💬</span>
                    <span className="text-sm">WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Horário</h3>
              {store.opening_time && store.closing_time && (
                <p className="text-muted-foreground text-sm mb-4">
                  🕒 {store.opening_time} - {store.closing_time}
                </p>
              )}

              {store.payment_methods && store.payment_methods.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-sm mb-3">Formas de Pagamento</h3>
                  <div className="flex flex-wrap gap-2">
                    {store.payment_methods.map((method, idx) => (
                      <div key={idx} className="bg-background border border-border rounded p-2">
                        {method.image ? (
                          <img src={method.image} alt={method.name} className="h-6 object-contain" />
                        ) : (
                          <span className="text-xs text-foreground">{method.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2025 {store.name}. Todos os direitos reservados.
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
        complementGroups={complementGroups}
        onAddToCart={handleAddToCart}
        editingItem={editingCartItem}
        primaryColor={primaryColor}
      />

      {selectedPizza && (
        <PizzaBuilder
          dish={selectedPizza}
          sizes={pizzaSizes}
          flavors={pizzaFlavors}
          edges={pizzaEdges}
          extras={pizzaExtras}
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

      <UpsellModal
        isOpen={showUpsellModal}
        onClose={closeUpsell}
        promotions={upsellPromotions}
        dishes={dishes}
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
          deliveryZones={deliveryZones}
          store={store}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
}