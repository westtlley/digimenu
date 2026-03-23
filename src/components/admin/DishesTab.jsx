// ========= IMPORTS =========
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { usePermission } from '../permissions/usePermission';
import { useEntitlements } from '@/hooks/useEntitlements';
import { LimitBlockModal } from '@/components/plans';
import { fetchAdminDishes, fetchAdminCategories, fetchAdminComplementGroups } from '@/services/adminMenuService';
import { log } from '@/utils/logger';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Star, ChevronDown, ChevronUp, MoreVertical, Layers, Copy, FolderPlus, Menu, Settings, Files, Pencil, X, GripVertical, Search, Edit as EditIcon, UtensilsCrossed, LayoutGrid, CheckCircle, Package } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ReuseGroupModal from './ReuseGroupModal';
import ReorderModal from './ReorderModal';
import CategoryForm from './CategoryForm';
import ComplementTemplates from './ComplementTemplates';
import BulkEditOptions from './BulkEditOptions';
import ProductTypeModal from './ProductTypeModal';
import CategoriesTab from './CategoriesTab';
import ComplementsTab from './ComplementsTab';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MobileDishCard from './mobile/MobileDishCard';
import MobileCategoryAccordion from './mobile/MobileCategoryAccordion';
import MobileFloatingActions from './mobile/MobileFloatingActions';
import MobileFilterChips from './mobile/MobileFilterChips';
import MobileBottomSheet from './mobile/MobileBottomSheet';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts, getMenuContextSubscriberEmail } from '@/utils/tenantScope';
import MobileDishSkeleton from './mobile/MobileDishSkeleton';
import MobileDishComplementsSheet from './mobile/MobileDishComplementsSheet';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import EmptyState from '../atoms/EmptyState';
import { useManagerialAuth } from '@/hooks/useManagerialAuth';
import DishesSkeleton from '../skeletons/DishesSkeleton';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import { formatCurrency } from '@/utils/formatters';

// ========= DishRow (extraído para evitar erro de parser no build) =========
export function DishRow({ dish, complementGroups, expanded, onToggleExpand, onEdit, onDelete, onDuplicate, onUpdate, onToggleOption, onUpdateOptionName, onUpdateOptionImage, onUpdateOptionPrice, onRemoveOption, onAddOption, onAddGroup, onReuseGroup, onRemoveGroup, onOpenReuseModal, allComplementGroups, allDishes, onEditGroup, getGroupUsageInfo, formatCurrency, updateDishMutation, updateComplementGroupMutation, createComplementGroupMutation, isSelected, onToggleSelection, canEdit, canCreate, canDelete, setBulkEditGroup, setShowBulkEditModal }) {
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
                {dish.is_new && <Badge variant="outline" className="text-sm bg-green-50 text-green-700">✨ Novo</Badge>}
                {dish.is_popular && <Badge variant="outline" className="text-sm bg-purple-50 text-purple-700">🔥 Popular</Badge>}
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
                <p className="text-sm text-orange-600 mt-1">📝 {dish.internal_notes}</p>
              )}
            </div>
            <Badge 
              className={`text-sm ${canEdit ? 'cursor-pointer hover:bg-yellow-200' : 'cursor-default'} transition-all ${dish.is_highlight ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) onUpdate({ is_highlight: !dish.is_highlight });
              }}
            >
              {dish.is_highlight ? '⭐ Destaque' : 'Destaque'}
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
              <span>⏱️ {dish.prep_time}min</span>
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

        <Switch 
          checked={dish.is_active !== false} 
          onCheckedChange={(checked) => {
            if (canEdit) onUpdate({ is_active: checked });
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
              <DropdownMenuItem onClick={() => confirm('Excluir?') && onDelete()} className="text-red-600">
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
                        {linked?.is_required ? '✓ Obrigatório' : 'Opcional'}
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
                                    title="Edição em massa"
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
                        <label className="cursor-pointer relative">
                          {opt.image ? (
                            <img src={opt.image} alt={opt.name} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                              +
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingImageForOption(opt.id);
                                onUpdateOptionImage(group.id, opt.id, file).then(() => {
                                  setUploadingImageForOption(null);
                                });
                              }
                            }}
                          />
                        </label>
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
                        <Switch 
                          checked={opt.is_active !== false} 
                          onCheckedChange={() => {
                            if (canEdit) onToggleOption(group.id, opt.id, opt.is_active !== false);
                          }}
                          disabled={!canEdit}
                        />
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onRemoveOption(group.id, opt.id)}
                            className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
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

function normalizeCategoryId(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

function sameCategoryId(left, right) {
  const normalizedLeft = normalizeCategoryId(left);
  const normalizedRight = normalizeCategoryId(right);
  return normalizedLeft !== '' && normalizedLeft === normalizedRight;
}

// ========= COMPONENT =========
export default function DishesTab({ onNavigateToPizzas, onNavigateToPromotions, initialTab = 'dishes' }) {
  log.admin.debug('🍽️ [DishesTab] Componente montado, initialTab:', initialTab);
  
  const [user, setUser] = React.useState(null);
  const [showDishModal, setShowDishModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditGroup, setBulkEditGroup] = useState(null);
  const [editingDish, setEditingDish] = useState(null);
  const [showProductTypeModal, setShowProductTypeModal] = useState(false);
  const [selectedCategoryForNewDish, setSelectedCategoryForNewDish] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedDishes, setExpandedDishes] = useState({});
  const [dishFormData, setDishFormData] = useState({
    name: '', description: '', price: '', original_price: '', image: '', category_id: '', stock: '',
    portion: '', is_highlight: false, is_active: true, complement_groups: [], is_new: false, 
    is_popular: false, prep_time: '', tags: [], internal_notes: '', product_type: 'preparado',
    video_url: '',
    video_autoplay: true,
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [complementMode, setComplementMode] = useState(null);
  const [copyFromDishId, setCopyFromDishId] = useState('');
  const [showReuseGroupModal, setShowReuseGroupModal] = useState(false);
  const [currentDishForReuse, setCurrentDishForReuse] = useState(null);
  const [editingOptionPrice, setEditingOptionPrice] = useState(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileComplementsDish, setMobileComplementsDish] = useState(null);
  const [internalTab, setInternalTab] = useState(initialTab); // ✅ Aba interna: 'dishes', 'categories', 'complements'
  
  // ✅ Atualizar aba quando initialTab mudar
  useEffect(() => {
    if (initialTab) {
      setInternalTab(initialTab);
    }
  }, [initialTab]);

  // ✅ NOVO: Usar menuContext do usePermission (loading: aguardar contexto antes de buscar pratos)
  const { canCreate, canUpdate, canDelete, hasModuleAccess, subscriberData, menuContext, user: permissionUser, loading: permissionLoading } = usePermission();
  const { canAddProduct, plan, effectiveLimits, usage, limitReached } = useEntitlements();
  const [limitBlockOpen, setLimitBlockOpen] = useState(false);
  const hasPizzaService = hasModuleAccess('pizza_config');
  const canEdit = canUpdate('dishes');
  
  log.admin.debug('🍽️ [DishesTab] Permissões:', {
    canCreate: canCreate('dishes'),
    canUpdate: canUpdate('dishes'),
    canDelete: canDelete('dishes'),
    hasPizzaService,
    canEdit,
    menuContext
  });
  
  // ✅ Usar user do usePermission se disponível, senão carregar
  React.useEffect(() => {
    if (permissionUser) {
      setUser(permissionUser);
      log.admin.debug('🍽️ [DishesTab] Usuário do usePermission:', permissionUser?.email);
    } else {
      const loadUser = async () => {
        try {
          log.admin.debug('🍽️ [DishesTab] Carregando usuário...');
          const userData = await base44.auth.me();
          log.admin.debug('🍽️ [DishesTab] Usuário carregado:', userData?.email);
          setUser(userData);
        } catch (e) {
          log.admin.error('🍽️ [DishesTab] Error loading user:', e);
        }
      };
      loadUser();
    }
  }, [permissionUser]);
  
  const queryClient = useQueryClient();
  const slug = menuContext?.type === 'slug' ? menuContext?.value : null;

  // ✅ Para master (slug): buscar cardápio público e usar para pratos, categorias e grupos
  const { data: publicCardapio, isLoading: publicCardapioLoading } = useQuery({
    queryKey: ['publicCardapio', slug],
    queryFn: async () => {
      if (!slug) return null;
      return await apiClient.get(`/public/cardapio/${slug}`);
    },
    enabled: !!slug,
    staleTime: 30000,
    gcTime: 60000,
  });

  // ✅ Helper para obter subscriber_email correto baseado no contexto
  const getSubscriberEmail = () => getMenuContextSubscriberEmail(menuContext, user?.email);
  const menuQueryKeyParts = getMenuContextQueryKeyParts(menuContext);
  const menuEntityOpts = getMenuContextEntityOpts(menuContext);

  // ========= BUSCAR DADOS COM CONTEXTO =========
  // ✅ Admin API; quando slug (master) usamos publicCardapio para exibir
  const { data: adminDishes = [], isLoading: dishesLoading, error: dishesError, refetch: refetchDishes } = useQuery({
    queryKey: ['dishes', ...menuQueryKeyParts],
    queryFn: async () => {
      if (!menuContext) return [];
      return await fetchAdminDishes(menuContext);
    },
    enabled: !!menuContext && !slug,
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 60000,
  });

  const { data: adminCategories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useQuery({
    queryKey: ['categories', ...menuQueryKeyParts],
    queryFn: async () => {
      if (!menuContext) return [];
      return await fetchAdminCategories(menuContext);
    },
    enabled: !!menuContext && !slug,
    placeholderData: keepPreviousData,
    retry: 1,
    refetchOnMount: true,
    staleTime: 60000,
    gcTime: 120000,
  });

  const { data: adminComplementGroups = [], isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['complementGroups', ...menuQueryKeyParts],
    queryFn: async () => {
      if (!menuContext) return [];
      return await fetchAdminComplementGroups(menuContext);
    },
    enabled: !!menuContext && !slug,
    placeholderData: keepPreviousData,
    retry: 2,
    refetchOnMount: false,
    staleTime: 60000,
    gcTime: 120000,
  });

  // ✅ Fonte única: cardápio público (slug) ou admin
  const dishes = (slug && Array.isArray(publicCardapio?.dishes)) ? publicCardapio.dishes : (adminDishes || []);
  const categories = (slug && Array.isArray(publicCardapio?.categories)) ? publicCardapio.categories : (adminCategories || []);
  const complementGroups = (slug && Array.isArray(publicCardapio?.complementGroups)) ? publicCardapio.complementGroups : (adminComplementGroups || []);

  const isLoadingDishes = slug ? publicCardapioLoading : dishesLoading;
  const isLoadingCategories = slug ? publicCardapioLoading : categoriesLoading;
  const isLoadingGroups = slug ? publicCardapioLoading : groupsLoading;

  useEffect(() => {
    if (menuContext && !slug && dishes.length === 0 && !dishesLoading) {
      refetchDishes();
    }
  }, [menuContext?.type, menuContext?.value, slug]);

  // Corrige bug: categorias vazias mas pratos têm category_id → refetch categorias
  useEffect(() => {
    const dishesWithCategory = (dishes || []).filter(d => d.category_id && d.product_type !== 'pizza' && d.product_type !== 'beverage');
    const cats = Array.isArray(categories) ? categories : [];
    if (menuContext && !slug && dishesWithCategory.length > 0 && cats.length === 0 && !categoriesLoading) {
      refetchCategories();
    }
  }, [menuContext, slug, dishes, categories, categoriesLoading, refetchCategories]);

  // ========= MUTATIONS =========
  const createDishMutation = useMutation({
    mutationFn: async (data) => {
      const subscriberEmail = getSubscriberEmail();
      const dishData = {
        ...data,
        ...(subscriberEmail && { owner_email: subscriberEmail }),
        ...menuEntityOpts
      };
      return base44.entities.Dish.create(dishData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Prato adicionado com sucesso!');
      closeDishModal();
    },
    onError: () => {
      toast.error('Erro ao adicionar prato');
    }
  });

  const updateDishMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const opts = menuEntityOpts;
      return base44.entities.Dish.update(id, data, opts);
    },
    onMutate: async ({ id, data }) => {
      const key = ['dishes', ...menuQueryKeyParts];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((d) => (d.id === id || String(d.id) === String(id)) ? { ...d, ...data } : d);
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['dishes', ...menuQueryKeyParts], ctx.prev);
      }
      toast.error('Erro ao atualizar prato');
    },
    onSuccess: () => toast.success('Prato atualizado!'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
    }
  });

  const deleteDishMutation = useMutation({
    mutationFn: (id) => {
      const opts = menuEntityOpts;
      return base44.entities.Dish.delete(id, opts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Prato excluído');
    },
    onError: () => toast.error('Erro ao excluir prato')
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data) => {
      const subscriberEmail = getSubscriberEmail();
      return base44.entities.Category.create({
        ...data,
        ...(subscriberEmail && { owner_email: subscriberEmail }),
        ...menuEntityOpts
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Categoria criada com sucesso!');
      setShowCategoryModal(false);
      setEditingCategory(null);
    },
    onError: () => toast.error('Erro ao criar categoria')
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const opts = menuEntityOpts;
      return base44.entities.Category.update(id, data, opts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Categoria atualizada!');
      setShowCategoryModal(false);
      setEditingCategory(null);
    },
    onError: () => toast.error('Erro ao atualizar categoria')
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => {
      const opts = menuEntityOpts;
      return base44.entities.Category.delete(id, opts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', ...menuQueryKeyParts] });
      queryClient.invalidateQueries({ queryKey: ['dishes', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Categoria excluída');
    },
    onError: () => toast.error('Erro ao excluir categoria')
  });

  const { requireAuthorization, modal } = useManagerialAuth();
  const handleDeleteDishWithAuth = (id) => requireAuthorization('excluir', () => {
    if (confirm('Excluir este prato?')) deleteDishMutation.mutate(id);
  });
  const handleDeleteCategoryWithAuth = (id) => requireAuthorization('excluir', () => {
    if (confirm('Excluir categoria e seus pratos?')) deleteCategoryMutation.mutate(id);
  });
  const handleBulkDeleteWithAuth = () => requireAuthorization('excluir', () => {
    if (selectedDishes.length === 0) return;
    if (!confirm(`Excluir ${selectedDishes.length} pratos selecionados?`)) return;
    selectedDishes.forEach(dishId => deleteDishMutation.mutate(dishId));
    setSelectedDishes([]);
  });

  const createComplementGroupMutation = useMutation({
    mutationFn: async (data) => {
      const subscriberEmail = getSubscriberEmail();
      return base44.entities.ComplementGroup.create({
        ...data,
        ...(subscriberEmail && { owner_email: subscriberEmail }),
        ...menuEntityOpts
      });
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      return newGroup;
    },
  });

  const updateComplementGroupMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const opts = menuEntityOpts;
      return base44.entities.ComplementGroup.update(id, data, opts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups', ...menuQueryKeyParts] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
    },
  });

  // Validações de segurança - DECLARADAS AQUI PARA ESTAREM DISPONÍVEIS EM TODAS AS FUNÇÕES
  // ✅ Filtrar pizzas E bebidas (bebidas vão para BeveragesTab)
  const safeDishes = (Array.isArray(dishes) ? dishes : []).filter(d => d.product_type !== 'pizza' && d.product_type !== 'beverage');
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeComplementGroups = Array.isArray(complementGroups) ? complementGroups : [];

 // ========= FUNÇÕES PRINCIPAIS =========
  const openDishModal = (dish = null, categoryId = '', productType = 'preparado') => {
    if (dish) {
      setEditingDish(dish);
      setDishFormData({
        name: dish.name || '', description: dish.description || '',
        price: dish.price?.toString() || '', original_price: dish.original_price?.toString() || '',
        image: dish.image || '', category_id: dish.category_id || '',
        is_highlight: dish.is_highlight || false, is_active: dish.is_active !== false,
        complement_groups: dish.complement_groups || [], 
        stock: (dish.stock === null || dish.stock === undefined) ? '' : dish.stock.toString(),
        portion: dish.portion || '', is_new: dish.is_new || false, is_popular: dish.is_popular || false,
        prep_time: dish.prep_time?.toString() || '', tags: dish.tags || [], internal_notes: dish.internal_notes || '',
        product_type: dish.product_type || 'preparado',
        video_url: dish.video_url || '',
        video_autoplay: dish.video_autoplay !== false, // default true
      });
      setComplementMode(null);
    } else {
      setEditingDish(null);
      setDishFormData({
        name: '', description: '', price: '', original_price: '', image: '', category_id: categoryId,
        is_highlight: false, is_active: true, complement_groups: [], stock: '', portion: '',
        is_new: false, is_popular: false, prep_time: '', tags: [], internal_notes: '',
        product_type: productType,
        video_url: '',
        video_autoplay: true,
      });
      setComplementMode(null);
      setCopyFromDishId('');
    }
    setShowDishModal(true);
  };

  const handleOpenProductTypeModal = (categoryId) => {
    if (!canAddProduct) {
      setLimitBlockOpen(true);
      return;
    }
    setSelectedCategoryForNewDish(categoryId);
    setShowProductTypeModal(true);
  };

  const handleSelectProductType = (type) => {
    setShowProductTypeModal(false);
    openDishModal(null, selectedCategoryForNewDish, type);
  };

  const handleRedirectToPizzas = () => {
    if (onNavigateToPizzas) {
      onNavigateToPizzas();
    }
  };

  const handleRedirectToPromotions = () => {
    if (onNavigateToPromotions) {
      onNavigateToPromotions();
      return;
    }
    toast('Gerencie combos na aba Promoções.');
  };

  const closeDishModal = () => {
    setShowDishModal(false);
    setEditingDish(null);
    setComplementMode(null);
    setCopyFromDishId('');
  };

  const handleDishSubmit = (e) => {
    e.preventDefault();
    
    if (!dishFormData.name.trim()) {
      toast.error('O nome do prato é obrigatório');
      return;
    }
    
    if (!dishFormData.price || parseFloat(dishFormData.price) < 0) {
      toast.error('Informe um preço válido');
      return;
    }
    
    if (dishFormData.original_price && parseFloat(dishFormData.original_price) < parseFloat(dishFormData.price)) {
      toast.error('O preço original não pode ser menor que o preço atual');
      return;
    }
    
    let finalComplementGroups = dishFormData.complement_groups;
    
    if (!editingDish && complementMode === 'copy' && copyFromDishId) {
      const copyFromDish = safeDishes.find(d => d.id === copyFromDishId);
      if (copyFromDish?.complement_groups) {
        finalComplementGroups = copyFromDish.complement_groups;
      }
    }

    const data = { 
      ...dishFormData, 
      price: parseFloat(dishFormData.price) || 0,
      original_price: dishFormData.original_price ? parseFloat(dishFormData.original_price) : null,
      stock: dishFormData.stock === '' ? null : (dishFormData.stock ? parseFloat(dishFormData.stock) : null),
      prep_time: dishFormData.prep_time ? parseFloat(dishFormData.prep_time) : null,
      complement_groups: finalComplementGroups,
      video_url: dishFormData.video_url || '',
      video_autoplay: dishFormData.video_autoplay !== false
    };
    
    if (editingDish) {
      updateDishMutation.mutate({ id: editingDish.id, data });
      closeDishModal();
    } else {
      createDishMutation.mutate(data);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await uploadToCloudinary(file, 'dishes');
        setDishFormData(prev => ({ ...prev, image: imageUrl }));
        toast.success('Imagem enviada com sucesso!');
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        toast.error('Erro ao fazer upload da imagem');
      }
    }
  };

  const handleOptionImageUpload = async (groupId, optionId, file) => {
    try {
      const imageUrl = await uploadToCloudinary(file, 'complements');

      const group = safeComplementGroups.find(g => g.id === groupId);
      if (!group) return;

      const updatedOptions = (group.options || []).map(opt =>
        opt.id === optionId ? { ...opt, image: imageUrl } : opt
      );

      await updateComplementGroupMutation.mutateAsync({
        id: groupId,
        data: { ...group, options: updatedOptions }
      });

      toast.success("Imagem salva com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar imagem");
    }
  };

  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const toggleDishExpansion = (dishId) => {
    setExpandedDishes(prev => ({ ...prev, [dishId]: !prev[dishId] }));
  };

  const toggleComplementOption = (groupId, optionId, currentValue) => {
    const group = safeComplementGroups.find(g => g.id === groupId);
    if (!group) return;

    const newOptions = (group.options || []).map(opt =>
      opt.id === optionId ? { ...opt, is_active: !currentValue } : opt
    );

    updateComplementGroupMutation.mutate({
      id: groupId,
      data: { ...group, options: newOptions }
    });
  };

  const updateComplementOptionName = (groupId, optionId, newName) => {
    const group = safeComplementGroups.find(g => g.id === groupId);
    if (!group) return;

    const newOptions = (group.options || []).map(opt =>
      opt.id === optionId ? { ...opt, name: newName } : opt
    );

    updateComplementGroupMutation.mutate({
      id: groupId,
      data: { ...group, options: newOptions }
    });
  };

  const addNewComplementOption = (groupId) => {
    const name = prompt('Nome da opção:');
    if (!name) return;
    const priceStr = prompt('Preço adicional (deixe em branco para R$ 0,00):', '0');
    const price = parseFloat(priceStr) || 0;
    
    const group = safeComplementGroups.find(g => g.id === groupId);
    if (!group) return;

    const newOption = {
      id: Date.now().toString(),
      name,
      price,
      image: '',
      is_active: true,
    };

    updateComplementGroupMutation.mutate({
      id: groupId,
      data: {
        ...group,
        options: [...(group.options || []), newOption]
      }
    });
  };

  const updateComplementOptionImage = async (groupId, optionId, file) => {
    try {
      const imageUrl = await uploadToCloudinary(file, 'complements');
      const group = safeComplementGroups.find(g => g.id === groupId);
      if (!group) return;

      const newOptions = (group.options || []).map(opt =>
        opt.id === optionId ? { ...opt, image: imageUrl } : opt
      );

      updateComplementGroupMutation.mutate({
        id: groupId,
        data: { ...group, options: newOptions }
      });
      toast.success('Imagem atualizada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    }
  };

  const updateComplementOptionPrice = (groupId, optionId, newPrice) => {
    const group = safeComplementGroups.find(g => g.id === groupId);
    if (!group) return;

    const newOptions = (group.options || []).map(opt =>
      opt.id === optionId ? { ...opt, price: parseFloat(newPrice) || 0 } : opt
    );

    updateComplementGroupMutation.mutate({
      id: groupId,
      data: { ...group, options: newOptions }
    });
  };

  const getGroupUsageInfo = (groupId) => {
    const dishesUsingGroup = safeDishes.filter(d => 
      d.complement_groups?.some(cg => cg.group_id === groupId)
    );
    
    if (dishesUsingGroup.length === 0) return { type: 'original', count: 0 };
    
    const firstDish = dishesUsingGroup.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    )[0];
    
    return {
      type: dishesUsingGroup.length > 1 ? 'reused' : 'original',
      count: dishesUsingGroup.length,
      firstDishId: firstDish.id
    };
  };

  const addNewComplementGroupToDish = async (dishId) => {
    const name = prompt('Nome do grupo de complementos:');
    if (!name) return;
    
    const newGroup = {
      name,
      is_required: false,
      max_selection: 1,
      options: [],
      order: safeComplementGroups.length
    };

    const createdGroup = await createComplementGroupMutation.mutateAsync(newGroup);
    
    setTimeout(() => {
      const dish = safeDishes.find(d => d.id === dishId);
      if (dish && createdGroup) {
        const updatedGroups = [
          ...(dish.complement_groups || []),
          { group_id: createdGroup.id, is_required: false }
        ];
        updateDishMutation.mutate({
          id: dishId,
          data: { ...dish, complement_groups: updatedGroups }
        });
      }
    }, 300);
  };

  const reuseComplementGroupToDish = (dishId, groupId) => {
    const dish = safeDishes.find(d => d.id === dishId);
    if (!dish) return;
    
    const alreadyLinked = dish.complement_groups?.some(cg => cg.group_id === groupId);
    if (alreadyLinked) {
      alert('Este grupo já está vinculado a este prato');
      return;
    }

    const updatedGroups = [
      ...(dish.complement_groups || []),
      { group_id: groupId, is_required: false }
    ];
    updateDishMutation.mutate(
      { id: dishId, data: { ...dish, complement_groups: updatedGroups } },
      { onSettled: () => { queryClient.invalidateQueries({ queryKey: ['complementGroups', ...menuQueryKeyParts] }); if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] }); } }
    );
  };

  const reuseComplementGroupsToDish = (dishId, groupIds = []) => {
    const dish = safeDishes.find(d => d.id === dishId);
    if (!dish) return;

    const ids = Array.isArray(groupIds) ? groupIds.filter(Boolean) : [];
    if (ids.length === 0) return;

    const existingIds = new Set((dish.complement_groups || []).map(cg => cg.group_id));
    const newIds = ids.filter(groupId => !existingIds.has(groupId));
    if (newIds.length === 0) {
      toast('Todos os grupos selecionados já estão vinculados a este prato.');
      return;
    }

    const updatedGroups = [
      ...(dish.complement_groups || []),
      ...newIds.map(groupId => ({ group_id: groupId, is_required: false }))
    ];

    updateDishMutation.mutate(
      { id: dishId, data: { ...dish, complement_groups: updatedGroups } },
      {
        onSuccess: () => {
          if (newIds.length < ids.length) {
            toast.success(`${newIds.length} grupo(s) adicionado(s). ${ids.length - newIds.length} já estavam vinculados.`);
          } else {
            toast.success(`${newIds.length} grupo(s) adicionado(s) ao prato.`);
          }
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ['complementGroups', ...menuQueryKeyParts] });
          if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
        }
      }
    );
  };

  const removeGroupFromDish = (dishId, groupId) => {
    if (!confirm('Remover este grupo de complementos?')) return;
    
    const dish = safeDishes.find(d => d.id === dishId);
    if (!dish) return;

    const updatedGroups = (dish.complement_groups || []).filter(cg => cg.group_id !== groupId);
    updateDishMutation.mutate({
      id: dishId,
      data: { ...dish, complement_groups: updatedGroups }
    });
  };

  const removeComplementOption = (groupId, optionId) => {
    if (!confirm('Remover este complemento?')) return;
    
    const group = safeComplementGroups.find(g => g.id === groupId);
    if (!group) return;

    const newOptions = (group.options || []).filter(opt => opt.id !== optionId);
    updateComplementGroupMutation.mutate({
      id: groupId,
      data: { ...group, options: newOptions }
    });
  };

  const openGroupSettings = (group, dishId) => {
    setEditingGroup({ ...group, dishId });
    setShowGroupSettingsModal(true);
  };

  const handleGroupSettingsSave = () => {
    if (!editingGroup) return;
    
    updateComplementGroupMutation.mutate({
      id: editingGroup.id,
      data: {
        name: editingGroup.name,
        max_selection: editingGroup.max_selection,
        options: editingGroup.options,
        order: editingGroup.order
      }
    });
    
    if (editingGroup.dishId) {
      const dish = safeDishes.find(d => d.id === editingGroup.dishId);
      if (dish) {
        const updatedGroups = (dish.complement_groups || []).map(cg =>
          cg.group_id === editingGroup.id 
            ? { ...cg, is_required: editingGroup.is_required } 
            : cg
        );
        updateDishMutation.mutate({
          id: editingGroup.dishId,
          data: { ...dish, complement_groups: updatedGroups }
        });
      }
    }
    
    setShowGroupSettingsModal(false);
    setEditingGroup(null);
  };

  const duplicateDish = async (dish) => {
    const newDish = {
      ...dish,
      name: `${dish.name} (Cópia)`,
      id: undefined,
      created_date: undefined,
      updated_date: undefined,
    };
    createDishMutation.mutate(newDish);
  };

  const duplicateCategory = async (category) => {
    createCategoryMutation.mutate({
      name: `${category.name} (Cópia)`,
      order: safeCategories.length,
    });
  };

  const editCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };
  
  const handleCategorySubmit = (formData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ 
        id: editingCategory.id, 
        data: { ...editingCategory, ...formData } 
      });
    } else {
      createCategoryMutation.mutate(formData);
    }
  };

  // ========= FILTROS E BUSCA =========
  const filteredDishes = safeDishes.filter(dish => {
    const matchesSearch = !searchTerm || 
      dish.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dish.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || sameCategoryId(dish.category_id, filterCategory);
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && dish.is_active !== false) ||
      (filterStatus === 'inactive' && dish.is_active === false);
    
    const matchesType = filterType === 'all' ||
      (filterType === 'highlight' && dish.is_highlight) ||
      (filterType === 'new' && dish.is_new) ||
      (filterType === 'popular' && dish.is_popular);
    
    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  });

  const dishesByCategory = {};
  safeCategories.forEach(cat => {
    dishesByCategory[normalizeCategoryId(cat.id)] = filteredDishes.filter((d) =>
      sameCategoryId(d.category_id, cat.id)
    );
  });
  // Pratos sem categoria (ou com category_id inexistente) — exibir mesmo quando categories=[] para corrigir bug de "não mostra nada até criar categoria"
  const dishesWithoutCategory = filteredDishes.filter(
    (d) =>
      !normalizeCategoryId(d.category_id) ||
      !safeCategories.some((c) => sameCategoryId(c.id, d.category_id))
  );

  useEffect(() => {
    if (permissionLoading || !menuContext) return;

    const categorySummary = safeCategories.slice(0, 8).map((category) => ({
      id: normalizeCategoryId(category?.id),
      name: category?.name || null,
      count: (dishesByCategory[normalizeCategoryId(category?.id)] || []).length,
    }));

    console.info('[DISHES_TAB_DIAG] state', {
      menuContext,
      user: user ? {
        email: user.email || null,
        subscriber_email: user.subscriber_email || null,
        subscriber_id: user.subscriber_id ?? null,
        is_master: user.is_master === true,
        profile_role: user.profile_role || null,
        profile_roles: Array.isArray(user.profile_roles) ? user.profile_roles : null,
      } : null,
      rawCounts: {
        dishes: Array.isArray(dishes) ? dishes.length : 0,
        categories: safeCategories.length,
        complementGroups: safeComplementGroups.length,
      },
      filteredCounts: {
        safeDishes: safeDishes.length,
        filteredDishes: filteredDishes.length,
        dishesWithoutCategory: dishesWithoutCategory.length,
      },
      activeFilters: {
        searchTerm,
        filterCategory,
        filterStatus,
        filterType,
      },
      categorySummary,
      sampleDish: safeDishes[0]
        ? {
            id: safeDishes[0].id ?? null,
            name: safeDishes[0].name ?? null,
            category_id: safeDishes[0].category_id ?? null,
            product_type: safeDishes[0].product_type ?? null,
            is_active: safeDishes[0].is_active ?? null,
          }
        : null,
    });
  }, [
    permissionLoading,
    menuContext?.type,
    menuContext?.value,
    menuContext?.subscriber_id,
    user?.email,
    user?.subscriber_email,
    user?.subscriber_id,
    user?.is_master,
    user?.profile_role,
    Array.isArray(user?.profile_roles) ? user.profile_roles.join('|') : '',
    Array.isArray(dishes) ? dishes.length : 0,
    safeCategories.length,
    safeComplementGroups.length,
    safeDishes.length,
    filteredDishes.length,
    dishesWithoutCategory.length,
    searchTerm,
    filterCategory,
    filterStatus,
    filterType,
  ]);

  const handleBulkStatusChange = (status) => {
    if (selectedDishes.length === 0) return;
    selectedDishes.forEach(dishId => {
      const dish = safeDishes.find(d => d.id === dishId);
      if (dish) {
        updateDishMutation.mutate({ id: dishId, data: { ...dish, is_active: status } });
      }
    });
    setSelectedDishes([]);
  };

  const handleBulkDelete = () => {
    if (selectedDishes.length === 0) return;
    if (!confirm(`Excluir ${selectedDishes.length} pratos selecionados?`)) return;
    selectedDishes.forEach(dishId => {
      deleteDishMutation.mutate(dishId);
    });
    setSelectedDishes([]);
  };

  const toggleDishSelection = (dishId) => {
    setSelectedDishes(prev => 
      prev.includes(dishId) ? prev.filter(id => id !== dishId) : [...prev, dishId]
    );
  };

  const toggleTagInForm = (tag) => {
    setDishFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  const getActiveFilters = () => {
    const filters = [];
    if (searchTerm) filters.push({ key: 'search', label: `"${searchTerm}"` });
    if (filterCategory !== 'all') {
      const cat = safeCategories.find((c) => sameCategoryId(c.id, filterCategory));
      if (cat) filters.push({ key: 'category', label: cat.name });
    }
    if (filterStatus !== 'all') {
      filters.push({ key: 'status', label: filterStatus === 'active' ? 'Ativos' : 'Inativos' });
    }
    if (filterType !== 'all') {
      const typeLabels = { highlight: 'Destaques', new: 'Novos', popular: 'Populares' };
      filters.push({ key: 'type', label: typeLabels[filterType] });
    }
    return filters;
  };

  const removeFilter = (key) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'category') setFilterCategory('all');
    if (key === 'status') setFilterStatus('all');
    if (key === 'type') setFilterType('all');
  };

  const availableTags = ['vegetariano', 'vegano', 'sem_gluten', 'picante', 'fit'];
  const tagLabels = {
    vegetariano: '🥗 Vegetariano',
    vegano: '🌱 Vegano',
    sem_gluten: '🌾 Sem Glúten',
    picante: '🌶️ Picante',
    fit: '💪 Fit'
  };

  const moveCategoryUp = (index) => {
    if (index === 0) return;
    const cat1 = safeCategories[index];
    const cat2 = safeCategories[index - 1];
    if (cat1 && cat2) {
      updateCategoryMutation.mutate({ id: cat1.id, data: { ...cat1, order: index - 1 } });
      updateCategoryMutation.mutate({ id: cat2.id, data: { ...cat2, order: index } });
    }
  };

  const moveCategoryDown = (index) => {
    if (index === safeCategories.length - 1) return;
    const cat1 = safeCategories[index];
    const cat2 = safeCategories[index + 1];
    if (cat1 && cat2) {
      updateCategoryMutation.mutate({ id: cat1.id, data: { ...cat1, order: index + 1 } });
      updateCategoryMutation.mutate({ id: cat2.id, data: { ...cat2, order: index } });
    }
  };

  const activeFilters = getActiveFilters();

  // Mostrar skeleton enquanto contexto não carregou OU enquanto dados estão sendo buscados (evita tela vazia ao abrir)
  const isLoading = permissionLoading || !menuContext || isLoadingDishes || isLoadingCategories || isLoadingGroups;
  const hasError = dishesError || categoriesError || groupsError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DishesSkeleton />
      </div>
    );
  }

  if (hasError) {
    log.admin.error('🍽️ [DishesTab] Erro ao carregar:', { dishesError, categoriesError, groupsError });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">Erro ao carregar dados</p>
          <p className="text-sm text-muted-foreground mb-4">
            {dishesError?.message || categoriesError?.message || groupsError?.message || 'Erro desconhecido'}
          </p>
          <Button onClick={() => window.location.reload()}>Recarregar página</Button>
        </div>
      </div>
    );
  }

  // ========= RENDER =========
  return (
    <>
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">Cardápio</h1>
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted active:bg-muted/80 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros</span>
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 bg-orange-500 text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
        
        {activeFilters.length > 0 && (
          <MobileFilterChips
            filters={activeFilters}
            onRemoveFilter={removeFilter}
            onClearAll={() => {
              setSearchTerm('');
              setFilterCategory('all');
              setFilterStatus('all');
              setFilterType('all');
            }}
          />
        )}
      </div>

      {/* ✅ Abas Internas: Pratos, Categorias, Complementos */}
      <div className="hidden lg:block border-b border-border bg-card">
        <div className="px-6 flex gap-1">
          <button
            onClick={() => setInternalTab('dishes')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              internalTab === 'dishes'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 inline mr-2" />
            Pratos
          </button>
          <button
            onClick={() => setInternalTab('categories')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              internalTab === 'categories'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Categorias
          </button>
          <button
            onClick={() => setInternalTab('complements')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              internalTab === 'complements'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4 inline mr-2" />
            Complementos
          </button>
        </div>
      </div>

      {/* Mobile: Abas internas */}
      <div className="lg:hidden border-b border-border bg-card sticky top-[73px] z-20">
        <div className="flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setInternalTab('dishes')}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors flex-shrink-0 ${
              internalTab === 'dishes'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Pratos
          </button>
          <button
            onClick={() => setInternalTab('categories')}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors flex-shrink-0 ${
              internalTab === 'categories'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Categorias
          </button>
          <button
            onClick={() => setInternalTab('complements')}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors flex-shrink-0 ${
              internalTab === 'complements'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            Complementos
          </button>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {internalTab === 'categories' ? (
        <CategoriesTab onSwitchToComplements={() => setInternalTab('complements')} />
      ) : internalTab === 'complements' ? (
        <ComplementsTab
          onSwitchToCategories={() => setInternalTab('categories')}
          onOpenTemplates={() => setShowTemplatesModal(true)}
        />
      ) : (
        <>
      {/* Desktop Header */}
      <div className="hidden lg:block p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          {canCreate('dishes') && (
            <Button onClick={() => setShowCategoryModal(true)} variant="outline">
              <FolderPlus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          )}
          {canUpdate('dishes') && (
            <Button onClick={() => setShowReorderModal(true)} variant="outline">
              <Menu className="w-4 h-4 mr-2" />
              Reordenar
            </Button>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pratos</p>
                  <p className="text-2xl font-bold">{safeDishes.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {safeDishes.filter(d => d.is_active !== false).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
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
                <Layers className="w-8 h-8 text-orange-500" />
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
                <Settings className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Filtros e Busca */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input 
              placeholder="🔍 Buscar pratos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas categorias" />
              </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {safeCategories.map(cat => (
                  <SelectItem key={cat.id} value={normalizeCategoryId(cat.id)}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">✓ Ativos</SelectItem>
                <SelectItem value="inactive">✗ Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="highlight">⭐ Destaques</SelectItem>
                <SelectItem value="new">✨ Novos</SelectItem>
                <SelectItem value="popular">🔥 Populares</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterType !== 'all') && (
            <div className="flex items-center justify-between pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                {filteredDishes.length} prato{filteredDishes.length !== 1 ? 's' : ''} encontrado{filteredDishes.length !== 1 ? 's' : ''}
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('all');
                  setFilterStatus('all');
                  setFilterType('all');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Ações em Massa */}
      {selectedDishes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedDishes.length} prato{selectedDishes.length !== 1 ? 's' : ''} selecionado{selectedDishes.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange(true)}>
              Ativar
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkStatusChange(false)}>
              Desativar
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDeleteWithAuth} className="text-red-600">
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDishes([])}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Lista por Categoria */}
      <div className="lg:hidden px-4 pb-24 space-y-3">
        {/* Sem categoria: pratos órfãos ou quando categories=[] — evita "não mostra nada" até criar categoria */}
        {dishesWithoutCategory.length > 0 && (
          <MobileCategoryAccordion
            key="__sem_categoria__"
            category={{ id: '__sem_categoria__', name: 'Sem categoria' }}
            dishCount={dishesWithoutCategory.length}
            isExpanded={expandedCategories['__sem_categoria__'] !== false}
            onToggle={() => toggleCategoryExpansion('__sem_categoria__')}
            onAddDish={() => handleOpenProductTypeModal(safeCategories[0]?.id || '')}
            onEdit={() => {}}
            onDuplicate={() => {}}
            onDelete={() => {}}
          >
            {dishesWithoutCategory.map((dish) => (
              <MobileDishCard
                key={dish.id}
                dish={dish}
                onEdit={() => openDishModal(dish)}
                onDuplicate={() => duplicateDish(dish)}
                onDelete={() => {
                  handleDeleteDishWithAuth(dish.id);
                }}
                onToggleActive={(checked) => {
                  if (!canUpdate('dishes')) return;
                  updateDishMutation.mutate({ id: dish.id, data: { is_active: checked } });
                }}
                onToggleHighlight={(checked) => {
                  if (!canUpdate('dishes')) return;
                  updateDishMutation.mutate({ id: dish.id, data: { is_highlight: checked } });
                }}
                onToggleComplements={() => setMobileComplementsDish(dish)}
                complementGroupsCount={dish.complement_groups?.length || 0}
                formatCurrency={formatCurrency}
                canEdit={canUpdate('dishes')}
              />
            ))}
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
              onToggle={() => toggleCategoryExpansion(category.id)}
              onAddDish={() => handleOpenProductTypeModal(category.id)}
              onEdit={() => editCategory(category)}
              onDuplicate={() => duplicateCategory(category)}
              onDelete={() => handleDeleteCategoryWithAuth(category.id)}
            >
              {categoryDishes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum prato nesta categoria
                </div>
              ) : (
                categoryDishes.map((dish) => (
                  <MobileDishCard
                    key={dish.id}
                    dish={dish}
                    onEdit={() => openDishModal(dish)}
                    onDuplicate={() => duplicateDish(dish)}
                    onDelete={() => handleDeleteDishWithAuth(dish.id)}
                    onToggleActive={(checked) => {
                      if (!canUpdate('dishes')) return;
                      updateDishMutation.mutate({ 
                        id: dish.id, 
                        data: { is_active: checked } 
                      });
                    }}
                    onToggleHighlight={(checked) => {
                      if (!canUpdate('dishes')) return;
                      updateDishMutation.mutate({ 
                        id: dish.id, 
                        data: { is_highlight: checked } 
                      });
                    }}
                    onToggleComplements={() => setMobileComplementsDish(dish)}
                    complementGroupsCount={dish.complement_groups?.length || 0}
                    formatCurrency={formatCurrency}
                    canEdit={canUpdate('dishes')}
                  />
                ))
              )}
            </MobileCategoryAccordion>
          );
        })}

        {safeCategories.length === 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum prato"
            description="Comece criando categorias e adicionando seus pratos ao cardápio"
            actionLabel="Criar primeira categoria"
            onAction={() => setShowCategoryModal(true)}
          />
        )}

        {safeCategories.length > 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum prato"
            description="Adicione pratos às categorias criadas para começar a vender"
            actionLabel="Cadastrar primeiro prato"
            onAction={() => openDishModal(null, safeCategories[0]?.id || '')}
          />
        )}
      </div>

      {/* Desktop Lista por Categoria */}
      <div className="hidden lg:block px-6 pb-6 space-y-4">
        {/* Sem categoria: pratos órfãos ou quando categories=[] — evita "não mostra nada" até criar categoria */}
        {dishesWithoutCategory.length > 0 && (
          <div className="bg-muted/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-card border border-border-b cursor-pointer hover:bg-muted/50" onClick={() => toggleCategoryExpansion('__sem_categoria__')}>
              <div className="flex items-center gap-3">
                <Menu className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-bold text-lg">Sem categoria</h2>
                <Badge variant="secondary" className="text-xs">{dishesWithoutCategory.length} itens</Badge>
              </div>
              <div className="flex items-center gap-2">
                {canCreate('dishes') && (
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenProductTypeModal(safeCategories[0]?.id || ''); }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar prato
                  </Button>
                )}
                {expandedCategories['__sem_categoria__'] !== false ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
            {expandedCategories['__sem_categoria__'] !== false && (
              <div className="p-4 space-y-3">
                {dishesWithoutCategory.map((dish) => (
                  <DishRow
                    key={dish.id}
                    dish={dish}
                    isSelected={selectedDishes.includes(dish.id)}
                    onToggleSelection={() => toggleDishSelection(dish.id)}
                    complementGroups={safeComplementGroups}
                    expanded={expandedDishes[dish.id]}
                    onToggleExpand={() => toggleDishExpansion(dish.id)}
                    onEdit={() => openDishModal(dish)}
                    onDelete={() => handleDeleteDishWithAuth(dish.id)}
                    onDuplicate={() => duplicateDish(dish)}
                    onUpdate={(data) => updateDishMutation.mutate({ id: dish.id, data })}
                    onToggleOption={toggleComplementOption}
                    onUpdateOptionName={updateComplementOptionName}
                    onUpdateOptionPrice={updateComplementOptionPrice}
                    onUpdateOptionImage={updateComplementOptionImage}
                    onRemoveOption={removeComplementOption}
                    onAddOption={addNewComplementOption}
                    onAddGroup={() => addNewComplementGroupToDish(dish.id)}
                    onReuseGroup={(groupId) => reuseComplementGroupToDish(dish.id, groupId)}
                    onRemoveGroup={(groupId) => removeGroupFromDish(dish.id, groupId)}
                    onOpenReuseModal={() => { setCurrentDishForReuse(dish.id); setShowReuseGroupModal(true); }}
                    allComplementGroups={safeComplementGroups}
                    allDishes={safeDishes}
                    onEditGroup={(group) => {
                      const linked = dish.complement_groups?.find(cg => cg.group_id === group.id);
                      openGroupSettings({ ...group, is_required: linked?.is_required || false }, dish.id);
                    }}
                    getGroupUsageInfo={getGroupUsageInfo}
                    formatCurrency={formatCurrency}
                    updateDishMutation={updateDishMutation}
                    updateComplementGroupMutation={updateComplementGroupMutation}
                    createComplementGroupMutation={createComplementGroupMutation}
                    canEdit={canUpdate('dishes')}
                    canCreate={canCreate('dishes')}
                    canDelete={canDelete('dishes')}
                    setBulkEditGroup={setBulkEditGroup}
                    setShowBulkEditModal={setShowBulkEditModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {safeCategories.map((category, categoryIndex) => {
          const categoryDishes = dishesByCategory[normalizeCategoryId(category.id)] || [];
          const isExpanded = expandedCategories[category.id] !== false;

          return (
            <div key={category.id} className="bg-muted/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-card border border-border-b cursor-pointer hover:bg-muted/50" onClick={() => toggleCategoryExpansion(category.id)}>
                <div className="flex items-center gap-3">
                  {canUpdate('dishes') && (
                    <div className="flex flex-col gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); moveCategoryUp(categoryIndex); }} disabled={categoryIndex === 0} className="p-0.5 hover:bg-muted/70 rounded disabled:opacity-30">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveCategoryDown(categoryIndex); }} disabled={categoryIndex === safeCategories.length - 1} className="p-0.5 hover:bg-muted/70 rounded disabled:opacity-30">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <Menu className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-bold text-lg">{category.name}</h2>
                  <Badge variant="secondary" className="text-xs">{categoryDishes.length} itens</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDishes.length > 0 && (
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      const categoryDishIds = categoryDishes.map(d => d.id);
                      const allSelected = categoryDishIds.every(id => selectedDishes.includes(id));
                      if (allSelected) {
                        setSelectedDishes(prev => prev.filter(id => !categoryDishIds.includes(id)));
                      } else {
                        setSelectedDishes(prev => [...new Set([...prev, ...categoryDishIds])]);
                      }
                    }}>
                      {categoryDishes.every(d => selectedDishes.includes(d.id)) ? '☑' : '☐'} Selecionar todos
                    </Button>
                  )}
                  {canCreate('dishes') && (
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProductTypeModal(category.id);
                    }}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar prato
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdate('dishes') && (
                        <DropdownMenuItem onClick={() => editCategory(category)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar categoria
                        </DropdownMenuItem>
                      )}
                      {canCreate('dishes') && (
                        <DropdownMenuItem onClick={() => duplicateCategory(category)}>
                          <Files className="w-4 h-4 mr-2" />
                          Duplicar categoria
                        </DropdownMenuItem>
                      )}
                      {canDelete('dishes') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteCategoryWithAuth(category.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover categoria
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-3">
                  {categoryDishes.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Nenhum prato nesta categoria
                    </div>
                  ) : (
                    categoryDishes.map((dish) => (
                      <DishRow 
                      key={dish.id} 
                      dish={dish}
                      isSelected={selectedDishes.includes(dish.id)}
                      onToggleSelection={() => toggleDishSelection(dish.id)} 
                      complementGroups={safeComplementGroups}
                      expanded={expandedDishes[dish.id]}
                      onToggleExpand={() => toggleDishExpansion(dish.id)}
                      onEdit={() => openDishModal(dish)}
                      onDelete={() => handleDeleteDishWithAuth(dish.id)}
                      onDuplicate={() => duplicateDish(dish)}
                      onUpdate={(data) => updateDishMutation.mutate({ id: dish.id, data })}
                      onToggleOption={toggleComplementOption}
                      onUpdateOptionName={updateComplementOptionName}
                      onUpdateOptionImage={updateComplementOptionImage}
                      onUpdateOptionPrice={updateComplementOptionPrice}
                      onRemoveOption={removeComplementOption}
                      onAddOption={addNewComplementOption}
                      onAddGroup={() => addNewComplementGroupToDish(dish.id)}
                      onReuseGroup={(groupId) => reuseComplementGroupToDish(dish.id, groupId)}
                      onRemoveGroup={(groupId) => removeGroupFromDish(dish.id, groupId)}
                      onOpenReuseModal={() => {
                        setCurrentDishForReuse(dish.id);
                        setShowReuseGroupModal(true);
                      }}
                      allComplementGroups={safeComplementGroups}
                      allDishes={safeDishes}
                      onEditGroup={(group) => {
                        const linked = dish.complement_groups?.find(cg => cg.group_id === group.id);
                        openGroupSettings({ ...group, is_required: linked?.is_required || false }, dish.id);
                      }}
                      getGroupUsageInfo={getGroupUsageInfo}
                      formatCurrency={formatCurrency}
                      updateDishMutation={updateDishMutation}
                      updateComplementGroupMutation={updateComplementGroupMutation}
                      createComplementGroupMutation={createComplementGroupMutation}
                      canEdit={canUpdate('dishes')}
                      canCreate={canCreate('dishes')}
                      canDelete={canDelete('dishes')}
                      setBulkEditGroup={setBulkEditGroup}
                      setShowBulkEditModal={setShowBulkEditModal}
                    />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {safeCategories.length === 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum prato"
            description="Comece criando categorias e adicionando seus pratos ao cardápio"
            actionLabel="Criar primeira categoria"
            onAction={() => setShowCategoryModal(true)}
          />
        )}

        {safeCategories.length > 0 && safeDishes.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title="Você ainda não cadastrou nenhum prato"
            description="Adicione pratos às categorias criadas para começar a vender"
            actionLabel="Cadastrar primeiro prato"
            onAction={() => openDishModal(null, safeCategories[0]?.id || '')}
          />
        )}
      </div>

      {/* Mobile FAB */}
      {canCreate('dishes') && (
        <div className="lg:hidden">
          <MobileFloatingActions
            onAddDish={() => handleOpenProductTypeModal(safeCategories[0]?.id || '')}
            onAddCategory={() => setShowCategoryModal(true)}
          />
        </div>
      )}

      {/* Modal Seleção de Tipo de Produto */}
      <ProductTypeModal
        isOpen={showProductTypeModal}
        onClose={() => setShowProductTypeModal(false)}
        onSelectType={handleSelectProductType}
        categoryId={selectedCategoryForNewDish}
        categoryDishes={Array.isArray(dishesByCategory[selectedCategoryForNewDish]) ? dishesByCategory[selectedCategoryForNewDish] : []}
        onRedirectToPizzas={handleRedirectToPizzas}
        hasPizzaService={hasPizzaService}
        subscriberName={subscriberData?.name || user?.full_name || ''}
      />

      <LimitBlockModal
        open={limitBlockOpen}
        onOpenChange={setLimitBlockOpen}
        type="products"
        plan={plan}
        limit={effectiveLimits?.products ?? 0}
        used={usage?.productsCount ?? 0}
        suggestion="Pro libera até 800 produtos."
      />

      {/* Mobile Complements Sheet */}
      <MobileDishComplementsSheet
        isOpen={!!mobileComplementsDish}
        onClose={() => setMobileComplementsDish(null)}
        dish={mobileComplementsDish}
        complementGroups={safeComplementGroups}
        onAddOption={addNewComplementOption}
        onToggleOption={toggleComplementOption}
        onRemoveOption={removeComplementOption}
        onEditGroup={(group) => {
          const linked = mobileComplementsDish.complement_groups?.find(cg => cg.group_id === group.id);
          openGroupSettings({ ...group, is_required: linked?.is_required || false }, mobileComplementsDish?.id);
        }}
        onRemoveGroup={(groupId) => removeGroupFromDish(mobileComplementsDish?.id, groupId)}
        onAddGroup={() => addNewComplementGroupToDish(mobileComplementsDish?.id)}
        onReuseGroup={(groupId) => reuseComplementGroupToDish(mobileComplementsDish?.id, groupId)}
        onToggleRequired={(groupId) => {
          const updatedGroups = (mobileComplementsDish.complement_groups || []).map(cg =>
            cg.group_id === groupId ? { ...cg, is_required: !cg.is_required } : cg
          );
          updateDishMutation.mutate({ 
            id: mobileComplementsDish.id, 
            data: { complement_groups: updatedGroups } 
          });
        }}
        onReorderGroups={(reorderedGroups) => {
          updateDishMutation.mutate({
            id: mobileComplementsDish.id,
            data: { complement_groups: reorderedGroups }
          });
        }}
        onCopyGroups={async (groupIds) => {
          if (mobileComplementsDish?.id) {
            reuseComplementGroupsToDish(mobileComplementsDish.id, groupIds);
            return;
          }
          for (const groupId of groupIds) {
            const originalGroup = safeComplementGroups.find(g => g.id === groupId);
            if (originalGroup) {
              const newGroup = {
                name: `${originalGroup.name} (Cópia)`,
                is_required: originalGroup.is_required,
                max_selection: originalGroup.max_selection,
                options: originalGroup.options || [],
                order: safeComplementGroups.length
              };
              const createdGroup = await createComplementGroupMutation.mutateAsync(newGroup);
              if (createdGroup && mobileComplementsDish) {
                const updatedGroups = [
                  ...(mobileComplementsDish.complement_groups || []),
                  { group_id: createdGroup.id, is_required: false }
                ];
                updateDishMutation.mutate({
                  id: mobileComplementsDish.id,
                  data: { complement_groups: updatedGroups }
                });
              }
            }
          }
        }}
        onUpdateOptionName={updateComplementOptionName}
        onUpdateOptionPrice={updateComplementOptionPrice}
        onUpdateOptionImage={updateComplementOptionImage}
        formatCurrency={formatCurrency}
      />

      {/* Mobile Filters Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Filtros"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Buscar</label>
            <Input 
              placeholder="Digite para buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Categoria</label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas categorias" />
              </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {safeCategories.map(cat => (
                  <SelectItem key={cat.id} value={normalizeCategoryId(cat.id)}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['all', 'active', 'inactive'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-orange-500 text-primary-foreground'
                      : 'bg-muted text-foreground active:bg-muted/80'
                  }`}
                >
                  {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'highlight', label: '⭐ Destaques' },
                { value: 'new', label: '✨ Novos' },
                { value: 'popular', label: '🔥 Populares' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    filterType === type.value
                      ? 'bg-orange-500 text-primary-foreground'
                      : 'bg-muted text-foreground active:bg-muted/80'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => setShowMobileFilters(false)}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            Aplicar Filtros
          </Button>
        </div>
      </MobileBottomSheet>
        </>
      )}

      {/* Modal Nova/Editar Categoria */}
      <CategoryForm
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSubmit={handleCategorySubmit}
        category={editingCategory}
        categoriesCount={safeCategories.length}
      />

      {/* Modal Adicionar/Editar Prato */}
      <Dialog open={showDishModal} onOpenChange={setShowDishModal}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDish ? 'Editar Prato' : 'Adicionar Prato'}</DialogTitle>
            <DialogDescription className="sr-only">Formulário para adicionar ou editar um prato do cardápio.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDishSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Nome *</Label>
                <Input 
                  value={dishFormData.name} 
                  onChange={(e) => setDishFormData(prev => ({ ...prev, name: e.target.value }))} 
                  required 
                  className="min-h-touch"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Categoria *</Label>
                <Select value={normalizeCategoryId(dishFormData.category_id)} onValueChange={(value) => setDishFormData(prev => ({ ...prev, category_id: value }))} required>
                  <SelectTrigger className="min-h-touch">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                <SelectContent>
                  {safeCategories.map(cat => <SelectItem key={cat.id} value={normalizeCategoryId(cat.id)}>{cat.name}</SelectItem>)}
                </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Preço de (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={dishFormData.original_price} 
                  onChange={(e) => setDishFormData(prev => ({ ...prev, original_price: e.target.value }))} 
                  placeholder="Preço original" 
                  className="min-h-touch"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Por (R$) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={dishFormData.price} 
                  onChange={(e) => setDishFormData(prev => ({ ...prev, price: e.target.value }))} 
                  required 
                  placeholder="Preço atual" 
                  className="min-h-touch"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Estoque</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={dishFormData.stock} 
                    onChange={(e) => setDishFormData(prev => ({ ...prev, stock: e.target.value }))} 
                    placeholder="Ex: 10" 
                    disabled={dishFormData.stock === ''}
                    className={`min-h-touch ${dishFormData.stock === '' ? 'bg-muted' : ''}`}
                  />
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <Switch 
                      checked={dishFormData.stock === ''} 
                      onCheckedChange={(checked) => setDishFormData(prev => ({ ...prev, stock: checked ? '' : '0' }))}
                    />
                    <span className="text-xs text-muted-foreground">Ilimitado</span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Porção</Label>
                <Input 
                  value={dishFormData.portion} 
                  onChange={(e) => setDishFormData(prev => ({ ...prev, portion: e.target.value }))} 
                  placeholder="Ex: 180g, 500ml" 
                  className="min-h-touch"
                />
              </div>
            </div>

            <div>
              <Label>Tipo de Produto</Label>
              <div className="flex gap-2 mt-2">
                <Badge
                  variant={dishFormData.product_type === 'preparado' ? 'default' : 'outline'}
                  className="cursor-default"
                >
                  {dishFormData.product_type === 'preparado' ? '🍳 Preparado' : 
                   dishFormData.product_type === 'industrializado' ? '📦 Industrializado' : 
                   '🍕 Pizza'}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Descrição</Label>
              <Textarea 
                value={dishFormData.description} 
                onChange={(e) => setDishFormData(prev => ({ ...prev, description: e.target.value }))} 
                rows={3}
                className="min-h-[80px]"
              />
            </div>

            {dishFormData.product_type !== 'industrializado' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Tempo de Preparo (minutos)</Label>
                <Input 
                  type="number" 
                  value={dishFormData.prep_time} 
                  onChange={(e) => setDishFormData(prev => ({ ...prev, prep_time: e.target.value }))} 
                  placeholder="Ex: 30" 
                  className="min-h-touch"
                />
              </div>
            )}

            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={dishFormData.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTagInForm(tag)}
                  >
                    {tagLabels[tag]}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Observações Internas (não visíveis ao cliente)</Label>
              <Textarea 
                value={dishFormData.internal_notes} 
                onChange={(e) => setDishFormData(prev => ({ ...prev, internal_notes: e.target.value }))} 
                rows={3}
                placeholder="Notas para a equipe..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Imagem</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="min-h-touch"
              />
              {dishFormData.image && (
                <img src={dishFormData.image} alt="" className="mt-2 w-20 h-20 sm:w-24 sm:h-24 object-cover rounded" />
              )}
            </div>

            {/* 🎥 Link do Vídeo — visível junto com Imagem e Destaques */}
            <div className="p-4 border-2 border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/30 shadow-sm">
              <Label htmlFor="video_url" className="text-base font-semibold mb-2 block text-orange-700 dark:text-orange-300">
                🎥 Link do Vídeo (YouTube ou Vimeo)
              </Label>
              <Input 
                id="video_url"
                type="url" 
                value={dishFormData.video_url || ''} 
                onChange={(e) => setDishFormData(prev => ({ ...prev, video_url: e.target.value }))} 
                placeholder="Ex: https://www.youtube.com/watch?v=..." 
                className="w-full bg-card"
              />
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                O vídeo aparece no cardápio ao clicar na imagem do prato.
              </p>
              {dishFormData.video_url && (
                <div className="mt-3 flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                  <Label htmlFor="video_autoplay" className="cursor-pointer text-sm font-medium">
                    Reprodução automática
                  </Label>
                  <Switch
                    id="video_autoplay"
                    checked={dishFormData.video_autoplay !== false}
                    onCheckedChange={(checked) => setDishFormData(prev => ({ ...prev, video_autoplay: checked }))}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded min-h-touch">
                <Label className="text-sm font-medium">⭐ Destaque</Label>
                <Switch checked={dishFormData.is_highlight} onCheckedChange={(checked) => setDishFormData(prev => ({ ...prev, is_highlight: checked }))} />
              </div>
              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded min-h-touch">
                <Label className="text-sm font-medium">✨ Novo</Label>
                <Switch checked={dishFormData.is_new} onCheckedChange={(checked) => setDishFormData(prev => ({ ...prev, is_new: checked }))} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded min-h-touch">
              <Label className="text-sm font-medium">🔥 Mais Vendido</Label>
              <Switch checked={dishFormData.is_popular} onCheckedChange={(checked) => setDishFormData(prev => ({ ...prev, is_popular: checked }))} />
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
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="max-w-sm mx-auto bg-card rounded-xl shadow-sm overflow-hidden">
                      <img src={dishFormData.image} alt={dishFormData.name} className="w-full h-48 object-cover" />
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2">{dishFormData.name || 'Nome do Prato'}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{dishFormData.description || 'Descrição...'}</p>
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDishModal} className="flex-1 min-h-touch">Cancelar</Button>
              <Button type="submit" className="flex-1 min-h-touch bg-orange-500">{editingDish ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Reutilizar Grupo */}
      <ReuseGroupModal
        isOpen={showReuseGroupModal}
        onClose={() => {
          setShowReuseGroupModal(false);
          setCurrentDishForReuse(null);
        }}
        currentDish={currentDishForReuse ? safeDishes.find(d => d.id === currentDishForReuse) : null}
        onSelect={(groupIds) => {
          if (currentDishForReuse) {
            reuseComplementGroupsToDish(currentDishForReuse, groupIds);
          }
        }}
        availableGroups={safeComplementGroups}
        allDishes={safeDishes}
      />

      {/* Modal Configurações do Grupo */}
      <Dialog open={showGroupSettingsModal} onOpenChange={setShowGroupSettingsModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Configurações do Grupo</DialogTitle>
            <DialogDescription className="sr-only">Configurações do grupo de complementos.</DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4">
              <div>
                <Label>Nome do Grupo</Label>
                <Input value={editingGroup.name} onChange={(e) => setEditingGroup(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label className="font-medium">Obrigatório</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Cliente deve escolher este grupo</p>
                </div>
                <Switch checked={editingGroup.is_required} onCheckedChange={(checked) => setEditingGroup(prev => ({ ...prev, is_required: checked }))} />
              </div>
              <div>
                <Label>Máximo de Seleções</Label>
                <p className="text-xs text-muted-foreground mb-2">Quantas opções o cliente pode escolher</p>
                <Input type="number" min="1" value={editingGroup.max_selection || 1} onChange={(e) => setEditingGroup(prev => ({ ...prev, max_selection: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowGroupSettingsModal(false)} className="flex-1">Cancelar</Button>
                <Button type="button" onClick={handleGroupSettingsSave} className="flex-1 bg-orange-500">Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Reordenar */}
      <ReorderModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        categories={safeCategories}
        dishes={safeDishes}
        complementGroups={safeComplementGroups}
        onSave={(updates) => {
          updates.categories.forEach(cat => {
            updateCategoryMutation.mutate({ id: cat.id, data: cat });
          });
          updates.dishes.forEach(dish => {
            updateDishMutation.mutate({ id: dish.id, data: dish });
          });
          updates.groups.forEach(group => {
            updateComplementGroupMutation.mutate({ id: group.id, data: group });
          });
          Object.entries(updates.groupOptions).forEach(([groupId, options]) => {
            const group = safeComplementGroups.find(g => g.id === groupId);
            if (group) {
              updateComplementGroupMutation.mutate({ 
                id: groupId, 
                data: { ...group, options } 
              });
            }
          });
          toast.success('Ordem atualizada com sucesso!');
          setShowReorderModal(false);
        }}
      />

      {/* Modal Templates */}
      <ComplementTemplates
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onUseTemplate={(newGroup) => {
          // Template criado, pode ser usado em pratos
        }}
      />

      {/* Modal Edição em Massa */}
      {bulkEditGroup && (
        <BulkEditOptions
          isOpen={showBulkEditModal}
          onClose={() => {
            setShowBulkEditModal(false);
            setBulkEditGroup(null);
          }}
          group={bulkEditGroup}
          onUpdate={(updatedGroup) => {
            updateComplementGroupMutation.mutate({
              id: updatedGroup.id,
              data: updatedGroup
            });
          }}
        />
      )}
    </div>
    {modal}
    </>
  );
}
