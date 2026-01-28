import React from 'react';
import { Card, CardContent } from '../atoms/Card';
import { PriceDisplay } from '../atoms/PriceDisplay';
import { StatusBadge } from '../atoms/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * DishCard - Card de exibição de prato
 * @param {Object} props
 * @param {Object} props.dish - Dados do prato
 * @param {Function} props.onSelect - Callback ao selecionar o prato
 * @param {boolean} props.showActions - Se deve exibir botões de ação
 */
export function DishCard({ dish, onSelect, showActions = true }) {
  const isOutOfStock = dish.stock !== null && dish.stock !== undefined && dish.stock <= 0;

  return (
    <Card 
      hover={!isOutOfStock}
      onClick={() => !isOutOfStock && onSelect?.(dish)}
      className={isOutOfStock ? 'opacity-60' : ''}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {dish.image ? (
          <img 
            src={dish.image} 
            alt={dish.name} 
            className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🍽️
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {isOutOfStock && (
            <StatusBadge status="error">Esgotado</StatusBadge>
          )}
          {dish.is_new && (
            <Badge className="bg-green-500 text-white">✨ Novo</Badge>
          )}
          {dish.is_popular && (
            <Badge className="bg-purple-500 text-white">🔥 Popular</Badge>
          )}
        </div>
      </div>

      <CardContent>
        <h3 className="font-bold text-base mb-1">{dish.name}</h3>
        {dish.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {dish.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <PriceDisplay 
            value={dish.price}
            originalValue={dish.original_price}
            size="lg"
          />
          
          {showActions && !isOutOfStock && (
            <Button 
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(dish);
              }}
            >
              Adicionar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}