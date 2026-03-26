import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Plus } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function PDVTopSellingPanel({
  items = [],
  onUseDish,
  highlightedDishId = null,
  getDefaultQuantity,
}) {
  return (
    <div className="flex-shrink-0 border-b bg-card px-4 py-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-semibold text-foreground">Mais vendidos</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Sugestoes automaticas com base no que voce vende mais e usa recentemente.
          </p>
        </div>
        <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-300">
          Auto
        </Badge>
      </div>

      {!Array.isArray(items) || items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          Os produtos mais vendidos aparecem aqui conforme o caixa vai sendo usado.
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        {items.map((entry, index) => {
          const dish = entry?.dish;
          if (!dish) return null;

          const isHighlighted = String(highlightedDishId || '') === String(dish.id);
          const defaultQuantity = Math.max(1, Number(getDefaultQuantity?.(dish.id) || 1));

          return (
            <div
              key={`pdv-top-selling-${dish.id}`}
              className={`rounded-xl border p-3 transition-all ${
                isHighlighted
                  ? 'border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-200 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/20 dark:ring-emerald-900/40'
                  : 'border-border bg-muted/10 hover:border-orange-300 hover:bg-muted/30'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-300">
                    #{index + 1}
                  </Badge>
                  {index === 0 && (
                    <Badge className="bg-orange-500 text-primary-foreground">
                      Top caixa
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {entry.count} vendas
                </span>
              </div>

              <button
                type="button"
                onClick={() => onUseDish?.(dish)}
                className="block w-full text-left"
              >
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-foreground">
                  {dish.name || 'Produto sem nome'}
                </p>
              </button>

              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-orange-600">
                    {dish.product_type === 'pizza'
                      ? (dish.pizza_config?.sizes?.[0]
                        ? formatCurrency(dish.pizza_config.sizes[0].price_tradicional)
                        : 'Montar')
                      : formatCurrency(Number(dish.price || 0))}
                  </p>
                  {defaultQuantity > 1 && (
                    <Badge variant="outline" className="mt-2 border-blue-300 text-blue-700 dark:text-blue-300">
                      x{defaultQuantity} padrao
                    </Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => onUseDish?.(dish)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
