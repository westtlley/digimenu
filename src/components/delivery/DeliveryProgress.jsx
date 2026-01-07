import React from 'react';
import { Package, Store, TruckIcon, MapPin, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const statusSteps = [
  { key: 'going_to_store', label: 'Indo ao Restaurante', icon: TruckIcon, color: 'blue' },
  { key: 'arrived_at_store', label: 'No Restaurante', icon: Store, color: 'yellow' },
  { key: 'picked_up', label: 'Pedido Coletado', icon: Package, color: 'green' },
  { key: 'out_for_delivery', label: 'A Caminho', icon: TruckIcon, color: 'blue' },
  { key: 'arrived_at_customer', label: 'Chegou', icon: MapPin, color: 'green' },
  { key: 'delivered', label: 'Entregue', icon: CheckCircle, color: 'green' }
];

export default function DeliveryProgress({ currentStatus, eta, distance }) {
  const currentStepIndex = statusSteps.findIndex(step => step.key === currentStatus);
  
  const getStatusMessage = () => {
    switch (currentStatus) {
      case 'going_to_store':
        return eta ? `Entregador chegando ao restaurante em ~${eta} minutos` : 'Entregador indo buscar seu pedido';
      case 'arrived_at_store':
        return 'Entregador aguardando coleta no restaurante';
      case 'picked_up':
        return 'Pedido coletado! Entregador saindo para entrega';
      case 'out_for_delivery':
        return eta ? `Entregador chegando em ~${eta} minutos` : 'Entregador a caminho do endereço de entrega';
      case 'arrived_at_customer':
        return 'Entregador chegou! Prepare-se para receber o pedido';
      case 'delivered':
        return 'Pedido entregue com sucesso!';
      default:
        return 'Acompanhando entrega...';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      {/* Status Message */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            currentStatus === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">{getStatusMessage()}</h3>
            {distance && (
              <p className="text-sm text-gray-600">Distância: {distance}</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <motion.div
          className="absolute left-6 top-0 w-0.5 bg-blue-500"
          initial={{ height: 0 }}
          animate={{ height: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
        />

        {/* Steps */}
        <div className="relative space-y-6">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white ${
                  isCompleted
                    ? step.color === 'green' ? 'bg-green-500' : step.color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'
                    : 'bg-gray-200'
                } ${isCurrent ? 'ring-4 ring-blue-200 animate-pulse' : ''}`}>
                  <Icon className={`w-5 h-5 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {isCurrent && eta && (
                    <p className="text-sm text-blue-600 font-medium">
                      ~{eta} minutos
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ETA Card */}
      {eta && currentStatus !== 'delivered' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tempo estimado</p>
              <p className="text-2xl font-bold text-blue-600">~{eta} min</p>
            </div>
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <TruckIcon className="w-8 h-8 text-white animate-bounce" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}