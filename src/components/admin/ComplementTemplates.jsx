import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Plus, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ComplementTemplates({ isOpen, onClose, onUseTemplate }) {
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const queryClient = useQueryClient();

  const { data: complementGroups = [] } = useQuery({
    queryKey: ['complementGroups'],
    queryFn: () => base44.entities.ComplementGroup.list('order'),
  });

  // Usar tags nos grupos para identificar templates
  const templates = complementGroups.filter(g => g.name.includes('[TEMPLATE]'));
  const regularGroups = complementGroups.filter(g => !g.name.includes('[TEMPLATE]'));

  const createTemplateMutation = useMutation({
    mutationFn: async (groupIds) => {
      const groups = complementGroups.filter(g => groupIds.includes(g.id));
      const templatePromises = groups.map(g => 
        base44.entities.ComplementGroup.create({
          ...g,
          name: `[TEMPLATE] ${g.name}`,
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
      
      // Criar uma cópia do grupo de complemento
      const newGroup = await base44.entities.ComplementGroup.create({
        ...template,
        name: template.name.replace('[TEMPLATE] ', ''),
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
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{template.name.replace('[TEMPLATE] ', '')}</p>
                      <p className="text-xs text-gray-500">{template.options?.length || 0} opções</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => useTemplateMutation.mutate(template.id)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Usar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Excluir este template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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