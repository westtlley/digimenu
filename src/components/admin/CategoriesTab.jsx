import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Menu, FolderPlus, Search, Package } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function CategoriesTab() {
  const [user, setUser] = React.useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    refetchOnMount: 'always',
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => base44.entities.Dish.list(),
  });

  // Filtrar categorias
  const filteredCategories = useMemo(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    if (!searchTerm) return safeCategories;
    return safeCategories.filter(cat => 
      cat.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Estatísticas
  const stats = useMemo(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeDishes = Array.isArray(dishes) ? dishes : [];
    const totalCategories = safeCategories.length;
    const totalDishes = safeDishes.length;
    const dishesByCategory = safeCategories.map(cat => ({
      category: cat,
      count: safeDishes.filter(d => d.category_id === cat.id).length
    }));
    const categoriesWithDishes = dishesByCategory.filter(item => item.count > 0).length;
    const emptyCategories = totalCategories - categoriesWithDishes;

    return {
      totalCategories,
      totalDishes,
      categoriesWithDishes,
      emptyCategories,
      dishesByCategory
    };
  }, [categories, dishes]);

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
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      setShowModal(false);
      setNewCategoryName('');
      toast.success('✅ Categoria criada!');
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
    createMutation.mutate({ name: newCategoryName.trim(), order: categories.length });
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Categorias</p>
                <p className="text-2xl font-bold">{stats.totalCategories}</p>
              </div>
              <Menu className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Com Pratos</p>
                <p className="text-2xl font-bold text-green-600">{stats.categoriesWithDishes}</p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vazias</p>
                <p className="text-2xl font-bold text-gray-400">{stats.emptyCategories}</p>
              </div>
              <FolderPlus className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Categoria
        </Button>
      </div>

      <div className="max-w-xl mx-auto space-y-3">
        {filteredCategories.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title={searchTerm ? "Nenhuma categoria encontrada" : "Organize melhor seu cardápio criando categorias"}
            description={searchTerm ? "Tente buscar com outro termo" : "Categorias ajudam seus clientes a encontrar pratos mais facilmente"}
            actionLabel={searchTerm ? undefined : "Criar categoria"}
            onAction={searchTerm ? undefined : () => setShowModal(true)}
          />
        ) : (
          filteredCategories.map((category, index) => {
            const dishCount = dishes.filter(d => d.category_id === category.id).length;
            return (
          <div
            key={category.id}
            className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-4"
          >
            <Menu className="w-5 h-5 text-gray-400" />
            
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={category.name || ''}
                onChange={(e) => updateMutation.mutate({ 
                  id: category.id, 
                  data: { ...category, name: e.target.value } 
                })}
                className="w-full font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none"
                placeholder="Nome da categoria"
              />
              <Badge variant="outline" className="mt-1 text-xs">
                {dishCount} {dishCount === 1 ? 'prato' : 'pratos'}
              </Badge>
            </div>

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
                if (dishCount > 0) {
                  if (!confirm(`Esta categoria tem ${dishCount} prato(s). Deseja realmente excluir?`)) return;
                }
                deleteMutation.mutate(category.id);
                toast.success('Categoria excluída');
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