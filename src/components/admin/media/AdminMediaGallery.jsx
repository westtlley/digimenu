import React from 'react';
import { Check, Images } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getMediaUploadPreset } from './mediaUploadPresets';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
});

export default function AdminMediaGallery({
  items = [],
  selectedUrl,
  onSelect,
  emptyTitle = 'Nenhuma imagem encontrada',
  emptyDescription = 'Tente outro filtro ou envie uma nova imagem.',
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Images className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-foreground">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((image) => {
        const isSelected = selectedUrl === image.url;
        const preset = getMediaUploadPreset(image.type);
        const updatedAtLabel = image.updatedAt ? dateFormatter.format(new Date(image.updatedAt)) : null;

        return (
          <button
            key={image.url}
            type="button"
            onClick={() => onSelect?.(image.url)}
            aria-pressed={isSelected}
            className={cn(
              'group relative overflow-hidden rounded-2xl border bg-background text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
              isSelected
                ? 'border-primary shadow-md ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40 hover:shadow-sm'
            )}
          >
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex gap-2">
              <Badge
                variant={isSelected ? 'default' : 'secondary'}
                className={cn(
                  'transition-colors',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'
                )}
              >
                {isSelected ? 'Selecionada' : 'Selecionar'}
              </Badge>
            </div>

            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.label || 'Imagem da biblioteca'}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-200',
                  isSelected ? 'scale-[1.02]' : 'group-hover:scale-[1.02]'
                )}
              />
            </div>

            <div className="space-y-3 p-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{preset.label}</Badge>
                {image.source ? <Badge variant="outline">{image.source}</Badge> : null}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {image.label || 'Imagem salva'}
                  </p>
                  {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                </div>
                {image.meta ? <p className="line-clamp-2 text-xs text-muted-foreground">{image.meta}</p> : null}
                {updatedAtLabel ? (
                  <p className="text-[11px] text-muted-foreground">Ultimo uso: {updatedAtLabel}</p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
