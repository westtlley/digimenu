import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, ChevronRight, X } from 'lucide-react';
import PizzaVisualization from './PizzaVisualization';

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

  const steps = [
    { id: 'size', title: 'Tamanho', required: true },
    { id: 'flavors', title: 'Sabores', required: true },
    { id: 'edge', title: 'Borda', required: false },
    { id: 'extras', title: 'Extras', required: false },
    { id: 'specs', title: 'Observações', required: false }
  ];

  // Preencher sabor base ao selecionar tamanho
  useEffect(() => {
    if (selectedSize && !editingItem && dish?.default_flavor_id) {
      const defaultFlavor = flavors.find(f => f.id === dish.default_flavor_id);
      if (defaultFlavor && selectedFlavors.length === 0) {
        // Se for 1 sabor, preencher todas as fatias
        if (selectedSize.max_flavors === 1) {
          const initialFlavors = Array(selectedSize.slices).fill(defaultFlavor);
          setSelectedFlavors(initialFlavors);
        } else {
          // Para múltiplos sabores, começar com 1 fatia do sabor base
          setSelectedFlavors([defaultFlavor]);
        }
      }
    }
  }, [selectedSize, dish, flavors, editingItem]);

  // Carregar dados ao editar
  useEffect(() => {
    if (editingItem) {
      setEditingItemId(editingItem.id);
      
      // Carregar tamanho
      if (editingItem.size) {
        setSelectedSize(editingItem.size);
      }
      
      // Carregar sabores
      if (editingItem.flavors) {
        setSelectedFlavors(editingItem.flavors);
      }
      
      // Carregar borda
      if (editingItem.edge) {
        setWantsEdge(true);
        setSelectedEdge(editingItem.edge);
      } else {
        setWantsEdge(false);
        setSelectedEdge(null);
      }
      
      // Carregar extras
      if (editingItem.extras) {
        setSelectedExtras(editingItem.extras);
      }
      
      // Carregar observações
      if (editingItem.specifications) {
        setSpecifications(editingItem.specifications);
      }
    }
  }, [editingItem]);

  const calculatePrice = () => {
    if (!selectedSize) return 0;
    
    // Verificar se tem algum sabor premium
    const hasPremium = selectedFlavors.some(f => f.category === 'premium');
    let basePrice = hasPremium ? selectedSize.price_premium : selectedSize.price_tradicional;
    
    // Adicionar preço da borda
    if (selectedEdge) {
      basePrice += selectedEdge.price;
    }
    
    // Adicionar preço dos extras
    const extrasPrice = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    
    return basePrice + extrasPrice;
  };

  const canProceed = () => {
    if (currentStep === 0) return selectedSize !== null;
    
    if (currentStep === 1) {
      if (dish?.division_mode === 'exact') {
        // Modo exato: verificar se tem pelo menos 1 sabor e não mais que o máximo
        const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
        return uniqueFlavors.length >= 1 && uniqueFlavors.length <= selectedSize?.max_flavors;
      } else {
        // Modo por fatias: verificar se completou todas as fatias
        return selectedFlavors.length === selectedSize?.slices;
      }
    }
    
    if (currentStep === 2) return wantsEdge !== null && (!wantsEdge || selectedEdge !== null);
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    
    // Se for tamanho de 1 sabor apenas, pular etapa de sabores
    if (currentStep === 0 && selectedSize?.max_flavors === 1) {
      setCurrentStep(2); // Pular para bordas
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleAddToCart = () => {
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
  };

  const addFlavor = (flavor) => {
    if (!selectedSize) return;
    
    // Modo de divisão exata
    if (dish?.division_mode === 'exact') {
      const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
      const totalSlices = selectedSize.slices;
      const maxFlavors = selectedSize.max_flavors;
      
      // Se já atingiu o máximo de sabores diferentes
      if (uniqueFlavors.length >= maxFlavors && !uniqueFlavors.includes(flavor.id)) {
        return;
      }
      
      // Calcular distribuição exata
      const currentFlavors = [...selectedFlavors, flavor];
      const flavorIds = [...new Set(currentFlavors.map(f => f.id))];
      
      if (flavorIds.length > maxFlavors) return;
      
      // Distribuir fatias igualmente
      const slicesPerFlavor = Math.floor(totalSlices / flavorIds.length);
      const remainder = totalSlices % flavorIds.length;
      
      // Se já temos uma distribuição completa, não adicionar mais
      if (currentFlavors.length >= totalSlices) return;
      
      setSelectedFlavors(currentFlavors);
      
      // Se completou os sabores necessários, distribuir automaticamente
      if (flavorIds.length === maxFlavors || currentFlavors.length >= maxFlavors) {
        const newFlavors = [];
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
    
    // Modo por fatias (original)
    if (selectedFlavors.length < selectedSize.slices) {
      setSelectedFlavors([...selectedFlavors, flavor]);
    }
  };

  const removeFlavor = (flavor) => {
    // Não permitir remover o sabor padrão se for divisão por fatias
    if (dish?.default_flavor_id === flavor.id && dish?.division_mode === 'slices') {
      const defaultFlavorCount = getFlavorCount(flavor.id);
      if (defaultFlavorCount <= 1) {
        return; // Não pode remover a última fatia do sabor padrão
      }
    }
    
    // Em modo exato, não permitir remover se for um dos sabores já definidos
    if (dish?.division_mode === 'exact') {
      const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
      if (uniqueFlavors.length > 1 && uniqueFlavors.includes(flavor.id)) {
        return; // Não pode remover sabores já definidos em modo exato
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

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-0 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1a1a1a] rounded-none md:rounded-2xl max-w-6xl w-full h-full md:h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header Compacto */}
        <div className="px-3 md:px-5 py-2.5 md:py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base md:text-lg font-bold text-white truncate">{dish?.name || 'Monte sua Pizza'}</h2>
            {dish?.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate hidden md:block">{dish.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-lg text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Compacto */}
        <div className="px-3 md:px-5 py-2 border-b border-gray-800 bg-[#0a0a0a] flex-shrink-0">
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => idx < currentStep && setCurrentStep(idx)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    idx === currentStep
                      ? 'text-white'
                      : idx < currentStep
                      ? 'bg-green-900/30 text-green-400 border border-green-700'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                  style={idx === currentStep ? { backgroundColor: primaryColor } : {}}
                >
                  {idx < currentStep && <Check className="w-3 h-3" />}
                  <span>{step.title}</span>
                  {step.required && idx >= currentStep && <span className="text-red-500">*</span>}
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content - Grid com altura controlada */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid lg:grid-cols-[420px_1fr] gap-0 lg:gap-3 h-full">
            {/* Left: Pizza Visualization */}
            <div className="relative lg:rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-yellow-900/20 backdrop-blur-xl lg:border lg:border-gray-800/50 h-[280px] lg:h-full lg:sticky lg:top-0">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80')] bg-cover bg-center opacity-5 blur-sm"></div>
              <PizzaVisualization
                selectedSize={selectedSize}
                selectedFlavors={selectedFlavors}
                selectedEdge={selectedEdge}
                selectedExtras={selectedExtras}
              />
            </div>

            {/* Right: Options */}
            <div className="p-3 md:p-4 space-y-3 overflow-y-auto lg:max-h-full">
              <AnimatePresence mode="wait">
                {/* Step 0: Size */}
                {currentStep === 0 && (
                  <motion.div
                    key="size"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <h3 className="text-base md:text-lg font-bold text-white">Escolha o tamanho</h3>
                    <div className="grid gap-2">
                      {sizes.filter(s => s.is_active).map(size => (
                        <button
                          key={size.id}
                          onClick={() => {
                            setSelectedSize(size);
                            setSelectedFlavors([]);
                          }}
                          className={`p-3 border-2 rounded-xl text-left transition-all ${
                            selectedSize?.id === size.id
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-sm md:text-base text-white">{size.name}</h4>
                              <p className="text-xs text-gray-400">
                                {size.slices} fatias • {size.max_flavors} {size.max_flavors === 1 ? 'sabor' : 'sabores'}
                              </p>
                              <span className="text-xs text-gray-500">A partir de </span>
                              <span className="font-bold text-sm" style={{ color: primaryColor }}>
                                {formatCurrency(size.price_tradicional)}
                              </span>
                            </div>
                            {selectedSize?.id === size.id && (
                              <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 1: Flavors */}
                {currentStep === 1 && (
                  <motion.div
                    key="flavors"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <div>
                      <h3 className="text-base md:text-lg font-bold text-white">
                        {dish?.division_mode === 'exact' ? 'Escolha os sabores' : 'Complete sua pizza'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {dish?.division_mode === 'exact' ? (
                          <>Até {selectedSize?.max_flavors} sabores • Divisão automática</>
                        ) : (
                          <>{selectedFlavors.length}/{selectedSize?.slices} fatias</>
                        )}
                      </p>
                      {dish?.default_flavor_id && (
                        <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-2 mt-2">
                          <p className="text-xs text-orange-300">
                            {dish?.division_mode === 'exact' ? (
                              <>✓ Base: {flavors.find(f => f.id === dish.default_flavor_id)?.name}</>
                            ) : (
                              <>✓ Base adicionada. Complete ou repita.</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tradicionais */}
                    <div>
                      <h4 className="font-semibold text-gray-300 mb-2 flex items-center gap-2 text-sm">
                        <span>🍕 Tradicionais</span>
                        <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600 text-xs">
                          {formatCurrency(selectedSize?.price_tradicional)}
                        </Badge>
                      </h4>
                      <div className="grid gap-2">
                        {flavors.filter(f => f.category === 'tradicional' && f.is_active).map(flavor => {
                          const count = getFlavorCount(flavor.id);
                          const isDefaultFlavor = dish?.default_flavor_id === flavor.id;
                          const canRemove = !isDefaultFlavor || count > 1;
                          const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
                          const canAdd = dish?.division_mode === 'exact' 
                            ? (uniqueFlavors.length < selectedSize?.max_flavors || uniqueFlavors.includes(flavor.id))
                            : selectedFlavors.length < selectedSize?.slices;
                          
                          return (
                            <div
                              key={flavor.id}
                              className={`p-2 md:p-3 border-2 rounded-xl transition-all ${
                                count > 0
                                  ? 'border-orange-500 bg-orange-500/10'
                                  : 'border-gray-700 bg-gray-800/50'
                              } ${isDefaultFlavor ? 'ring-2 ring-orange-400/30' : ''}`}
                            >
                              <div className="flex items-center gap-2 md:gap-3">
                                {flavor.image && (
                                  <img src={flavor.image} alt={flavor.name} className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-sm md:text-base text-white flex items-center gap-1">
                                    {flavor.name}
                                    {isDefaultFlavor && <Badge className="text-xs bg-orange-500">Base</Badge>}
                                  </h5>
                                  <p className="text-xs text-gray-400 line-clamp-1">{flavor.description}</p>
                                </div>
                                <div className="flex items-center gap-1.5 md:gap-2">
                                  {count > 0 && (
                                    <>
                                      <button
                                        onClick={() => removeFlavor(flavor)}
                                        disabled={!canRemove}
                                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-900 border-2 border-orange-500 text-orange-500 font-bold flex items-center justify-center hover:bg-gray-800 ${
                                          !canRemove ? 'opacity-30 cursor-not-allowed' : ''
                                        }`}
                                      >
                                        −
                                      </button>
                                      <span className="font-bold text-orange-500 min-w-[16px] md:min-w-[20px] text-center text-sm md:text-base">
                                        {dish?.division_mode === 'exact' && count > 1 ? `${count}/${selectedSize?.slices}` : count}
                                      </span>
                                    </>
                                  )}
                                  <button
                                    onClick={() => addFlavor(flavor)}
                                    disabled={!canAdd}
                                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Premium */}
                    <div>
                      <h4 className="font-semibold text-gray-300 mb-2 flex items-center gap-2 text-sm">
                        <span>⭐ Premium</span>
                        <Badge variant="outline" className="bg-yellow-900/30 text-yellow-400 border-yellow-700 text-xs">
                          {formatCurrency(selectedSize?.price_premium)}
                        </Badge>
                      </h4>
                      <div className="grid gap-2">
                        {flavors.filter(f => f.category === 'premium' && f.is_active).map(flavor => {
                          const count = getFlavorCount(flavor.id);
                          const isDefaultFlavor = dish?.default_flavor_id === flavor.id;
                          const canRemove = !isDefaultFlavor || count > 1;
                          const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
                          const canAdd = dish?.division_mode === 'exact' 
                            ? (uniqueFlavors.length < selectedSize?.max_flavors || uniqueFlavors.includes(flavor.id))
                            : selectedFlavors.length < selectedSize?.slices;
                          
                          return (
                            <div
                              key={flavor.id}
                              className={`p-2 md:p-3 border-2 rounded-xl transition-all ${
                                count > 0
                                  ? 'border-orange-500 bg-orange-500/10'
                                  : 'border-gray-700 bg-gray-800/50'
                              } ${isDefaultFlavor ? 'ring-2 ring-orange-400/30' : ''}`}
                            >
                              <div className="flex items-center gap-2 md:gap-3">
                                {flavor.image && (
                                  <img src={flavor.image} alt={flavor.name} className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-sm md:text-base text-white flex items-center gap-1">
                                    {flavor.name}
                                    {isDefaultFlavor && <Badge className="text-xs bg-orange-500">Base</Badge>}
                                  </h5>
                                  <p className="text-xs text-gray-400 line-clamp-1">{flavor.description}</p>
                                </div>
                                <div className="flex items-center gap-1.5 md:gap-2">
                                  {count > 0 && (
                                    <>
                                      <button
                                        onClick={() => removeFlavor(flavor)}
                                        disabled={!canRemove}
                                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-900 border-2 border-orange-500 text-orange-500 font-bold flex items-center justify-center hover:bg-gray-800 ${
                                          !canRemove ? 'opacity-30 cursor-not-allowed' : ''
                                        }`}
                                      >
                                        −
                                      </button>
                                      <span className="font-bold text-orange-500 min-w-[16px] md:min-w-[20px] text-center text-sm md:text-base">
                                        {dish?.division_mode === 'exact' && count > 1 ? `${count}/${selectedSize?.slices}` : count}
                                      </span>
                                    </>
                                  )}
                                  <button
                                    onClick={() => addFlavor(flavor)}
                                    disabled={!canAdd}
                                    className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Edge */}
                {currentStep === 2 && (
                  <motion.div
                    key="edge"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <h3 className="text-base md:text-lg font-bold text-white">Deseja adicionar borda?</h3>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => setWantsEdge(true)}
                        className={`p-3 border-2 rounded-lg font-medium transition-all text-sm ${
                          wantsEdge === true
                            ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                            : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        ✅ Sim
                      </button>
                      <button
                        onClick={() => {
                          setWantsEdge(false);
                          setSelectedEdge(null);
                        }}
                        className={`p-3 border-2 rounded-lg font-medium transition-all text-sm ${
                          wantsEdge === false
                            ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                            : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        ❌ Não
                      </button>
                    </div>

                    {wantsEdge && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-300 text-sm">Escolha o sabor da borda</h4>
                        {edges.filter(e => e.is_active).map(edge => {
                          const isSelected = selectedEdge?.id === edge.id;
                          return (
                            <button
                              key={edge.id}
                              onClick={() => setSelectedEdge(edge)}
                              className={`w-full p-2 border-2 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-500/10'
                                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {edge.image && (
                                  <img src={edge.image} alt={edge.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-sm text-white">{edge.name}</h5>
                                  {edge.description && (
                                    <p className="text-xs text-gray-400 truncate">{edge.description}</p>
                                  )}
                                </div>
                                <span className="font-bold text-orange-500 text-sm flex-shrink-0">+ {formatCurrency(edge.price)}</span>
                                {isSelected && <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Extras */}
                {currentStep === 3 && (
                  <motion.div
                    key="extras"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <h3 className="text-base md:text-lg font-bold text-white">Adicionais (opcional)</h3>
                    <div className="grid gap-2">
                      {extras.filter(e => e.is_active).map(extra => {
                        const isSelected = selectedExtras.find(e => e.id === extra.id);
                        return (
                          <button
                            key={extra.id}
                            onClick={() => toggleExtra(extra)}
                            className={`p-2 border-2 rounded-lg text-left transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {extra.image && (
                                <img src={extra.image} alt={extra.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-semibold text-sm text-white">{extra.name}</h5>
                                {extra.description && (
                                  <p className="text-xs text-gray-400 truncate">{extra.description}</p>
                                )}
                              </div>
                              <span className="font-bold text-orange-500 text-sm flex-shrink-0">+ {formatCurrency(extra.price)}</span>
                              {isSelected && <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Specifications */}
                {currentStep === 4 && (
                  <motion.div
                    key="specs"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <h3 className="text-base md:text-lg font-bold text-white">Observações</h3>
                    <div>
                      <Label className="text-gray-300 text-sm">Alguma observação especial?</Label>
                      <Textarea
                        value={specifications}
                        onChange={(e) => setSpecifications(e.target.value)}
                        placeholder="Ex: Sem cebola, bem assada..."
                        rows={3}
                        className="mt-2 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                      />
                    </div>

                    {/* Summary Compacto */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2">
                      <h4 className="font-semibold text-white text-sm">Resumo</h4>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tamanho:</span>
                          <span className="font-medium text-white">{selectedSize?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Sabores:</span>
                          <div className="text-right">
                            {Object.entries(
                              selectedFlavors.reduce((acc, f) => {
                                acc[f.name] = (acc[f.name] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([name, count]) => (
                              <div key={name} className="text-xs md:text-sm font-medium text-white">
                                {count}x {name}
                              </div>
                            ))}
                          </div>
                        </div>
                        {selectedEdge && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Borda:</span>
                            <span className="font-medium text-white">{selectedEdge.name}</span>
                          </div>
                        )}
                        {selectedExtras.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Extras:</span>
                            <span className="font-medium text-white">{selectedExtras.map(e => e.name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Compacto */}
        <div className="px-3 md:px-5 py-2.5 border-t border-gray-800 bg-[#0a0a0a] flex items-center justify-between flex-shrink-0">
          <div>
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 h-9"
              >
                Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg md:text-xl font-bold" style={{ color: primaryColor }}>
                {formatCurrency(calculatePrice())}
              </p>
            </div>
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="text-white text-sm h-9"
                style={{ backgroundColor: primaryColor }}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleAddToCart}
                disabled={!selectedSize || selectedFlavors.length === 0}
                className="text-white text-sm h-9"
                style={{ backgroundColor: primaryColor }}
              >
                Adicionar
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}