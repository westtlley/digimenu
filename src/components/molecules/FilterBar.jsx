import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from 'lucide-react';

/**
 * FilterBar - Barra de filtros com seleção múltipla
 * @param {Object} props
 * @param {Array} props.filters - Array de objetos { id, label, value, options }
 * @param {Function} props.onChange - Callback de mudança (filterId, value)
 * @param {Function} props.onClear - Callback para limpar filtros
 * @param {number} props.activeCount - Número de filtros ativos
 */
export function FilterBar({ filters = [], onChange, onClear, activeCount = 0 }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {filters.map(filter => (
          <Select 
            key={filter.id}
            value={filter.value}
            onValueChange={(value) => onChange(filter.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {activeCount > 0 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map(filter => {
              if (filter.value === 'all' || !filter.value) return null;
              const selectedOption = filter.options?.find(opt => opt.value === filter.value);
              return (
                <Badge key={filter.id} variant="outline" className="gap-1">
                  {selectedOption?.label}
                  <button
                    onClick={() => onChange(filter.id, 'all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}