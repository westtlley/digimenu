import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Plus, Copy, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ Componente para item de template com edição de nome
function TemplateItem({ template, displayName, onUse, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(displayName);

  const handleSave = () => {
    if (editedName.trim() && editedName.trim() !== displayName) {
      onEdit(editedName.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(displayName);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="flex-1 h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              className="h-8 w-8 p-0"
            >
              <Check className="w-4 h-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        ) : (
          <>
            <p className="font-medium text-sm">{displayName}</p>
            <p className="text-xs text-gray-500">{template.options?.length || 0} opções</p>
          </>
        )}
      </div>
      {!isEditing && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            title="Editar nome"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onUse}
          >
            <Copy className="w-4 h-4 mr-1" />
            Usar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ComplementTemplates({ isOpen, onClose, onUseTemplate }) {
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const queryClient = useQueryClient();

  const { data: complementGroups = [] } = useQuery({
    queryKey: ['complementGroups'],
    queryFn: () => base44.entities.ComplementGroup.list('order'),
    refetchOnMount: 'always',
  });

  // ✅ Usar campo is_template ou tag para identificar templates (sem [TEMPLATE] no nome)
  const templates = complementGroups.filter(g => g.is_template === true || g.name.includes('[TEMPLATE]'));
  const regularGroups = complementGroups.filter(g => !g.is_template && !g.name.includes('[TEMPLATE]'));

  const createTemplateMutation = useMutation({
    mutationFn: async (groupIds) => {
      const groups = complementGroups.filter(g => groupIds.includes(g.id));
      // ✅ Criar template sem prefixo [TEMPLATE], usando campo is_template
      const templatePromises = groups.map(g => 
        base44.entities.ComplementGroup.create({
          ...g,
          name: g.name, // ✅ Manter nome original, sem [TEMPLATE]
          is_template: true, // ✅ Marcar como template
          id: undefined,
          created_date: undefined,
          updated_date: undefined,
        })
      );
      return Promise.all(templatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('Template salvo com sucesso!');
      setSelectedGroups([]);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplementGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('Template excluído');
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      const template = complementGroups.find(g => g.id === templateId);
      if (!template) return;
      
      // ✅ Criar uma cópia do grupo de complemento (remover is_template)
      const newGroup = await base44.entities.ComplementGroup.create({
        ...template,
        name: template.name.replace('[TEMPLATE]', '').trim(), // ✅ Remover [TEMPLATE] se existir
        is_template: false, // ✅ Não é template, é grupo normal
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
      });
      return newGroup;
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('Template aplicado!');
      onUseTemplate(newGroup);
      onClose();
    },
  });

  // ✅ Mutation para editar nome do template
  const updateTemplateNameMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      const template = complementGroups.find(g => g.id === id);
      if (!template) return;
      
      return base44.entities.ComplementGroup.update(id, {
        ...template,
        name: name.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('Nome do template atualizado!');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-orange-500" />
            Templates de Complementos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Templates Salvos */}
          <div>
            <h3 className="font-semibold mb-3">Templates Salvos</h3>
            {templates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhum template salvo ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(template => {
                  // ✅ Remover [TEMPLATE] do nome para exibição
                  const displayName = template.name.replace('[TEMPLATE]', '').trim();
                  
                  return (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      displayName={displayName}
                      onUse={() => useTemplateMutation.mutate(template.id)}
                      onDelete={() => {
                        if (confirm('Excluir este template?')) {
                          deleteTemplateMutation.mutate(template.id);
                        }
                      }}
                      onEdit={(newName) => {
                        updateTemplateNameMutation.mutate({ id: template.id, name: newName });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Criar Novo Template */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Criar Novo Template</h3>
            <p className="text-sm text-gray-600 mb-3">Selecione grupos de complementos existentes para salvar como template:</p>
            
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {regularGroups.map(group => (
                <label
                  key={group.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroups(prev => [...prev, group.id]);
                      } else {
                        setSelectedGroups(prev => prev.filter(id => id !== group.id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm flex-1">{group.name}</span>
                  <Badge variant="outline" className="text-xs">{group.options?.length || 0} opções</Badge>
                </label>
              ))}
            </div>

            <Button
              onClick={() => createTemplateMutation.mutate(selectedGroups)}
              disabled={selectedGroups.length === 0 || createTemplateMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Salvar como Template ({selectedGroups.length} selecionados)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}