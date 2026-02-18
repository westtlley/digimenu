import React from 'react';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInDays, isPast } from 'date-fns';

/**
 * Componente que mostra um indicador visual de expiração da assinatura
 */
export default function ExpirationProgressBar({ expiresAt, className }) {
  if (!expiresAt) {
    return (
      <Badge variant="outline" className={cn("bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30", className)}>
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Sem expiração
      </Badge>
    );
  }

  const expirationDate = new Date(expiresAt);
  const today = new Date();
  const daysUntilExpiration = differenceInDays(expirationDate, today);
  
  const isExpired = isPast(expirationDate);
  const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 7;
  const isCritical = daysUntilExpiration <= 7 && daysUntilExpiration > 0;

  // Calcular percentual para barra de progresso (baseado em 90 dias)
  const maxDays = 90;
  const progressPercent = Math.min((daysUntilExpiration / maxDays) * 100, 100);

  if (isExpired) {
    return (
      <div className={cn("space-y-1", className)}>
        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expirado {Math.abs(daysUntilExpiration)} dias atrás
        </Badge>
      </div>
    );
  }

  if (isCritical) {
    return (
      <div className={cn("space-y-1", className)}>
        <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 animate-pulse">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expira em {daysUntilExpiration} dias
        </Badge>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div 
            className="bg-destructive h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(progressPercent, 5)}%` }}
          />
        </div>
      </div>
    );
  }

  if (isExpiringSoon) {
    return (
      <div className={cn("space-y-1", className)}>
        <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
          <Calendar className="w-3 h-3 mr-1" />
          Expira em {daysUntilExpiration} dias
        </Badge>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div 
            className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Normal - ainda tem mais de 30 dias
  return (
    <div className={cn("space-y-1", className)}>
      <Badge variant="outline" className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
        <Calendar className="w-3 h-3 mr-1" />
        Expira em {daysUntilExpiration} dias
      </Badge>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div 
          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>
    </div>
  );
}
