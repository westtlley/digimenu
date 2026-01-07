import React, { useState, useEffect } from 'react';
import { Battery, BatteryLow, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BatteryAlert({ darkMode }) {
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const updateBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });

          battery.addEventListener('chargingchange', () => {
            setIsCharging(battery.charging);
          });
        } catch (e) {
          console.log('Battery API não suportada');
        }
      }
    };

    updateBattery();
  }, []);

  useEffect(() => {
    if (batteryLevel <= 20 && !isCharging) {
      setShowAlert(true);
    } else {
      setShowAlert(false);
    }
  }, [batteryLevel, isCharging]);

  if (!showAlert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className={`fixed top-20 left-4 right-4 z-50 ${
          darkMode ? 'bg-gradient-to-r from-red-900 to-red-800' : 'bg-gradient-to-r from-red-500 to-red-600'
        } rounded-2xl p-4 shadow-2xl`}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <BatteryLow className="w-8 h-8 text-white" />
          </motion.div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">
              ⚠️ Bateria Baixa: {batteryLevel}%
            </p>
            <p className="text-xs text-white/90">
              Carregue seu celular para não perder o rastreamento GPS
            </p>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}