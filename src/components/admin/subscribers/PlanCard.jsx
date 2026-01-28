import React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Card visual de plano com destaque e comparação
 */
export default function PlanCard({ 
  plan, 
  isSelected = false, 
  onClick, 
  description,
  features = []
}) {
  const planIcons = {
    basic: <Star className="w-5 h-5" />,
    pro: <Zap className="w-5 h-5" />,
    premium: <Crown className="w-5 h-5" />,
    custom: <Star className="w-5 h-5" />
  };

  const planColors = {
    basic: {
      bg: 'bg-gray-50 border-gray-200',
      hover: 'hover:border-gray-300',
      selected: 'border-2 border-gray-400 bg-gray-100',
      badge: 'bg-gray-100 text-gray-700'
    },
    pro: {
      bg: 'bg-blue-50 border-blue-200',
      hover: 'hover:border-blue-300',
      selected: 'border-2 border-blue-500 bg-blue-100',
      badge: 'bg-blue-100 text-blue-700'
    },
    premium: {
      bg: 'bg-purple-50 border-purple-200',
      hover: 'hover:border-purple-300',
      selected: 'border-2 border-purple-500 bg-purple-100',
      badge: 'bg-purple-100 text-purple-700'
    },
    custom: {
      bg: 'bg-orange-50 border-orange-200',
      hover: 'hover:border-orange-300',
      selected: 'border-2 border-orange-500 bg-orange-100',
      badge: 'bg-orange-100 text-orange-700'
    }
  };

  const colors = planColors[plan.slug] || planColors.basic;
  const icon = planIcons[plan.slug] || planIcons.basic;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200',
        colors.bg,
        colors.hover,
        isSelected && colors.selected
      )}
      onClick={onClick}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={cn('p-2 rounded-lg', colors.badge)}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      </div>

      {features.length > 0 && (
        <ul className="space-y-2 mb-4">
          {features.slice(0, 4).map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant={isSelected ? 'default' : 'outline'}
        className={cn(
          'w-full',
          isSelected && 'bg-green-600 hover:bg-green-700'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {isSelected ? 'Selecionado' : 'Selecionar'}
      </Button>
    </motion.div>
  );
}
