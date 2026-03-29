import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useLanguage } from '@/i18n/LanguageContext';

const RUNTIME_COOLDOWN_MS = 6 * 60 * 1000;

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

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
  if (productType === 'pizza') return 'Monte o combo da sua pizza com uma bebida que a maioria leva junto.';
  if (productType === 'hamburger') return 'Deixe seu lanche mais completo com uma bebida para acompanhar.';
  return 'Complete seu pedido agora com uma bebida que combina com esse momento.';
};

const getBundleTitle = (product) => {
  const productType = String(product?.product_type || '').toLowerCase();
  const seed = `${product?.id || product?.name || 'bundle'}:${productType}`;
  if (productType === 'pizza') {
    return pickVariant(seed, ['Complete sua pizza', 'Monte seu combo da pizza']);
  }
  if (productType === 'hamburger') {
    return pickVariant(seed, ['Complete seu lanche', 'Monte seu combo do lanche']);
  }
  return pickVariant(seed, ['Complete seu pedido', 'Monte seu combo']);
};

const getPersuasiveBadge = (option) => {
  if (option?.badgeLabel) return option.badgeLabel;
  const reason = String(option?.reasonLabel || '').toLowerCase();
  if (reason.includes('mais pedido')) return 'Mais pedido';
  if (reason.includes('combina')) return 'Combina com seu pedido';
  if (option?.type === 'upgrade') return 'Melhor escolha';
  if (option?.scoreLevel === 'Forte') return 'Escolha popular';
  return 'Perfeito para acompanhar';
};

const getSuggestionBenefit = (option) => {
  if (option?.benefitLabel) return option.benefitLabel;
  if (option?.contextSummary) return option.contextSummary;
  const reason = String(option?.reasonLabel || '').toLowerCase();
  const volume = Number(option?.dish?.volume_ml || 0);
  const tags = Array.isArray(option?.dish?.dietary_tags) ? option.dish.dietary_tags : [];

  if (option?.type === 'upgrade') {
    if (volume >= 1500) return 'Melhor para compartilhar';
    if (reason.includes('premium') || tags.includes('premium')) return 'Mais valorizada no pedido';
    return 'Mais completa por pouca diferença';
  }

  if (reason.includes('combina')) return 'Combina com o que você acabou de pedir';
  if (reason.includes('pizza')) return 'Perfeita para acompanhar a pizza';
  if (reason.includes('lanche')) return 'Ajuda a deixar o pedido mais completo';
  if (reason.includes('delivery')) return 'Boa para acompanhar e chegar redonda em casa';
  return 'Deixa o pedido mais redondo sem pesar na decisão';
};

const getSuggestionPriceCopy = (option) => {
  if (option?.priceHint) return option.priceHint;
  const price = formatCurrency(option?.finalPrice);
  if (option?.type === 'upgrade') {
    return option?.deltaPrice > 0 ? `Troque por só +${formatCurrency(option.deltaPrice)}` : 'Troca sem custo extra';
  }
  return `Leve por só +${price}`;
};

const getBundleUrgency = (option, index = 0) => {
  const seed = `${option?.id || option?.name || 'urgency'}:${index}`;
  if (option?.type === 'upgrade') {
    return pickVariant(seed, ['Aproveite agora', 'Antes de finalizar', 'Troca rápida']);
  }
  return pickVariant(seed, ['Aproveite agora', 'Leve antes de finalizar', 'Não esqueça sua bebida']);
};

export default function SmartUpsell({
  cart = [],
  dishes = [],
  onAddToCart,
  onSelectBeverageSuggestion,
  onSelectNextBestAction,
  onDismissSuggestion,
  beverageSuggestions = [],
  nextBestAction = null,
  currentProduct = null,
  primaryColor = '#f97316',
  onClose,
  store = null,
  slug = '',
}) {
  const { t } = useLanguage();
  const smartUpsellText = t('menu.smartUpsell');
  const [suggestion, setSuggestion] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const [addingOptionId, setAddingOptionId] = useState(null);
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

    if (nextBestAction?.actionType === 'DO_NOTHING') {
      setSuggestion(null);
      return;
    }

    if (
      nextBestAction &&
      nextBestAction?.actionType !== 'DO_NOTHING' &&
      currentProduct?.id &&
      !isCoolingDown
    ) {
      setSuggestion({
        type: 'next_best_action',
        title: nextBestAction.title,
        message: nextBestAction.message,
        action: nextBestAction,
        contextKey: currentContextKey,
      });
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
        title: getBundleTitle(currentProduct),
        message: buildBeverageMessage(currentProduct),
        options: orderBeverageSuggestionsForDisplay(beverageSuggestions).slice(0, 3),
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
            title: config.beverage_offer.title || 'Complete seu pedido',
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
  }, [beverageSuggestions, cart, currentProduct, dishes, dismissedSuggestions, nextBestAction, runtimeState, store]);

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
    setAddingOptionId(option.id);
    Promise.resolve(onSelectBeverageSuggestion(option))
      .then(() => {
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
      })
      .finally(() => {
        setAddingOptionId(null);
      });
  };

  const handleNextBestActionClick = () => {
    if (!suggestion?.action || !onSelectNextBestAction) return;
    setAddingOptionId(suggestion.action.id || 'next-best-action');
    Promise.resolve(onSelectNextBestAction(suggestion.action))
      .then(() => {
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
      })
      .finally(() => {
        setAddingOptionId(null);
      });
  };

  const handleDismiss = () => {
    const dismissedSuggestion = suggestion;
    if ((suggestion?.type === 'beverage_bundle' || suggestion?.type === 'next_best_action') && suggestion?.contextKey) {
      setRuntimeState((current) => ({
        ...current,
        dismissedContexts: {
          ...(current?.dismissedContexts || {}),
          [suggestion.contextKey]: Date.now(),
        },
      }));
      setSuggestion(null);
      onDismissSuggestion?.(dismissedSuggestion);
      onClose?.();
      return;
    }

    if (suggestion) {
      setDismissedSuggestions((current) => new Set([...current, suggestion.type]));
      setSuggestion(null);
    }
    onDismissSuggestion?.(dismissedSuggestion);
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
            aria-label={t('productModal.close', 'Fechar')}
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
                {suggestion.type === 'beverage' && (
                  <span className="inline-flex mb-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/70">
                    A maioria leva junto
                  </span>
                )}
                {suggestion.type === 'next_best_action' && suggestion?.action?.badgeLabel ? (
                  <span className="inline-flex mb-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/70">
                    {suggestion.action.badgeLabel}
                  </span>
                ) : null}
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{suggestion.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{suggestion.message}</p>
              </div>
            </div>

            {suggestion.type === 'beverage_bundle' ? (
              <div className="space-y-2">
                {suggestion.options.map((option, index) => {
                  const isLeadOption = index === 0;
                  return (
                  <motion.div
                    key={option.id}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    className={`rounded-xl border p-3 shadow-sm ${
                      isLeadOption
                        ? 'border-orange-300 bg-gradient-to-br from-orange-50 via-white to-amber-50/70 dark:border-orange-500/60 dark:from-gray-900/70 dark:via-gray-900/50 dark:to-orange-950/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 via-white to-orange-50/40 dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-800/70'
                    }`}
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
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full text-gray-700 dark:text-gray-200 shadow-sm ${
                            isLeadOption
                              ? 'bg-orange-100 border border-orange-300 dark:bg-orange-500/10 dark:border-orange-500/50'
                              : 'bg-white/90 dark:bg-gray-800 border border-orange-200/70 dark:border-gray-600'
                          }`}>
                            {isLeadOption ? smartUpsellText.bestOptionNow : getPersuasiveBadge(option)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getSuggestionBenefit(option)}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold tracking-tight" style={{ color: primaryColor }}>
                              {getSuggestionPriceCopy(option)}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">{option.reasonLabel}</p>
                            {option?.combinationLabel ? (
                              <p className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-400">
                                {option.combinationLabel}
                              </p>
                            ) : null}
                            <p className="text-[10px] font-medium mt-1" style={{ color: primaryColor }}>
                              {getBundleUrgency(option, index)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleBundleAdd(option)}
                            size="sm"
                            disabled={addingOptionId === option.id}
                            className={`h-8 px-3 text-white shadow-sm ${isLeadOption ? 'ring-2 ring-orange-200 ring-offset-1 dark:ring-orange-500/40 dark:ring-offset-gray-900' : ''}`}
                            style={{
                              backgroundColor: primaryColor,
                              boxShadow: isLeadOption
                                ? `0 14px 30px ${primaryColor}38`
                                : `0 10px 24px ${primaryColor}26`
                            }}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            {addingOptionId === option.id ? 'Entrando...' : option?.ctaLabel || 'Levar junto'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )})}

                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {smartUpsellText.notNow}
                </Button>
              </div>
            ) : suggestion.type === 'next_best_action' ? (
              <>
                {suggestion.action?.product?.image && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img src={suggestion.action.product.image} alt={suggestion.action.product.name} className="w-full h-28 object-cover" />
                  </div>
                )}

                <div className="mb-3 rounded-xl border border-orange-200/70 bg-orange-50/80 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: primaryColor }}>
                        {suggestion.action?.priceHint || smartUpsellText.completeOrderNow}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {suggestion.action?.product?.name || suggestion.action?.title}
                      </p>
                      {suggestion.action?.benefitLabel ? (
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {suggestion.action.benefitLabel}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex text-[10px] font-semibold px-2 py-1 rounded-full bg-white/90 border border-orange-200 text-gray-700">
                      {suggestion.action?.badgeLabel || smartUpsellText.nextBestAction}
                    </span>
                  </div>
                  {suggestion.action?.urgencyLabel ? (
                    <p className="mt-2 text-[10px] font-medium" style={{ color: primaryColor }}>
                      {suggestion.action.urgencyLabel}
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleDismiss} variant="outline" size="sm" className="flex-1">
                    {smartUpsellText.notNow}
                  </Button>
                  <Button
                    onClick={handleNextBestActionClick}
                    size="sm"
                    className="flex-1 text-white shadow-sm"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 10px 24px ${primaryColor}26` }}
                    disabled={addingOptionId === (suggestion.action?.id || 'next-best-action')}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    {addingOptionId === (suggestion.action?.id || 'next-best-action')
                      ? 'Entrando...'
                      : suggestion.action?.ctaLabel || 'Continuar'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {suggestion.product?.image && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img src={suggestion.product.image} alt={suggestion.product.name} className="w-full h-24 object-cover" />
                  </div>
                )}

                {suggestion.type === 'beverage' && (
                  <div className="mb-3 rounded-lg border border-orange-200/70 bg-orange-50/80 px-3 py-2">
                    <p className="text-xs font-semibold" style={{ color: primaryColor }}>
                      {suggestion.discount > 0
                        ? `Leve por só ${formatCurrency(Number(suggestion.product?.price || 0) * (1 - Number(suggestion.discount || 0) / 100))}`
                        : `Complete por ${formatCurrency(suggestion.product?.price)}`}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {smartUpsellText.lightCompanion}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleDismiss} variant="outline" size="sm" className="flex-1">
                    {smartUpsellText.notNow}
                  </Button>
                  <Button
                    onClick={handleLegacyAdd}
                    size="sm"
                    className="flex-1 text-white shadow-sm"
                    style={{ backgroundColor: primaryColor, boxShadow: `0 10px 24px ${primaryColor}26` }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    {suggestion.discount === 100 ? 'Levar gratis' : 'Levar junto'}
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



