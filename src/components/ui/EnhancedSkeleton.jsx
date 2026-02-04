import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * EnhancedSkeleton - Skeleton loader melhorado com shimmer effect
 */
export function EnhancedSkeleton({ 
  className,
  variant = 'default',
  animate = true,
  ...props
}) {
  const variants = {
    default: 'bg-gray-200 dark:bg-gray-800',
    card: 'bg-gray-100 dark:bg-gray-700',
    text: 'bg-gray-300 dark:bg-gray-600',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md',
        variants[variant],
        className
      )}
      {...props}
    >
      {animate && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear',
          }}
        />
      )}
    </div>
  );
}

/**
 * SkeletonCard - Card completo com skeleton
 */
export function SkeletonCard({ className, showImage = true }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {showImage && (
        <EnhancedSkeleton 
          className="w-full h-48 mb-4" 
          variant="card"
        />
      )}
      <EnhancedSkeleton className="h-6 w-3/4 mb-2" variant="text" />
      <EnhancedSkeleton className="h-4 w-1/2 mb-4" variant="text" />
      <div className="flex gap-2">
        <EnhancedSkeleton className="h-8 w-20" variant="default" />
        <EnhancedSkeleton className="h-8 w-20" variant="default" />
      </div>
    </div>
  );
}

/**
 * SkeletonList - Lista com múltiplos itens skeleton
 */
export function SkeletonList({ 
  count = 5, 
  className,
  itemClassName 
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className={cn('flex items-center gap-4', itemClassName)}>
            <EnhancedSkeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <EnhancedSkeleton className="h-4 w-3/4" />
              <EnhancedSkeleton className="h-3 w-1/2" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * SkeletonTable - Tabela com skeleton
 */
export function SkeletonTable({ 
  rows = 5, 
  cols = 4,
  className 
}) {
  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      {/* Header */}
      <div className="border-b bg-muted/50 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <EnhancedSkeleton key={i} className="h-4" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 border-b last:border-b-0"
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, j) => (
              <EnhancedSkeleton key={j} className="h-4" />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * SkeletonGrid - Grid com skeleton cards
 */
export function SkeletonGrid({ 
  count = 6,
  cols = 3,
  className 
}) {
  return (
    <div 
      className={cn(
        'grid gap-4',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 md:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
}
