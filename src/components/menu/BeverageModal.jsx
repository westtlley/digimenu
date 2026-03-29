import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Coffee,
  GlassWater,
  Leaf,
  Minus,
  Package,
  Plus,
  Thermometer,
  ThermometerSnowflake,
  Wine,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';

export default function BeverageModal({
  beverage,
  isOpen,
  onClose,
  onBack = null,
  onAddToCart,
  primaryColor = '#f97316',
  mobileFullScreen = false,
}) {
  const { t } = useLanguage();
  const beverageModalText = t('beverageModal');
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

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const handleAddToCart = () => {
    onAddToCart({
      id: beverage.id,
      dish: beverage,
      quantity,
      observations,
      unitPrice: beverage.price,
      totalPrice: beverage.price,
    });
    onClose();
    setQuantity(1);
    setObservations('');
  };

  const getTempLabel = () => {
    if (beverage.serving_temp === 'cold') return beverageModalText.temperatureLabels.cold;
    if (beverage.serving_temp === 'hot') return beverageModalText.temperatureLabels.hot;
    if (beverage.serving_temp === 'room') return beverageModalText.temperatureLabels.room;
    return null;
  };

  const getTempIcon = () => {
    if (beverage.serving_temp === 'cold') return <ThermometerSnowflake className="w-4 h-4 text-blue-500" />;
    if (beverage.serving_temp === 'hot') return <Thermometer className="w-4 h-4 text-orange-500" />;
    return <GlassWater className="w-4 h-4 text-muted-foreground" />;
  };

  const characteristics = [];
  if (beverage.sugar_free) {
    characteristics.push({
      label: beverageModalText.characteristicsLabels.sugarFree,
      icon: <Leaf className="w-4 h-4" />,
      color: 'text-green-600',
    });
  }
  if (beverage.alcoholic) {
    characteristics.push({
      label: beverageModalText.characteristicsLabels.alcoholic,
      icon: <Wine className="w-4 h-4" />,
      color: 'text-purple-600',
    });
  }
  if (beverage.caffeine) {
    characteristics.push({
      label: beverageModalText.characteristicsLabels.caffeine,
      icon: <Coffee className="w-4 h-4" />,
      color: 'text-amber-600',
    });
  }

  const dietaryTags = beverage.dietary_tags || [];
  const dietaryLabels = beverageModalText.dietaryLabels;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <DialogContent
        className={mobileFullScreen
          ? "z-[70] w-screen max-w-none h-[100dvh] max-h-[100dvh] rounded-none border-none p-0 overflow-hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] [&>:last-child]:hidden"
          : "z-[70] w-full max-w-5xl lg:max-w-[1100px] h-[85vh] max-h-[85vh] p-0 overflow-hidden border-none rounded-3xl flex flex-col md:flex-row [&>:last-child]:hidden"}
        aria-describedby="beverage-modal-desc"
      >
        <DialogTitle className="sr-only">{beverageModalText.dialogTitle(beverage.name)}</DialogTitle>
        <DialogDescription id="beverage-modal-desc" className="sr-only">
          {beverageModalText.dialogDescription}
        </DialogDescription>
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
              aria-label={beverageModalText.dialogTitle(beverage.name || '')}
            >
              {mobileFullScreen && (
                <div className="flex items-center justify-between border-b border-border px-3 py-3">
                  <button
                    onClick={onBack || onClose}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label={beverageModalText.back}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 px-2 text-center">
                    <p className="text-xs text-muted-foreground">{beverageModalText.detailsTitle}</p>
                    <p className="text-sm font-semibold text-foreground truncate">{beverage?.name}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label={beverageModalText.close}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {!mobileFullScreen && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full z-10 hover:bg-muted transition-colors"
                  aria-label={beverageModalText.close}
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              )}

              <div className="relative w-full aspect-[9/16] md:aspect-auto md:h-full md:w-2/5 lg:w-[45%] flex-shrink-0 max-h-[28vh] md:max-h-none bg-card">
                {beverage.image ? (
                  <img
                    src={beverage.image}
                    alt={beverage.name}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Wine className="w-16 h-16 md:w-24 md:h-24 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6">
                  <h2 className="text-lg md:text-2xl font-bold text-primary-foreground drop-shadow-lg">
                    {beverage.name}
                  </h2>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-card overflow-hidden">
                <div className={`flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 pt-3 space-y-4 ${mobileFullScreen ? '' : 'md:pt-12'}`}>
                  {beverage.description && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">{beverageModalText.description}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{beverage.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 md:gap-3 w-full max-w-full">
                    {beverage.volume_ml && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-border bg-muted/80 min-w-0 overflow-hidden">
                        <Package className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-muted-foreground">{beverageModalText.volume}</p>
                          <p className="font-semibold text-sm truncate text-foreground">{beverage.volume_ml}ml</p>
                        </div>
                      </div>
                    )}
                    {beverage.serving_temp && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-border bg-muted/80 min-w-0 overflow-hidden">
                        <span className="shrink-0">{getTempIcon()}</span>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-muted-foreground">{beverageModalText.temperature}</p>
                          <p className="font-semibold text-sm truncate text-foreground">{getTempLabel()}</p>
                        </div>
                      </div>
                    )}
                    {beverage.beverage_type && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-border bg-muted/80 min-w-0 overflow-hidden">
                        {beverage.beverage_type === 'natural' ? (
                          <GlassWater className="w-5 h-5 text-green-600 shrink-0" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-muted-foreground">{beverageModalText.type}</p>
                          <p className="font-semibold text-sm truncate text-foreground">
                            {beverage.beverage_type === 'natural'
                              ? beverageModalText.typeLabels.natural
                              : beverageModalText.typeLabels.industrialized}
                          </p>
                        </div>
                      </div>
                    )}
                    {beverage.ean && (
                      <div className="flex items-center gap-2 p-2.5 md:p-3 rounded-lg border border-border bg-muted/80 min-w-0 overflow-hidden">
                        <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs text-muted-foreground">{beverageModalText.code}</p>
                          <p className="font-semibold text-xs font-mono truncate text-foreground">{beverage.ean}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {characteristics.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">{beverageModalText.characteristics}</h3>
                      <div className="flex flex-wrap gap-2">
                        {characteristics.map((characteristic, index) => (
                          <Badge
                            key={`${characteristic.label}-${index}`}
                            variant="outline"
                            className={`${characteristic.color} border-current flex items-center gap-1.5 px-3 py-1.5`}
                          >
                            {characteristic.icon}
                            {characteristic.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {dietaryTags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">{beverageModalText.dietaryInformation}</h3>
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
                    <h3 className="font-semibold mb-2 text-sm">{beverageModalText.observationsOptional}</h3>
                    <Textarea
                      placeholder={beverageModalText.observationsPlaceholder}
                      value={observations}
                      onChange={(event) => setObservations(event.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>

                <div className="border-t p-3 flex flex-col gap-3 flex-shrink-0 bg-card border-border shadow-lg lg:shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-muted-foreground">{beverageModalText.quantity}</span>
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
                      <p className="text-sm text-muted-foreground">{beverageModalText.total}</p>
                      <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                        {formatCurrency(beverage.price * quantity)}
                      </p>
                    </div>
                    <Button
                      onClick={handleAddToCart}
                      className="h-11 px-8 rounded-xl font-semibold text-sm text-primary-foreground shadow-lg flex-1 sm:flex-initial"
                      size="lg"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, #ef4444)` }}
                    >
                      <Wine className="w-5 h-5 mr-2" />
                      {beverageModalText.add}
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
