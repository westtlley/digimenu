import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Plus, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * CategoryHeader - Cabeçalho de categoria com ações
 * @param {Object} props
 * @param {Object} props.category - Dados da categoria
 * @param {number} props.itemCount - Número de itens na categoria
 * @param {boolean} props.isExpanded - Se está expandido
 * @param {Function} props.onToggle - Callback para expandir/recolher
 * @param {Function} props.onAddItem - Callback para adicionar item
 * @param {Function} props.onEdit - Callback para editar
 * @param {Function} props.onDuplicate - Callback para duplicar
 * @param {Function} props.onDelete - Callback para deletar
 */
export function CategoryHeader({
  category,
  itemCount = 0,
  isExpanded = true,
  onToggle,
  onAddItem,
  onEdit,
  onDuplicate,
  onDelete
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border-b cursor-pointer hover:bg-gray-50">
      <div className="flex items-center gap-3" onClick={onToggle}>
        <h2 className="font-bold text-lg">{category.name}</h2>
        <Badge variant="secondary" className="text-xs">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </Badge>
        {category.description && (
          <span className="text-sm text-gray-500 hidden md:inline">
            {category.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAddItem?.();
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              Editar categoria
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              Duplicar categoria
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              Remover categoria
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5" onClick={onToggle} />
        ) : (
          <ChevronDown className="w-5 h-5" onClick={onToggle} />
        )}
      </div>
    </div>
  );
}