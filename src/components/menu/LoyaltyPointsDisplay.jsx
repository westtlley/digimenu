import React from 'react';
import { Star, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLoyalty, calculateTier } from '@/hooks/useLoyalty';
import { motion } from 'framer-motion';

export default function LoyaltyPointsDisplay({ customerPhone, customerEmail, slug, orderTotal = 0, primaryColor = '#f97316' }) {
  const { loyaltyData, currentTier, loading } = useLoyalty(customerPhone, customerEmail, slug);

  if (loading || !customerPhone && !customerEmail) return null;

  const pointsToEarn = Math.floor(orderTotal);
  const discount = currentTier.discount;
  const discountAmount = orderTotal * (discount / 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Pontos Atuais e Nível */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5" style={{ color: primaryColor }} />
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {loyaltyData.points.toLocaleString('pt-BR')} pontos
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Nível {currentTier.name} • {discount}% OFF
            </p>
          </div>
        </div>
        <Badge 
          style={{ 
            backgroundColor: currentTier.color,
            color: 'white',
            border: 'none'
          }}
        >
          {currentTier.icon} {currentTier.name}
        </Badge>
      </div>

      {/* Desconto Aplicado */}
      {discount > 0 && orderTotal > 0 && (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              Desconto de {discount}% aplicado
            </span>
          </div>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}
          </span>
        </div>
      )}

      {/* Pontos a Ganhar */}
      {pointsToEarn > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Você vai ganhar
            </span>
          </div>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            +{pointsToEarn} pontos
          </span>
        </div>
      )}
    </motion.div>
  );
}
