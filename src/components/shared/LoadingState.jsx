import React from 'react';

/**
 * Estados de carregamento unificados.
 * Variantes: spinner (padrão), skeleton, inline.
 */
export function LoadingSpinner({ className = '', size = 'md', label = 'Carregando' }) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-2',
    lg: 'h-12 w-12 border-2',
  };
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
      role="status"
      aria-label={label}
    >
      <div
        className={`animate-spin rounded-full border-orange-500 border-t-transparent ${sizeClasses[size]}`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Spinner em tela cheia (para páginas ou Suspense).
 */
export function LoadingPage({ label = 'Carregando' }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
      role="status"
      aria-label={label}
    >
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

/**
 * Linhas de skeleton para listas/tabelas.
 */
export function LoadingSkeleton({ lines = 5, className = '' }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} role="status" aria-label="Carregando">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-gray-200 dark:bg-gray-700"
          style={{ width: i === lines - 1 && lines > 2 ? '60%' : '100%' }}
        />
      ))}
      <span className="sr-only">Carregando</span>
    </div>
  );
}

/**
 * Inline spinner (ex.: ao lado de botão).
 */
export function LoadingInline({ className = '' }) {
  return (
    <span className={`inline-flex items-center ${className}`} role="status" aria-label="Carregando">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
    </span>
  );
}

export default LoadingPage;
