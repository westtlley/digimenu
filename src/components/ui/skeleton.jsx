import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton Loader
 * Componente para estados de carregamento
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton Card
 * Card com skeleton para listas
 */
export function SkeletonCard({ className }) {
  return (
    <div className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Stats
 * Skeleton para cards de estatísticas
 */
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-card p-6 shadow-md border border-border"
        >
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="w-14 h-14 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
