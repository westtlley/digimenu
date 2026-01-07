import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, Edit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

export default function CartModal({ isOpen, onClose, cart, onUpdateQuantity, onRemoveItem, onCheckout, onEditItem, onEditPizza, darkMode = false, primaryColor = '#f97316' }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice * (item.quantity || 1), 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center md:items-stretch md:justify-end justify-center p-4 md:p-0"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} md:rounded-none rounded-2xl shadow-2xl w-full md:w-[400px] max-w-lg md:max-w-none h-auto md:h-full max-h-[85vh] md:max-h-none overflow-hidden flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: darkMode ? '#374151' : '#e5e7eb' }}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" style={{ color: primaryColor }} />
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Seu Pedido</h2>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Carrinho vazio</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className={`flex gap-3 p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  {/* Image */}
                  <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                    {item.dish?.image ? (
                      <img src={item.dish.image} alt={item.dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        Sem foto
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {item.dish?.name}
                    </h3>
                    {item.selections && Object.keys(item.selections).length > 0 && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'} line-clamp-2`}>
                        {Object.values(item.selections).map(sel => {
                          if (Array.isArray(sel)) return sel.map(s => s.name).join(', ');
                          return sel.name;
                        }).filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm" style={{ color: primaryColor }}>
                        {formatCurrency(item.totalPrice)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`text-sm font-medium w-6 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        if (item.dish?.product_type === 'pizza' && onEditPizza) {
                          onEditPizza(item);
                        } else {
                          onEditItem(item);
                        }
                      }}
                      className={`p-1 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`}
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cart.length > 0 && (
            <div className={`border-t p-4 space-y-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</span>
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Continuar
                </Button>
                <Button
                  onClick={onCheckout}
                  className="flex-1 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Finalizar Pedido
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}