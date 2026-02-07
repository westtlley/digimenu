import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UtensilsCrossed, Package, Pizza } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function ProductTypeModal({ isOpen, onClose, onSelectType, categoryId, categoryDishes = [], onRedirectToPizzas, hasPizzaService = false, subscriberName = '', onRequestPizzaService }) {
  // Verificar se a categoria tem produtos do tipo "preparado"
  const hasPreparadoProducts = categoryDishes.some(dish => 
    !dish.product_type || dish.product_type === 'preparado'
  );

  const [showPizzaPlanDialog, setShowPizzaPlanDialog] = useState(false);
  const [requestingService, setRequestingService] = useState(false);

  const productTypes = [
    {
      type: 'preparado',
      icon: UtensilsCrossed,
      title: 'Preparado',
      description: 'Produtos produzidos pela sua loja, como marmitas, bolos, lanches e etc.',
      available: true
    },
    {
      type: 'industrializado',
      icon: Package,
      title: 'Industrializado',
      description: 'Produtos prontos que sua loja não produz, como chocolates, chicletes, refrigerantes e etc.',
      available: true
    },
    {
      type: 'pizza',
      icon: Pizza,
      title: 'Pizza',
      description: hasPizzaService 
        ? 'As pizzas são gerenciadas na aba "Pizzas". Clique aqui para ir até lá.' 
        : 'O serviço de Pizza não faz parte do seu plano. Clique para solicitar.',
      available: true
    }
  ];

  const handleSelect = (type, available) => {
    if (!available) return;
    
    if (type === 'pizza') {
      if (!hasPizzaService) {
        setShowPizzaPlanDialog(true);
        return;
      }
      onClose();
      if (onRedirectToPizzas) onRedirectToPizzas();
      return;
    }
    
    onSelectType(type);
    onClose();
  };

  const handleRequestPizzaService = async () => {
    setRequestingService(true);
    try {
      if (onRequestPizzaService) {
        await onRequestPizzaService();
      } else {
        await base44.entities.ServiceRequest.create({
          type: 'add_pizza_service',
          subscriber_name: subscriberName || 'Assinante',
          status: 'pending',
          requested_at: new Date().toISOString()
        });
      }
      toast.success('Solicitação enviada! Entraremos em contato em breve.');
      setShowPizzaPlanDialog(false);
      onClose();
    } catch (e) {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setRequestingService(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Escolha um tipo de produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {productTypes.map((product) => {
            const Icon = product.icon;
            const isDisabled = !product.available;

            return (
              <motion.button
                key={product.type}
                whileHover={!isDisabled ? { scale: 1.02 } : {}}
                whileTap={!isDisabled ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(product.type, product.available)}
                disabled={isDisabled}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  isDisabled
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-gray-200 hover:border-orange-500 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isDisabled ? 'bg-gray-200' : 'bg-orange-50'
                }`}>
                  <Icon className={`w-6 h-6 ${isDisabled ? 'text-gray-400' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-base mb-1 ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                    {product.title}
                  </h3>
                  <p className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                    {product.description}
                  </p>
                </div>
                {!isDisabled && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-orange-500">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>

        {showPizzaPlanDialog && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium mb-2">
              O serviço de Pizza não faz parte do seu plano atual.
            </p>
            <p className="text-sm text-amber-700 mb-4">
              Deseja solicitar a inclusão deste serviço? Enviaremos sua solicitação para análise.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPizzaPlanDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRequestPizzaService}
                disabled={requestingService}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {requestingService ? 'Enviando...' : 'Sim, solicitar serviço'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}