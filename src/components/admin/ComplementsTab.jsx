import React, { useState, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, X, GripVertical, Search, Package, Filter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { usePermission } from '../permissions/usePermission';
import { useMenuDishes } from '@/hooks/useMenuData';

// Componente separado para opção individual com estado local
function OptionItem({ option, group, optionIndex, provided, snapshot, onUpdate, onToggle, onRemove, canEdit }) {
  const [localName, setLocalName] = useState(option.name || '');
  const [localPrice, setLocalPrice] = useState(option.price?.toString() || '0');

  const handleNameBlur = () => {
    if (localName !== option.name) {
      onUpdate(group, option.id, 'name', localName);
    }
  };

  const handlePriceBlur = () => {
    const newPrice = parseFloat(localPrice) || 0;
    if (newPrice !== option.price) {
      onUpdate(group, option.id, 'price', newPrice);
    }
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        "flex flex-wrap items-center gap-2 p-2 rounded-lg border transition-all",
        snapshot.isDragging ? "shadow-lg" : "",
        option.is_active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-60"
      )}
    >
      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
      <Input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleNameBlur}
        className="flex-1 min-w-[120px] h-8 border-0 bg-transparent hover:bg-gray-50 focus:bg-white"
        placeholder="Nome da opção"
      />
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">R$</span>
        <Input
          type="number"
          step="0.01"
          value={localPrice}
          onChange={(e) => setLocalPrice(e.target.value)}
          onBlur={handlePriceBlur}
          className="w-16 h-8 text-center"
        />
      </div>
      <Button
        size="sm"
        variant={option.is_active ? "default" : "outline"}
        className={cn(
          "h-7 text-xs",
          option.is_active ? "bg-green-500 hover:bg-green-600" : ""
        )}
        onClick={() => onToggle(group, option.id)}
        disabled={!canEdit}
      >
        {option.is_active ? 'ON' : 'OFF'}
      </Button>
      <button
        onClick={() => onRemove(group, option.id)}
        className="p-1 text-red-400 hover:text-red-600"
        disabled={!canEdit}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Componente separado para grupo com estado local
function GroupItem({ group, groupIndex, provided, snapshot, updateMutation, deleteMutation, onAddOption, onToggleOption, onRemoveOption, onUpdateOption, onDragEndOptions, canEdit }) {
  const [localName, setLocalName] = useState(group.name || '');
  const [localMaxSelection, setLocalMaxSelection] = useState(group.max_selection?.toString() || '1');

  const handleNameBlur = () => {
    if (localName !== group.name) {
      updateMutation.mutate({ id: group.id, data: { name: localName } });
    }
  };

  const handleMaxSelectionBlur = () => {
    const newMax = parseInt(localMaxSelection) || 1;
    if (newMax !== group.max_selection) {
      updateMutation.mutate({ id: group.id, data: { max_selection: newMax } });
    }
  };

  return (
    <div 
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "bg-white rounded-xl p-4 sm:p-5 shadow-sm border transition-all",
        snapshot.isDragging ? "shadow-2xl" : ""
      )}
    >
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleNameBlur}
              className="font-bold text-lg bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none w-full"
              placeholder="Nome do grupo"
            />
            <Badge variant="outline" className="text-xs mt-1">
              {(group.options || []).length} itens
            </Badge>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-red-500 hover:text-red-700 flex-shrink-0"
          onClick={() => {
            const dishesUsingGroup = dishes.filter(d => 
              d.complement_groups?.some(cg => cg.group_id === group.id)
            );
            if (dishesUsingGroup.length > 0) {
              if (!confirm(`Este grupo está sendo usado em ${dishesUsingGroup.length} prato(s). Deseja realmente excluir?`)) return;
            } else {
              if (!confirm('Excluir este grupo?')) return;
            }
            deleteMutation.mutate(group.id);
            toast.success('Grupo excluído');
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Configurações */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={group.is_required}
            onCheckedChange={(checked) => updateMutation.mutate({
              id: group.id,
              data: { is_required: checked },
            })}
          />
          <span>Obrigatório?</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Máx:</span>
          <Input
            type="number"
            min="1"
            value={localMaxSelection}
            onChange={(e) => setLocalMaxSelection(e.target.value)}
            onBlur={handleMaxSelectionBlur}
            className="w-16 h-8 text-center"
          />
        </div>
      </div>

      {/* Opções */}
      <DragDropContext onDragEnd={(result) => onDragEndOptions(result, group)}>
        <Droppable droppableId={`options-${group.id}`}>
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {(group.options || []).map((option, optionIndex) => (
                <Draggable key={option.id} draggableId={option.id} index={optionIndex}>
                  {(provided, snapshot) => (
                    <OptionItem
                      option={option}
                      group={group}
                      optionIndex={optionIndex}
                      provided={provided}
                      snapshot={snapshot}
                      onUpdate={onUpdateOption}
                      onToggle={onToggleOption}
                      onRemove={onRemoveOption}
                      canEdit={canEdit}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Botão Adicionar Opção */}
      <button
        onClick={() => onAddOption(group)}
        className="w-full mt-3 py-2 border-2 border-dashed border-orange-300 rounded-lg text-orange-500 hover:bg-orange-50 text-sm font-medium"
      >
        + Adicionar Opção
      </button>
    </div>
  );
}

export default function ComplementsTab() {
  const [user, setUser] = React.useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRequired, setFilterRequired] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    is_required: true,
    max_selection: 1,
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Error loading user:', e);
      }
    };
    loadUser();
  }, []);

  // ✅ CORREÇÃO: Usar hook com contexto automático
  const { menuContext } = usePermission();
  const { data: groups = [] } = useQuery({
    queryKey: ['complementGroups', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      try {
        const opts = {};
        if (menuContext.type === 'subscriber' && menuContext.value) {
          opts.as_subscriber = menuContext.value;
        }
        const result = await base44.entities.ComplementGroup.list('order', opts);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        return [];
      }
    },
    enabled: !!menuContext,
    initialData: [],
    refetchOnMount: 'always',
  });

  // ✅ CORREÇÃO: Usar hook com contexto automático
  const { data: dishes = [] } = useMenuDishes();

  // Filtrar grupos
  const filteredGroups = useMemo(() => {
    if (!Array.isArray(groups)) return [];
    let result = groups.filter(group => {
      const matchesSearch = !searchTerm || 
        group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.options || []).some(opt => opt.name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesRequired = filterRequired === 'all' ||
        (filterRequired === 'required' && group.is_required) ||
        (filterRequired === 'optional' && !group.is_required);
      
      return matchesSearch && matchesRequired;
    });
    return result;
  }, [groups, searchTerm, filterRequired]);

  // Estatísticas
  const stats = useMemo(() => {
    const safeGroups = Array.isArray(groups) ? groups : [];
    const safeDishes = Array.isArray(dishes) ? dishes : [];
    const totalGroups = safeGroups.length;
    const totalOptions = safeGroups.reduce((sum, g) => sum + (g.options?.length || 0), 0);
    const activeOptions = safeGroups.reduce((sum, g) => 
      sum + (g.options?.filter(o => o.is_active !== false).length || 0), 0
    );
    const groupsInUse = safeGroups.filter(g => {
      return safeDishes.some(d => 
        d.complement_groups?.some(cg => cg.group_id === g.id)
      );
    }).length;

    return {
      totalGroups,
      totalOptions,
      activeOptions,
      groupsInUse
    };
  }, [groups, dishes]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const groupData = {
        ...data,
        owner_email: user?.subscriber_email || user?.email
      };
      return base44.entities.ComplementGroup.create(groupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      setShowModal(false);
      setFormData({ name: '', is_required: true, max_selection: 1 });
      toast.success('✅ Grupo criado!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplementGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('✅ Salvo!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplementGroup.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['complementGroups'] }),
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      options: [],
      order: groups.length,
    });
  };

  const handleDragEndGroups = async (result) => {
    if (!canEdit) return;
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    
    const items = Array.from(groups);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Atualização otimista
    queryClient.setQueryData(['complementGroups'], items.map((g, idx) => ({ ...g, order: idx })));

    // Atualizar todos os grupos em paralelo
    const updatePromises = items.map((group, index) => 
      base44.entities.ComplementGroup.update(group.id, { order: index })
    );

      try {
        await Promise.all(updatePromises);
        queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
        toast.success('✅ Ordem atualizada!');
      } catch (error) {
      console.error("Erro ao reordenar grupos:", error);
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
    }
  };

  const handleDragEndOptions = (result, group) => {
    if (!result.destination) return;
    const items = Array.from(group.options || []);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    updateMutation.mutate({
      id: group.id,
      data: { options: items }
    });
  };

  const addOption = (group) => {
    const name = prompt('Nome da opção:');
    if (!name) return;
    const price = parseFloat(prompt('Preço (0 para grátis):', '0')) || 0;
    
    const newOption = {
      id: Date.now().toString(),
      name,
      price,
      is_active: true,
    };
    
    updateMutation.mutate({
      id: group.id,
      data: {
        options: [...(group.options || []), newOption],
      },
    });
  };



  const toggleOption = (group, optionId) => {
    const newOptions = (group.options || []).map(opt =>
      opt.id === optionId ? { ...opt, is_active: !opt.is_active } : opt
    );
    updateMutation.mutate({
      id: group.id,
      data: { options: newOptions },
    });
  };

  const removeOption = (group, optionId) => {
    if (!confirm('Remover esta opção?')) return;
    const newOptions = (group.options || []).filter(opt => opt.id !== optionId);
    updateMutation.mutate({
      id: group.id,
      data: { options: newOptions },
    });
  };

  const updateOption = (group, optionId, field, value) => {
    const newOptions = (group.options || []).map(opt =>
      opt.id === optionId ? { ...opt, [field]: value } : opt
    );
    updateMutation.mutate({
      id: group.id,
      data: { options: newOptions },
    });
  };

  // Verificar permissões: master OU assinante com can_edit
  const canEdit = user?.is_master || user?.can_edit;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Grupos</p>
                <p className="text-2xl font-bold">{stats.totalGroups}</p>
              </div>
              <Package className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Opções</p>
                <p className="text-2xl font-bold">{stats.totalOptions}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeOptions}</p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Em Uso</p>
                <p className="text-2xl font-bold text-orange-600">{stats.groupsInUse}</p>
              </div>
              <Package className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar grupo ou opção..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRequired} onValueChange={setFilterRequired}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="required">Obrigatórios</SelectItem>
            <SelectItem value="optional">Opcionais</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowModal(true)} className="bg-gray-800 hover:bg-gray-900">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Grupo
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEndGroups}>
        <Droppable droppableId="groups">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="grid gap-6">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
                  {searchTerm || filterRequired !== 'all' 
                    ? 'Nenhum grupo encontrado com os filtros aplicados'
                    : 'Nenhum grupo de complementos cadastrado ainda.'
                  }
                </div>
              ) : (
                filteredGroups.map((group, groupIndex) => {
                  const originalIndex = groups.findIndex(g => g.id === group.id);
                  return (
                    <Draggable key={group.id} draggableId={group.id} index={groupIndex}>
                      {(provided, snapshot) => (
                        <GroupItem
                          group={group}
                          groupIndex={originalIndex}
                          provided={provided}
                          snapshot={snapshot}
                          updateMutation={updateMutation}
                          deleteMutation={deleteMutation}
                          onAddOption={addOption}
                          onToggleOption={toggleOption}
                          onRemoveOption={removeOption}
                          onUpdateOption={updateOption}
                          onDragEndOptions={handleDragEndOptions}
                          canEdit={canEdit}
                        />
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Modal Criar Grupo */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-sm max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <Label>Nome do Grupo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Arroz, Feijão, Guarnições..."
                required
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                />
                <span>Obrigatório</span>
              </label>
            </div>

            <div>
              <Label>Máximo de seleções</Label>
              <Input
                type="number"
                min="1"
                value={formData.max_selection}
                onChange={(e) => setFormData(prev => ({ ...prev, max_selection: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-gray-800 hover:bg-gray-900">
                Criar Grupo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}