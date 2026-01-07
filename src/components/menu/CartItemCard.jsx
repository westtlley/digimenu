import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CartItemCard({ item, index, onRemove }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
          <h3 className="font-semibold text-lg">{item.dish?.name || 'Marmita'}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 -mt-1 -mr-2"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600">
        {item.rice && (
          <div className="flex justify-between">
            <span>Arroz:</span>
            <span className="font-medium text-gray-800">{item.rice.name}</span>
          </div>
        )}
        {item.bean && (
          <div className="flex justify-between">
            <span>Feijão:</span>
            <span className="font-medium text-gray-800">{item.bean.name}</span>
          </div>
        )}
        {item.garnish?.length > 0 && (
          <div className="flex justify-between">
            <span>Guarnições:</span>
            <span className="font-medium text-gray-800">
              {item.garnish.map(g => g.name).join(', ')}
            </span>
          </div>
        )}
        {item.salad && (
          <div className="flex justify-between">
            <span>Salada:</span>
            <span className="font-medium text-gray-800">{item.salad.name}</span>
          </div>
        )}
        {item.drink && (
          <div className="flex justify-between">
            <span>Bebida:</span>
            <span className="font-medium text-gray-800">{item.drink.name}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t flex justify-between items-center">
        <span className="text-gray-500 text-sm">Valor:</span>
        <span className="font-bold text-lg text-green-600">
          {formatCurrency(item.totalPrice)}
        </span>
      </div>
    </div>
  );
}