import React, { useState } from 'react';
import { Plus, X, UtensilsCrossed, FolderPlus, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileFloatingActions({
  onAddDish,
  onAddCategory,
  onAddCombo
}) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { 
      icon: UtensilsCrossed, 
      label: 'Novo Prato', 
      onClick: () => { onAddDish(); setIsOpen(false); },
      color: 'bg-orange-500'
    },
    { 
      icon: FolderPlus, 
      label: 'Nova Categoria', 
      onClick: () => { onAddCategory(); setIsOpen(false); },
      color: 'bg-blue-500'
    },
    { 
      icon: Gift, 
      label: 'Novo Combo', 
      onClick: () => { onAddCombo(); setIsOpen(false); },
      color: 'bg-purple-500'
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              className="flex flex-col-reverse gap-3 mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={action.onClick}
                  className={`${action.color} text-white shadow-lg rounded-full flex items-center gap-3 pr-5 pl-4 py-3 active:scale-95 transition-transform`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="font-medium text-sm whitespace-nowrap">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isOpen 
              ? 'bg-gray-800 rotate-45' 
              : 'bg-gradient-to-br from-orange-500 to-orange-600'
          }`}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </>
  );
}