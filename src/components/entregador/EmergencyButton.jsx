import React, { useState } from 'react';
import { AlertTriangle, Phone, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmergencyButton({ darkMode }) {
  const [showMenu, setShowMenu] = useState(false);

  const emergencyOptions = [
    {
      label: 'Ligar para Gestor',
      icon: Phone,
      action: () => window.location.href = 'tel:+5586999999999',
      color: 'from-red-500 to-red-600'
    },
    {
      label: 'WhatsApp Emergência',
      icon: MessageCircle,
      action: () => window.open('https://wa.me/5586999999999?text=🚨 EMERGÊNCIA - Preciso de ajuda urgente!', '_blank'),
      color: 'from-orange-500 to-orange-600'
    },
    {
      label: 'Cancelar',
      icon: X,
      action: () => setShowMenu(false),
      color: 'from-gray-500 to-gray-600'
    }
  ];

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowMenu(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-2xl flex items-center justify-center"
      >
        <div className="flex items-center justify-center w-full h-full">
          <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
        </div>
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-6 max-w-sm w-full shadow-2xl`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Emergência
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Precisa de ajuda?
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {emergencyOptions.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={option.action}
                        className={`w-full h-14 bg-gradient-to-r ${option.color} text-white font-bold rounded-xl shadow-lg`}
                      >
                        <Icon className="w-5 h-5 mr-2" />
                        {option.label}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}