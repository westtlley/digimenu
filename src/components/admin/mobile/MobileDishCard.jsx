import React from 'react';
import { Pencil, Copy, Trash2, MoreVertical, Package, Star } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MobileDishCard({ 
  dish, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onToggleActive,
  onToggleHighlight,
  onToggleComplements,
  complementGroupsCount = 0,
  formatCurrency,
  canEdit = true
}) {
  const isOutOfStock = dish.stock !== null && dish.stock !== undefined && dish.stock <= 0;
  const hasDiscount = dish.original_price && dish.original_price > dish.price;
  const isInactive = dish.is_active === false;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform ${isInactive ? 'opacity-90' : ''}`}>
      <div className="flex items-center gap-3 p-3">
        {/* Image — preto e branco quando desativado */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
          {dish.image ? (
            <img 
              src={dish.image} 
              alt={dish.name} 
              className={`w-full h-full object-cover ${isInactive ? 'grayscale' : ''}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
              🍽️
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-red-500/90 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Esgotado</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base leading-tight line-clamp-1 flex-1">
              {dish.name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) {
                  onToggleHighlight(!dish.is_highlight);
                }
              }}
              disabled={!canEdit}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${
                dish.is_highlight 
                  ? 'bg-amber-100 text-amber-600' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              <Star className={`w-4 h-4 ${dish.is_highlight ? 'fill-amber-600' : ''}`} />
            </button>
          </div>
          
          {dish.description && (
            <p className="text-sm text-gray-500 line-clamp-1 mb-2">
              {dish.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1">
              {hasDiscount && (
                <span className="text-sm text-gray-400 line-through block">
                  {formatCurrency(dish.original_price)}
                </span>
              )}
              <span className={`font-bold text-lg ${hasDiscount ? 'text-green-600' : 'text-gray-900'}`}>
                {formatCurrency(dish.price)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Switch 
                checked={dish.is_active !== false} 
                onCheckedChange={(checked) => {
                  if (canEdit) {
                    onToggleActive(checked);
                  }
                }}
                disabled={!canEdit}
                className="data-[state=checked]:bg-green-500"
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Meta info and complements button */}
          <div className="flex items-center justify-between mt-1.5">
            {(dish.portion || dish.prep_time) && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {dish.portion && <span>{dish.portion}</span>}
                {dish.prep_time && <span>⏱️ {dish.prep_time}min</span>}
              </div>
            )}
            
            {onToggleComplements && (
              <button
                onClick={onToggleComplements}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors ml-auto"
              >
                <Package className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">{complementGroupsCount}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}