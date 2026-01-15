import React, { useState, useMemo, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Star, Flame, Leaf, Sparkles, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import PizzaVisualizer from './PizzaVisualizer';
import PizzaVisualization from '@/components/pizza/PizzaVisualization';
import PizzaCustomization from './PizzaCustomization';
import PopularCombinations from './PopularCombinations';

const STEPS = ['size', 'flavors', 'extras', 'review'];

export default function PizzaModal({ isOpen, onClose, pizza, onAddToCart, primaryColor = '#f97316', store, editingItem = null }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [flavorCustomizations, setFlavorCustomizations] = useState({});
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [observations, setObservations] = useState('');
  const [customizingFlavor, setCustomizingFlavor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [allFlavors, setAllFlavors] = useState([]);
  const [loadingFlavors, setLoadingFlavors] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const animationsEnabled = store?.enable_pizza_animation !== false;
  
  const pizzaConfig = pizza?.pizza_config || {};
  const sizes = pizzaConfig.sizes || [];
  const flavorIds = pizzaConfig.flavor_ids || [];
  const edges = (pizzaConfig.edges || []).filter(e => e.is_active !== false);
  const extras = (pizzaConfig.extras || []).filter(e => e.is_active !== false);

  useEffect(() => {
    if (isOpen && pizza) {
      loadFlavors();
    }
  }, [isOpen, pizza]);

  const loadFlavors = async () => {
    setLoadingFlavors(true);
    try {
      const allFlavorData = await base44.entities.Flavor.list();
      const pizzaFlavors = allFlavorData.filter(f => 
        flavorIds.includes(f.id) && f.is_active !== false
      );
      setAllFlavors(pizzaFlavors);
    } catch (e) {
      console.error('Erro ao carregar sabores:', e);
      setAllFlavors([]);
    } finally {
      setLoadingFlavors(false);
    }
  };

  const currentSize = sizes.find(s => s.id === selectedSize);
  const maxFlavors = currentSize?.max_flavors || 1;

  // Agrupar sabores por categoria
  const flavorsByCategory = useMemo(() => ({
    tradicional: allFlavors.filter(f => f.category === 'tradicional').sort((a, b) => (b.order_count || 0) - (a.order_count || 0)),
    premium: allFlavors.filter(f => f.category === 'premium').sort((a, b) => (b.order_count || 0) - (a.order_count || 0))
  }), [allFlavors]);

  // Regra de preço: se qualquer sabor for premium, cobra preço premium
  const hasPremiumFlavor = useMemo(() => {
    return selectedFlavors.some(id => {
      const flavor = allFlavors.find(f => f.id === id);
      return flavor?.category === 'premium';
    });
  }, [selectedFlavors, allFlavors]);

  const pizzaBasePrice = useMemo(() => {
    if (!currentSize) return 0;
    return hasPremiumFlavor ? currentSize.price_premium : currentSize.price_tradicional;
  }, [currentSize, hasPremiumFlavor]);

  const totalPrice = useMemo(() => {
    let price = pizzaBasePrice;
    
    if (selectedEdge) {
      const edge = edges.find(e => e.id === selectedEdge);
      price += edge?.price || 0;
    }
    
    selectedExtras.forEach(extraId => {
      const extra = extras.find(e => e.id === extraId);
      price += extra?.price || 0;
    });

    Object.values(flavorCustomizations).forEach(customization => {
      price += customization.extraPrice || 0;
    });
    
    return price * quantity;
  }, [pizzaBasePrice, selectedEdge, selectedExtras, flavorCustomizations, quantity]);

  const selectedFlavorObjects = useMemo(() => {
    return selectedFlavors
      .map(id => allFlavors.find(f => f.id === id))
      .filter(Boolean);
  }, [selectedFlavors, allFlavors]);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        // Carregar dados do item sendo editado
        setEditingItemId(editingItem.id);
        setSelectedSize(editingItem.selections?.size?.id || null);
        setSelectedFlavors(editingItem.selections?.flavors?.map(f => f.id) || []);
        setFlavorCustomizations(editingItem.selections?.customizations || {});
        setSelectedEdge(editingItem.selections?.edge?.id || null);
        setSelectedExtras(editingItem.selections?.extras?.map(e => e.id) || []);
        setObservations(editingItem.observations || '');
        setQuantity(editingItem.quantity || 1);
        setCurrentStep(3); // Ir direto para revisão ao editar
      } else {
        // Resetar tudo para nova pizza
        setEditingItemId(null);
        setCurrentStep(0);
        setSelectedSize(null);
        setSelectedFlavors([]);
        setFlavorCustomizations({});
        setSelectedEdge(null);
        setSelectedExtras([]);
        setObservations('');
        setQuantity(1);
      }
    }
  }, [isOpen, editingItem]);

  const handleFlavorToggle = (flavorId) => {
    if (selectedFlavors.includes(flavorId)) {
      setSelectedFlavors(selectedFlavors.filter(id => id !== flavorId));
      const newCustomizations = { ...flavorCustomizations };
      delete newCustomizations[flavorId];
      setFlavorCustomizations(newCustomizations);
    } else {
      if (selectedFlavors.length < maxFlavors) {
        setSelectedFlavors([...selectedFlavors, flavorId]);
      }
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && !selectedSize) {
      alert('Selecione um tamanho');
      return;
    }
    if (currentStep === 1 && selectedFlavors.length === 0) {
      alert('Selecione pelo menos um sabor');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleAddToCart = () => {
    const item = {
      id: editingItemId || undefined, // Manter ID se estiver editando
      dish: pizza,
      quantity,
      totalPrice,
      observations,
      selections: {
        size: currentSize,
        flavors: selectedFlavorObjects,
        customizations: flavorCustomizations,
        edge: selectedEdge ? edges.find(e => e.id === selectedEdge) : null,
        extras: selectedExtras.map(id => extras.find(e => e.id === id)),
        isPremium: hasPremiumFlavor,
        calculatedPrice: pizzaBasePrice
      }
    };

    onAddToCart(item, editingItemId !== null);
    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const FlavorBadges = ({ flavor }) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {flavor.tags?.includes('mais_pedido') && (
        <Badge className="text-xs bg-yellow-400 text-black">
          <Star className="w-3 h-3 mr-1 fill-current" />
          Top
        </Badge>
      )}
      {flavor.tags?.includes('picante') && (
        <Badge className="text-xs bg-red-500 text-white">
          <Flame className="w-3 h-3 mr-1" />
          Picante
        </Badge>
      )}
      {flavor.tags?.includes('vegano') && (
        <Badge className="text-xs bg-green-500 text-white">
          <Leaf className="w-3 h-3 mr-1" />
          Vegano
        </Badge>
      )}
    </div>
  );

  if (!isOpen) return null;

  if (customizingFlavor) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl max-w-md w-full p-6"
        >
          <h3 className="text-lg font-bold mb-4">Personalize: {customizingFlavor.name}</h3>
          <PizzaCustomization
            flavor={customizingFlavor}
            onCustomize={(customization) => {
              setFlavorCustomizations(prev => ({
                ...prev,
                [customizingFlavor.id]: customization
              }));
              setCustomizingFlavor(null);
            }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <motion.div
        initial={animationsEnabled ? { scale: 0.9, opacity: 0 } : {}}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{pizza?.name}</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-1">{pizza?.description}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex gap-1 sm:gap-2">
            {['Tamanho', 'Sabores', 'Extras', 'Revisar'].map((label, index) => (
              <div key={label} className="flex-1 min-w-0">
                <div className={`h-1.5 sm:h-2 rounded-full transition-all ${
                  index <= currentStep ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
                <p className={`text-[10px] sm:text-xs mt-1 font-medium truncate ${
                  index === currentStep ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Tamanho */}
            {currentStep === 0 && (
              <motion.div
                key="size"
                initial={animationsEnabled ? { x: 20, opacity: 0 } : {}}
                animate={{ x: 0, opacity: 1 }}
                exit={animationsEnabled ? { x: -20, opacity: 0 } : {}}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold mb-4">Escolha o tamanho</h3>
                {sizes.map((size) => (
                  <motion.button
                    key={size.id}
                    whileHover={animationsEnabled ? { scale: 1.02 } : {}}
                    whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                    onClick={() => setSelectedSize(size.id)}
                    className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                      selectedSize === size.id
                        ? 'border-orange-500 bg-orange-50 shadow-lg'
                        : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">{size.name}</p>
                        <p className="text-sm text-gray-600">
                          {size.slices} fatias • Até {size.max_flavors} sabor{size.max_flavors > 1 ? 'es' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500">Tradicional:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(size.price_tradicional)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Premium:</span>
                          <span className="text-lg font-bold text-orange-600">
                            {formatCurrency(size.price_premium)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {selectedSize === size.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Step 2: Sabores */}
            {currentStep === 1 && (
              <motion.div
                key="flavors"
                initial={animationsEnabled ? { x: 20, opacity: 0 } : {}}
                animate={{ x: 0, opacity: 1 }}
                exit={animationsEnabled ? { x: -20, opacity: 0 } : {}}
              >
                <h3 className="text-xl font-bold mb-2">
                  Escolha {maxFlavors > 1 ? `até ${maxFlavors} sabores` : 'o sabor'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedFlavors.length}/{maxFlavors} selecionados
                </p>

                {/* Visualização da Pizza - Melhorada */}
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
                  {selectedEdge ? (
                    <PizzaVisualization
                      selectedSize={currentSize}
                      selectedFlavors={selectedFlavorObjects}
                      selectedEdge={edges.find(e => e.id === selectedEdge)}
                      selectedExtras={selectedExtras.map(id => extras.find(e => e.id === id))}
                    />
                  ) : (
                    <PizzaVisualizer
                      size={currentSize}
                      selectedFlavors={selectedFlavorObjects}
                      animationsEnabled={animationsEnabled}
                    />
                  )}
                </div>

                {/* Alerta de preço premium */}
                {hasPremiumFlavor && (
                  <motion.div
                    initial={animationsEnabled ? { scale: 0.9, opacity: 0 } : {}}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-r from-orange-100 to-yellow-100 border-l-4 border-orange-500 p-4 rounded-lg mb-4"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-orange-600 fill-current" />
                      <p className="text-sm font-semibold text-orange-800">
                        Você selecionou sabor Premium! Preço: {formatCurrency(pizzaBasePrice)}
                      </p>
                    </div>
                  </motion.div>
                )}

                {loadingFlavors && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Carregando sabores...</p>
                  </div>
                )}

                {!loadingFlavors && allFlavors.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">Nenhum sabor disponível</p>
                  </div>
                )}

                {!loadingFlavors && (
                  <>
                    {/* Combinações Populares */}
                    {selectedFlavors.length === 0 && (
                      <PopularCombinations
                        pizza={pizza}
                        onSelectCombination={(flavorIds) => {
                          const validIds = flavorIds.filter(id => 
                            allFlavors.some(f => f.id === id)
                          ).slice(0, maxFlavors);
                          setSelectedFlavors(validIds);
                        }}
                      />
                    )}

                    {/* Sabores Tradicionais */}
                    {flavorsByCategory?.tradicional?.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <h4 className="font-semibold text-lg">Sabores Tradicionais</h4>
                      <Badge variant="outline" className="text-xs">
                        {flavorsByCategory?.tradicional?.length || 0} opções
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {flavorsByCategory.tradicional.map((flavor) => {
                        const isSelected = selectedFlavors.includes(flavor.id);
                        const isDisabled = !isSelected && selectedFlavors.length >= maxFlavors;

                        return (
                          <motion.button
                            key={flavor.id}
                            whileHover={!isDisabled && animationsEnabled ? { scale: 1.02, y: -2 } : {}}
                            whileTap={!isDisabled && animationsEnabled ? { scale: 0.98 } : {}}
                            onClick={() => !isDisabled && handleFlavorToggle(flavor.id)}
                            disabled={isDisabled}
                            className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50 shadow-md'
                                : isDisabled
                                ? 'border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed'
                                : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                            }`}
                          >
                            {flavor.image && (
                              <img src={flavor.image} alt={flavor.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                            )}
                            <p className="font-semibold text-sm">{flavor.name}</p>
                            {flavor.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{flavor.description}</p>
                            )}
                            <FlavorBadges flavor={flavor} />
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            {flavor.ingredients?.length > 0 && isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomizingFlavor(flavor);
                                }}
                                className="mt-2 text-xs text-blue-600 hover:underline"
                              >
                                Personalizar ingredientes →
                              </button>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                    {/* Sabores Premium */}
                    {flavorsByCategory?.premium?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500"></div>
                          <h4 className="font-semibold text-lg">Sabores Premium</h4>
                          <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs">
                            <Sparkles className="w-3 h-3 mr-1 fill-current" />
                            {flavorsByCategory?.premium?.length || 0} opções
                          </Badge>
                        </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {flavorsByCategory.premium.map((flavor) => {
                        const isSelected = selectedFlavors.includes(flavor.id);
                        const isDisabled = !isSelected && selectedFlavors.length >= maxFlavors;

                        return (
                          <motion.button
                            key={flavor.id}
                            whileHover={!isDisabled && animationsEnabled ? { scale: 1.02, y: -2 } : {}}
                            whileTap={!isDisabled && animationsEnabled ? { scale: 0.98 } : {}}
                            onClick={() => !isDisabled && handleFlavorToggle(flavor.id)}
                            disabled={isDisabled}
                            className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                              isSelected
                                ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-lg'
                                : isDisabled
                                ? 'border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed'
                                : 'border-orange-200 hover:border-orange-400 hover:shadow-md'
                            }`}
                          >
                            {flavor.image && (
                              <img src={flavor.image} alt={flavor.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                            )}
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{flavor.name}</p>
                              <Sparkles className="w-4 h-4 text-orange-500 fill-current" />
                            </div>
                            {flavor.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{flavor.description}</p>
                            )}
                            <FlavorBadges flavor={flavor} />
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-7 h-7 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                            {flavor.ingredients?.length > 0 && isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomizingFlavor(flavor);
                                }}
                                className="mt-2 text-xs text-orange-600 hover:underline font-medium"
                              >
                                Personalizar ingredientes →
                              </button>
                            )}
                          </motion.button>
                        );
                      })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Extras */}
            {currentStep === 2 && (
              <motion.div
                key="extras"
                initial={animationsEnabled ? { x: 20, opacity: 0 } : {}}
                animate={{ x: 0, opacity: 1 }}
                exit={animationsEnabled ? { x: -20, opacity: 0 } : {}}
                className="space-y-4 sm:space-y-6"
              >
                {/* Visualização da Pizza com Borda */}
                {edges.length > 0 && (
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 min-h-[280px] sm:min-h-[350px] flex items-center justify-center">
                    <PizzaVisualization
                      selectedSize={currentSize}
                      selectedFlavors={selectedFlavorObjects}
                      selectedEdge={selectedEdge ? edges.find(e => e.id === selectedEdge) : null}
                      selectedExtras={selectedExtras.map(id => extras.find(e => e.id === id))}
                    />
                  </div>
                )}

                {/* Bordas */}
                {edges.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <span>🧀</span>
                      Borda Recheada
                    </h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedEdge(null)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          !selectedEdge
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Sem borda</p>
                          <span className="text-gray-500">R$ 0,00</span>
                        </div>
                      </button>
                      {edges.map((edge) => (
                        <button
                          key={edge.id}
                          onClick={() => setSelectedEdge(edge.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            selectedEdge === edge.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{edge.name}</p>
                            <span className="font-bold text-orange-600">+ {formatCurrency(edge.price)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adicionais */}
                {extras.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Adicionais (opcional)
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Personalize sua pizza com extras deliciosos
                    </p>
                    <div className="space-y-2">
                      {extras.map((extra) => {
                        const isSelected = selectedExtras.includes(extra.id);
                        return (
                          <button
                            key={extra.id}
                            onClick={() => {
                              setSelectedExtras(prev =>
                                prev.includes(extra.id) ? prev.filter(id => id !== extra.id) : [...prev, extra.id]
                              );
                            }}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{extra.name}</p>
                              <span className="font-bold text-orange-600">+ {formatCurrency(extra.price)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Observações</h3>
                  <Textarea
                    placeholder="Ex: Massa bem passada, sem cebola..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {edges.length === 0 && extras.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Nenhum extra disponível</p>
                    <Button onClick={() => setCurrentStep(3)} className="mt-4" style={{ backgroundColor: primaryColor }}>
                      Continuar
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <motion.div
                key="review"
                initial={animationsEnabled ? { x: 20, opacity: 0 } : {}}
                animate={{ x: 0, opacity: 1 }}
                exit={animationsEnabled ? { x: -20, opacity: 0 } : {}}
              >
                <h3 className="text-xl font-bold mb-4">Resumo do Pedido</h3>
                
                {/* Visualização Final - Melhorada */}
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
                  <PizzaVisualization
                    selectedSize={currentSize}
                    selectedFlavors={selectedFlavorObjects}
                    selectedEdge={selectedEdge ? edges.find(e => e.id === selectedEdge) : null}
                    selectedExtras={selectedExtras.map(id => extras.find(e => e.id === id))}
                  />
                </div>

                <div className="space-y-4">
                  {/* Tamanho */}
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Tamanho</p>
                    <p className="font-bold text-lg">{currentSize?.name}</p>
                    <p className="text-sm text-gray-500">{currentSize?.slices} fatias</p>
                  </div>

                  {/* Sabores */}
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-2">Sabores</p>
                    {selectedFlavorObjects.map((flavor, idx) => (
                      <div key={flavor.id} className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: flavor.color }}></span>
                          <span className="font-medium text-sm">{flavor.name}</span>
                          {flavor.category === 'premium' && (
                            <Sparkles className="w-3 h-3 text-orange-500 fill-current" />
                          )}
                        </div>
                        {flavorCustomizations[flavor.id] && (
                          <Badge variant="outline" className="text-xs">Personalizado</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Borda */}
                  {selectedEdge && (
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">Borda</p>
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{edges.find(e => e.id === selectedEdge)?.name}</p>
                        <p className="text-orange-600 font-bold">+ {formatCurrency(edges.find(e => e.id === selectedEdge)?.price)}</p>
                      </div>
                    </div>
                  )}

                  {/* Adicionais */}
                  {selectedExtras.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-600 mb-2">Adicionais</p>
                      {selectedExtras.map(extraId => {
                        const extra = extras.find(e => e.id === extraId);
                        return (
                          <div key={extraId} className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">{extra?.name}</p>
                            <p className="text-orange-600 font-bold text-sm">+ {formatCurrency(extra?.price)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Observações */}
                  {observations && (
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-sm text-gray-600 mb-1">Observações</p>
                      <p className="text-sm">{observations}</p>
                    </div>
                  )}

                  {/* Quantidade */}
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-3">Quantidade</p>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-12 h-12"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-12 h-12"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div 
          className="border-t p-4 sm:p-6 bg-white dark:bg-gray-900 dark:border-gray-700"
          initial={animationsEnabled ? { y: 20, opacity: 0 } : {}}
          animate={{ y: 0, opacity: 1 }}
        >
          {/* Total Price */}
          <motion.div 
            className="flex items-center justify-between mb-3 sm:mb-4 p-3 sm:p-4 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-xl"
            animate={animationsEnabled ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.3 }}
            key={totalPrice}
          >
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total</p>
              {hasPremiumFlavor && (
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">★ Preço Premium</p>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(totalPrice)}
            </p>
          </motion.div>

          {/* Navigation */}
          <div className="flex gap-2 sm:gap-3">
            {currentStep > 0 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                className="flex-1"
                style={{ backgroundColor: primaryColor }}
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                className="flex-1 text-lg font-bold h-14"
                style={{ backgroundColor: primaryColor }}
              >
                <Check className="w-5 h-5 mr-2" />
                Adicionar ao Carrinho
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}