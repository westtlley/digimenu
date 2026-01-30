import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  Search, 
  ChevronDown, 
  Plus, 
  Minus, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Star,
  ChevronLeft,
  X,
  Check,
  Store
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function PizzaBuilderV2({ 
  dish, 
  sizes = [], 
  flavors = [], 
  edges = [], 
  extras = [], 
  onAddToCart, 
  onClose,
  primaryColor = '#f97316',
  editingItem = null,
  store = null
}) {
  // Estados
  const [step, setStep] = useState('custom'); // custom | flavors | borders | extras | observations
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [specifications, setSpecifications] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Carregar dados de edição ou pré-preencher sabor
  React.useEffect(() => {
    if (editingItem) {
      setSelectedSize(editingItem.size || null);
      setSelectedFlavors(editingItem.flavors || []);
      setSelectedEdge(editingItem.edge || null);
      setSelectedExtras(editingItem.extras || []);
      setSpecifications(editingItem.specifications || '');
    } else {
      // Selecionar tamanho padrão (médio ou primeiro)
      if (sizes.length > 0 && !selectedSize) {
        const defaultSize = sizes.find(s => s.name.toLowerCase().includes('média')) || sizes[0];
        setSelectedSize(defaultSize);
      }
      
      // Pré-preencher sabor baseado no nome da pizza clicada
      if (dish && flavors.length > 0 && selectedFlavors.length === 0) {
        const dishName = dish.name.toLowerCase();
        // Tentar encontrar o sabor que corresponde ao nome da pizza
        // Ex: "Pizza Calabresa" -> procura sabor "Calabresa"
        const matchingFlavor = flavors.find(f => {
          if (!f || !f.name) return false;
          const flavorName = f.name.toLowerCase();
          // Remove "pizza" do nome do dish para comparar
          const cleanDishName = dishName.replace(/pizza\s*/gi, '').trim();
          return flavorName.includes(cleanDishName) || cleanDishName.includes(flavorName);
        });
        
        if (matchingFlavor) {
          setSelectedFlavors([matchingFlavor]);
        }
      }
    }
  }, [editingItem, sizes, dish, flavors, selectedSize, selectedFlavors.length]);

  // Sabores filtrados
  const filteredFlavors = useMemo(() => {
    return (flavors || []).filter(f => 
      f && f.is_active && f.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [flavors, searchQuery]);

  // Agrupar sabores por categoria
  const flavorsByCategory = useMemo(() => {
    const grouped = {};
    filteredFlavors.forEach(f => {
      const cat = f.category || 'Tradicional';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(f);
    });
    return grouped;
  }, [filteredFlavors]);

  // Número máximo de sabores
  const maxFlavors = selectedSize?.max_flavors || 1;

  // Toggle sabor
  const toggleFlavor = (flavor) => {
    if (!selectedSize) return;
    
    if (dish?.division_mode === 'exact') {
      // Modo exact: limite de sabores diferentes
      const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
      const isSelected = uniqueFlavors.includes(flavor.id);
      
      if (isSelected) {
        setSelectedFlavors(selectedFlavors.filter(f => f.id !== flavor.id));
      } else if (uniqueFlavors.length < maxFlavors) {
        setSelectedFlavors([...selectedFlavors, flavor]);
      }
    } else {
      // Modo slice: preencher todas as fatias
      const sliceCount = selectedSize.slices;
      if (selectedFlavors.length < sliceCount) {
        setSelectedFlavors([...selectedFlavors, flavor]);
      }
    }
  };

  // Toggle extra
  const toggleExtra = (extra) => {
    const isSelected = selectedExtras.find(e => e.id === extra.id);
    if (isSelected) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  // Calcular preço
  const calculatePrice = () => {
    if (!selectedSize) return 0;
    
    const hasPremium = selectedFlavors.some(f => f.category === 'premium');
    let basePrice = hasPremium ? selectedSize.price_premium : selectedSize.price_tradicional;
    
    if (selectedEdge && selectedEdge.price) basePrice += selectedEdge.price;
    
    const extrasPrice = selectedExtras.reduce((sum, extra) => sum + (extra.price || 0), 0);
    
    return basePrice + extrasPrice;
  };

  // Finalizar
  const handleAddToCart = () => {
    const item = {
      dish,
      size: selectedSize,
      flavors: selectedFlavors,
      edge: selectedEdge,
      extras: selectedExtras,
      specifications,
      totalPrice: calculatePrice()
    };
    onAddToCart(item, editingItem !== null);
  };

  // --- TELAS ---

  // CUSTOM VIEW (Montagem)
  const CustomView = () => (
    <div className="min-h-screen w-full flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-md" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setStep('welcome')} className="text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-white font-black text-xl uppercase tracking-tighter">Minha Pizza</h1>
        </div>
        <button onClick={onClose} className="text-white">
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 p-6 space-y-6 max-w-md mx-auto w-full pb-32">
        {/* Tamanho Selector */}
        <div className="space-y-2">
          <label className="text-white text-xs font-black uppercase tracking-widest opacity-80">Tamanho:</label>
          <div className="relative">
            <select 
              className="w-full text-white py-4 px-4 rounded-xl font-bold appearance-none text-sm shadow-lg border-b-4 focus:outline-none"
              style={{ backgroundColor: primaryColor, borderColor: '#c2410c' }}
              value={selectedSize?.id || ''}
              onChange={(e) => {
                const size = sizes.find(s => s.id === e.target.value);
                setSelectedSize(size);
                setSelectedFlavors([]);
              }}
            >
              {(sizes || []).filter(s => s && s.is_active).map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.slices} fatias - {s.max_flavors} {s.max_flavors === 1 ? 'sabor' : 'sabores'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={20} />
          </div>
        </div>

        {/* Visualizador Circular da Pizza */}
        <div className="flex flex-col items-center py-4 relative">
          <button 
            onClick={() => setStep('flavors')}
            className="relative w-72 h-72 pizza-container group cursor-pointer transition-transform active:scale-95"
          >
            {/* Board / Base Wood Effect */}
            <div className="absolute inset-[-15px] bg-[#3a2214] rounded-full border-[12px] border-[#2a1a0f] shadow-2xl" />
            
            <div className="absolute inset-0 bg-[#333] rounded-full border-8 shadow-inner overflow-hidden flex transition-transform duration-500 hover:rotate-6" style={{ borderColor: primaryColor }}>
              {maxFlavors === 1 ? (
                <div className="w-full h-full flex items-center justify-center text-white/20 bg-[#444]">
                  {selectedFlavors[0] ? (
                    <img src={selectedFlavors[0].image} className="w-full h-full object-cover animate-pulse" alt={selectedFlavors[0].name} />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Plus size={64} className="opacity-10" />
                      <span className="text-xs font-bold opacity-30">TOQUE PARA ESCOLHER</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex relative">
                  {Array.from({ length: maxFlavors }).map((_, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        width: `${100 / maxFlavors}%`,
                        borderRight: i < maxFlavors - 1 ? `1px solid ${primaryColor}40` : 'none'
                      }}
                      className="h-full flex items-center justify-center overflow-hidden bg-[#444]"
                    >
                      {selectedFlavors[i] ? (
                        <img src={selectedFlavors[i].image} className="w-full h-full object-cover animate-pulse" alt={selectedFlavors[i].name} />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Plus className="text-white/20" size={32} />
                          <span className="text-[8px] font-bold text-white/20">TOQUE</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </button>
          
          <div className="mt-8 text-center bg-black/40 px-8 py-3 rounded-full border border-white/5">
            <span className="text-[10px] text-gray-500 font-black uppercase block tracking-tighter">Preço da pizza:</span>
            <span className="text-3xl font-black text-white italic">{formatCurrency(calculatePrice())}</span>
          </div>
        </div>

        {/* Sabores Info */}
        <div className="text-center">
          <p className="text-gray-400 text-xs uppercase tracking-widest font-black mb-1">Sabores Selecionados</p>
          <p className="text-white text-lg font-black">
            {selectedFlavors.length > 0 ? (
              <span>{selectedFlavors.map(f => f.name).join(', ')}</span>
            ) : (
              <span className="text-gray-500">Toque na pizza acima para escolher</span>
            )}
          </p>
          <p className="text-gray-500 text-xs mt-1">{selectedFlavors.length} de {maxFlavors}</p>
        </div>

        {/* Opções Extras */}
        <div className="grid grid-cols-1 gap-4">
          {(edges || []).filter(e => e && e.is_active).length > 0 && (
            <button 
              onClick={() => setStep('borders')}
              className="w-full text-white py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: primaryColor }}
            >
              <Star size={18} className="fill-white" /> 
              {selectedEdge ? selectedEdge.name : 'Escolher Borda'}
            </button>
          )}
          
          {(extras || []).filter(e => e && e.is_active).length > 0 && (
            <button 
              onClick={() => setStep('extras')}
              className="w-full bg-white text-blue-600 py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg border border-blue-100"
            >
              <Plus size={18} /> 
              {selectedExtras.length > 0 ? `${selectedExtras.length} Extras` : 'Adicionar Extras'}
            </button>
          )}
          
          <button 
            onClick={() => setStep('observations')}
            className="w-full bg-white text-gray-600 py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg border border-gray-100"
          >
            📝 {specifications ? 'Observações Adicionadas' : 'Observações'}
          </button>
        </div>
      </div>

      {/* Footer Fixo - Adicionar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-xl border-t border-gray-200 z-50">
        <button 
          onClick={handleAddToCart}
          disabled={!selectedSize || selectedFlavors.length === 0}
          className="w-full text-white py-5 rounded-xl font-black text-xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: (!selectedSize || selectedFlavors.length === 0) ? '#9ca3af' : '#4caf50'
          }}
        >
          <ShoppingBag size={24} /> ADICIONAR AO PEDIDO
        </button>
      </div>
    </div>
  );

  // FLAVORS VIEW (Seleção de Sabores)
  const FlavorsView = () => (
    <div className="min-h-screen w-full flex flex-col bg-white">
      {/* Header */}
      <header className="py-4 px-6 sticky top-0 z-50 shadow-md" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setStep('custom')} className="text-white">
            <ChevronLeft size={28} strokeWidth={3} />
          </button>
          <h1 className="text-white font-black text-xl uppercase tracking-tighter">Selecione os Sabores</h1>
          <div className="w-8" />
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar sabor..."
            className="w-full bg-white rounded-xl py-4 pl-12 pr-4 text-gray-900 font-medium text-sm focus:outline-none shadow-inner border border-gray-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 space-y-10 bg-gray-50 overflow-y-auto pb-32">
        {Object.entries(flavorsByCategory).map(([category, categoryFlavors]) => (
          <div key={category} className="space-y-6">
            <h3 className="font-black italic text-2xl border-l-4 pl-4 uppercase tracking-tighter drop-shadow-sm" style={{ color: primaryColor, borderColor: primaryColor }}>
              {category}
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {categoryFlavors.map(flavor => {
                const isSelected = selectedFlavors.find(f => f.id === flavor.id);
                return (
                  <motion.div 
                    key={flavor.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => toggleFlavor(flavor)}
                    className={`flex gap-5 bg-white p-4 rounded-2xl shadow-md border-2 transition-all relative overflow-hidden ${isSelected ? 'ring-4 ring-opacity-30' : 'border-transparent'}`}
                    style={{ borderColor: isSelected ? primaryColor : 'transparent', ringColor: isSelected ? `${primaryColor}40` : 'transparent' }}
                  >
                    {flavor.image && (
                      <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-4 border-gray-50 shadow-lg">
                        <img src={flavor.image} className="w-full h-full object-cover" alt={flavor.name} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <h4 className="text-gray-900 font-black text-base uppercase tracking-tight">{flavor.name}</h4>
                        <span className="font-black text-base italic" style={{ color: primaryColor }}>
                          {formatCurrency(flavor.price || 0)}
                        </span>
                      </div>
                      {flavor.description && (
                        <p className="text-[11px] text-gray-500 font-medium leading-tight mt-2 line-clamp-2 pr-4">
                          {flavor.description}
                        </p>
                      )}
                      {flavor.category === 'premium' && (
                        <div className="mt-3 flex gap-2">
                          <Badge className="bg-amber-100 text-amber-700 text-[9px] font-black px-3 py-1 rounded-full uppercase italic border border-amber-200">
                            Premium
                          </Badge>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-white p-1 rounded-full shadow-lg" style={{ backgroundColor: primaryColor }}>
                        <Check size={14} strokeWidth={4} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200 p-6 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Progresso</span>
          <span className="text-sm font-black text-gray-900 uppercase">
            {selectedFlavors.length} de {maxFlavors} sabores
          </span>
        </div>
        <button 
          onClick={() => setStep('custom')}
          className={`px-12 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedFlavors.length > 0 ? 'text-white shadow-xl' : 'bg-gray-100 text-gray-400'}`}
          style={{ backgroundColor: selectedFlavors.length > 0 ? primaryColor : '#f3f4f6' }}
        >
          Confirmar
        </button>
      </footer>
    </div>
  );

  // SELECTION OVERLAY (Bordas, Extras, Observações)
  const SelectionOverlay = ({ title, items, current, onSelect, onClose, type = 'single' }) => (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col p-6 animate-fade-in backdrop-blur-md">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-white font-black text-2xl uppercase italic tracking-tighter">{title}</h2>
        <button onClick={onClose} className="text-white p-2 rounded-full" style={{ backgroundColor: primaryColor }}>
          <X size={24} />
        </button>
      </div>
      <div className="space-y-4 overflow-y-auto pr-2">
        {type === 'textarea' ? (
          <Textarea
            value={current}
            onChange={(e) => onSelect(e.target.value)}
            placeholder="Ex: Sem cebola, bem assada, massa fina..."
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[120px] text-base"
            autoFocus
          />
        ) : (
          items.map((item) => {
            const isSelected = type === 'multiple' 
              ? current.find(c => c.id === item.id)
              : current?.id === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (type === 'multiple') {
                    const newCurrent = isSelected 
                      ? current.filter(c => c.id !== item.id)
                      : [...current, item];
                    onSelect(newCurrent);
                  } else {
                    onSelect(item);
                    if (type === 'single') onClose();
                  }
                }}
                className={`w-full p-6 rounded-2xl border-2 flex justify-between items-center transition-all ${isSelected ? 'text-white' : 'border-white/10 bg-white/5 text-gray-400'}`}
                style={{ 
                  borderColor: isSelected ? primaryColor : 'rgba(255,255,255,0.1)',
                  backgroundColor: isSelected ? `${primaryColor}33` : 'rgba(255,255,255,0.05)'
                }}
              >
                <span className="font-black uppercase">{item.name}</span>
                <div className="flex items-center gap-3">
                  {item.price > 0 && <span className="text-sm font-bold text-gray-400">+ {formatCurrency(item.price)}</span>}
                  {isSelected && <Check style={{ color: primaryColor }} />}
                </div>
              </button>
            );
          })
        )}
      </div>
      {type === 'textarea' && (
        <div className="mt-6">
          <button 
            onClick={onClose}
            className="w-full text-white py-4 rounded-xl font-black text-lg"
            style={{ backgroundColor: primaryColor }}
          >
            Confirmar
          </button>
        </div>
      )}
      {type === 'multiple' && (
        <div className="mt-6">
          <button 
            onClick={onClose}
            className="w-full text-white py-4 rounded-xl font-black text-lg"
            style={{ backgroundColor: primaryColor }}
          >
            Confirmar ({current.length} selecionado{current.length !== 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  );

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-[9999] antialiased">
      <AnimatePresence mode="wait">
        {step === 'custom' && <CustomView />}
        {step === 'flavors' && <FlavorsView />}
        {step === 'borders' && (
          <SelectionOverlay 
            title="Escolha a Borda" 
            items={[{ id: 'none', name: 'Sem Borda', price: 0 }, ...edges.filter(e => e && e.is_active)]} 
            current={selectedEdge || { id: 'none', name: 'Sem Borda', price: 0 }} 
            onSelect={setSelectedEdge} 
            onClose={() => setStep('custom')} 
            type="single"
          />
        )}
        {step === 'extras' && (
          <SelectionOverlay 
            title="Adicionar Extras" 
            items={extras.filter(e => e && e.is_active)} 
            current={selectedExtras} 
            onSelect={setSelectedExtras} 
            onClose={() => setStep('custom')} 
            type="multiple"
          />
        )}
        {step === 'observations' && (
          <SelectionOverlay 
            title="Observações" 
            items={[]} 
            current={specifications} 
            onSelect={setSpecifications} 
            onClose={() => setStep('custom')} 
            type="textarea"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
