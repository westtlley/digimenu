import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';
import { cn } from '@/lib/utils';

/**
 * Empty State Component
 * Componente padronizado para estados vazios
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className,
  iconSize = 'w-16 h-16',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className={cn(
            'mb-4 p-4 rounded-full bg-gradient-to-br',
            'from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700'
          )}
        >
          <Icon className={cn(iconSize, 'text-gray-400 dark:text-slate-400')} />
        </motion.div>
      )}

      {title && (
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-semibold dark:text-slate-100 text-gray-900 mb-2"
        >
          {title}
        </motion.h3>
      )}

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm dark:text-slate-400 text-gray-500 mb-6 max-w-md"
        >
          {description}
        </motion.p>
      )}

      {action && actionLabel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={action}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
