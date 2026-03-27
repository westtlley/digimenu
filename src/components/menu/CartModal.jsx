import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Plus, Minus, ShoppingCart, Edit, Package, Clock, ChefHat, CheckCircle, Truck, MapPin, Ban, Star, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { calculateCartSubtotal, getCartItemLineTotal, getCartItemQuantity, getCartItemUnitPrice } from '@/utils/cartPricing';

const statusConfig = {
  new: { label: 'Novo', color: 'bg-blue-500', icon: Clock },
  accepted: { label: 'Aceito', color: 'bg-green-500', icon: Package },
  preparing: { label: 'Preparando', color: 'bg-yellow-500', icon: ChefHat },
  ready: { label: 'Pronto', color: 'bg-purple-500', icon: CheckCircle },
  going_to_store: { label: 'Entregador indo ao Restaurante', color: 'bg-blue-400', icon: Truck },
  arrived_at_store: { label: 'Entregador no Restaurante', color: 'bg-blue-500', icon: Package },
  picked_up: { label: 'Pedido Coletado', color: 'bg-green-500', icon: Package },
  out_for_delivery: { label: 'Saiu para Entrega', color: 'bg-indigo-500', icon: Truck },
  arrived_at_customer: { label: 'Entregador Chegou', color: 'bg-green-500', icon: MapPin },
  delivered: { label: 'Entregue', color: 'bg-green-600', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: Ban }
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const pickVariant = (seedValue, options = []) => {
  if (!Array.isArray(options) || options.length === 0) return '';
  const seed = String(seedValue || 'default');
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2147483647;
  }
  return options[Math.abs(hash) % options.length];
};

const orderBeverageSuggestionsForDisplay = (options = []) =>
  [...options].sort((left, right) => {
    const scoreOption = (option) => {
      const reason = normalizeText(option?.reasonLabel);
      const level = normalizeText(option?.scoreLevel);
      let score = Number(option?.ranking || 0);

      if (option?.performance?.fixed_as_primary === true) score += 800;
      if (Number(option?.performance?.auto_priority || 0) === 1) score += 260;
      if (Number(option?.performance?.final_score || 0) > 0) score += Number(option.performance.final_score) * 0.45;
      if (normalizeText(option?.offerType).includes('combo')) score += 180;
      if (Number(option?.combinationScore || 0) > 0) score += Number(option.combinationScore) * 0.55;
      if (reason.includes('combina com este item') || reason.includes('combina com')) score += 400;
      if (reason.includes('mais pedido')) score += 220;
      if (level === 'forte') score += 180;
      else if (level === 'boa') score += 120;
      else if (level === 'regular') score += 60;
      if (Number(option?.discountPercent || 0) > 0) score += 90;
      if (normalizeText(option?.badgeLabel).includes('mais indicada')) score += 70;
      if (normalizeText(option?.badgeLabel).includes('upgrade')) score += 40;
      return score;
    };

    return scoreOption(right) - scoreOption(left);
  });

export default function CartModal({
  isOpen,
  onClose,
  onBack = null,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onEditItem,
  onEditPizza,
  darkMode = false,
  primaryColor = '#f97316',
  store = null,
  onReviewBonus = null,
  mobileFullScreen = false,
  smartSuggestions = [],
  smartNudgeMain = null,
  smartNudgeSecondary = null,
  onSelectSuggestion = null,
  enableSmartSuggestions = true,
  beverageSuggestions = [],
  onSelectBeverageSuggestion = null,
  nextBestAction = null,
  onSelectNextBestAction = null,
}) {
  const [activeTab, setActiveTab] = useState('cart'); // 'cart' ou 'orders'
  const [showRatingModal, setShowRatingModal] = useState(null);
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const prevOrdersRef = useRef([]);
  const dialogRef = useRef(null);
  const queryClient = useQueryClient();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const renderComboBreakdown = (item, { indent = false } = {}) => {
    const groups = item?.selections?.combo_groups;
    if (!Array.isArray(groups) || groups.length === 0) return null;

    const lines = [];
    groups.forEach((g) => {
      if (!g) return;
      const title = g.title || 'Itens do combo';
      const isDrinkGroup = /bebid/i.test(title);
      const groupEmoji = isDrinkGroup ? '🥤' : '🍽️';
      const groupLabel = isDrinkGroup ? 'BEBIDAS' : 'PRATOS';
      const items = Array.isArray(g.items) ? g.items : [];
      if (items.length === 0) return;

      lines.push({ type: 'title', text: `${groupEmoji} ${groupLabel}: ${title}`, isDrinkGroup });

      items.forEach((it) => {
        if (!it) return;
        const instances = Array.isArray(it.instances) && it.instances.length > 0
          ? it.instances
          : Array.from({ length: Math.max(1, it.quantity || 1) }, () => null);
        const baseName = it.dish_name || it.dishName || it.dish_id || 'Item';

        instances.forEach((inst, instIdx) => {
          const showIndex = instances.length > 1;
          const itemLabel = isDrinkGroup ? 'Bebida' : 'Prato';
          const prefix = showIndex ? `${itemLabel} ${instIdx + 1}: ` : '';
          lines.push({ type: 'item', text: `${prefix}${baseName}` });
          const sel = inst?.selections;
          if (sel && typeof sel === 'object') {
            Object.values(sel).forEach((groupSel) => {
              if (Array.isArray(groupSel)) {
                groupSel.forEach((opt) => {
                  if (opt?.name) lines.push({ type: 'sub', text: opt.name });
                });
              } else if (groupSel?.name) {
                lines.push({ type: 'sub', text: groupSel.name });
              }
            });
          }
        });
      });
    });

    if (lines.length === 0) return null;

    return (
      <div className={`${indent ? 'ml-5' : ''} mt-1 space-y-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {lines.map((l, idx) => {
          if (l.type === 'title') {
            return (
              <p key={idx} className={`text-[11px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {l.text}
              </p>
            );
          }
          if (l.type === 'item') {
            return (
              <p key={idx} className="text-[11px]">
                - {l.text}
              </p>
            );
          }
          return (
            <p key={idx} className="text-[11px] ml-3">
              ↳ {l.text}
            </p>
          );
        })}
      </div>
    );
  };

  const cartTotal = calculateCartSubtotal(cart);
  const cartItemsCount = cart.reduce((sum, item) => sum + getCartItemQuantity(item), 0);
  const cartHasBeverage = cart.some((item) => item?.dish?.product_type === 'beverage');
  const freeDeliveryMin = Number(store?.free_delivery_min_value || 0);
  const hasFreeDeliveryProgress = freeDeliveryMin > 0 && cartTotal > 0 && cartTotal < freeDeliveryMin;
  const cartIncentiveMessage = (() => {
    if (smartNudgeMain) {
      return smartNudgeMain;
    }
    if (hasFreeDeliveryProgress) {
      return `Faltam ${formatCurrency(freeDeliveryMin - cartTotal)} para tentar frete grátis.`;
    }
    if (!cartHasBeverage) {
      return 'Dica: adicionar uma bebida costuma aumentar o valor percebido do pedido.';
    }
    return 'Seu carrinho está pronto para checkout.';
  })();
  const cartSecondaryMessage = !hasFreeDeliveryProgress && smartNudgeSecondary ? smartNudgeSecondary : null;
  const hasOrderOptimizationDecision = Boolean(nextBestAction);
  const shouldRenderNextBestAction = Boolean(nextBestAction && nextBestAction?.actionType !== 'DO_NOTHING');
  const visibleSmartSuggestions = enableSmartSuggestions && Array.isArray(smartSuggestions)
    ? (mobileFullScreen ? smartSuggestions.slice(0, 1) : smartSuggestions.slice(0, 2))
    : [];
  const shouldRenderSmartSuggestions = !hasOrderOptimizationDecision && visibleSmartSuggestions.length > 0;
  const orderedBeverageSuggestions = Array.isArray(beverageSuggestions)
    ? orderBeverageSuggestionsForDisplay(beverageSuggestions)
    : [];
  const visibleBeverageSuggestions = mobileFullScreen
    ? orderedBeverageSuggestions.slice(0, 1)
    : orderedBeverageSuggestions.slice(0, 2);
  const shouldRenderBeverageSuggestions = !hasOrderOptimizationDecision && visibleBeverageSuggestions.length > 0;
  const [addingBeverageId, setAddingBeverageId] = useState(null);
  const [acceptedBeverageId, setAcceptedBeverageId] = useState(null);
  const getBeveragePanelTitle = () => {
    const seed = `${cartItemsCount}:${cartHasBeverage ? 'upgrade' : 'upsell'}`;
    if (cartHasBeverage) {
      return pickVariant(seed, ['Seu pedido pode ficar ainda melhor', 'Deixe seu pedido mais completo']);
    }
    return pickVariant(seed, ['Complete seu pedido com uma bebida', 'Monte seu combo antes de finalizar']);
  };
  const getBeveragePanelSubtitle = () =>
    cartHasBeverage
      ? 'Uma troca pequena pode deixar a bebida mais interessante ou mais economica.'
      : 'A maioria leva junto para acompanhar e fechar o pedido sem pensar muito.';
  const getBeverageBadge = (suggestion) => {
    if (suggestion?.badgeLabel) return suggestion.badgeLabel;
    const reason = String(suggestion?.reasonLabel || '').toLowerCase();
    if (reason.includes('mais pedido')) return 'Mais pedido';
    if (reason.includes('combina')) return 'Combina com esse prato';
    if (suggestion?.type === 'upgrade') return 'Melhor opção';
    if (suggestion?.scoreLevel === 'Forte') return 'Escolha popular';
    return 'Perfeito para acompanhar';
  };
  const getBeverageBenefit = (suggestion) => {
    if (suggestion?.benefitLabel) return suggestion.benefitLabel;
    if (suggestion?.contextSummary) return suggestion.contextSummary;
    const reason = String(suggestion?.reasonLabel || '').toLowerCase();
    const volume = Number(suggestion?.dish?.volume_ml || 0);
    const premiumHint = String(suggestion?.readout || '').toLowerCase();

    if (suggestion?.type === 'upgrade') {
      if (volume >= 1500) return 'Melhor para compartilhar';
      if (premiumHint.includes('ticket') || premiumHint.includes('premium')) return 'Mais valorizada no pedido';
      return 'Mais completa por pouca diferença';
    }
    if (reason.includes('mais pedido')) return 'A maioria leva junto';
    if (reason.includes('combina')) return 'Combina com o que voce escolheu';
    if (reason.includes('pizza')) return 'Perfeita para acompanhar a pizza';
    if (reason.includes('delivery')) return 'Boa para acompanhar em casa';
    return 'Ajuda a deixar o pedido mais redondo';
  };
  const getBeveragePriceCopy = (suggestion) => {
    if (suggestion?.priceHint) return suggestion.priceHint;
    if (suggestion?.type === 'upgrade') {
      return suggestion?.deltaPrice > 0
        ? `Troque por +${formatCurrency(suggestion.deltaPrice)}`
        : 'Troque sem custo extra';
    }
    return `Leve por +${formatCurrency(suggestion?.finalPrice)}`;
  };
  const getBeverageActionLabel = (suggestion) => {
    if (acceptedBeverageId === suggestion?.id) return 'Entrou no pedido';
    if (addingBeverageId === suggestion?.id) return 'Adicionando...';
    return suggestion?.ctaLabel || (suggestion?.type === 'upgrade' ? 'Trocar agora' : 'Levar junto');
  };
  const getCheckoutPrompt = () => {
    if (hasOrderOptimizationDecision && !shouldRenderNextBestAction) {
      return 'O sistema segurou novas sugestoes para manter o fechamento do pedido leve.';
    }
    if (shouldRenderNextBestAction) {
      return nextBestAction?.message || 'O sistema encontrou uma ultima acao que pode valorizar melhor este pedido.';
    }
    const seed = `${cartTotal}:${cartHasBeverage ? 'upgrade' : 'upsell'}`;
    if (cartHasBeverage && shouldRenderBeverageSuggestions) {
      return pickVariant(seed, [
        'Antes de finalizar, veja se vale trocar por uma bebida melhor.',
        'Seu pedido ja tem bebida. Uma troca pequena pode valorizar mais.',
      ]);
    }
    if (shouldRenderBeverageSuggestions) {
      return pickVariant(seed, [
        'Quer completar com uma bebida antes de finalizar?',
        'Seu pedido pode ficar ainda melhor com uma bebida.',
      ]);
    }
    return 'Revise o pedido e finalize quando estiver tudo certo.';
  };
  const getNextBestActionLabel = () => {
    if (acceptedBeverageId === nextBestAction?.id) return 'Entrou no pedido';
    if (addingBeverageId === nextBestAction?.id) return 'Aplicando...';
    return nextBestAction?.ctaLabel || 'Continuar';
  };
  const handleBeverageQuickAdd = async (suggestion) => {
    if (!suggestion || !onSelectBeverageSuggestion) return;
    setAddingBeverageId(suggestion.id);
    try {
      await Promise.resolve(onSelectBeverageSuggestion(suggestion));
      setAcceptedBeverageId(suggestion.id);
      window.setTimeout(() => {
        setAcceptedBeverageId((current) => (current === suggestion.id ? null : current));
      }, 1400);
    } finally {
      setAddingBeverageId(null);
    }
  };
  const handleNextBestQuickAdd = async () => {
    if (!nextBestAction || !onSelectNextBestAction) return;
    setAddingBeverageId(nextBestAction.id);
    try {
      await Promise.resolve(onSelectNextBestAction(nextBestAction));
      setAcceptedBeverageId(nextBestAction.id);
      window.setTimeout(() => {
        setAcceptedBeverageId((current) => (current === nextBestAction.id ? null : current));
      }, 1400);
    } finally {
      setAddingBeverageId(null);
    }
  };

  // Buscar pedidos do cliente autenticado (incluindo entregues recentemente)
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customerOrdersInCart'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user || !user.email) {
          console.log('❌ Usuário não autenticado ou sem email');
          return [];
        }

        console.log('🔍 Buscando pedidos para:', user.email);
        const allOrders = await base44.entities.Order.list('-created_date');
        console.log('📦 Total de pedidos no sistema:', allOrders.length);
        
        // Filtrar apenas pedidos do cliente que não estão finalizados ou cancelados
        // Mas também incluir entregues recentemente (últimas 5 horas) para avaliação
        const fiveHoursAgo = new Date();
        fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
        
        const customerOrders = allOrders.filter(o => {
          // Verificar se é pedido do cliente (por email ou telefone)
          const isCustomerByEmail = o.customer_email === user.email || o.created_by === user.email;
          
          // Caso o cliente não esteja autenticado, também buscar por telefone
          // (se o telefone do usuário estiver disponível no perfil)
          const isCustomerByPhone = user.phone && o.customer_phone && 
            o.customer_phone.replace(/\D/g, '') === user.phone.replace(/\D/g, '');
          
          const isCustomerOrder = isCustomerByEmail || isCustomerByPhone;
          
          // Incluir pedidos ativos (não entregues nem cancelados)
          const isActive = o.status !== 'delivered' && o.status !== 'cancelled';
          
          // Incluir pedidos entregues recentemente (para avaliação)
          const isDeliveredRecently = o.status === 'delivered' && 
            o.delivered_at && 
            new Date(o.delivered_at) > fiveHoursAgo && 
            !o.restaurant_rating;
          
          return isCustomerOrder && (isActive || isDeliveredRecently);
        });

        console.log('✅ Pedidos do cliente encontrados:', customerOrders.length);
        if (customerOrders.length > 0) {
          console.log('📋 IDs dos pedidos:', customerOrders.map(o => `#${o.order_code} (${o.status})`).join(', '));
        }
        
        return customerOrders;
      } catch (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        return [];
      }
    },
    enabled: isOpen,
    refetchInterval: 2000, // ⚡ Atualizar a cada 2 segundos (tempo real)
    refetchOnWindowFocus: true, // Atualizar quando voltar para a aba
    refetchOnMount: true // Atualizar ao abrir o modal
  });

  // Detectar mudanças de status em tempo real e notificar o cliente
  useEffect(() => {
    if (!isOpen || ordersLoading || orders.length === 0) return;

    const prevOrders = prevOrdersRef.current;

    // Detectar pedidos entregues (para modal de avaliação)
    const currentDelivered = orders.filter(o => o.status === 'delivered' && !o.restaurant_rating);
    const prevDelivered = prevOrders.filter(o => o.status === 'delivered' && !o.restaurant_rating);

    const newDelivered = currentDelivered.find(o => 
      !prevDelivered.find(p => p.id === o.id)
    );

    if (newDelivered && !showRatingModal) {
      setTimeout(() => {
        setShowRatingModal(newDelivered);
      }, 1000);
    }

    // Detectar mudanças de status (para notificação)
    if (prevOrders.length > 0) {
      orders.forEach(order => {
        const prevOrder = prevOrders.find(p => p.id === order.id);
        
        // Se o pedido existia antes e mudou de status
        if (prevOrder && prevOrder.status !== order.status) {
          const config = statusConfig[order.status];
          const Icon = config?.icon || Clock;
          
          console.log(`🔔 Status atualizado: Pedido #${order.order_code} → ${config?.label || order.status}`);
          
          // Notificação visual
          toast.success(
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              <div>
                <p className="font-bold">Status atualizado!</p>
                <p className="text-sm">Pedido #{order.order_code}: {config?.label || order.status}</p>
              </div>
            </div>,
            {
              duration: 4000,
              position: 'top-center',
              style: {
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }
            }
          );

          // Som de notificação (apenas para status importantes)
          if (['ready', 'out_for_delivery', 'arrived_at_customer', 'delivered'].includes(order.status)) {
            try {
              const audio = new Audio('/notification.mp3'); // Você pode adicionar um arquivo de áudio
              audio.volume = 0.5;
              audio.play().catch(() => {}); // Ignorar erro se não tiver permissão
            } catch (e) {
              // Silenciosamente ignorar se não conseguir tocar o som
            }
          }
        }
      });
    }

    prevOrdersRef.current = orders;
  }, [orders, ordersLoading, isOpen, showRatingModal]);

  // Mutation para salvar avaliação
  const submitRatingMutation = useMutation({
    mutationFn: async ({ orderId, ratings }) => {
      const order = orders.find(o => o.id === orderId);
      
      // Criar avaliação do entregador se houver
      if (order.entregador_id && ratings.deliveryRating > 0) {
        try {
          await base44.entities.DeliveryRating.create({
            order_id: orderId,
            entregador_id: order.entregador_id,
            rating: ratings.deliveryRating,
            comment: ratings.comment,
            rated_by: 'customer'
          });
        } catch (e) {
          console.log('Erro ao criar avaliação do entregador:', e);
        }
      }
      
      // Salvar avaliação do restaurante no pedido
      await base44.entities.Order.update(orderId, {
        ...order,
        restaurant_rating: ratings.restaurantRating,
        rating_comment: ratings.comment
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['customerOrdersInCart'] });
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      queryClient.invalidateQueries({ queryKey: ['customerOrders'] });
      setShowRatingModal(null);
      setRestaurantRating(0);
      setDeliveryRating(0);
      setComment('');
      
      // Aplicar bônus de avaliação
      if (onReviewBonus) {
        try {
          const result = await onReviewBonus();
          if (result && result.success) {
            toast.success(result.message, { duration: 5000 });
          } else {
            toast.success('Avaliação enviada! Obrigado pelo feedback.');
          }
        } catch (error) {
          console.error('Erro ao aplicar bônus de avaliação:', error);
          toast.success('Avaliação enviada! Obrigado pelo feedback.');
        }
      } else {
        toast.success('Avaliação enviada! Obrigado pelo feedback.');
      }
    },
    onError: (error) => {
      console.error('Erro ao enviar avaliação:', error);
      toast.error('Erro ao enviar avaliação. Tente novamente.');
    }
  });

  const handleSubmitRating = () => {
    if (restaurantRating === 0) {
      toast.error('Por favor, avalie o restaurante');
      return;
    }
    
    submitRatingMutation.mutate({
      orderId: showRatingModal.id,
      ratings: {
        restaurantRating,
        deliveryRating: showRatingModal.delivery_method === 'delivery' ? deliveryRating : 0,
        comment
      }
    });
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={mobileFullScreen
          ? "fixed inset-0 z-[70] flex items-stretch justify-center p-0 bg-black/70"
          : "fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
        }
        onClick={mobileFullScreen ? undefined : onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Carrinho e pedidos"
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl overflow-hidden flex flex-col ${
            mobileFullScreen
              ? 'w-full h-[100dvh] max-h-[100dvh] rounded-none max-w-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
              : 'rounded-none'
          }`}
          style={mobileFullScreen ? undefined : {
            position: 'fixed',
            top: 0,
            right: 0,
            left: 'auto',
            margin: 0,
            width: '400px',
            maxWidth: '95vw',
            height: '100vh',
            maxHeight: 'none'
          }}
          >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
            <div className="flex items-center gap-2 min-w-0">
              {mobileFullScreen && (
                <button
                  onClick={onBack || onClose}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  aria-label="Voltar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
              <h2 className={`text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>Carrinho</h2>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`} aria-label="Fechar carrinho">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
            <button
              onClick={() => setActiveTab('cart')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'cart'
                  ? darkMode ? 'text-white border-b-2' : 'text-gray-900 border-b-2'
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === 'cart' ? { borderBottomColor: primaryColor } : {}}
            >
              Carrinho {cart.length > 0 && `(${cart.length})`}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === 'orders'
                  ? darkMode ? 'text-white border-b-2' : 'text-gray-900 border-b-2'
                  : darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === 'orders' ? { borderBottomColor: primaryColor } : {}}
            >
              <span className="flex items-center justify-center gap-2">
                Meus Pedidos
                {activeTab === 'orders' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded uppercase">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </span>
              {orders.length > 0 && (
                <span className={`absolute top-1 right-2 w-5 h-5 ${statusConfig[orders[0]?.status]?.color || 'bg-red-500'} text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse`}>
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTab === 'cart' ? (
              // Carrinho
              cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }} />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Carrinho vazio</p>
                </div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.id} className={`flex gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    {/* Image */}
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                      {item.dish?.image ? (
                        <img src={item.dish.image} alt={item.dish.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Sem foto
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.dish?.name}
                      </h3>
                      {(item.dish?.product_type === 'combo' || Array.isArray(item?.selections?.combo_groups)) ? (
                        renderComboBreakdown(item)
                      ) : item.selections && Object.keys(item.selections).length > 0 && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'} line-clamp-2`}>
                          {Object.entries(item.selections)
                            .filter(([key]) => key !== 'combo_groups')
                            .map(([, sel]) => {
                              if (Array.isArray(sel)) return sel.map(s => s.name).join(', ');
                              return sel?.name;
                            })
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-sm" style={{ color: primaryColor }}>
                          {formatCurrency(getCartItemUnitPrice(item))}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`text-sm font-medium w-6 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {getCartItemQuantity(item)}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          if (item.dish?.product_type === 'pizza' && onEditPizza) {
                            onEditPizza(item);
                          } else {
                            onEditItem(item);
                          }
                        }}
                        className={`p-1 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    </div>
                  ))}

                  {shouldRenderNextBestAction && (
                    <div className="mt-1 space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Proxima melhor acao
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {nextBestAction?.title || 'O sistema decidiu o melhor proximo passo para valorizar este pedido'}
                        </p>
                      </div>
                      <motion.div
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.985 }}
                        className={`rounded-2xl border p-3 shadow-sm transition-all ${
                          acceptedBeverageId === nextBestAction?.id
                            ? 'border-emerald-300 bg-emerald-50/80'
                            : 'border-orange-300 bg-gradient-to-br from-orange-50 via-white to-amber-50/70'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                            {nextBestAction?.product?.image ? (
                              <img src={nextBestAction.product.image} alt={nextBestAction.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">✨</div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-card-foreground line-clamp-2">
                                {nextBestAction?.product?.name || nextBestAction?.title}
                              </p>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-white">
                                {nextBestAction?.badgeLabel || 'Melhor opcao'}
                              </Badge>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                              {nextBestAction?.benefitLabel || nextBestAction?.message}
                            </p>
                            <div className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 border border-border/60">
                              <span className="text-xs font-bold tracking-tight" style={{ color: primaryColor }}>
                                {nextBestAction?.priceHint || `Leve por +${formatCurrency(nextBestAction?.product?.price)}`}
                              </span>
                              {nextBestAction?.urgencyLabel ? (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {nextBestAction.urgencyLabel}
                                </p>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              disabled={addingBeverageId === nextBestAction?.id}
                              className="mt-3 h-8 w-full px-2 text-xs text-white shadow-sm ring-2 ring-orange-200 ring-offset-1"
                              style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 14px 30px ${primaryColor}38`
                              }}
                              onClick={handleNextBestQuickAdd}
                            >
                              {getNextBestActionLabel()}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {shouldRenderBeverageSuggestions && (
                    <div className="mt-1 space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {getBeveragePanelTitle()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {getBeveragePanelSubtitle()}
                        </p>
                      </div>
                      <div className="flex gap-2 overflow-x-auto mobile-scroll-x pb-1">
                        {visibleBeverageSuggestions.map((suggestion, index) => {
                          const isLeadSuggestion = index === 0;
                          return (
                          <motion.div
                            key={suggestion.id}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.985 }}
                            className={`min-w-[182px] max-w-[210px] rounded-xl border p-2.5 shadow-sm transition-all ${
                              acceptedBeverageId === suggestion?.id
                                ? 'border-emerald-300 bg-emerald-50/80'
                                : isLeadSuggestion
                                  ? 'border-orange-300 bg-gradient-to-br from-orange-50 via-white to-amber-50/70'
                                  : 'border-border bg-gradient-to-br from-card via-card to-orange-50/40'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                {isLeadSuggestion ? 'Melhor opcao' : getBeverageBadge(suggestion)}
                              </Badge>
                            </div>
                            <div className="w-full h-20 rounded-md overflow-hidden bg-muted mb-2">
                              {suggestion?.image ? (
                                <img src={suggestion.image} alt={suggestion.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">🥤</div>
                              )}
                            </div>
                            <p className="text-xs font-semibold line-clamp-2 min-h-[2rem] text-card-foreground">
                              {suggestion?.name}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 min-h-[2rem]">
                              {getBeverageBenefit(suggestion)}
                            </p>
                            <div className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 border border-border/60">
                              <span className="text-xs font-bold tracking-tight" style={{ color: primaryColor }}>
                                {getBeveragePriceCopy(suggestion)}
                              </span>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {suggestion?.reasonLabel}
                              </p>
                              {suggestion?.combinationLabel ? (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {suggestion.combinationLabel}
                                </p>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              disabled={addingBeverageId === suggestion?.id}
                              className={`mt-2 h-8 w-full px-2 text-xs text-white shadow-sm ${isLeadSuggestion ? 'ring-2 ring-orange-200 ring-offset-1' : ''}`}
                              style={{
                                backgroundColor: primaryColor,
                                boxShadow: isLeadSuggestion
                                  ? `0 14px 30px ${primaryColor}38`
                                  : `0 10px 24px ${primaryColor}26`
                              }}
                              onClick={() => handleBeverageQuickAdd(suggestion)}
                            >
                              {getBeverageActionLabel(suggestion)}
                            </Button>
                          </motion.div>
                        )})}
                      </div>
                    </div>
                  )}

                  {shouldRenderSmartSuggestions && (
                    <div className="mt-1 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Complete seu pedido com
                      </p>
                      <div className="flex gap-2 overflow-x-auto mobile-scroll-x pb-1">
                        {visibleSmartSuggestions.map((suggestion, index) => (
                          <div
                            key={suggestion.id}
                            className="min-w-[170px] max-w-[190px] rounded-lg border border-border bg-card p-2"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                {index === 0 ? 'Sugestão principal' : 'Alternativa'}
                              </Badge>
                            </div>
                            <div className="w-full h-20 rounded-md overflow-hidden bg-muted mb-2">
                              {suggestion?.image ? (
                                <img src={suggestion.image} alt={suggestion.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem foto</div>
                              )}
                            </div>
                            <p className="text-xs font-semibold line-clamp-2 min-h-[2rem] text-card-foreground">
                              {suggestion?.name}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold" style={{ color: primaryColor }}>
                                {formatCurrency(suggestion?.price)}
                              </span>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs text-white"
                                style={{ backgroundColor: primaryColor }}
                                onClick={() => onSelectSuggestion?.(suggestion)}
                              >
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            ) : (
              // Pedidos do Cliente
              ordersLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }} />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Carregando pedidos...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: darkMode ? '#6b7280' : '#9ca3af' }} />
                  <p className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nenhum pedido ativo
                  </p>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Seus pedidos em andamento aparecerão aqui com atualização em tempo real
                  </p>
                  <div className={`text-xs p-3 rounded-lg ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                    💡 Faça um pedido e acompanhe o status em tempo real!
                  </div>
                </div>
              ) : (
                orders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.new;
                  const StatusIcon = status.icon;

                  return (
                    <div key={order.id} className={`rounded-xl p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      {/* Header do Pedido */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Pedido #{order.order_code || order.id?.slice(-6)}
                          </p>
                          {order.created_date && (
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {format(new Date(order.created_date), 'dd/MM/yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                        <Badge className={`${status.color} text-white flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </div>

                      {/* Itens do Pedido */}
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className={`text-xs border-l-2 pl-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {getCartItemQuantity(item)}x
                                </span>
                                <span className={`font-semibold flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.dish?.name}
                                </span>
                                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {formatCurrency(getCartItemLineTotal(item))}
                                </span>
                              </div>
                              {(item.dish?.product_type === 'combo' || Array.isArray(item?.selections?.combo_groups)) ? (
                                renderComboBreakdown(item, { indent: true })
                              ) : item.selections && Object.keys(item.selections).length > 0 && (
                                <div className={`ml-5 mt-1 space-y-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {Object.entries(item.selections)
                                    .filter(([key]) => key !== 'combo_groups')
                                    .map(([groupId, sel]) => {
                                    if (Array.isArray(sel)) {
                                      return sel.map((opt, i) => <p key={i}>• {opt.name}</p>);
                                    } else if (sel) {
                                      return <p key={groupId}>• {sel.name}</p>;
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Total e Endereço */}
                      <div className={`flex items-center justify-between pt-3 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</span>
                        <span className="font-bold text-base" style={{ color: primaryColor }}>
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      {order.delivery_method === 'delivery' && order.address && (
                        <div className={`mt-2 text-xs flex items-start gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Truck className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{order.address}</span>
                        </div>
                      )}

                      {order.status === 'arrived_at_customer' && order.delivery_code && (
                        <div className={`mt-3 rounded-lg p-3 text-center border-2 ${darkMode ? 'bg-yellow-900/20 border-yellow-600' : 'bg-yellow-100 border-yellow-400'}`}>
                          <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                            Código de Validação
                          </p>
                          <p className={`text-2xl font-bold tracking-widest ${darkMode ? 'text-yellow-200' : 'text-yellow-900'}`}>
                            {order.delivery_code}
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                            Forneça ao entregador
                          </p>
                        </div>
                      )}

                      {/* Botão de Avaliação para pedidos entregues */}
                      {order.status === 'delivered' && !order.restaurant_rating && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: darkMode ? '#4b5563' : '#e5e7eb' }}>
                          <button
                            onClick={() => setShowRatingModal(order)}
                            className={`w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
                            style={{ 
                              backgroundColor: primaryColor,
                              color: 'white'
                            }}
                          >
                            <Star className="w-4 h-4 fill-current" />
                            Avaliar Pedido
                          </button>
                        </div>
                      )}

                      {/* Mostrar avaliação já feita */}
                      {order.status === 'delivered' && order.restaurant_rating && (
                        <div className={`mt-3 pt-3 border-t flex items-center justify-center gap-1 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Avaliado: {order.restaurant_rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Footer - Apenas para a aba do carrinho */}
          {activeTab === 'cart' && cart.length > 0 && (
            <div className={`border-t p-4 space-y-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {/* 🚚 Barra de Progresso de Frete Grátis */}
              {hasFreeDeliveryProgress && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Frete grátis acima de {formatCurrency(freeDeliveryMin)}
                    </span>
                    <span className={`font-bold ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                      Faltam {formatCurrency(freeDeliveryMin - cartTotal)}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-blue-800' : 'bg-blue-200'}`}>
                    <div 
                      className={`h-full transition-all duration-500 ${darkMode ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-blue-500 to-green-500'}`}
                      style={{ width: `${Math.min((cartTotal / freeDeliveryMin) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className={`rounded-xl border p-3 space-y-2 ${darkMode ? 'border-gray-600 bg-gray-700/40' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Itens</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{cartItemsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: darkMode ? '#4b5563' : '#e5e7eb' }}>
                  <span className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Total</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
              </div>

              <div className={`rounded-lg px-3 py-2 text-xs font-medium ${darkMode ? 'bg-blue-900/30 text-blue-200 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {cartIncentiveMessage}
              </div>
              {cartSecondaryMessage && (
                <div className={`rounded-lg px-3 py-2 text-[11px] ${darkMode ? 'bg-gray-800/60 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                  {cartSecondaryMessage}
                </div>
              )}

              {false && (
                <div className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Complete seu pedido com
                  </p>
                  <div className={mobileFullScreen ? 'grid grid-cols-1 gap-2' : 'flex gap-2 overflow-x-auto pb-1'}>
                    {visibleSmartSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.id}
                        className={mobileFullScreen
                          ? `w-full rounded-lg border p-2 ${darkMode ? 'border-gray-600 bg-gray-700/40' : 'border-gray-200 bg-white'}`
                          : `min-w-[180px] max-w-[180px] rounded-lg border p-2 ${darkMode ? 'border-gray-600 bg-gray-700/40' : 'border-gray-200 bg-white'}`
                        }
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            {index === 0 ? 'Sugestão principal' : 'Alternativa'}
                          </Badge>
                          {suggestion?._merchandising?.label && mobileFullScreen && (
                            <p className={`text-[10px] line-clamp-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {suggestion._merchandising.label}
                            </p>
                          )}
                        </div>
                        <div className={mobileFullScreen ? 'flex items-center gap-2' : 'block'}>
                          <div className={mobileFullScreen ? 'w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0' : 'w-full h-20 rounded-md overflow-hidden bg-gray-100 mb-2'}>
                            {suggestion?.image ? (
                              <img src={suggestion.image} alt={suggestion.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Sem foto</div>
                            )}
                          </div>
                          <div className={mobileFullScreen ? 'flex-1 min-w-0' : ''}>
                            <p className={`text-xs font-semibold line-clamp-2 ${mobileFullScreen ? '' : 'min-h-[2rem]'} ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {suggestion?.name}
                            </p>
                            {suggestion?._merchandising?.label && !mobileFullScreen && (
                              <p className={`text-[10px] mt-0.5 line-clamp-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                {suggestion._merchandising.label}
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold" style={{ color: primaryColor }}>
                                {formatCurrency(suggestion?.price)}
                              </span>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs text-white"
                                style={{ backgroundColor: primaryColor }}
                                onClick={() => onSelectSuggestion?.(suggestion)}
                              >
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`rounded-lg px-3 py-2 text-[11px] font-medium ${
                darkMode ? 'bg-orange-900/20 text-orange-200 border border-orange-800/70' : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                {getCheckoutPrompt()}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Continuar
                </Button>
                <Button
                  onClick={onCheckout}
                  className="flex-1 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Finalizar Pedido
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Modal de Avaliação */}
      {showRatingModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowRatingModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
          >
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Avalie sua experiência
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Pedido #{showRatingModal.order_code || showRatingModal.id?.slice(-6)}
            </p>
            
            {/* Restaurante */}
            <div className="space-y-2 mb-4">
              <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Restaurante *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRestaurantRating(star)}
                    className="text-3xl transition-transform hover:scale-110"
                  >
                    {star <= restaurantRating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Entregador */}
            {showRatingModal.delivery_method === 'delivery' && (
              <div className="space-y-2 mb-4">
                <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Entregador (opcional)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setDeliveryRating(star)}
                      className="text-3xl transition-transform hover:scale-110"
                    >
                      {star <= deliveryRating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comentário */}
            <div className="space-y-2 mb-4">
              <label className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Comentário (opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos sobre sua experiência..."
                className={`w-full p-3 border rounded-lg resize-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' : 'bg-white border-gray-300'}`}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowRatingModal(null)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={restaurantRating === 0 || submitRatingMutation.isPending}
                className="flex-1 text-white"
                style={{ 
                  backgroundColor: (restaurantRating === 0 || submitRatingMutation.isPending) ? '#d1d5db' : primaryColor 
                }}
              >
                {submitRatingMutation.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
