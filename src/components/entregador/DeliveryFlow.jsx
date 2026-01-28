import React, { useState } from 'react';
import { 
  CheckCircle, Clock, Package, Navigation, Home, 
  Phone, MapPin, Camera, AlertCircle 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import DeliveryMap from './DeliveryMap';

const FLOW_STEPS = [
  { key: 'assigned', label: 'Atribuído', icon: Package, color: 'blue' },
  { key: 'accepted', label: 'Aceito', icon: CheckCircle, color: 'green' },
  { key: 'going_to_restaurant', label: 'Indo ao Restaurante', icon: Navigation, color: 'orange' },
  { key: 'collected', label: 'Coletado', icon: Package, color: 'purple' },
  { key: 'going_to_customer', label: 'Indo ao Cliente', icon: Navigation, color: 'blue' },
  { key: 'delivered', label: 'Entregue', icon: Home, color: 'green' }
];

export default function DeliveryFlow({ 
  order, 
  currentStep, 
  onStepComplete, 
  entregadorLocation,
  darkMode 
}) {
  const [deliveryCode, setDeliveryCode] = useState('');
  const [showCodeError, setShowCodeError] = useState(false);

  const getCurrentStepIndex = () => {
    return FLOW_STEPS.findIndex(s => s.key === currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  const handleNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < FLOW_STEPS.length) {
      onStepComplete(FLOW_STEPS[nextIndex].key);
    }
  };

  const handleVerifyCode = () => {
    if (deliveryCode === order.delivery_code) {
      onStepComplete('delivered');
      setShowCodeError(false);
    } else {
      setShowCodeError(true);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const openWhatsApp = (phone, message = '') => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`);
  };

  const callPhone = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const openMaps = () => {
    if (entregadorLocation) {
      const destLat = -5.0892; // Mock - should come from order
      const destLng = -42.8019;
      window.open(`https://www.google.com/maps/dir/${entregadorLocation[0]},${entregadorLocation[1]}/${destLat},${destLng}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge className="bg-blue-500 text-white mb-2">
              #{order.order_code}
            </Badge>
            <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {order.customer_name}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {order.customer_phone}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(order.delivery_fee || 0)}
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Taxa de entrega
            </p>
          </div>
        </div>

        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {order.address}
            </p>
          </div>
        </div>
      </div>

      {/* Flow Steps */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border`}>
        <h3 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Progresso da Entrega
        </h3>
        <div className="space-y-3">
          {FLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isCurrent 
                    ? darkMode ? 'bg-blue-900/30 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-500'
                    : isCompleted
                      ? darkMode ? 'bg-green-900/20' : 'bg-green-50'
                      : darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? 'bg-green-500' :
                  isCurrent ? 'bg-blue-500' :
                  'bg-gray-300'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isCurrent ? 'text-white' : 'text-gray-600'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isCompleted && '✓ Concluído'}
                    {isCurrent && '⏱️ Em andamento'}
                    {isPending && 'Aguardando'}
                  </p>
                </div>
                {isCompleted && (
                  <Clock className="w-4 h-4 text-green-600" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Localização
          </h3>
          <Button size="sm" variant="outline" onClick={openMaps}>
            <Navigation className="w-4 h-4 mr-2" />
            Abrir no Maps
          </Button>
        </div>
        <DeliveryMap
          order={order}
          entregadorLocation={entregadorLocation}
          darkMode={darkMode}
        />
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Contact Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => openWhatsApp(order.customer_phone, `Olá! Sou o entregador do pedido #${order.order_code}. Estou a caminho!`)}
            variant="outline"
            className="w-full"
          >
            <Phone className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            onClick={() => callPhone(order.customer_phone)}
            variant="outline"
            className="w-full"
          >
            <Phone className="w-4 h-4 mr-2" />
            Ligar
          </Button>
        </div>

        {/* Delivery Code for final step */}
        {currentStep === 'going_to_customer' && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border space-y-3`}>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Código de Validação
            </label>
            <Input
              placeholder="Digite os 4 dígitos"
              value={deliveryCode}
              onChange={(e) => {
                setDeliveryCode(e.target.value);
                setShowCodeError(false);
              }}
              maxLength={4}
              className="text-center text-2xl font-bold tracking-widest"
            />
            {showCodeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">
                  Código inválido! Verifique com o cliente.
                </p>
              </div>
            )}
            <Button
              onClick={handleVerifyCode}
              disabled={deliveryCode.length !== 4}
              className="w-full bg-green-500 hover:bg-green-600 h-12"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Confirmar Entrega
            </Button>
          </div>
        )}

        {/* Next Step Button */}
        {currentStep !== 'going_to_customer' && currentStepIndex < FLOW_STEPS.length - 1 && (
          <Button
            onClick={handleNextStep}
            className="w-full bg-blue-500 hover:bg-blue-600 h-12"
          >
            {currentStep === 'assigned' && 'Aceitar Entrega'}
            {currentStep === 'accepted' && 'A Caminho do Restaurante'}
            {currentStep === 'going_to_restaurant' && 'Pedido Coletado'}
            {currentStep === 'collected' && 'A Caminho do Cliente'}
          </Button>
        )}
      </div>
    </div>
  );
}