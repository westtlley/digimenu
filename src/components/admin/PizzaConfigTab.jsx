import React, { useState, useMemo } from 'react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Star, Settings, Search } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import PizzaVisualizationSettings from './PizzaVisualizationSettings';
import MyPizzasTab from './MyPizzasTab';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function PizzaConfigTab() {
  const [user, setUser] = React.useState(null);
  const [activeTab, setActiveTab] = useState('pizzas');
  const [searchTerm, setSearchTerm] = useState('');
  
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
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="pizzas">Minhas Pizzas</TabsTrigger>
          <TabsTrigger value="visual"><Settings className="w-4 h-4 mr-1" />Visual</TabsTrigger>
        </TabsList>

        <TabsContent value="pizzas" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <MyPizzasTab />
            <Card className="p-4 h-fit">
              <h3 className="font-semibold mb-3">Configuração</h3>
              <p className="text-xs text-gray-500 mb-3">Tamanhos, sabores, bordas e extras</p>
              
              {/* Busca */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar sabores, bordas ou extras..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      // Detectar tipo baseado no contexto do accordion aberto
                    }}
                    className="pl-8 text-sm"
                  />
                </div>
              </div>

              <Accordion type="multiple" defaultValue={['sizes','flavors']} className="w-full">
                <AccordionItem value="sizes" className="border rounded-lg px-2">
                  <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                    Tamanhos ({sizes.length})
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <Button size="sm" onClick={() => { setEditingSize(null); setShowSizeModal(true); }} className="mb-2 w-full"><Plus className="w-3 h-3 mr-1" />Novo</Button>
                    <div className="space-y-1">
                      {sizes.map(s => (
                        <div key={s.id} className="flex items-center gap-2 p-2 rounded border text-xs">
                          <span className="flex-1 truncate">{s.name} • {s.slices}f • {formatCurrency(s.price_tradicional)}</span>
                          <Switch checked={s.is_active} onCheckedChange={(c)=>updateSizeMutation.mutate({id:s.id,data:{...s,is_active:c}})} className="scale-75" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{ setEditingSize(s); setShowSizeModal(true); }}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={()=>{ if(confirm('Excluir?')) deleteSizeMutation.mutate(s.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="flavors" className="border rounded-lg px-2">
                  <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                    Sabores ({flavors.length})
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <Button size="sm" onClick={() => { setEditingFlavor(null); setShowFlavorModal(true); }} className="mb-2 w-full"><Plus className="w-3 h-3 mr-1" />Novo</Button>
                    <div className="space-y-1">
                      {flavors.map(f => (
                        <div key={f.id} className="flex items-center gap-2 p-2 rounded border text-xs">
                          {f.image && <img src={f.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                          <span className="flex-1 truncate">{f.name}</span>
                          <Badge variant="outline" className="text-[10px]">{f.category==='premium'?'⭐':'🍕'}</Badge>
                          <Switch checked={f.is_active} onCheckedChange={(c)=>updateFlavorMutation.mutate({id:f.id,data:{...f,is_active:c}})} className="scale-75" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{ setEditingFlavor(f); setShowFlavorModal(true); }}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={()=>{ if(confirm('Excluir?')) deleteFlavorMutation.mutate(f.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="edges" className="border rounded-lg px-2">
                  <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                    Bordas ({edges.length})
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <Button size="sm" onClick={() => { setEditingEdge(null); setShowEdgeModal(true); }} className="mb-2 w-full"><Plus className="w-3 h-3 mr-1" />Nova</Button>
                    <div className="space-y-1">
                      {edges.map(e => (
                        <div key={e.id} className="flex items-center gap-2 p-2 rounded border text-xs">
                          {e.image && <img src={e.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                          <span className="flex-1 truncate">{e.name} {formatCurrency(e.price)}</span>
                          <Switch checked={e.is_active} onCheckedChange={(c)=>updateEdgeMutation.mutate({id:e.id,data:{...e,is_active:c}})} className="scale-75" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{ setEditingEdge(e); setShowEdgeModal(true); }}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={()=>{ if(confirm('Excluir?')) deleteEdgeMutation.mutate(e.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="extras" className="border rounded-lg px-2">
                  <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                    Extras ({extras.length})
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <Button size="sm" onClick={() => { setEditingExtra(null); setShowExtraModal(true); }} className="mb-2 w-full"><Plus className="w-3 h-3 mr-1" />Novo</Button>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {(searchTerm && searchType === 'extras' ? filteredExtras : extras).map(x => (
                        <div key={x.id} className="flex items-center gap-2 p-2 rounded border text-xs">
                          {x.image && <img src={x.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                          <span className="flex-1 truncate">{x.name} {formatCurrency(x.price)}</span>
                          <Switch checked={x.is_active} onCheckedChange={(c)=>updateExtraMutation.mutate({id:x.id,data:{...x,is_active:c}})} className="scale-75" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{ setEditingExtra(x); setShowExtraModal(true); }}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={()=>{ if(confirm('Excluir?')) deleteExtraMutation.mutate(x.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visual" className="mt-4">
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

function SizeModal({ isOpen, onClose, onSubmit, size }) {
  const [formData, setFormData] = useState({
    name: '',
    slices: '',
    max_flavors: '',
    max_extras: '3',
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
        max_extras: size.max_extras?.toString() || '3',
        diameter_cm: size.diameter_cm?.toString() || '',
        price_tradicional: size.price_tradicional?.toString() || '',
        price_premium: size.price_premium?.toString() || '',
        is_active: size.is_active !== false
      });
    } else {
      setFormData({
        name: '', slices: '', max_flavors: '', max_extras: '3', diameter_cm: '',
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
      max_extras: parseInt(formData.max_extras) || 3,
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
              <Label>Máx. Sabores (1-4) *</Label>
              <Input
                type="number"
                min={1}
                max={4}
                value={formData.max_flavors}
                onChange={(e) => setFormData(prev => ({ ...prev, max_flavors: e.target.value }))}
                placeholder="Ex: 2"
                required
              />
            </div>
          </div>
          <div>
            <Label>Máx. Extras</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={formData.max_extras}
              onChange={(e) => setFormData(prev => ({ ...prev, max_extras: e.target.value }))}
              placeholder="Ex: 3"
            />
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