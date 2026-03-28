import React from 'react';
import { X, Edit, Check, Package, MapPin, DollarSign, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { getCartItemLineTotal } from '@/utils/cartPricing';
import { useLanguage } from '@/i18n/LanguageContext';

export default function OrderConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  cart = [],
  customer = {},
  cartTotal = 0,
  discount = 0,
  deliveryFee = 0,
  total = 0,
  appliedCoupon = null,
  scheduledDate = null,
  scheduledTime = null,
  primaryColor = '#f97316',
  isSubmitting = false,
}) {
  const { t } = useLanguage();
  const orderConfirmationText = t('menu.orderConfirmation');
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const renderComboBreakdown = (item) => {
    const groups = item?.selections?.combo_groups;
    if (!Array.isArray(groups) || groups.length === 0) return null;

    const lines = [];
    groups.forEach((g) => {
      if (!g) return;
      const title = g.title || orderConfirmationText.comboItems;
      const isDrinkGroup = /bebid/i.test(title);
      const groupEmoji = isDrinkGroup ? '🥤' : '🍽️';
      const groupLabel = isDrinkGroup ? orderConfirmationText.drinks : orderConfirmationText.dishes;
      const items = Array.isArray(g.items) ? g.items : [];
      if (items.length === 0) return;

      lines.push({ type: 'title', text: `${groupEmoji} ${groupLabel}: ${title}` });

      items.forEach((it) => {
        if (!it) return;
        const baseName = it.dish_name || it.dishName || 'Item';
        const instances = Array.isArray(it.instances) && it.instances.length > 0
          ? it.instances
          : Array.from({ length: Math.max(1, it.quantity || 1) }, () => null);

        instances.forEach((inst, instIdx) => {
          const showIndex = instances.length > 1;
          const itemLabel = isDrinkGroup ? 'Bebida' : 'Prato';
          lines.push({ type: 'item', text: `${showIndex ? `${itemLabel} ${instIdx + 1}: ` : ''}${baseName}` });
          const sel = inst?.selections;
          if (sel && typeof sel === 'object') {
            Object.values(sel).forEach((groupSel) => {
              if (Array.isArray(groupSel)) {
                groupSel.forEach((opt) => {
                  if (opt?.name) lines.push({ type: 'sub', text: `↳ ${opt.name}` });
                });
              } else if (groupSel?.name) {
                lines.push({ type: 'sub', text: `↳ ${groupSel.name}` });
              }
            });
          }
        });
      });
    });

    if (lines.length === 0) return null;

    return (
      <div className="mt-1 space-y-0.5">
        {lines.map((l, idx) => {
          if (l.type === 'title') {
            return (
              <p key={idx} className="text-[11px] font-semibold text-gray-600">
                {l.text}
              </p>
            );
          }
          if (l.type === 'item') {
            return (
              <p key={idx} className="text-[11px] text-gray-500">
                - {l.text}
              </p>
            );
          }
          return (
            <p key={idx} className="text-[11px] text-gray-500 ml-3">
              {l.text}
            </p>
          );
        })}
      </div>
    );
  };

  // Função para formatar as seleções de um item (marmita, pizza, etc)
  const formatItemSelections = (item) => {
    const parts = [];

    if (item?.dish?.product_type === 'combo' || Array.isArray(item?.selections?.combo_groups)) {
      return null;
    }

    // Se for marmita
    if (item.rice) parts.push(`🍚 ${item.rice.name || item.rice}`);
    if (item.bean) parts.push(`🫘 ${item.bean.name || item.bean}`);
    if (item.garnish) {
      if (Array.isArray(item.garnish)) {
        const garnishNames = item.garnish.map(g => g.name || g).join(', ');
        if (garnishNames) parts.push(`🥗 ${garnishNames}`);
      } else if (typeof item.garnish === 'object' && item.garnish.name) {
        parts.push(`🥗 ${item.garnish.name}`);
      }
    }
    if (item.salad) parts.push(`🥬 ${item.salad.name || item.salad}`);
    if (item.drink) parts.push(`🥤 ${item.drink.name || item.drink}`);

    // Se for pizza
    if (item.size) parts.push(`📏 ${item.size.name || item.size}`);
    if (item.flavors && Array.isArray(item.flavors)) {
      const flavorNames = item.flavors.map(f => f.name || f).join(' + ');
      if (flavorNames) parts.push(`🍕 ${flavorNames}`);
    }
    if (item.edge) parts.push(`🧀 Borda: ${item.edge.name || item.edge}`);
    if (item.extras && Array.isArray(item.extras) && item.extras.length > 0) {
      const extraNames = item.extras.map(e => e.name || e).join(', ');
      if (extraNames) parts.push(`➕ ${extraNames}`);
    }

    // Se tiver complementos genéricos
    if (item.complements && Array.isArray(item.complements)) {
      const complementNames = item.complements.map(c => c.name || c).join(', ');
      if (complementNames) parts.push(complementNames);
    }

    // Se tiver selections (formato antigo)
    if (item.selections && typeof item.selections === 'object') {
      Object.entries(item.selections).forEach(([key, value]) => {
        if (key === 'combo_groups') return;
        if (value) {
          if (Array.isArray(value)) {
            const valueStr = value.map(v => v.name || v).filter(Boolean).join(', ');
            if (valueStr) parts.push(valueStr);
          } else if (typeof value === 'object' && value.name) {
            parts.push(value.name);
          } else if (typeof value === 'string') {
            parts.push(value);
          }
        }
      });
    }

    // Observações/especificações
    if (item.specifications) parts.push(`${orderConfirmationText.noteIcon} ${item.specifications}`);
    if (item.observations) parts.push(`${orderConfirmationText.noteIcon} ${item.observations}`);

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const formatAddress = () => {
    if (customer.deliveryMethod === 'pickup') {
      return orderConfirmationText.pickupLabel;
    }
    const parts = [
      customer.address_street,
      customer.address_number,
      customer.address_complement && `(${customer.address_complement})`,
      customer.neighborhood
    ].filter(Boolean);
    return parts.join(', ') || orderConfirmationText.addressNotInformed;
  };

  const formatPaymentMethod = () => {
    const methods = {
      dinheiro: orderConfirmationText.paymentMethods.dinheiro,
      pix: orderConfirmationText.paymentMethods.pix,
      cartao_credito: orderConfirmationText.paymentMethods.cartao_credito,
      cartao_debito: orderConfirmationText.paymentMethods.cartao_debito,
    };
    return methods[customer.paymentMethod] || customer.paymentMethod || orderConfirmationText.notInformed;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="w-5 h-5" style={{ color: primaryColor }} />
              {orderConfirmationText.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 py-4 overflow-y-auto">
            {/* Resumo dos Itens */}
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">{orderConfirmationText.itemsTitle}</h3>
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const comboNode = (item?.dish?.product_type === 'combo' || Array.isArray(item?.selections?.combo_groups))
                    ? renderComboBreakdown(item)
                    : null;
                  const selectionsText = comboNode ? null : formatItemSelections(item);

                  return (
                    <div key={index} className="flex items-start justify-between text-sm bg-gray-50 p-2 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.quantity}x {item.dish?.name || item.name}
                        </p>
                        {comboNode}
                        {selectionsText && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {selectionsText}
                          </p>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 ml-2 flex-shrink-0">
                        {formatCurrency(getCartItemLineTotal(item))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="space-y-3 pt-2 border-t">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">{orderConfirmationText.deliveryTitle}</span>
                </div>
                <p className="text-sm text-gray-900">{formatAddress()}</p>
                {customer.deliveryMethod === 'delivery' && customer.phone && (
                  <p className="text-xs text-gray-500 mt-1">{orderConfirmationText.phoneIcon} {customer.phone}</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">{orderConfirmationText.paymentTitle}</span>
                </div>
                <p className="text-sm text-gray-900">{formatPaymentMethod()}</p>
                {customer.paymentMethod === 'dinheiro' && customer.needs_change && customer.change_amount && (
                  <p className="text-xs text-gray-500 mt-1">
                    {orderConfirmationText.changeForLabel} {formatCurrency(customer.change_amount)}
                  </p>
                )}
              </div>

              {scheduledDate && scheduledTime && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">{orderConfirmationText.scheduleTitle}</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {new Date(scheduledDate).toLocaleDateString('pt-BR')} às {scheduledTime}
                  </p>
                </div>
              )}

              {appliedCoupon && (
                <div>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    {orderConfirmationText.couponLabel}: {appliedCoupon.code} (-{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatCurrency(appliedCoupon.discount_value)})
                  </Badge>
                </div>
              )}
            </div>

            {/* Totais */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{orderConfirmationText.subtotalLabel}</span>
                <span className="font-medium">{formatCurrency(cartTotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{orderConfirmationText.discountLabel}</span>
                  <span className="font-medium">-{formatCurrency(discount)}</span>
                </div>
              )}

              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{orderConfirmationText.deliveryFeeLabel}</span>
                  <span className="font-medium">{formatCurrency(deliveryFee)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>{orderConfirmationText.totalLabel}</span>
                <span style={{ color: primaryColor }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 px-6 py-4 border-t bg-white">
            <Button variant="outline" onClick={onEdit} className="flex-1" disabled={isSubmitting}>
              <Edit className="w-4 h-4 mr-2" />
              {orderConfirmationText.editButton}
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 text-white font-bold"
              style={{ backgroundColor: primaryColor }}
              disabled={isSubmitting}
            >
              <Check className="w-4 h-4 mr-2" />
              {isSubmitting ? orderConfirmationText.submittingButton : orderConfirmationText.confirmButton}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

