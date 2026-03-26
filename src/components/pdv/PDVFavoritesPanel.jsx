import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, X } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function PDVFavoritesPanel({
  slots = [],
  highlightedSlot = null,
  onUseFavorite,
  onRemoveFavorite,
  getDefaultQuantity,
}) {
  return (
    <div className="flex-shrink-0 border-b bg-card px-4 py-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-foreground">Favoritos rapidos</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Use as teclas 1-9 para adicionar os itens mais usados sem tocar no cardapio.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
          1-9
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-9">
        {slots.map((slotData) => {
          const {
            slot,
            dish,
            isAssigned,
            isEnabled,
            hasDishRecord,
          } = slotData;
          const isHighlighted = String(highlightedSlot || '') === String(slot);
          const defaultQuantity = dish ? Math.max(1, Number(getDefaultQuantity?.(dish.id) || 1)) : 1;

          if (!isAssigned) {
            return (
              <div
                key={`pdv-favorite-slot-${slot}`}
                className="rounded-xl border border-dashed border-border bg-muted/20 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline" className="border-border text-foreground">{slot}</Badge>
                  <span className="text-[11px] font-medium text-muted-foreground">Vazio</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique na estrela de um produto para ocupar este atalho.
                </p>
              </div>
            );
          }

          return (
            <div
              key={`pdv-favorite-slot-${slot}`}
              className={`rounded-xl border p-3 transition-all ${
                isHighlighted
                  ? 'border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-200 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/20 dark:ring-emerald-900/40'
                  : 'border-border bg-muted/10'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                  Tecla {slot}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                  onClick={() => onRemoveFavorite?.(slot)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <button
                type="button"
                className="w-full text-left"
                onClick={() => onUseFavorite?.(slot)}
              >
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-foreground">
                  {dish?.name || 'Produto indisponivel'}
                </p>
                <p className="mt-1 text-sm font-bold text-orange-600">
                  {dish ? formatCurrency(Number(dish?.price || 0)) : '—'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {hasDishRecord ? (
                    <Badge
                      variant="outline"
                      className={isEnabled
                        ? 'border-emerald-300 text-emerald-700 dark:text-emerald-300'
                        : 'border-red-300 text-red-700 dark:text-red-300'}
                    >
                      {isEnabled ? 'PDV ativo' : 'PDV desativado'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
                      Produto ausente
                    </Badge>
                  )}
                  {defaultQuantity > 1 && (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300">
                      x{defaultQuantity} padrao
                    </Badge>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
