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
import { formatCurrency } from '@/utils/formatters';
import { useLanguage } from '@/i18n/LanguageContext';

// Imagem da borda: coloque sua borda realista em public/images/pizza-borda.png
const LOCAL_EDGE_IMAGE = '/images/pizza-borda.png';

export default function PizzaBuilderV2({ 
  dish, 
  sizes = [], 
  flavors = [], 
  edges = [], 
  extras = [],
  categories = [],
  onAddToCart, 
  onClose,
  primaryColor = '#f97316',
  editingItem = null,
  store = null
}) {
  const { t } = useLanguage();
  const pizzaBuilderText = t('pizza.builder');
  // Config da visualizaÃ§Ã£o (imagem da borda)
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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [specifications, setSpecifications] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [extrasConfirmed, setExtrasConfirmed] = useState(false);
  const pizzaConfig = dish?.pizza_config || {};
  const availableSizes = useMemo(() => {
    const activeSizes = (sizes || []).filter((size) => size && size.is_active !== false);
    const configuredSizes = Array.isArray(pizzaConfig.sizes) ? pizzaConfig.sizes.filter(Boolean) : [];

    if (!configuredSizes.length) return activeSizes;

    const configuredById = new Map(configuredSizes.map((size) => [size.id, size]));
    return activeSizes
      .filter((size) => configuredById.has(size.id))
      .map((size) => ({ ...configuredById.get(size.id), ...size }));
  }, [sizes, pizzaConfig.sizes]);
  const allowedSizeIds = useMemo(
    () => new Set(availableSizes.map((size) => size.id)),
    [availableSizes]
  );
  const availableCategories = useMemo(() => {
    const activeCategories = (categories || []).filter((category) => category && category.is_active !== false);
    if (!allowedSizeIds.size) return activeCategories;
    return activeCategories.filter((category) => allowedSizeIds.has(category.size_id));
  }, [categories, allowedSizeIds]);
  const allowedFlavorIds = useMemo(() => {
    const configuredFlavorIds = Array.isArray(pizzaConfig.flavor_ids) ? pizzaConfig.flavor_ids.filter(Boolean) : [];
    return new Set(configuredFlavorIds);
  }, [pizzaConfig.flavor_ids]);
  const availableFlavors = useMemo(() => {
    const activeFlavors = (flavors || []).filter((flavor) => flavor && flavor.is_active !== false);
    if (!allowedFlavorIds.size) return activeFlavors;
    return activeFlavors.filter((flavor) => allowedFlavorIds.has(flavor.id));
  }, [flavors, allowedFlavorIds]);
  const availableEdges = useMemo(() => {
    const activeEdges = (edges || []).filter((edge) => edge && edge.is_active !== false);
    const configuredEdges = Array.isArray(pizzaConfig.edges) ? pizzaConfig.edges.filter((edge) => edge && edge.is_active !== false) : [];

    if (!configuredEdges.length) return activeEdges;

    const configuredById = new Map(configuredEdges.map((edge) => [edge.id, edge]));
    return activeEdges
      .filter((edge) => configuredById.has(edge.id))
      .map((edge) => ({ ...configuredById.get(edge.id), ...edge }));
  }, [edges, pizzaConfig.edges]);
  const availableExtras = useMemo(() => {
    const activeExtras = (extras || []).filter((extra) => extra && extra.is_active !== false);
    const configuredExtras = Array.isArray(pizzaConfig.extras) ? pizzaConfig.extras.filter((extra) => extra && extra.is_active !== false) : [];

    if (!configuredExtras.length) return activeExtras;

    const configuredById = new Map(configuredExtras.map((extra) => [extra.id, extra]));
    return activeExtras
      .filter((extra) => configuredById.has(extra.id))
      .map((extra) => ({ ...configuredById.get(extra.id), ...extra }));
  }, [extras, pizzaConfig.extras]);
  const useCategories = availableCategories.length > 0;
  const fixedCategory = dish?.pizza_category_id && useCategories
    ? availableCategories.find(c => c.id === dish.pizza_category_id)
    : null;
  const categoryIsFixed = !!fixedCategory;

  // Carregar dados de ediÃ§Ã£o ou prÃ©-preencher sabor
  React.useEffect(() => {
    if (editingItem) {
      const size = editingItem.size || null;
      setSelectedSize(size);
      if (useCategories && size) {
        const flavorCount = (editingItem.flavors || []).length;
        const cat = availableCategories.find(c => c.size_id === size.id && (c.max_flavors || 1) >= flavorCount)
          || availableCategories.find(c => c.size_id === size.id);
        setSelectedCategory(cat || null);
      }
      setSelectedFlavors(editingItem.flavors || []);
      setSelectedEdge(editingItem.edge || null);
      setSelectedExtras(editingItem.extras || []);
      setSpecifications(editingItem.specifications || '');
    } else {
      // Ordem: tamanho â†’ sabores â†’ personalize (nÃ£o prÃ©-selecionar tamanho)
      // PrÃ©-preencher sabor baseado no nome da pizza clicada (apenas quando jÃ¡ tem tamanho)
      if (dish && availableFlavors.length > 0 && selectedFlavors.length === 0 && selectedSize) {
        const dishName = dish.name.toLowerCase();
        // Tentar encontrar o sabor que corresponde ao nome da pizza
        // Ex: "Pizza Calabresa" -> procura sabor "Calabresa"
        const matchingFlavor = availableFlavors.find(f => {
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
  }, [editingItem, dish, availableCategories, availableFlavors, selectedSize, selectedFlavors.length, useCategories]);

  // Quando a pizza tem categoria fixa, inicializar por ela
  React.useEffect(() => {
    if (fixedCategory && !editingItem) {
      setSelectedCategory(fixedCategory);
      const size = availableSizes.find(s => s.id === fixedCategory.size_id);
      setSelectedSize(size || null);
      setSelectedFlavors([]);
    }
  }, [fixedCategory?.id, availableSizes, editingItem]);

  // Reset extrasConfirmed quando tamanho/categoria mudar
  React.useEffect(() => {
    setExtrasConfirmed(false);
  }, [selectedSize?.id, selectedCategory?.id]);

  // Sabores filtrados
  const filteredFlavors = useMemo(() => {
    return availableFlavors.filter(f =>
      f && f.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableFlavors, searchQuery]);

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

  // NÃºmero mÃ¡ximo de sabores (1-4) e extras - categoria pode sobrescrever max_flavors
  const effectiveMaxFlavors = selectedCategory?.max_flavors ?? selectedSize?.max_flavors ?? 1;
  const maxFlavors = Math.min(Math.max(effectiveMaxFlavors, 1), 4);
  const maxExtras = selectedSize?.max_extras ?? 5;
  const isSingleFlavorPizza = maxFlavors === 1;

  // Toggle sabor
  const toggleFlavor = (flavor) => {
    if (!selectedSize) return;
    const isSelected = selectedFlavors.some((selectedFlavor) => selectedFlavor.id === flavor.id);

    if (isSingleFlavorPizza) {
      if (isSelected) return;
      setSelectedFlavors([flavor]);
      return;
    }
    
    if (dish?.division_mode === 'exact') {
      // Modo exact: limite de sabores diferentes
      const uniqueFlavors = [...new Set(selectedFlavors.map(f => f.id))];
      
      if (isSelected) {
        setSelectedFlavors(selectedFlavors.filter(f => f.id !== flavor.id));
      } else if (uniqueFlavors.length < maxFlavors) {
        setSelectedFlavors([...selectedFlavors, flavor]);
      }
    } else {
      // Modo slice: manter limite comercial de sabores configurado
      if (isSelected) {
        setSelectedFlavors(selectedFlavors.filter((selectedFlavor) => selectedFlavor.id !== flavor.id));
      } else if (selectedFlavors.length < maxFlavors) {
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

  // Calcular preÃ§o
  const calculatePrice = () => {
    if (!selectedSize) return 0;
    
    const hasPremium = selectedFlavors.some(f => f.category === 'premium');
    let basePrice = Number(hasPremium ? selectedSize.price_premium : selectedSize.price_tradicional) || 0;
    
    if (selectedEdge && selectedEdge.price) basePrice += Number(selectedEdge.price) || 0;
    
    const extrasPrice = selectedExtras.reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
    
    return basePrice + extrasPrice;
  };

  // Finalizar
  const handleAddToCart = () => {
    const item = {
      dish,
      size: selectedSize,
      category: selectedCategory || fixedCategory,
      flavors: selectedFlavors,
      edge: selectedEdge,
      extras: selectedExtras,
      specifications,
      totalPrice: calculatePrice()
    };
    onAddToCart(item, editingItem !== null);
  };

  // --- TELAS ---

  const premiumMode = store?.enable_premium_pizza_visualization !== false;
  const hasBordersAvailable = availableEdges.length > 0;
  const hasExtrasAvailable = availableExtras.length > 0;
  const canAddToCart = selectedSize && selectedFlavors.length > 0 && (!hasExtrasAvailable || extrasConfirmed);
  const selectedFlavorCount = selectedFlavors.length;
  const flavorsRemaining = Math.max(maxFlavors - selectedFlavorCount, 0);
  const flavorTargetText = maxFlavors === 1 ? '1 sabor' : `${maxFlavors} sabores`;
  const flavorHelperText = !selectedSize
    ? 'Passo 1: escolha o tamanho da pizza.'
    : selectedFlavorCount === 0
      ? `Passo 2: escolha ${flavorTargetText} para montar sua pizza.`
      : isSingleFlavorPizza
        ? 'Sabor escolhido. Toque para trocar quando quiser.'
      : flavorsRemaining > 0
        ? `Faltam ${flavorsRemaining} ${flavorsRemaining === 1 ? 'sabor' : 'sabores'} para completar sua pizza.`
        : 'Você já escolheu todos os sabores. Agora personalize sua pizza.';
  const borderHelperText = !selectedFlavors.length
    ? 'Depois dos sabores, você pode escolher uma borda opcional.'
    : selectedEdge === null
      ? 'Opcional. Escolha uma borda ou siga sem borda.'
      : selectedEdge.id === 'none'
        ? 'Sem borda selecionada.'
        : `${selectedEdge.name} selecionada.`;
  const extrasHelperText = !selectedFlavors.length
    ? 'Extras opcionais ficam disponíveis depois dos sabores.'
    : hasBordersAvailable && selectedEdge === null
      ? 'Confirme a borda para revisar os extras.'
      : selectedExtras.length > 0
        ? `${selectedExtras.length} extra${selectedExtras.length !== 1 ? 's' : ''} selecionado${selectedExtras.length !== 1 ? 's' : ''} para sua pizza.`
        : hasExtrasAvailable
          ? 'Você pode seguir sem extras ou adicionar opcionais à sua pizza.'
          : pizzaBuilderText.noExtrasAvailable;
  const observationsHelperText = !selectedFlavors.length
    ? 'As observações ficam disponíveis depois da escolha dos sabores.'
    : hasBordersAvailable && selectedEdge === null
      ? 'Confirme a borda para liberar o recado da cozinha.'
      : specifications
        ? pizzaBuilderText.addKitchenNote
        : 'Se quiser, adicione um recado para a cozinha.';
  const ctaHelperText = !selectedSize
    ? 'Escolha o tamanho para continuar.'
    : !selectedFlavors.length
      ? flavorHelperText
      : hasExtrasAvailable && !extrasConfirmed
        ? 'Revise os extras e toque em Confirmar para continuar.'
        : pizzaBuilderText.readyForCart;
  const ctaButtonLabel = !selectedSize
    ? 'ESCOLHA O TAMANHO'
    : !selectedFlavors.length
      ? 'ESCOLHA OS SABORES'
      : hasExtrasAvailable && !extrasConfirmed
        ? 'CONFIRME OS EXTRAS'
        : 'ADICIONAR AO PEDIDO';
  const selectedFlavorNames = selectedFlavors.map((flavor) => flavor?.name).filter(Boolean);
  const selectedFlavorSummary = selectedFlavorNames.length > 0
    ? selectedFlavorNames.join(' + ')
    : 'Escolha os sabores para liberar a personalização.';
  const previewStatusLabel = !selectedSize
    ? 'Escolha o tamanho'
    : selectedFlavorCount === 0
      ? 'Monte os sabores'
      : isSingleFlavorPizza
        ? 'Toque para trocar o sabor'
        : selectedFlavorCount < maxFlavors
          ? 'Complete os sabores'
          : 'Pizza pronta para personalizar';

  // CUSTOM VIEW (Montagem)
  const CustomView = () => (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ backgroundColor: premiumMode ? 'rgba(0,0,0,0.85)' : '#0f0f0f' }}>
      {/* Header */}
      <header className="flex-shrink-0 py-4 px-6 flex items-center justify-between shadow-md" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-white font-black text-xl uppercase tracking-tighter">{pizzaBuilderText.title}</h1>
        </div>
        <button onClick={onClose} className="text-white">
          <X size={24} />
        </button>
      </header>

      {/* Layout Desktop vs Mobile - min-h-0 Ã© crÃ­tico para scroll no flexbox */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="w-full max-w-full mx-auto px-4 py-6 pb-52 lg:pb-8 box-border">
          {/* Layout em Grid no Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-6 max-w-5xl mx-auto w-full">
            
            {/* Coluna Esquerda - Pizza e PreÃ§o */}
            <div className={`space-y-3 lg:space-y-4 rounded-2xl p-4 ${premiumMode ? 'bg-black/40 backdrop-blur-xl border border-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]' : ''}`}>
              <div className="flex flex-col items-center justify-center py-1 relative min-w-0">
                {premiumMode && (
                  <div className="pointer-events-none absolute inset-x-4 top-8 h-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.28),rgba(251,191,36,0.16),transparent_72%)] blur-2xl" />
                )}
                <div className="mb-4 w-full max-w-md rounded-2xl border border-white/10 bg-black/45 px-5 py-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <p className="text-[11px] text-orange-200/80 font-black uppercase tracking-[0.24em]">{pizzaBuilderText.premiumBuild}</p>
                  <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-white md:text-2xl">
                    {selectedCategory?.name || dish?.name || pizzaBuilderText.yourPizza}
                  </h2>
                  <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                    {selectedFlavorSummary}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <Badge className="border border-white/10 bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                      {selectedSize ? selectedSize.name : 'Tamanho pendente'}
                    </Badge>
                    <Badge className="border border-white/10 bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                      {previewStatusLabel}
                    </Badge>
                  </div>
                </div>
                <button 
                  onClick={() => selectedSize && setStep('flavors')}
                  disabled={!selectedSize}
                  className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] lg:w-[420px] lg:h-[420px] pizza-container group cursor-pointer flex-shrink-0 disabled:opacity-70 disabled:cursor-not-allowed rounded-full overflow-hidden shadow-xl"
                >
                  {premiumMode && selectedEdge && selectedEdge.id !== 'none' && (
                    <motion.div 
                      className="absolute inset-0 rounded-full pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ boxShadow: 'inset 0 0 40px rgba(251,191,36,0.08)' }}
                    />
                  )}
                  {/* Pizza */}
                  <motion.div 
                    className="absolute inset-0 rounded-full overflow-hidden"
                    initial={premiumMode ? { opacity: 0.7, scale: 0.98 } : {}}
                    animate={premiumMode ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <defs>
                        {Array.from({ length: maxFlavors }).map((_, i) => selectedFlavors[i]?.image && (
                          <pattern key={i} id={`pizza-slice-${i}`} patternUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                            <image href={selectedFlavors[i].image} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                          </pattern>
                        ))}
                        {/* Borda - pattern com userSpaceOnUse para melhor compatibilidade */}
                        {selectedEdge && selectedEdge.id !== 'none' && (
                          <pattern id={`pizza-edge-ring-${selectedEdge?.id || 'default'}`} patternUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                            <image href={selectedEdge?.image || edgeImageUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                          </pattern>
                        )}
                      </defs>
                      {/* Base massa */}
                      <circle cx="50" cy="50" r="50" fill="#3d2817" />
                      {/* BORDA POR BAIXO - renderizada antes dos sabores */}
                      {selectedEdge && selectedEdge.id !== 'none' && (() => {
                        const outerRadius = 50;
                        const innerRadius = 42;
                        const outerPath = `M 50,50 m -${outerRadius},0 a ${outerRadius},${outerRadius} 0 1,1 ${outerRadius * 2},0 a ${outerRadius},${outerRadius} 0 1,1 -${outerRadius * 2},0`;
                        const innerPath = `M 50,50 m -${innerRadius},0 a ${innerRadius},${innerRadius} 0 1,1 ${innerRadius * 2},0 a ${innerRadius},${innerRadius} 0 1,1 -${innerRadius * 2},0`;
                        return (
                          <path
                            d={`${outerPath} ${innerPath}`}
                            fill={`url(#pizza-edge-ring-${selectedEdge?.id || 'default'})`}
                            fillRule="evenodd"
                            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
                          />
                        );
                      })()}
                      {/* SABORES (recheio) - em cima da borda, imagens com userSpaceOnUse */}
                      {(() => {
                        const flavorRadius = (selectedEdge && selectedEdge.id !== 'none') ? 42 : 50;
                        return maxFlavors === 1 ? (
                          selectedFlavors[0] ? (
                            <circle cx="50" cy="50" r={flavorRadius} fill={selectedFlavors[0].image ? `url(#pizza-slice-0)` : (selectedFlavors[0].color || '#444')} />
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
                            const r = flavorRadius;
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
                        );
                      })()}
                      {maxFlavors > 1 && selectedFlavors.filter(Boolean).length < maxFlavors && (
                        <g>
                          {Array.from({ length: maxFlavors }).map((_, i) => {
                            if (selectedFlavors[i]) return null;
                            const anglePerSlice = 360 / maxFlavors;
                            const midAngle = (anglePerSlice * (i + 0.5) - 90) * (Math.PI / 180);
                            const r = (selectedEdge && selectedEdge.id !== 'none') ? 42 : 50;
                            const x = 50 + (r / 2) * Math.cos(midAngle);
                            const y = 50 + (r / 2) * Math.sin(midAngle);
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
                  </motion.div>
                  {selectedSize && (
                    <div className="pointer-events-none absolute inset-x-6 bottom-5 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur-xl">
                      {selectedFlavorCount > 0
                        ? isSingleFlavorPizza
                          ? 'Toque para trocar o sabor'
                          : 'Toque para revisar os sabores'
                        : 'Toque para escolher os sabores'}
                    </div>
                  )}
                </button>
                <div className="mt-3 w-full max-w-md rounded-2xl border border-white/10 bg-black/45 px-5 py-4 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <p className="text-[11px] text-orange-200/80 font-black uppercase tracking-[0.24em]">{pizzaBuilderText.finalValueTitle}</p>
                  <div className="mt-1 flex items-end justify-center gap-2">
                    <span className="text-3xl md:text-4xl font-black text-white italic leading-none">{formatCurrency(calculatePrice())}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    O valor final muda em tempo real com sabores, borda e extras.
                  </p>
                  {selectedFlavorNames.length > 0 && (
                    <p className="mt-2 text-sm font-semibold text-white/90">
                      {selectedFlavorSummary}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Badge className="border border-white/10 bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    {selectedSize ? selectedSize.name : 'Escolha um tamanho'}
                  </Badge>
                  <Badge className="border border-white/10 bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    {selectedSize ? `${selectedFlavorCount}/${maxFlavors} sabores` : pizzaBuilderText.pendingFlavors}
                  </Badge>
                  {selectedEdge !== null && (
                    <Badge className="border border-white/10 bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                      {selectedEdge.id === 'none' ? 'Sem borda' : selectedEdge.name}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 max-w-md text-center text-sm text-gray-300 leading-relaxed">
                  {flavorHelperText}
                </p>
                {selectedSize && (
                  <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((selectedFlavorCount / maxFlavors) * 100, 100)}%`, backgroundColor: primaryColor }}
                    />
                  </div>
                )}
                {selectedFlavors.length > 0 && selectedFlavors.length < maxFlavors && (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-300/90">
                    Faltam {flavorsRemaining} {flavorsRemaining === 1 ? 'sabor' : 'sabores'} para completar sua pizza
                  </p>
                )}
                {selectedFlavors.length >= maxFlavors && !isSingleFlavorPizza && (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-300/90">
                    {pizzaBuilderText.flavorsComplete}
                  </p>
                )}
                {selectedFlavors.length >= maxFlavors && isSingleFlavorPizza && (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-300/90">
                    Sabor definido. Toque novamente para trocar quando quiser.
                  </p>
                )}
              </div>
            </div>

            {/* Coluna Direita - Todas as OpÃ§Ãµes */}
            <div className="space-y-3">
              {/* Categoria fixa (quando pizza jÃ¡ tem categoria) ou seletor de tamanho/categoria */}
              {categoryIsFixed ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5">
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-black mb-1">{pizzaBuilderText.categoryLabel}</p>
                  <p className="text-white font-bold text-base md:text-lg">
                    {((selectedCategory || fixedCategory)?.name) || (() => {
                      const c = selectedCategory || fixedCategory;
                      const sz = c ? availableSizes.find(s => s.id === c.size_id) : null;
                      return (c && sz) ? `${sz.name} • ${c.max_flavors || 1} sabor(es)` : '';
                    })()}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-white text-xs font-black uppercase tracking-widest opacity-80">
                    {useCategories ? pizzaBuilderText.pizzaCategoryLabel : pizzaBuilderText.pizzaSizeLabel}
                  </label>
                  <div className="relative">
                    {useCategories ? (
                      <select 
                        className="w-full text-white py-3 px-4 rounded-xl font-bold appearance-none text-sm shadow-lg border-b-4 focus:outline-none"
                        style={{ backgroundColor: primaryColor, borderColor: '#c2410c' }}
                        value={selectedCategory?.id || ''}
                        onChange={(e) => {
                          const cat = availableCategories.find(c => c.id === e.target.value);
                          setSelectedCategory(cat || null);
                          const size = cat ? availableSizes.find(s => s.id === cat.size_id) : null;
                          setSelectedSize(size);
                          setSelectedFlavors([]);
                        }}
                      >
                        <option value="">{pizzaBuilderText.selectCategory}</option>
                        {availableCategories.map(c => {
                          const sz = availableSizes.find(s => s.id === c.size_id);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name || (sz ? `${sz.name} ${c.max_flavors || 1} sabor(es)` : '')}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <select 
                        className="w-full text-white py-3 px-4 rounded-xl font-bold appearance-none text-sm shadow-lg border-b-4 focus:outline-none"
                        style={{ backgroundColor: primaryColor, borderColor: '#c2410c' }}
                        value={selectedSize?.id || ''}
                        onChange={(e) => {
                          const size = availableSizes.find(s => s.id === e.target.value);
                          setSelectedSize(size);
                          setSelectedCategory(null);
                          setSelectedFlavors([]);
                        }}
                      >
                        <option value="">{pizzaBuilderText.selectSize}</option>
                        {availableSizes.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} - {s.slices} fatias - {s.max_flavors} {s.max_flavors === 1 ? 'sabor' : 'sabores'}
                          </option>
                        ))}
                      </select>
                    )}
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={18} />
                  </div>
                </div>
              )}

              {/* Sabores - travado quando 1 sabor jÃ¡ selecionado */}
              <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5 ${!selectedSize ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-xs uppercase tracking-widest font-black mb-1">{pizzaBuilderText.flavorsLabel}</p>
                    <p className="text-white text-sm font-bold leading-tight truncate">
                      {selectedFlavors.length > 0 ? (
                        <span>{selectedFlavors.map(f => f.name).join(' + ')}</span>
                      ) : (
                        <span className="text-gray-500">{selectedSize ? 'Toque para escolher os sabores' : 'Escolha o tamanho para liberar os sabores'}</span>
                      )}
                    </p>
                  </div>
                  <button 
                    onClick={() => selectedSize && setStep('flavors')}
                    disabled={!selectedSize}
                    className="px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primaryColor, color: 'white' }}
                  >
                    {isSingleFlavorPizza
                      ? selectedFlavors.length > 0
                        ? 'Trocar sabor'
                        : 'Escolher sabor'
                      : selectedFlavors.length > 0
                        ? 'Trocar sabores'
                        : 'Escolher sabores'}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">
                  {flavorHelperText}
                </p>
              </div>

              {/* TÃ­tulo PersonalizaÃ§Ã£o - sÃ³ apÃ³s sabores */}
              <h3 className={`text-white text-xs font-black uppercase tracking-widest px-2 pt-2 ${selectedFlavors.length < 1 ? 'opacity-50' : 'opacity-80'}`}>{pizzaBuilderText.customizeTitle}</h3>
              
              {/* Borda - sÃ³ apÃ³s pizza completa (sabores selecionados) */}
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
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-black">{pizzaBuilderText.borderLabel}</p>
                    <p className="text-white font-black text-xs">
                      {selectedEdge && selectedEdge.id !== 'none' ? selectedEdge.name : 'Sem borda'}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400 max-w-[16rem]">
                      {borderHelperText}
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-gray-400" size={18} />
              </button>

              {/* Extras - sÃ³ apÃ³s borda (ou se nÃ£o tiver bordas) */}
              <button 
                onClick={() => (!hasBordersAvailable || selectedEdge !== null) && setStep('extras')}
                disabled={hasBordersAvailable && selectedEdge === null}
                className={`w-full backdrop-blur-sm text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-md transition-all border border-white/5 ${(!hasBordersAvailable || selectedEdge !== null) ? 'bg-white/10 hover:bg-white/20 active:scale-95' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/20">
                    <Plus size={16} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-black">{pizzaBuilderText.extrasLabel}</p>
                    <p className="text-white font-black text-xs">
                      {selectedExtras.length > 0 ? `${selectedExtras.length} selecionados` : pizzaBuilderText.noExtras}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400 max-w-[16rem]">
                      {extrasHelperText}
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-gray-400" size={18} />
              </button>

              {/* ObservaÃ§Ãµes - sÃ³ apÃ³s borda (ou se nÃ£o tiver bordas) */}
              <button 
                onClick={() => (!hasBordersAvailable || selectedEdge !== null) && setStep('observations')}
                disabled={hasBordersAvailable && selectedEdge === null}
                className={`w-full backdrop-blur-sm text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-md active:scale-95 transition-all border border-white/5 ${(!hasBordersAvailable || selectedEdge !== null) ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-500/20">
                    <span className="text-lg">📝</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-black">{pizzaBuilderText.kitchenNoteLabel}</p>
                    <p className="text-white font-black text-xs">
                      {specifications ? 'Recado adicionado' : 'Algum recado para a cozinha?'}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400 max-w-[16rem]">
                      {observationsHelperText}
                    </p>
                  </div>
                </div>
                <ChevronDown className="text-gray-400" size={18} />
              </button>

              {/* BotÃ£o de Adicionar - sÃ³ clicÃ¡vel apÃ³s confirmar extras (quando houver) */}
              <div className="hidden lg:block pt-4">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">{pizzaBuilderText.almostReady}</p>
                      <p className="mt-1 text-sm text-gray-300">{ctaHelperText}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">Valor final</p>
                      <p className="text-2xl font-black text-white">{formatCurrency(calculatePrice())}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                    className="w-full text-white py-4 rounded-xl font-black text-base shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: canAddToCart ? '#4caf50' : '#9ca3af' }}
                  >
                    <ShoppingBag size={20} /> {ctaButtonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Fixo - Adicionar (Mobile apenas) */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-50 pointer-events-none"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-full max-w-md mx-auto rounded-2xl border border-white/10 bg-black/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl pointer-events-auto">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-400">Valor final</p>
              <p className="mt-1 text-sm text-gray-300 leading-relaxed">{ctaHelperText}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">{pizzaBuilderText.yourPizza}</p>
              <p className="text-2xl font-black text-white">{formatCurrency(calculatePrice())}</p>
            </div>
          </div>
          <button 
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="w-full text-white py-4 rounded-xl font-black text-base shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: canAddToCart ? '#4caf50' : '#9ca3af' }}
          >
            <ShoppingBag size={20} /> {ctaButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );

  // FLAVORS VIEW (SeleÃ§Ã£o de Sabores)
  const FlavorsView = () => (
    <div className="min-h-screen w-full flex flex-col bg-white">
      {/* Header */}
      <header className="py-3 px-4 sticky top-0 z-50 shadow-md" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStep('custom')} className="text-white">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <h1 className="text-white font-black text-lg uppercase tracking-tight">Escolha os sabores da sua pizza</h1>
          <div className="w-6" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={pizzaBuilderText.searchFlavorPlaceholder}
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
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <div className="flex-1">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{pizzaBuilderText.progressLabel}</span>
            <span className="mt-1 block text-sm font-black text-gray-900 uppercase">
              {selectedFlavorCount} de {maxFlavors} sabores
            </span>
            <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min((selectedFlavorCount / maxFlavors) * 100, 100)}%`, backgroundColor: primaryColor }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {flavorHelperText}
            </p>
          </div>
          <button 
            onClick={() => setStep('custom')}
            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-wide transition-all ${selectedFlavors.length > 0 ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
            style={{ backgroundColor: selectedFlavors.length > 0 ? primaryColor : '#f3f4f6' }}
          >
            {selectedFlavors.length === 0
              ? 'Escolha um sabor'
              : isSingleFlavorPizza
                ? 'Usar este sabor'
                : 'Confirmar sabores'}
          </button>
        </div>
      </footer>
    </div>
  );

  // SELECTION OVERLAY (Bordas, Extras, ObservaÃ§Ãµes)
  const SelectionOverlay = ({ title, items, current, onSelect, onClose, type = 'single', maxItems = 999, onConfirm }) => {
    // Estado local para textarea evita re-renders e bug de texto ao contrÃ¡rio/piscando
    const [localText, setLocalText] = useState(type === 'textarea' ? (current || '') : '');
    React.useEffect(() => {
      if (type === 'textarea') setLocalText(current || '');
    }, [type, current]);
    return (
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
            <textarea
              dir="ltr"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              placeholder="Ex: Sem cebola, bem assada, massa fina..."
              className="flex min-h-[100px] w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              autoFocus
              style={{ direction: 'ltr' }}
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
      
      {/* Footer fixo com botÃ£o */}
      {(type === 'textarea' || type === 'multiple') && (
        <div className="p-4 border-t border-white/10 bg-black/50">
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={() => {
                if (type === 'textarea') onSelect(localText);
                onConfirm?.();
                onClose();
              }}
              className="w-full text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              {type === 'multiple' 
                ? `Confirmar seleção (${current.length})` 
                : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-[9999] antialiased">
      <AnimatePresence mode="wait">
        {step === 'custom' && <CustomView />}
        {step === 'flavors' && <FlavorsView />}
        {step === 'borders' && (
          <SelectionOverlay 
            title="Escolha a borda da sua pizza" 
            items={[{ id: 'none', name: 'Sem borda', price: 0 }, ...availableEdges]} 
            current={selectedEdge || { id: 'none', name: 'Sem borda', price: 0 }} 
            onSelect={setSelectedEdge} 
            onClose={() => setStep('custom')} 
            type="single"
          />
        )}
        {step === 'extras' && (
          <SelectionOverlay 
            title={`Adicione extras à sua pizza (máx. ${maxExtras})`} 
            items={availableExtras} 
            current={selectedExtras} 
            onSelect={setSelectedExtras} 
            onClose={() => setStep('custom')}
            onConfirm={() => setExtrasConfirmed(true)}
            type="multiple"
            maxItems={maxExtras}
          />
        )}
        {step === 'observations' && (
          <SelectionOverlay 
            title={pizzaBuilderText.kitchenNoteLabel} 
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




