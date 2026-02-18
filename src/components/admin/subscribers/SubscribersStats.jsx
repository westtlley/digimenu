import React from 'react';
import { Users, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, isPast } from 'date-fns';

/**
 * Linha compacta de estatísticas (sem gradientes pesados).
 */
export default function SubscribersStats({ subscribers = [] }) {
  const list = Array.isArray(subscribers) ? subscribers : [];
  const now = new Date();

  const active = list.filter((s) => s.status === 'active').length;
  const inactive = list.filter((s) => s.status === 'inactive').length;
  const expired = list.filter((s) => {
    if (!s.expires_at) return false;
    return isPast(new Date(s.expires_at));
  }).length;
  const expiringSoon = list.filter((s) => {
    if (!s.expires_at) return false;
    const days = differenceInDays(new Date(s.expires_at), now);
    return days <= 30 && days > 0;
  }).length;
  const withoutPassword = list.filter((s) => !s.has_password).length;
  const activeRate = list.length > 0 ? ((active / list.length) * 100).toFixed(0) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{list.length}</span>
        <span className="text-xs text-muted-foreground">total</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-green-500/30">
        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-foreground">{active}</span>
        <span className="text-xs text-muted-foreground">ativos ({activeRate}%)</span>
        {inactive > 0 && <span className="text-xs text-muted-foreground">· {inactive} inativo(s)</span>}
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-amber-500/30">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-foreground">{expiringSoon}</span>
        <span className="text-xs text-muted-foreground">exp. &lt;30 dias</span>
        {expired > 0 && <span className="text-xs text-destructive">· {expired} expirado(s)</span>}
      </div>
      {withoutPassword > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm font-medium text-foreground">{withoutPassword}</span>
          <span className="text-xs text-muted-foreground">sem senha</span>
        </div>
      )}
    </div>
  );
}
