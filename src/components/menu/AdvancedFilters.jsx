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
import { useLanguage } from '@/i18n/LanguageContext';

export default function AdvancedFilters({ filters, onFiltersChange, primaryColor, availableTags, tagLabels: customTagLabels }) {
  const { t } = useLanguage();
  const filtersText = t('filters');
  const [open, setOpen] = React.useState(false);

  const priceRanges = [
    { label: filtersText.priceRanges.upTo20, min: 0, max: 20 },
    { label: filtersText.priceRanges.from20To40, min: 20, max: 40 },
    { label: filtersText.priceRanges.from40To60, min: 40, max: 60 },
    { label: filtersText.priceRanges.above60, min: 60, max: 999999 },
  ];

  const tags = availableTags || ['vegetariano', 'vegano', 'sem_gluten', 'picante', 'fit'];
  const tagLabels = customTagLabels || {
    vegetariano: filtersText.tags.vegetariano,
    vegano: filtersText.tags.vegano,
    sem_gluten: filtersText.tags.sem_gluten,
    picante: filtersText.tags.picante,
    fit: filtersText.tags.fit,
  };

  const togglePriceRange = (range) => {
    onFiltersChange({
      ...filters,
      priceRange: filters.priceRange?.min === range.min ? null : range,
    });
  };

  const toggleTag = (tag) => {
    const currentTags = filters.tags || [];
    onFiltersChange({
      ...filters,
      tags: currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag],
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
        <Button variant="outline" size="sm" className="relative h-auto min-h-10 whitespace-normal px-3 py-2 text-left">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          {filtersText.button}
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
          <SheetTitle>{filtersText.advancedTitle}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-medium mb-3">{filtersText.priceRangeTitle}</h3>
            <div className="space-y-2">
              {priceRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => togglePriceRange(range)}
                  className={`w-full rounded-lg border px-4 py-2 text-left transition-colors ${
                    filters.priceRange?.min === range.min
                      ? 'border-2 text-white'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filters.priceRange?.min === range.min
                    ? {
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                      }
                    : {}}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">{filtersText.dietaryPreferencesTitle}</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    filters.tags?.includes(tag)
                      ? 'border-2 text-white'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  style={filters.tags?.includes(tag)
                    ? {
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                      }
                    : {}}
                >
                  {tagLabels[tag]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
            <Button
              variant="outline"
              className="h-auto min-h-10 flex-1 whitespace-normal py-2"
              onClick={clearFilters}
            >
              <X className="w-4 h-4 mr-2" />
              {filtersText.clear}
            </Button>
            <Button
              className="h-auto min-h-10 flex-1 whitespace-normal py-2 text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setOpen(false)}
            >
              {filtersText.apply}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
