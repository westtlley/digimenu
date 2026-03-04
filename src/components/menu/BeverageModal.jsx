import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Minus, Wine, Droplets, Package, ThermometerSnowflake, Thermometer, Leaf, Coffee, GlassWater, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal customizado para bebidas
 * Exibe informações específicas ao invés de complementos
 */
export default function BeverageModal({ 
  beverage, 
  isOpen, 
  onClose, 
  onBack = null,
  onAddToCart,
  primaryColor = '#f97316',
  mobileFullScreen = false
}) {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

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
  if (beverage.caffeine) characteristics.push({ label: 'Cafeína', icon: <Coffee className="w-4 h-4" />, color: 'text-amber-600' });
  
  const dietaryTags = beverage.dietary_tags || [];
  const dietaryLabels = {
    'vegano': 'Vegano',
    'sem_lactose': 'Sem lactose',
    'sem_gluten': 'Sem glúten',
    'zero_acucar': 'Zero açúcar'
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
        <DialogContent
        className={mobileFullScreen
          ? "w-screen max-w-none h-[100dvh] max-h-[100dvh] rounded-none border-none p-0 overflow-hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] [&>:last-child]:hidden"
          : "w-full max-w-5xl lg:max-w-[1100px] h-[85vh] max-h-[85vh] p-0 overflow-hidden border-none rounded-3xl flex flex-col md:flex-row [&>:last-child]:hidden"
        }
        aria-describedby="beverage-modal-desc"
      >
        <DialogTitle className="sr-only">Detalhes da bebida: {beverage.name}</DialogTitle>
        <DialogDescription id="beverage-modal-desc" className="sr-only">Adicione quantidade e observações para incluir no pedido.</DialogDescription>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className={`relative flex w-full h-full min-h-0 overflow-hidden ${mobileFullScreen ? 'flex-col' : 'flex-col md:flex-row'}`}
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`Detalhes da bebida ${beverage.name || ''}`}
            >
              {mobileFullScreen && (
                <div className="flex items-center justify-between border-b border-border px-3 py-3">
                  <button
                    onClick={onBack || onClose}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Voltar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 px-2 text-center">
                    <p className="text-xs text-muted-foreground">Detalhes da bebida</p>
                    <p className="text-sm font-semibold text-foreground truncate">{beverage?.name}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* X no canto superior direito do modal inteiro */}
              {!mobileFullScreen && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full z-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
              )}

              {/* Coluna esquerda: imagem — mobile limite menor ~28vh (proporção 9:16) */}
              <div className="relative w-full aspect-[9/16] md:aspect-auto md:h-full md:w-2/5 lg:w-[45%] flex-shrink-0 max-h-[28vh] md:max-h-none bg-gray-900">
                {beverage.image ? (
                  <img
                    src={beverage.image}
                    alt={beverage.name}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <Wine className="w-16 h-16 md:w-24 md:h-24 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6">
                  <h2 className="text-lg md:text-2xl font-bold text-white drop-shadow-lg">
                    {beverage.name}
                  </h2>
                </div>
              </div>

              {/* Coluna direita: informações e ações — padding para campo completo na tela */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-gray-900 overflow-hidden">
                <div className={`flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 pt-3 space-y-4 ${mobileFullScreen ? '' : 'md:pt-12'}`}>
                  {/* 1. Descrição primeiro (se houver) */}
                  {beverage.description && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Descrição</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{beverage.description}</p>
                    </div>
                  )}
                  {/* 2. Outras informações */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3 w-full max-w-full">
                    {beverage.volume_ml && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 min-w-0 overflow-hidden">
                        <Package className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
                          <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{beverage.volume_ml}ml</p>
                        </div>
                      </div>
                    )}
                    {beverage.serving_temp && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 min-w-0 overflow-hidden">
                        <span className="shrink-0">{getTempIcon()}</span>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Temperatura</p>
                          <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{getTempLabel()}</p>
                        </div>
                      </div>
                    )}
                    {beverage.beverage_type && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 min-w-0 overflow-hidden">
                        {beverage.beverage_type === 'natural' ? (
                          <Droplets className="w-5 h-5 text-green-600 shrink-0" />
                        ) : (
                          <Package className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                        )}
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
                          <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                            {beverage.beverage_type === 'natural' ? 'Natural' : 'Industrializado'}
                          </p>
                        </div>
                      </div>
                    )}
                    {beverage.ean && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 min-w-0 overflow-hidden">
                        <Package className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                          <p className="font-semibold text-xs font-mono truncate text-gray-900 dark:text-gray-100">{beverage.ean}</p>
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
                </div>

                {/* Rodapé fixo: Quantidade + Total + botão Adicionar */}
                <div className="border-t p-3 flex flex-col gap-3 flex-shrink-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg lg:shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Quantidade</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-xl font-bold w-10 text-center min-w-[2.5rem]">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                        {formatCurrency(beverage.price * quantity)}
                      </p>
                    </div>
                    <Button
                      onClick={handleAddToCart}
                      className="h-11 px-8 rounded-xl font-semibold text-sm text-white shadow-lg flex-1 sm:flex-initial"
                      size="lg"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, #ef4444)` }}
                    >
                      <Wine className="w-5 h-5 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
