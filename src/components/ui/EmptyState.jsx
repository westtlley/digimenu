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
  onAction,
  actionLabel,
  className,
  iconSize = 'w-16 h-16',
  actionClassName,
  iconClassName,
}) {
  const handler = action || onAction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center bg-card border border-border rounded-xl',
        className
      )}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className={cn(
            'mb-4 p-4 rounded-full border bg-muted text-muted-foreground border-border',
            iconClassName
          )}
        >
          <Icon className={cn(iconSize)} />
        </motion.div>
      )}

      {title && (
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-semibold text-foreground mb-2"
        >
          {title}
        </motion.h3>
      )}

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground mb-6 max-w-md"
        >
          {description}
        </motion.p>
      )}

      {handler && actionLabel && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handler}
            className={cn(
              "font-semibold shadow-sm transition-all duration-200",
              actionClassName
            )}
          >
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
