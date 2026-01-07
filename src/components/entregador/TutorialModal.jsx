import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tutorialSteps = [
  {
    title: 'Bem-vindo!',
    description: 'Este é o painel de entregas. Aqui você gerencia seus pedidos e acompanha seus ganhos.',
    icon: '👋'
  },
  {
    title: 'Status de Disponibilidade',
    description: 'Ative/desative sua disponibilidade para receber novos pedidos. Só receba quando estiver pronto!',
    icon: '🟢'
  },
  {
    title: 'Pedidos Ativos',
    description: 'Veja todos os pedidos que você precisa entregar. Clique em um pedido para ver os detalhes completos.',
    icon: '📦'
  },
  {
    title: 'Navegação GPS',
    description: 'Use o mapa para ver a rota e o botão de navegação para abrir no Google Maps ou Waze.',
    icon: '🗺️'
  },
  {
    title: 'Código de Validação',
    description: 'Cada entrega tem um código de 4 dígitos. O cliente irá fornecer este código ao receber o pedido.',
    icon: '🔢'
  },
  {
    title: 'Comprovante de Entrega',
    description: 'Tire uma foto e deixe observações para comprovar que a entrega foi realizada.',
    icon: '📸'
  },
  {
    title: 'Relatório de Ganhos',
    description: 'Acompanhe seus ganhos diários, semanais e mensais. Exporte relatórios quando precisar.',
    icon: '💰'
  }
];

export default function TutorialModal({ onClose, darkMode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (dontShowAgain) {
        localStorage.setItem('entregador_tutorial_never_show', 'true');
      }
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-lg w-full p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Tutorial
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {tutorialSteps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 mx-1 rounded-full ${
                  idx <= currentStep ? 'bg-blue-500' : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">
            {currentStep + 1} de {tutorialSteps.length}
          </p>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{step.icon}</div>
          <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {step.title}
          </h3>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {step.description}
          </p>
        </div>

        {/* Checkbox para última página */}
        {currentStep === tutorialSteps.length - 1 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Não mostrar este tutorial novamente
              </span>
            </label>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            className="flex-1"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Anterior
          </Button>
          <Button
            onClick={nextStep}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            {currentStep === tutorialSteps.length - 1 ? 'Finalizar' : 'Próximo'}
            {currentStep < tutorialSteps.length - 1 && <ChevronRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}