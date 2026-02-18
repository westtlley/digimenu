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
      <DialogContent className="max-w-4xl lg:max-w-[1100px] max-h-[90vh] p-0 overflow-hidden flex flex-row">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex w-full min-h-[70vh] max-h-[90vh] flex-col sm:flex-row"
            >
              {/* Coluna esquerda: imagem (no mobile fica em cima) */}
              <div className="relative w-full sm:w-[45%] sm:min-w-[280px] flex-shrink-0 h-64 sm:h-auto sm:min-h-[400px] bg-gray-900">
                {beverage.image ? (
                  <img
                    src={beverage.image}
                    alt={beverage.name}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full min-h-[240px] sm:min-h-[400px] flex items-center justify-center bg-cyan-900/30">
                    <Wine className="w-20 h-20 sm:w-28 sm:h-28 text-cyan-400/70" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                    {beverage.name}
                  </h2>
                  {beverage.description && (
                    <p className="text-sm text-white/90 mt-1 line-clamp-2">{beverage.description}</p>
                  )}
                </div>
              </div>

              {/* Coluna direita: informações e ações */}
              <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Botão fechar no canto superior direito da coluna direita */}
                <div className="flex justify-end p-3 flex-shrink-0">
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
                  {/* Informações principais em cards compactos */}
                  <div className="grid grid-cols-2 gap-3">
                    {beverage.volume_ml && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60">
                        <Package className="w-5 h-5 text-cyan-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Volume</p>
                          <p className="font-semibold text-sm">{beverage.volume_ml}ml</p>
                        </div>
                      </div>
                    )}
                    {beverage.serving_temp && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60">
                        <span className="shrink-0">{getTempIcon()}</span>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Temperatura</p>
                          <p className="font-semibold text-sm">{getTempLabel()}</p>
                        </div>
                      </div>
                    )}
                    {beverage.beverage_type && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60">
                        {beverage.beverage_type === 'natural' ? (
                          <Droplets className="w-5 h-5 text-green-600 shrink-0" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Tipo</p>
                          <p className="font-semibold text-sm">
                            {beverage.beverage_type === 'natural' ? 'Natural' : 'Industrializado'}
                          </p>
                        </div>
                      </div>
                    )}
                    {beverage.ean && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60">
                        <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Código</p>
                          <p className="font-semibold text-xs font-mono truncate">{beverage.ean}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {characteristics.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Características</h3>
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

                  {dietaryTags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Informações dietéticas</h3>
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

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Observações (opcional)</h3>
                    <Textarea
                      placeholder="Ex: Sem gelo, bem gelado..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Quantidade</h3>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-xl font-bold w-10 text-center">{quantity}</span>
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

                {/* Rodapé: total + botão Adicionar - lg: sticky visual */}
                <div className="border-t p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-muted/30 lg:shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(beverage.price * quantity)}
                    </p>
                  </div>
                  <Button
                    onClick={handleAddToCart}
                    className="min-h-12 px-8 font-semibold"
                    size="lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Wine className="w-5 h-5 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
