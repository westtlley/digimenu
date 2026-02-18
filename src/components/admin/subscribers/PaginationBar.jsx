import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Barra de paginação: intervalo "X–Y de Total", Anterior/Próxima.
 */
export default function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  isLoading,
  onPrev,
  onNext,
  className,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const label = total > 0 ? `${start}–${end} de ${total}` : '0 de 0';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-3 px-4 border-t border-border bg-muted/30',
        className
      )}
      role="navigation"
      aria-label="Paginação da lista de assinantes"
    >
      <p className="text-sm text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page <= 1 || isLoading}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages || isLoading}
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
