import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Package, CheckCircle, Store } from 'lucide-react';

export default function DeliveryProgressBar({ status, darkMode }) {
  const steps = [
    { key: 'going_to_store', label: 'Indo ao Restaurante', icon: Store, progress: 20 },
    { key: 'arrived_at_store', label: 'No Restaurante', icon: Store, progress: 40 },
    { key: 'picked_up', label: 'Pedido Coletado', icon: Package, progress: 60 },
    { key: 'out_for_delivery', label: 'Indo ao Cliente', icon: Package, progress: 80 },
    { key: 'delivered', label: 'Entregue', icon: CheckCircle, progress: 100 }
  ];

  const currentStep = steps.find(s => s.key === status);
  const progress = currentStep?.progress || 0;
  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-4 shadow-lg`}>
      <div className="flex items-center justify-between mb-3 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = status === step.key;
          const isPast = currentIndex > index;
          
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center min-w-[60px]">
              <motion.div
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mb-1 md:mb-2 ${
                  isPast || isActive
                    ? 'bg-gradient-to-br from-green-500 to-green-600'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isPast || isActive ? 'text-white' : 'text-gray-400'}`} />
              </motion.div>
              <p className={`text-[10px] md:text-xs text-center font-medium leading-tight ${
                isActive ? 'text-blue-600 font-bold' : darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
      
      <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-green-500 to-green-600"
        />
      </div>
      
      <p className={`text-center text-xs mt-2 font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
        {progress}% Concluído
      </p>
    </div>
  );
}