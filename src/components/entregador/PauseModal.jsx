import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Coffee, Fuel, Utensils, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PauseModal({ isOpen, onClose, onPause, darkMode }) {
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [selectedReason, setSelectedReason] = useState('break');

  const durations = [
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hora' }
  ];

  const reasons = [
    { key: 'break', label: 'Pausa Rápida', icon: Coffee },
    { key: 'fuel', label: 'Abastecimento', icon: Fuel },
    { key: 'meal', label: 'Refeição', icon: Utensils },
  ];

  const nearbyPlaces = [
    { name: 'Posto BR - 500m', type: 'Combustível', distance: '500m' },
    { name: 'Café Central - 300m', type: 'Café', distance: '300m' },
    { name: 'Restaurante Popular - 800m', type: 'Refeição', distance: '800m' }
  ];

  const handlePause = () => {
    onPause(selectedDuration, selectedReason);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${darkMode ? 'bg-gray-800 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Pausa Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Duração */}
          <div>
            <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Por quanto tempo?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((duration) => (
                <motion.button
                  key={duration.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDuration(duration.value)}
                  className={`p-3 rounded-xl text-sm font-bold transition-all ${
                    selectedDuration === duration.value
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {duration.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Motivo da pausa:
            </p>
            <div className="space-y-2">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <motion.button
                    key={reason.key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedReason(reason.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedReason === reason.key
                        ? 'bg-blue-600 text-white'
                        : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{reason.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Locais Próximos */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} rounded-xl p-3`}>
            <p className={`text-xs font-semibold mb-2 flex items-center gap-1 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              <MapPin className="w-3 h-3" />
              Locais próximos sugeridos:
            </p>
            <div className="space-y-1">
              {nearbyPlaces.map((place, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {place.name}
                  </span>
                  <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>
                    {place.distance}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePause}
              className="bg-blue-600 hover:bg-blue-700 h-12 font-bold"
            >
              Iniciar Pausa
            </Button>
          </div>

          <p className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Você não receberá novos pedidos durante a pausa
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}