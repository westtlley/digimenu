import React from 'react';
import { X, Edit, Check, Package, MapPin, DollarSign, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

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
  primaryColor = '#f97316'
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Função para formatar as seleções de um item (marmita, pizza, etc)
  const formatItemSelections = (item) => {
    const parts = [];

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
    if (item.specifications) parts.push(`📝 ${item.specifications}`);
    if (item.observations) parts.push(`📝 ${item.observations}`);

    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const formatAddress = () => {
    if (customer.deliveryMethod === 'pickup') {
      return 'Retirada na loja';
    }
    const parts = [
      customer.address_street,
      customer.address_number,
      customer.complement && `(${customer.complement})`,
      customer.neighborhood
    ].filter(Boolean);
    return parts.join(', ') || 'Endereço não informado';
  };

  const formatPaymentMethod = () => {
    const methods = {
      'dinheiro': '💵 Dinheiro',
      'pix': '💳 PIX',
      'cartao_credito': '💳 Cartão de Crédito',
      'cartao_debito': '💳 Cartão de Débito',
    };
    return methods[customer.paymentMethod] || customer.paymentMethod || 'Não informado';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-5 h-5" style={{ color: primaryColor }} />
            Confirmar Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo dos Itens */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Itens do Pedido</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.map((item, index) => {
                const selectionsText = formatItemSelections(item);
                
                return (
                  <div key={index} className="flex items-start justify-between text-sm bg-gray-50 p-2 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.quantity}x {item.dish?.name || item.name}
                      </p>
                      {selectionsText && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {selectionsText}
                        </p>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 ml-2 flex-shrink-0">
                      {formatCurrency((item.totalPrice || item.price || 0) * (item.quantity || 1))}
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
                <span className="text-xs font-medium text-gray-600">Entrega</span>
              </div>
              <p className="text-sm text-gray-900">{formatAddress()}</p>
              {customer.deliveryMethod === 'delivery' && customer.customer_phone && (
                <p className="text-xs text-gray-500 mt-1">📞 {customer.customer_phone}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">Pagamento</span>
              </div>
              <p className="text-sm text-gray-900">{formatPaymentMethod()}</p>
              {customer.paymentMethod === 'dinheiro' && customer.needs_change && customer.change_amount && (
                <p className="text-xs text-gray-500 mt-1">
                  Troco para: {formatCurrency(customer.change_amount)}
                </p>
              )}
            </div>

            {scheduledDate && scheduledTime && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Agendamento</span>
                </div>
                <p className="text-sm text-gray-900">
                  {new Date(scheduledDate).toLocaleDateString('pt-BR')} às {scheduledTime}
                </p>
              </div>
            )}

            {appliedCoupon && (
              <div>
                <Badge className="bg-green-100 text-green-700 text-xs">
                  Cupom: {appliedCoupon.code} (-{appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatCurrency(appliedCoupon.discount_value)})
                </Badge>
              </div>
            )}
          </div>

          {/* Totais */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(cartTotal)}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto</span>
                <span className="font-medium">-{formatCurrency(discount)}</span>
              </div>
            )}
            
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxa de entrega</span>
                <span className="font-medium">{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span style={{ color: primaryColor }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 text-white font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmar Pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}