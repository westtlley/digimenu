import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Minus, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';

export default function CartSummary({ 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  discountReais,
  setDiscountReais,
  discountPercent,
  setDiscountPercent,
  observation,
  setObservation,
  subtotal,
  totalDiscount,
  total,
  formatCurrency,
  onFinalize,
  onClear
}) {
  const [showDiscounts, setShowDiscounts] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-10 h-10 text-gray-600" />
          </div>
          <p className="text-base font-medium text-gray-400 mb-1">Nenhum item</p>
          <p className="text-sm text-gray-500">Selecione produtos para adicionar</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cart Items - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {cart.map((item, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-2">
                <h4 className="font-bold text-base text-white mb-1">
                  {item.dish.name}
                </h4>
                {Object.keys(item.selections || {}).length > 0 && (
                  <div className="space-y-0.5 mb-2">
                    {Object.entries(item.selections).map(([gId, sel]) => {
                      if (Array.isArray(sel)) {
                        return sel.map((s, i) => (
                          <p key={i} className="text-xs text-gray-400">• {s.name}</p>
                        ));
                      } else if (sel) {
                        return (
                          <p key={gId} className="text-xs text-gray-400">• {sel.name}</p>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
                <p className="text-sm text-gray-400">
                  {formatCurrency(item.totalPrice)} × {item.quantity}
                </p>
              </div>
              <button
                onClick={() => onRemoveItem(index)}
                className="text-red-400 hover:text-red-500 hover:bg-red-900/20 p-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                  className="w-9 h-9 rounded-lg hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-5 h-5 text-white" />
                </button>
                <span className="w-10 text-center font-bold text-xl text-white">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                  className="w-9 h-9 rounded-lg hover:bg-gray-600 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
              <span className="font-bold text-2xl text-orange-400">
                {formatCurrency(item.totalPrice * item.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Fixed */}
      <div className="border-t border-gray-700 bg-gray-900 px-6 py-5 space-y-4">
        {/* Discounts & Notes - Collapsible */}
        <div>
          <button
            onClick={() => setShowDiscounts(!showDiscounts)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white mb-2"
          >
            <span>Descontos e Observações</span>
            {showDiscounts ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {showDiscounts && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-400 mb-1.5 block">
                    Desconto (R$)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={discountReais || ''}
                    onChange={(e) => setDiscountReais(parseFloat(e.target.value) || 0)}
                    className="h-10 bg-gray-800 border-gray-700 text-white"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1.5 block">
                    Desconto (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="h-10 bg-gray-800 border-gray-700 text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-400 mb-1.5 block">Observações</Label>
                <Textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Observações do pedido..."
                  className="h-20 resize-none bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Totals Summary */}
        <div className="space-y-2.5 py-4 border-y border-gray-700">
          <div className="flex items-center justify-between text-base">
            <span className="text-gray-400">Subtotal</span>
            <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex items-center justify-between text-base">
              <span className="text-gray-400">Desconto</span>
              <span className="font-semibold text-green-400">
                -{formatCurrency(totalDiscount)}
              </span>
            </div>
          )}
        </div>

        {/* Total - Highlighted */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white">TOTAL</span>
            <span className="text-4xl font-bold text-white">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Finalize Button - Large and Prominent */}
        <Button
          onClick={onFinalize}
          disabled={cart.length === 0}
          className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-xl shadow-2xl hover:shadow-green-500/50 transition-all"
        >
          $ FINALIZAR VENDA
        </Button>
      </div>
    </>
  );
}