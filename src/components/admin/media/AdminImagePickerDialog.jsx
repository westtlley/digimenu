import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Images, Loader2, Sparkles, Upload, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import toast from 'react-hot-toast';
import { getMediaUploadPreset } from './mediaUploadPresets';
import AdminMediaGallery from './AdminMediaGallery';
import {
  buildAdminMediaLibraryInsights,
  filterAdminMediaItems,
  getMediaFilterLabel,
  getMediaModuleLabel,
  loadAdminMediaLibrary,
  mergeAdminMediaItems,
  MEDIA_LIBRARY_FILTERS,
  MEDIA_LIBRARY_MODULE_FILTERS,
  MEDIA_LIBRARY_SCOPE_FILTERS,
  registerAdminMediaItems,
  syncAdminMediaItems,
} from './adminMediaLibrary';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_IMAGE_SIDE = 300;
const DEFAULT_ZOOM = 1;

function getFileExtension(filename = '') {
  const parts = String(filename || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function isSupportedImageFile(file) {
  const mime = String(file?.type || '').toLowerCase();
  const extension = getFileExtension(file?.name);
  return (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(extension)
  );
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    image.src = url;
  });
}

async function readImageMetadata(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromUrl(objectUrl);
    return {
      objectUrl,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function validateImageFile(file, preset) {
  if (!file) {
    throw new Error('Nenhum arquivo selecionado.');
  }
  if (!isSupportedImageFile(file)) {
    throw new Error('Use JPG, JPEG, PNG ou HEIC.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('A imagem deve ter no maximo 10 MB.');
  }
  const metadata = await readImageMetadata(file);
  const minSide = Math.max(
    MIN_IMAGE_SIDE,
    Math.min(preset?.outputWidth || MIN_IMAGE_SIDE, preset?.outputHeight || MIN_IMAGE_SIDE) / 4
  );
  if (metadata.width < minSide || metadata.height < minSide) {
    URL.revokeObjectURL(metadata.objectUrl);
    throw new Error(`A imagem precisa ter pelo menos ${Math.round(minSide)}x${Math.round(minSide)} pixels.`);
  }
  return metadata;
}

async function createCenteredCroppedBlob(file, preset, zoom = DEFAULT_ZOOM) {
  const metadata = await readImageMetadata(file);
  try {
    const image = await loadImageFromUrl(metadata.objectUrl);
    const targetAspect = (preset?.outputWidth || 1200) / (preset?.outputHeight || 1200);
    const imageAspect = metadata.width / metadata.height;

    let baseCropWidth = metadata.width;
    let baseCropHeight = metadata.height;

    if (imageAspect > targetAspect) {
      baseCropHeight = metadata.height;
      baseCropWidth = metadata.height * targetAspect;
    } else {
      baseCropWidth = metadata.width;
      baseCropHeight = metadata.width / targetAspect;
    }

    const cropWidth = baseCropWidth / Math.max(zoom, 1);
    const cropHeight = baseCropHeight / Math.max(zoom, 1);
    const cropX = (metadata.width - cropWidth) / 2;
    const cropY = (metadata.height - cropHeight) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = preset?.outputWidth || 1200;
    canvas.height = preset?.outputHeight || 1200;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Nao foi possivel preparar a imagem.');
    }

    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

    const mimeType = String(file.type || '').toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg';

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Nao foi possivel gerar a imagem final.'));
      }, mimeType, 0.92);
    });

    const baseName = String(file.name || 'imagem').replace(/\.[^.]+$/, '');
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `${baseName}-editado.${extension}`, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(metadata.objectUrl);
  }
}
export default function AdminImagePickerDialog({
  open,
  onOpenChange,
  title,
  description,
  imageType = 'product',
  folder,
  mediaModule,
  existingImages = [],
  onSelectImage,
}) {
  const preset = useMemo(() => getMediaUploadPreset(imageType), [imageType]);
  const dialogTitle = title || preset.title || 'Adicionar imagem';
  const dialogDescription = description || preset.description || 'Use uma imagem nitida para valorizar a vitrine.';
  const uploadFolder = folder || preset.folder || 'dishes';
  const fileInputRef = useRef(null);
  const uploadViewportRef = useRef(null);
  const libraryViewportRef = useRef(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [zoom, setZoom] = useState([DEFAULT_ZOOM]);
  const [selectedLibraryUrl, setSelectedLibraryUrl] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState(imageType || 'product');
  const [libraryModuleFilter, setLibraryModuleFilter] = useState('all');
  const [libraryScopeFilter, setLibraryScopeFilter] = useState('all');
  const [librarySnapshot, setLibrarySnapshot] = useState({
    items: [],
    mostUsed: [],
    recent: [],
    insights: buildAdminMediaLibraryInsights([]),
    pagination: { total: 0, limit: 24, offset: 0, has_more: false },
    source: 'local',
    allItems: [],
    error: null,
  });
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isLibraryLoadingMore, setIsLibraryLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveTab('upload');
      setSelectedFile(null);
      setImageMeta(null);
      setZoom([DEFAULT_ZOOM]);
      setSelectedLibraryUrl(null);
      setLibrarySearch('');
      setLibraryTypeFilter(imageType || 'product');
      setLibraryModuleFilter(mediaModule && mediaModule !== 'general' ? mediaModule : 'all');
      setLibraryScopeFilter('all');
      setLibrarySnapshot({
        items: [],
        mostUsed: [],
        recent: [],
        insights: buildAdminMediaLibraryInsights([]),
        pagination: { total: 0, limit: 24, offset: 0, has_more: false },
        source: 'local',
        allItems: [],
        error: null,
      });
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [imageType, mediaModule, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const libraryItems = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(existingImages) ? existingImages : []).filter((item) => {
      const url = String(item?.url || '').trim();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [existingImages]);

  useEffect(() => {
    if (!open || !libraryItems.length) return;

    registerAdminMediaItems(libraryItems, {
      fallbackType: imageType,
      fallbackModule: mediaModule,
      fallbackReference: dialogTitle,
      fallbackSource: dialogTitle,
    });

    syncAdminMediaItems(libraryItems, {
      fallbackType: imageType,
      fallbackModule: mediaModule,
      fallbackReference: dialogTitle,
      fallbackSource: dialogTitle,
      fallbackContext: folder,
    }).catch(() => {});
  }, [dialogTitle, folder, imageType, libraryItems, mediaModule, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLibraryLoading(true);

    loadAdminMediaLibrary({
      type: libraryTypeFilter,
      module: libraryModuleFilter,
      searchTerm: librarySearch,
      scope: libraryScopeFilter,
      limit: 24,
      offset: 0,
      fallbackItems: libraryItems,
      fallbackType: imageType,
      fallbackModule: mediaModule,
      fallbackReference: dialogTitle,
      fallbackSource: dialogTitle,
      fallbackContext: folder,
    })
      .then((snapshot) => {
        if (cancelled) return;
        setLibrarySnapshot(snapshot);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLibraryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    dialogTitle,
    folder,
    imageType,
    libraryItems,
    libraryModuleFilter,
    libraryScopeFilter,
    librarySearch,
    libraryTypeFilter,
    mediaModule,
    open,
  ]);

  const libraryInsights = useMemo(() => {
    if (librarySnapshot?.insights) {
      return librarySnapshot.insights;
    }

    return buildAdminMediaLibraryInsights(libraryItems, {
      type: libraryTypeFilter,
      module: libraryModuleFilter,
      searchTerm: librarySearch,
    });
  }, [libraryItems, libraryModuleFilter, librarySearch, librarySnapshot, libraryTypeFilter]);

  const filteredLibraryItems = useMemo(() => {
    const currentPageItems = Array.isArray(librarySnapshot?.items) && librarySnapshot.items.length > 0
      ? librarySnapshot.items
      : filterAdminMediaItems(libraryInsights.filtered, {
          scope: libraryScopeFilter,
        });

    return currentPageItems;
  }, [libraryInsights.filtered, libraryScopeFilter, librarySnapshot]);

  const selectedLibraryItem = useMemo(() => {
    const selectionPool = [
      ...(Array.isArray(librarySnapshot?.items) ? librarySnapshot.items : []),
      ...(Array.isArray(librarySnapshot?.mostUsed) ? librarySnapshot.mostUsed : []),
      ...(Array.isArray(librarySnapshot?.recent) ? librarySnapshot.recent : []),
      ...libraryItems,
    ];
    return selectionPool.find((item) => item.url === selectedLibraryUrl) || null;
  }, [libraryItems, librarySnapshot, selectedLibraryUrl]);

  const sameTypeLibraryCount = useMemo(() => {
    return libraryItems.filter((item) => item.type === imageType).length;
  }, [imageType, libraryItems]);

  const selectedLibraryModuleLabel = selectedLibraryItem ? getMediaModuleLabel(selectedLibraryItem.module) : null;
  const showHighlightedSections = libraryScopeFilter === 'all' && !librarySearch;
  const leadingModule = libraryInsights.byModule[0] || null;
  const leadingType = libraryInsights.byType[0] || null;
  const isPortraitPreset = Number(preset?.aspectRatio || 1) < 1;
  const libraryHasItems =
    filteredLibraryItems.length > 0 ||
    (Array.isArray(librarySnapshot?.mostUsed) && librarySnapshot.mostUsed.length > 0) ||
    (Array.isArray(librarySnapshot?.recent) && librarySnapshot.recent.length > 0) ||
    libraryItems.length > 0;
  const totalLibraryAssets =
    Number(librarySnapshot?.pagination?.total || 0) || libraryItems.length;

  useEffect(() => {
    if (!open) return;

    const activeViewport = activeTab === 'library' ? libraryViewportRef.current : uploadViewportRef.current;
    if (!activeViewport) return;

    const frame = window.requestAnimationFrame(() => {
      if (typeof activeViewport.scrollTo === 'function') {
        activeViewport.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        activeViewport.scrollTop = 0;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, filteredLibraryItems.length, open, showPreviewEditor]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleResolvedFile = async (file) => {
    try {
      const metadata = await validateImageFile(file, preset);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(metadata.objectUrl);
      setImageMeta({ width: metadata.width, height: metadata.height });
      setZoom([DEFAULT_ZOOM]);
      setActiveTab('upload');
    } catch (error) {
      toast.error(error.message || 'Não foi possível preparar a imagem.');
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleResolvedFile(file);
    }
    event.target.value = '';
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await handleResolvedFile(file);
    }
  };

  const handleSaveUpload = async () => {
    if (!selectedFile) {
      toast.error('Escolha uma imagem antes de salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const preparedFile = await createCenteredCroppedBlob(selectedFile, preset, zoom[0]);
      const url = await uploadToCloudinary(preparedFile, uploadFolder);
      registerAdminMediaItems(
        [
          {
            url,
            type: imageType,
            module: mediaModule,
            reference: selectedFile?.name || dialogTitle,
            source: dialogTitle,
            context: folder,
            meta: `${preset.previewLabel} • ${preset.recommendedSize}`,
            updatedAt: Date.now(),
          },
        ],
        {
          fallbackType: imageType,
          fallbackModule: mediaModule,
          fallbackReference: dialogTitle,
          fallbackSource: dialogTitle,
        }
      );
      await syncAdminMediaItems(
        [
          {
            url,
            type: imageType,
            module: mediaModule,
            reference: selectedFile?.name || dialogTitle,
            source: dialogTitle,
            context: folder,
            meta: `${preset.previewLabel} - ${preset.recommendedSize}`,
            updatedAt: Date.now(),
          },
        ],
        {
          fallbackType: imageType,
          fallbackModule: mediaModule,
          fallbackReference: dialogTitle,
          fallbackSource: dialogTitle,
          fallbackContext: folder,
        }
      );
      await onSelectImage?.(url);
      toast.success('Foto adicionada com sucesso.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || 'Não foi possível salvar a imagem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectLibraryImage = async () => {
    if (!selectedLibraryUrl) {
      toast.error('Escolha uma imagem da biblioteca.');
      return;
    }
    setIsSaving(true);
    try {
      registerAdminMediaItems(
        [
          selectedLibraryItem || {
            url: selectedLibraryUrl,
            type: imageType,
            module: mediaModule,
            reference: dialogTitle,
            source: dialogTitle,
            context: folder,
            updatedAt: Date.now(),
          },
        ],
        {
          fallbackType: imageType,
          fallbackModule: mediaModule,
          fallbackReference: dialogTitle,
          fallbackSource: dialogTitle,
        }
      );
      await syncAdminMediaItems(
        [
          selectedLibraryItem || {
            url: selectedLibraryUrl,
            type: imageType,
            module: mediaModule,
            reference: dialogTitle,
            source: dialogTitle,
            context: folder,
            updatedAt: Date.now(),
          },
        ],
        {
          fallbackType: imageType,
          fallbackModule: mediaModule,
          fallbackReference: dialogTitle,
          fallbackSource: dialogTitle,
          fallbackContext: folder,
        }
      );
      await onSelectImage?.(selectedLibraryUrl);
      toast.success('Imagem aplicada com sucesso.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || 'Não foi possível aplicar a imagem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadMoreLibrary = async () => {
    if (isLibraryLoadingMore || !librarySnapshot?.pagination?.has_more) return;

    setIsLibraryLoadingMore(true);
    try {
      const nextOffset =
        Number(librarySnapshot?.pagination?.offset || 0) + Number(librarySnapshot?.pagination?.limit || 24);

      const snapshot = await loadAdminMediaLibrary({
        type: libraryTypeFilter,
        module: libraryModuleFilter,
        searchTerm: librarySearch,
        scope: libraryScopeFilter,
        limit: Number(librarySnapshot?.pagination?.limit || 24),
        offset: nextOffset,
        fallbackItems: libraryItems,
        fallbackType: imageType,
        fallbackModule: mediaModule,
        fallbackReference: dialogTitle,
        fallbackSource: dialogTitle,
        fallbackContext: folder,
      });

      const combinedItems = filterAdminMediaItems(
        mergeAdminMediaItems(
          [
            ...(Array.isArray(librarySnapshot?.items) ? librarySnapshot.items : []),
            ...(Array.isArray(snapshot?.items) ? snapshot.items : []),
          ],
          {
            fallbackType: imageType,
            fallbackModule: mediaModule,
            fallbackReference: dialogTitle,
            fallbackSource: dialogTitle,
          }
        ),
        { scope: libraryScopeFilter }
      );

      const combinedAllItems = mergeAdminMediaItems(
        [
          ...(Array.isArray(librarySnapshot?.allItems) ? librarySnapshot.allItems : []),
          ...(Array.isArray(snapshot?.allItems) ? snapshot.allItems : []),
        ],
        {
          fallbackType: imageType,
          fallbackModule: mediaModule,
          fallbackReference: dialogTitle,
          fallbackSource: dialogTitle,
        }
      );

      registerAdminMediaItems(combinedAllItems, {
        fallbackType: imageType,
        fallbackModule: mediaModule,
        fallbackReference: dialogTitle,
        fallbackSource: dialogTitle,
      });

      setLibrarySnapshot({
        ...snapshot,
        items: combinedItems,
        mostUsed:
          Array.isArray(librarySnapshot?.mostUsed) && librarySnapshot.mostUsed.length > 0
            ? librarySnapshot.mostUsed
            : snapshot.mostUsed,
        recent:
          Array.isArray(librarySnapshot?.recent) && librarySnapshot.recent.length > 0
            ? librarySnapshot.recent
            : snapshot.recent,
        insights: snapshot?.insights || librarySnapshot?.insights,
        allItems: combinedAllItems,
      });
    } finally {
      setIsLibraryLoadingMore(false);
    }
  };

  const showPreviewEditor = Boolean(selectedFile && previewUrl);
  const needsConstrainedLayout = activeTab === 'library' || showPreviewEditor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="large"
        mobileFullscreen
        className={cn(
          'max-w-5xl p-0',
          needsConstrainedLayout
            ? 'flex w-[min(96vw,84rem)] max-h-[96dvh] flex-col overflow-hidden'
            : 'max-h-[92dvh]'
        )}
      >
        <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">{dialogTitle}</DialogTitle>
            <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className={cn('px-4 pb-4 sm:px-6 sm:pb-6', needsConstrainedLayout ? 'flex min-h-0 flex-col' : 'flex flex-col')}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col"
          >
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-auto gap-4 overflow-x-auto bg-transparent p-0">
                <TabsTrigger
                  value="upload"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-0 pb-2 pt-0 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Novo arquivo
                </TabsTrigger>
                <TabsTrigger
                  value="library"
                  className="shrink-0 rounded-none border-b-2 border-transparent px-0 pb-2 pt-0 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Biblioteca
                </TabsTrigger>
              </TabsList>

              <Badge variant="outline" className="inline-flex w-fit gap-1 self-start text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                Dicas de imagem
              </Badge>
            </div>

            <TabsContent
              value="upload"
              className={cn(
                'mt-6',
                showPreviewEditor ? 'space-y-4 overflow-visible' : 'overflow-visible'
              )}
            >
              {!showPreviewEditor ? (
                <div className="space-y-4">
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      'rounded-2xl border border-dashed px-4 py-12 text-center transition-colors sm:px-6 sm:py-16',
                      isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                    )}
                  >
                    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ImagePlus className="h-7 w-7" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                          Adicione ou arraste uma foto pra cá
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Formatos: JPG, JPEG, PNG e HEIC</p>
                          <p>Peso máximo: 10 MB</p>
                          <p>Resolução mínima: 300x300</p>
                          <p>Recomendado: {preset.recommendedSize} ({preset.ratioLabel})</p>
                        </div>
                      </div>
                      <Button type="button" onClick={openFilePicker} className="h-11 rounded-xl px-6">
                        <Upload className="mr-2 h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground sm:grid-cols-3">
                    <div>
                      <p className="font-medium text-foreground">Corte guiado</p>
                      <p>O recorte já abre no formato ideal para {preset.previewLabel.toLowerCase()}.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Preview antes de salvar</p>
                      <p>Você ajusta o zoom antes do upload e já visualiza a área principal.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Orientação clara</p>
                      <p>Foque em {preset.focusLabel} e evite cortar textos ou elementos importantes.</p>
                    </div>
                  </div>

                  {sameTypeLibraryCount > 0 ? (
                    <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Você já tem {sameTypeLibraryCount} {getMediaFilterLabel(imageType).toLowerCase()} na biblioteca
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reutilize imagens existentes para evitar upload duplicado e manter a identidade visual.
                        </p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setActiveTab('library')}>
                        Abrir biblioteca
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div ref={uploadViewportRef} className="max-h-[min(58dvh,38rem)] overflow-y-auto pr-1">
                    <div className="mx-auto w-full max-w-4xl space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Enquadre a imagem</p>
                          <p className="text-sm text-muted-foreground">
                            O recorte final segue o formato {preset.ratioLabel} e prioriza {preset.focusLabel}.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {imageMeta ? <Badge variant="outline">{imageMeta.width}x{imageMeta.height}</Badge> : null}
                          <Badge variant="outline">{preset.recommendedSize}</Badge>
                        </div>
                      </div>

                      <div className="flex min-h-[280px] items-center justify-center rounded-[1.75rem] border border-border bg-muted/20 p-3 sm:min-h-[360px] sm:p-4 lg:min-h-[440px] lg:p-6">
                        <div className="flex h-full w-full items-center justify-center overflow-auto rounded-[1.5rem] border border-border bg-background p-3 shadow-inner sm:p-4">
                          <div
                            className={cn(
                              'mx-auto overflow-hidden rounded-[1.25rem] border border-border bg-muted shadow-sm',
                              isPortraitPreset ? 'h-full w-auto max-w-full' : 'w-full'
                            )}
                            style={
                              isPortraitPreset
                                ? {
                                    aspectRatio: String(preset.aspectRatio),
                                    maxHeight: '100%',
                                    maxWidth: '100%',
                                  }
                                : {
                                    aspectRatio: String(preset.aspectRatio),
                                    maxWidth: 'min(100%, 48rem)',
                                    maxHeight: '100%',
                                  }
                            }
                          >
                            <img
                              src={previewUrl}
                              alt="Preview da imagem"
                              className="h-full w-full object-cover transition-transform duration-200"
                              style={{ transform: `scale(${zoom[0]})` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-4">
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            <ZoomIn className="h-4 w-4" />
                            Zoom
                          </span>
                          <span className="text-muted-foreground">{zoom[0].toFixed(1)}x</span>
                        </div>
                        <Slider
                          min={1}
                          max={2.6}
                          step={0.1}
                          value={zoom}
                          onValueChange={setZoom}
                        />

                        {imageMeta ? (
                          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                            <p><span className="font-medium text-foreground">Arquivo:</span> {selectedFile?.name}</p>
                            <p><span className="font-medium text-foreground">Original:</span> {imageMeta.width}x{imageMeta.height}</p>
                            <p><span className="font-medium text-foreground">Saida:</span> {preset.outputWidth}x{preset.outputHeight}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" className="h-11 sm:min-w-[180px]" onClick={() => setSelectedFile(null)}>
                      Escolher outra
                    </Button>
                    <Button type="button" className="h-11 sm:min-w-[180px]" onClick={handleSaveUpload} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="library" className="mt-6 space-y-4 overflow-visible">
              {isLibraryLoading && !libraryHasItems ? (
                <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-muted/20">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando biblioteca de midia...
                  </div>
                </div>
              ) : !libraryHasItems ? (
                <div className="rounded-2xl border border-border bg-muted/20 px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Images className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">Sua biblioteca ainda esta vazia</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    As imagens usadas em produtos, categorias e campanhas vao aparecer aqui para voce reaproveitar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{totalLibraryAssets} ativos</Badge>
                        <Badge variant="outline">{filteredLibraryItems.length} visiveis</Badge>
                        <Badge variant={librarySnapshot?.source === 'backend' ? 'default' : 'outline'}>
                          {librarySnapshot?.source === 'backend' ? 'Backend ativo' : 'Fallback local'}
                        </Badge>
                        {leadingModule ? <Badge variant="secondary">{leadingModule.label}</Badge> : null}
                        {leadingType ? <Badge variant="secondary">{leadingType.label}</Badge> : null}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                      <Input
                        value={librarySearch}
                        onChange={(event) => setLibrarySearch(event.target.value)}
                        placeholder="Buscar por nome, contexto, modulo ou tipo"
                        className="h-11 bg-background"
                      />

                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Modulo</p>
                          <div className="flex flex-wrap gap-2">
                            {MEDIA_LIBRARY_MODULE_FILTERS.map((filter) => (
                              <Button
                                key={filter.value}
                                type="button"
                                variant={libraryModuleFilter === filter.value ? 'default' : 'outline'}
                                className="h-8 rounded-full px-3"
                                onClick={() => setLibraryModuleFilter(filter.value)}
                              >
                                {filter.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</p>
                          <div className="flex flex-wrap gap-2">
                            {MEDIA_LIBRARY_FILTERS.map((filter) => (
                              <Button
                                key={filter.value}
                                type="button"
                                variant={libraryTypeFilter === filter.value ? 'default' : 'outline'}
                                className="h-8 rounded-full px-3"
                                onClick={() => setLibraryTypeFilter(filter.value)}
                              >
                                {filter.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ordenar por</p>
                          <div className="flex flex-wrap gap-2">
                            {MEDIA_LIBRARY_SCOPE_FILTERS.map((filter) => (
                              <Button
                                key={filter.value}
                                type="button"
                                variant={libraryScopeFilter === filter.value ? 'default' : 'outline'}
                                className="h-8 rounded-full px-3"
                                onClick={() => setLibraryScopeFilter(filter.value)}
                              >
                                {filter.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                    </div>
                  </div>

                  <div ref={libraryViewportRef} className="max-h-[min(52dvh,34rem)] overflow-y-auto pr-1">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-base font-semibold text-foreground">Biblioteca</h3>
                            <p className="text-sm text-muted-foreground">
                              As imagens aparecem logo abaixo dos filtros para voce escolher sem perder tempo.
                            </p>
                          </div>
                          <Badge variant="outline">{filteredLibraryItems.length} resultados</Badge>
                        </div>

                        <AdminMediaGallery
                          items={filteredLibraryItems}
                          selectedUrl={selectedLibraryUrl}
                          onSelect={setSelectedLibraryUrl}
                          emptyTitle="Nenhuma imagem encontrada"
                          emptyDescription="Ajuste a busca, troque os filtros ou envie uma nova imagem."
                        />

                        {librarySnapshot?.pagination?.has_more ? (
                          <div className="mt-4 flex justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleLoadMoreLibrary}
                              disabled={isLibraryLoadingMore}
                            >
                              {isLibraryLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Carregar mais
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      {showHighlightedSections && (librarySnapshot.mostUsed.length > 0 || librarySnapshot.recent.length > 0) ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                          {librarySnapshot.mostUsed.length > 0 ? (
                            <div className="rounded-2xl border border-border bg-muted/10 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <h4 className="text-sm font-semibold text-foreground">Mais usadas</h4>
                                  <p className="text-xs text-muted-foreground">Ativos com maior reaproveitamento no recorte atual.</p>
                                </div>
                                <Badge variant="outline">{librarySnapshot.mostUsed.length}</Badge>
                              </div>
                              <AdminMediaGallery
                                items={librarySnapshot.mostUsed}
                                selectedUrl={selectedLibraryUrl}
                                onSelect={setSelectedLibraryUrl}
                              />
                            </div>
                          ) : null}

                          {librarySnapshot.recent.length > 0 ? (
                            <div className="rounded-2xl border border-border bg-muted/10 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <h4 className="text-sm font-semibold text-foreground">Recentes</h4>
                                  <p className="text-xs text-muted-foreground">O que voce acabou de usar ou selecionar.</p>
                                </div>
                                <Badge variant="outline">{librarySnapshot.recent.length}</Badge>
                              </div>
                              <AdminMediaGallery
                                items={librarySnapshot.recent}
                                selectedUrl={selectedLibraryUrl}
                                onSelect={setSelectedLibraryUrl}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {selectedLibraryItem ? (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                          <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-background">
                              <img src={selectedLibraryItem.url} alt={selectedLibraryItem.label} className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{getMediaFilterLabel(selectedLibraryItem.type)}</Badge>
                                {selectedLibraryModuleLabel ? <Badge variant="outline">{selectedLibraryModuleLabel}</Badge> : null}
                                <Badge variant="secondary">{selectedLibraryItem.usageSummary}</Badge>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{selectedLibraryItem.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedLibraryItem.source ? `Origem principal: ${selectedLibraryItem.source}. ` : ''}
                                  {Array.isArray(selectedLibraryItem.references) && selectedLibraryItem.references.length > 0
                                    ? `Exemplos de uso: ${selectedLibraryItem.references.slice(0, 3).join(' • ')}.`
                                    : 'A biblioteca ainda esta consolidando referencias deste ativo.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/80 bg-background pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedLibraryUrl ? 'Imagem selecionada. Clique em usar imagem para aplicar no item.' : 'Escolha uma imagem da biblioteca para aplicar no item.'}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => onOpenChange(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => setSelectedLibraryUrl(null)} disabled={!selectedLibraryUrl || isSaving}>
                        Limpar selecao
                      </Button>
                      <Button type="button" className="h-11 sm:h-10" onClick={handleSelectLibraryImage} disabled={!selectedLibraryUrl || isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Usar imagem
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
          className="hidden"
          onChange={handleFileChange}
        />
      </DialogContent>
    </Dialog>
  );
}









