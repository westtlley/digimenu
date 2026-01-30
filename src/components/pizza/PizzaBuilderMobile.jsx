import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronRight, X, ChevronDown, ChevronUp } from 'lucide-react';
import PizzaVisualization from './PizzaVisualization';
import PizzaVisualizationPremium from './PizzaVisualizationPremium';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function PizzaBuilderMobile({
  dish,
  sizes = [],
  flavors = [],
  edges = [],
  extras = [],
  selectedSize,
  setSelectedSize,
  selectedFlavors,
  setSelectedFlavors,
  wantsEdge,
  setWantsEdge,
  selectedEdge,
  setSelectedEdge,
  selectedExtras,
  setSelectedExtras,
  specifications,
  setSpecifications,
  calculatePrice,
  onAddToCart,
  onClose,
  primaryColor = '#f97316',
  usePremiumMode = false,
  showConfetti = false
}) {
  const [expandedStep, setExpandedStep] = React.useState('size');

  const addFlavor = (flavor) => {
    if (!selectedSize) return;
    
    if (dish?.division_mode === 'exact') {
      const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
      if (uniqueFlavors.includes(flavor.id)) {
        setSelectedFlavors(selectedFlavors.filter(f => f.id !== flavor.id));
      } else if (uniqueFlavors.length < selectedSize.max_flavors) {
        setSelectedFlavors([...selectedFlavors, flavor]);
      }
    } else {
      if (selectedFlavors.length < selectedSize.slices) {
        setSelectedFlavors([...selectedFlavors, flavor]);
      }
    }
  };

  const removeFlavor = (flavor) => {
    if (dish?.division_mode === 'exact') {
      setSelectedFlavors(selectedFlavors.filter(f => f.id !== flavor.id));
    } else {
      const index = selectedFlavors.findIndex(f => f.id === flavor.id);
      if (index !== -1) {
        const newFlavors = [...selectedFlavors];
        newFlavors.splice(index, 1);
        setSelectedFlavors(newFlavors);
      }
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

  const canProceed = !selectedSize || selectedFlavors.length === 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Pizza Visualization - Sticky Top */}
      <div className="sticky top-0 z-20 bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-yellow-900/40 backdrop-blur-xl border-b-2 border-orange-500/30 flex items-center justify-center h-[220px] flex-shrink-0 relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80')] bg-cover bg-center opacity-[0.06] blur-xl"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
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
              <div className="w-16 h-16 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-gray-700/50">
                <span className="text-3xl">🍕</span>
              </div>
              <p className="text-gray-300 text-sm font-medium">Selecione um tamanho</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Steps - Vertical Accordion Style */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
        {/* Step 1: Tamanho */}
        <div className="bg-gray-800/50 rounded-2xl border-2 border-gray-700 overflow-hidden">
          <button
            onClick={() => setExpandedStep(expandedStep === 'size' ? '' : 'size')}
            className="w-full p-4 flex items-center justify-between text-left"
            style={{ 
              background: selectedSize ? `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)` : 'transparent',
              borderBottom: expandedStep === 'size' ? '1px solid rgba(255,255,255,0.1)' : 'none'
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg"
                style={{ background: selectedSize ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` : 'rgba(55, 65, 81, 0.5)' }}
              >
                {selectedSize ? <Check className="w-5 h-5 text-white" /> : '📏'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">TAMANHO</h3>
                {selectedSize && (
                  <p className="text-xs text-gray-300 mt-0.5">
                    {selectedSize.name} • {selectedSize.slices} fatias • {selectedSize.max_flavors} {selectedSize.max_flavors === 1 ? 'sabor' : 'sabores'}
                  </p>
                )}
              </div>
            </div>
            {expandedStep === 'size' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {expandedStep === 'size' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-2">
                  {sizes.filter(s => s.is_active).map((size) => (
                    <button
                      key={size.id}
                      onClick={() => {
                        setSelectedSize(size);
                        setSelectedFlavors([]);
                        setExpandedStep('flavors');
                      }}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        selectedSize?.id === size.id
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{size.name}</h4>
                          <p className="text-xs text-gray-300 mt-0.5">
                            {size.slices} fatias • {size.max_flavors} {size.max_flavors === 1 ? 'sabor' : 'sabores'}
                          </p>
                        </div>
                        <span className="font-bold text-orange-400 text-sm">
                          {formatCurrency(size.price_tradicional)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 2: Sabores */}
        <div className={`bg-gray-800/50 rounded-2xl border-2 overflow-hidden ${selectedSize ? 'border-gray-700' : 'border-gray-800 opacity-50'}`}>
          <button
            onClick={() => selectedSize && setExpandedStep(expandedStep === 'flavors' ? '' : 'flavors')}
            disabled={!selectedSize}
            className="w-full p-4 flex items-center justify-between text-left"
            style={{ 
              background: selectedFlavors.length > 0 ? `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)` : 'transparent',
              borderBottom: expandedStep === 'flavors' ? '1px solid rgba(255,255,255,0.1)' : 'none'
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg"
                style={{ background: selectedFlavors.length > 0 ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` : 'rgba(55, 65, 81, 0.5)' }}
              >
                {selectedFlavors.length > 0 ? <Check className="w-5 h-5 text-white" /> : '🍕'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">SABORES</h3>
                {selectedFlavors.length > 0 && (
                  <p className="text-xs text-gray-300 mt-0.5">
                    {selectedFlavors.length}/{selectedSize?.slices || 0} fatias
                  </p>
                )}
              </div>
            </div>
            {expandedStep === 'flavors' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {expandedStep === 'flavors' && selectedSize && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                  {flavors.filter(f => f.is_active).map((flavor) => {
                    const count = getFlavorCount(flavor.id);
                    const isSelected = count > 0;
                    return (
                      <div key={flavor.id} className={`p-3 rounded-xl border-2 transition-all ${
                        isSelected ? 'border-orange-500 bg-orange-500/20' : 'border-gray-600 bg-gray-700/30'
                      }`}>
                        <div className="flex items-center gap-3">
                          {flavor.image && (
                            <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded-lg object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-sm truncate">{flavor.name}</h4>
                            {flavor.category === 'premium' && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs mt-1">Premium</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {count > 0 && (
                              <>
                                <button
                                  onClick={() => removeFlavor(flavor)}
                                  className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold"
                                >
                                  -
                                </button>
                                <span className="text-white font-bold text-sm w-6 text-center">{count}</span>
                              </>
                            )}
                            <button
                              onClick={() => addFlavor(flavor)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                isSelected ? 'bg-orange-500 text-white' : 'bg-gray-600 text-gray-300'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 3: Borda */}
        {edges.filter(e => e.is_active).length > 0 && (
          <div className={`bg-gray-800/50 rounded-2xl border-2 overflow-hidden ${selectedSize ? 'border-gray-700' : 'border-gray-800 opacity-50'}`}>
            <button
              onClick={() => selectedSize && setExpandedStep(expandedStep === 'edge' ? '' : 'edge')}
              disabled={!selectedSize}
              className="w-full p-4 flex items-center justify-between text-left"
              style={{ 
                background: selectedEdge ? `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)` : 'transparent',
                borderBottom: expandedStep === 'edge' ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg"
                  style={{ background: selectedEdge ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` : 'rgba(55, 65, 81, 0.5)' }}
                >
                  {selectedEdge ? <Check className="w-5 h-5 text-white" /> : '🧀'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base">BORDA</h3>
                  {selectedEdge && (
                    <p className="text-xs text-gray-300 mt-0.5">{selectedEdge.name}</p>
                  )}
                </div>
              </div>
              {expandedStep === 'edge' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            <AnimatePresence>
              {expandedStep === 'edge' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    <button
                      onClick={() => {
                        setWantsEdge(false);
                        setSelectedEdge(null);
                      }}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        wantsEdge === false
                          ? 'border-orange-500 bg-orange-500/20'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                    >
                      <span className="font-bold text-white text-sm">Sem borda</span>
                    </button>
                    {edges.filter(e => e.is_active).map((edge) => (
                      <button
                        key={edge.id}
                        onClick={() => {
                          setWantsEdge(true);
                          setSelectedEdge(edge);
                        }}
                        className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                          selectedEdge?.id === edge.id
                            ? 'border-orange-500 bg-orange-500/20'
                            : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{edge.name}</span>
                          <span className="font-bold text-orange-400 text-sm">+{formatCurrency(edge.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Step 4: Extras */}
        {extras.filter(e => e.is_active).length > 0 && (
          <div className={`bg-gray-800/50 rounded-2xl border-2 overflow-hidden ${selectedSize ? 'border-gray-700' : 'border-gray-800 opacity-50'}`}>
            <button
              onClick={() => selectedSize && setExpandedStep(expandedStep === 'extras' ? '' : 'extras')}
              disabled={!selectedSize}
              className="w-full p-4 flex items-center justify-between text-left"
              style={{ 
                background: selectedExtras.length > 0 ? `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)` : 'transparent',
                borderBottom: expandedStep === 'extras' ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg"
                  style={{ background: selectedExtras.length > 0 ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` : 'rgba(55, 65, 81, 0.5)' }}
                >
                  {selectedExtras.length > 0 ? <Check className="w-5 h-5 text-white" /> : '✨'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base">EXTRAS</h3>
                  {selectedExtras.length > 0 && (
                    <p className="text-xs text-gray-300 mt-0.5">{selectedExtras.length} selecionado(s)</p>
                  )}
                </div>
              </div>
              {expandedStep === 'extras' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            <AnimatePresence>
              {expandedStep === 'extras' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2">
                    {extras.filter(e => e.is_active).map((extra) => {
                      const isSelected = selectedExtras.find(e => e.id === extra.id);
                      return (
                        <button
                          key={extra.id}
                          onClick={() => toggleExtra(extra)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/20'
                              : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{extra.name}</span>
                            <span className="font-bold text-orange-400 text-sm">+{formatCurrency(extra.price)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Step 5: Observações */}
        <div className={`bg-gray-800/50 rounded-2xl border-2 overflow-hidden ${selectedSize ? 'border-gray-700' : 'border-gray-800 opacity-50'}`}>
          <button
            onClick={() => selectedSize && setExpandedStep(expandedStep === 'specs' ? '' : 'specs')}
            disabled={!selectedSize}
            className="w-full p-4 flex items-center justify-between text-left"
            style={{ 
              background: specifications ? `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)` : 'transparent',
              borderBottom: expandedStep === 'specs' ? '1px solid rgba(255,255,255,0.1)' : 'none'
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg"
                style={{ background: specifications ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` : 'rgba(55, 65, 81, 0.5)' }}
              >
                📝
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">OBSERVAÇÕES</h3>
                {specifications && (
                  <p className="text-xs text-gray-300 mt-0.5 truncate">{specifications}</p>
                )}
              </div>
            </div>
            {expandedStep === 'specs' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          <AnimatePresence>
            {expandedStep === 'specs' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-3">
                  <Textarea
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    placeholder="Ex: Sem cebola, bem assada, massa fina..."
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 min-h-[80px]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer - CTA Fixo */}
      <div className="sticky bottom-0 z-20 px-3 py-3 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/95 via-gray-900/95 to-gray-800/95 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-gray-400 text-xs font-medium">Total</span>
          <motion.span
            key={calculatePrice()}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent"
          >
            {formatCurrency(calculatePrice())}
          </motion.span>
        </div>
        <Button
          onClick={onAddToCart}
          disabled={canProceed}
          className="w-full text-white text-sm h-12 shadow-lg font-semibold flex items-center justify-center gap-2"
          style={{ 
            background: canProceed
              ? 'linear-gradient(135deg, #4b5563, #374151)'
              : `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
            boxShadow: canProceed ? 'none' : `0 4px 20px ${primaryColor}50`
          }}
        >
          <Check className="w-5 h-5" />
          Adicionar ao Carrinho
        </Button>
      </div>
    </div>
  );
}
