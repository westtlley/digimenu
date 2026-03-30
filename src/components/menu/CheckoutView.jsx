import React, { useState } from 'react';
import { ArrowLeft, Store, Bike, Ticket, X, Calendar, Clock as ClockIcon, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import AddressMapPicker from './AddressMapPicker';
import OrderConfirmationModal from './OrderConfirmationModal';
import SavedAddresses from './SavedAddresses';
import LoyaltyPointsDisplay from './LoyaltyPointsDisplay';
import { useLoyalty } from '@/hooks/useLoyalty';
import { orderService } from '@/components/services/orderService';
import { buscarCEP } from '@/utils/cepService';
import { Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { calculateCartSubtotal } from '@/utils/cartPricing';
import { useLanguage } from '@/i18n/LanguageContext';

const DEFAULT_CUSTOMER = {
  name: '',
  phone: '',
  deliveryMethod: 'pickup',
  address_street: '',
  address_number: '',
  address_complement: '',
  address: '',
  paymentMethod: '',
  neighborhood: '',
  cep: '',
  city: '',
  state: '',
  latitude: null,
  longitude: null,
  scheduled_date: '',
  scheduled_time: '',
  needs_change: false,
  change_amount: null
};

export default function CheckoutView({ 
  cart, 
  customer: customerProp, 
  setCustomer: setCustomerProp, 
  onBack, 
  onSendWhatsApp,
  onSubmit,
  onGeneratePDF,
  couponCode = '',
  setCouponCode = () => {},
  appliedCoupon = null,
  couponError = '',
  onApplyCoupon = () => {},
  onRemoveCoupon = () => {},
  deliveryZones = [],
  store,
  loyaltyConfigs = [],
  primaryColor = '#f97316',
  isTableOrder = false, // Indica se é pedido de mesa
  userEmail = null,
  slug = null,
  checkoutSuggestion = null,
  checkoutNudge = null,
  onCheckoutSuggestion = () => {},
  isSubmitting = false,
}) {
  const { t } = useLanguage();
  const checkoutText = t('checkout');
  const paymentMethodsText = t('paymentModal.methods');
  const customer = customerProp ?? DEFAULT_CUSTOMER;
  const setCustomer = setCustomerProp ?? (() => {});
  const [showSchedule, setShowSchedule] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [tipType, setTipType] = useState('none'); // none, percent, fixed
  const [tipValue, setTipValue] = useState('');

  const formatPhoneMask = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };
  const normalizeNeighborhood = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const cartTotal = calculateCartSubtotal(cart);

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return cartTotal * appliedCoupon.discount_value / 100;
    }
    return Math.min(appliedCoupon.discount_value, cartTotal);
  };

  const getDeliveryFee = () => {
    if (customer.deliveryMethod !== 'delivery') return 0;
    
    // Usar orderService para calcular taxa (suporta zona e distância)
    return orderService.calculateDeliveryFee(
      customer.deliveryMethod,
      customer.neighborhood,
      deliveryZones,
      store,
      customer.latitude,
      customer.longitude
    );
  };

  // Hook de fidelidade
  const { getDiscount: getLoyaltyDiscount } = useLoyalty(
    customer.phone?.replace(/\D/g, ''),
    userEmail,
    slug
  );

  const loyaltyConfig = (Array.isArray(loyaltyConfigs) && loyaltyConfigs[0])
    ? loyaltyConfigs[0]
    : null;
  const isLoyaltyActive = loyaltyConfig?.is_active === true;

  const couponDiscount = calculateDiscount();
  const loyaltyDiscountPercent = isLoyaltyActive ? getLoyaltyDiscount() : 0;
  const loyaltyDiscountAmount = cartTotal * (loyaltyDiscountPercent / 100);
  const totalDiscount = couponDiscount + loyaltyDiscountAmount;
  const deliveryFee = getDeliveryFee();
  const getMinimumOrderValue = () => {
    const storeMin = Number(
      store?.min_order_value ??
      store?.min_order ??
      store?.min_order_price ??
      store?.delivery_min_order ??
      0
    ) || 0;

    if (customer.deliveryMethod !== 'delivery') return storeMin;

    const neighborhoodKey = normalizeNeighborhood(customer.neighborhood);
    const zone = (deliveryZones || []).find(
      (z) => normalizeNeighborhood(z?.neighborhood) === neighborhoodKey && z?.is_active
    );
    const zoneMin = Number(zone?.min_order ?? zone?.min_order_value ?? 0) || 0;

    return Math.max(storeMin, zoneMin);
  };
  const minimumOrderValue = getMinimumOrderValue();
  const isBelowMinimumOrder = minimumOrderValue > 0 && cartTotal < minimumOrderValue;
  
  // Calcular gorjeta (apenas para mesas)
  const tipAmount = isTableOrder && tipType !== 'none' 
    ? (tipType === 'percent' 
        ? cartTotal * (parseFloat(tipValue || 0) / 100)
        : parseFloat(tipValue || 0))
    : 0;
  
  const total = cartTotal - totalDiscount + deliveryFee + tipAmount;

  const isFormValid = () => {
    const basicValid = customer.name && customer.phone && customer.paymentMethod &&
      (customer.deliveryMethod === 'pickup' || (customer.deliveryMethod === 'delivery' && customer.address_street && customer.address_number && customer.neighborhood));
    
    if (!basicValid) return false;
    
    // Se for agendamento, validar data e horário
    if (showSchedule) {
      if (!customer.scheduled_date || !customer.scheduled_time) return false;
    }
    
    // Se for dinheiro com troco, validar valor
    if (customer.paymentMethod === 'dinheiro' && customer.needs_change) {
      if (!customer.change_amount || customer.change_amount <= total) return false;
    }
    
    return true;
  };

  const checkoutSteps = [
    { id: 1, label: checkoutText.steps.cart, done: cart.length > 0 },
    { id: 2, label: checkoutText.steps.customer, done: Boolean(customer.name && customer.phone) },
    {
      id: 3,
      label: checkoutText.steps.address,
      done: customer.deliveryMethod === 'pickup' || Boolean(customer.address_street && customer.address_number && customer.neighborhood)
    },
    { id: 4, label: checkoutText.steps.payment, done: Boolean(customer.paymentMethod) },
    { id: 5, label: checkoutText.steps.confirm, done: isFormValid() }
  ];

  const nextStep = checkoutSteps.find((step) => !step.done)?.id || 5;
  const handleBackdropClick = () => {
    if (showMapPicker) return;
    onBack?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-stretch md:justify-end justify-center p-0"
        onClick={handleBackdropClick}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card md:rounded-none rounded-none shadow-2xl w-full md:w-[400px] max-w-none md:max-w-none h-[100dvh] md:h-full max-h-[100dvh] md:max-h-none overflow-hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{checkoutText.title}</h2>
            </div>
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted/50">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <section className="bg-muted/30 rounded-xl p-3 border border-border/70">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                {checkoutSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 min-w-fit">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        step.done
                          ? 'text-white'
                          : nextStep === step.id
                            ? 'bg-primary/15 text-primary border border-primary/40'
                            : 'bg-muted text-muted-foreground'
                      }`}
                      style={step.done ? { backgroundColor: primaryColor } : undefined}
                    >
                      {step.id}
                    </div>
                    <span className={`text-xs font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {checkoutText.flowHint}
              </p>
            </section>

            {/* Dados do Cliente */}
            <section className="bg-muted/40 rounded-xl p-4">
              <h2 className="font-bold text-sm mb-3">{checkoutText.customerSectionTitle}</h2>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-xs text-muted-foreground">{checkoutText.customerName}</Label>
                  <Input
                    id="name"
                    placeholder={checkoutText.customerNamePlaceholder}
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="mt-1 h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">{checkoutText.customerPhone}</Label>
                  <Input
                    id="phone"
                    placeholder={checkoutText.customerPhonePlaceholder}
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: formatPhoneMask(e.target.value) })}
                    className="mt-1 h-10"
                    maxLength={15}
                  />
                </div>
              </div>
            </section>

            {/* Forma de Recebimento */}
            <section className="bg-muted/40 rounded-xl p-4">
              <h2 className="font-bold text-sm mb-3">{checkoutText.deliverySectionTitle}</h2>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCustomer({ ...customer, deliveryMethod: 'pickup' })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    customer.deliveryMethod === 'pickup'
                      ? 'border-green-500 bg-green-50'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <Store className="w-5 h-5" style={{ color: customer.deliveryMethod === 'pickup' ? '#22c55e' : '#9ca3af' }} />
                  <span className={`font-medium text-xs ${customer.deliveryMethod === 'pickup' ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {checkoutText.pickup}
                  </span>
                </button>

                <button
                  onClick={() => setCustomer({ ...customer, deliveryMethod: 'delivery' })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    customer.deliveryMethod === 'delivery'
                      ? 'border-green-500 bg-green-50'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <Bike className="w-5 h-5" style={{ color: customer.deliveryMethod === 'delivery' ? '#22c55e' : '#9ca3af' }} />
                  <span className={`font-medium text-xs ${customer.deliveryMethod === 'delivery' ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {checkoutText.delivery}
                  </span>
                </button>
              </div>

              {customer.deliveryMethod === 'delivery' && (
                <div className="mt-3 space-y-2">
                  {/* Endereços Salvos */}
                  <SavedAddresses 
                    customer={customer}
                    setCustomer={setCustomer}
                    darkMode={false}
                    slug={slug}
                    userEmail={userEmail}
                    deliveryMode={store?.delivery_fee_mode || 'zone'}
                  />
                  
                  <Button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    variant="outline"
                    className="w-full mb-2 border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
                  >
                    <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                    {customer.latitude ? checkoutText.mapChange : checkoutText.mapSelect}
                  </Button>

                  {customer.latitude && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                      <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        ✓ {checkoutText.locationSaved}
                      </p>
                    </div>
                  )}

                  {/* Campo CEP */}
                  <div>
                    <Label htmlFor="cep" className="text-xs text-muted-foreground flex items-center gap-1">
                      CEP *
                      <span className="text-[10px] text-muted-foreground">{checkoutText.autoFillHint}</span>
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="cep"
                        placeholder={checkoutText.zipPlaceholder}
                        value={customer.cep || ''}
                        onChange={(e) => {
                          const cleanCEP = e.target.value.replace(/\D/g, '');
                          const formatted = cleanCEP.length <= 8 
                            ? cleanCEP.replace(/(\d{5})(\d)/, '$1-$2')
                            : customer.cep || '';
                          setCustomer({ ...customer, cep: formatted });
                        }}
                        onBlur={async () => {
                          const cleanCEP = (customer.cep || '').replace(/\D/g, '');
                          if (cleanCEP.length === 8) {
                            setLoadingCEP(true);
                            try {
                              const endereco = await buscarCEP(cleanCEP);
                              setCustomer({
                                ...customer,
                                cep: endereco.cep || customer.cep,
                                address_street: endereco.logradouro || customer.address_street || '',
                                neighborhood: endereco.bairro || customer.neighborhood || '',
                                // Não preencher complemento com o retorno do CEP (ex: "até 899/900") — fica a critério do cliente
                                city: endereco.cidade || customer.city || '',
                                state: endereco.estado || customer.state || '',
                              });
                              toast.success(checkoutText.addressAutofillSuccess);
                            } catch (error) {
                              console.error('Erro ao buscar CEP:', error);
                              toast.error(checkoutText.zipNotFound);
                            } finally {
                              setLoadingCEP(false);
                            }
                          }
                        }}
                        maxLength={9}
                        className="mt-1 h-10 pl-9 pr-8"
                        disabled={loadingCEP}
                        required
                      />
                      {loadingCEP && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-500" />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address_street" className="text-xs text-muted-foreground">{checkoutText.streetLabel}</Label>
                    <Input
                      id="address_street"
                      placeholder={checkoutText.streetPlaceholder}
                      value={customer.address_street || ''}
                      onChange={(e) => setCustomer({ ...customer, address_street: e.target.value })}
                      className="mt-1 h-10"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="address_number" className="text-xs text-muted-foreground">{checkoutText.numberLabel}</Label>
                      <Input
                        id="address_number"
                        placeholder="123"
                        value={customer.address_number || ''}
                        onChange={(e) => setCustomer({ ...customer, address_number: e.target.value })}
                        className="mt-1 h-10"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address_complement" className="text-xs text-muted-foreground">{checkoutText.complementLabel}</Label>
                      <Input
                        id="address_complement"
                        placeholder={checkoutText.complementPlaceholder}
                        value={customer.address_complement || ''}
                        onChange={(e) => setCustomer({ ...customer, address_complement: e.target.value })}
                        className="mt-1 h-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="neighborhood" className="text-xs text-muted-foreground">
                      {checkoutText.neighborhoodLabel}
                    </Label>
                    <Input
                      id="neighborhood"
                      placeholder={checkoutText.neighborhoodPlaceholder}
                      value={customer.neighborhood}
                      onChange={(e) => setCustomer({ ...customer, neighborhood: e.target.value })}
                      className="mt-1 h-10"
                      required
                    />
                    {customer.neighborhood && (
                      (() => {
                        // Se for cálculo por distância e tem coordenadas
                        if (store?.delivery_fee_mode === 'distance' && customer.latitude && customer.longitude) {
                          const fee = getDeliveryFee();
                          if (fee > 0) {
                            return (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ {checkoutText.distanceFeeCalculated(formatCurrency(fee))}
                              </p>
                            );
                          }
                        } else if (deliveryZones.length > 0) {
                          // Cálculo por zona
                          const zone = deliveryZones.find((z) =>
                            normalizeNeighborhood(z?.neighborhood) === normalizeNeighborhood(customer.neighborhood) && z.is_active
                          );
                          if (zone) {
                            return (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ {checkoutText.zoneFee(formatCurrency(zone.fee))}
                              </p>
                            );
                          } else if (customer.neighborhood.length > 2) {
                            return (
                              <p className="text-xs text-orange-600 mt-1">
                                ⚠️ {checkoutText.zoneNotRegistered}
                              </p>
                            );
                          }
                        }
                        return null;
                      })()
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Forma de Pagamento */}
            <section className="bg-muted/40 rounded-xl p-4">
              <h2 className="font-bold text-sm mb-3">{checkoutText.paymentSectionTitle}</h2>
              
              <Select
                value={customer.paymentMethod}
                onValueChange={(value) => setCustomer({ ...customer, paymentMethod: value, needs_change: false, change_amount: '' })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={checkoutText.paymentPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">{paymentMethodsText.pix}</SelectItem>
                  <SelectItem value="dinheiro">{paymentMethodsText.dinheiro}</SelectItem>
                  <SelectItem value="cartao_credito">{paymentMethodsText.credito}</SelectItem>
                  <SelectItem value="cartao_debito">{paymentMethodsText.debito}</SelectItem>
                </SelectContent>
              </Select>

              {customer.paymentMethod === 'dinheiro' && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="needs_change"
                      checked={customer.needs_change || false}
                      onChange={(e) => setCustomer({ ...customer, needs_change: e.target.checked, change_amount: e.target.checked ? customer.change_amount : '' })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="needs_change" className="text-sm cursor-pointer">
                      {checkoutText.needsChange}
                    </Label>
                  </div>
                  
                  {customer.needs_change && (
                    <div>
                    <Label htmlFor="change_amount" className="text-xs text-muted-foreground">{checkoutText.changeAmountLabel}</Label>
                    <Input
                      id="change_amount"
                      type="number"
                      step="0.01"
                      placeholder={checkoutText.changeAmountPlaceholder}
                      value={customer.change_amount || ''}
                        onChange={(e) => setCustomer({ ...customer, change_amount: e.target.value })}
                        className="mt-1 h-10"
                      />
                      {customer.change_amount && parseFloat(customer.change_amount) > total && (
                        <p className="text-xs text-green-600 mt-1">
                          {checkoutText.changePreview(formatCurrency(parseFloat(customer.change_amount) - total))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Agendamento */}
            <section className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm">{checkoutText.scheduleTitle}</h2>
                <button
                  type="button"
                  onClick={() => setShowSchedule(!showSchedule)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    showSchedule 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {showSchedule ? checkoutText.scheduleActive : checkoutText.schedule}
                </button>
              </div>

              {showSchedule && (
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="scheduled_date" className="text-xs text-muted-foreground">{checkoutText.scheduleDate}</Label>
                    <Input
                      id="scheduled_date"
                      type="date"
                      value={customer.scheduled_date || ''}
                      onChange={(e) => setCustomer({ ...customer, scheduled_date: e.target.value })}
                      className="mt-1 h-10"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduled_time" className="text-xs text-muted-foreground">{checkoutText.scheduleTime}</Label>
                    <Input
                      id="scheduled_time"
                      type="time"
                      value={customer.scheduled_time || ''}
                      onChange={(e) => setCustomer({ ...customer, scheduled_time: e.target.value })}
                      className="mt-1 h-10"
                      min={store.opening_time || '08:00'}
                      max={store.closing_time || '22:00'}
                    />
                    {store.opening_time && store.closing_time && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {checkoutText.businessHours(store.opening_time, store.closing_time)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Solicitar alteração ou adicional (opcional) */}
            <section className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/60">
              <Label htmlFor="customer_change_request" className="text-xs font-medium text-amber-800 flex items-center gap-1">
                ✏️ {checkoutText.orderNotesTitle}
              </Label>
              <p className="text-[10px] text-amber-700/90 mb-1.5">
                {checkoutText.orderNotesHelp}
              </p>
              <Textarea
                id="customer_change_request"
                placeholder={checkoutText.orderNotesPlaceholder}
                value={customer.customer_change_request || ''}
                onChange={(e) => setCustomer({ ...customer, customer_change_request: e.target.value })}
                className="mt-1 min-h-[72px] text-sm resize-none border-amber-200 bg-card"
                maxLength={500}
              />
            </section>

            {/* Cupom */}
            {appliedCoupon && (
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-700">
                    <Ticket className="w-3 h-3 inline mr-1" />
                    {checkoutText.couponApplied(appliedCoupon.code)}
                  </span>
                  <button onClick={onRemoveCoupon} className="text-xs text-red-600 hover:text-red-700 font-medium">
                    {checkoutText.remove}
                  </button>
                </div>
              </div>
            )}

            {!appliedCoupon && (
              <div className="bg-muted/40 rounded-xl p-4">
                <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Ticket className="w-3 h-3" />
                  {checkoutText.couponTitle}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={checkoutText.couponPlaceholder}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 h-10"
                  />
                  <Button onClick={onApplyCoupon} variant="outline" size="sm">
                    {checkoutText.apply}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-600 mt-1">{couponError}</p>
                )}
              </div>
            )}

            {/* Pontos de Fidelidade */}
            {isLoyaltyActive && (customer.phone || userEmail) && (
              <div className="mt-4">
                <LoyaltyPointsDisplay
                  customerPhone={customer.phone?.replace(/\D/g, '')}
                  customerEmail={userEmail}
                  slug={slug}
                  orderTotal={cartTotal}
                  primaryColor={primaryColor}
                />
              </div>
            )}

            {/* Gorjeta (apenas para mesas) */}
            {isTableOrder && (
              <section className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h2 className="font-bold text-sm mb-3">{checkoutText.tipTitle}</h2>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTipType('none');
                        setTipValue('');
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        tipType === 'none'
                          ? 'bg-muted text-foreground'
                          : 'bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {checkoutText.noTip}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipType('percent');
                        setTipValue('10');
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        tipType === 'percent'
                          ? 'bg-purple-500 text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {checkoutText.tipPercent}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipType('fixed');
                        setTipValue('');
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        tipType === 'fixed'
                          ? 'bg-purple-500 text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {checkoutText.fixedValue}
                    </button>
                  </div>

                  {tipType === 'percent' && (
                    <div>
                      <Label htmlFor="tip_percent" className="text-xs text-muted-foreground">{checkoutText.tipPercentLabel}</Label>
                      <div className="flex gap-2 mt-1">
                        {[5, 10, 15, 20].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTipValue(p.toString())}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              tipValue === p.toString()
                                ? 'bg-purple-500 text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                        <Input
                          id="tip_percent"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder={checkoutText.tipOtherPercentPlaceholder}
                          value={tipValue}
                          onChange={(e) => setTipValue(e.target.value)}
                          className="flex-1 h-10"
                        />
                      </div>
                    </div>
                  )}

                  {tipType === 'fixed' && (
                    <div>
                      <Label htmlFor="tip_fixed" className="text-xs text-muted-foreground">{checkoutText.tipFixedLabel}</Label>
                      <Input
                        id="tip_fixed"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={checkoutText.tipFixedPlaceholder}
                        value={tipValue}
                        onChange={(e) => setTipValue(e.target.value)}
                        className="mt-1 h-10"
                      />
                    </div>
                  )}

                  {tipAmount > 0 && (
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <p className="text-sm font-medium text-purple-700">
                        {checkoutText.tipPreview(formatCurrency(tipAmount))}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {checkoutNudge && (
              <section className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-200/70">
                <p className="text-xs font-semibold text-emerald-900">{checkoutText.checkoutNudgeTitle}</p>
                <p className="text-xs text-emerald-800 mt-1">{checkoutNudge}</p>
              </section>
            )}

            {checkoutSuggestion && (
              <section className="bg-amber-50/80 rounded-xl p-4 border border-amber-200/70">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-sm text-amber-900">{checkoutText.checkoutOfferTitle}</h2>
                    <p className="text-xs text-amber-700 mt-1">
                      {checkoutSuggestion?._merchandising?.label || checkoutText.checkoutOfferLabelFallback} • {checkoutText.enjoyBeforeConfirm}
                    </p>
                  </div>
                  {checkoutSuggestion?.original_price > checkoutSuggestion?.price && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-1 rounded-full">
                      -{Math.round(((checkoutSuggestion.original_price - checkoutSuggestion.price) / checkoutSuggestion.original_price) * 100)}%
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {checkoutSuggestion?.image ? (
                      <img src={checkoutSuggestion.image} alt={checkoutSuggestion.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{checkoutText.checkoutOfferFallback}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{checkoutSuggestion?.name}</p>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      {checkoutSuggestion?.original_price > checkoutSuggestion?.price && (
                        <span className="line-through text-muted-foreground">{formatCurrency(checkoutSuggestion.original_price)}</span>
                      )}
                      <span className="font-bold" style={{ color: primaryColor }}>{formatCurrency(checkoutSuggestion?.price)}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="text-white"
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => onCheckoutSuggestion(checkoutSuggestion)}
                  >
                    {checkoutText.view}
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* Footer com Totais e Botão */}
          <div className="border-t p-4 bg-card pb-[calc(env(safe-area-inset-bottom)+1rem)] md:pb-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{checkoutText.subtotal}</span>
                <span className="font-medium">{formatCurrency(cartTotal)}</span>
              </div>
              
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{checkoutText.couponDiscount}</span>
                  <span className="font-medium">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              {loyaltyDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{checkoutText.loyaltyDiscount}</span>
                  <span className="font-medium">-{formatCurrency(loyaltyDiscountAmount)}</span>
                </div>
              )}
              
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{checkoutText.deliveryFee}</span>
                  <span className="font-medium">{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm text-purple-600">
                  <span>{checkoutText.tip}</span>
                  <span className="font-medium">{formatCurrency(tipAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span>{checkoutText.total}</span>
                <span style={{ color: primaryColor }}>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              onClick={() => {
                if (!isSubmitting && isFormValid()) {
                  setShowConfirmationModal(true);
                }
              }}
              disabled={isSubmitting || !isFormValid() || isBelowMinimumOrder || store?.accepting_orders === false || store?.is_open === false}
              className="h-auto min-h-12 w-full whitespace-normal px-4 py-3 text-center leading-snug text-primary-foreground font-bold"
              style={{ backgroundColor: (!isSubmitting && isFormValid() && !isBelowMinimumOrder && store?.accepting_orders !== false && store?.is_open !== false) ? primaryColor : '#d1d5db' }}
            >
              {isSubmitting
                ? checkoutText.submitting
                : store?.is_open === false
                ? checkoutText.storeClosed
                : store?.accepting_orders === false
                ? `⏸️ ${checkoutText.pausedOrders}`
                : isBelowMinimumOrder
                ? checkoutText.minimumOrderToFinish(formatCurrency(minimumOrderValue))
                : checkoutText.submit}
            </Button>
            
            {store?.is_open === false ? (
              <p className="text-xs text-red-600 text-center mt-2">
                {checkoutText.storeClosedNow}
              </p>
            ) : store?.accepting_orders === false ? (
              <p className="text-xs text-orange-600 text-center mt-2">
                {store.pause_message || checkoutText.ordersTemporarilyPaused}
              </p>
            ) : !isFormValid() ? (
              <p className="text-xs text-red-600 text-center mt-2">
                {checkoutText.fillRequiredFields}
              </p>
            ) : isBelowMinimumOrder ? (
              <p className="text-xs text-red-600 text-center mt-2">
                {checkoutText.minimumOrderToFinish(formatCurrency(minimumOrderValue))}
              </p>
            ) : null}
          </div>
        </motion.div>

        {/* Address Map Picker */}
        <AddressMapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialAddress={customer.address_street ? `${customer.address_street}, ${customer.address_number || ''}` : ''}
          initialPosition={customer.latitude && customer.longitude ? { lat: customer.latitude, lng: customer.longitude } : null}
          fallbackCenter={store?.latitude && store?.longitude ? { lat: store.latitude, lng: store.longitude } : null}
          initialCep={customer.cep || ''}
          onConfirm={({ latitude, longitude, addressData }) => {
            setCustomer((currentCustomer) => ({
              ...currentCustomer,
              latitude,
              longitude,
              address_street: addressData?.street || currentCustomer?.address_street || '',
              address_number: addressData?.number || currentCustomer?.address_number || '',
              address_complement: addressData?.complement || currentCustomer?.address_complement || '',
              neighborhood: addressData?.neighborhood || currentCustomer?.neighborhood || '',
              cep: addressData?.cep || currentCustomer?.cep || '',
              city: addressData?.city || currentCustomer?.city || '',
              state: addressData?.state || currentCustomer?.state || '',
              address: addressData?.fullAddress || currentCustomer?.address || '',
            }));
            setShowMapPicker(false);
          }}
        />

        {/* Order Confirmation Modal */}
        <OrderConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            if (!isSubmitting) {
              setShowConfirmationModal(false);
            }
          }}
          onConfirm={async () => {
            if (typeof onSubmit === 'function') {
              await onSubmit({
                customer_name: customer.name,
                customer_phone: customer.phone?.replace(/\D/g, '') || '',
                customer_email: customer.email || userEmail || '',
                observations: customer.observations || '',
                tip: isTableOrder && tipType !== 'none' ? (tipType === 'percent' ? parseFloat(tipValue || 0) : parseFloat(tipValue || 0)) : null,
                total,
                cartTotal,
                discount: totalDiscount,
                deliveryFee,
                appliedCoupon,
                customer
              });
              setShowConfirmationModal(false);
            } else if (typeof onSendWhatsApp === 'function') {
              await onSendWhatsApp();
              setShowConfirmationModal(false);
            }
          }}
          onEdit={() => {
            if (!isSubmitting) {
              setShowConfirmationModal(false);
            }
          }}
          cart={cart}
          customer={customer}
          cartTotal={cartTotal}
          discount={totalDiscount}
          deliveryFee={deliveryFee}
          total={total}
          appliedCoupon={appliedCoupon}
          scheduledDate={customer.scheduled_date}
          scheduledTime={customer.scheduled_time}
          primaryColor={primaryColor}
          isSubmitting={isSubmitting}
        />
      </motion.div>
    </AnimatePresence>
  );
}
