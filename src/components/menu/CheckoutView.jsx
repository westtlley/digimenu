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

export default function CheckoutView({ 
  cart, 
  customer, 
  setCustomer, 
  onBack, 
  onSendWhatsApp,
  onGeneratePDF,
  couponCode,
  setCouponCode,
  appliedCoupon,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  deliveryZones,
  store,
  primaryColor = '#f97316'
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);

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

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * (item.quantity || 1), 0);

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

  const couponDiscount = calculateDiscount();
  const loyaltyDiscountPercent = getLoyaltyDiscount();
  const loyaltyDiscountAmount = cartTotal * (loyaltyDiscountPercent / 100);
  const totalDiscount = couponDiscount + loyaltyDiscountAmount;
  const deliveryFee = getDeliveryFee();
  const total = cartTotal - totalDiscount + deliveryFee;

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center md:items-stretch md:justify-end justify-center p-4 md:p-0"
        onClick={onBack}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white md:rounded-none rounded-2xl shadow-2xl w-full md:w-[400px] max-w-lg md:max-w-none h-auto md:h-full max-h-[85vh] md:max-h-none overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Finalizar Pedido</h2>
            </div>
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Dados do Cliente */}
            <section className="bg-gray-50 rounded-xl p-4">
              <h2 className="font-bold text-sm mb-3">Dados do Cliente</h2>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-xs text-gray-600">Nome do Cliente</Label>
                  <Input
                    id="name"
                    placeholder="Digite seu nome"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="mt-1 h-10"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs text-gray-600">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: formatPhoneMask(e.target.value) })}
                    className="mt-1 h-10"
                    maxLength={15}
                  />
                </div>
              </div>
            </section>

            {/* Forma de Recebimento */}
            <section className="bg-gray-50 rounded-xl p-4">
              <h2 className="font-bold text-sm mb-3">Forma de Recebimento</h2>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCustomer({ ...customer, deliveryMethod: 'pickup' })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    customer.deliveryMethod === 'pickup'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Store className="w-5 h-5" style={{ color: customer.deliveryMethod === 'pickup' ? '#22c55e' : '#9ca3af' }} />
                  <span className={`font-medium text-xs ${customer.deliveryMethod === 'pickup' ? 'text-green-700' : 'text-gray-600'}`}>
                    Retirada
                  </span>
                </button>

                <button
                  onClick={() => setCustomer({ ...customer, deliveryMethod: 'delivery' })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    customer.deliveryMethod === 'delivery'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Bike className="w-5 h-5" style={{ color: customer.deliveryMethod === 'delivery' ? '#22c55e' : '#9ca3af' }} />
                  <span className={`font-medium text-xs ${customer.deliveryMethod === 'delivery' ? 'text-green-700' : 'text-gray-600'}`}>
                    Entrega
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
                  />
                  
                  <Button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    variant="outline"
                    className="w-full mb-2 border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
                  >
                    <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                    {customer.latitude ? 'Alterar Localização no Mapa' : 'Selecionar Localização no Mapa'}
                  </Button>

                  {customer.latitude && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                      <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        ✓ Localização GPS confirmada
                      </p>
                    </div>
                  )}

                  {/* Campo CEP */}
                  <div>
                    <Label htmlFor="cep" className="text-xs text-gray-600 flex items-center gap-1">
                      CEP *
                      <span className="text-[10px] text-gray-400">(Digite para preencher automaticamente)</span>
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="cep"
                        placeholder="00000-000"
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
                              toast.success('Endereço preenchido automaticamente!');
                            } catch (error) {
                              console.error('Erro ao buscar CEP:', error);
                              toast.error('CEP não encontrado. Preencha o endereço manualmente.');
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
                    <Label htmlFor="address_street" className="text-xs text-gray-600">Rua/Avenida *</Label>
                    <Input
                      id="address_street"
                      placeholder="Ex: Rua das Flores"
                      value={customer.address_street || ''}
                      onChange={(e) => setCustomer({ ...customer, address_street: e.target.value })}
                      className="mt-1 h-10"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="address_number" className="text-xs text-gray-600">Número *</Label>
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
                      <Label htmlFor="address_complement" className="text-xs text-gray-600">Complemento</Label>
                      <Input
                        id="address_complement"
                        placeholder="Apto 101"
                        value={customer.address_complement || ''}
                        onChange={(e) => setCustomer({ ...customer, address_complement: e.target.value })}
                        className="mt-1 h-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="neighborhood" className="text-xs text-gray-600">
                      Bairro *
                    </Label>
                    <Input
                      id="neighborhood"
                      placeholder="Digite o bairro"
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
                                ✓ Taxa de entrega calculada por distância: {formatCurrency(fee)}
                              </p>
                            );
                          }
                        } else if (deliveryZones.length > 0) {
                          // Cálculo por zona
                          const zone = deliveryZones.find((z) =>
                            z.neighborhood?.toLowerCase().trim() === customer.neighborhood.toLowerCase().trim() && z.is_active
                          );
                          if (zone) {
                            return (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Taxa de entrega: {formatCurrency(zone.fee)}
                              </p>
                            );
                          } else if (customer.neighborhood.length > 2) {
                            return (
                              <p className="text-xs text-orange-600 mt-1">
                                ⚠️ Bairro não cadastrado. Confirmaremos a taxa via WhatsApp.
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
            <section className="bg-gray-50 rounded-xl p-4">
              <h2 className="font-bold text-sm mb-3">Forma de Pagamento</h2>
              
              <Select
                value={customer.paymentMethod}
                onValueChange={(value) => setCustomer({ ...customer, paymentMethod: value, needs_change: false, change_amount: '' })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
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
                      Preciso de troco
                    </Label>
                  </div>
                  
                  {customer.needs_change && (
                    <div>
                      <Label htmlFor="change_amount" className="text-xs text-gray-600">Troco para quanto?</Label>
                      <Input
                        id="change_amount"
                        type="number"
                        step="0.01"
                        placeholder="Ex: 50.00"
                        value={customer.change_amount || ''}
                        onChange={(e) => setCustomer({ ...customer, change_amount: e.target.value })}
                        className="mt-1 h-10"
                      />
                      {customer.change_amount && parseFloat(customer.change_amount) > total && (
                        <p className="text-xs text-green-600 mt-1">
                          Troco: {formatCurrency(parseFloat(customer.change_amount) - total)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Agendamento */}
            <section className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm">Agendamento</h2>
                <button
                  type="button"
                  onClick={() => setShowSchedule(!showSchedule)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    showSchedule 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {showSchedule ? '✓ Ativo' : 'Agendar'}
                </button>
              </div>

              {showSchedule && (
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="scheduled_date" className="text-xs text-gray-600">Data</Label>
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
                    <Label htmlFor="scheduled_time" className="text-xs text-gray-600">Horário</Label>
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
                      <p className="text-xs text-gray-500 mt-1">
                        Horário de funcionamento: {store.opening_time} - {store.closing_time}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Solicitar alteração ou adicional (opcional) */}
            <section className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/60">
              <Label htmlFor="customer_change_request" className="text-xs font-medium text-amber-800 flex items-center gap-1">
                ✏️ Solicitar alteração ou adicional (opcional)
              </Label>
              <p className="text-[10px] text-amber-700/90 mb-1.5">
                Ex.: &quot;Trocar arroz por batata&quot;, &quot;Adicionar queijo extra&quot;. O restaurante pode aceitar ou reprovar.
              </p>
              <Textarea
                id="customer_change_request"
                placeholder="Descreva a alteração ou o adicional desejado..."
                value={customer.customer_change_request || ''}
                onChange={(e) => setCustomer({ ...customer, customer_change_request: e.target.value })}
                className="mt-1 min-h-[72px] text-sm resize-none border-amber-200 bg-white"
                maxLength={500}
              />
            </section>

            {/* Cupom */}
            {appliedCoupon && (
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-700">
                    <Ticket className="w-3 h-3 inline mr-1" />
                    {appliedCoupon.code} aplicado!
                  </span>
                  <button onClick={onRemoveCoupon} className="text-xs text-red-600 hover:text-red-700 font-medium">
                    Remover
                  </button>
                </div>
              </div>
            )}

            {!appliedCoupon && (
              <div className="bg-gray-50 rounded-xl p-4">
                <Label className="text-xs text-gray-600 flex items-center gap-1 mb-2">
                  <Ticket className="w-3 h-3" />
                  Cupom de Desconto
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="DIGITE O CÓDIGO"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 h-10"
                  />
                  <Button onClick={onApplyCoupon} variant="outline" size="sm">
                    Aplicar
                  </Button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-600 mt-1">{couponError}</p>
                )}
              </div>
            )}

            {/* Pontos de Fidelidade */}
            {(customer.phone || userEmail) && (
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
          </div>

          {/* Footer com Totais e Botão */}
          <div className="border-t p-4 bg-white">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(cartTotal)}</span>
              </div>
              
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto (Cupom)</span>
                  <span className="font-medium">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              {loyaltyDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto (Fidelidade)</span>
                  <span className="font-medium">-{formatCurrency(loyaltyDiscountAmount)}</span>
                </div>
              )}
              
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxa de entrega</span>
                  <span className="font-medium">{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span>Total</span>
                <span style={{ color: primaryColor }}>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              onClick={() => {
                if (isFormValid()) {
                  setShowConfirmationModal(true);
                }
              }}
              disabled={!isFormValid() || store?.accepting_orders === false || store?.is_open === false}
              className="w-full h-12 text-white font-bold"
              style={{ backgroundColor: (isFormValid() && store?.accepting_orders !== false && store?.is_open !== false) ? primaryColor : '#d1d5db' }}
            >
              {store?.is_open === false
                ? '🔴 Loja Fechada'
                : store?.accepting_orders === false
                ? '⏸️ Pedidos Pausados'
                : 'Finalizar Pedido'}
            </Button>
            
            {store?.is_open === false ? (
              <p className="text-xs text-red-600 text-center mt-2">
                A loja está fechada no momento
              </p>
            ) : store?.accepting_orders === false ? (
              <p className="text-xs text-orange-600 text-center mt-2">
                {store.pause_message || 'Não estamos aceitando pedidos temporariamente'}
              </p>
            ) : !isFormValid() ? (
              <p className="text-xs text-red-600 text-center mt-2">
                Preencha todos os campos obrigatórios
              </p>
            ) : null}
          </div>
        </motion.div>

        {/* Address Map Picker */}
        <AddressMapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialAddress={customer.address_street ? `${customer.address_street}, ${customer.address_number || ''}` : ''}
          onConfirm={({ latitude, longitude, addressData }) => {
            setCustomer({
              ...customer,
              latitude,
              longitude,
              address_street: addressData?.street || customer.address_street || '',
              address_number: addressData?.number || customer.address_number || '',
              address_complement: addressData?.complement || customer.address_complement || '',
              neighborhood: addressData?.neighborhood || customer.neighborhood || '',
              city: addressData?.city || customer.city || '',
              state: addressData?.state || customer.state || '',
              address: addressData?.fullAddress || customer.address || '',
            });
            setShowMapPicker(false);
          }}
        />

        {/* Order Confirmation Modal */}
        <OrderConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          onConfirm={() => {
            setShowConfirmationModal(false);
            onSendWhatsApp();
          }}
          onEdit={() => {
            setShowConfirmationModal(false);
          }}
          cart={cart}
          customer={customer}
          cartTotal={cartTotal}
          discount={discount}
          deliveryFee={deliveryFee}
          total={total}
          appliedCoupon={appliedCoupon}
          scheduledDate={customer.scheduled_date}
          scheduledTime={customer.scheduled_time}
          primaryColor={primaryColor}
        />
      </motion.div>
    </AnimatePresence>
  );
}