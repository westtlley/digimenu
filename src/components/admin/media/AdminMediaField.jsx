import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import AdminImagePickerDialog from './AdminImagePickerDialog';
import { getMediaUploadPreset } from './mediaUploadPresets';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  inferAdminMediaModule,
  mergeAdminMediaItems,
  readAdminMediaLibrary,
  registerAdminMediaItems,
  syncAdminMediaItems,
} from './adminMediaLibrary';

export default function AdminMediaField({
  label,
  value,
  onChange,
  imageType = 'product',
  folder,
  mediaModule,
  title,
  description,
  existingImages = [],
  helperText,
  className,
  previewAlt,
  addLabel,
  replaceLabel,
  removeLabel,
}) {
  const { t } = useLanguage();
  const mediaText = t('media');
  const [open, setOpen] = useState(false);
  const lastSyncedSignatureRef = useRef('');
  const preset = useMemo(() => getMediaUploadPreset(imageType), [imageType]);
  const resolvedPreviewAlt = previewAlt || mediaText.field.previewAlt;
  const resolvedAddLabel = addLabel || mediaText.field.addImage;
  const resolvedReplaceLabel = replaceLabel || mediaText.field.replaceImage;
  const resolvedRemoveLabel = removeLabel || mediaText.field.removeImage;
  const isLandscape = preset.aspectRatio > 1.2;
  const referenceLabel = title || label || preset.title || preset.label;
  const sourceLabel = label || preset.label;
  const resolvedMediaModule = useMemo(() => inferAdminMediaModule(
    {
      module: mediaModule,
      source: sourceLabel,
      reference: referenceLabel,
      folder,
      type: imageType,
    },
    { fallbackModule: mediaModule }
  ), [folder, imageType, mediaModule, referenceLabel, sourceLabel]);

  const itemsToRegister = useMemo(() => ([
      ...existingImages,
      value
        ? {
            url: value,
            type: imageType,
            module: resolvedMediaModule,
            reference: referenceLabel,
            source: sourceLabel,
            meta: preset.previewLabel,
            context: folder,
          }
        : null,
    ].filter(Boolean)), [existingImages, folder, imageType, preset.previewLabel, referenceLabel, resolvedMediaModule, sourceLabel, value]);

  useEffect(() => {
    if (!itemsToRegister.length) return;

    registerAdminMediaItems(itemsToRegister, {
      fallbackType: imageType,
      fallbackModule: resolvedMediaModule,
      fallbackReference: referenceLabel,
      fallbackSource: sourceLabel,
    });

    const signature = JSON.stringify(
      itemsToRegister.map((item) => `${item.url || ''}::${item.reference || ''}::${item.source || ''}`)
    );

    if (lastSyncedSignatureRef.current === signature) return;
    lastSyncedSignatureRef.current = signature;

    syncAdminMediaItems(itemsToRegister, {
      fallbackType: imageType,
      fallbackModule: resolvedMediaModule,
      fallbackReference: referenceLabel,
      fallbackSource: sourceLabel,
      fallbackContext: folder,
    }).catch(() => {});
  }, [folder, imageType, itemsToRegister, referenceLabel, resolvedMediaModule, sourceLabel]);

  const libraryItems = useMemo(() => {
    return mergeAdminMediaItems(
      [
        readAdminMediaLibrary(),
        existingImages,
        value
          ? {
              url: value,
              type: imageType,
              module: resolvedMediaModule,
              reference: referenceLabel,
              source: sourceLabel,
              meta: preset.previewLabel,
              context: folder,
            }
          : null,
      ],
      {
        fallbackType: imageType,
        fallbackModule: resolvedMediaModule,
        fallbackReference: referenceLabel,
        fallbackSource: sourceLabel,
      }
    );
  }, [existingImages, folder, imageType, preset.previewLabel, referenceLabel, resolvedMediaModule, sourceLabel, value]);

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
              <img src={value} alt={resolvedPreviewAlt} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <ImagePlus className="h-5 w-5" />
                <span>{mediaText.field.noImage}</span>
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
                {mediaText.field.recommendedPrefix}: <span className="font-medium text-foreground">{preset.recommendedSize}</span> ({preset.ratioLabel})
              </p>
              <p>
                {mediaText.field.visibleArea}: <span className="font-medium text-foreground">{preset.focusLabel}</span>
              </p>
              <p>{mediaText.field.avoidCutting}</p>
              {helperText ? <p>{helperText}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(true)} className="h-auto min-h-10 whitespace-normal py-2">
                {value ? resolvedReplaceLabel : resolvedAddLabel}
              </Button>
              {value ? (
                <Button type="button" variant="ghost" className="h-auto min-h-10 whitespace-normal py-2 text-red-600 hover:text-red-700" onClick={() => onChange?.('')}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {resolvedRemoveLabel}
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
        mediaModule={resolvedMediaModule}
        existingImages={libraryItems}
        onSelectImage={onChange}
      />
    </div>
  );
}
