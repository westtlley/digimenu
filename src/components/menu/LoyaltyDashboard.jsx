import React from 'react';
import { motion } from 'framer-motion';
import { Star, Gift, TrendingUp, Award, Sparkles, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLoyalty, calculateTier, pointsToNextTier, LOYALTY_TIERS } from '@/hooks/useLoyalty';
import { formatCurrency } from '@/components/utils/formatters';

export default function LoyaltyDashboard({ customerPhone, customerEmail, slug, primaryColor = '#f97316' }) {
  const { loyaltyData, currentTier, pointsToNext, loading } = useLoyalty(customerPhone, customerEmail, slug);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-orange-200 dark:bg-orange-800 rounded w-1/2"></div>
            <div className="h-4 bg-orange-200 dark:bg-orange-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = pointsToNext 
    ? Math.min(100, ((currentTier.minPoints - loyaltyData.points + pointsToNext) / pointsToNext) * 100)
    : 100;

  const allTiers = Object.entries(LOYALTY_TIERS).map(([key, tier]) => ({
    key,
    ...tier,
    isCurrent: key === currentTier.key,
    isUnlocked: loyaltyData.points >= tier.minPoints
  }));

  return (
    <div className="space-y-4">
      {/* Card Principal - Pontos e Nível */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Star className="w-5 h-5" style={{ color: primaryColor }} />
            Programa de Fidelidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pontos Atuais */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-2" style={{ color: primaryColor }}>
              {loyaltyData.points.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pontos acumulados</p>
          </div>

          {/* Nível Atual */}
          <div className="flex items-center justify-center gap-3">
            <div 
              className="text-4xl"
              style={{ filter: currentTier.key === 'bronze' ? 'grayscale(0.3)' : 'none' }}
            >
              {currentTier.icon}
            </div>
            <div>
              <Badge 
                className="text-lg px-4 py-2"
                style={{ 
                  backgroundColor: currentTier.color,
                  color: 'white',
                  border: 'none'
                }}
              >
                {currentTier.name}
              </Badge>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {currentTier.discount}% de desconto em todas as compras
              </p>
            </div>
          </div>

          {/* Progresso para Próximo Nível */}
          {pointsToNext && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Faltam {pointsToNext.toLocaleString('pt-BR')} pontos para
                </span>
                <span className="font-semibold" style={{ color: primaryColor }}>
                  {allTiers.find(t => t.minPoints > currentTier.minPoints)?.name || 'Máximo'}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
          )}

          {/* Total Gasto */}
          <div className="pt-3 border-t border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total gasto:</span>
              <span className="font-bold text-lg" style={{ color: primaryColor }}>
                {formatCurrency(loyaltyData.totalSpent)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Níveis Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: primaryColor }} />
            Níveis do Programa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allTiers.map((tier, index) => (
              <motion.div
                key={tier.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  tier.isCurrent
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : tier.isUnlocked
                    ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tier.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tier.name}</span>
                        {tier.isCurrent && (
                          <Badge className="bg-orange-500 text-white text-xs">Atual</Badge>
                        )}
                        {tier.isUnlocked && !tier.isCurrent && (
                          <Badge variant="outline" className="text-xs">Desbloqueado</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {tier.discount}% de desconto • Mínimo: {tier.minPoints} pontos
                      </p>
                    </div>
                  </div>
                  {!tier.isUnlocked && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Faltam {tier.minPoints - loyaltyData.points} pontos
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefícios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-5 h-5" style={{ color: primaryColor }} />
            Como Ganhar Mais Pontos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Compras</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                1 ponto para cada R$ 1,00 gasto
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Bônus Especiais</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Primeira compra: +50 pontos • Aniversário: +100 pontos • Avaliação: +20 pontos
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Indicação</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Indique um amigo e ganhe 100 pontos quando ele fizer a primeira compra
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
