import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Crown, Zap, Rocket, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PlanDistributionChart({ distribution = {}, loading = false }) {
  const plans = [
    { 
      key: 'free', 
      name: 'Gratuito', 
      icon: Gift, 
      color: 'bg-green-500',
      lightBg: 'bg-green-50',
      textColor: 'text-green-700'
    },
    { 
      key: 'basic', 
      name: 'Básico', 
      icon: Users, 
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    { 
      key: 'pro', 
      name: 'Pro', 
      icon: Zap, 
      color: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    { 
      key: 'ultra', 
      name: 'Ultra', 
      icon: Crown, 
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-700'
    }
  ];

  const total = Object.values(distribution).reduce((sum, count) => sum + (count || 0), 0);

  if (loading) {
    return (
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle>Distribuição por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">Distribuição por Plano</CardTitle>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-gray-900">{total}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          const count = distribution[plan.key] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                plan.lightBg,
                count > 0 ? "opacity-100" : "opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", plan.color)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className={cn("font-semibold", plan.textColor)}>{plan.name}</h4>
                    <p className="text-xs text-gray-600">
                      {count} {count === 1 ? 'assinante' : 'assinantes'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("text-2xl font-bold", plan.textColor)}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              
              {/* Barra de progresso */}
              <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                  className={cn("h-full rounded-full", plan.color)}
                />
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
