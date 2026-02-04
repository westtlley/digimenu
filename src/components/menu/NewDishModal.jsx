import React, { useState, useEffect } from 'react';
import { X, Check, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

// Função para extrair ID do YouTube ou Vimeo
const getVideoId = (url) => {
  if (!url) return null;
  
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { type: 'youtube', id: youtubeMatch[1] };
  }
  
  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return { type: 'vimeo', id: vimeoMatch[1] };
  }
  
  return null;
};

export default function NewDishModal({ 
  isOpen, onClose, dish, complementGroups, onAddToCart, editingItem,
  darkMode = false, primaryColor = '#f97316'
}) {
  const [selections, setSelections] = useState({});
  const [currentTotal, setCurrentTotal] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const videoInfo = dish?.video_url ? getVideoId(dish.video_url) : null;

  // Filtra apenas os grupos vinculados ao prato
  // VALIDAÇÃO CRÍTICA: garantir que complementGroups seja array
  const safeComplementGroups = Array.isArray(complementGroups) ? complementGroups : [];
  const dishComplementGroups = safeComplementGroups.filter(group => {
    if (!dish?.complement_groups || !Array.isArray(dish.complement_groups)) return false;
    return dish.complement_groups.some(cg => cg && cg.group_id === group.id);
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    if (isOpen && dish) {
      if (editingItem && editingItem.selections) {
        setSelections(editingItem.selections);
      } else {
        setSelections({});
      }
      setCurrentTotal(dish.price || 0);
      setShowVideo(false); // Reset video quando abre o modal
    }
  }, [isOpen, dish, editingItem]);

  useEffect(() => {
    if (!dish) return;
    let total = dish.price || 0;
    Object.values(selections).forEach(groupSelection => {
      if (Array.isArray(groupSelection)) {
        groupSelection.forEach(option => { total += option.price || 0; });
      } else if (groupSelection) {
        total += groupSelection.price || 0;
      }
    });
    setCurrentTotal(total);
  }, [selections, dish]);

  if (!isOpen || !dish) return null;

  const handleSelect = (group, option) => {
    const groupId = group.id;
    const maxSelection = group.max_selection || 1;
    const linkedGroup = dish?.complement_groups?.find(cg => cg.group_id === groupId);
    const isRequired = linkedGroup?.is_required;

    if (maxSelection === 1) {
      // Para grupos opcionais, permite desmarcar clicando novamente
      if (!isRequired && selections[groupId]?.id === option.id) {
        setSelections(prev => {
          const newSelections = { ...prev };
          delete newSelections[groupId];
          return newSelections;
        });
        return;
      }
      // Se for obrigatório e já está selecionado a mesma opção, não permite desmarcar
      if (isRequired && selections[groupId]?.id === option.id) {
        return;
      }
      setSelections(prev => ({ ...prev, [groupId]: option }));
    } else {
      setSelections(prev => {
        const current = prev[groupId] || [];
        const exists = current.find(o => o.id === option.id);
        if (exists) {
          // Se for obrigatório e é a última seleção, não permite desmarcar
          if (isRequired && current.length === 1) {
            return prev;
          }
          return { ...prev, [groupId]: current.filter(o => o.id !== option.id) };
        } else if (current.length < maxSelection) {
          return { ...prev, [groupId]: [...current, option] };
        }
        return prev;
      });
    }
  };

  const isSelected = (group, option) => {
    const groupId = group.id;
    const maxSelection = group.max_selection || 1;
    if (maxSelection === 1) {
      return selections[groupId]?.id === option.id;
    } else {
      return (selections[groupId] || []).some(o => o.id === option.id);
    }
  };

  const canAddToCart = () => {
    return dishComplementGroups.every(group => {
      const linkedGroup = dish?.complement_groups?.find(cg => cg.group_id === group.id);
      if (!linkedGroup?.is_required) return true;
      const selection = selections[group.id];
      if (group.max_selection === 1) {
        return !!selection;
      }
      return Array.isArray(selection) && selection.length > 0;
    });
  };

  const handleAddToCart = () => {
    if (!canAddToCart()) return;
    const orderItem = {
      id: Date.now().toString(), dish, selections, totalPrice: currentTotal,
    };
    onAddToCart(orderItem);
    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative flex flex-col md:flex-row w-full md:m-auto md:max-w-5xl md:h-[85vh] bg-white dark:bg-gray-900 backdrop-blur-xl md:rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Mobile Image Header - Compacto */}
            <div className="md:hidden relative w-full h-36 flex-shrink-0">
              {showVideo && videoInfo ? (
                <div className="w-full h-full bg-black">
                  {videoInfo.type === 'youtube' ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoInfo.id}?autoplay=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <iframe
                      src={`https://player.vimeo.com/video/${videoInfo.id}?autoplay=1`}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : dish.image ? (
                <div className="relative w-full h-full">
                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                  {videoInfo && (
                    <button
                      onClick={() => setShowVideo(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors group"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 ml-1" style={{ color: primaryColor }} fill={primaryColor} />
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <span className="text-gray-400 text-xs">Sem imagem</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                <h2 className="text-white text-lg font-bold mb-0.5 drop-shadow-lg">{dish.name}</h2>
                {dish.description && (
                  <p className="text-gray-100 text-xs line-clamp-1 drop-shadow-md">{dish.description}</p>
                )}
              </div>
              {/* Botão X fixo no mobile com melhor contraste e área de toque maior */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (showVideo) {
                    setShowVideo(false);
                  } else {
                    onClose();
                  }
                }}
                className="absolute top-2 right-2 p-2.5 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm z-50 active:scale-95 transition-all touch-manipulation"
                aria-label={showVideo ? "Voltar" : "Fechar"}
              >
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Desktop Left - Image */}
            <div className="hidden md:block w-2/5 relative">
              {showVideo && videoInfo ? (
                <div className="w-full h-full bg-black">
                  {videoInfo.type === 'youtube' ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoInfo.id}?autoplay=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <iframe
                      src={`https://player.vimeo.com/video/${videoInfo.id}?autoplay=1`}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : dish.image ? (
                <div className="relative w-full h-full">
                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                  {videoInfo && (
                    <button
                      onClick={() => setShowVideo(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                    >
                      <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-10 h-10 ml-1" style={{ color: primaryColor }} fill={primaryColor} />
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <span className="text-gray-400">Sem imagem</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                <h2 className="text-white text-2xl font-bold mb-1 drop-shadow-lg">{dish.name}</h2>
                {dish.description && (
                  <p className="text-gray-100 text-sm drop-shadow-md">{dish.description}</p>
                )}
              </div>
              {showVideo && (
                <button
                  onClick={() => setShowVideo(false)}
                  className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm z-10 transition-colors"
                  aria-label="Voltar"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
            </div>

            {/* Right - Options */}
            <div className="flex-1 flex flex-col min-h-0">
              <button 
                onClick={onClose} 
                className="hidden md:block absolute top-4 right-4 p-2 rounded-full z-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>

              <div className="flex-1 overflow-y-auto p-3 md:p-5 pt-3 md:pt-12">
                {dishComplementGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Este prato não possui complementos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dishComplementGroups.map((group) => {
                      const activeOptions = (group.options || []).filter(opt => opt.is_active !== false);
                      if (activeOptions.length === 0) return null;
                      const linkedGroup = dish?.complement_groups?.find(cg => cg.group_id === group.id);

                      return (
                        <div key={group.id}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm md:text-base text-gray-900 dark:text-gray-100">
                              {group.name}
                              {linkedGroup?.is_required && <span className="text-red-500 ml-1">*</span>}
                            </h3>
                            <div className="flex gap-1.5">
                              <Badge variant="outline" className={`text-xs ${linkedGroup?.is_required ? 'border-red-300 text-red-600 dark:border-red-500 dark:text-red-400' : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'}`}>
                                {linkedGroup?.is_required ? 'Obrigatório' : 'Opcional'}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:border-blue-500 dark:text-blue-400">
                                {group.max_selection || 1}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {activeOptions.map((option) => (
                              <motion.button
                                key={option.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSelect(group, option)}
                                className={cn(
                                  "w-full p-2.5 md:p-3 rounded-lg border-2 flex items-center gap-3 transition-all",
                                  isSelected(group, option)
                                    ? "bg-orange-50 dark:bg-orange-900/20 border-opacity-80"
                                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                )}
                                style={isSelected(group, option) ? { borderColor: primaryColor } : {}}
                              >
                                {/* ✅ IMAGEM DO COMPLEMENTO */}
                                {option.image ? (
                                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0 border-2" style={{ borderColor: isSelected(group, option) ? primaryColor : 'transparent' }}>
                                    <img 
                                      src={option.image} 
                                      alt={option.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs" style={{ display: 'none' }}>
                                      🍽️
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 border-2" style={{ borderColor: isSelected(group, option) ? primaryColor : 'transparent' }}>
                                    <span className="text-gray-400 text-lg">🍽️</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div 
                                    className={cn(
                                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                      isSelected(group, option) ? "border-transparent" : "border-gray-300 dark:border-gray-600"
                                    )}
                                    style={isSelected(group, option) ? { backgroundColor: primaryColor } : {}}
                                  >
                                    {isSelected(group, option) && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{option.name}</span>
                                </div>
                                {option.price > 0 && (
                                  <span className="font-semibold text-sm flex-shrink-0 text-gray-700 dark:text-gray-300">
                                    + {formatCurrency(option.price)}
                                  </span>
                                )}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Compacto */}
              <motion.div 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="border-t p-3 flex-shrink-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Total</span>
                  <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white" style={{ color: primaryColor }}>
                    {formatCurrency(currentTotal)}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={!canAddToCart()}
                  className="w-full h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95"
                  style={{ background: canAddToCart() ? `linear-gradient(135deg, ${primaryColor}, #ef4444)` : '#9ca3af' }}
                >
                  <Check className="w-4 h-4 inline mr-1.5" />
                  {editingItem ? 'Salvar' : 'Adicionar'}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}