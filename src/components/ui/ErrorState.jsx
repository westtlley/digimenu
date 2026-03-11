import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const toneClasses = {
  default: {
    iconWrap: 'bg-muted text-muted-foreground border-border',
  },
  danger: {
    iconWrap: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  warning: {
    iconWrap: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
};

export default function ErrorState({
  icon: Icon = AlertCircle,
  title = 'Ocorreu um erro',
  description = 'Não foi possível concluir esta operação.',
  tone = 'default',
  onRetry,
  retryLabel = 'Tentar novamente',
  action,
  className,
  containerClassName,
}) {
  const toneClass = toneClasses[tone] || toneClasses.default;

  return (
    <div className={cn('flex items-center justify-center min-h-[400px] p-6', className)}>
      <div className={cn('bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 max-w-md w-full text-center', containerClassName)}>
        <div className={cn('w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4', toneClass.iconWrap)}>
          <Icon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>

        {action ? (
          <div className="space-y-3">{action}</div>
        ) : onRetry ? (
          <Button onClick={onRetry} className="w-full">
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

