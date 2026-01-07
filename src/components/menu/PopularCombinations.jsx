import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from 'lucide-react';

export default function PopularCombinations({ pizza, onSelectCombination }) {
  const combinations = pizza?.pizza_config?.popular_combinations || [];
  const flavors = pizza?.pizza_config?.flavors || [];

  if (combinations.length === 0) return null;

  const topCombinations = combinations.slice(0, 3);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-base">Combinações Mais Pedidas</h3>
      </div>
      
      <div className="grid gap-2">
        {topCombinations.map((combo, idx) => {
          const comboFlavors = combo.flavor_ids
            .map(id => flavors.find(f => f.id === id))
            .filter(Boolean);

          if (comboFlavors.length === 0) return null;

          return (
            <button
              key={idx}
              onClick={() => onSelectCombination(combo.flavor_ids)}
              className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-left hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-sm">
                      {comboFlavors.map(f => f.name).join(' + ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {combo.count} pedido{combo.count > 1 ? 's' : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs bg-white">
                  Selecionar
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}