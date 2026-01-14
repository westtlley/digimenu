// ========= IMPORTS =========
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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

// ========= HELPERS =========
const API_URL = import.meta.env.VITE_API_URL;

// ========= COMPONENT =========
export default function DishesTab({
  dishes,
  categories,
  complementGroups,
  updateDishMutation,
  createComplementGroupMutation,
  updateComplementGroupMutation,
  updateCategoryMutation,
  createComboMutation,
  updateComboMutation,
  reuseComplementGroupToDish,
  canEdit,
  canCreate,
  canDelete,
  getGroupUsageInfo,
  formatCurrency
}) {
  const [expandedDishId, setExpandedDishId] = useState(null);
  const [showReuseGroupModal, setShowReuseGroupModal] = useState(false);
  const [currentDishForReuse, setCurrentDishForReuse] = useState(null);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [bulkEditGroup, setBulkEditGroup] = useState(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  // ========= UPLOAD DE IMAGEM CORRIGIDO =========
  const handleOptionImageUpload = async (groupId, optionId, file) => {
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const imageUrl = await uploadToCloudinary(file, 'complements');

      const group = complementGroups.find(g => g.id === groupId);
      if (!group) return;

      const updatedOptions = group.options.map(opt =>
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

  return (
    <div className="space-y-4">
      {dishes.map(dish => (
        <div key={dish.id} className="border rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{dish.name}</h3>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setExpandedDishId(expandedDishId === dish.id ? null : dish.id)
              }
            >
              Complementos
            </Button>
          </div>

          {expandedDishId === dish.id && (
            <div className="mt-3 space-y-2">
              {(dish.complement_groups || []).map(groupLink => {
                const group = complementGroups.find(
                  g => g.id === groupLink.group_id
                );

                if (!group) return null;

                return (
                  <div key={group.id} className="border p-3 rounded-lg bg-gray-50">
                    <div className="font-medium mb-2">{group.name}</div>

                    {(group.options || []).map(opt => (
                      <div
                        key={opt.id}
                        className="flex items-center gap-3 p-2 bg-white rounded border"
                      >
                        <label className="cursor-pointer">
                          {opt.image ? (
                            <img
                              src={opt.image}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
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

                        <span className="flex-1 text-sm">{opt.name}</span>
                        <span className="text-xs text-gray-500">
                          {formatCurrency(opt.price || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}