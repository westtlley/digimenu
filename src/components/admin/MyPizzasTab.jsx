import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Star, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function MyPizzasTab() {
  const [user, setUser] = useState(null);
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [editingPizza, setEditingPizza] = useState(null);
  
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

  // Queries
  const { data: pizzas = [] } = useQuery({
    queryKey: ['pizzas'],
    queryFn: async () => {
      const dishes = await base44.entities.Dish.list();
      return dishes.filter(d => d.product_type === 'pizza');
    },
  });

  const { data: sizes = [] } = useQuery({
    queryKey: ['pizzaSizes'],
    queryFn: () => base44.entities.PizzaSize.list('order'),
  });

  const { data: flavors = [] } = useQuery({
    queryKey: ['pizzaFlavors'],
    queryFn: () => base44.entities.PizzaFlavor.list('order'),
  });

  const { data: edges = [] } = useQuery({
    queryKey: ['pizzaEdges'],
    queryFn: () => base44.entities.PizzaEdge.list('order'),
  });

  const { data: extras = [] } = useQuery({
    queryKey: ['pizzaExtras'],
    queryFn: () => base44.entities.PizzaExtra.list('order'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('order'),
  });

  // Mutations
  const createPizzaMutation = useMutation({
    mutationFn: (data) => base44.entities.Dish.create({
      ...data,
      product_type: 'pizza',
      subscriber_email: user?.subscriber_email || user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Pizza criada!');
      setShowPizzaModal(false);
      setEditingPizza(null);
    },
  });

  const updatePizzaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Dish.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Pizza atualizada!');
      setShowPizzaModal(false);
      setEditingPizza(null);
    },
  });

  const deletePizzaMutation = useMutation({
    mutationFn: (id) => base44.entities.Dish.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Pizza excluída!');
    },
  });

  // Verificar se tem os pré-requisitos
  const canCreatePizza = sizes.length > 0 && flavors.length > 0;

  const openPizzaModal = (pizza = null) => {
    if (pizza) {
      setEditingPizza(pizza);
    } else {
      setEditingPizza(null);
    }
    setShowPizzaModal(true);
  };

  return (
    <div className="space-y-4">
      {!canCreatePizza && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-900">Configure os itens necessários primeiro</p>
            <p className="text-sm text-orange-700 mt-1">
              Para criar pizzas, você precisa cadastrar pelo menos:
            </p>
            <ul className="text-sm text-orange-700 mt-2 space-y-1">
              {sizes.length === 0 && <li>• 1 Tamanho na aba "Tamanhos"</li>}
              {flavors.length === 0 && <li>• 1 Sabor na aba "Sabores"</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Minhas Pizzas</h3>
          <p className="text-sm text-gray-600">Gerencie as pizzas do seu cardápio</p>
        </div>
        <Button 
          onClick={() => openPizzaModal()} 
          className="bg-orange-500"
          disabled={!canCreatePizza}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Pizza
        </Button>
      </div>

      <div className="grid gap-4">
        {pizzas.map(pizza => (
          <div key={pizza.id} className="bg-white p-4 rounded-xl border">
            <div className="flex items-start gap-4">
              {pizza.image && (
                <img src={pizza.image} alt={pizza.name} className="w-24 h-24 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{pizza.name}</h3>
                    {pizza.description && (
                      <p className="text-sm text-gray-600 mt-1">{pizza.description}</p>
                    )}
                    {pizza.pizza_config?.sizes && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pizza.pizza_config.sizes.map(size => (
                          <Badge key={size.id} variant="outline" className="text-xs">
                            {size.name}: {formatCurrency(size.price_tradicional)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {pizza.is_highlight && <Badge className="mt-2 bg-yellow-100 text-yellow-700">⭐ Destaque</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pizza.is_active !== false}
                      onCheckedChange={(checked) => 
                        updatePizzaMutation.mutate({ id: pizza.id, data: { is_active: checked } })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openPizzaModal(pizza)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Excluir esta pizza?')) {
                          deletePizzaMutation.mutate(pizza.id);
                        }
                      }}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {pizzas.length === 0 && canCreatePizza && (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhuma pizza cadastrada ainda</p>
            <p className="text-sm mt-1">Clique em "Nova Pizza" para começar</p>
          </div>
        )}
      </div>

      {/* Modal de Pizza */}
      <PizzaModal
        isOpen={showPizzaModal}
        onClose={() => {
          setShowPizzaModal(false);
          setEditingPizza(null);
        }}
        onSubmit={(data) => {
          if (editingPizza) {
            updatePizzaMutation.mutate({ id: editingPizza.id, data });
          } else {
            createPizzaMutation.mutate(data);
          }
        }}
        pizza={editingPizza}
        sizes={sizes}
        flavors={flavors}
        edges={edges}
        extras={extras}
        categories={categories}
      />
    </div>
  );
}

function PizzaModal({ isOpen, onClose, onSubmit, pizza, sizes, flavors, edges, extras, categories }) {
  const [selectedDefaultFlavor, setSelectedDefaultFlavor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    category_id: '',
    default_flavor_id: '',
    division_mode: 'slices',
    is_highlight: false,
    is_active: true,
    is_new: false,
    is_popular: false,
    pizza_config: {
      sizes: [],
      flavor_ids: [],
      edges: [],
      extras: []
    }
  });

  React.useEffect(() => {
    if (pizza) {
      const defaultFlavor = flavors.find(f => f.id === pizza.default_flavor_id);
      setSelectedDefaultFlavor(defaultFlavor);
      
      setFormData({
        name: pizza.name || '',
        description: pizza.description || '',
        image: pizza.image || '',
        category_id: pizza.category_id || '',
        default_flavor_id: pizza.default_flavor_id || '',
        division_mode: pizza.division_mode || 'slices',
        is_highlight: pizza.is_highlight || false,
        is_active: pizza.is_active !== false,
        is_new: pizza.is_new || false,
        is_popular: pizza.is_popular || false,
        pizza_config: pizza.pizza_config || {
          sizes: [],
          flavor_ids: [],
          edges: [],
          extras: []
        }
      });
    } else {
      setSelectedDefaultFlavor(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        category_id: categories[0]?.id || '',
        default_flavor_id: '',
        division_mode: 'slices',
        is_highlight: false,
        is_active: true,
        is_new: false,
        is_popular: false,
        pizza_config: {
          sizes: sizes.map(s => ({
            id: s.id,
            name: s.name,
            slices: s.slices,
            max_flavors: s.max_flavors,
            price_tradicional: s.price_tradicional,
            price_premium: s.price_premium
          })),
          flavor_ids: flavors.filter(f => f.is_active !== false).map(f => f.id),
          edges: edges.filter(e => e.is_active !== false).map(e => ({
            id: e.id,
            name: e.name,
            price: e.price,
            is_active: e.is_active,
            is_popular: e.is_popular
          })),
          extras: extras.filter(e => e.is_active !== false).map(e => ({
            id: e.id,
            name: e.name,
            price: e.price,
            is_active: e.is_active
          }))
        }
      });
    }
  }, [pizza, isOpen, sizes, flavors, edges, extras, categories]);

  const handleDefaultFlavorSelect = (flavor) => {
    setSelectedDefaultFlavor(flavor);
    setFormData(prev => ({
      ...prev,
      name: `Pizza ${flavor.name}`,
      default_flavor_id: flavor.id,
      image: flavor.image || prev.image,
      description: flavor.description || prev.description
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image: file_url }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedDefaultFlavor && !pizza) {
      toast.error('Selecione o sabor base da pizza');
      return;
    }

    if (!formData.pizza_config.sizes || formData.pizza_config.sizes.length === 0) {
      toast.error('Selecione pelo menos um tamanho');
      return;
    }

    if (!formData.pizza_config.flavor_ids || formData.pizza_config.flavor_ids.length === 0) {
      toast.error('Selecione pelo menos um sabor');
      return;
    }

    onSubmit(formData);
  };

  const toggleSize = (size) => {
    const currentSizes = formData.pizza_config.sizes || [];
    const exists = currentSizes.find(s => s.id === size.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          sizes: currentSizes.filter(s => s.id !== size.id)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          sizes: [...currentSizes, {
            id: size.id,
            name: size.name,
            slices: size.slices,
            max_flavors: size.max_flavors,
            price_tradicional: size.price_tradicional,
            price_premium: size.price_premium
          }]
        }
      }));
    }
  };

  const toggleFlavor = (flavorId) => {
    const currentFlavors = formData.pizza_config.flavor_ids || [];
    
    if (currentFlavors.includes(flavorId)) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          flavor_ids: currentFlavors.filter(id => id !== flavorId)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          flavor_ids: [...currentFlavors, flavorId]
        }
      }));
    }
  };

  const toggleEdge = (edge) => {
    const currentEdges = formData.pizza_config.edges || [];
    const exists = currentEdges.find(e => e.id === edge.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          edges: currentEdges.filter(e => e.id !== edge.id)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          edges: [...currentEdges, {
            id: edge.id,
            name: edge.name,
            price: edge.price,
            is_active: edge.is_active,
            is_popular: edge.is_popular
          }]
        }
      }));
    }
  };

  const toggleExtra = (extra) => {
    const currentExtras = formData.pizza_config.extras || [];
    const exists = currentExtras.find(e => e.id === extra.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          extras: currentExtras.filter(e => e.id !== extra.id)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          extras: [...currentExtras, {
            id: extra.id,
            name: extra.name,
            price: extra.price,
            is_active: extra.is_active
          }]
        }
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pizza ? 'Editar' : 'Nova'} Pizza</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sabor Base */}
            {!pizza && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1">Sabor Padrão da Pizza *</h4>
                  <p className="text-xs text-gray-600 mb-3">Escolha qual sabor será o base desta pizza</p>
                </div>
                
                <div className="space-y-3">
                  <h5 className="font-medium text-sm">🍕 Tradicionais</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {flavors.filter(f => f.category === 'tradicional' && f.is_active).map(flavor => (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => handleDefaultFlavorSelect(flavor)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDefaultFlavor?.id === flavor.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {flavor.image && (
                            <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{flavor.name}</p>
                            {selectedDefaultFlavor?.id === flavor.id && (
                              <Badge className="text-xs mt-1 bg-orange-500">Selecionado</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-sm">⭐ Premium</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {flavors.filter(f => f.category === 'premium' && f.is_active).map(flavor => (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => handleDefaultFlavorSelect(flavor)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDefaultFlavor?.id === flavor.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {flavor.image && (
                            <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{flavor.name}</p>
                            {selectedDefaultFlavor?.id === flavor.id && (
                              <Badge className="text-xs mt-1 bg-orange-500">Selecionado</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Informações Básicas */}
            {selectedDefaultFlavor && (
              <div className="space-y-4">
                <h4 className="font-semibold">Informações da Pizza</h4>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    ✓ Sabor base: <strong>{selectedDefaultFlavor.name}</strong>
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria *</Label>
                    <Select 
                      value={formData.category_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Modo de Divisão *</Label>
                    <Select 
                      value={formData.division_mode} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, division_mode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slices">
                          🔧 Por Fatias (Livre)
                        </SelectItem>
                        <SelectItem value="exact">
                          ⚖️ Divisão Exata (Automática)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.division_mode === 'slices' 
                        ? 'Cliente escolhe quantas fatias de cada sabor'
                        : 'Divisão automática igual entre sabores'
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Personalize a descrição..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Imagem (opcional)</Label>
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
                  {formData.image && (
                    <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Se não enviar, será usada a imagem do sabor base
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <Label>⭐ Destaque</Label>
                    <Switch
                      checked={formData.is_highlight}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_highlight: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <Label>✨ Novo</Label>
                    <Switch
                      checked={formData.is_new}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <Label>🔥 Popular</Label>
                    <Switch
                      checked={formData.is_popular}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tamanhos */}
            <div className="space-y-3">
              <h4 className="font-semibold">Tamanhos Disponíveis *</h4>
              <div className="grid gap-2">
                {sizes.map(size => {
                  const isSelected = formData.pizza_config.sizes?.some(s => s.id === size.id);
                  return (
                    <label
                      key={size.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleSize(size)}
                    >
                      <div>
                        <p className="font-medium">{size.name}</p>
                        <p className="text-xs text-gray-600">
                          {size.slices} fatias • Até {size.max_flavors} sabores
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-green-600">{formatCurrency(size.price_tradicional)}</p>
                        <p className="text-orange-600">{formatCurrency(size.price_premium)}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sabores */}
            <div className="space-y-3">
              <h4 className="font-semibold">Sabores Disponíveis *</h4>
              <div className="grid grid-cols-2 gap-2">
                {flavors.map(flavor => {
                  const isSelected = formData.pizza_config.flavor_ids?.includes(flavor.id);
                  return (
                    <label
                      key={flavor.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleFlavor(flavor.id)}
                    >
                      {flavor.image && (
                        <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{flavor.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {flavor.category === 'premium' ? '⭐ Premium' : '🍕 Tradicional'}
                        </Badge>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bordas */}
            {edges.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Bordas Disponíveis (opcional)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {edges.map(edge => {
                    const isSelected = formData.pizza_config.edges?.some(e => e.id === edge.id);
                    return (
                      <label
                        key={edge.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleEdge(edge)}
                      >
                        <p className="font-medium text-sm">{edge.name}</p>
                        <p className="text-sm text-orange-600">{formatCurrency(edge.price)}</p>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extras */}
            {extras.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Extras Disponíveis (opcional)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {extras.map(extra => {
                    const isSelected = formData.pizza_config.extras?.some(e => e.id === extra.id);
                    return (
                      <label
                        key={extra.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleExtra(extra)}
                      >
                        <p className="font-medium text-sm">{extra.name}</p>
                        <p className="text-sm text-orange-600">{formatCurrency(extra.price)}</p>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500">
                {pizza ? 'Salvar' : 'Criar Pizza'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}