import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X, UtensilsCrossed, Pizza, Wine } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

/**
 * Combo unificado: Pratos + Bebidas OU Pizzas + Bebidas (nunca Pizzas + Pratos).
 * Suporta ação: adicionar ao carrinho ou substituir item.
 */
export default function ComboModalUnified({
  isOpen,
  onClose,
  onSubmit,
  combo,
  dishes = [],
  pizzas = [],
  beverages = [],
}) {
  const safeDishes = (dishes || []).filter(d => d.product_type !== 'pizza' && d.product_type !== 'beverage');
  const safePizzas = (pizzas || []).filter(d => d.product_type === 'pizza');
  const safeBeverages = (beverages || []).filter(d => d.product_type === 'beverage');
  const hasPizzas = safePizzas.length > 0;
  const hasBeverages = safeBeverages.length > 0;

  const [formData, setFormData] = useState(combo || {
    name: '',
    description: '',
    type: 'bundle_discount',
    combo_mode: 'dishes_beverages',
    combo_action: 'add',
    dishes: [],
    beverages: [],
    original_price: 0,
    combo_price: 0,
    discount_type: 'percentage',
    discount_value: 0,
    buy_quantity: 3,
    pay_quantity: 2,
    is_active: true,
    is_highlight: false,
    valid_until: '',
  });

  React.useEffect(() => {
    if (combo) {
      setFormData({
        ...combo,
        dishes: combo.dishes || [],
        beverages: combo.beverages || [],
        combo_mode: combo.combo_mode || 'dishes_beverages',
        combo_action: combo.combo_action || 'add',
      });
    } else {
      setFormData({
        name: '', description: '', type: 'bundle_discount',
        combo_mode: hasPizzas ? 'pizzas_beverages' : 'dishes_beverages',
        combo_action: 'add',
        dishes: [], beverages: [],
        original_price: 0, combo_price: 0,
        discount_type: 'percentage', discount_value: 0,
        buy_quantity: 3, pay_quantity: 2,
        is_active: true, is_highlight: false, valid_until: '',
      });
    }
  }, [combo, isOpen, hasPizzas]);

  const mainItems = formData.combo_mode === 'pizzas_beverages' ? safePizzas : safeDishes;
  const recalcOriginal = (dishesList, beveragesList) => {
    const mainList = formData.combo_mode === 'pizzas_beverages' ? safePizzas : safeDishes;
    const mainTotal = (dishesList || []).reduce((s, cd) => {
      const d = mainList.find(m => m.id === cd.dish_id);
      const price = d?.pizza_config?.sizes?.[0]?.price_tradicional ?? d?.price ?? 0;
      return s + (price || 0) * cd.quantity;
    }, 0);
    const bevTotal = (beveragesList || []).reduce((s, cd) => {
      const d = safeBeverages.find(b => b.id === cd.dish_id);
      return s + (d?.price || 0) * cd.quantity;
    }, 0);
    setFormData(prev => ({ ...prev, original_price: mainTotal + bevTotal }));
  };

  const addMainItem = (id) => {
    const list = formData.dishes || [];
    const exists = list.find(d => d.dish_id === id);
    let newDishes;
    if (exists) {
      newDishes = list.map(d => d.dish_id === id ? { ...d, quantity: d.quantity + 1 } : d);
    } else {
      newDishes = [...list, { dish_id: id, quantity: 1 }];
    }
    setFormData(prev => ({ ...prev, dishes: newDishes }));
    recalcOriginal(newDishes, formData.beverages);
  };
  const addBeverage = (id) => {
    const list = formData.beverages || [];
    const exists = list.find(d => d.dish_id === id);
    let newBeverages;
    if (exists) {
      newBeverages = list.map(d => d.dish_id === id ? { ...d, quantity: d.quantity + 1 } : d);
    } else {
      newBeverages = [...list, { dish_id: id, quantity: 1 }];
    }
    setFormData(prev => ({ ...prev, beverages: newBeverages }));
    recalcOriginal(formData.dishes, newBeverages);
  };
  const removeMainItem = (id) => {
    const newDishes = (formData.dishes || []).filter(d => d.dish_id !== id);
    setFormData(prev => ({ ...prev, dishes: newDishes }));
    recalcOriginal(newDishes, formData.beverages);
  };
  const removeBeverage = (id) => {
    const newBeverages = (formData.beverages || []).filter(d => d.dish_id !== id);
    setFormData(prev => ({ ...prev, beverages: newBeverages }));
    recalcOriginal(formData.dishes, newBeverages);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{combo ? 'Editar Combo' : 'Criar Combo'}</span>
            <Badge variant="outline">Promoções</Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Combo *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Combo Executivo" required />
            </div>

            <div>
              <Label>Tipo de Combinação</Label>
              <Select value={formData.combo_mode} onValueChange={(v) => setFormData(prev => ({ ...prev, combo_mode: v, dishes: [] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dishes_beverages"><UtensilsCrossed className="w-4 h-4 mr-2 inline" /> Pratos + Bebidas</SelectItem>
                  {hasPizzas && <SelectItem value="pizzas_beverages"><Pizza className="w-4 h-4 mr-2 inline" /> Pizzas + Bebidas</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ação no Carrinho</Label>
              <Select value={formData.combo_action} onValueChange={(v) => setFormData(prev => ({ ...prev, combo_action: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Adicionar combo ao pedido</SelectItem>
                  <SelectItem value="replace">Substituir item pelo combo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Itens principais (Pratos ou Pizzas) */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
            <Label className="mb-2 block">{formData.combo_mode === 'pizzas_beverages' ? 'Pizzas' : 'Pratos'}</Label>
            <Select onValueChange={addMainItem}>
              <SelectTrigger><SelectValue placeholder={`Adicionar ${formData.combo_mode === 'pizzas_beverages' ? 'pizza' : 'prato'}`} /></SelectTrigger>
              <SelectContent>
                {mainItems.filter(d => d.is_active !== false).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name} - {formatCurrency(d.pizza_config?.sizes?.[0]?.price_tradicional ?? d.price)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 space-y-2">
              {(formData.dishes || []).map((cd) => {
                const d = mainItems.find(m => m.id === cd.dish_id);
                if (!d) return null;
                const price = d.pizza_config?.sizes?.[0]?.price_tradicional ?? d.price;
                return (
                  <div key={cd.dish_id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {d.image && <img src={d.image} alt="" className="w-10 h-10 rounded object-cover" />}
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(price)} x {cd.quantity}</p>
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeMainItem(cd.dish_id)}><X className="w-4 h-4 text-red-500" /></Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bebidas */}
          {hasBeverages && (
            <div className="border rounded-lg p-4 bg-cyan-50/50 dark:bg-cyan-900/10">
              <Label className="mb-2 block flex items-center gap-2"><Wine className="w-4 h-4" /> Bebidas</Label>
              <Select onValueChange={addBeverage}>
                <SelectTrigger><SelectValue placeholder="Adicionar bebida" /></SelectTrigger>
                <SelectContent>
                  {safeBeverages.filter(d => d.is_active !== false).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} {d.volume_ml ? `(${d.volume_ml}ml)` : ''} - {formatCurrency(d.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-2">
                {(formData.beverages || []).map((cd) => {
                  const d = safeBeverages.find(b => b.id === cd.dish_id);
                  if (!d) return null;
                  return (
                    <div key={cd.dish_id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {d.image && <img src={d.image} alt="" className="w-10 h-10 rounded object-cover" />}
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(d.price)} x {cd.quantity}</p>
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeBeverage(cd.dish_id)}><X className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço Original</Label>
              <Input type="number" step="0.01" value={formData.original_price} readOnly className="bg-gray-100" />
            </div>
            <div>
              <Label>Preço do Combo *</Label>
              <Input type="number" step="0.01" value={formData.combo_price} onChange={(e) => setFormData(prev => ({ ...prev, combo_price: parseFloat(e.target.value) || 0 }))} required />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Descreva o combo..." />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <Label>Destacar no cardápio</Label>
            <Switch checked={formData.is_highlight} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_highlight: v }))} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 bg-orange-500">{combo ? 'Salvar' : 'Criar Combo'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
