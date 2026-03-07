import React, { useState, useEffect } from 'react';
import { X, Check, Play, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

// FunÃ§Ã£o para extrair ID do YouTube ou Vimeo
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
  isOpen, onClose, onBack = null, dish, complementGroups, onAddToCart, editingItem,
  darkMode = false, primaryColor = '#f97316', mobileFullScreen = false
}) {
  const [selections, setSelections] = useState({});
  const [currentTotal, setCurrentTotal] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [isMediaCollapsed, setIsMediaCollapsed] = useState(false);
  const dialogRef = React.useRef(null);
  const optionsScrollRef = React.useRef(null);
  const lastOptionsScrollTopRef = React.useRef(0);
  const videoInfo = dish?.video_url ? getVideoId(dish.video_url) : null;

  // Filtra apenas os grupos vinculados ao prato
  // VALIDAÃ‡ÃƒO CRÃTICA: garantir que complementGroups seja array
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
      setIsMediaCollapsed(false);
      lastOptionsScrollTopRef.current = 0;
      if (optionsScrollRef.current) {
        optionsScrollRef.current.scrollTop = 0;
      }
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

  useEffect(() => {
    if (!isOpen) return undefined;

    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !dish) return null;

  const handleOptionsScroll = (event) => {
    if (!mobileFullScreen) return;

    const currentTop = event.currentTarget.scrollTop;
    const previousTop = lastOptionsScrollTopRef.current;
    const delta = currentTop - previousTop;

    if (currentTop <= 8) {
      if (isMediaCollapsed) setIsMediaCollapsed(false);
      lastOptionsScrollTopRef.current = 0;
      return;
    }

    if (delta > 8 && currentTop > 24 && !isMediaCollapsed) {
      setIsMediaCollapsed(true);
    } else if (delta < -8 && currentTop < 120 && isMediaCollapsed) {
      setIsMediaCollapsed(false);
    }

    lastOptionsScrollTopRef.current = currentTop;
  };

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
      // Se for obrigatÃ³rio e jÃ¡ estÃ¡ selecionado a mesma opÃ§Ã£o, nÃ£o permite desmarcar
      if (isRequired && selections[groupId]?.id === option.id) {
        return;
      }
      setSelections(prev => ({ ...prev, [groupId]: option }));
    } else {
      setSelections(prev => {
        const current = prev[groupId] || [];
        const exists = current.find(o => o.id === option.id);
        if (exists) {
          // Se for obrigatÃ³rio e Ã© a Ãºltima seleÃ§Ã£o, nÃ£o permite desmarcar
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
        <div
          className={mobileFullScreen
            ? "fixed inset-0 z-50 flex items-stretch justify-center"
            : "fixed inset-0 z-50 flex items-center justify-center p-4"
          }
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes do prato ${dish?.name || ''}`}
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={mobileFullScreen ? "absolute inset-0 bg-black/70" : "absolute inset-0 bg-black/60 backdrop-blur-sm"}
            onClick={mobileFullScreen ? undefined : onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            ref={dialogRef}
            tabIndex={-1}
            className={`relative flex flex-col md:flex-row w-full bg-card backdrop-blur-xl overflow-hidden shadow-2xl ${
              mobileFullScreen
                ? 'h-[100dvh] max-h-[100dvh] rounded-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
                : 'md:m-auto md:max-w-5xl lg:max-w-[1100px] md:h-[85vh] md:rounded-3xl'
            }`}
          >
            {mobileFullScreen && (
              <div className="flex items-center justify-between border-b border-border px-3 py-3">
                <button
                  onClick={() => {
                    if (showVideo) {
                      setShowVideo(false);
                      return;
                    }
                    (onBack || onClose)?.();
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Voltar"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <div className="min-w-0 px-2 text-center">
                  <p className="text-xs text-muted-foreground">Detalhes do prato</p>
                  <p className="text-sm font-semibold text-foreground truncate">{dish?.name}</p>
                </div>
                <button
                  onClick={() => {
                    if (showVideo) {
                      setShowVideo(false);
                      return;
                    }
                    onClose?.();
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            )}
            {/* MÃ­dia (imagem ou vÃ­deo) â€” mobile: limite menor ~28vh; desktop: ~45% largura */}
            <motion.div
              initial={false}
              animate={mobileFullScreen
                ? { height: isMediaCollapsed ? 0 : '28vh', opacity: isMediaCollapsed ? 0 : 1 }
                : { height: 'auto', opacity: 1 }
              }
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className={`relative w-full md:aspect-auto md:h-full md:w-2/5 lg:w-[45%] flex-shrink-0 overflow-hidden ${
                mobileFullScreen ? '' : 'aspect-[9/16] max-h-[28vh] md:max-h-none'
              }`}
            >
              {showVideo && videoInfo ? (
                <div className="w-full h-full bg-black relative">
                  {videoInfo.type === 'youtube' ? (
                    <iframe
                      key={`dish-video-youtube-${videoInfo.id}`}
                      src={`https://www.youtube.com/embed/${videoInfo.id}${dish.video_autoplay !== false ? '?autoplay=1' : ''}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <iframe
                      key={`dish-video-vimeo-${videoInfo.id}`}
                      src={`https://player.vimeo.com/video/${videoInfo.id}${dish.video_autoplay !== false ? '?autoplay=1' : ''}`}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : dish.image ? (
                <div className="relative w-full h-full">
                  <img src={dish.image} alt={dish.name} className="w-full h-full object-cover object-center" />
                  {videoInfo && (
                    <button
                      onClick={() => setShowVideo(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 md:bg-black/30 hover:bg-black/50 md:hover:bg-black/40 transition-colors group"
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg md:shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 md:w-10 md:h-10 ml-1" style={{ color: primaryColor }} fill={primaryColor} />
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground text-xs md:text-base">Sem imagem</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 pointer-events-none">
                <h2 className="text-primary-foreground text-lg md:text-2xl font-bold mb-0.5 md:mb-1 drop-shadow-lg">{dish.name}</h2>
                {dish.description && (
                  <p className="text-foreground text-xs md:text-sm line-clamp-1 md:line-clamp-none drop-shadow-md">{dish.description}</p>
                )}
              </div>
              {/* BotÃ£o X mobile: fecha vÃ­deo ou modal */}
              {!mobileFullScreen && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (showVideo) {
                      setShowVideo(false);
                    } else {
                      onClose();
                    }
                  }}
                  className="absolute top-2 right-2 md:hidden p-2.5 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm z-50 active:scale-95 transition-all touch-manipulation"
                  aria-label={showVideo ? "Voltar" : "Fechar"}
                >
                  <X className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
                </button>
              )}
              {/* BotÃ£o Voltar (fechar vÃ­deo) no desktop */}
              {showVideo && (
                <button
                  onClick={() => setShowVideo(false)}
                  className="absolute top-4 right-4 hidden md:flex p-2 bg-black/60 hover:bg-black/80 rounded-full backdrop-blur-sm z-10 transition-colors items-center justify-center"
                  aria-label="Voltar"
                >
                  <X className="w-5 h-5 text-primary-foreground" />
                </button>
              )}
            </motion.div>

            {/* Right - Options */}
            <div className="flex-1 flex flex-col min-h-0">
              <button 
                onClick={onClose} 
                className="hidden md:block absolute top-4 right-4 p-2 rounded-full z-10 hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

              <div
                ref={optionsScrollRef}
                onScroll={handleOptionsScroll}
                className="flex-1 overflow-y-auto p-3 md:p-5 pt-3 md:pt-12"
              >
                {dishComplementGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Este prato nÃ£o possui complementos</p>
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
                            <h3 className="font-semibold text-sm md:text-base text-foreground">
                              {group.name}
                              {linkedGroup?.is_required && <span className="text-red-500 ml-1">*</span>}
                            </h3>
                            <div className="flex gap-1.5">
                              <Badge variant="outline" className={`text-xs ${linkedGroup?.is_required ? 'border-red-300 text-red-600 dark:border-red-500 dark:text-red-400 lg:bg-red-50 lg:dark:bg-red-900/20 lg:font-semibold' : 'border-border text-muted-foreground dark:border-border dark:text-muted-foreground'}`}>
                                {linkedGroup?.is_required ? 'ObrigatÃ³rio' : 'Opcional'}
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
                                    : "border-border hover:bg-muted"
                                )}
                                style={isSelected(group, option) ? { borderColor: primaryColor } : {}}
                              >
                                {/* âœ… IMAGEM DO COMPLEMENTO */}
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
                                    <div className="w-full h-full bg-muted dark:bg-muted flex items-center justify-center text-muted-foreground text-xs" style={{ display: 'none' }}>
                                      ðŸ½ï¸
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-muted/50 dark:bg-muted flex items-center justify-center flex-shrink-0 border-2" style={{ borderColor: isSelected(group, option) ? primaryColor : 'transparent' }}>
                                    <span className="text-muted-foreground text-lg">ðŸ½ï¸</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div 
                                    className={cn(
                                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                      isSelected(group, option) ? "border-transparent" : "border-border"
                                    )}
                                    style={isSelected(group, option) ? { backgroundColor: primaryColor } : {}}
                                  >
                                    {isSelected(group, option) && <Check className="w-3 h-3 text-primary-foreground" />}
                                  </div>
                                  <span className="font-medium text-sm truncate text-foreground">{option.name}</span>
                                </div>
                                {option.price > 0 && (
                                  <span className="font-semibold text-sm flex-shrink-0 text-muted-foreground">
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

              {/* Footer Compacto - lg: sticky visual no rodapÃ© */}
              <motion.div 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="border-t p-3 flex-shrink-0 bg-card border-border shadow-lg lg:shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-muted-foreground">Total</span>
                  <span className="text-xl md:text-2xl font-bold text-foreground" style={{ color: primaryColor }}>
                    {formatCurrency(currentTotal)}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={!canAddToCart()}
                  className="w-full h-11 rounded-xl text-primary-foreground font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95"
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
