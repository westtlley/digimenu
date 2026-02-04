import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

/**
 * Componente de Cross-sell Inteligente
 * Sugere produtos complementares baseado no carrinho e configurações da loja
 */
export default function SmartUpsell({ 
  cart = [], 
  dishes = [], 
  onAddToCart,
  primaryColor = '#f97316',
  onClose,
  store = null
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  useEffect(() => {
    // Verificar se cross-sell está habilitado
    if (!store?.cross_sell_config?.enabled) {
      setSuggestion(null);
      return;
    }

    if (cart.length === 0) {
      setSuggestion(null);
      return;
    }

    // Resetar sugestões descartadas quando o carrinho muda significativamente
    if (dismissedSuggestions.size > 0 && cart.length > dismissedSuggestions.size) {
      setDismissedSuggestions(new Set());
    }

    const config = store.cross_sell_config;
    const cartTotal = cart.reduce((sum, item) => sum + (item.totalPrice * (item.quantity || 1)), 0);

    // 1. Oferta de Bebida (quando adiciona pizza)
    if (config.beverage_offer?.enabled && !dismissedSuggestions.has('beverage')) {
      const hasPizza = cart.some(item => 
        item.dish?.product_type === 'pizza' || 
        (config.beverage_offer.trigger_product_types || ['pizza']).includes(item.dish?.product_type)
      );
      const hasBeverage = cart.some(item => 
        item.dish?.product_type === 'beverage' ||
        item.dish?.id === config.beverage_offer.dish_id
      );

      if (hasPizza && !hasBeverage && config.beverage_offer.dish_id) {
        const suggestedDish = dishes.find(d => d.id === config.beverage_offer.dish_id);
        if (suggestedDish && suggestedDish.is_active !== false) {
          const discount = config.beverage_offer.discount_percent || 0;
          const finalPrice = suggestedDish.price * (1 - discount / 100);
          
          let message = config.beverage_offer.message || 'Adicione {product_name} por apenas {product_price}';
          message = message.replace('{product_name}', suggestedDish.name);
          message = message.replace('{product_price}', formatCurrency(finalPrice));
          
          setSuggestion({
            type: 'beverage',
            title: config.beverage_offer.title || '🥤 Que tal uma bebida?',
            message: message,
            product: suggestedDish,
            discount: discount
          });
          return;
        }
      }
    }

    // 2. Oferta de Sobremesa (quando carrinho atinge valor mínimo)
    if (config.dessert_offer?.enabled && !dismissedSuggestions.has('dessert')) {
      const minValue = config.dessert_offer.min_cart_value || 40;
      const hasDessert = cart.some(item => 
        item.dish?.id === config.dessert_offer.dish_id
      );

      if (cartTotal >= minValue && !hasDessert && config.dessert_offer.dish_id) {
        const suggestedDish = dishes.find(d => d.id === config.dessert_offer.dish_id);
        if (suggestedDish && suggestedDish.is_active !== false) {
          const discount = config.dessert_offer.discount_percent || 0;
          const finalPrice = suggestedDish.price * (1 - discount / 100);
          
          let message = config.dessert_offer.message || 'Complete seu pedido com {product_name} por apenas {product_price}';
          message = message.replace('{product_name}', suggestedDish.name);
          message = message.replace('{product_price}', formatCurrency(finalPrice));
          
          setSuggestion({
            type: 'dessert',
            title: config.dessert_offer.title || '🍰 Que tal uma sobremesa?',
            message: message,
            product: suggestedDish,
            discount: discount
          });
          return;
        }
      }
    }

    // 3. Oferta de Combo (quando tem X pizzas)
    if (config.combo_offer?.enabled && !dismissedSuggestions.has('combo')) {
      const minPizzas = config.combo_offer.min_pizzas || 2;
      const pizzaCount = cart.filter(item => 
        item.dish?.product_type === 'pizza'
      ).length;
      const hasComboProduct = cart.some(item => 
        item.dish?.id === config.combo_offer.dish_id
      );

      if (pizzaCount >= minPizzas && !hasComboProduct && config.combo_offer.dish_id) {
        const suggestedDish = dishes.find(d => d.id === config.combo_offer.dish_id);
        if (suggestedDish && suggestedDish.is_active !== false) {
          const discount = config.combo_offer.discount_percent || 100;
          const finalPrice = suggestedDish.price * (1 - discount / 100);
          
          let message = config.combo_offer.message || 'Compre {min_pizzas} pizzas e ganhe {product_name} GRÁTIS!';
          message = message.replace('{product_name}', suggestedDish.name);
          message = message.replace('{min_pizzas}', minPizzas.toString());
          
          setSuggestion({
            type: 'combo',
            title: config.combo_offer.title || '🔥 Oferta Especial!',
            message: message,
            product: suggestedDish,
            discount: discount
          });
          return;
        }
      }
    }

    setSuggestion(null);
  }, [cart, dishes, dismissedSuggestions, store]);

  const handleAdd = () => {
    if (!suggestion?.product) return;

    const discount = suggestion.discount || 0;
    const originalPrice = suggestion.product.price || 0;
    const finalPrice = originalPrice * (1 - discount / 100);

    const item = {
      dish: suggestion.product,
      totalPrice: finalPrice,
      quantity: 1
    };

    if (onAddToCart) {
      onAddToCart(item);
    }

    if (discount === 100) {
      toast.success(`${suggestion.product.name} adicionado GRÁTIS! 🎉`);
    } else if (discount > 0) {
      toast.success(`${suggestion.product.name} adicionado com ${discount}% de desconto!`);
    } else {
      toast.success(`${suggestion.product.name} adicionado ao carrinho!`);
    }

    setDismissedSuggestions(prev => new Set([...prev, suggestion.type]));
    setSuggestion(null);
    if (onClose) onClose();
  };

  const handleDismiss = () => {
    if (suggestion) {
      setDismissedSuggestions(prev => new Set([...prev, suggestion.type]));
      setSuggestion(null);
    }
    if (onClose) onClose();
  };

  if (!suggestion) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 right-4 z-40 max-w-sm w-full md:w-auto"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="pr-6">
            <div className="flex items-start gap-3 mb-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                {suggestion.type === 'beverage' && '🥤'}
                {suggestion.type === 'dessert' && '🍰'}
                {suggestion.type === 'combo' && '🔥'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                  {suggestion.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {suggestion.message}
                </p>
              </div>
            </div>

            {suggestion.product?.image && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img 
                  src={suggestion.product.image} 
                  alt={suggestion.product.name}
                  className="w-full h-24 object-cover"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Não, obrigado
              </Button>
              <Button
                onClick={handleAdd}
                size="sm"
                className="flex-1 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                {suggestion.discount === 100 ? 'Adicionar Grátis' : 'Adicionar'}
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
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
