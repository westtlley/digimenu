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
import { Plus, Trash2, Pencil, Star, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from '../permissions/usePermission';
import { fetchAdminDishes } from '@/services/adminMenuService';
import { keepPreviousData } from '@tanstack/react-query';
import { buildTenantEntityOpts, getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const getPizzaEntryStartingPrice = (pizza) => {
  const sizePrices = Array.isArray(pizza?.pizza_config?.sizes)
    ? pizza.pizza_config.sizes.flatMap((size) => [
        Number(size?.price_tradicional || 0),
        Number(size?.price_premium || 0)
      ])
    : [];

  const safePrices = [...sizePrices, Number(pizza?.price || 0)].filter(
    (price) => Number.isFinite(price) && price > 0
  );

  return safePrices.length > 0 ? Math.min(...safePrices) : 0;
};

export default function MyPizzasTab() {
  const [user, setUser] = useState(null);
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [editingPizza, setEditingPizza] = useState(null);
  
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();

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

  const slug = menuContext?.type === 'slug' ? menuContext?.value : null;
  const subscriberContextEmail = menuContext?.type === 'subscriber' && menuContext?.value
    ? menuContext.value
    : null;
  // ✅ Para master (slug): buscar TUDO do cardápio público de uma vez (pizzas + complementos)
  const { data: publicCardapio } = useQuery({
    queryKey: ['publicCardapio', slug],
    queryFn: async () => {
      if (!slug) return null;
      return await apiClient.get(`/public/cardapio/${slug}`);
    },
    enabled: !!slug,
    staleTime: 30000,
    gcTime: 60000,
  });

  const tenantSubscriberEmail = slug && publicCardapio?.subscriber_email && publicCardapio.subscriber_email !== 'master'
    ? publicCardapio.subscriber_email
    : null;
  const tenantSubscriberId = slug && publicCardapio?.subscriber_id != null
    ? publicCardapio.subscriber_id
    : null;
  const scopedSubscriberEmail = subscriberContextEmail || tenantSubscriberEmail || null;
  const scopedSubscriberId = menuContext?.type === 'subscriber'
    ? menuContext.subscriber_id ?? null
    : tenantSubscriberId;
  const fallbackOwnerEmail = slug ? null : (user?.subscriber_email || user?.email || null);
  const entityOwnerEmail = scopedSubscriberEmail || fallbackOwnerEmail; // Compatibilidade transitória: o backend legado ainda persiste owner_email.
  const entityContextOpts = buildTenantEntityOpts({ subscriberId: scopedSubscriberId, subscriberEmail: scopedSubscriberEmail });

  // ✅ Admin API para pratos (com fallback interno); quando temos publicCardapio, usamos ele para exibir
  const { data: adminDishesRaw = [], refetch: refetchDishes, isLoading: dishesLoading } = useQuery({
    queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return await fetchAdminDishes(menuContext);
    },
    enabled: !!menuContext,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 60000,
  });
  
  React.useEffect(() => {
    if (menuContext && adminDishesRaw.length === 0 && !dishesLoading && !publicCardapio?.dishes?.length) {
      refetchDishes();
    }
  }, [menuContext?.type, menuContext?.value, menuContext?.subscriber_id]);
  
  // Fonte de pratos: público (slug) ou admin
  const dishesRaw = (slug && publicCardapio?.dishes) ? publicCardapio.dishes : (adminDishesRaw || []);
  const pizzas = (dishesRaw || []).filter(d => d.product_type === 'pizza');

  // ✅ Tamanhos: público (slug) ou admin
  const { data: adminSizes = [] } = useQuery({
    queryKey: ['pizzaSizes', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaSize.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const sizes = (slug && publicCardapio?.pizzaSizes?.length) ? publicCardapio.pizzaSizes : (adminSizes || []);

  // ✅ Sabores: público (slug) ou admin
  const { data: adminFlavors = [] } = useQuery({
    queryKey: ['pizzaFlavors', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaFlavor.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const flavors = (slug && publicCardapio?.pizzaFlavors?.length) ? publicCardapio.pizzaFlavors : (adminFlavors || []);

  // ✅ Bordas: público (slug) ou admin
  const { data: adminEdges = [] } = useQuery({
    queryKey: ['pizzaEdges', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaEdge.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const edges = (slug && publicCardapio?.pizzaEdges?.length) ? publicCardapio.pizzaEdges : (adminEdges || []);

  const { data: adminExtras = [] } = useQuery({
    queryKey: ['pizzaExtras', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: () => apiClient.entities.PizzaExtra.list('order', entityContextOpts),
    enabled: !!menuContext && !slug,
  });
  const extras = (slug && publicCardapio?.pizzaExtras?.length) ? publicCardapio.pizzaExtras : (adminExtras || []);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: () => apiClient.entities.Category.list('order', entityContextOpts),
    enabled: !!menuContext && !slug,
  });

  // ✅ Categorias de pizza: público (slug) ou admin
  const { data: adminPizzaCategories = [] } = useQuery({
    queryKey: ['pizzaCategories', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaCategory.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const pizzaCategories = (slug && publicCardapio?.pizzaCategories?.length) ? publicCardapio.pizzaCategories : (adminPizzaCategories || []);

  // Mutations
  const createPizzaMutation = useMutation({
    mutationFn: (data) => {
      return apiClient.entities.Dish.create({
        ...data,
        product_type: 'pizza',
        ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
        ...entityContextOpts
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Pizza criada!');
      setShowPizzaModal(false);
      setEditingPizza(null);
    },
  });

  const updatePizzaMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.Dish.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Pizza atualizada!');
      setShowPizzaModal(false);
      setEditingPizza(null);
    },
  });

  const deletePizzaMutation = useMutation({
    mutationFn: (id) => apiClient.entities.Dish.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
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
              {sizes.length === 0 && <li>• 1 Tamanho na seção Tamanhos (à direita)</li>}
              {flavors.length === 0 && <li>• 1 Sabor na seção Sabores (à direita)</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Entradas de montagem</h3>
          <p className="text-sm text-gray-600">Configure as entradas genericas do cardapio e use os sabores como repertorio do builder premium.</p>
        </div>
        <Button 
          onClick={() => openPizzaModal()} 
          className="bg-orange-500"
          disabled={!canCreatePizza}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova entrada
        </Button>
      </div>

      <div className="space-y-6">
        {pizzas.length > 0 && (() => {
          const grouped = {};
          const sortedCategories = [...(pizzaCategories || [])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          sortedCategories.forEach(c => { grouped[c.id] = { category: c, pizzas: [] }; });
          grouped['_sem_categoria'] = { category: { name: 'Sem categoria', id: '_sem_categoria' }, pizzas: [] };
          pizzas.forEach(p => {
            const key = p.pizza_category_id || '_sem_categoria';
            if (!grouped[key]) grouped[key] = { category: { name: 'Outros', id: key }, pizzas: [] };
            grouped[key].pizzas.push(p);
          });
          const ordered = sortedCategories.map(c => grouped[c.id]).filter(Boolean).concat(
            grouped['_sem_categoria'].pizzas.length > 0 ? [grouped['_sem_categoria']] : []
          );
          return ordered.map(({ category, pizzas: list }) => (
            <div key={category.id}>
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 rounded bg-orange-500" />
                {category.name}
                <Badge variant="secondary" className="text-xs">{list.length}</Badge>
              </h4>
              {category.id !== '_sem_categoria' && (
                <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/70 px-3 py-2 text-xs text-orange-900">
                  <p className="font-medium">Entrada publica: {category.name}</p>
                  <p className="mt-1 text-orange-800">
                    Esta categoria representa a entrada generica que aparece no cardapio e abre o builder premium.
                    {list.length > 1 ? ' O modelo recomendado e manter uma entrada principal por categoria.' : ''}
                  </p>
                </div>
              )}
              <div className="grid gap-4">
                {list.map(pizza => (
                  <div key={pizza.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                    <div className="flex items-start gap-4">
                      {pizza.image && (
                        <img src={pizza.image} alt={pizza.name} className="w-24 h-24 rounded-lg object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-lg">{pizza.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">Entrada comercial</Badge>
                              <Badge variant="outline" className="text-xs">
                                A partir de {formatCurrency(getPizzaEntryStartingPrice(pizza))}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pizza.pizza_config?.flavor_ids?.length || 0} sabores
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pizza.pizza_config?.edges?.length || 0} bordas
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pizza.pizza_config?.extras?.length || 0} extras
                              </Badge>
                            </div>
                            {pizza.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pizza.description}</p>
                            )}
                            {pizza.default_flavor_id && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Sabor de referencia: {flavors.find((flavor) => flavor.id === pizza.default_flavor_id)?.name || 'Nao encontrado'}
                              </p>
                            )}
                            {pizza.pizza_config?.sizes && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {pizza.pizza_config.sizes.map(size => (
                                  <Badge key={size.id} variant="outline" className="text-xs">
                                    {size.name}: a partir de {formatCurrency(size.price_tradicional || size.price_premium)}
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
                            <Button variant="ghost" size="icon" onClick={() => openPizzaModal(pizza)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { if (confirm('Excluir esta pizza?')) deletePizzaMutation.mutate(pizza.id); }}
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
              </div>
            </div>
          ));
        })()}

      {pizzas.length === 0 && canCreatePizza && (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhuma entrada generica cadastrada ainda</p>
            <p className="text-sm mt-1">Crie a primeira entrada comercial para abrir o builder premium no cardapio.</p>
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
        pizzaCategories={pizzaCategories}
      />
    </div>
  );
}

function PizzaModal({ isOpen, onClose, onSubmit, pizza, sizes, flavors, edges, extras, categories, pizzaCategories = [] }) {
  const [selectedDefaultFlavor, setSelectedDefaultFlavor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    category_id: '',
    pizza_category_id: '',
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

  const selectedPizzaCategory = pizzaCategories.find((category) => category.id === formData.pizza_category_id);
  const selectedCommercialSize = sizes.find((size) => size.id === selectedPizzaCategory?.size_id)
    || sizes.find((size) => formData.pizza_config?.sizes?.some((entry) => entry.id === size.id))
    || null;
  const commercialStartingPrice = selectedCommercialSize
    ? Number(selectedCommercialSize?.price_tradicional || selectedCommercialSize?.price_premium || 0)
    : Number(formData.pizza_config?.sizes?.[0]?.price_tradicional || formData.pizza_config?.sizes?.[0]?.price_premium || 0);
  const referenceFlavor = selectedDefaultFlavor || flavors.find((flavor) => flavor.id === formData.default_flavor_id) || null;
  const referenceFlavorName = referenceFlavor?.name || 'Nao definido';

  React.useEffect(() => {
    if (pizza) {
      const defaultFlavor = flavors.find(f => f.id === pizza.default_flavor_id);
      setSelectedDefaultFlavor(defaultFlavor);
      
      setFormData({
        name: pizza.name || '',
        description: pizza.description || '',
        image: pizza.image || '',
        category_id: pizza.category_id || '',
        pizza_category_id: pizza.pizza_category_id || '',
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
        pizza_category_id: pizzaCategories[0]?.id || '',
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
  }, [pizza, isOpen, sizes, flavors, edges, extras, categories, pizzaCategories]);

  const handleDefaultFlavorSelect = (flavor) => {
    setSelectedDefaultFlavor(flavor);
    setFormData(prev => ({
      ...prev,
      name: prev.name || selectedPizzaCategory?.name || `Pizza ${flavor.name}`,
      default_flavor_id: flavor.id,
      image: prev.image || flavor.image || '',
      description: prev.description || flavor.description || ''
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'dishes');

    if (!url) {
      toast.error('Erro ao obter URL da imagem');
      return;
    }

    setFormData(prev => ({ ...prev, image: url }));
  } catch (err) {
    console.error(err);
    toast.error('Falha ao enviar imagem');
  }
};


  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedDefaultFlavor && !pizza) {
      toast.error('Selecione um sabor de referencia para continuar');
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

    const toSubmit = { ...formData };
    if (pizzaCategories.length > 0 && toSubmit.pizza_category_id && !toSubmit.category_id) {
      const defaultCat = categories.find(c => c.name?.toLowerCase().includes('pizza')) || categories[0];
      toSubmit.category_id = defaultCat?.id || '';
    }
    onSubmit(toSubmit);
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
      <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pizza ? 'Editar' : 'Nova'} entrada comercial</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sabor de referencia */}
            {!pizza && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Sabor de referencia *</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Escolha um sabor inicial para representar esta entrada comercial.</p>
                </div>
                
                <div className="space-y-3">
                  <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Sabores tradicionais</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {flavors.filter(f => f.category === 'tradicional' && f.is_active).map(flavor => (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => handleDefaultFlavorSelect(flavor)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDefaultFlavor?.id === flavor.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {flavor.image && (
                            <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{flavor.name}</p>
                            {selectedDefaultFlavor?.id === flavor.id && (
                              <Badge className="text-xs mt-1 bg-orange-500 dark:bg-orange-600">Selecionado</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Sabores premium</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {flavors.filter(f => f.category === 'premium' && f.is_active).map(flavor => (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => handleDefaultFlavorSelect(flavor)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDefaultFlavor?.id === flavor.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {flavor.image && (
                            <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{flavor.name}</p>
                            {selectedDefaultFlavor?.id === flavor.id && (
                              <Badge className="text-xs mt-1 bg-orange-500 dark:bg-orange-600">Selecionado</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Informacoes basicas */}
            {(selectedDefaultFlavor || pizza) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Informacoes da entrada comercial</h4>
                <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Sabor de referencia: <strong>{referenceFlavorName}</strong>
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Entrada publica</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selectedPizzaCategory?.name || 'Selecione uma entrada'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Preco inicial</p>
                    <p className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {commercialStartingPrice > 0 ? formatCurrency(commercialStartingPrice) : 'Defina um tamanho base'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Sabores liberados</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formData.pizza_config?.flavor_ids?.length || 0} sabores
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label>Nome da entrada *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Tradicional - 2 sabores"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Este nome representa a entrada generica exibida no cardapio publico.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Entrada comercial *</Label>
                    <Select 
                      value={pizzaCategories.length > 0 ? (formData.pizza_category_id || '') : (formData.category_id || '')} 
                      onValueChange={(value) => setFormData(prev => 
                        pizzaCategories.length > 0 
                          ? { ...prev, pizza_category_id: value } 
                          : { ...prev, category_id: value }
                      )}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={pizzaCategories.length ? "Ex: Tradicional - 2 sabores" : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {pizzaCategories.length > 0 ? (
                          pizzaCategories.map(cat => {
                            const sz = sizes.find(s => s.id === cat.size_id);
                            const label = cat.name || (sz ? `${sz.name} • ${cat.max_flavors || 1} sabor(es)` : cat.id);
                            return (
                              <SelectItem key={cat.id} value={cat.id}>{label}</SelectItem>
                            );
                          })
                        ) : (
                          categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {pizzaCategories.length ? 'Defina a entrada publica com tamanho e quantidade de sabores em Configuracao > Entradas.' : 'Sem entradas de pizza. Crie em Configuracao > Entradas.'}
                    </p>
                  </div>

                  <div>
                    <Label>Modo de divisao *</Label>
                    <Select 
                      value={formData.division_mode} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, division_mode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slices">Por fatias (livre)</SelectItem>
                        <SelectItem value="exact">Divisao exata (automatica)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formData.division_mode === 'slices' 
                        ? 'O cliente escolhe a composicao dos sabores livremente.'
                        : 'A montagem divide os sabores automaticamente de forma equilibrada.'
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Descricao comercial (opcional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a proposta desta entrada comercial."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Imagem da entrada (opcional)</Label>
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
                  {formData.image && (
                    <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Se nao enviar, sera usada a imagem do sabor de referencia.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <Label className="text-gray-900 dark:text-gray-100">Destaque</Label>
                    <Switch
                      checked={formData.is_highlight}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_highlight: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <Label className="text-gray-900 dark:text-gray-100">Novo</Label>
                    <Switch
                      checked={formData.is_new}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <Label className="text-gray-900 dark:text-gray-100">Popular</Label>
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
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Tamanhos disponiveis *</h4>
              <div className="grid gap-2">
                {sizes.map(size => {
                  const isSelected = formData.pizza_config.sizes?.some(s => s.id === size.id);
                  return (
                    <label
                      key={size.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                      onClick={() => toggleSize(size)}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{size.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {size.slices} fatias • Ate {size.max_flavors} sabores
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(size.price_tradicional)}</p>
                        <p className="text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(size.price_premium)}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sabores */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Sabores disponiveis *</h4>
              <div className="grid grid-cols-2 gap-2">
                {flavors.map(flavor => {
                  const isSelected = formData.pizza_config.flavor_ids?.includes(flavor.id);
                  return (
                    <label
                      key={flavor.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                      onClick={() => toggleFlavor(flavor.id)}
                    >
                      {flavor.image && (
                        <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{flavor.name}</p>
                        <Badge variant="outline" className="text-xs mt-1 dark:border-gray-600 dark:text-gray-300">
                          {flavor.category === 'premium' ? 'Premium' : 'Tradicional'}
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
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Bordas disponiveis (opcional)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {edges.map(edge => {
                    const isSelected = formData.pizza_config.edges?.some(e => e.id === edge.id);
                    return (
                      <label
                        key={edge.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                        onClick={() => toggleEdge(edge)}
                      >
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{edge.name}</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(edge.price)}</p>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extras */}
            {extras.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Extras disponiveis (opcional)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {extras.map(extra => {
                    const isSelected = formData.pizza_config.extras?.some(e => e.id === extra.id);
                    return (
                      <label
                        key={extra.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                        onClick={() => toggleExtra(extra)}
                      >
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{extra.name}</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(extra.price)}</p>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white">
                {pizza ? 'Salvar entrada' : 'Criar entrada'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}



