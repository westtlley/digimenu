import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DishFormModal({
  open,
  onOpenChange,
  editingDish,
  dishFormData,
  setDishFormData,
  safeCategories,
  normalizeCategoryId,
  availableTags,
  tagLabels,
  onToggleTag,
  onSubmit,
  onClose,
  onOpenImagePicker,
  showPreview,
  setShowPreview,
  formatCurrency,
}) {
  const updateField = (field, value) => {
    setDishFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingDish ? 'Editar produto' : 'Adicionar produto'}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para adicionar ou editar um produto do cardápio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-medium">Nome *</Label>
              <Input
                value={dishFormData.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                className="min-h-touch"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">Categoria *</Label>
              <Select
                value={normalizeCategoryId(dishFormData.category_id)}
                onValueChange={(value) => updateField('category_id', value)}
                required
              >
                <SelectTrigger className="min-h-touch">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {safeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={normalizeCategoryId(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-medium">Preço de (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={dishFormData.original_price}
                onChange={(e) => updateField('original_price', e.target.value)}
                placeholder="Preço original"
                className="min-h-touch"
              />
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">Por (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={dishFormData.price}
                onChange={(e) => updateField('price', e.target.value)}
                required
                placeholder="Preço atual"
                className="min-h-touch"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block text-sm font-medium">Estoque</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={dishFormData.stock}
                  onChange={(e) => updateField('stock', e.target.value)}
                  placeholder="Ex: 10"
                  disabled={dishFormData.stock === ''}
                  className={`min-h-touch ${dishFormData.stock === '' ? 'bg-muted' : ''}`}
                />
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Switch
                    checked={dishFormData.stock === ''}
                    onCheckedChange={(checked) => updateField('stock', checked ? '' : '0')}
                  />
                  <span className="text-xs text-muted-foreground">Ilimitado</span>
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium">Porção</Label>
              <Input
                value={dishFormData.portion}
                onChange={(e) => updateField('portion', e.target.value)}
                placeholder="Ex: 180g, 500ml"
                className="min-h-touch"
              />
            </div>
          </div>

          <div>
            <Label>Tipo de produto</Label>
            <div className="mt-2 flex gap-2">
              <Badge
                variant={dishFormData.product_type === 'preparado' ? 'default' : 'outline'}
                className="cursor-default"
              >
                {dishFormData.product_type === 'preparado'
                  ? 'Preparado'
                  : dishFormData.product_type === 'industrializado'
                    ? 'Industrializado'
                    : 'Pizza'}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Descrição</Label>
            <Textarea
              value={dishFormData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="min-h-[80px]"
            />
          </div>

          {dishFormData.product_type !== 'industrializado' && (
            <div>
              <Label className="mb-2 block text-sm font-medium">Tempo de preparo (minutos)</Label>
              <Input
                type="number"
                value={dishFormData.prep_time}
                onChange={(e) => updateField('prep_time', e.target.value)}
                placeholder="Ex: 30"
                className="min-h-touch"
              />
            </div>
          )}

          <div>
            <Label>Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={dishFormData.tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => onToggleTag(tag)}
                >
                  {tagLabels[tag]}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Observações internas</Label>
            <Textarea
              value={dishFormData.internal_notes}
              onChange={(e) => updateField('internal_notes', e.target.value)}
              rows={3}
              placeholder="Notas para a equipe..."
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Imagem</Label>
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-24 w-24 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                  {dishFormData.image ? (
                    <img
                      src={dishFormData.image}
                      alt={dishFormData.name || 'Imagem do prato'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-xs text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">Capriche na foto principal do produto</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Formatos: JPG, JPEG, PNG e HEIC</p>
                    <p>Peso máximo: 10 MB</p>
                    <p>Resolução mínima: 300x300</p>
                    <p>Recomendamos usar uma foto quadrada para destacar melhor na vitrine.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={onOpenImagePicker}>
                  {dishFormData.image ? 'Trocar foto' : 'Adicionar foto'}
                </Button>
                {dishFormData.image && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => updateField('image', '')}
                  >
                    Remover foto
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4 shadow-sm dark:border-orange-700 dark:bg-orange-900/30">
            <Label htmlFor="video_url" className="mb-2 block text-base font-semibold text-orange-700 dark:text-orange-300">
              Link do vídeo (YouTube ou Vimeo)
            </Label>
            <Input
              id="video_url"
              type="url"
              value={dishFormData.video_url || ''}
              onChange={(e) => updateField('video_url', e.target.value)}
              placeholder="Ex: https://www.youtube.com/watch?v=..."
              className="w-full bg-card"
            />
            <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
              O vídeo aparece no cardápio ao clicar na imagem do produto.
            </p>
            {dishFormData.video_url && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <Label htmlFor="video_autoplay" className="cursor-pointer text-sm font-medium">
                  Reprodução automática
                </Label>
                <Switch
                  id="video_autoplay"
                  checked={dishFormData.video_autoplay !== false}
                  onCheckedChange={(checked) => updateField('video_autoplay', checked)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex min-h-touch items-center justify-between rounded bg-muted/50 p-3 sm:p-4">
              <Label className="text-sm font-medium">Destaque</Label>
              <Switch
                checked={dishFormData.is_highlight}
                onCheckedChange={(checked) => updateField('is_highlight', checked)}
              />
            </div>
            <div className="flex min-h-touch items-center justify-between rounded bg-muted/50 p-3 sm:p-4">
              <Label className="text-sm font-medium">Novo</Label>
              <Switch
                checked={dishFormData.is_new}
                onCheckedChange={(checked) => updateField('is_new', checked)}
              />
            </div>
          </div>

          <div className="flex min-h-touch items-center justify-between rounded bg-muted/50 p-3 sm:p-4">
            <Label className="text-sm font-medium">Mais vendido</Label>
            <Switch
              checked={dishFormData.is_popular}
              onCheckedChange={(checked) => updateField('is_popular', checked)}
            />
          </div>

          {dishFormData.image && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Visualização</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? 'Ocultar' : 'Ver como cliente'}
                </Button>
              </div>
              {showPreview && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="mx-auto max-w-sm overflow-hidden rounded-xl bg-card shadow-sm">
                    <img src={dishFormData.image} alt={dishFormData.name} className="h-48 w-full object-cover" />
                    <div className="p-4">
                      <h3 className="mb-2 text-lg font-bold">{dishFormData.name || 'Nome do produto'}</h3>
                      <p className="mb-3 text-sm text-muted-foreground">{dishFormData.description || 'Descrição...'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-orange-500">
                          {formatCurrency(parseFloat(dishFormData.price) || 0)}
                        </span>
                        <Button size="sm" className="bg-orange-500">Adicionar</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="min-h-touch flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="min-h-touch flex-1 bg-orange-500">
              {editingDish ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
