import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Spotlight - Componente para destacar elemento alvo
 */
function Spotlight({ targetSelector }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const element = document.querySelector(targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [targetSelector]);

  if (!position) return null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute inset-0 border-4 border-orange-500 rounded-lg shadow-2xl"
        style={{
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        }}
      />
    </div>
  );
}

/**
 * OnboardingTour - Tour interativo para guiar novos usuários
 * Exibe uma série de passos destacando funcionalidades importantes
 */
export function OnboardingTour({ 
  steps = [],
  onComplete,
  storageKey = 'onboarding_completed',
  skipable = true
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar se o onboarding já foi completado
    const completed = localStorage.getItem(storageKey);
    if (!completed && steps.length > 0) {
      setIsVisible(true);
    }
  }, [storageKey, steps.length]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay escuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={skipable ? handleSkip : undefined}
          />

          {/* Spotlight no elemento alvo */}
          {step.targetSelector && (
            <Spotlight targetSelector={step.targetSelector} />
          )}

          {/* Card do tour */}
          <TourCard 
            step={step} 
            currentStep={currentStep} 
            steps={steps}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={handleComplete}
            onSkip={handleSkip}
            skipable={skipable}
          />
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * TourCard - Card do tour posicionado dinamicamente
 */
function TourCard({ step, currentStep, steps, onNext, onPrevious, onComplete, onSkip, skipable }) {
  const [position, setPosition] = useState({ left: '50%', top: '50%' });

  useEffect(() => {
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Posicionar ao lado do elemento
        setPosition({
          left: `${rect.right + 20}px`,
          top: `${rect.top}px`,
        });
      }
    } else if (step.position) {
      setPosition(step.position);
    }
  }, [step]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed z-[10000]"
      style={{
        left: position.left,
        top: position.top,
        transform: position.left === '50%' ? 'translate(-50%, -50%)' : 'none',
      }}
    >
      <Card className="w-96 max-w-[90vw] shadow-2xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Passo {currentStep + 1} de {steps.length}
              </p>
            </div>
            {skipable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
            <motion.div
              className="bg-orange-500 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            {step.content && (
              <p className="text-sm text-gray-700">{step.content}</p>
            )}
            {step.component && step.component}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-orange-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button onClick={currentStep === steps.length - 1 ? onComplete : onNext}>
              {currentStep === steps.length - 1 ? (
                <>
                  Concluir
                  <Check className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * useOnboarding - Hook para facilitar o uso do onboarding
 */
export function useOnboarding(steps, storageKey) {
  const [isActive, setIsActive] = useState(false);

  const start = () => setIsActive(true);
  const complete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsActive(false);
  };
  const reset = () => {
    localStorage.removeItem(storageKey);
    setIsActive(true);
  };

  return {
    isActive,
    start,
    complete,
    reset,
  };
}
