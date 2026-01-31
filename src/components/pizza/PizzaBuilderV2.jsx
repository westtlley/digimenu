import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
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

// Imagem da borda: coloque sua borda realista em public/images/pizza-borda.png
const LOCAL_EDGE_IMAGE = '/images/pizza-borda.png';

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
  // Config da visualização (imagem da borda)
  const { data: savedConfigs = [] } = useQuery({
    queryKey: ['pizzaVisualizationConfig'],
    queryFn: () => base44.entities.PizzaVisualizationConfig.list(),
  });
  const vizConfig = savedConfigs[0] || {};
  const edgeImageUrl = vizConfig.edgeImageUrl || LOCAL_EDGE_IMAGE;
  const edgeStrokeWidth = vizConfig.edgeStrokeWidth ?? 16;
  const edgeRadius = vizConfig.edgeRadius ?? 50;
  const edgeOffsetX = vizConfig.edgeOffsetX ?? 0;
  const edgeOffsetY = vizConfig.edgeOffsetY ?? 0;
  const edgeScale = vizConfig.edgeScale ?? 1;

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

  // Número máximo de sabores (1-4) e extras
  const maxFlavors = Math.min(Math.max(selectedSize?.max_flavors || 1, 1), 4);
  const maxExtras = selectedSize?.max_extras ?? 5;

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
    <div className="h-screen w-full flex flex-col bg-[#0f0f0f] overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 py-4 px-6 flex items-center justify-between shadow-md" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-white font-black text-xl uppercase tracking-tighter">Minha Pizza</h1>
        </div>
        <button onClick={onClose} className="text-white">
          <X size={24} />
        </button>
      </header>

      {/* Layout Desktop vs Mobile - min-h-0 é crítico para scroll no flexbox */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="w-full max-w-full mx-auto px-4 py-6 pb-44 lg:pb-8 box-border">
          {/* Layout em Grid no Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-6 max-w-5xl mx-auto w-full">
            
            {/* Coluna Esquerda - APENAS Pizza e Preço no Desktop */}
            <div className="space-y-4 lg:space-y-6 overflow-hidden">
              {/* Visualizador Circular da Pizza */}
              <div className="flex flex-col items-center justify-center py-2 lg:py-2 relative min-w-0">
                <button 
                  onClick={() => setStep('flavors')}
                  className="relative w-56 h-56 sm:w-64 sm:h-64 lg:w-[340px] lg:h-[340px] pizza-container group cursor-pointer transition-transform active:scale-95 flex-shrink-0"
                >
                  <div className="absolute inset-0 rounded-full overflow-hidden transition-transform duration-500 hover:rotate-6 shadow-xl">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <defs>
                        {Array.from({ length: maxFlavors }).map((_, i) => selectedFlavors[i]?.image && (
                          <pattern key={i} id={`pizza-slice-${i}`} x="0" y="0" width="1" height="1" patternContentUnits="objectBoundingBox">
                            <image href={selectedFlavors[i].image} x="-0.1" y="-0.1" width="1.2" height="1.2" preserveAspectRatio="xMidYMid slice" />
                          </pattern>
                        ))}
                      </defs>
                      {maxFlavors === 1 ? (
                        selectedFlavors[0] ? (
                          <circle cx="50" cy="50" r="50" fill={selectedFlavors[0].image ? `url(#pizza-slice-0)` : (selectedFlavors[0].color || '#444')} />
                        ) : (
                          <g>
                            <circle cx="50" cy="50" r="50" fill="#333" />
                            <text x="50" y="45" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">+</text>
                            <text x="50" y="55" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="4">TOQUE</text>
                          </g>
                        )
                      ) : (
                        Array.from({ length: maxFlavors }).map((_, i) => {
                          const anglePerSlice = 360 / maxFlavors;
                          const startAngle = (anglePerSlice * i - 90) * (Math.PI / 180);
                          const endAngle = (anglePerSlice * (i + 1) - 90) * (Math.PI / 180);
                          const r = 50;
                          const x1 = 50 + r * Math.cos(startAngle);
                          const y1 = 50 + r * Math.sin(startAngle);
                          const x2 = 50 + r * Math.cos(endAngle);
                          const y2 = 50 + r * Math.sin(endAngle);
                          const largeArc = anglePerSlice > 180 ? 1 : 0;
                          const pathData = `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                          const flavor = selectedFlavors[i];
                          return (
                            <path
                              key={i}
                              d={pathData}
                              fill={flavor?.image ? `url(#pizza-slice-${i})` : (flavor?.color || '#444')}
                              stroke="rgba(0,0,0,0.1)"
                              strokeWidth="0.5"
                            />
                          );
                        })
                      )}
                      {maxFlavors > 1 && selectedFlavors.filter(Boolean).length < maxFlavors && (
                        <g>
                          {Array.from({ length: maxFlavors }).map((_, i) => {
                            if (selectedFlavors[i]) return null;
                            const anglePerSlice = 360 / maxFlavors;
                            const midAngle = (anglePerSlice * (i + 0.5) - 90) * (Math.PI / 180);
                            const x = 50 + 25 * Math.cos(midAngle);
                            const y = 50 + 25 * Math.sin(midAngle);
                            return (
                              <g key={`placeholder-${i}`}>
                                <text x={x} y={y - 3} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="6">+</text>
                                <text x={x} y={y + 4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="3">TOQUE</text>
                              </g>
                            );
                          })}
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Overlay da borda recheada - imagem real cobrindo a borda da pizza */}
                  {selectedEdge && selectedEdge.id !== 'none' && (
                    <div className="absolute inset-0 pointer-events-none z-10 rounded-full overflow-visible">
                      <svg 
                        viewBox="0 0 100 100" 
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ 
                          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
                        }}
                      >
                        <defs>
                          <pattern 
                            id={`pizzaBuilderEdge-${selectedEdge?.id || 'default'}`} 
                            patternUnits="userSpaceOnUse" 
                            width="100" 
                            height="100"
                          >
                            <image 
                              href={selectedEdge?.image || edgeImageUrl}
                              x="0" 
                              y="0" 
                              width="100" 
                              height="100" 
                              preserveAspectRatio="xMidYMid slice"
                            />
                          </pattern>
                        </defs>
                        {/* Círculo da borda - raio 50 = borda externa da pizza no viewBox */}
                        <g 
                          transform={`translate(${50 + (Number(edgeOffsetX) || 0)}, ${50 + (Number(edgeOffsetY) || 0)}) scale(${Number(edgeScale) || 1}) translate(-50, -50)`}
                        >
                          <motion.circle
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            cx="50"
                            cy="50"
                            r={Number(edgeRadius) || 50}
                            fill="none"
                            stroke={`url(#pizzaBuilderEdge-${selectedEdge?.id || 'default'})`}
                            strokeWidth={Number(edgeStrokeWidth) || 16}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transformOrigin: '50% 50%',
                            }}
                          />
                        </g>
                      </svg>
                    </div>
                  )}
                </button>
                
                <div className="mt-8 text-center bg-black/40 px-8 py-3 rounded-full border border-white/5">
                  <span className="text-[10px] text-gray-500 font-black uppercase block tracking-tighter">Preço da pizza:</span>
                  <span className="text-3xl font-black text-white italic">{formatCurrency(calculatePrice())}</span>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Todas as Opções */}
            <div className="space-y-3">
              {/* Tamanho Selector */}
              <div className="space-y-2">
                <label className="text-white text-xs font-black uppercase tracking-widest opacity-80">Tamanho:</label>
                <div className="relative">
                  <select 
                    className="w-full text-white py-3 px-4 rounded-xl font-bold appearance-none text-sm shadow-lg border-b-4 focus:outline-none"
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
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={18} />
                </div>
              </div>

              {/* Sabores Info */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-[9px] uppercase tracking-widest font-black mb-1">🍕 Sabores</p>
                    <p className="text-white text-xs font-bold leading-tight truncate">
                      {selectedFlavors.length > 0 ? (
                        <span>{selectedFlavors.map(f => f.name).join(' + ')}</span>
                      ) : (
                        <span className="text-gray-500">Toque na pizza</span>
                      )}
                    </p>
                  </div>
                  <button 
                    onClick={() => setStep('flavors')}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all active:scale-95 whitespace-nowrap"
                    style={{ backgroundColor: primaryColor, color: 'white' }}
                  >
                    {selectedFlavors.length > 0 ? 'Alterar' : 'Escolher'}
                  </button>
                </div>
              </div>

              {/* Título Personalização */}
              <h3 className="text-white text-xs font-black uppercase tracking-widest opacity-80 px-2 pt-2">Personalize sua pizza:</h3>
              
              {/* Borda - só após pizza completa (sabores selecionados) */}
              <button 
                onClick={() => selectedFlavors.length >= 1 && setStep('borders')}
                disabled={selectedFlavors.length < 1}
                className={`w-full backdrop-blur-sm text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-md transition-all border border-white/5 ${selectedFlavors.length >= 1 ? 'bg-white/10 hover:bg-white/20 active:scale-95' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}30` }}>
                    <Star size={16} style={{ color: primaryColor }} className="fill-current" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-black">Borda</p>
                    <p className="text-white font-black text-xs">
                      {selectedEdge && selectedEdge.id !== 'none' ? selectedEdge.name : 'Sem borda'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-gray-400" size={18} />
              </button>

              {/* Extras - só após borda (ou se não tiver bordas) */}
              <button 
                onClick={() => (edges.length === 0 || selectedEdge !== null) && setStep('extras')}
                disabled={edges.length > 0 && selectedEdge === null}
                className={`w-full backdrop-blur-sm text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-md transition-all border border-white/5 ${(edges.length === 0 || selectedEdge !== null) ? 'bg-white/10 hover:bg-white/20 active:scale-95' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/20">
                    <Plus size={16} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-black">Extras</p>
                    <p className="text-white font-black text-xs">
                      {selectedExtras.length > 0 ? `${selectedExtras.length} selecionados` : 'Nenhum extra'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-gray-400" size={18} />
              </button>

              {/* Observações */}
              <button 
                onClick={() => setStep('observations')}
                className="w-full bg-white/10 backdrop-blur-sm text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-md active:scale-95 transition-all border border-white/5 hover:bg-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-500/20">
                    <span className="text-lg">📝</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-black">Observações</p>
                    <p className="text-white font-black text-xs">
                      {specifications ? 'Adicionadas' : 'Adicionar observações'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-gray-400" size={18} />
              </button>

              {/* Botão de Adicionar - Desktop (visível apenas em telas grandes) */}
              <div className="hidden lg:block pt-4">
                <button 
                  onClick={handleAddToCart}
                  disabled={!selectedSize || selectedFlavors.length === 0}
                  className="w-full text-white py-4 rounded-xl font-black text-base shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: (!selectedSize || selectedFlavors.length === 0) ? '#9ca3af' : '#4caf50'
                  }}
                >
                  <ShoppingBag size={20} /> ADICIONAR AO PEDIDO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Fixo - Adicionar (Mobile apenas) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-50 pointer-events-none">
        <button 
          onClick={handleAddToCart}
          disabled={!selectedSize || selectedFlavors.length === 0}
          className="w-full max-w-md mx-auto text-white py-4 rounded-xl font-black text-base shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
          style={{ 
            backgroundColor: (!selectedSize || selectedFlavors.length === 0) ? '#9ca3af' : '#4caf50'
          }}
        >
          <ShoppingBag size={20} /> ADICIONAR AO PEDIDO
        </button>
      </div>
    </div>
  );

  // FLAVORS VIEW (Seleção de Sabores)
  const FlavorsView = () => (
    <div className="min-h-screen w-full flex flex-col bg-white">
      {/* Header */}
      <header className="py-3 px-4 sticky top-0 z-50 shadow-md" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStep('custom')} className="text-white">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <h1 className="text-white font-black text-lg uppercase tracking-tight">Selecione os Sabores</h1>
          <div className="w-6" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar sabor..."
            className="w-full bg-white rounded-xl py-3 pl-10 pr-3 text-gray-900 font-medium text-sm focus:outline-none shadow-inner border border-gray-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-3 space-y-6 bg-gray-50 overflow-y-auto pb-40">
        {Object.entries(flavorsByCategory).map(([category, categoryFlavors]) => (
          <div key={category} className="space-y-3">
            <h3 className="font-black italic text-lg border-l-4 pl-3 uppercase tracking-tight" style={{ color: primaryColor, borderColor: primaryColor }}>
              {category}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {categoryFlavors.map(flavor => {
                const isSelected = selectedFlavors.find(f => f.id === flavor.id);
                return (
                  <motion.div 
                    key={flavor.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleFlavor(flavor)}
                    className={`flex gap-3 bg-white p-3 rounded-xl shadow-sm border-2 transition-all relative overflow-hidden ${isSelected ? 'ring-2 ring-opacity-30' : 'border-transparent'}`}
                    style={{ borderColor: isSelected ? primaryColor : 'transparent', ringColor: isSelected ? `${primaryColor}40` : 'transparent' }}
                  >
                    {flavor.image && (
                      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 shadow">
                        <img src={flavor.image} className="w-full h-full object-cover" alt={flavor.name} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-gray-900 font-bold text-sm uppercase tracking-tight">{flavor.name}</h4>
                        <span className="font-bold text-sm whitespace-nowrap" style={{ color: primaryColor }}>
                          {formatCurrency(flavor.price || 0)}
                        </span>
                      </div>
                      {flavor.description && (
                        <p className="text-[10px] text-gray-500 leading-tight mt-1 line-clamp-2">
                          {flavor.description}
                        </p>
                      )}
                      {flavor.category === 'premium' && (
                        <div className="mt-1.5">
                          <Badge className="bg-amber-100 text-amber-700 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase border border-amber-200">
                            Premium
                          </Badge>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-white p-1 rounded-full shadow-md" style={{ backgroundColor: primaryColor }}>
                        <Check size={12} strokeWidth={4} />
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
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Progresso</span>
          <span className="text-sm font-black text-gray-900 uppercase">
            {selectedFlavors.length} de {maxFlavors} sabores
          </span>
        </div>
        <button 
          onClick={() => setStep('custom')}
          className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-wide transition-all ${selectedFlavors.length > 0 ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
          style={{ backgroundColor: selectedFlavors.length > 0 ? primaryColor : '#f3f4f6' }}
        >
          Confirmar
        </button>
      </footer>
    </div>
  );

  // SELECTION OVERLAY (Bordas, Extras, Observações)
  const SelectionOverlay = ({ title, items, current, onSelect, onClose, type = 'single', maxItems = 999 }) => (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-fade-in backdrop-blur-md">
      {/* Header mais compacto */}
      <div className="flex justify-between items-center p-4 border-b border-white/10">
        <h2 className="text-white font-black text-lg uppercase tracking-tight">{title}</h2>
        <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>
      
      {/* Content com max-height e scroll */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {type === 'textarea' ? (
            <Textarea
              value={current}
              onChange={(e) => onSelect(e.target.value)}
              placeholder="Ex: Sem cebola, bem assada, massa fina..."
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px] text-sm"
              autoFocus
            />
          ) : (
            items.map((item) => {
              const isSelected = type === 'multiple' 
                ? current.find(c => c.id === item.id)
                : current?.id === item.id;
              const isDisabled = type === 'multiple' && !isSelected && current.length >= maxItems;
              
              return (
                <button
                  key={item.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (type === 'multiple') {
                      const newCurrent = isSelected 
                        ? current.filter(c => c.id !== item.id)
                        : current.length < maxItems ? [...current, item] : current;
                      onSelect(newCurrent);
                    } else {
                      onSelect(item);
                      if (type === 'single') onClose();
                    }
                  }}
                  className={`w-full p-4 rounded-xl border-2 flex justify-between items-center transition-all ${isSelected ? 'text-white' : isDisabled ? 'border-white/5 bg-white/5 text-gray-600 opacity-50 cursor-not-allowed' : 'border-white/10 bg-white/5 text-gray-400'}`}
                  style={{ 
                    borderColor: isSelected ? primaryColor : 'rgba(255,255,255,0.1)',
                    backgroundColor: isSelected ? `${primaryColor}20` : 'rgba(255,255,255,0.05)'
                  }}
                >
                  <span className="font-bold text-sm uppercase tracking-wide">{item.name}</span>
                  <div className="flex items-center gap-3">
                    {item.price > 0 && <span className="text-xs font-bold text-gray-300">+ {formatCurrency(item.price)}</span>}
                    {isSelected && <Check style={{ color: primaryColor }} size={18} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      
      {/* Footer fixo com botão */}
      {(type === 'textarea' || type === 'multiple') && (
        <div className="p-4 border-t border-white/10 bg-black/50">
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={onClose}
              className="w-full text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              {type === 'multiple' 
                ? `Confirmar (${current.length} selecionado${current.length !== 1 ? 's' : ''})` 
                : 'Confirmar'}
            </button>
          </div>
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
            title={`Adicionar Extras (máx. ${maxExtras})`} 
            items={extras.filter(e => e && e.is_active)} 
            current={selectedExtras} 
            onSelect={setSelectedExtras} 
            onClose={() => setStep('custom')} 
            type="multiple"
            maxItems={maxExtras}
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
