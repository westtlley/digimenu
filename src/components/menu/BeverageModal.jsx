import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Minus, Wine, Droplets, Package, ThermometerSnowflake, Thermometer, Leaf, Coffee, GlassWater } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal customizado para bebidas
 * Exibe informações específicas ao invés de complementos
 */
export default function BeverageModal({ 
  beverage, 
  isOpen, 
  onClose, 
  onAddToCart,
  primaryColor = '#06b6d4'
}) {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');

  if (!beverage) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const handleAddToCart = () => {
    onAddToCart({
      id: beverage.id,
      dish: beverage,
      quantity,
      observations,
      totalPrice: beverage.price * quantity
    });
    onClose();
    setQuantity(1);
    setObservations('');
  };

  const getTempLabel = () => {
    if (beverage.serving_temp === 'cold') return 'Gelado';
    if (beverage.serving_temp === 'hot') return 'Quente';
    if (beverage.serving_temp === 'room') return 'Ambiente';
    return null;
  };

  const getTempIcon = () => {
    if (beverage.serving_temp === 'cold') return <ThermometerSnowflake className="w-4 h-4 text-blue-500" />;
    if (beverage.serving_temp === 'hot') return <Thermometer className="w-4 h-4 text-orange-500" />;
    return <GlassWater className="w-4 h-4 text-gray-500" />;
  };

  const characteristics = [];
  if (beverage.sugar_free) characteristics.push({ label: 'Sem açúcar', icon: <Leaf className="w-4 h-4" />, color: 'text-green-600' });
  if (beverage.alcoholic) characteristics.push({ label: 'Alcoólico', icon: <Wine className="w-4 h-4" />, color: 'text-purple-600' });
  if (beverage.caffeine) characteristics.push({ label: 'Cafeína', icon: <Coffee className="w-4 h-4" />, color: 'text-brown-600' });
  
  const dietaryTags = beverage.dietary_tags || [];
  const dietaryLabels = {
    'vegano': 'Vegano',
    'sem_lactose': 'Sem lactose',
    'sem_gluten': 'Sem glúten',
    'zero_acucar': 'Zero açúcar'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              {/* Header com Imagem */}
              <div className="relative h-64 bg-cyan-50 dark:bg-cyan-900/20">
                {beverage.image ? (
                  <img 
                    src={beverage.image} 
                    alt={beverage.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Wine className="w-24 h-24 text-cyan-400" />
                  </div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Botão fechar */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center hover:bg-white transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Nome da bebida */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-2xl font-bold text-white mb-2">{beverage.name}</h2>
                  {beverage.description && (
                    <p className="text-sm text-white/90">{beverage.description}</p>
                  )}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Informações Principais */}
                <div className="grid grid-cols-2 gap-3">
                  {beverage.volume_ml && (
                    <div className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                      <Package className="w-5 h-5 text-cyan-600" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Volume</p>
                        <p className="font-semibold text-sm">{beverage.volume_ml}ml</p>
                      </div>
                    </div>
                  )}

                  {beverage.serving_temp && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      {getTempIcon()}
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Temperatura</p>
                        <p className="font-semibold text-sm">{getTempLabel()}</p>
                      </div>
                    </div>
                  )}

                  {beverage.beverage_type && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      {beverage.beverage_type === 'natural' ? 
                        <Droplets className="w-5 h-5 text-green-600" /> : 
                        <Package className="w-5 h-5 text-gray-600" />
                      }
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Tipo</p>
                        <p className="font-semibold text-sm">
                          {beverage.beverage_type === 'natural' ? 'Natural' : 'Industrializado'}
                        </p>
                      </div>
                    </div>
                  )}

                  {beverage.ean && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Package className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Código</p>
                        <p className="font-semibold text-xs font-mono">{beverage.ean}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Características */}
                {characteristics.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">Características</h3>
                    <div className="flex flex-wrap gap-2">
                      {characteristics.map((char, idx) => (
                        <Badge 
                          key={idx}
                          variant="outline" 
                          className={`${char.color} border-current flex items-center gap-1.5 px-3 py-1.5`}
                        >
                          {char.icon}
                          {char.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags dietéticas */}
                {dietaryTags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-sm">Informações Dietéticas</h3>
                    <div className="flex flex-wrap gap-2">
                      {dietaryTags.map((tag) => (
                        <Badge 
                          key={tag}
                          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                          ✓ {dietaryLabels[tag] || tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observações */}
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Observações (opcional)</h3>
                  <Textarea
                    placeholder="Ex: Sem gelo, bem gelado, etc..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Quantidade */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Quantidade</h3>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Footer com preço e botão */}
              <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatCurrency(beverage.price * quantity)}
                  </p>
                </div>
                <Button
                  onClick={handleAddToCart}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-8"
                  size="lg"
                >
                  <Wine className="w-5 h-5 mr-2" />
                  Adicionar ao carrinho
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
