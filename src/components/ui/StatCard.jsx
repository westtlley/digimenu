import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Card de Estatística Melhorado
 * Componente padronizado para exibir estatísticas com design moderno
 */
export default function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  trendValue,
  color = 'primary',
  className,
  delay = 0,
}) {
  const colorClasses = {
    primary: {
      bg: 'bg-gradient-to-br from-orange-400 to-orange-600',
      text: 'text-orange-600',
      bgLight: 'bg-orange-50',
      border: 'border-orange-200',
      gradient: 'from-orange-400/20 to-orange-600/20',
    },
    success: {
      bg: 'bg-gradient-to-br from-green-400 to-green-600',
      text: 'text-green-600',
      bgLight: 'bg-green-50',
      border: 'border-green-200',
      gradient: 'from-green-400/20 to-green-600/20',
    },
    error: {
      bg: 'bg-gradient-to-br from-red-400 to-red-600',
      text: 'text-red-600',
      bgLight: 'bg-red-50',
      border: 'border-red-200',
      gradient: 'from-red-400/20 to-red-600/20',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-400 to-amber-600',
      text: 'text-amber-600',
      bgLight: 'bg-amber-50',
      border: 'border-amber-200',
      gradient: 'from-amber-400/20 to-amber-600/20',
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
      text: 'text-blue-600',
      bgLight: 'bg-blue-50',
      border: 'border-blue-200',
      gradient: 'from-blue-400/20 to-blue-600/20',
    },
  };

  const colors = colorClasses[color] || colorClasses.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 from-white to-gray-50',
        'p-6 shadow-md border',
        'dark:border-slate-700 border-gray-200',
        'hover:shadow-xl hover:-translate-y-1',
        'transition-all duration-300',
        className
      )}
    >
      {/* Background gradient decorativo */}
      <div
        className={cn(
          'absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          `bg-gradient-to-br ${colors.gradient}`
        )}
      />

      <div className="relative">
        {/* Header com ícone */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center shadow-lg',
              colors.bg
            )}
          >
            {Icon && <Icon className="w-7 h-7 text-white" />}
          </motion.div>

          {/* Trend indicator */}
          {trend && trendValue && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold',
                trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}
            >
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </div>
          )}
        </div>

        {/* Valor e label */}
        <div>
          <motion.p
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.1, duration: 0.3 }}
            className="text-4xl font-bold dark:text-slate-100 text-gray-900 mb-1"
          >
            {value}
          </motion.p>
          <p className="text-sm font-semibold dark:text-slate-400 text-gray-600 uppercase tracking-wide">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
