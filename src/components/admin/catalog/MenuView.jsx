import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import MobileCategoryAccordion from '../mobile/MobileCategoryAccordion';
import MobileFloatingActions from '../mobile/MobileFloatingActions';
import EmptyState from '../../atoms/EmptyState';
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Files,
  FolderPlus,
  LayoutGrid,
  Layers,
  Menu,
  MoreVertical,
  Pencil,
  Plus,
  Star,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';

export default function MenuView({
  canCreateProducts,
  canUpdateProducts,
  canDeleteProducts,
  safeCategories,
  safeComplementGroups,
  safeDishes,
  dishesWithoutCategory,
  dishesByCategory,
  expandedCategories,
  selectedDishes,
  activeProductsCount,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  clearAllFilters,
  onOpenCategoryModal,
  onOpenNewProduct,
  onCreateCombo,
  onOpenReorder,
  onToggleCategoryExpansion,
  onEditCategory,
  onDuplicateCategory,
  onDeleteCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  onSetSelectedDishes,
  renderMobileDishCard,
  renderDesktopDishRow,
  normalizeCategoryId,
}) {
  return (
    <>
      <div className="hidden p-6 lg:block">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Cardápio</h2>
              <p className="text-sm text-muted-foreground">
                Visão visual do cardápio, com categorias e produtos organizados como o cliente enxerga.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canCreateProducts && (
                <Button onClick={onOpenCategoryModal} variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nova categoria
                </Button>
              )}
              {canCreateProducts && (
                <Button onClick={onOpenNewProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo produto
                </Button>
              )}
              <Button variant="outline" onClick={onCreateCombo}>
                <Star className="mr-2 h-4 w-4" />
                Criar combo
              </Button>
              {canUpdateProducts && (
                <Button onClick={onOpenReorder} variant="outline">
                  <Menu className="mr-2 h-4 w-4" />
                  Reordenar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Categorias</p>
                    <p className="text-2xl font-bold">{safeCategories.length}</p>
                  </div>
                  <Layers className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos ativos</p>
                    <p className="text-2xl font-bold text-green-600">{activeProductsCount}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Grupos de complementos</p>
                    <p className="text-2xl font-bold text-purple-600">{safeComplementGroups.length}</p>
                  </div>
                  <LayoutGrid className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
              <Input
                placeholder="Buscar no cardápio..."
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
              <Button variant="ghost" onClick={clearAllFilters}>Limpar</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-24 lg:hidden">
        {dishesWithoutCategory.length > 0 && (
          <MobileCategoryAccordion
            key="__sem_categoria__"
            category={{ id: '__sem_categoria__', name: 'Sem categoria' }}
            dishCount={dishesWithoutCategory.length}
            isExpanded={expandedCategories.__sem_categoria__ !== false}
            onToggle={() => onToggleCategoryExpansion('__sem_categoria__')}
            onAddDish={onOpenNewProduct}
            onEdit={() => {}}
            onDuplicate={() => {}}
            onDelete={() => {}}
          >
            {dishesWithoutCategory.map(renderMobileDishCard)}
          </MobileCategoryAccordion>
        )}

        {safeCategories.map((category) => {
          const categoryDishes = dishesByCategory[normalizeCategoryId(category.id)] || [];
          const isExpanded = expandedCategories[category.id] !== false;

          return (
            <MobileCategoryAccordion
              key={category.id}
              category={category}
              dishCount={categoryDishes.length}
              isExpanded={isExpanded}
              onToggle={() => onToggleCategoryExpansion(category.id)}
              onAddDish={() => onOpenNewProduct(category.id)}
              onEdit={() => onEditCategory(category)}
              onDuplicate={() => onDuplicateCategory(category)}
              onDelete={() => onDeleteCategory(category.id)}
            >
              {categoryDishes.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum produto nesta categoria
                </div>
              ) : (
                categoryDishes.map(renderMobileDishCard)
              )}
            </MobileCategoryAccordion>
          );
        })}

        {safeCategories.length === 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum produto"
            description="Comece criando categorias e adicionando produtos ao cardápio."
            actionLabel="Criar primeira categoria"
            onAction={onOpenCategoryModal}
          />
        )}

        {safeCategories.length > 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum produto"
            description="Adicione produtos às categorias criadas para começar a vender."
            actionLabel="Cadastrar primeiro produto"
            onAction={onOpenNewProduct}
          />
        )}
      </div>

      <div className="hidden space-y-4 px-6 pb-6 lg:block">
        {dishesWithoutCategory.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-muted/50">
            <div
              className="flex cursor-pointer items-center justify-between border border-border-b bg-card p-4 hover:bg-muted/50"
              onClick={() => onToggleCategoryExpansion('__sem_categoria__')}
            >
              <div className="flex items-center gap-3">
                <Menu className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-bold">Sem categoria</h2>
                <Badge variant="secondary" className="text-xs">{dishesWithoutCategory.length} itens</Badge>
              </div>
              <div className="flex items-center gap-2">
                {canCreateProducts && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewProduct();
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar produto
                  </Button>
                )}
                {expandedCategories.__sem_categoria__ !== false ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
            {expandedCategories.__sem_categoria__ !== false && (
              <div className="space-y-3 p-4">
                {dishesWithoutCategory.map(renderDesktopDishRow)}
              </div>
            )}
          </div>
        )}

        {safeCategories.map((category, categoryIndex) => {
          const categoryDishes = dishesByCategory[normalizeCategoryId(category.id)] || [];
          const isExpanded = expandedCategories[category.id] !== false;

          return (
            <div key={category.id} className="overflow-hidden rounded-xl bg-muted/50">
              <div
                className="flex cursor-pointer items-center justify-between border border-border-b bg-card p-4 hover:bg-muted/50"
                onClick={() => onToggleCategoryExpansion(category.id)}
              >
                <div className="flex items-center gap-3">
                  {canUpdateProducts && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveCategoryUp(categoryIndex);
                        }}
                        disabled={categoryIndex === 0}
                        className="rounded p-0.5 hover:bg-muted/70 disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveCategoryDown(categoryIndex);
                        }}
                        disabled={categoryIndex === safeCategories.length - 1}
                        className="rounded p-0.5 hover:bg-muted/70 disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <Menu className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-bold">{category.name}</h2>
                  <Badge variant="secondary" className="text-xs">{categoryDishes.length} itens</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDishes.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const categoryDishIds = categoryDishes.map((dish) => dish.id);
                        const allSelected = categoryDishIds.every((id) => selectedDishes.includes(id));

                        if (allSelected) {
                          onSetSelectedDishes((prev) => prev.filter((id) => !categoryDishIds.includes(id)));
                        } else {
                          onSetSelectedDishes((prev) => [...new Set([...prev, ...categoryDishIds])]);
                        }
                      }}
                    >
                      {categoryDishes.every((dish) => selectedDishes.includes(dish.id)) ? 'Desmarcar' : 'Selecionar'} todos
                    </Button>
                  )}
                  {canCreateProducts && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewProduct(category.id);
                      }}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar produto
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdateProducts && (
                        <DropdownMenuItem onClick={() => onEditCategory(category)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar categoria
                        </DropdownMenuItem>
                      )}
                      {canCreateProducts && (
                        <DropdownMenuItem onClick={() => onDuplicateCategory(category)}>
                          <Files className="mr-2 h-4 w-4" />
                          Duplicar categoria
                        </DropdownMenuItem>
                      )}
                      {canDeleteProducts && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDeleteCategory(category.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover categoria
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-3 p-4">
                  {categoryDishes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum produto nesta categoria
                    </div>
                  ) : (
                    categoryDishes.map(renderDesktopDishRow)
                  )}
                </div>
              )}
            </div>
          );
        })}

        {safeCategories.length === 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum produto"
            description="Comece criando categorias e adicionando produtos ao cardápio."
            actionLabel="Criar primeira categoria"
            onAction={onOpenCategoryModal}
          />
        )}

        {safeCategories.length > 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum produto"
            description="Adicione produtos às categorias criadas para começar a vender."
            actionLabel="Cadastrar primeiro produto"
            onAction={onOpenNewProduct}
          />
        )}
      </div>

      {canCreateProducts && (
        <div className="lg:hidden">
          <MobileFloatingActions
            onAddDish={onOpenNewProduct}
            onAddCategory={onOpenCategoryModal}
          />
        </div>
      )}
    </>
  );
}
