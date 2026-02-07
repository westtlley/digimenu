import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Sparkles, AlertCircle, Info, Copy } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function PizzaForm({ isOpen, onClose, onSubmit, pizza = null, categoryId }) {
  const [activeTab, setActiveTab] = useState('info');
  const [errors, setErrors] = useState({});
  const [flavors, setFlavors] = useState([]);
  const [flavorCategories, setFlavorCategories] = useState([]);
  const [loadingFlavors, setLoadingFlavors] = useState(false);
  
  const getInitialFormData = () => ({
    name: pizza?.name || '',
    description: pizza?.description || '',
    image: pizza?.image || '',
    category_id: pizza?.category_id || categoryId,
    product_type: 'pizza',
    prep_time: pizza?.prep_time || 30,
    is_active: pizza?.is_active !== false,
    is_highlight: pizza?.is_highlight || false,
    pizza_config: pizza?.pizza_config || {
      sizes: [
        { id: '1', name: 'Pequena', slices: 4, max_flavors: 1, price_tradicional: 0, price_premium: 0 },
        { id: '2', name: 'Média', slices: 6, max_flavors: 2, price_tradicional: 0, price_premium: 0 },
        { id: '3', name: 'Grande', slices: 8, max_flavors: 2, price_tradicional: 0, price_premium: 0 }
      ],
      flavor_ids: [],
      edges: [],
      extras: [],
      popular_combinations: []
    }
  });
  
  const [formData, setFormData] = useState(getInitialFormData());
  
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
      setActiveTab('info');
      loadFlavorsAndCategories();
    }
  }, [isOpen, pizza, categoryId]);

  const loadFlavorsAndCategories = async () => {
    setLoadingFlavors(true);
    try {
      const [flavorsData, categoriesData] = await Promise.all([
        base44.entities.Flavor.list(),
        base44.entities.FlavorCategory.list('order')
      ]);
      
      setFlavors(flavorsData.filter(f => f.is_active !== false));
      setFlavorCategories(categoriesData.filter(c => c.is_active !== false));
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setLoadingFlavors(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.pizza_config?.sizes || formData.pizza_config.sizes.length === 0) {
      newErrors.sizes = 'Adicione pelo menos um tamanho';
    } else {
      formData.pizza_config.sizes.forEach((size, idx) => {
        if (!size.name?.trim()) {
          newErrors[`size_${idx}_name`] = 'Nome do tamanho é obrigatório';
        }
        if (!size.price_tradicional || size.price_tradicional <= 0) {
          newErrors[`size_${idx}_price_tradicional`] = 'Preço tradicional obrigatório';
        }
        if (!size.price_premium || size.price_premium <= 0) {
          newErrors[`size_${idx}_price_premium`] = 'Preço premium obrigatório';
        }
      });
    }
    
    if (!formData.pizza_config?.flavor_ids || formData.pizza_config.flavor_ids.length === 0) {
      newErrors.flavors = 'Selecione pelo menos um sabor';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Corrija os erros antes de continuar');
      return;
    }
    
    const minPrice = Math.min(...formData.pizza_config.sizes.map(s => s.price_tradicional));
    
    onSubmit({
      ...formData,
      price: minPrice,
      pizza_config: {
        sizes: formData.pizza_config.sizes,
        flavor_ids: formData.pizza_config.flavor_ids,
        edges: formData.pizza_config.edges.filter(e => e.name?.trim()),
        extras: formData.pizza_config.extras.filter(e => e.name?.trim()),
        popular_combinations: formData.pizza_config.popular_combinations || []
      }
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
        const url = await uploadToCloudinary(file, 'dishes');
        setFormData(prev => ({ ...prev, image: url }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        toast.error('Erro ao fazer upload da imagem');
      }
    }
  };

  // Sizes
  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        sizes: [...prev.pizza_config.sizes, {
          id: Date.now().toString(),
          name: '',
          slices: 8,
          max_flavors: 1,
          price_tradicional: 0,
          price_premium: 0
        }]
      }
    }));
  };

  const updateSize = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        sizes: prev.pizza_config.sizes.map(s => 
          s.id === id ? { ...s, [field]: value } : s
        )
      }
    }));
  };

  const removeSize = (id) => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        sizes: prev.pizza_config.sizes.filter(s => s.id !== id)
      }
    }));
  };

  const onDragEndSizes = (result) => {
    if (!result.destination) return;
    const items = Array.from(formData.pizza_config.sizes);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setFormData(prev => ({
      ...prev,
      pizza_config: { ...prev.pizza_config, sizes: items }
    }));
  };

  // Flavors
  const toggleFlavor = (flavorId) => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        flavor_ids: prev.pizza_config.flavor_ids.includes(flavorId)
          ? prev.pizza_config.flavor_ids.filter(id => id !== flavorId)
          : [...prev.pizza_config.flavor_ids, flavorId]
      }
    }));
  };

  // Edges
  const addEdge = () => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        edges: [...prev.pizza_config.edges, {
          id: Date.now().toString(),
          name: '',
          price: 0,
          cost: 0,
          is_active: true,
          is_popular: false
        }]
      }
    }));
  };

  const updateEdge = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        edges: prev.pizza_config.edges.map(e => 
          e.id === id ? { ...e, [field]: value } : e
        )
      }
    }));
  };

  const removeEdge = (id) => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        edges: prev.pizza_config.edges.filter(e => e.id !== id)
      }
    }));
  };

  const onDragEndEdges = (result) => {
    if (!result.destination) return;
    const items = Array.from(formData.pizza_config.edges);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setFormData(prev => ({
      ...prev,
      pizza_config: { ...prev.pizza_config, edges: items }
    }));
  };

  // Extras
  const addExtra = () => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        extras: [...prev.pizza_config.extras, {
          id: Date.now().toString(),
          name: '',
          price: 0,
          cost: 0,
          is_active: true,
          is_popular: false
        }]
      }
    }));
  };

  const updateExtra = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        extras: prev.pizza_config.extras.map(e => 
          e.id === id ? { ...e, [field]: value } : e
        )
      }
    }));
  };

  const removeExtra = (id) => {
    setFormData(prev => ({
      ...prev,
      pizza_config: {
        ...prev.pizza_config,
        extras: prev.pizza_config.extras.filter(e => e.id !== id)
      }
    }));
  };

  const onDragEndExtras = (result) => {
    if (!result.destination) return;
    const items = Array.from(formData.pizza_config.extras);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setFormData(prev => ({
      ...prev,
      pizza_config: { ...prev.pizza_config, extras: items }
    }));
  };

  const flavorsByCategory = flavorCategories.reduce((acc, cat) => {
    acc[cat.slug] = flavors.filter(f => f.category === cat.slug);
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="large" className="sm:max-w-6xl max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🍕 {pizza ? 'Editar Pizza' : 'Montar Nova Pizza'}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b overflow-x-auto pb-2">
          {[
            { id: 'info', label: 'Informações' },
            { id: 'sizes', label: 'Tamanhos', count: formData.pizza_config?.sizes?.length || 0 },
            { id: 'flavors', label: 'Sabores', count: formData.pizza_config?.flavor_ids?.length || 0 },
            { id: 'extras', label: 'Bordas & Extras', count: (formData.pizza_config?.edges?.length || 0) + (formData.pizza_config?.extras?.length || 0) }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg ${
                activeTab === tab.id 
                  ? 'bg-orange-500 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <TooltipProvider>
            {/* Tab: Informações */}
            {activeTab === 'info' && (
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Pizza *</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Pizza Calabresa"
                    />
                  </div>
                  <div>
                    <Label>Tempo de Preparo (min)</Label>
                    <Input 
                      type="number"
                      value={formData.prep_time} 
                      onChange={(e) => setFormData(prev => ({ ...prev, prep_time: e.target.value }))} 
                    />
                  </div>
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Imagem da Pizza</Label>
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
                  {formData.image && <img src={formData.image} alt="" className="mt-2 w-32 h-32 object-cover rounded" />}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_active} 
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} 
                    />
                    <span className="text-sm">Ativa</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch 
                      checked={formData.is_highlight} 
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_highlight: checked }))} 
                    />
                    <span className="text-sm">Destaque</span>
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Tamanhos */}
            {activeTab === 'sizes' && (
              <div className="space-y-4">
                <Button type="button" onClick={addSize} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Tamanho
                </Button>
                
                <DragDropContext onDragEnd={onDragEndSizes}>
                  <Droppable droppableId="sizes">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {formData.pizza_config.sizes.map((size, idx) => (
                          <Draggable key={size.id} draggableId={size.id} index={idx}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="bg-white border-2 p-4 rounded-lg"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <h4 className="font-medium flex-1">Tamanho #{idx + 1}</h4>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSize(size.id)}>
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3 ml-8">
                                  <div>
                                    <Label className="text-xs">Nome *</Label>
                                    <Input 
                                      value={size.name} 
                                      onChange={(e) => updateSize(size.id, 'name', e.target.value)} 
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Fatias</Label>
                                    <Input 
                                      type="number"
                                      value={size.slices} 
                                      onChange={(e) => updateSize(size.id, 'slices', e.target.value)} 
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Máx. Sabores</Label>
                                    <Input 
                                      type="number"
                                      value={size.max_flavors} 
                                      onChange={(e) => updateSize(size.id, 'max_flavors', e.target.value)} 
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Preço Tradicional *</Label>
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={size.price_tradicional} 
                                      onChange={(e) => updateSize(size.id, 'price_tradicional', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Preço Premium *</Label>
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={size.price_premium} 
                                      onChange={(e) => updateSize(size.id, 'price_premium', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            {/* Tab: Sabores */}
            {activeTab === 'flavors' && (
              <div className="space-y-4">
                {loadingFlavors ? (
                  <div className="text-center py-8">Carregando sabores...</div>
                ) : flavors.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">Nenhum sabor cadastrado</p>
                  </div>
                ) : (
                  <>
                    {flavorCategories.map((cat) => {
                      const categoryFlavors = flavorsByCategory[cat.slug] || [];
                      if (categoryFlavors.length === 0) return null;
                      
                      return (
                        <div key={cat.slug}>
                          <h4 className="font-semibold mb-3">{cat.name} ({categoryFlavors.length})</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryFlavors.map((flavor) => (
                              <button
                                key={flavor.id}
                                type="button"
                                onClick={() => toggleFlavor(flavor.id)}
                                className={`p-3 rounded-lg border-2 text-left ${
                                  formData.pizza_config.flavor_ids.includes(flavor.id)
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-orange-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    formData.pizza_config.flavor_ids.includes(flavor.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                                  }`}>
                                    {formData.pizza_config.flavor_ids.includes(flavor.id) && <span className="text-white text-xs">✓</span>}
                                  </div>
                                  <span className="font-medium text-sm">{flavor.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Tab: Extras */}
            {activeTab === 'extras' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-3">
                    <h4 className="font-semibold">Bordas</h4>
                    <Button type="button" onClick={addEdge} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  
                  <DragDropContext onDragEnd={onDragEndEdges}>
                    <Droppable droppableId="edges">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {formData.pizza_config.edges.map((edge, idx) => (
                            <Draggable key={edge.id} draggableId={edge.id} index={idx}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="bg-gray-50 p-3 rounded-lg flex items-center gap-2"
                                >
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <Input value={edge.name} onChange={(e) => updateEdge(edge.id, 'name', e.target.value)} placeholder="Nome" className="flex-1" />
                                  <Input type="number" step="0.01" value={edge.price} onChange={(e) => updateEdge(edge.id, 'price', e.target.value)} placeholder="Preço" className="w-24" />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeEdge(edge.id)}>
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <h4 className="font-semibold">Adicionais</h4>
                    <Button type="button" onClick={addExtra} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  
                  <DragDropContext onDragEnd={onDragEndExtras}>
                    <Droppable droppableId="extras">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {formData.pizza_config.extras.map((extra, idx) => (
                            <Draggable key={extra.id} draggableId={extra.id} index={idx}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="bg-gray-50 p-3 rounded-lg flex items-center gap-2"
                                >
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <Input value={extra.name} onChange={(e) => updateExtra(extra.id, 'name', e.target.value)} placeholder="Nome" className="flex-1" />
                                  <Input type="number" step="0.01" value={extra.price} onChange={(e) => updateExtra(extra.id, 'price', e.target.value)} placeholder="Preço" className="w-24" />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExtra(extra.id)}>
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
            )}
          </TooltipProvider>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="button" onClick={handleSubmit} className="flex-1 bg-orange-500">
            {pizza ? 'Salvar' : 'Criar Pizza'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}