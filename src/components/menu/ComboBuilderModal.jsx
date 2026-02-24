import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

const normalizeDishType = (dish) => {
  const t = (dish?.product_type || '').toString().toLowerCase();
  if (t === 'pizza') return 'pizza';
  if (t === 'beverage') return 'beverage';
  return 'dish';
};

const toCents = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

const fromCents = (cents) => {
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
};

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export default function ComboBuilderModal({
  open,
  onOpenChange,
  combo,
  dishes = [],
  categories = [],
  beverageCategories = [],
  pizzaCategories = [],
  primaryColor,
  onAddToCart,
}) {
  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBeverageCategories = Array.isArray(beverageCategories) ? beverageCategories : [];
  const safePizzaCategories = Array.isArray(pizzaCategories) ? pizzaCategories : [];

  const groups = Array.isArray(combo?.combo_groups) ? combo.combo_groups : [];

  const initialSelections = useMemo(() => {
    const result = {};
    groups.forEach((g) => {
      const qty = Math.max(1, parseInt(g?.required_quantity, 10) || 1);
      result[g.id] = Array.from({ length: qty }, () => '');
    });
    return result;
  }, [combo?.id]);

  const [selections, setSelections] = useState(initialSelections);

  React.useEffect(() => {
    setSelections(initialSelections);
  }, [initialSelections]);

  const getGroupOptions = (g) => {
    const allowedTypes = Array.isArray(g?.allowed_types) ? g.allowed_types : [];
    const allowedCategoryIds = (Array.isArray(g?.allowed_category_ids) ? g.allowed_category_ids : []).map((cid) => {
      const s = (cid || '').toString();
      if (!s) return '';
      if (s.startsWith('c_') || s.startsWith('bc_') || s.startsWith('pc_')) return s;
      return `c_${s}`;
    }).filter(Boolean);
    const allowedDishIds = Array.isArray(g?.allowed_dish_ids) ? g.allowed_dish_ids : [];

    return safeDishes
      .filter((d) => d?.is_active !== false)
      .filter((d) => {
        const type = normalizeDishType(d);
        if (allowedTypes.length > 0 && !allowedTypes.includes(type)) return false;
        if (allowedDishIds.length > 0 && !allowedDishIds.includes(d.id)) return false;
        if (allowedCategoryIds.length > 0) {
          if (type === 'dish') {
            const dishCategoryId = d.category_id || d.categoryId || null;
            if (!dishCategoryId) return false;
            if (!allowedCategoryIds.includes(`c_${dishCategoryId}`)) return false;
          } else if (type === 'beverage') {
            const bevCategoryId = d.category_id || d.categoryId || null;
            if (!bevCategoryId) return false;
            if (!allowedCategoryIds.includes(`bc_${bevCategoryId}`)) return false;
          } else {
            const pizzaCategoryId = d.pizza_category_id || d.pizzaCategoryId || null;
            if (!pizzaCategoryId) return false;
            if (!allowedCategoryIds.includes(`pc_${pizzaCategoryId}`)) return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  };

  const canSubmit = useMemo(() => {
    if (!combo) return false;
    if (groups.length === 0) return false;
    return groups.every((g) => {
      const slots = Array.isArray(selections?.[g.id]) ? selections[g.id] : [];
      return slots.length > 0 && slots.every((id) => !!id);
    });
  }, [combo?.id, groups, selections]);

  const selectedSummaryByGroup = useMemo(() => {
    const map = {};
    groups.forEach((g) => {
      const slots = Array.isArray(selections?.[g.id]) ? selections[g.id] : [];
      const compact = slots.filter(Boolean).reduce((acc, dishId) => {
        const idx = acc.findIndex((x) => x.dish_id === dishId);
        if (idx >= 0) {
          acc[idx] = { ...acc[idx], quantity: (acc[idx].quantity || 1) + 1 };
          return acc;
        }
        return [...acc, { dish_id: dishId, quantity: 1 }];
      }, []);
      map[g.id] = compact;
    });
    return map;
  }, [groups, selections]);

  const handleAdd = () => {
    if (!combo) return;

    const payloadGroups = groups.map((g) => {
      const slots = Array.isArray(selections?.[g.id]) ? selections[g.id] : [];
      const items = slots
        .filter(Boolean)
        .map((dishId) => ({ dish_id: dishId, quantity: 1 }));

      const compactItems = items.reduce((acc, cur) => {
        const idx = acc.findIndex((x) => x.dish_id === cur.dish_id);
        if (idx >= 0) {
          acc[idx] = { ...acc[idx], quantity: (acc[idx].quantity || 1) + 1 };
          return acc;
        }
        return [...acc, cur];
      }, []);

      return {
        id: g.id,
        title: g.title,
        required_quantity: g.required_quantity,
        items: compactItems,
      };
    });

    const comboPrice = fromCents(toCents(combo.combo_price));

    const virtualDish = {
      id: `combo_${combo.id}`,
      name: combo.name,
      description: combo.description,
      image: combo.image,
      product_type: 'combo',
      price: comboPrice,
      is_active: combo.is_active,
    };

    onAddToCart?.({
      dish: virtualDish,
      selections: {
        combo_id: combo.id,
        combo_groups: payloadGroups,
      },
      totalPrice: comboPrice,
      quantity: 1,
    });

    onOpenChange?.(false);
  };

  const titleColor = primaryColor || '#f97316';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{combo?.name || 'Montar combo'}</span>
            <span className="text-sm font-bold" style={{ color: titleColor }}>
              {formatCurrency(fromCents(toCents(combo?.combo_price)))}
            </span>
          </DialogTitle>
        </DialogHeader>

        {groups.length === 0 ? (
          <div className="text-sm text-muted-foreground">Este combo ainda não possui grupos configurados.</div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => {
              const qty = Math.max(1, parseInt(g?.required_quantity, 10) || 1);
              const options = getGroupOptions(g);
              const compactSelected = Array.isArray(selectedSummaryByGroup?.[g.id]) ? selectedSummaryByGroup[g.id] : [];

              return (
                <div key={g.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold">{g.title || 'Escolha seus itens'}</p>
                      <p className="text-xs text-muted-foreground">Escolha {qty}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {Array.from({ length: qty }).map((_, idx) => {
                      const value = selections?.[g.id]?.[idx] || '';
                      return (
                        <div key={`${g.id}_${idx}`}>
                          <Label className="text-xs">Opção {idx + 1}</Label>
                          <Select
                            value={value}
                            onValueChange={(v) => {
                              setSelections((prev) => {
                                const prevSlots = Array.isArray(prev?.[g.id]) ? prev[g.id] : Array.from({ length: qty }, () => '');
                                const nextSlots = [...prevSlots];

                                if (g.allow_repeat === false) {
                                  if (nextSlots.some((x, i) => i !== idx && x === v)) return prev;
                                }

                                nextSlots[idx] = v;
                                return { ...prev, [g.id]: nextSlots };
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((d) => {
                                const type = normalizeDishType(d);
                                const cat = type === 'beverage'
                                  ? safeBeverageCategories.find((c) => c.id === d.category_id)
                                  : (type === 'pizza'
                                      ? safePizzaCategories.find((c) => c.id === d.pizza_category_id)
                                      : safeCategories.find((c) => c.id === d.category_id));
                                const price = d?.pizza_config?.sizes?.[0]?.price_tradicional ?? d?.price ?? 0;
                                return (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name} - {formatCurrency(price)}{cat?.name ? ` · ${cat.name}` : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>

                  {compactSelected.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {compactSelected.map((it) => {
                        const d = safeDishes.find((x) => x.id === it.dish_id);
                        if (!d) return null;
                        const price = d?.pizza_config?.sizes?.[0]?.price_tradicional ?? d?.price ?? 0;
                        return (
                          <div key={it.dish_id} className="flex items-center justify-between bg-background/40 p-2 rounded border">
                            <div className="flex items-center gap-2">
                              {d.image && <img src={d.image} alt="" className="w-10 h-10 rounded object-cover" />}
                              <div>
                                <p className="text-sm font-medium">{d.name}</p>
                                <p className="text-xs text-muted-foreground">{formatCurrency(price)} x {it.quantity}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelections((prev) => {
                                  const prevSlots = Array.isArray(prev?.[g.id]) ? prev[g.id] : [];
                                  const idxToRemove = prevSlots.findIndex((x) => x === it.dish_id);
                                  if (idxToRemove < 0) return prev;
                                  const nextSlots = [...prevSlots];
                                  nextSlots[idxToRemove] = '';
                                  return { ...prev, [g.id]: nextSlots };
                                });
                              }}
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange?.(false)}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" disabled={!canSubmit} onClick={handleAdd}>
                Adicionar combo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
