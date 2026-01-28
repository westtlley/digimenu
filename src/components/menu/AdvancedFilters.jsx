import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function AdvancedFilters({ filters, onFiltersChange, primaryColor, availableTags, tagLabels: customTagLabels }) {
  const [open, setOpen] = React.useState(false);

  const priceRanges = [
    { label: 'Até R$ 20', min: 0, max: 20 },
    { label: 'R$ 20 - R$ 40', min: 20, max: 40 },
    { label: 'R$ 40 - R$ 60', min: 40, max: 60 },
    { label: 'Acima de R$ 60', min: 60, max: 999999 },
  ];

  const tags = availableTags || ['vegetariano', 'vegano', 'sem_gluten', 'picante', 'fit'];
  const tagLabels = customTagLabels || {
    vegetariano: '🥗 Vegetariano',
    vegano: '🌱 Vegano',
    sem_gluten: '🌾 Sem Glúten',
    picante: '🌶️ Picante',
    fit: '💪 Fit'
  };

  const togglePriceRange = (range) => {
    onFiltersChange({
      ...filters,
      priceRange: filters.priceRange?.min === range.min ? null : range
    });
  };

  const toggleTag = (tag) => {
    const currentTags = filters.tags || [];
    onFiltersChange({
      ...filters,
      tags: currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag]
    });
  };

  const clearFilters = () => {
    onFiltersChange({ priceRange: null, tags: [] });
    setOpen(false);
  };

  const activeFiltersCount = (filters.priceRange ? 1 : 0) + (filters.tags?.length || 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Preço */}
          <div>
            <h3 className="font-medium mb-3">Faixa de Preço</h3>
            <div className="space-y-2">
              {priceRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => togglePriceRange(range)}
                  className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                    filters.priceRange?.min === range.min
                      ? 'border-2 text-white'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filters.priceRange?.min === range.min ? { 
                    backgroundColor: primaryColor,
                    borderColor: primaryColor 
                  } : {}}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-medium mb-3">Preferências Alimentares</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    filters.tags?.includes(tag)
                      ? 'border-2 text-white'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filters.tags?.includes(tag) ? { 
                    backgroundColor: primaryColor,
                    borderColor: primaryColor 
                  } : {}}
                >
                  {tagLabels[tag]}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={clearFilters}
            >
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
            <Button 
              className="flex-1 text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setOpen(false)}
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}