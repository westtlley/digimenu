import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AdminImagePickerDialog from './AdminImagePickerDialog';
import { getMediaUploadPreset } from './mediaUploadPresets';
import { mergeAdminMediaItems, readAdminMediaLibrary, registerAdminMediaItems } from './adminMediaLibrary';

export default function AdminMediaField({
  label,
  value,
  onChange,
  imageType = 'product',
  folder,
  title,
  description,
  existingImages = [],
  helperText,
  className,
  previewAlt = 'Preview da imagem',
  addLabel = 'Adicionar imagem',
  replaceLabel = 'Alterar imagem',
  removeLabel = 'Remover',
}) {
  const [open, setOpen] = useState(false);
  const preset = useMemo(() => getMediaUploadPreset(imageType), [imageType]);
  const isLandscape = preset.aspectRatio > 1.2;
  const referenceLabel = title || label || preset.title || preset.label;
  const sourceLabel = label || preset.label;

  useEffect(() => {
    if (!open) return;

    const itemsToRegister = [
      ...existingImages,
      value
        ? {
            url: value,
            type: imageType,
            reference: referenceLabel,
            source: sourceLabel,
            meta: preset.previewLabel,
          }
        : null,
    ].filter(Boolean);

    if (!itemsToRegister.length) return;

    registerAdminMediaItems(itemsToRegister, {
      fallbackType: imageType,
      fallbackReference: referenceLabel,
      fallbackSource: sourceLabel,
    });
  }, [existingImages, imageType, open, preset.previewLabel, referenceLabel, sourceLabel, value]);

  const libraryItems = useMemo(() => {
    return mergeAdminMediaItems(
      [
        readAdminMediaLibrary(),
        existingImages,
        value
          ? {
              url: value,
              type: imageType,
              reference: referenceLabel,
              source: sourceLabel,
              meta: preset.previewLabel,
            }
          : null,
      ],
      {
        fallbackType: imageType,
        fallbackReference: referenceLabel,
        fallbackSource: sourceLabel,
      }
    );
  }, [existingImages, imageType, preset.previewLabel, referenceLabel, sourceLabel, value]);

  return (
    <div className={cn('space-y-3', className)}>
      {label ? <Label>{label}</Label> : null}

      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className={cn('flex gap-4', isLandscape ? 'flex-col' : 'flex-col sm:flex-row sm:items-center')}>
          <div
            className={cn(
              'overflow-hidden rounded-2xl border border-border bg-background shadow-sm',
              isLandscape ? 'w-full max-w-sm' : 'h-24 w-24 sm:h-28 sm:w-28'
            )}
            style={isLandscape ? { aspectRatio: String(preset.aspectRatio) } : undefined}
          >
            {value ? (
              <img src={value} alt={previewAlt} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <ImagePlus className="h-5 w-5" />
                <span>Sem imagem</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{preset.previewLabel}</Badge>
              <Badge variant="outline">{preset.recommendedSize}</Badge>
              <Badge variant="outline">{preset.ratioLabel}</Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Recomendado: <span className="font-medium text-foreground">{preset.recommendedSize}</span> ({preset.ratioLabel})
              </p>
              <p>
                Area visivel principal: <span className="font-medium text-foreground">{preset.focusLabel}</span>
              </p>
              <p>Evite cortar elementos importantes e prefira imagens limpas e bem iluminadas.</p>
              {helperText ? <p>{helperText}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(true)}>
                {value ? replaceLabel : addLabel}
              </Button>
              {value ? (
                <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => onChange?.('')}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {removeLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <AdminImagePickerDialog
        open={open}
        onOpenChange={setOpen}
        imageType={imageType}
        title={title}
        description={description}
        folder={folder || preset.folder}
        existingImages={libraryItems}
        onSelectImage={onChange}
      />
    </div>
  );
}
