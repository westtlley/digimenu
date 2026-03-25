import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmptyState from '../../atoms/EmptyState';
import { CheckCircle, Layers, Package, Settings, Plus, UtensilsCrossed } from 'lucide-react';

export default function ProductsView({
  canCreateProducts,
  safeDishes,
  safeCategories,
  safeComplementGroups,
  filteredDishes,
  activeProductsCount,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  clearAllFilters,
  selectedDishes,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  onClearSelection,
  onOpenNewProduct,
  renderMobileDishCard,
  renderProductListRow,
  normalizeCategoryId,
}) {
  return (
    <>
      <div className="hidden p-6 lg:block">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Produtos</h2>
              <p className="text-sm text-muted-foreground">
                Banco de produtos com busca, filtros e ações rápidas do catálogo.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canCreateProducts && (
                <Button onClick={onOpenNewProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo produto
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de produtos</p>
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
                    <p className="text-sm text-muted-foreground">Ativos</p>
                    <p className="text-2xl font-bold text-green-600">{activeProductsCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
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
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Complementos</p>
                    <p className="text-2xl font-bold text-purple-600">{safeComplementGroups.length}</p>
                  </div>
                  <Settings className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas categorias" />
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
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="highlight">Destaques</SelectItem>
                  <SelectItem value="new">Novos</SelectItem>
                  <SelectItem value="popular">Populares</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterType !== 'all') && (
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                  {filteredDishes.length} produto{filteredDishes.length !== 1 ? 's' : ''} encontrado{filteredDishes.length !== 1 ? 's' : ''}
                </p>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDishes.length > 0 && (
        <div className="mx-4 mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 lg:mx-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedDishes.length} produto{selectedDishes.length !== 1 ? 's' : ''} selecionado{selectedDishes.length !== 1 ? 's' : ''}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onBulkActivate}>Ativar</Button>
              <Button variant="outline" size="sm" onClick={onBulkDeactivate}>Desativar</Button>
              <Button variant="outline" size="sm" onClick={onBulkDelete} className="text-red-600">Excluir</Button>
              <Button variant="ghost" size="sm" onClick={onClearSelection}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 px-4 pb-24 lg:hidden">
        {filteredDishes.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={safeDishes.length === 0 ? 'Você ainda não cadastrou nenhum produto' : 'Nenhum produto encontrado'}
            description={safeDishes.length === 0 ? 'Adicione produtos para começar a montar seu cardápio.' : 'Ajuste os filtros para encontrar os produtos do seu catálogo.'}
            actionLabel={canCreateProducts ? 'Novo produto' : undefined}
            onAction={canCreateProducts ? onOpenNewProduct : undefined}
          />
        ) : (
          filteredDishes.map(renderMobileDishCard)
        )}
      </div>

      <div className="hidden px-6 pb-6 lg:block">
        {filteredDishes.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={safeDishes.length === 0 ? 'Você ainda não cadastrou nenhum produto' : 'Nenhum produto encontrado'}
            description={safeDishes.length === 0 ? 'Adicione produtos para começar a vender.' : 'Tente buscar com outro termo ou ajuste os filtros.'}
            actionLabel={canCreateProducts ? 'Novo produto' : undefined}
            onAction={canCreateProducts ? onOpenNewProduct : undefined}
          />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[auto_4rem_minmax(0,1.8fr)_minmax(0,1fr)_7rem_7rem_auto] gap-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span />
              <span>Imagem</span>
              <span>Produto</span>
              <span>Categoria</span>
              <span>Preço</span>
              <span>Status</span>
              <span className="text-right">Ações</span>
            </div>
            {filteredDishes.map(renderProductListRow)}
          </div>
        )}
      </div>
    </>
  );
}
