import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Images, Loader2, Sparkles, Upload, Check, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import toast from 'react-hot-toast';

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

async function validateImageFile(file) {
  if (!file) {
    throw new Error('Nenhum arquivo selecionado.');
  }
  if (!isSupportedImageFile(file)) {
    throw new Error('Use JPG, JPEG, PNG ou HEIC.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('A imagem deve ter no máximo 10 MB.');
  }
  const metadata = await readImageMetadata(file);
  if (metadata.width < MIN_IMAGE_SIDE || metadata.height < MIN_IMAGE_SIDE) {
    URL.revokeObjectURL(metadata.objectUrl);
    throw new Error('A imagem precisa ter pelo menos 300x300 pixels.');
  }
  return metadata;
}

async function createCenteredSquareBlob(file, zoom = DEFAULT_ZOOM) {
  const metadata = await readImageMetadata(file);
  try {
    const image = await loadImageFromUrl(metadata.objectUrl);
    const minSide = Math.min(metadata.width, metadata.height);
    const cropSide = minSide / Math.max(zoom, 1);
    const cropX = (metadata.width - cropSide) / 2;
    const cropY = (metadata.height - cropSide) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Não foi possível preparar a imagem.');
    }

    ctx.drawImage(image, cropX, cropY, cropSide, cropSide, 0, 0, canvas.width, canvas.height);

    const mimeType = String(file.type || '').toLowerCase() === 'image/png' ? 'image/png' : 'image/jpeg';

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Não foi possível gerar a imagem final.'));
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
  title = 'Adicionar foto',
  description = 'Use uma imagem nítida para valorizar a vitrine.',
  folder = 'dishes',
  existingImages = [],
  onSelectImage,
}) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [zoom, setZoom] = useState([DEFAULT_ZOOM]);
  const [selectedLibraryUrl, setSelectedLibraryUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveTab('upload');
      setSelectedFile(null);
      setImageMeta(null);
      setZoom([DEFAULT_ZOOM]);
      setSelectedLibraryUrl(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleResolvedFile = async (file) => {
    try {
      const metadata = await validateImageFile(file);
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
      const preparedFile = await createCenteredSquareBlob(selectedFile, zoom[0]);
      const url = await uploadToCloudinary(preparedFile, folder);
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
      await onSelectImage?.(selectedLibraryUrl);
      toast.success('Imagem aplicada com sucesso.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || 'Não foi possível aplicar a imagem.');
    } finally {
      setIsSaving(false);
    }
  };

  const showPreviewEditor = Boolean(selectedFile && previewUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="large" className="flex max-h-[92vh] max-w-4xl flex-col overflow-hidden p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-3xl font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between pt-4">
              <TabsList className="bg-transparent p-0 h-auto gap-4">
                <TabsTrigger
                  value="upload"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2 pt-0 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Novo arquivo
                </TabsTrigger>
                <TabsTrigger
                  value="library"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2 pt-0 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Biblioteca
                </TabsTrigger>
              </TabsList>

              <Badge variant="outline" className="hidden sm:inline-flex gap-1 text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                Dicas de imagem
              </Badge>
            </div>

            <TabsContent value="upload" className="mt-6 flex-1 overflow-y-auto">
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
                      'rounded-2xl border border-dashed px-6 py-16 text-center transition-colors',
                      isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                    )}
                  >
                    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ImagePlus className="h-7 w-7" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold text-foreground">
                          Adicione ou arraste uma foto pra cá
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Formatos: JPG, JPEG, PNG e HEIC</p>
                          <p>Peso máximo: 10 MB</p>
                          <p>Resolução mínima: 300x300</p>
                          <p>Recomendamos usar uma foto quadrada</p>
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
                      <p className="font-medium text-foreground">Corte central automático</p>
                      <p>Vamos preparar a imagem em formato quadrado para o cardápio.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Preview antes de salvar</p>
                      <p>Você ajusta o zoom antes do upload para ganhar consistência.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Biblioteca reutilizável</p>
                      <p>Fotos já usadas em pratos e complementos ficam disponíveis para reaproveitar.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="mx-auto flex aspect-square max-w-[420px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-inner">
                        <img
                          src={previewUrl}
                          alt="Prévia da imagem"
                          className="h-full w-full object-cover transition-transform duration-200"
                          style={{ transform: `scale(${zoom[0]})` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-5 rounded-2xl border border-border bg-background p-5">
                      <div>
                        <p className="text-sm font-medium text-foreground">Ajuste fino</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Use o zoom para aproximar o produto. O recorte será central e quadrado.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
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
                      </div>

                      {imageMeta && (
                        <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                          <p><span className="font-medium text-foreground">Arquivo:</span> {selectedFile?.name}</p>
                          <p><span className="font-medium text-foreground">Resolução original:</span> {imageMeta.width}x{imageMeta.height}</p>
                          <p><span className="font-medium text-foreground">Saída:</span> 1200x1200</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedFile(null)}>
                          Escolher outra
                        </Button>
                        <Button type="button" className="flex-1" onClick={handleSaveUpload} disabled={isSaving}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="library" className="mt-6 flex min-h-0 flex-1 flex-col">
              {libraryItems.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/20 px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Images className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">Sua biblioteca ainda está vazia</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    As fotos já usadas em pratos e complementos vão aparecer aqui para você reaproveitar.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Arquivos salvos</h3>
                      <p className="text-sm text-muted-foreground">
                        Reaproveite imagens já usadas na operação para manter consistência visual.
                      </p>
                    </div>
                    <Badge variant="outline">{libraryItems.length} imagens</Badge>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/10">
                    <div className="max-h-[52vh] min-h-[320px] overflow-y-auto p-4 pr-3">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {libraryItems.map((image) => {
                        const isSelected = selectedLibraryUrl === image.url;
                        return (
                          <button
                            key={image.url}
                            type="button"
                            onClick={() => setSelectedLibraryUrl(image.url)}
                            aria-pressed={isSelected}
                            className={cn(
                              'group relative overflow-hidden rounded-2xl border bg-background text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
                              isSelected
                                ? 'border-primary shadow-md ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/40 hover:shadow-sm'
                            )}
                          >
                            <div className="pointer-events-none absolute right-3 top-3 z-10">
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
                            <div className="space-y-1 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="line-clamp-1 text-sm font-medium text-foreground">{image.label || 'Imagem salva'}</p>
                                {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                              </div>
                              {image.meta ? <p className="line-clamp-2 text-xs text-muted-foreground">{image.meta}</p> : null}
                            </div>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedLibraryUrl ? 'Imagem selecionada. Clique em usar imagem para aplicar no item.' : 'Escolha uma imagem da biblioteca para aplicar no item.'}
                    </p>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setSelectedLibraryUrl(null)} disabled={!selectedLibraryUrl || isSaving}>
                        Limpar seleção
                      </Button>
                      <Button type="button" onClick={handleSelectLibraryImage} disabled={!selectedLibraryUrl || isSaving}>
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
