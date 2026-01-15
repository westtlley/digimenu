// ========= IMPORTS =========
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Pencil, Copy, Files, Layers, ChevronDown, ChevronUp,
  GripVertical, MoreVertical, Settings, X, Edit as EditIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import ReorderModal from "./ReorderModal";
import ReuseGroupModal from "./ReuseGroupModal";
import ComplementTemplates from "./ComplementTemplates";
import BulkEditOptions from "./BulkEditOptions";

import { apiClient } from "@/api/apiClient";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";

// ========= HELPERS =========
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

// ========= COMPONENT =========
export default function DishesTab({ onNavigateToPizzas }) {
  const queryClient = useQueryClient();
  const [expandedDishId, setExpandedDishId] = useState(null);
  const [showReuseGroupModal, setShowReuseGroupModal] = useState(false);
  const [currentDishForReuse, setCurrentDishForReuse] = useState(null);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [bulkEditGroup, setBulkEditGroup] = useState(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  // ========= BUSCAR DADOS =========
  const { data: dishes = [], isLoading: dishesLoading } = useQuery({
    queryKey: ['dishes'],
    queryFn: async () => {
      const result = await apiClient.entities.Dish.list();
      return Array.isArray(result) ? result : [];
    },
    initialData: [],
  });

  const { data: complementGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['complementGroups'],
    queryFn: async () => {
      const result = await apiClient.entities.ComplementGroup.list('order');
      return Array.isArray(result) ? result : [];
    },
    initialData: [],
  });

  // ========= MUTATIONS =========
  const updateComplementGroupMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.ComplementGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('Grupo atualizado!');
    },
  });

  // ========= UPLOAD DE IMAGEM =========
  const handleOptionImageUpload = async (groupId, optionId, file) => {
    try {
      const imageUrl = await uploadToCloudinary(file, 'complements');

      const group = complementGroups.find(g => g.id === groupId);
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

  // ========= VALIDAÇÕES =========
  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const safeGroups = Array.isArray(complementGroups) ? complementGroups : [];

  // ========= LOADING =========
  if (dishesLoading || groupsLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Carregando pratos...</p>
      </div>
    );
  }

  // ========= RENDER =========
  return (
    <div className="space-y-4">
      {safeDishes.map(dish => {
        const dishGroups = safeGroups.filter(group => {
          if (!dish.complement_groups || !Array.isArray(dish.complement_groups)) {
            return false;
          }
          return dish.complement_groups.some(cg => cg && cg.group_id === group.id);
        });

        return (
          <div key={dish.id} className="border rounded-lg p-3 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {dish.image && (
                  <img 
                    src={dish.image} 
                    alt={dish.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{dish.name}</h3>
                  {dishGroups.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dishGroups.length} grupo{dishGroups.length !== 1 ? 's' : ''} de complementos
                    </p>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setExpandedDishId(expandedDishId === dish.id ? null : dish.id)
                }
              >
                {expandedDishId === dish.id ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Complementos
                  </>
                )}
              </Button>
            </div>

            {expandedDishId === dish.id && (
              <div className="mt-3 space-y-2">
                {dishGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Este prato não possui grupos de complementos configurados
                  </p>
                ) : (
                  dishGroups.map(group => {
                    const groupOptions = Array.isArray(group.options) ? group.options : [];
                    
                    return (
                      <div key={group.id} className="border p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">
                          {group.name}
                        </div>

                        {groupOptions.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                            Nenhuma opção cadastrada
                          </p>
                        ) : (
                          groupOptions.map(opt => (
                            <div
                              key={opt.id}
                              className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 mb-2"
                            >
                              <label className="cursor-pointer">
                                {opt.image ? (
                                  <img
                                    src={opt.image}
                                    className="w-12 h-12 object-cover rounded"
                                    alt={opt.name}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                                    +
                                  </div>
                                )}

                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleOptionImageUpload(group.id, opt.id, file);
                                  }}
                                />
                              </label>

                              <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                {opt.name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {formatCurrency(opt.price || 0)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      {safeDishes.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Nenhum prato cadastrado ainda.</p>
          {onNavigateToPizzas && (
            <Button 
              onClick={onNavigateToPizzas} 
              className="mt-4"
              variant="outline"
            >
              Configurar Pizzas
            </Button>
          )}
        </div>
      )}

      {/* Modais (mantidos para compatibilidade futura) */}
      {showReuseGroupModal && (
        <ReuseGroupModal
          isOpen={showReuseGroupModal}
          onClose={() => setShowReuseGroupModal(false)}
          dish={currentDishForReuse}
          complementGroups={safeGroups}
        />
      )}

      {showTemplatesModal && (
        <ComplementTemplates
          isOpen={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      {showReorderModal && (
        <ReorderModal
          isOpen={showReorderModal}
          onClose={() => setShowReorderModal(false)}
        />
      )}

      {showBulkEditModal && bulkEditGroup && (
        <BulkEditOptions
          isOpen={showBulkEditModal}
          onClose={() => {
            setShowBulkEditModal(false);
            setBulkEditGroup(null);
          }}
          group={bulkEditGroup}
        />
      )}
    </div>
  );
}
