import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, X, Sparkles, Star, ChefHat } from 'lucide-react';
import PizzaVisualization from './PizzaVisualization';
import PizzaVisualizationPremium from './PizzaVisualizationPremium';
import PizzaBuilderMobile from './PizzaBuilderMobile';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function PizzaBuilder({ 
  dish, 
  sizes = [], 
  flavors = [], 
  edges = [], 
  extras = [], 
  onAddToCart, 
  onClose,
  primaryColor = '#f97316',
  editingItem = null
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [wantsEdge, setWantsEdge] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [specifications, setSpecifications] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Buscar configuração da loja para modo premium
  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list().then(stores => stores[0]),
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const usePremiumMode = store?.enable_premium_pizza_visualization !== false;

  const steps = [
    { id: 'size', title: 'Tamanho', icon: '📏', required: true },
    { id: 'flavors', title: 'Sabores', icon: '🍕', required: true },
    { id: 'edge', title: 'Borda', icon: '🧀', required: false },
    { id: 'extras', title: 'Extras', icon: '✨', required: false },
    { id: 'specs', title: 'Observações', icon: '📝', required: false }
  ];

  // Preencher sabor base ao selecionar tamanho
  useEffect(() => {
    if (selectedSize && !editingItem && dish?.default_flavor_id) {
      const defaultFlavor = flavors.find(f => f.id === dish.default_flavor_id);
      if (defaultFlavor && selectedFlavors.length === 0) {
        if (selectedSize.max_flavors === 1) {
          const initialFlavors = Array(selectedSize.slices).fill(defaultFlavor);
          setSelectedFlavors(initialFlavors);
        } else {
          setSelectedFlavors([defaultFlavor]);
        }
      }
    }
  }, [selectedSize, dish, flavors, editingItem]);

  // Carregar dados ao editar
  useEffect(() => {
    if (editingItem) {
      setEditingItemId(editingItem.id);
      if (editingItem.size) setSelectedSize(editingItem.size);
      if (editingItem.flavors) setSelectedFlavors(editingItem.flavors);
      if (editingItem.edge) {
        setWantsEdge(true);
        setSelectedEdge(editingItem.edge);
      } else {
        setWantsEdge(false);
        setSelectedEdge(null);
      }
      if (editingItem.extras) setSelectedExtras(editingItem.extras);
      if (editingItem.specifications) setSpecifications(editingItem.specifications);
    }
  }, [editingItem]);

  const calculatePrice = () => {
    if (!selectedSize) return 0;
    const hasPremium = selectedFlavors.some(f => f.category === 'premium');
    let basePrice = hasPremium ? selectedSize.price_premium : selectedSize.price_tradicional;
    if (selectedEdge) basePrice += selectedEdge.price;
    const extrasPrice = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    return basePrice + extrasPrice;
  };

  const canProceed = () => {
    if (currentStep === 0) return selectedSize !== null;
    if (currentStep === 1) {
      if (dish?.division_mode === 'exact') {
        const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
        return uniqueFlavors.length >= 1 && uniqueFlavors.length <= selectedSize?.max_flavors;
      } else {
        return selectedFlavors.length === selectedSize?.slices;
      }
    }
    if (currentStep === 2) return wantsEdge !== null && (!wantsEdge || selectedEdge !== null);
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (currentStep === 0 && selectedSize?.max_flavors === 1) {
      setCurrentStep(2);
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleAddToCart = () => {
    // Ativar confete se modo premium estiver ativo
    if (usePremiumMode) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    // Aguardar animação antes de adicionar ao carrinho (só no modo premium)
    const delay = usePremiumMode ? 800 : 0;
    
    setTimeout(() => {
      const item = {
        id: editingItemId || undefined,
        dish,
        size: selectedSize,
        flavors: selectedFlavors,
        edge: selectedEdge,
        extras: selectedExtras,
        specifications,
        totalPrice: calculatePrice()
      };
      onAddToCart(item, editingItemId !== null);
    }, delay);
  };

  const addFlavor = (flavor) => {
    if (!selectedSize) return;
    
    if (dish?.division_mode === 'exact') {
      const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
      const totalSlices = selectedSize.slices;
      const maxFlavors = selectedSize.max_flavors;
      
      if (uniqueFlavors.length >= maxFlavors && !uniqueFlavors.includes(flavor.id)) {
        return;
      }
      
      const currentFlavors = [...selectedFlavors, flavor];
      const flavorIds = [...new Set(currentFlavors.map(f => f.id))];
      
      if (flavorIds.length > maxFlavors) return;
      if (currentFlavors.length >= totalSlices) return;
      
      setSelectedFlavors(currentFlavors);
      
      if (flavorIds.length === maxFlavors || currentFlavors.length >= maxFlavors) {
        const newFlavors = [];
        const slicesPerFlavor = Math.floor(totalSlices / flavorIds.length);
        const remainder = totalSlices % flavorIds.length;
        flavorIds.forEach((id, idx) => {
          const flavorObj = flavors.find(f => f.id === id);
          const count = slicesPerFlavor + (idx < remainder ? 1 : 0);
          for (let i = 0; i < count; i++) {
            newFlavors.push(flavorObj);
          }
        });
        setSelectedFlavors(newFlavors);
      }
      return;
    }
    
    if (selectedFlavors.length < selectedSize.slices) {
      setSelectedFlavors([...selectedFlavors, flavor]);
    }
  };

  const removeFlavor = (flavor) => {
    if (dish?.default_flavor_id === flavor.id && dish?.division_mode === 'slices') {
      const defaultFlavorCount = getFlavorCount(flavor.id);
      if (defaultFlavorCount <= 1) return;
    }
    
    if (dish?.division_mode === 'exact') {
      const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
      if (uniqueFlavors.length > 1 && uniqueFlavors.includes(flavor.id)) {
        return;
      }
    }
    
    const index = selectedFlavors.findIndex(f => f.id === flavor.id);
    if (index !== -1) {
      const newFlavors = [...selectedFlavors];
      newFlavors.splice(index, 1);
      setSelectedFlavors(newFlavors);
    }
  };

  const getFlavorCount = (flavorId) => {
    return selectedFlavors.filter(f => f.id === flavorId).length;
  };

  const toggleExtra = (extra) => {
    const isSelected = selectedExtras.find(e => e.id === extra.id);
    if (isSelected) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  // Renderizar versão mobile em telas pequenas
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black/98 via-gray-900/98 to-black/98 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="h-full flex flex-col"
        >
          {/* Header Mobile */}
          <div className="relative px-3 py-3 border-b border-gray-700/50 bg-gradient-to-r from-orange-500/10 via-transparent to-orange-500/10 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
            <h2 className="text-base font-bold text-white truncate flex-1">
              {dish?.name || 'Monte sua Pizza'}
            </h2>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-700/50 rounded-xl text-white flex-shrink-0 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <PizzaBuilderMobile
            dish={dish}
            sizes={sizes}
            flavors={flavors}
            edges={edges}
            extras={extras}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedFlavors={selectedFlavors}
            setSelectedFlavors={setSelectedFlavors}
            wantsEdge={wantsEdge}
            setWantsEdge={setWantsEdge}
            selectedEdge={selectedEdge}
            setSelectedEdge={setSelectedEdge}
            selectedExtras={selectedExtras}
            setSelectedExtras={setSelectedExtras}
            specifications={specifications}
            setSpecifications={setSpecifications}
            calculatePrice={calculatePrice}
            onAddToCart={handleAddToCart}
            onClose={onClose}
            primaryColor={primaryColor}
            usePremiumMode={usePremiumMode}
            showConfetti={showConfetti}
          />
        </motion.div>
      </div>
    );
  }

  // Versão Desktop
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl max-w-5xl w-full h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-gray-700/50"
      >
        {/* Header Desktop Compacto */}
        <div className="relative px-4 py-2.5 border-b border-gray-700/50 bg-gradient-to-r from-orange-500/10 via-transparent to-orange-500/10 backdrop-blur-sm flex items-center justify-between flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5"></div>
          <div className="relative flex-1 min-w-0 pr-2">
            <h2 className="text-lg font-bold text-white truncate">
              {dish?.name || 'Monte sua Pizza'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="relative p-2 hover:bg-gray-700/50 rounded-xl text-white flex-shrink-0 transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Desktop */}
        <div className="px-3 py-2 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <motion.button
                  onClick={() => idx < currentStep && setCurrentStep(idx)}
                  whileHover={idx < currentStep ? { scale: 1.05 } : {}}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                    idx === currentStep
                      ? 'text-white shadow-lg'
                      : idx < currentStep
                      ? 'text-green-400'
                      : 'text-gray-500'
                  }`}
                  style={idx === currentStep ? { 
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    boxShadow: `0 2px 10px ${primaryColor}40`
                  } : idx < currentStep ? {
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  } : {
                    background: 'rgba(55, 65, 81, 0.3)',
                    border: '1px solid rgba(75, 85, 99, 0.3)'
                  }}
                >
                  <span className="text-sm">{step.icon}</span>
                  <span className="text-xs">{step.title}</span>
                  {idx < currentStep && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-2 h-2 text-white" />
                    </motion.div>
                  )}
                </motion.button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content - Desktop Grid Otimizado */}
        <div className="flex-1 overflow-hidden min-h-0 bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="grid grid-cols-[340px_1fr] gap-0 h-full">
            {/* Left: Pizza Visualization */}
            <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-yellow-900/30 backdrop-blur-xl border-r-2 border-orange-500/20 flex-shrink-0">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80')] bg-cover bg-center opacity-[0.08] blur-xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                {usePremiumMode ? (
                  <PizzaVisualizationPremium
                    selectedSize={selectedSize}
                    selectedFlavors={selectedFlavors}
                    selectedEdge={selectedEdge}
                    selectedExtras={selectedExtras}
                    showBackground={false}
                    showConfetti={showConfetti}
                  />
                ) : (
                  <PizzaVisualization
                    selectedSize={selectedSize}
                    selectedFlavors={selectedFlavors}
                    selectedEdge={selectedEdge}
                    selectedExtras={selectedExtras}
                    showBackground={false}
                  />
                )}
              </div>
              {!selectedSize && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center z-20"
                >
                  <div className="text-center space-y-2">
                    <div className="w-20 h-20 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-gray-700/50">
                      <span className="text-4xl">🍕</span>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Selecione um tamanho</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: Options - Compacto para 100% Zoom */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto overscroll-contain">
              <AnimatePresence mode="wait">
                {/* Step 0: Size - Cards Modernos */}
                {currentStep === 0 && (
                  <motion.div
                    key="size"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                        <span className="text-xl">📏</span>
                        Escolha o tamanho
                      </h3>
                      <p className="text-xs text-gray-400">Selecione o tamanho ideal para sua pizza</p>
                    </div>
                    <div className="grid gap-3">
                      {sizes.filter(s => s.is_active).map((size, idx) => (
                        <motion.button
                          key={size.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedSize(size);
                            setSelectedFlavors([]);
                          }}
                          className={`relative p-3 border-2 rounded-xl text-left transition-all duration-300 overflow-hidden group ${
                            selectedSize?.id === size.id
                              ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-orange-600/10 shadow-lg shadow-orange-500/20'
                              : 'border-gray-700 hover:border-gray-600 bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:from-gray-800/70 hover:to-gray-900/70'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h4 className="font-bold text-base text-white">{size.name}</h4>
                                {selectedSize?.id === size.id && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg"
                                  >
                                    <Check className="w-4 h-4 text-white" />
                                  </motion.div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-300 mb-2">
                                <Badge variant="outline" className="bg-gray-800/50 border-gray-600 text-gray-300">
                                  {size.slices} fatias
                                </Badge>
                                <Badge variant="outline" className="bg-gray-800/50 border-gray-600 text-gray-300">
                                  {size.max_flavors} {size.max_flavors === 1 ? 'sabor' : 'sabores'}
                                </Badge>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs text-gray-400">A partir de</span>
                                <span className="font-bold text-xl md:text-2xl bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                                  {formatCurrency(size.price_tradicional)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 1: Flavors - Design Premium */}
                {currentStep === 1 && (
                  <motion.div
                    key="flavors"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <span className="text-2xl">🍕</span>
                        {dish?.division_mode === 'exact' ? 'Escolha os sabores' : 'Complete sua pizza'}
                      </h3>
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-400">
                          {dish?.division_mode === 'exact' ? (
                            <>Até {selectedSize?.max_flavors} sabores • Divisão automática</>
                          ) : (
                            <>
                              <span className="font-semibold text-orange-400">{selectedFlavors.length}</span>
                              <span className="text-gray-500">/</span>
                              <span className="text-gray-400">{selectedSize?.slices} fatias</span>
                            </>
                          )}
                        </p>
                        {selectedFlavors.length > 0 && (
                          <div className="h-2 flex-1 max-w-xs bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(selectedFlavors.length / selectedSize?.slices) * 100}%` }}
                              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                            />
                          </div>
                        )}
                      </div>
                      {dish?.default_flavor_id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl p-3"
                        >
                          <p className="text-sm text-orange-300 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {dish?.division_mode === 'exact' ? (
                              <>Base: {flavors.find(f => f.id === dish.default_flavor_id)?.name}</>
                            ) : (
                              <>Base adicionada. Complete ou repita.</>
                            )}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    {/* Tradicionais - Cards Melhorados */}
                    {flavors.filter(f => f.category === 'tradicional' && f.is_active).length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                          <h4 className="font-bold text-lg text-white flex items-center gap-2">
                            <span>🍕</span>
                            Tradicionais
                          </h4>
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs px-2 py-0.5">
                            {formatCurrency(selectedSize?.price_tradicional)}
                          </Badge>
                        </div>
                        <div className="grid gap-3">
                          {flavors.filter(f => f.category === 'tradicional' && f.is_active).map((flavor, idx) => {
                            const count = getFlavorCount(flavor.id);
                            const isDefaultFlavor = dish?.default_flavor_id === flavor.id;
                            const canRemove = !isDefaultFlavor || count > 1;
                            const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
                            const canAdd = dish?.division_mode === 'exact' 
                              ? (uniqueFlavors.length < selectedSize?.max_flavors || uniqueFlavors.includes(flavor.id))
                              : selectedFlavors.length < selectedSize?.slices;
                            
                            return (
                              <motion.div
                                key={flavor.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                className={`relative p-4 border-2 rounded-2xl transition-all duration-300 overflow-hidden group ${
                                  count > 0
                                    ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-transparent shadow-lg shadow-orange-500/10'
                                    : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:border-gray-600'
                                } ${isDefaultFlavor ? 'ring-2 ring-orange-400/30' : ''}`}
                              >
                                <div className="flex items-center gap-4">
                                  {flavor.image ? (
                                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-gray-700/50">
                                      <img src={flavor.image} alt={flavor.name} className="w-full h-full object-cover" />
                                      {count > 0 && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/40 to-transparent"></div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 text-3xl">
                                      🍕
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h5 className="font-bold text-base md:text-lg text-white">{flavor.name}</h5>
                                      {isDefaultFlavor && (
                                        <Badge className="bg-orange-500 text-white text-xs">Base</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-400 line-clamp-2">{flavor.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {count > 0 && (
                                      <>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => removeFlavor(flavor)}
                                          disabled={!canRemove}
                                          className={`w-9 h-9 rounded-xl bg-gray-900 border-2 border-orange-500 text-orange-500 font-bold flex items-center justify-center hover:bg-gray-800 transition-all ${
                                            !canRemove ? 'opacity-30 cursor-not-allowed' : ''
                                          }`}
                                        >
                                          −
                                        </motion.button>
                                        <span className="font-bold text-orange-400 min-w-[24px] text-center text-base">
                                          {dish?.division_mode === 'exact' && count > 1 ? `${count}/${selectedSize?.slices}` : count}
                                        </span>
                                      </>
                                    )}
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => addFlavor(flavor)}
                                      disabled={!canAdd}
                                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold flex items-center justify-center hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg transition-all"
                                    >
                                      +
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Premium - Cards com Gradiente */}
                    {flavors.filter(f => f.category === 'premium' && f.is_active).length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-1 h-8 bg-gradient-to-b from-yellow-500 via-orange-500 to-orange-600 rounded-full"></div>
                          <h4 className="font-bold text-lg text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400 fill-current" />
                            Premium
                          </h4>
                          <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30 text-xs px-2 py-0.5">
                            {formatCurrency(selectedSize?.price_premium)}
                          </Badge>
                        </div>
                        <div className="grid gap-3">
                          {flavors.filter(f => f.category === 'premium' && f.is_active).map((flavor, idx) => {
                            const count = getFlavorCount(flavor.id);
                            const isDefaultFlavor = dish?.default_flavor_id === flavor.id;
                            const canRemove = !isDefaultFlavor || count > 1;
                            const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
                            const canAdd = dish?.division_mode === 'exact' 
                              ? (uniqueFlavors.length < selectedSize?.max_flavors || uniqueFlavors.includes(flavor.id))
                              : selectedFlavors.length < selectedSize?.slices;
                            
                            return (
                              <motion.div
                                key={flavor.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                className={`relative p-4 border-2 rounded-2xl transition-all duration-300 overflow-hidden group ${
                                  count > 0
                                    ? 'border-yellow-500 bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-transparent shadow-lg shadow-yellow-500/10'
                                    : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:border-yellow-500/50'
                                } ${isDefaultFlavor ? 'ring-2 ring-yellow-400/30' : ''}`}
                              >
                                <div className="flex items-center gap-4">
                                  {flavor.image ? (
                                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-gray-700/50">
                                      <img src={flavor.image} alt={flavor.name} className="w-full h-full object-cover" />
                                      {count > 0 && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/40 to-transparent"></div>
                                      )}
                                      <div className="absolute top-1 right-1">
                                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-yellow-600/30 to-orange-600/30 flex items-center justify-center flex-shrink-0 text-3xl">
                                      ⭐
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h5 className="font-bold text-base md:text-lg text-white">{flavor.name}</h5>
                                      {isDefaultFlavor && (
                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">Base</Badge>
                                      )}
                                      <Sparkles className="w-4 h-4 text-yellow-400 fill-current" />
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-400 line-clamp-2">{flavor.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {count > 0 && (
                                      <>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => removeFlavor(flavor)}
                                          disabled={!canRemove}
                                          className={`w-9 h-9 rounded-xl bg-gray-900 border-2 border-yellow-500 text-yellow-500 font-bold flex items-center justify-center hover:bg-gray-800 transition-all ${
                                            !canRemove ? 'opacity-30 cursor-not-allowed' : ''
                                          }`}
                                        >
                                          −
                                        </motion.button>
                                        <span className="font-bold text-yellow-400 min-w-[24px] text-center text-base">
                                          {dish?.division_mode === 'exact' && count > 1 ? `${count}/${selectedSize?.slices}` : count}
                                        </span>
                                      </>
                                    )}
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => addFlavor(flavor)}
                                      disabled={!canAdd}
                                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold flex items-center justify-center hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg transition-all"
                                    >
                                      +
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 2: Edge - Design Melhorado */}
                {currentStep === 2 && (
                  <motion.div
                    key="edge"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <span className="text-2xl">🧀</span>
                        Deseja adicionar borda?
                      </h3>
                      <p className="text-sm text-gray-400">Escolha uma borda recheada deliciosa</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setWantsEdge(true)}
                        className={`p-4 border-2 rounded-2xl font-semibold transition-all ${
                          wantsEdge === true
                            ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-400 shadow-lg shadow-orange-500/20'
                            : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        ✅ Sim
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setWantsEdge(false);
                          setSelectedEdge(null);
                        }}
                        className={`p-4 border-2 rounded-2xl font-semibold transition-all ${
                          wantsEdge === false
                            ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-400 shadow-lg shadow-orange-500/20'
                            : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        ❌ Não
                      </motion.button>
                    </div>

                    {wantsEdge && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        <h4 className="font-semibold text-gray-300 text-base">Escolha o sabor da borda</h4>
                        <div className="grid gap-3">
                          {edges.filter(e => e.is_active).map((edge, idx) => {
                            const isSelected = selectedEdge?.id === edge.id;
                            return (
                              <motion.button
                                key={edge.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedEdge(edge)}
                                className={`w-full p-4 border-2 rounded-2xl text-left transition-all ${
                                  isSelected
                                    ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-orange-600/10 shadow-lg shadow-orange-500/20'
                                    : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:border-gray-600'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  {edge.image && (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-gray-700/50">
                                      <img src={edge.image} alt={edge.name} className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-base text-white mb-1">{edge.name}</h5>
                                    {edge.description && (
                                      <p className="text-xs text-gray-400 line-clamp-2">{edge.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-orange-400 text-base">+ {formatCurrency(edge.price)}</span>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center"
                                      >
                                        <Check className="w-4 h-4 text-white" />
                                      </motion.div>
                                    )}
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Extras - Design Melhorado */}
                {currentStep === 3 && (
                  <motion.div
                    key="extras"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <span className="text-2xl">✨</span>
                        Adicionais (opcional)
                      </h3>
                      <p className="text-sm text-gray-400">Personalize sua pizza com extras deliciosos</p>
                    </div>
                    <div className="grid gap-3">
                      {extras.filter(e => e.is_active).map((extra, idx) => {
                        const isSelected = selectedExtras.find(e => e.id === extra.id);
                        return (
                          <motion.button
                            key={extra.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleExtra(extra)}
                            className={`w-full p-4 border-2 rounded-2xl text-left transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-orange-600/10 shadow-lg shadow-orange-500/20'
                                : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {extra.image && (
                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-gray-700/50">
                                  <img src={extra.image} alt={extra.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-base text-white mb-1">{extra.name}</h5>
                                {extra.description && (
                                  <p className="text-xs text-gray-400 line-clamp-2">{extra.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-orange-400 text-base">+ {formatCurrency(extra.price)}</span>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center"
                                  >
                                    <Check className="w-4 h-4 text-white" />
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Specifications - Design Melhorado */}
                {currentStep === 4 && (
                  <motion.div
                    key="specs"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <span className="text-2xl">📝</span>
                        Observações
                      </h3>
                      <p className="text-sm text-gray-400">Alguma observação especial para sua pizza?</p>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm mb-2 block">Observações especiais</Label>
                      <Textarea
                        value={specifications}
                        onChange={(e) => setSpecifications(e.target.value)}
                        placeholder="Ex: Sem cebola, bem assada, massa fina..."
                        rows={4}
                        className="mt-2 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 text-sm rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    {/* Summary Moderno */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-2xl p-5 space-y-3 backdrop-blur-sm"
                    >
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        <span>📋</span>
                        Resumo do Pedido
                      </h4>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                          <span className="text-gray-400">Tamanho:</span>
                          <span className="font-semibold text-white">{selectedSize?.name}</span>
                        </div>
                        <div className="flex justify-between items-start py-2 border-b border-gray-700/50">
                          <span className="text-gray-400">Sabores:</span>
                          <div className="text-right">
                            {Object.entries(
                              selectedFlavors.reduce((acc, f) => {
                                acc[f.name] = (acc[f.name] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([name, count]) => (
                              <div key={name} className="text-sm font-semibold text-white mb-1">
                                {count}x {name}
                              </div>
                            ))}
                          </div>
                        </div>
                        {selectedEdge && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                            <span className="text-gray-400">Borda:</span>
                            <span className="font-semibold text-white">{selectedEdge.name}</span>
                          </div>
                        )}
                        {selectedExtras.length > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-gray-400">Extras:</span>
                            <span className="font-semibold text-white text-right">{selectedExtras.map(e => e.name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Moderno Responsivo */}
        <div className="px-3 md:px-6 py-3 md:py-4 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/80 via-gray-900/80 to-gray-800/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Botão Voltar */}
            <div className="order-2 sm:order-1">
              {currentStep > 0 && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="w-full sm:w-auto bg-gray-800/50 border-gray-700 text-white hover:bg-gray-700 h-10 px-4"
                  >
                    Voltar
                  </Button>
                </motion.div>
              )}
            </div>
            
            {/* Total e Ação */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 order-1 sm:order-2">
              <div className="text-left sm:text-right">
                <p className="text-xs text-gray-400 mb-0.5">Total</p>
                <motion.p
                  key={calculatePrice()}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-lg md:text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent"
                >
                  {formatCurrency(calculatePrice())}
                </motion.p>
              </div>
              {currentStep < steps.length - 1 ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="w-full sm:w-auto text-white text-sm h-10 px-6 shadow-lg whitespace-nowrap"
                    style={{ 
                      background: canProceed() 
                        ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
                        : 'linear-gradient(135deg, #4b5563, #374151)',
                      boxShadow: canProceed() ? `0 4px 15px ${primaryColor}40` : 'none'
                    }}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
                  <Button
                    onClick={handleAddToCart}
                    disabled={!selectedSize || selectedFlavors.length === 0}
                    className="w-full sm:w-auto text-white text-sm h-10 px-4 sm:px-6 shadow-lg font-semibold whitespace-nowrap"
                    style={{ 
                      background: (!selectedSize || selectedFlavors.length === 0)
                        ? 'linear-gradient(135deg, #4b5563, #374151)'
                        : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                      boxShadow: (!selectedSize || selectedFlavors.length === 0) 
                        ? 'none' 
                        : `0 4px 20px ${primaryColor}50`
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Adicionar ao Carrinho</span>
                    <span className="sm:hidden">Adicionar</span>
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
