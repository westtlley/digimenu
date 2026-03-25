import React, { useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import EmptyState from '../../../atoms/EmptyState';
import DishRow from '../components/DishRow';
import ChannelToggle from '../components/ChannelToggle';
import { CheckCircle, Layers, Package, Plus, Power, Search } from 'lucide-react';

function safeParseJson(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function PDVCatalogView({
  storageKey,
  safeDishes,
  safeCategories,
  canCreateProducts,
  canEditProducts,
  canCreate,
  canDelete,
  onOpenNewProduct,
  onEditDish,
  onDeleteDish,
  onDuplicateDish,
  onToggleDishActive,
  normalizeCategoryId,
  formatCurrency,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPdvStatus, setFilterPdvStatus] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDishIds, setSelectedDishIds] = useState([]);
  const [pdvOverrides, setPdvOverrides] = useState({});
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPdvOverrides(safeParseJson(window.localStorage.getItem(storageKey)));
    setStorageLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !storageLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(pdvOverrides));
  }, [storageKey, pdvOverrides, storageLoaded]);

  useEffect(() => {
    if (!selectionMode) {
      setSelectedDishIds([]);
    }
  }, [selectionMode]);

  const getDishPDVEnabled = (dish) => {
    const override = pdvOverrides[dish?.id];
    if (typeof override === 'boolean') return override;
    return dish?.is_active !== false;
  };

  const setDishPDVEnabled = (dish, enabled) => {
    const defaultValue = dish?.is_active !== false;
    setPdvOverrides((prev) => {
      const next = { ...prev };
      if (enabled === defaultValue) {
        delete next[dish.id];
      } else {
        next[dish.id] = enabled;
      }
      return next;
    });
  };

  const filteredPDVDishes = useMemo(() => {
    return safeDishes.filter((dish) => {
      const matchesSearch =
        !searchTerm ||
        dish.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dish.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        filterCategory === 'all' || normalizeCategoryId(dish.category_id) === filterCategory;

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && dish.is_active !== false) ||
        (filterStatus === 'inactive' && dish.is_active === false);

      const pdvEnabled = getDishPDVEnabled(dish);
      const matchesPDV =
        filterPdvStatus === 'all' ||
        (filterPdvStatus === 'pdv_active' && pdvEnabled) ||
        (filterPdvStatus === 'pdv_inactive' && !pdvEnabled);

      return matchesSearch && matchesCategory && matchesStatus && matchesPDV;
    });
  }, [safeDishes, searchTerm, filterCategory, filterStatus, filterPdvStatus, pdvOverrides, normalizeCategoryId]);

  const pdvActiveCount = safeDishes.filter((dish) => getDishPDVEnabled(dish)).length;
  const pdvInactiveCount = Math.max(safeDishes.length - pdvActiveCount, 0);
  const selectedCount = selectedDishIds.length;

  const toggleDishSelection = (dishId) => {
    setSelectedDishIds((prev) =>
      prev.includes(dishId) ? prev.filter((id) => id !== dishId) : [...prev, dishId]
    );
  };

  const handleBulkPdvStatus = (enabled) => {
    if (selectedDishIds.length === 0) return;
    setPdvOverrides((prev) => {
      const next = { ...prev };
      selectedDishIds.forEach((dishId) => {
        const dish = safeDishes.find((item) => item.id === dishId);
        if (!dish) return;
        const defaultValue = dish.is_active !== false;
        if (enabled === defaultValue) {
          delete next[dishId];
        } else {
          next[dishId] = enabled;
        }
      });
      return next;
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterPdvStatus('all');
  };

  const renderMobileCard = (dish) => {
    const categoryName =
      safeCategories.find((cat) => normalizeCategoryId(cat.id) === normalizeCategoryId(dish.category_id))?.name ||
      'Sem categoria';
    const pdvEnabled = getDishPDVEnabled(dish);

    return (
      <div
        key={dish.id}
        className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${selectedDishIds.includes(dish.id) ? 'ring-2 ring-orange-500' : ''}`}
      >
        <div className="flex items-start gap-3">
          {selectionMode && (
            <input
              type="checkbox"
              checked={selectedDishIds.includes(dish.id)}
              onChange={() => toggleDishSelection(dish.id)}
              className="mt-1 h-4 w-4 rounded"
            />
          )}

          <div className="h-16 w-16 overflow-hidden rounded-xl bg-muted">
            {dish.image ? (
              <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                Sem foto
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{dish.name}</p>
                <Badge variant={dish.is_active === false ? 'outline' : 'default'} className={dish.is_active === false ? '' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                  {dish.is_active === false ? 'Inativo' : 'Ativo'}
                </Badge>
                <Badge variant="secondary" className={pdvEnabled ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>
                  {pdvEnabled ? 'PDV ativo' : 'PDV desativado'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{categoryName}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Preço</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(dish.price || 0)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ChannelToggle
                  enabled={pdvEnabled}
                  onToggle={() => setDishPDVEnabled(dish, !pdvEnabled)}
                  title={pdvEnabled ? 'Desativar no PDV' : 'Ativar no PDV'}
                />
                <Button variant="outline" size="sm" onClick={() => onEditDish(dish)} disabled={!canEditProducts}>
                  Editar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="hidden p-6 lg:block">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">PDV</h2>
              <p className="text-sm text-muted-foreground">
                Controle visual do que vai aparecer no caixa, preparando o catálogo para operação multicanal.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant={selectionMode ? 'default' : 'outline'} onClick={() => setSelectionMode((prev) => !prev)}>
                Selecionar múltiplos
              </Button>
              {canCreateProducts && (
                <Button onClick={onOpenNewProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo produto
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Itens no catálogo</p>
                    <p className="text-2xl font-bold">{safeDishes.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">PDV ativos</p>
                    <p className="text-2xl font-bold text-green-600">{pdvActiveCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-slate-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">PDV desativados</p>
                    <p className="text-2xl font-bold text-slate-600">{pdvInactiveCount}</p>
                  </div>
                  <Power className="h-8 w-8 text-slate-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Categorias</p>
                    <p className="text-2xl font-bold text-orange-600">{safeCategories.length}</p>
                  </div>
                  <Layers className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.8fr_1fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar produto no PDV..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {safeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={normalizeCategoryId(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status geral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPdvStatus} onValueChange={setFilterPdvStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status no PDV" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos no PDV</SelectItem>
                  <SelectItem value="pdv_active">Disponíveis no PDV</SelectItem>
                  <SelectItem value="pdv_inactive">Ocultos no PDV</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" onClick={clearFilters}>
                Limpar
              </Button>
            </div>

            {(searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterPdvStatus !== 'all') && (
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  {filteredPDVDishes.length} produto{filteredPDVDishes.length !== 1 ? 's' : ''} visível{filteredPDVDishes.length !== 1 ? 'eis' : ''}
                </p>
                <Badge variant="secondary">Canal PDV</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectionMode && selectedCount > 0 && (
        <div className="mx-4 mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 lg:mx-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} produto{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkPdvStatus(true)}>
                Ativar no PDV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkPdvStatus(false)}>
                Desativar no PDV
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectionMode(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 px-4 pb-24 lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant={selectionMode ? 'default' : 'outline'} size="sm" onClick={() => setSelectionMode((prev) => !prev)}>
            Selecionar múltiplos
          </Button>
          {canCreateProducts && (
            <Button size="sm" onClick={onOpenNewProduct}>
              <Plus className="mr-1 h-4 w-4" />
              Novo produto
            </Button>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <Input
            placeholder="Buscar produto no PDV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {safeCategories.map((cat) => (
                <SelectItem key={cat.id} value={normalizeCategoryId(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status geral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPdvStatus} onValueChange={setFilterPdvStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status PDV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pdv_active">PDV ativo</SelectItem>
                <SelectItem value="pdv_inactive">PDV off</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredPDVDishes.length === 0 ? (
          <EmptyState
            icon={Package}
            title={safeDishes.length === 0 ? 'Você ainda não cadastrou nenhum produto' : 'Nenhum produto encontrado para o PDV'}
            description={safeDishes.length === 0 ? 'Adicione produtos para preparar o catálogo do caixa.' : 'Ajuste os filtros para encontrar os itens exibidos no PDV.'}
            actionLabel={canCreateProducts ? 'Novo produto' : undefined}
            onAction={canCreateProducts ? onOpenNewProduct : undefined}
          />
        ) : (
          filteredPDVDishes.map(renderMobileCard)
        )}
      </div>

      <div className="hidden px-6 pb-6 lg:block">
        {filteredPDVDishes.length === 0 ? (
          <EmptyState
            icon={Package}
            title={safeDishes.length === 0 ? 'Você ainda não cadastrou nenhum produto' : 'Nenhum produto encontrado para o PDV'}
            description={safeDishes.length === 0 ? 'Cadastre produtos para controlar o que vai aparecer no caixa.' : 'Tente ajustar os filtros para visualizar os itens do canal PDV.'}
            actionLabel={canCreateProducts ? 'Novo produto' : undefined}
            onAction={canCreateProducts ? onOpenNewProduct : undefined}
          />
        ) : (
          <div className="space-y-3">
            <div className={`grid ${selectionMode ? 'grid-cols-[auto_4rem_minmax(0,1.8fr)_minmax(0,1fr)_7rem_8rem_8rem_auto]' : 'grid-cols-[1.5rem_4rem_minmax(0,1.8fr)_minmax(0,1fr)_7rem_8rem_8rem_auto]'} gap-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`}>
              <span />
              <span>Imagem</span>
              <span>Produto</span>
              <span>Categoria</span>
              <span>Preço</span>
              <span>Status geral</span>
              <span>Disponível no PDV</span>
              <span className="text-right">Ações</span>
            </div>

            {filteredPDVDishes.map((dish) => {
              const categoryName =
                safeCategories.find((cat) => normalizeCategoryId(cat.id) === normalizeCategoryId(dish.category_id))?.name ||
                'Sem categoria';

              return (
                <DishRow
                  key={dish.id}
                  variant="products"
                  dish={dish}
                  categoryName={categoryName}
                  isSelected={selectedDishIds.includes(dish.id)}
                  showSelection={selectionMode}
                  showPDVControls
                  pdvEnabled={getDishPDVEnabled(dish)}
                  onToggleSelection={() => toggleDishSelection(dish.id)}
                  onEdit={() => onEditDish(dish)}
                  onDelete={() => onDeleteDish(dish)}
                  onDuplicate={() => onDuplicateDish(dish)}
                  onToggleActive={() => onToggleDishActive(dish)}
                  onTogglePDV={() => setDishPDVEnabled(dish, !getDishPDVEnabled(dish))}
                  canEdit={canEditProducts}
                  canCreate={canCreate}
                  canDelete={canDelete}
                  formatCurrency={formatCurrency}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
