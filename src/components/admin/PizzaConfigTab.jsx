import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Star, Settings } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import PizzaVisualizationSettings from './PizzaVisualizationSettings';
import MyPizzasTab from './MyPizzasTab';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function PizzaConfigTab() {
  const [user, setUser] = React.useState(null);
  const [activeTab, setActiveTab] = useState('pizzas');
  
  // Modals
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  
  // Editing
  const [editingSize, setEditingSize] = useState(null);
  const [editingFlavor, setEditingFlavor] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [editingExtra, setEditingExtra] = useState(null);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await apiClient.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Error loading user:', e);
      }
    };
    loadUser();
  }, []);

  // Queries
  const { data: sizes = [] } = useQuery({
    queryKey: ['pizzaSizes'],
    queryFn: () => apiClient.entities.PizzaSize.list('order'),
  });

  const { data: flavors = [] } = useQuery({
    queryKey: ['pizzaFlavors'],
    queryFn: () => apiClient.entities.PizzaFlavor.list('order'),
  });

  const { data: edges = [] } = useQuery({
    queryKey: ['pizzaEdges'],
    queryFn: () => apiClient.entities.PizzaEdge.list('order'),
  });

  const { data: extras = [] } = useQuery({
    queryKey: ['pizzaExtras'],
    queryFn: () => apiClient.entities.PizzaExtra.list('order'),
  });

  // Mutations - Sizes
  const createSizeMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaSize.create({
      ...data,
      subscriber_email: user?.subscriber_email || user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaSizes'] });
      toast.success('Tamanho criado!');
      setShowSizeModal(false);
      setEditingSize(null);
    },
  });

  const updateSizeMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaSize.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaSizes'] });
      toast.success('Tamanho atualizado!');
      setShowSizeModal(false);
      setEditingSize(null);
    },
  });

  const deleteSizeMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaSize.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaSizes'] });
      toast.success('Tamanho excluído!');
    },
  });

  // Mutations - Flavors
  const createFlavorMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaFlavor.create({
      ...data,
      subscriber_email: user?.subscriber_email || user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaFlavors'] });
      toast.success('Sabor criado!');
      setShowFlavorModal(false);
      setEditingFlavor(null);
    },
  });

  const updateFlavorMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaFlavor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaFlavors'] });
      toast.success('Sabor atualizado!');
      setShowFlavorModal(false);
      setEditingFlavor(null);
    },
  });

  const deleteFlavorMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaFlavor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaFlavors'] });
      toast.success('Sabor excluído!');
    },
  });

  // Mutations - Edges
  const createEdgeMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaEdge.create({
      ...data,
      subscriber_email: user?.subscriber_email || user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaEdges'] });
      toast.success('Borda criada!');
      setShowEdgeModal(false);
      setEditingEdge(null);
    },
  });

  const updateEdgeMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaEdge.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaEdges'] });
      toast.success('Borda atualizada!');
      setShowEdgeModal(false);
      setEditingEdge(null);
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaEdge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaEdges'] });
      toast.success('Borda excluída!');
    },
  });

  // Mutations - Extras
  const createExtraMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaExtra.create({
      ...data,
      subscriber_email: user?.subscriber_email || user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaExtras'] });
      toast.success('Extra criado!');
      setShowExtraModal(false);
      setEditingExtra(null);
    },
  });

  const updateExtraMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaExtra.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaExtras'] });
      toast.success('Extra atualizado!');
      setShowExtraModal(false);
      setEditingExtra(null);
    },
  });

  const deleteExtraMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaExtra.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaExtras'] });
      toast.success('Extra excluído!');
    },
  });

  return (
    <div className="p-6">
      <Toaster position="top-center" />
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração de Pizzas</h2>
        <p className="text-gray-600">Gerencie tamanhos, sabores, bordas e extras para suas pizzas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="pizzas">Minhas Pizzas</TabsTrigger>
          <TabsTrigger value="sizes">Tamanhos ({sizes.length})</TabsTrigger>
          <TabsTrigger value="flavors">Sabores ({flavors.length})</TabsTrigger>
          <TabsTrigger value="edges">Bordas ({edges.length})</TabsTrigger>
          <TabsTrigger value="extras">Extras ({extras.length})</TabsTrigger>
          <TabsTrigger value="visual">
            <Settings className="w-4 h-4 mr-1" />
            Visual
          </TabsTrigger>
        </TabsList>

        {/* Minhas Pizzas */}
        <TabsContent value="pizzas">
          <MyPizzasTab />
        </TabsContent>

        {/* Tamanhos */}
        <TabsContent value="sizes" className="space-y-4">
          <Button onClick={() => setShowSizeModal(true)} className="bg-orange-500">
            <Plus className="w-4 h-4 mr-2" />
            Novo Tamanho
          </Button>

          <div className="grid gap-4">
            {sizes.map(size => (
              <div key={size.id} className="bg-white p-4 rounded-xl border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{size.name}</h3>
                    <p className="text-sm text-gray-600">
                      {size.slices} fatias • Até {size.max_flavors} sabor{size.max_flavors > 1 ? 'es' : ''}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        Tradicional: <strong className="text-green-600">{formatCurrency(size.price_tradicional)}</strong>
                      </span>
                      <span className="text-gray-600">
                        Premium: <strong className="text-orange-600">{formatCurrency(size.price_premium)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={size.is_active}
                      onCheckedChange={(checked) => 
                        updateSizeMutation.mutate({ id: size.id, data: { is_active: checked } })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSize(size);
                        setShowSizeModal(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Excluir este tamanho?')) {
                          deleteSizeMutation.mutate(size.id);
                        }
                      }}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Sabores */}
        <TabsContent value="flavors" className="space-y-4">
          <Button onClick={() => setShowFlavorModal(true)} className="bg-orange-500">
            <Plus className="w-4 h-4 mr-2" />
            Novo Sabor
          </Button>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">🍕 Tradicionais</h3>
              <div className="grid gap-3">
                {flavors.filter(f => f.category === 'tradicional').map(flavor => (
                  <FlavorCard
                    key={flavor.id}
                    flavor={flavor}
                    onEdit={() => {
                      setEditingFlavor(flavor);
                      setShowFlavorModal(true);
                    }}
                    onDelete={() => {
                      if (confirm('Excluir este sabor?')) {
                        deleteFlavorMutation.mutate(flavor.id);
                      }
                    }}
                    onToggleActive={(checked) => 
                      updateFlavorMutation.mutate({ id: flavor.id, data: { is_active: checked } })
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">⭐ Premium</h3>
              <div className="grid gap-3">
                {flavors.filter(f => f.category === 'premium').map(flavor => (
                  <FlavorCard
                    key={flavor.id}
                    flavor={flavor}
                    onEdit={() => {
                      setEditingFlavor(flavor);
                      setShowFlavorModal(true);
                    }}
                    onDelete={() => {
                      if (confirm('Excluir este sabor?')) {
                        deleteFlavorMutation.mutate(flavor.id);
                      }
                    }}
                    onToggleActive={(checked) => 
                      updateFlavorMutation.mutate({ id: flavor.id, data: { is_active: checked } })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Bordas */}
        <TabsContent value="edges" className="space-y-4">
          <Button onClick={() => setShowEdgeModal(true)} className="bg-orange-500">
            <Plus className="w-4 h-4 mr-2" />
            Nova Borda
          </Button>

          <div className="grid gap-3">
            {edges.map(edge => (
              <div key={edge.id} className="bg-white p-4 rounded-xl border flex items-center gap-4">
                {edge.image && (
                  <img src={edge.image} alt={edge.name} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <h3 className="font-bold">{edge.name}</h3>
                  <p className="text-sm text-gray-600">{edge.description}</p>
                  <p className="font-semibold text-orange-600 mt-1">{formatCurrency(edge.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {edge.is_popular && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                  <Switch
                    checked={edge.is_active}
                    onCheckedChange={(checked) => 
                      updateEdgeMutation.mutate({ id: edge.id, data: { is_active: checked } })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingEdge(edge);
                      setShowEdgeModal(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Excluir esta borda?')) {
                        deleteEdgeMutation.mutate(edge.id);
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
        </TabsContent>

        {/* Extras */}
        <TabsContent value="extras" className="space-y-4">
          <Button onClick={() => setShowExtraModal(true)} className="bg-orange-500">
            <Plus className="w-4 h-4 mr-2" />
            Novo Extra
          </Button>

          <div className="grid gap-3">
            {extras.map(extra => (
              <div key={extra.id} className="bg-white p-4 rounded-xl border flex items-center gap-4">
                {extra.image && (
                  <img src={extra.image} alt={extra.name} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <h3 className="font-bold">{extra.name}</h3>
                  <p className="text-sm text-gray-600">{extra.description}</p>
                  <p className="font-semibold text-orange-600 mt-1">{formatCurrency(extra.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={extra.is_active}
                    onCheckedChange={(checked) => 
                      updateExtraMutation.mutate({ id: extra.id, data: { is_active: checked } })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingExtra(extra);
                      setShowExtraModal(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Excluir este extra?')) {
                        deleteExtraMutation.mutate(extra.id);
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
        </TabsContent>

        {/* Visual Settings */}
        <TabsContent value="visual">
          <PizzaVisualizationSettings />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SizeModal
        isOpen={showSizeModal}
        onClose={() => {
          setShowSizeModal(false);
          setEditingSize(null);
        }}
        onSubmit={(data) => {
          if (editingSize) {
            updateSizeMutation.mutate({ id: editingSize.id, data });
          } else {
            createSizeMutation.mutate({ ...data, order: sizes.length });
          }
        }}
        size={editingSize}
      />

      <FlavorModal
        isOpen={showFlavorModal}
        onClose={() => {
          setShowFlavorModal(false);
          setEditingFlavor(null);
        }}
        onSubmit={(data) => {
          if (editingFlavor) {
            updateFlavorMutation.mutate({ id: editingFlavor.id, data });
          } else {
            createFlavorMutation.mutate({ ...data, order: flavors.length });
          }
        }}
        flavor={editingFlavor}
      />

      <EdgeModal
        isOpen={showEdgeModal}
        onClose={() => {
          setShowEdgeModal(false);
          setEditingEdge(null);
        }}
        onSubmit={(data) => {
          if (editingEdge) {
            updateEdgeMutation.mutate({ id: editingEdge.id, data });
          } else {
            createEdgeMutation.mutate({ ...data, order: edges.length });
          }
        }}
        edge={editingEdge}
      />

      <ExtraModal
        isOpen={showExtraModal}
        onClose={() => {
          setShowExtraModal(false);
          setEditingExtra(null);
        }}
        onSubmit={(data) => {
          if (editingExtra) {
            updateExtraMutation.mutate({ id: editingExtra.id, data });
          } else {
            createExtraMutation.mutate({ ...data, order: extras.length });
          }
        }}
        extra={editingExtra}
      />
    </div>
  );
}

function FlavorCard({ flavor, onEdit, onDelete, onToggleActive }) {
  return (
    <div className="bg-white p-4 rounded-xl border flex items-center gap-4">
      {flavor.image && (
        <img src={flavor.image} alt={flavor.name} className="w-16 h-16 rounded-lg object-cover" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold">{flavor.name}</h3>
          <Badge variant={flavor.category === 'premium' ? 'default' : 'outline'} className="text-xs">
            {flavor.category === 'premium' ? '⭐ Premium' : '🍕 Tradicional'}
          </Badge>
          {flavor.is_popular && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
        </div>
        <p className="text-sm text-gray-600">{flavor.description}</p>
        {flavor.prep_time && (
          <p className="text-xs text-gray-500 mt-1">⏱️ {flavor.prep_time} min</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={flavor.is_active} onCheckedChange={onToggleActive} />
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function SizeModal({ isOpen, onClose, onSubmit, size }) {
  const [formData, setFormData] = useState({
    name: '',
    slices: '',
    max_flavors: '',
    diameter_cm: '',
    price_tradicional: '',
    price_premium: '',
    is_active: true
  });

  React.useEffect(() => {
    if (size) {
      setFormData({
        name: size.name || '',
        slices: size.slices?.toString() || '',
        max_flavors: size.max_flavors?.toString() || '',
        diameter_cm: size.diameter_cm?.toString() || '',
        price_tradicional: size.price_tradicional?.toString() || '',
        price_premium: size.price_premium?.toString() || '',
        is_active: size.is_active !== false
      });
    } else {
      setFormData({
        name: '', slices: '', max_flavors: '', diameter_cm: '',
        price_tradicional: '', price_premium: '', is_active: true
      });
    }
  }, [size, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      slices: parseInt(formData.slices),
      max_flavors: parseInt(formData.max_flavors),
      diameter_cm: parseFloat(formData.diameter_cm),
      price_tradicional: parseFloat(formData.price_tradicional),
      price_premium: parseFloat(formData.price_premium)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{size ? 'Editar' : 'Novo'} Tamanho</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Pequena, Média, Grande"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fatias *</Label>
              <Input
                type="number"
                value={formData.slices}
                onChange={(e) => setFormData(prev => ({ ...prev, slices: e.target.value }))}
                placeholder="Ex: 4"
                required
              />
            </div>
            <div>
              <Label>Máx. Sabores *</Label>
              <Input
                type="number"
                value={formData.max_flavors}
                onChange={(e) => setFormData(prev => ({ ...prev, max_flavors: e.target.value }))}
                placeholder="Ex: 2"
                required
              />
            </div>
          </div>
          <div>
            <Label>Diâmetro (cm)</Label>
            <Input
              type="number"
              value={formData.diameter_cm}
              onChange={(e) => setFormData(prev => ({ ...prev, diameter_cm: e.target.value }))}
              placeholder="Ex: 35"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço Tradicional *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_tradicional}
                onChange={(e) => setFormData(prev => ({ ...prev, price_tradicional: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>Preço Premium *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_premium}
                onChange={(e) => setFormData(prev => ({ ...prev, price_premium: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FlavorModal({ isOpen, onClose, onSubmit, flavor }) {
  const [formData, setFormData] = useState({
    name: '', description: '', image: '', category: 'tradicional',
    prep_time: '', is_active: true, is_popular: false
  });

  React.useEffect(() => {
    if (flavor) {
      setFormData({
        name: flavor.name || '',
        description: flavor.description || '',
        image: flavor.image || '',
        category: flavor.category || 'tradicional',
        prep_time: flavor.prep_time?.toString() || '',
        is_active: flavor.is_active !== false,
        is_popular: flavor.is_popular || false
      });
    } else {
      setFormData({
        name: '', description: '', image: '', category: 'tradicional',
        prep_time: '', is_active: true, is_popular: false
      });
    }
  }, [flavor, isOpen]);

  const handleImageUpload = async (e) => {
    console.log('🖼️ [PizzaConfigTab] handleImageUpload chamado:', {
      event: e,
      target: e.target,
      files: e.target.files,
      filesLength: e.target.files?.length
    });

    const file = e.target.files?.[0];
    
    console.log('🖼️ [PizzaConfigTab] Arquivo extraído:', {
      file,
      isFile: file instanceof File,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      console.error('❌ [PizzaConfigTab] Nenhum arquivo encontrado no evento');
      alert('Nenhum arquivo selecionado');
      return;
    }

    if (!(file instanceof File)) {
      console.error('❌ [PizzaConfigTab] Arquivo não é instância de File:', typeof file);
      alert('Arquivo inválido');
      return;
    }

    try {
      console.log('📤 [PizzaConfigTab] Iniciando upload...');
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'pizza-config');
      console.log('✅ [PizzaConfigTab] Upload concluído, URL:', url);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('❌ [PizzaConfigTab] Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem: ' + error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      prep_time: formData.prep_time ? parseInt(formData.prep_time) : null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{flavor ? 'Editar' : 'Novo'} Sabor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Calabresa, Marguerita"
              required
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ingredientes do sabor..."
              rows={2}
            />
          </div>
          <div>
            <Label>Categoria *</Label>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: 'tradicional' }))}
                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  formData.category === 'tradicional'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                🍕 Tradicional
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: 'premium' }))}
                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  formData.category === 'premium'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                ⭐ Premium
              </button>
            </div>
          </div>
          <div>
            <Label>Tempo de Preparo (min)</Label>
            <Input
              type="number"
              value={formData.prep_time}
              onChange={(e) => setFormData(prev => ({ ...prev, prep_time: e.target.value }))}
              placeholder="Ex: 20"
            />
          </div>
          <div>
            <Label>Imagem</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {formData.image && (
              <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <Switch
                checked={formData.is_popular}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
              />
              <span className="text-sm">⭐ Popular</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EdgeModal({ isOpen, onClose, onSubmit, edge }) {
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', image: '', is_active: true, is_popular: false
  });

  React.useEffect(() => {
    if (edge) {
      setFormData({
        name: edge.name || '',
        description: edge.description || '',
        price: edge.price?.toString() || '',
        image: edge.image || '',
        is_active: edge.is_active !== false,
        is_popular: edge.is_popular || false
      });
    } else {
      setFormData({
        name: '', description: '', price: '', image: '', is_active: true, is_popular: false
      });
    }
  }, [edge, isOpen]);

  const handleImageUpload = async (e) => {
    console.log('🖼️ [PizzaConfigTab] handleImageUpload chamado:', {
      event: e,
      target: e.target,
      files: e.target.files,
      filesLength: e.target.files?.length
    });

    const file = e.target.files?.[0];
    
    console.log('🖼️ [PizzaConfigTab] Arquivo extraído:', {
      file,
      isFile: file instanceof File,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      console.error('❌ [PizzaConfigTab] Nenhum arquivo encontrado no evento');
      alert('Nenhum arquivo selecionado');
      return;
    }

    if (!(file instanceof File)) {
      console.error('❌ [PizzaConfigTab] Arquivo não é instância de File:', typeof file);
      alert('Arquivo inválido');
      return;
    }

    try {
      console.log('📤 [PizzaConfigTab] Iniciando upload...');
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'pizza-config');
      console.log('✅ [PizzaConfigTab] Upload concluído, URL:', url);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('❌ [PizzaConfigTab] Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem: ' + error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{edge ? 'Editar' : 'Nova'} Borda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Catupiry, Cheddar"
              required
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição da borda..."
              rows={2}
            />
          </div>
          <div>
            <Label>Preço *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label>Imagem</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {formData.image && (
              <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExtraModal({ isOpen, onClose, onSubmit, extra }) {
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', image: '', is_active: true
  });

  React.useEffect(() => {
    if (extra) {
      setFormData({
        name: extra.name || '',
        description: extra.description || '',
        price: extra.price?.toString() || '',
        image: extra.image || '',
        is_active: extra.is_active !== false
      });
    } else {
      setFormData({
        name: '', description: '', price: '', image: '', is_active: true
      });
    }
  }, [extra, isOpen]);

  const handleImageUpload = async (e) => {
    console.log('🖼️ [PizzaConfigTab] handleImageUpload chamado:', {
      event: e,
      target: e.target,
      files: e.target.files,
      filesLength: e.target.files?.length
    });

    const file = e.target.files?.[0];
    
    console.log('🖼️ [PizzaConfigTab] Arquivo extraído:', {
      file,
      isFile: file instanceof File,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      console.error('❌ [PizzaConfigTab] Nenhum arquivo encontrado no evento');
      alert('Nenhum arquivo selecionado');
      return;
    }

    if (!(file instanceof File)) {
      console.error('❌ [PizzaConfigTab] Arquivo não é instância de File:', typeof file);
      alert('Arquivo inválido');
      return;
    }

    try {
      console.log('📤 [PizzaConfigTab] Iniciando upload...');
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'pizza-config');
      console.log('✅ [PizzaConfigTab] Upload concluído, URL:', url);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('❌ [PizzaConfigTab] Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem: ' + error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{extra ? 'Editar' : 'Novo'} Extra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Azeitonas, Bacon"
              required
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do extra..."
              rows={2}
            />
          </div>
          <div>
            <Label>Preço *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label>Imagem</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {formData.image && (
              <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}