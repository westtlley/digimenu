import React, { useState } from 'react';
import { X, Plus, Settings, Copy, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CopyGroupModal from './CopyGroupModal';

function MobileComplementOption({ 
  option, 
  groupId, 
  onToggle, 
  onRemove, 
  onUpdateName, 
  onUpdatePrice, 
  onUpdateImage, 
  formatCurrency 
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
      className={`flex items-center gap-3 p-2 rounded-xl ${
        option.is_active !== false ? 'bg-white' : 'bg-red-50'
      }`}
    >
      <label className="cursor-pointer relative">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {option.image ? (
            <img src={option.image} alt={option.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
              🍽️
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpdateImage(groupId, option.id, file);
          }}
        />
      </label>

      <div className="flex-1 min-w-0">
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
            className="font-medium text-sm text-gray-900 w-full border rounded px-2 py-1"
            autoFocus
          />
        ) : (
          <p 
            className="font-medium text-sm text-gray-900 truncate cursor-pointer hover:text-orange-600"
            onClick={() => {
              setTempName(option.name);
              setEditingName(true);
            }}
          >
            {option.name}
          </p>
        )}
        
        {editingPrice ? (
          <div className="flex items-center gap-1 mt-1">
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
              className="text-xs text-gray-500 w-20 border rounded px-1 py-0.5"
              autoFocus
            />
          </div>
        ) : (
          <p 
            className="text-xs text-gray-500 cursor-pointer hover:text-orange-600"
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
        <Switch
          checked={option.is_active !== false}
          onCheckedChange={() => onToggle(groupId, option.id, option.is_active !== false)}
          className="data-[state=checked]:bg-green-500"
        />
        <button
          onClick={() => {
            if (confirm('Remover este complemento?')) {
              onRemove(groupId, option.id);
            }
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
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
  onUpdateOptionImage,
  onReorderGroups,
  onCopyGroups,
  formatCurrency
}) {
  const [showAddGroupMenu, setShowAddGroupMenu] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const linkedGroups = (dish?.complement_groups || [])
    .map(cg => complementGroups.find(g => g.id === cg.group_id))
    .filter(Boolean);

  const availableGroupsToReuse = complementGroups.filter(g => 
    !dish?.complement_groups?.some(cg => cg.group_id === g.id)
  );

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Complementos</h2>
                  <p className="text-sm text-gray-500">{dish?.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {linkedGroups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm mb-4">Nenhum grupo de complementos</p>
                  <Button onClick={() => onAddGroup(dish?.id)} className="bg-orange-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Grupo
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="mobile-complement-groups">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {linkedGroups.map((group, index) => {
                          const linked = dish.complement_groups?.find(cg => cg.group_id === group.id);
                          
                          return (
                            <Draggable key={group.id} draggableId={group.id} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                 ref={provided.innerRef}
                                 {...provided.draggableProps}
                                 className={`rounded-2xl p-4 border-2 transition-shadow ${
                                   snapshot.isDragging ? 'shadow-lg' : ''
                                 } ${
                                   linked?.is_required 
                                     ? 'bg-red-50 border-red-200' 
                                     : 'bg-blue-50 border-blue-200'
                                 }`}
                                >
                        {/* Group Header */}
                        <div className="flex items-start gap-2 mb-3">
                          <div {...provided.dragHandleProps} className="pt-1">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-sm text-gray-900">
                                {group.name}
                              </h3>
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
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
                            >
                              <Settings className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => onRemoveGroup(group.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                          {(group.options || []).map((opt) => (
                            <MobileComplementOption
                              key={opt.id}
                              option={opt}
                              groupId={group.id}
                              onToggle={onToggleOption}
                              onRemove={onRemoveOption}
                              onUpdateName={onUpdateOptionName}
                              onUpdatePrice={onUpdateOptionPrice}
                              onUpdateImage={onUpdateOptionImage}
                              formatCurrency={formatCurrency}
                            />
                          ))}
                        </div>

                        {/* Add Option Button */}
                        <Button
                          onClick={() => onAddOption(group.id)}
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                        >
                          <Plus className="w-4 h-4 mr-2" />
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
                  {/* Add Group Menu */}
                  <DropdownMenu open={showAddGroupMenu} onOpenChange={setShowAddGroupMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Grupo de Complementos
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full" align="center">
                      <DropdownMenuItem onClick={() => {
                        onAddGroup(dish?.id);
                        setShowAddGroupMenu(false);
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar novo grupo
                      </DropdownMenuItem>
                      {complementGroups.length > 0 && (
                        <DropdownMenuItem onClick={() => {
                          setShowCopyModal(true);
                          setShowAddGroupMenu(false);
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
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

      {/* Copy Group Modal */}
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