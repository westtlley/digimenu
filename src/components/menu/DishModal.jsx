import React, { useState, useEffect } from 'react';
import { X, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: 'dish', title: 'Escolha o Prato', type: 'single' },
  { key: 'rice', title: 'Escolha o Arroz', type: 'single' },
  { key: 'bean', title: 'Escolha o Feijão', type: 'single' },
  { key: 'garnish', title: 'Escolha as Guarnições', type: 'multiple' },
  { key: 'salad', title: 'Escolha a Salada', type: 'single' },
  { key: 'drink', title: 'Escolha a Bebida', type: 'single' },
];

export default function DishModal({ isOpen, onClose, config, onAddToCart }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({
    dish: null,
    rice: null,
    bean: null,
    garnish: [],
    salad: null,
    drink: null,
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelections({
        dish: null,
        rice: null,
        bean: null,
        garnish: [],
        salad: null,
        drink: null,
      });
    }
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const step = STEPS[currentStep];
  const maxGarnish = config.rules?.max_garnish || 2;

  const getOptions = () => {
    if (step.key === 'dish') return config.dishes || [];
    return config.options?.[step.key] || [];
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleSelect = (option) => {
    if (step.type === 'single') {
      setSelections(prev => ({ ...prev, [step.key]: option }));
    } else {
      // Multiple selection (garnish)
      setSelections(prev => {
        const current = prev.garnish || [];
        const exists = current.find(g => g.id === option.id);
        if (exists) {
          return { ...prev, garnish: current.filter(g => g.id !== option.id) };
        } else if (current.length < maxGarnish) {
          return { ...prev, garnish: [...current, option] };
        }
        return prev;
      });
    }
  };

  const isSelected = (option) => {
    if (step.type === 'single') {
      return selections[step.key]?.id === option.id;
    }
    return selections.garnish?.some(g => g.id === option.id);
  };

  const canProceed = () => {
    if (step.type === 'single') {
      return selections[step.key] !== null;
    }
    return selections.garnish.length > 0;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate total and add to cart
      const totalPrice = 
        (selections.dish?.price || 0) +
        (selections.rice?.price || 0) +
        (selections.bean?.price || 0) +
        (selections.salad?.price || 0) +
        (selections.drink?.price || 0) +
        (selections.garnish?.reduce((sum, g) => sum + (g.price || 0), 0) || 0);

      const orderItem = {
        id: Date.now().toString(),
        ...selections,
        totalPrice,
      };
      onAddToCart(orderItem);
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const options = getOptions();

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full md:max-w-lg bg-white md:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-lg">{step.title}</h2>
              <p className="text-sm text-gray-500">
                Passo {currentStep + 1} de {STEPS.length}
                {step.key === 'garnish' && ` (máx. ${maxGarnish})`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between",
                  isSelected(option) 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-200 hover:border-gray-300 bg-white"
                )}
              >
                <div className="flex items-center gap-3">
                  {option.image && (
                    <img 
                      src={option.image} 
                      alt={option.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="text-left">
                    <p className="font-medium">{option.name}</p>
                    {option.price > 0 && (
                      <p className="text-sm text-gray-500">
                        + {formatCurrency(option.price)}
                      </p>
                    )}
                  </div>
                </div>
                {isSelected(option) && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white sticky bottom-0">
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
          >
            {currentStep < STEPS.length - 1 ? (
              <>
                Continuar
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              'Adicionar ao Pedido'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}