import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Card para exibir métricas SaaS de forma visual e atrativa
 */
export default function SaasMetricCard({ 
  title, 
  value, 
  subtitle,
  change, // { value: 15.5, trend: 'up' | 'down' | 'stable' }
  icon: Icon,
  color = 'blue',
  loading = false,
  onClick
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600',
    green: 'from-green-500 to-green-600 text-green-600',
    orange: 'from-orange-500 to-orange-600 text-orange-600',
    purple: 'from-purple-500 to-purple-600 text-purple-600',
    red: 'from-red-500 to-red-600 text-red-600',
    gray: 'from-gray-500 to-gray-600 text-gray-600'
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    stable: 'text-gray-600 bg-gray-50'
  };

  const TrendIcon = change?.trend === 'up' ? TrendingUp : change?.trend === 'down' ? TrendingDown : Minus;

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card 
        className={cn(
          "overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer",
          onClick && "hover:border-orange-500"
        )}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <motion.h3 
                className="text-3xl font-bold text-gray-900 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {value}
              </motion.h3>
            </div>
            {Icon && (
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
                  colorClasses[color]?.split(' ')[0] + ' ' + colorClasses[color]?.split(' ')[1]
                )}
              >
                <Icon className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{subtitle}</p>
            {change && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                  trendColors[change.trend]
                )}
              >
                <TrendIcon className="w-3 h-3" />
                <span>{Math.abs(change.value).toFixed(1)}%</span>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
