import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function NewDishModal({ 
  isOpen, onClose, dish, complementGroups, onAddToCart, editingItem,
  darkMode = false, primaryColor = '#f97316'
}) {
  const [selections, setSelections] = useState({});
  const [currentTotal, setCurrentTotal] = useState(0);

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
            className={`relative flex flex-col md:flex-row w-full md:m-auto md:max-w-5xl md:h-[85vh] ${darkMode ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-xl md:rounded-3xl overflow-hidden shadow-2xl`}
          >
            {/* Mobile Image Header - Compacto */}
            <div className="md:hidden relative w-full h-36 flex-shrink-0">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className="text-gray-400 text-xs">Sem imagem</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h2 className="text-white text-lg font-bold mb-0.5">{dish.name}</h2>
                {dish.description && (
                  <p className="text-gray-200 text-xs line-clamp-1">{dish.description}</p>
                )}
              </div>
              <button onClick={onClose} className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Desktop Left - Image */}
            <div className="hidden md:block w-2/5 relative">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className="text-gray-400">Sem imagem</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-white text-2xl font-bold mb-1">{dish.name}</h2>
                {dish.description && (
                  <p className="text-gray-200 text-sm">{dish.description}</p>
                )}
              </div>
            </div>

            {/* Right - Options */}
            <div className="flex-1 flex flex-col min-h-0">
              <button onClick={onClose} className={`hidden md:block absolute top-4 right-4 p-2 rounded-full z-10 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className={`w-5 h-5 ${darkMode ? 'text-white' : ''}`} />
              </button>

              <div className="flex-1 overflow-y-auto p-3 md:p-5 pt-3 md:pt-12">
                {dishComplementGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Este prato não possui complementos</p>
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
                            <h3 className={`font-semibold text-sm md:text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {group.name}
                              {linkedGroup?.is_required && <span className="text-red-500 ml-1">*</span>}
                            </h3>
                            <div className="flex gap-1.5">
                              <Badge variant="outline" className={`text-xs ${linkedGroup?.is_required ? 'border-red-300 text-red-600' : darkMode ? 'border-gray-600 text-gray-400' : 'text-gray-500'}`}>
                                {linkedGroup?.is_required ? 'Obrigatório' : 'Opcional'}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${darkMode ? 'border-blue-600 text-blue-400' : 'border-blue-200 text-blue-600'}`}>
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
                                    ? darkMode ? "bg-gray-700 border-opacity-80" : "bg-orange-50 border-orange-300"
                                    : darkMode ? "border-gray-700 hover:bg-gray-700/50" : "border-gray-200 hover:bg-gray-50"
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
                                      isSelected(group, option) ? "border-transparent" : darkMode ? "border-gray-600" : "border-gray-300"
                                    )}
                                    style={isSelected(group, option) ? { backgroundColor: primaryColor } : {}}
                                  >
                                    {isSelected(group, option) && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{option.name}</span>
                                </div>
                                {option.price > 0 && (
                                  <span className={`font-semibold text-sm flex-shrink-0 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
                className={`border-t p-3 flex-shrink-0 ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'} backdrop-blur-xl`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</span>
                  <span className="text-xl md:text-2xl font-bold" style={{ color: primaryColor }}>
                    {formatCurrency(currentTotal)}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={!canAddToCart()}
                  className="w-full h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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