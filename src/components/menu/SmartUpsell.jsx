import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

const RUNTIME_COOLDOWN_MS = 6 * 60 * 1000;

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const loadRuntimeState = (storageKey) => {
  if (typeof window === 'undefined' || !window.localStorage || !storageKey) {
    return { dismissedContexts: {}, lastAcceptedAt: 0 };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { dismissedContexts: {}, lastAcceptedAt: 0 };
    const parsed = JSON.parse(raw);
    return {
      dismissedContexts:
        parsed?.dismissedContexts && typeof parsed.dismissedContexts === 'object' ? parsed.dismissedContexts : {},
      lastAcceptedAt: Number(parsed?.lastAcceptedAt || 0),
    };
  } catch (_error) {
    return { dismissedContexts: {}, lastAcceptedAt: 0 };
  }
};

const persistRuntimeState = (storageKey, state) => {
  if (typeof window === 'undefined' || !window.localStorage || !storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (_error) {
    // noop
  }
};

const buildBeverageMessage = (product) => {
  const productType = String(product?.product_type || '').toLowerCase();
  if (productType === 'pizza') return 'Sua pizza fica ainda melhor com uma bebida bem escolhida.';
  if (productType === 'hamburger') return 'Seu lanche pode sair mais completo com uma bebida em 1 toque.';
  return 'Complete seu pedido com uma bebida pensada para este momento.';
};

export default function SmartUpsell({
  cart = [],
  dishes = [],
  onAddToCart,
  onSelectBeverageSuggestion,
  beverageSuggestions = [],
  currentProduct = null,
  primaryColor = '#f97316',
  onClose,
  store = null,
  slug = '',
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const runtimeStorageKey = useMemo(
    () => `beverage-upsell-execution-v1:${String(slug || store?.id || 'default')}`,
    [slug, store?.id]
  );
  const [runtimeState, setRuntimeState] = useState(() => loadRuntimeState(runtimeStorageKey));

  useEffect(() => {
    setRuntimeState(loadRuntimeState(runtimeStorageKey));
  }, [runtimeStorageKey]);

  useEffect(() => {
    persistRuntimeState(runtimeStorageKey, runtimeState);
  }, [runtimeState, runtimeStorageKey]);

  useEffect(() => {
    const crossSellEnabled = store?.cross_sell_config?.enabled !== false;
    const cartHasBeverage = cart.some((item) => item?.dish?.product_type === 'beverage');
    const currentContextKey = currentProduct?.id ? `post_add:${currentProduct.id}` : null;
    const dismissedAt = currentContextKey ? Number(runtimeState?.dismissedContexts?.[currentContextKey] || 0) : 0;
    const isCoolingDown = dismissedAt > 0 && Date.now() - dismissedAt < RUNTIME_COOLDOWN_MS;

    if (!crossSellEnabled || cart.length === 0) {
      setSuggestion(null);
      return;
    }

    if (
      currentProduct?.id &&
      Array.isArray(beverageSuggestions) &&
      beverageSuggestions.length > 0 &&
      !cartHasBeverage &&
      !isCoolingDown
    ) {
      setSuggestion({
        type: 'beverage_bundle',
        title: 'Quer adicionar uma bebida?',
        message: buildBeverageMessage(currentProduct),
        options: beverageSuggestions.slice(0, 3),
        contextKey: currentContextKey,
      });
      return;
    }

    if (currentProduct?.id && !cartHasBeverage && isCoolingDown) {
      setSuggestion(null);
      return;
    }

    if (dismissedSuggestions.size > 0 && cart.length > dismissedSuggestions.size) {
      setDismissedSuggestions(new Set());
    }

    const config = store?.cross_sell_config;
    const cartTotal = cart.reduce((sum, item) => sum + (Number(item?.totalPrice || 0) * Number(item?.quantity || 1)), 0);

    if (config?.beverage_offer?.enabled && !dismissedSuggestions.has('beverage')) {
      const hasPizza = cart.some((item) =>
        item.dish?.product_type === 'pizza' ||
        (config.beverage_offer.trigger_product_types || ['pizza']).includes(item.dish?.product_type)
      );

      if (hasPizza && !cartHasBeverage && config.beverage_offer.dish_id) {
        const suggestedDish = dishes.find((dish) => dish.id === config.beverage_offer.dish_id);
        if (suggestedDish && suggestedDish.is_active !== false) {
          const discount = Number(config.beverage_offer.discount_percent || 0);
          const finalPrice = Number(suggestedDish.price || 0) * (1 - discount / 100);
          let message = config.beverage_offer.message || 'Adicione {product_name} por apenas {product_price}';
          message = message.replace('{product_name}', suggestedDish.name);
          message = message.replace('{product_price}', formatCurrency(finalPrice));

          setSuggestion({
            type: 'beverage',
            title: config.beverage_offer.title || 'Que tal uma bebida?',
            message,
            product: suggestedDish,
            discount,
          });
          return;
        }
      }
    }

    if (config?.dessert_offer?.enabled && !dismissedSuggestions.has('dessert')) {
      const minValue = Number(config.dessert_offer.min_cart_value || 40);
      const hasDessert = cart.some((item) => item.dish?.id === config.dessert_offer.dish_id);

      if (cartTotal >= minValue && !hasDessert && config.dessert_offer.dish_id) {
        const suggestedDish = dishes.find((dish) => dish.id === config.dessert_offer.dish_id);
        if (suggestedDish && suggestedDish.is_active !== false) {
          const discount = Number(config.dessert_offer.discount_percent || 0);
          const finalPrice = Number(suggestedDish.price || 0) * (1 - discount / 100);
          let message = config.dessert_offer.message || 'Complete seu pedido com {product_name} por apenas {product_price}';
          message = message.replace('{product_name}', suggestedDish.name);
          message = message.replace('{product_price}', formatCurrency(finalPrice));

          setSuggestion({
            type: 'dessert',
            title: config.dessert_offer.title || 'Que tal uma sobremesa?',
            message,
            product: suggestedDish,
            discount,
          });
          return;
        }
      }
    }

    if (config?.combo_offer?.enabled && !dismissedSuggestions.has('combo')) {
      const minPizzas = Number(config.combo_offer.min_pizzas || 2);
      const pizzaCount = cart.filter((item) => item.dish?.product_type === 'pizza').length;
      const hasComboProduct = cart.some((item) => item.dish?.id === config.combo_offer.dish_id);

      if (pizzaCount >= minPizzas && !hasComboProduct && config.combo_offer.dish_id) {
        const suggestedDish = dishes.find((dish) => dish.id === config.combo_offer.dish_id);
        if (suggestedDish && suggestedDish.is_active !== false) {
          const discount = Number(config.combo_offer.discount_percent || 100);
          let message = config.combo_offer.message || 'Compre {min_pizzas} pizzas e ganhe {product_name} GRÁTIS!';
          message = message.replace('{product_name}', suggestedDish.name);
          message = message.replace('{min_pizzas}', minPizzas.toString());

          setSuggestion({
            type: 'combo',
            title: config.combo_offer.title || 'Oferta especial',
            message,
            product: suggestedDish,
            discount,
          });
          return;
        }
      }
    }

    setSuggestion(null);
  }, [beverageSuggestions, cart, currentProduct, dishes, dismissedSuggestions, runtimeState, store]);

  const handleLegacyAdd = () => {
    if (!suggestion?.product || !onAddToCart) return;

    const discount = Number(suggestion.discount || 0);
    const originalPrice = Number(suggestion.product.price || 0);
    const finalPrice = originalPrice * (1 - discount / 100);

    onAddToCart({
      dish: suggestion.product,
      totalPrice: finalPrice,
      quantity: 1,
    });

    if (discount === 100) {
      toast.success(`${suggestion.product.name} adicionado gratis!`);
    } else if (discount > 0) {
      toast.success(`${suggestion.product.name} adicionado com ${discount}% de desconto!`);
    } else {
      toast.success(`${suggestion.product.name} adicionado ao carrinho!`);
    }

    setDismissedSuggestions((current) => new Set([...current, suggestion.type]));
    setSuggestion(null);
    onClose?.();
  };

  const handleBundleAdd = (option) => {
    if (!option || !onSelectBeverageSuggestion) return;
    onSelectBeverageSuggestion(option);
    setRuntimeState((current) => ({
      ...current,
      lastAcceptedAt: Date.now(),
      dismissedContexts: suggestion?.contextKey
        ? Object.fromEntries(
            Object.entries(current?.dismissedContexts || {}).filter(([key]) => key !== suggestion.contextKey)
          )
        : current?.dismissedContexts || {},
    }));
    setSuggestion(null);
    onClose?.();
  };

  const handleDismiss = () => {
    if (suggestion?.type === 'beverage_bundle' && suggestion?.contextKey) {
      setRuntimeState((current) => ({
        ...current,
        dismissedContexts: {
          ...(current?.dismissedContexts || {}),
          [suggestion.contextKey]: Date.now(),
        },
      }));
      setSuggestion(null);
      onClose?.();
      return;
    }

    if (suggestion) {
      setDismissedSuggestions((current) => new Set([...current, suggestion.type]));
      setSuggestion(null);
    }
    onClose?.();
  };

  if (!suggestion) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] md:w-auto"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Fechar sugestao"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="pr-6">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                {suggestion.type === 'beverage_bundle' ? <Sparkles className="w-5 h-5" style={{ color: primaryColor }} /> : '🥤'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{suggestion.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{suggestion.message}</p>
              </div>
            </div>

            {suggestion.type === 'beverage_bundle' ? (
              <div className="space-y-2">
                {suggestion.options.map((option) => (
                  <div
                    key={option.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        {option?.image ? (
                          <img src={option.image} alt={option.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🥤</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{option.name}</p>
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                            {option.badgeLabel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{option.reasonLabel}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold" style={{ color: primaryColor }}>
                              {formatCurrency(option.finalPrice)}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">{option.priceHint}</p>
                          </div>
                          <Button
                            onClick={() => handleBundleAdd(option)}
                            size="sm"
                            className="h-8 px-3 text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            {option.ctaLabel || 'Adicionar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Agora nao
                </Button>
              </div>
            ) : (
              <>
                {suggestion.product?.image && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img src={suggestion.product.image} alt={suggestion.product.name} className="w-full h-24 object-cover" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleDismiss} variant="outline" size="sm" className="flex-1">
                    Nao, obrigado
                  </Button>
                  <Button
                    onClick={handleLegacyAdd}
                    size="sm"
                    className="flex-1 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    {suggestion.discount === 100 ? 'Adicionar gratis' : 'Adicionar'}
                  </Button>
                </div>

                {suggestion.discount === 100 && (
                  <div className="mt-2 text-center">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Oferta especial limitada!
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
