import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

export default function ReorderModal({ isOpen, onClose, categories, dishes, complementGroups, onSave }) {
  const [localCategories, setLocalCategories] = useState([]);
  const [localDishes, setLocalDishes] = useState([]);
  const [localGroups, setLocalGroups] = useState([]);
  const [localOptions, setLocalOptions] = useState({});

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const safeCategories = Array.isArray(categories) ? categories : [];
      const safeDishes = Array.isArray(dishes) ? dishes : [];
      const safeGroups = Array.isArray(complementGroups) ? complementGroups : [];
      setLocalCategories([...safeCategories].sort((a, b) => (a.order || 0) - (b.order || 0)));
      setLocalDishes([...safeDishes]);
      setLocalGroups([...safeGroups].sort((a, b) => (a.order || 0) - (b.order || 0)));
      
      const optionsMap = {};
      safeGroups.forEach(group => {
        if (group.options) {
          optionsMap[group.id] = [...group.options];
        }
      });
      setLocalOptions(optionsMap);

      setSelectedCategory(null);
      setSelectedDish(null);
      setSelectedGroup(null);
    }
  }, [isOpen, categories, dishes, complementGroups]);

  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'category') {
      const items = Array.from(localCategories);
      const [reordered] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reordered);
      setLocalCategories(items);
    } else if (type === 'dish') {
      const safeLocalDishes = Array.isArray(localDishes) ? localDishes : [];
      const categoryDishes = safeLocalDishes.filter(d => d.category_id === selectedCategory);
      const otherDishes = safeLocalDishes.filter(d => d.category_id !== selectedCategory);
      const items = Array.from(categoryDishes);
      const [reordered] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reordered);
      setLocalDishes([...otherDishes, ...items]);
    } else if (type === 'group') {
      const items = Array.from(localGroups);
      const [reordered] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reordered);
      setLocalGroups(items);
    } else if (type.startsWith('option-')) {
      const groupId = type.replace('option-', '');
      const items = Array.from(localOptions[groupId] || []);
      const [reordered] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reordered);
      setLocalOptions(prev => ({ ...prev, [groupId]: items }));
    }
  };

  const handleSave = () => {
    const categoriesWithOrder = localCategories.map((cat, idx) => ({ ...cat, order: idx }));
    
    const dishesByCategory = {};
    localDishes.forEach(dish => {
      if (!dishesByCategory[dish.category_id]) {
        dishesByCategory[dish.category_id] = [];
      }
      dishesByCategory[dish.category_id].push(dish);
    });
    
    const dishesWithOrder = [];
    Object.entries(dishesByCategory).forEach(([categoryId, dishes]) => {
      dishes.forEach((dish, idx) => {
        dishesWithOrder.push({ ...dish, order: idx });
      });
    });
    
    const groupsWithOrder = localGroups.map((group, idx) => ({ ...group, order: idx }));
    
    const updates = {
      categories: categoriesWithOrder,
      dishes: dishesWithOrder,
      groups: groupsWithOrder,
      groupOptions: localOptions
    };
    onSave(updates);
  };

  const safeLocalDishes = Array.isArray(localDishes) ? localDishes : [];
  const categoryDishes = selectedCategory 
    ? safeLocalDishes.filter(d => d.category_id === selectedCategory)
    : [];

  const groupOptions = selectedGroup 
    ? (localOptions[selectedGroup] || []).filter(opt => opt.is_active !== false) 
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Reordenar cardápio</DialogTitle>
          <p className="text-sm text-gray-500">
            Para alterar a ordem dos itens ou categorias do seu cardápio, clique na opção desejada, segure e arraste.
          </p>
        </DialogHeader>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-4 overflow-auto max-h-[calc(85vh-200px)] p-1">
            {/* Categories Column */}
            <div className="border-r pr-4">
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2">
                <h3 className="font-semibold text-sm">Categorias</h3>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              <Droppable droppableId="categories" type="category">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {localCategories.map((category, index) => (
                      <Draggable key={category.id} draggableId={category.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => {
                              setSelectedCategory(category.id);
                              setSelectedDish(null);
                              setSelectedGroup(null);
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            } ${
                              selectedCategory === category.id 
                                ? 'bg-orange-50 border-orange-300' 
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm truncate">{category.name}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Items Column */}
            <div className="border-r pr-4">
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2">
                <h3 className="font-semibold text-sm">itens</h3>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              {!selectedCategory ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  Selecione uma categoria
                </p>
              ) : categoryDishes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  Nenhum item nesta categoria
                </p>
              ) : (
                <Droppable droppableId="dishes" type="dish">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {categoryDishes.map((dish, index) => (
                        <Draggable key={dish.id} draggableId={dish.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => {
                                setSelectedDish(dish.id);
                                setSelectedGroup(null);
                              }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              } ${
                                selectedDish === dish.id 
                                  ? 'bg-orange-50 border-orange-300' 
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm truncate">
                                  {dish.name} {dish.portion && `(${dish.portion})`}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>

            {/* Complement Groups Column - TODOS OS GRUPOS */}
            <div className="border-r pr-4">
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2">
                <h3 className="font-semibold text-sm">Grupos de complementos</h3>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              {localGroups.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  Nenhum grupo de complementos
                </p>
              ) : (
                <Droppable droppableId="groups" type="group">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {localGroups.map((group, index) => (
                        <Draggable key={group.id} draggableId={group.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedGroup(group.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              } ${
                                selectedGroup === group.id 
                                  ? 'bg-orange-50 border-orange-300' 
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm truncate">{group.name}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>

            {/* Options Column */}
            <div>
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2">
                <h3 className="font-semibold text-sm">Complementos</h3>
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              {!selectedGroup ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  Selecione um grupo
                </p>
              ) : groupOptions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  Nenhum complemento
                </p>
              ) : (
                <Droppable droppableId={`options-${selectedGroup}`} type={`option-${selectedGroup}`}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {groupOptions.map((option, index) => (
                        <Draggable key={option.id} draggableId={`${selectedGroup}-${option.id}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 rounded-lg border bg-white transition-all ${
                                snapshot.isDragging ? 'shadow-lg' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm truncate">{option.name}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          </div>
        </DragDropContext>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-orange-500 hover:bg-orange-600">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}