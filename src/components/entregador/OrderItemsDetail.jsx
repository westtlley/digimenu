import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderItemsDetail({ order, darkMode }) {
  const [expanded, setExpanded] = useState(false);

  if (!order || !order.items || order.items.length === 0) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} rounded-2xl border-2 overflow-hidden shadow-md`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${darkMode ? 'bg-blue-900' : 'bg-blue-600'} rounded-xl flex items-center justify-center`}>
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Itens do Pedido ({order.items.length})
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Toque para {expanded ? 'ocultar' : 'visualizar'} detalhes
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-4 pb-4`}
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {order.items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.quantity}x
                        </span>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {item.name}
                        </p>
                      </div>
                      {item.complements && item.complements.length > 0 && (
                        <div className="mt-1 ml-6">
                          {item.complements.map((comp, idx) => (
                            <p key={idx} className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              + {comp.name}
                            </p>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className={`text-xs mt-1 italic ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Obs: {item.notes}
                        </p>
                      )}
                    </div>
                    <p className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-600'} ml-2`}>
                      {formatCurrency(item.total_price)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Resumo */}
            <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <p className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Total do Pedido:
                </p>
                <p className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatCurrency(order.total)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}