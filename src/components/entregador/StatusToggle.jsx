import React from 'react';
import { Power, Truck, Coffee, CircleOff } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  available: {
    label: 'Disponível',
    icon: Truck,
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgLight: 'bg-green-50',
    description: 'Pronto para aceitar pedidos'
  },
  busy: {
    label: 'Em Entrega',
    icon: Truck,
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
    description: 'Realizando uma entrega'
  },
  paused: {
    label: 'Pausado',
    icon: Coffee,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgLight: 'bg-yellow-50',
    description: 'Não receberá novos pedidos'
  },
  offline: {
    label: 'Offline',
    icon: CircleOff,
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgLight: 'bg-gray-50',
    description: 'Invisível no sistema'
  }
};

export default function StatusToggle({ currentStatus, onStatusChange, disabled, darkMode }) {
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.offline;
  const Icon = config.icon;

  const getNextStatus = () => {
    if (currentStatus === 'busy') return 'busy'; // Não pode mudar durante entrega
    if (currentStatus === 'offline') return 'available';
    if (currentStatus === 'available') return 'paused';
    if (currentStatus === 'paused') return 'offline';
    return 'available';
  };

  const nextStatus = getNextStatus();
  const nextConfig = STATUS_CONFIG[nextStatus];

  return (
    <div className={`rounded-2xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Status de Operação
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {config.description}
          </p>
        </div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Badge className={`${config.color} text-white text-base px-4 py-2`}>
            <Icon className="w-4 h-4 mr-2" />
            {config.label}
          </Badge>
        </motion.div>
      </div>

      {/* Status Options */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Object.entries(STATUS_CONFIG).map(([key, statusConfig]) => {
          const StatusIcon = statusConfig.icon;
          const isActive = key === currentStatus;
          const isBusy = currentStatus === 'busy' && key !== 'busy';
          
          return (
            <button
              key={key}
              onClick={() => !isBusy && onStatusChange(key)}
              disabled={disabled || isBusy}
              className={`p-4 rounded-xl transition-all ${
                isActive 
                  ? `${statusConfig.bgLight} border-2 ${statusConfig.color.replace('bg-', 'border-')}` 
                  : darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-50 hover:bg-gray-100'
              } ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <StatusIcon className={`w-6 h-6 mx-auto mb-2 ${
                isActive ? statusConfig.textColor : darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <p className={`text-sm font-medium text-center ${
                isActive ? statusConfig.textColor : darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {statusConfig.label}
              </p>
            </button>
          );
        })}
      </div>

      {currentStatus === 'busy' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800 text-center">
            ⚠️ Finalize a entrega atual para mudar seu status
          </p>
        </div>
      )}
    </div>
  );
}