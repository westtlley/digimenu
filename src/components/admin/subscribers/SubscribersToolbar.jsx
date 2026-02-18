import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdvancedFilters from './AdvancedFilters';
import { cn } from '@/lib/utils';

const QUICK_FILTERS = [
  { label: 'Todos', filter: null, key: 'all' },
  { label: 'Ativos', filter: 'active', key: 'active' },
  { label: 'Inativos', filter: 'inactive', key: 'inactive' },
  { label: 'Gratuitos', filter: 'free', key: 'free' },
  { label: 'Básico', filter: 'basic', key: 'basic' },
  { label: 'Pro', filter: 'pro', key: 'pro' },
  { label: 'Ultra', filter: 'ultra', key: 'ultra' },
];

const COLOR_MAP = {
  all: 'gray',
  active: 'green',
  inactive: 'red',
  free: 'green',
  basic: 'blue',
  pro: 'orange',
  ultra: 'purple',
};

const colorClasses = {
  gray: 'bg-muted text-foreground hover:bg-muted/80 border-border',
  green: 'bg-muted text-foreground hover:bg-muted/80 border-green-500/30',
  red: 'bg-muted text-foreground hover:bg-muted/80 border-destructive/30',
  blue: 'bg-muted text-foreground hover:bg-muted/80 border-blue-500/30',
  orange: 'bg-muted text-foreground hover:bg-muted/80 border-primary/50',
  purple: 'bg-muted text-foreground hover:bg-muted/80 border-violet-500/30',
};

/**
 * Barra de busca + filtros avançados + quick filters.
 */
export default function SubscribersToolbar({
  searchTerm,
  onSearchChange,
  subscribers = [],
  advancedFiltered,
  onAdvancedFilterChange,
  stats,
  onQuickFilter,
  className,
}) {
  const getCount = (qf) => {
    if (!stats) return 0;
    if (qf.filter === null) return stats.total;
    if (qf.filter === 'active') return stats.active;
    if (qf.filter === 'inactive') return stats.inactive;
    if (qf.filter === 'free') return stats.free;
    if (qf.filter === 'basic') return stats.basic;
    if (qf.filter === 'pro') return stats.pro;
    if (qf.filter === 'ultra') return stats.ultra;
    return 0;
  };

  const isActive = (qf) => {
    if (qf.filter === null) return advancedFiltered === null;
    if (advancedFiltered === null) return false;
    if (qf.filter === 'active' || qf.filter === 'inactive') {
      return advancedFiltered.every((s) => s.status === qf.filter);
    }
    return advancedFiltered.every((s) => s.plan === qf.filter && s.status === 'active');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar assinantes por email ou nome"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <AdvancedFilters subscribers={subscribers} onFilterChange={onAdvancedFilterChange} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground mr-1">Filtro:</span>
        {QUICK_FILTERS.map((qf) => (
          <Button
            key={qf.key}
            variant="outline"
            size="sm"
            className={cn(
              'text-xs h-7 px-2',
              colorClasses[COLOR_MAP[qf.key] || 'gray'],
              isActive(qf) && 'ring-2 ring-offset-1 ring-ring'
            )}
            onClick={() => onQuickFilter(qf.filter)}
          >
            {qf.label}
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-background/80">
              {getCount(qf)}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}
