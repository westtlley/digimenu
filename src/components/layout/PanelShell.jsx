import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Base visual compartilhada para os painéis de gestão.
 * Mantém espaçamento e largura consistentes em Admin/Assinante/Gerente.
 */
export default function PanelShell({
  children,
  className,
  contentClassName,
  maxWidthClassName = 'lg:max-w-6xl xl:max-w-7xl lg:mx-auto',
  withMinHeight = true,
}) {
  return (
    <main className={cn('flex-1 min-w-0 overflow-y-auto bg-background', className)}>
      <div
        className={cn(
          'p-4 lg:p-6',
          withMinHeight && 'min-h-[60vh]',
          maxWidthClassName,
          contentClassName
        )}
      >
        {children}
      </div>
    </main>
  );
}

