import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Menu, FolderPlus } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export default function CategoriesTab() {
  const [user, setUser] = React.useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('order'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const categoryData = {
        ...data,
        owner_email: user?.subscriber_email || user?.email
      };
      return base44.entities.Category.create(categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      setNewCategoryName('');
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[9999] bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl';
      toast.innerHTML = '✅ Categoria criada!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createMutation.mutate({
      name: newCategoryName,
      order: categories.length,
    });
  };

  const moveCategory = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const cat1 = categories[index];
    const cat2 = categories[newIndex];

    updateMutation.mutate({ id: cat1.id, data: { ...cat1, order: newIndex } });
    updateMutation.mutate({ id: cat2.id, data: { ...cat2, order: index } });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-center mb-4 sm:mb-6">
        <Button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Categoria
        </Button>
      </div>

      <div className="max-w-xl mx-auto space-y-3">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-4"
          >
            <Menu className="w-5 h-5 text-gray-400" />
            
            <input
              type="text"
              value={category.name || ''}
              onChange={(e) => updateMutation.mutate({ 
                id: category.id, 
                data: { ...category, name: e.target.value } 
              })}
              className="flex-1 font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none"
              placeholder="Nome da categoria"
            />

            <div className="flex items-center gap-1">
              <button
                onClick={() => moveCategory(index, -1)}
                disabled={index === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => moveCategory(index, 1)}
                disabled={index === categories.length - 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                if (confirm('Excluir esta categoria?')) {
                  deleteMutation.mutate(category.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {categories.length === 0 && (
          <EmptyState
            icon={FolderPlus}
            title="Organize melhor seu cardápio criando categorias"
            description="Categorias ajudam seus clientes a encontrar pratos mais facilmente"
            actionLabel="Criar categoria"
            onAction={() => setShowModal(true)}
          />
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Categoria</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Categoria</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Tradicionais"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}