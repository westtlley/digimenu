import React, { useState } from 'react';
import { X, Plus, Settings, Copy, Trash2, GripVertical, MoreVertical, Pause, Play, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CopyGroupModal from './CopyGroupModal';

function MobileComplementOption({
  option,
  groupId,
  onToggle,
  onRemove,
  onDuplicate,
  onUpdateName,
  onUpdatePrice,
  onOpenImagePicker,
  formatCurrency,
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempName, setTempName] = useState(option.name);
  const [tempPrice, setTempPrice] = useState(option.price?.toString() || '0');

  const handleNameSave = () => {
    if (tempName.trim()) {
      onUpdateName(groupId, option.id, tempName);
    }
    setEditingName(false);
  };

  const handlePriceSave = () => {
    onUpdatePrice(groupId, option.id, tempPrice);
    setEditingPrice(false);
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-2 ${
        option.is_active !== false ? 'bg-white' : 'bg-red-50'
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenImagePicker(groupId, option.id)}
        className="relative flex-shrink-0 overflow-hidden rounded-lg"
      >
        <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
          {option.image ? (
            <img src={option.image} alt={option.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-300">
              📷
            </div>
          )}
        </div>
      </button>

      <div className="min-w-0 flex-1">
        {editingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') setEditingName(false);
            }}
            className="w-full rounded border px-2 py-1 text-sm font-medium text-gray-900"
            autoFocus
          />
        ) : (
          <p
            className="truncate text-sm font-medium text-gray-900"
            onClick={() => {
              setTempName(option.name);
              setEditingName(true);
            }}
          >
            {option.name}
          </p>
        )}

        {editingPrice ? (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs text-gray-500">R$</span>
            <input
              type="number"
              step="0.01"
              value={tempPrice}
              onChange={(e) => setTempPrice(e.target.value)}
              onBlur={handlePriceSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePriceSave();
                if (e.key === 'Escape') setEditingPrice(false);
              }}
              className="w-20 rounded border px-1 py-0.5 text-xs text-gray-500"
              autoFocus
            />
          </div>
        ) : (
          <p
            className="cursor-pointer text-xs text-gray-500"
            onClick={() => {
              setTempPrice(option.price?.toString() || '0');
              setEditingPrice(true);
            }}
          >
            {option.price > 0 ? `+ ${formatCurrency(option.price)}` : 'Sem custo (clique para editar)'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggle(groupId, option.id, option.is_active !== false)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
            option.is_active !== false
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {option.is_active !== false ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setTempName(option.name);
                setEditingName(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar opção
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTempPrice(option.price?.toString() || '0');
                setEditingPrice(true);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Editar preço
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(groupId, option.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar opção
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (confirm('Remover este complemento?')) {
                  onRemove(groupId, option.id);
                }
              }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover opção
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function MobileDishComplementsSheet({
  isOpen,
  onClose,
  dish,
  complementGroups,
  onAddOption,
  onToggleOption,
  onRemoveOption,
  onEditGroup,
  onRemoveGroup,
  onAddGroup,
  onReuseGroup,
  onToggleRequired,
  onUpdateOptionName,
  onUpdateOptionPrice,
  onOpenImagePicker,
  onDuplicateOption,
  onReorderGroups,
  onCopyGroups,
  formatCurrency
}) {
  const [showAddGroupMenu, setShowAddGroupMenu] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const linkedGroups = (dish?.complement_groups || [])
    .map(cg => complementGroups.find(g => g.id === cg.group_id))
    .filter(Boolean);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const items = Array.from(dish.complement_groups || []);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    onReorderGroups(items);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
          >
            <div className="flex justify-center pb-2 pt-3">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="border-b border-gray-100 px-6 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Complementos</h2>
                  <p className="text-sm text-gray-500">{dish?.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {linkedGroups.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="mb-4 text-sm text-gray-500">Nenhum grupo de complementos</p>
                  <Button onClick={() => onAddGroup(dish?.id)} className="bg-orange-500">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Grupo
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="mobile-complement-groups">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {linkedGroups.map((group, index) => {
                          const linked = dish.complement_groups?.find(cg => cg.group_id === group.id);

                          return (
                            <Draggable key={group.id} draggableId={group.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`rounded-2xl border-2 p-4 transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : ''
                                  } ${
                                    linked?.is_required
                                      ? 'border-red-200 bg-red-50'
                                      : 'border-blue-200 bg-blue-50'
                                  }`}
                                >
                                  <div className="mb-3 flex items-start gap-2">
                                    <div {...provided.dragHandleProps} className="pt-1">
                                      <GripVertical className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="mb-1 flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-gray-900">{group.name}</h3>
                                        <Badge
                                          className={`text-xs ${
                                            linked?.is_required
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-blue-100 text-blue-700'
                                          }`}
                                        >
                                          {linked?.is_required ? 'Obrigatório' : 'Opcional'}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        Máximo: {group.max_selection || 1} {group.max_selection === 1 ? 'opção' : 'opções'}
                                      </p>
                                    </div>

                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => onEditGroup(group)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200"
                                      >
                                        <Settings className="h-4 w-4 text-gray-600" />
                                      </button>
                                      <button
                                        onClick={() => onRemoveGroup(group.id)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-100"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    {(group.options || []).map((opt) => (
                                      <MobileComplementOption
                                        key={opt.id}
                                        option={opt}
                                        groupId={group.id}
                                        onToggle={onToggleOption}
                                        onRemove={onRemoveOption}
                                        onDuplicate={onDuplicateOption}
                                        onUpdateName={onUpdateOptionName}
                                        onUpdatePrice={onUpdateOptionPrice}
                                        onOpenImagePicker={onOpenImagePicker}
                                        formatCurrency={formatCurrency}
                                      />
                                    ))}
                                  </div>

                                  <Button
                                    onClick={() => onAddOption(group.id)}
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 w-full"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Adicionar opção
                                  </Button>
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
              )}

              {linkedGroups.length > 0 && (
                <div className="mt-4">
                  <DropdownMenu open={showAddGroupMenu} onOpenChange={setShowAddGroupMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Grupo de Complementos
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full" align="center">
                      <DropdownMenuItem onClick={() => {
                        onAddGroup(dish?.id);
                        setShowAddGroupMenu(false);
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar novo grupo
                      </DropdownMenuItem>
                      {complementGroups.length > 0 && (
                        <DropdownMenuItem onClick={() => {
                          setShowCopyModal(true);
                          setShowAddGroupMenu(false);
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar grupo de complementos
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      <CopyGroupModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        availableGroups={complementGroups}
        onConfirm={onCopyGroups}
        currentDish={dish}
      />
    </AnimatePresence>
  );
}
