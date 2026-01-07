import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UtensilsCrossed, Package, Pizza } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductTypeModal({ isOpen, onClose, onSelectType, categoryId, categoryDishes = [], onRedirectToPizzas }) {
  // Verificar se a categoria tem produtos do tipo "preparado"
  const hasPreparadoProducts = categoryDishes.some(dish => 
    !dish.product_type || dish.product_type === 'preparado'
  );

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
      description: 'As pizzas são gerenciadas na aba "Pizzas". Clique aqui para ir até lá.',
      available: true
    }
  ];

  const handleSelect = (type, available) => {
    if (!available) return;
    
    if (type === 'pizza') {
      onClose();
      if (onRedirectToPizzas) {
        onRedirectToPizzas();
      }
      return;
    }
    
    onSelectType(type);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
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
      </DialogContent>
    </Dialog>
  );
}