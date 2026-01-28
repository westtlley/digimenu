import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SearchBar - Barra de pesquisa com botão de limpar
 * @param {Object} props
 * @param {string} props.value - Valor da busca
 * @param {Function} props.onChange - Callback de mudança
 * @param {string} props.placeholder - Texto placeholder
 * @param {Function} props.onClear - Callback para limpar
 */
export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Buscar...', 
  onClear 
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={onClear}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}