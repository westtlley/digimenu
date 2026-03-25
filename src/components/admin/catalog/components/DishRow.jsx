import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp, Copy, Edit as EditIcon, Files, Layers, MoreVertical, Pencil, Play, Pause, Plus, Settings, Trash2, GripVertical } from 'lucide-react';
import DishStatusToggle from './DishStatusToggle';
import ChannelToggle from './ChannelToggle';
function MenuDishRow({ dish, complementGroups, expanded, onToggleExpand, onEdit, onDelete, onDuplicate, onUpdate, onToggleOption, onUpdateOptionName, onOpenOptionImagePicker, onUpdateOptionPrice, onRemoveOption, onDuplicateOption, onAddOption, onAddGroup, onReuseGroup, onRemoveGroup, onOpenReuseModal, allComplementGroups, allDishes, onEditGroup, getGroupUsageInfo, formatCurrency, updateDishMutation, updateComplementGroupMutation, createComplementGroupMutation, isSelected, onToggleSelection, canEdit, canCreate, canDelete, setBulkEditGroup, setShowBulkEditModal }) {
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [editingOptionValue, setEditingOptionValue] = useState('');
  const [editingOptionPrice, setEditingOptionPrice] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [uploadingImageForOption, setUploadingImageForOption] = useState(null);
  const [editingDishPrice, setEditingDishPrice] = useState(false);
  const [editingDishStock, setEditingDishStock] = useState(false);
  const [tempPrice, setTempPrice] = useState('');
  const [tempStock, setTempStock] = useState('');

  const safeComplementGroupsProp = Array.isArray(complementGroups) ? complementGroups : [];
  const linkedGroups = (dish.complement_groups || [])
    .map(cg => safeComplementGroupsProp.find(g => g.id === cg.group_id))
    .filter(Boolean);

  const isOutOfStock = dish.stock !== null && dish.stock !== undefined && dish.stock !== '' && dish.stock <= 0;
  const hasDiscount = dish.original_price && dish.original_price > dish.price;

  const isInactive = dish.is_active === false;

  return (
    <>
    <div className={`bg-card border border-border rounded-lg overflow-hidden hover:shadow-sm transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isInactive ? 'opacity-90' : ''}`}>
      <div className="flex items-center gap-3 p-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="w-4 h-4 rounded"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="w-16 h-16 flex-shrink-0 bg-muted rounded overflow-hidden relative">
          {dish.image ? (
            <img src={dish.image} alt={dish.name} className={`w-full h-full object-cover ${isInactive ? 'grayscale' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem foto</div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">Esgotado</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-base">{dish.name} {dish.portion && <span className="text-muted-foreground">({dish.portion})</span>}</h3>
                {dish.is_new && <Badge variant="outline" className="text-sm bg-green-50 text-green-700">âœ¨ Novo</Badge>}
                {dish.is_popular && <Badge variant="outline" className="text-sm bg-purple-50 text-purple-700">ðŸ”¥ Popular</Badge>}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">{dish.description}</p>
              {dish.tags && dish.tags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {dish.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-sm px-1.5 py-0.5 bg-muted rounded">
                      {tag}
                    </span>
                  ))}
                  {dish.tags.length > 3 && <span className="text-sm text-muted-foreground">+{dish.tags.length - 3}</span>}
                </div>
              )}
              {dish.internal_notes && (
                <p className="text-sm text-orange-600 mt-1">ðŸ“ {dish.internal_notes}</p>
              )}
            </div>
            <Badge 
              className={`text-sm ${canEdit ? 'cursor-pointer hover:bg-yellow-200' : 'cursor-default'} transition-all ${dish.is_highlight ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) onUpdate({ is_highlight: !dish.is_highlight });
              }}
            >
              {dish.is_highlight ? 'â­ Destaque' : 'Destaque'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {(dish.stock !== null && dish.stock !== undefined && dish.stock !== '') && (
              <span>Estoque: {dish.stock}</span>
            )}
            {(dish.stock === null || dish.stock === undefined || dish.stock === '') && (
              <span className="text-green-600">Estoque: Ilimitado</span>
            )}
            {dish.prep_time && (
              <span>â±ï¸ {dish.prep_time}min</span>
            )}
          </div>
        </div>

        <button 
          onClick={onToggleExpand} 
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm border rounded hover:bg-muted/50"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Complementos</span>
          <Badge variant="outline" className="text-sm">{linkedGroups.length}</Badge>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className="flex flex-col items-end gap-1">
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">{formatCurrency(dish.original_price)}</span>
          )}
          {editingDishPrice ? (
            <Input
              type="number"
              step="0.01"
              value={tempPrice}
              onChange={(e) => setTempPrice(e.target.value)}
              onBlur={() => {
                onUpdate({ price: parseFloat(tempPrice) || dish.price });
                setEditingDishPrice(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdate({ price: parseFloat(tempPrice) || dish.price });
                  setEditingDishPrice(false);
                }
                if (e.key === 'Escape') {
                  setEditingDishPrice(false);
                }
              }}
              className="h-7 w-24 text-sm"
              autoFocus
            />
          ) : (
            <span 
              className={`font-semibold text-base whitespace-nowrap ${canEdit ? 'cursor-pointer hover:bg-muted' : ''} px-2 py-1 rounded ${hasDiscount ? 'text-green-600' : ''}`}
              onClick={() => {
                if (!canEdit) return;
                setTempPrice(dish.price?.toString() || '0');
                setEditingDishPrice(true);
              }}
              title={canEdit ? "Clique para editar" : ""}
            >
              {formatCurrency(dish.price)}
            </span>
          )}
          {(dish.stock !== null && dish.stock !== undefined && dish.stock !== '') && (
            editingDishStock ? (
              <Input
                type="number"
                value={tempStock}
                onChange={(e) => setTempStock(e.target.value)}
                onBlur={() => {
                  onUpdate({ stock: parseFloat(tempStock) || 0 });
                  setEditingDishStock(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdate({ stock: parseFloat(tempStock) || 0 });
                    setEditingDishStock(false);
                  }
                  if (e.key === 'Escape') {
                    setEditingDishStock(false);
                  }
                }}
                className="h-6 w-20 text-xs"
                autoFocus
              />
            ) : (
              <span 
                className={`text-xs text-muted-foreground ${canEdit ? 'cursor-pointer hover:bg-muted' : ''} px-2 py-0.5 rounded`}
                onClick={() => {
                  if (!canEdit) return;
                  setTempStock(dish.stock?.toString() || '0');
                  setEditingDishStock(true);
                }}
                title={canEdit ? "Clique para editar estoque" : ""}
              >
                Est: {dish.stock}
              </span>
            )
          )}
        </div>

        <DishStatusToggle
          isActive={dish.is_active !== false}
          onToggle={() => {
            if (canEdit) onUpdate({ is_active: dish.is_active === false });
          }}
          disabled={!canEdit}
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar item
              </DropdownMenuItem>
            )}
            {canCreate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Files className="w-4 h-4 mr-2" />
                Duplicar item
              </DropdownMenuItem>
            )}
            {(canEdit || canCreate || canDelete) && <DropdownMenuSeparator />}
            {canDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Remover item
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="border-t bg-muted/50 p-4 space-y-3">
          <DragDropContext onDragEnd={(result) => {
            if (!canEdit) return;
            if (!result.destination) return;
            if (result.source.index === result.destination.index) return;
            
            const items = Array.from(dish.complement_groups || []);
            const [reordered] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reordered);
            
            updateDishMutation.mutate({
              id: dish.id,
              data: { complement_groups: items }
            });
          }}>
            <Droppable droppableId={`dish-groups-${dish.id}`}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {linkedGroups.map((group, groupIndex) => {
                    const linked = dish.complement_groups?.find(cg => cg.group_id === group.id);
                    const usageInfo = getGroupUsageInfo(group.id);
                    const isOriginal = usageInfo.firstDishId === dish.id;
                    
                    return (
                      <Draggable key={group.id} draggableId={`group-${dish.id}-${group.id}`} index={groupIndex}>
                        {(provided, snapshot) => (
                          <div 
                           ref={provided.innerRef}
                           {...provided.draggableProps}
                           className={`bg-card rounded-lg p-3 border border-border transition-all ${
                             snapshot.isDragging ? 'shadow-lg ring-2 ring-orange-500' : ''
                           }`}
                          >
                           <div className="flex items-center gap-2 mb-3">
                             {canEdit && (
                               <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                 <GripVertical className="w-5 h-5 text-muted-foreground" />
                               </div>
                             )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{group.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${canEdit ? 'cursor-pointer hover:bg-red-200' : 'cursor-default'} transition-colors ${linked?.is_required ? 'bg-red-100 text-red-700' : 'bg-muted text-foreground'}`}
                        onClick={(e) => {
                          if (!canEdit) return;
                          e.stopPropagation();
                          const updatedGroups = (dish.complement_groups || []).map(cg =>
                            cg.group_id === group.id ? { ...cg, is_required: !linked?.is_required } : cg
                          );
                          updateDishMutation.mutate({ 
                            id: dish.id, 
                            data: { complement_groups: updatedGroups }
                          });
                        }}
                      >
                        {linked?.is_required ? 'Obrigatório' : 'Opcional'}
                      </Badge>
                                  {isOriginal ? (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Original</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Reutilizado</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {canEdit && (
                                  <Button variant="ghost" size="sm" onClick={() => onEditGroup(group)} title="Configurações">
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      setBulkEditGroup(group);
                                      setShowBulkEditModal(true);
                                    }} 
                                    title="EdiÃ§Ã£o em massa"
                                  >
                                    <EditIcon className="w-4 h-4" />
                                  </Button>
                                )}
                                {canCreate && (
                                  <Button variant="ghost" size="sm" onClick={() => onAddOption(group.id)} title="Adicionar opção">
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                                {canCreate && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={async () => {
                                      const newGroup = {
                                        name: `${group.name} (Cópia)`,
                                        is_required: group.is_required,
                                        max_selection: group.max_selection,
                                        options: group.options || [],
                                        order: allComplementGroups.length
                                      };
                                      await createComplementGroupMutation.mutateAsync(newGroup);
                                    }}
                                    title="Duplicar grupo"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button variant="ghost" size="sm" onClick={() => onRemoveGroup(group.id)} className="text-red-500 hover:text-red-700" title="Remover grupo">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                <DragDropContext onDragEnd={(result) => {
                  if (!canEdit) return;
                  if (!result.destination) return;
                  const items = Array.from(group.options || []);
                  const [reordered] = items.splice(result.source.index, 1);
                  items.splice(result.destination.index, 0, reordered);
                  updateComplementGroupMutation.mutate({
                    id: group.id,
                    data: { ...group, options: items }
                  });
                }}>
                  <Droppable droppableId={`options-${group.id}`}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {(group.options || []).map((opt, optIndex) => (
                          <Draggable key={opt.id} draggableId={opt.id} index={optIndex}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`flex items-center gap-3 p-2 rounded transition-all ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                                } ${opt.is_active !== false ? 'bg-card' : 'bg-red-50'}`}
                                >
                                {canEdit && (
                                 <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" />
                                )}
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onOpenOptionImagePicker(group.id, opt.id)}
                          className="cursor-pointer relative group rounded-xl"
                        >
                          {opt.image ? (
                            <img src={opt.image} alt={opt.name} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                              +
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-0 rounded bg-black/0 transition-colors group-hover:bg-black/10" />
                        </button>
                      ) : (
                        opt.image ? (
                          <img src={opt.image} alt={opt.name} className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            -
                          </div>
                        )
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {editingOptionId === opt.id ? (
                          <Input 
                            value={editingOptionValue}
                            onChange={(e) => setEditingOptionValue(e.target.value)}
                            onBlur={() => {
                              onUpdateOptionName(group.id, opt.id, editingOptionValue);
                              setEditingOptionId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateOptionName(group.id, opt.id, editingOptionValue);
                                setEditingOptionId(null);
                              }
                            }}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div>
                            <span 
                               className={`text-sm font-medium ${canEdit ? 'cursor-pointer hover:text-blue-600' : ''} block`}
                               onClick={() => {
                                 if (!canEdit) return;
                                 setEditingOptionId(opt.id);
                                 setEditingOptionValue(opt.name);
                               }}
                             >
                               {opt.name}
                             </span>
                            {editingOptionPrice === opt.id ? (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-muted-foreground">R$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editingPriceValue}
                                  onChange={(e) => setEditingPriceValue(e.target.value)}
                                  onBlur={() => {
                                    onUpdateOptionPrice(group.id, opt.id, editingPriceValue);
                                    setEditingOptionPrice(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      onUpdateOptionPrice(group.id, opt.id, editingPriceValue);
                                      setEditingOptionPrice(null);
                                    }
                                  }}
                                  className="h-6 w-20 text-xs"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <span 
                                className={`text-xs text-muted-foreground ${canEdit ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                onClick={() => {
                                  if (!canEdit) return;
                                  setEditingOptionPrice(opt.id);
                                  setEditingPriceValue((opt.price || 0).toString());
                                }}
                              >
                                {opt.price > 0 ? formatCurrency(opt.price) : '+ Adicionar preço'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={`h-8 w-8 rounded-full border transition-colors ${
                            opt.is_active !== false
                              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          onClick={() => {
                            if (canEdit) onToggleOption(group.id, opt.id, opt.is_active !== false);
                          }}
                          disabled={!canEdit}
                          title={opt.is_active !== false ? 'Pausar opção' : 'Ativar opção'}
                        >
                          {opt.is_active !== false ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </Button>
                        {(canEdit || canCreate || canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingOptionId(opt.id);
                                    setEditingOptionValue(opt.name);
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Editar opção
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingOptionPrice(opt.id);
                                    setEditingPriceValue((opt.price || 0).toString());
                                  }}
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Editar preço
                                </DropdownMenuItem>
                              )}
                              {canCreate && (
                                <DropdownMenuItem onClick={() => onDuplicateOption(group.id, opt.id)}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Duplicar opção
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onRemoveOption(group.id, opt.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover opção
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {canCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Grupo de Complementos
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onClick={onAddGroup}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar novo grupo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenReuseModal}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar grupo existente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
    </>
  );
}

function ProductListRow({
  dish,
  categoryName,
  isSelected,
  showSelection = true,
  showPDVControls = false,
  pdvEnabled = false,
  onToggleSelection,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onTogglePDV,
  canEdit,
  canCreate,
  canDelete,
  formatCurrency,
}) {
  const isInactive = dish?.is_active === false;
  const hasDiscount = dish?.original_price && dish?.original_price > dish?.price;
  const gridClass = showPDVControls
    ? 'grid-cols-[auto_4rem_minmax(0,1.8fr)_minmax(0,1fr)_7rem_8rem_8rem_auto]'
    : 'grid-cols-[auto_4rem_minmax(0,1.8fr)_minmax(0,1fr)_7rem_7rem_auto]';

  return (
    <div className={`grid ${gridClass} items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      {showSelection ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="h-4 w-4 rounded"
        />
      ) : (
        <div className="h-4 w-4" />
      )}

      <div className="h-16 w-16 overflow-hidden rounded-xl bg-muted">
        {dish?.image ? (
          <img src={dish.image} alt={dish.name} className={`h-full w-full object-cover ${isInactive ? 'grayscale' : ''}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">Sem foto</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{dish?.name || 'Produto sem nome'}</p>
          {dish?.is_highlight && <Badge variant="outline" className="text-[10px]">Destaque</Badge>}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{dish?.description || 'Sem descrição'}</p>
      </div>

      <div className="min-w-0">
        <Badge variant="secondary" className="max-w-full truncate text-xs">
          {categoryName || 'Sem categoria'}
        </Badge>
        {dish?.product_type && (
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {dish.product_type === 'preparado' ? 'Produto principal' : dish.product_type}
          </p>
        )}
      </div>

      <div className="text-sm">
        {hasDiscount && (
          <p className="text-[11px] text-muted-foreground line-through">{formatCurrency(dish.original_price)}</p>
        )}
        <p className={`font-semibold ${hasDiscount ? 'text-green-600' : 'text-foreground'}`}>{formatCurrency(dish?.price || 0)}</p>
      </div>

      <div>
        <div className="flex flex-col gap-1">
          <Badge variant={isInactive ? 'outline' : 'default'} className={`w-fit text-xs ${isInactive ? 'text-muted-foreground' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}`}>
            {isInactive ? 'Inativo' : 'Ativo'}
          </Badge>
          {showPDVControls && (
            <Badge
              variant="secondary"
              className={`w-fit text-xs ${pdvEnabled ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}`}
            >
              {pdvEnabled ? 'PDV ativo' : 'PDV off'}
            </Badge>
          )}
        </div>
      </div>

      {showPDVControls && (
        <div>
          <ChannelToggle
            enabled={pdvEnabled}
            onToggle={onTogglePDV}
            disabled={!canEdit}
            title={pdvEnabled ? 'Desativar no PDV' : 'Ativar no PDV'}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <DishStatusToggle
          isActive={dish?.is_active !== false}
          onToggle={onToggleActive}
          disabled={!canEdit}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar produto
              </DropdownMenuItem>
            )}
            {canCreate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Files className="mr-2 h-4 w-4" />
                Duplicar produto
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover produto
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
export default function DishRow({ variant = 'menu', ...props }) {
  if (variant === 'products') {
    return <ProductListRow {...props} />;
  }

  return <MenuDishRow {...props} />;
}

export { MenuDishRow, ProductListRow };
