import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ComboModal({ isOpen, onClose, onSubmit, combo, dishes = [] }) {
  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const [formData, setFormData] = useState(combo || {
    name: '',
    description: '',
    image: '',
    type: 'bundle_discount',
    dishes: [],
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addDishToCombo = (dishId) => {
    const dish = safeDishes.find(d => d.id === dishId);
    if (!dish) return;
    
    const alreadyAdded = formData.dishes.find(d => d.dish_id === dishId);
    if (alreadyAdded) {
      setFormData(prev => ({
        ...prev,
        dishes: prev.dishes.map(d => 
          d.dish_id === dishId ? { ...d, quantity: d.quantity + 1 } : d
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dishes: [...prev.dishes, { dish_id: dishId, quantity: 1 }]
      }));
    }

    calculatePrices(formData.dishes, dishId);
  };

  const removeDishFromCombo = (dishId) => {
    setFormData(prev => ({
      ...prev,
      dishes: prev.dishes.filter(d => d.dish_id !== dishId)
    }));
  };

  const calculatePrices = (comboDishes, newDishId = null) => {
    const dishesToCalc = newDishId 
      ? [...comboDishes, { dish_id: newDishId, quantity: 1 }]
      : comboDishes;

    const totalPrice = dishesToCalc.reduce((sum, cd) => {
      const dish = safeDishes.find(d => d.id === cd.dish_id);
      return sum + (dish?.price || 0) * cd.quantity;
    }, 0);

    setFormData(prev => ({
      ...prev,
      original_price: totalPrice
    }));
  };

  const getComboTypeLabel = (type) => {
    const labels = {
      'bundle_discount': 'Desconto no Combo',
      'buy_x_pay_y': 'Leve X Pague Y',
      'percentage_off': 'Percentual de Desconto',
      'fixed_discount': 'Desconto Fixo'
    };
    return labels[type] || type;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{combo ? 'Editar Combo' : 'Criar Combo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Combo *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                placeholder="Ex: Combo Executivo"
                required 
              />
            </div>

            <div className="col-span-2">
              <Label>Tipo de Combo *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bundle_discount">🎁 Desconto no Combo</SelectItem>
                  <SelectItem value="buy_x_pay_y">🔥 Leve X Pague Y</SelectItem>
                  <SelectItem value="percentage_off">💰 Percentual de Desconto</SelectItem>
                  <SelectItem value="fixed_discount">💵 Desconto Fixo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.type === 'bundle_discount' && 'Junte pratos e ofereça por um preço especial'}
                {formData.type === 'buy_x_pay_y' && 'Leve mais, pague menos (ex: Leve 3, Pague 2)'}
                {formData.type === 'percentage_off' && 'Desconto em % sobre o total'}
                {formData.type === 'fixed_discount' && 'Desconto em R$ sobre o total'}
              </p>
            </div>
          </div>

          {/* Seleção de Pratos */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <Label className="mb-3 block">Pratos do Combo *</Label>
            <Select onValueChange={addDishToCombo}>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar prato ao combo" />
              </SelectTrigger>
              <SelectContent>
                {safeDishes.filter(d => d.is_active !== false).map(dish => (
                  <SelectItem key={dish.id} value={dish.id}>
                    {dish.name} - {formatCurrency(dish.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-3 space-y-2">
              {formData.dishes.map((cd) => {
                const dish = safeDishes.find(d => d.id === cd.dish_id);
                if (!dish) return null;
                return (
                  <div key={cd.dish_id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {dish.image && <img src={dish.image} alt="" className="w-10 h-10 rounded object-cover" />}
                      <div>
                        <p className="text-sm font-medium">{dish.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(dish.price)} x {cd.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          dishes: prev.dishes.map(d => 
                            d.dish_id === cd.dish_id ? { ...d, quantity: Math.max(1, d.quantity - 1) } : d
                          )
                        }))}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{cd.quantity}</span>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          dishes: prev.dishes.map(d => 
                            d.dish_id === cd.dish_id ? { ...d, quantity: d.quantity + 1 } : d
                          )
                        }))}
                      >
                        +
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeDishFromCombo(cd.dish_id)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configurações de Desconto */}
          {formData.type === 'buy_x_pay_y' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Leve (quantidade)</Label>
                <Input 
                  type="number" 
                  min="2"
                  value={formData.buy_quantity} 
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_quantity: parseInt(e.target.value) || 2 }))} 
                />
              </div>
              <div>
                <Label>Pague (quantidade)</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={formData.pay_quantity} 
                  onChange={(e) => setFormData(prev => ({ ...prev, pay_quantity: parseInt(e.target.value) || 1 }))} 
                />
              </div>
            </div>
          )}

          {(formData.type === 'percentage_off' || formData.type === 'fixed_discount') && (
            <div>
              <Label>Valor do Desconto</Label>
              <Input 
                type="number" 
                step="0.01"
                value={formData.discount_value} 
                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))} 
                placeholder={formData.type === 'percentage_off' ? 'Ex: 20 (para 20%)' : 'Ex: 10.00'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço Original (automático)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={formData.original_price} 
                onChange={(e) => setFormData(prev => ({ ...prev, original_price: parseFloat(e.target.value) || 0 }))} 
              />
            </div>
            <div>
              <Label>Preço do Combo *</Label>
              <Input 
                type="number" 
                step="0.01"
                value={formData.combo_price} 
                onChange={(e) => setFormData(prev => ({ ...prev, combo_price: parseFloat(e.target.value) || 0 }))} 
                required
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              rows={2}
              placeholder="Descreva o combo..."
            />
          </div>

          <div>
            <Label>Válido até</Label>
            <Input 
              type="date"
              value={formData.valid_until} 
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))} 
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <Label>Destacar no cardápio</Label>
            <Switch 
              checked={formData.is_highlight} 
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_highlight: checked }))} 
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              {combo ? 'Salvar' : 'Criar Combo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}