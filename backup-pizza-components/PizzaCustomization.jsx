import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Minus, Plus } from 'lucide-react';

export default function PizzaCustomization({ flavor, onCustomize }) {
  const [removedIngredients, setRemovedIngredients] = useState([]);
  const [extraIngredients, setExtraIngredients] = useState({});

  const toggleRemove = (ingredientName) => {
    setRemovedIngredients(prev => 
      prev.includes(ingredientName) 
        ? prev.filter(i => i !== ingredientName)
        : [...prev, ingredientName]
    );
  };

  const adjustExtra = (ingredientName, delta, price) => {
    setExtraIngredients(prev => {
      const current = prev[ingredientName] || 0;
      const newValue = Math.max(0, Math.min(3, current + delta));
      if (newValue === 0) {
        const { [ingredientName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ingredientName]: newValue };
    });
  };

  const getTotalExtraPrice = () => {
    return Object.entries(extraIngredients).reduce((total, [name, qty]) => {
      const ingredient = flavor.ingredients?.find(i => i.name === name);
      return total + (ingredient?.extra_price || 0) * qty;
    }, 0);
  };

  const applyCustomization = () => {
    onCustomize({
      removed: removedIngredients,
      extra: extraIngredients,
      extraPrice: getTotalExtraPrice()
    });
  };

  if (!flavor.ingredients || flavor.ingredients.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Este sabor não possui ingredientes personalizáveis
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h4 className="font-medium text-sm mb-3">Personalize {flavor.name}</h4>
        
        <div className="space-y-2">
          {flavor.ingredients.map((ingredient, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                {ingredient.removable && (
                  <Checkbox
                    checked={removedIngredients.includes(ingredient.name)}
                    onCheckedChange={() => toggleRemove(ingredient.name)}
                  />
                )}
                <span className="text-sm flex-1">{ingredient.name}</span>
                {!ingredient.removable && (
                  <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                )}
              </div>

              {ingredient.extra_price > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => adjustExtra(ingredient.name, -1, ingredient.extra_price)}
                    disabled={(extraIngredients[ingredient.name] || 0) === 0}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {extraIngredients[ingredient.name] || 0}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => adjustExtra(ingredient.name, 1, ingredient.extra_price)}
                    disabled={(extraIngredients[ingredient.name] || 0) >= 3}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-gray-500 ml-2">
                    +{formatCurrency(ingredient.extra_price)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {getTotalExtraPrice() > 0 && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-orange-900">Extras</span>
            <span className="font-bold text-orange-600">{formatCurrency(getTotalExtraPrice())}</span>
          </div>
        )}

        {removedIngredients.length > 0 && (
          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Ingredientes removidos:</p>
            <div className="flex flex-wrap gap-1">
              {removedIngredients.map(name => (
                <Badge key={name} variant="outline" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={applyCustomization}
        className="w-full"
      >
        Aplicar Personalização
      </Button>
    </div>
  );
}