import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Zap, ArrowUpRight, RefreshCw, Search, Filter, TrendingUp, Gift, Pencil, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import ComboModalUnified from './ComboModalUnified';
import LoyaltyTab from './LoyaltyTab';
import { usePermission } from '../permissions/usePermission';
import { useMenuCategories, useMenuDishes } from '@/hooks/useMenuData';

const DEFAULT_CROSS_SELL = {
  enabled: true,
  beverage_offer: {
    enabled: true,
    trigger_product_types: ['pizza'],
    min_cart_value: 0,
    dish_id: null,
    title: '🥤 Que tal uma bebida?',
    message: 'Pizza sem bebida? Adicione {product_name} por apenas {product_price}',
    discount_percent: 0
  },
  dessert_offer: {
    enabled: true,
    min_cart_value: 40,
    dish_id: null,
    title: '🍰 Que tal uma sobremesa?',
    message: 'Complete seu pedido com {product_name} por apenas {product_price}',
    discount_percent: 0
  },
  combo_offer: {
    enabled: true,
    min_pizzas: 2,
    dish_id: null,
    title: '🔥 Oferta Especial!',
    message: 'Compre {min_pizzas} pizzas e ganhe {product_name} GRÁTIS!',
    discount_percent: 100
  }
};

const PROMO_SUB_TABS = [
  { id: 'promocoes', label: 'Promoções e Combos', icon: Zap },
  { id: 'fidelidade', label: 'Regras de Pontos de Fidelidade', icon: Star },
];

export default function PromotionsTab() {
  const [promoSubTab, setPromoSubTab] = useState('promocoes');
  const [showModal, setShowModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'add',
    trigger_min_value: '',
    offer_dish_id: '',
    offer_price: '',
    original_price: '',
    description: '',
    is_active: true,
  });

  const queryClient = useQueryClient();
  const { menuContext } = usePermission();

  // ✅ CORREÇÃO: Buscar promoções com contexto do slug
  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Promotion.list(null, opts);
    },
    enabled: !!menuContext,
  });

  useEffect(() => {
    if (!menuContext) return;
    if (!showComboModal && !showModal) return;

    refetchDishes();
    refetchCategories();
    refetchBeverageCategories();
    refetchPizzaCategories();

    queryClient.invalidateQueries({ queryKey: ['dishes', menuContext?.type, menuContext?.value] });
    queryClient.invalidateQueries({ queryKey: ['categories', menuContext?.type, menuContext?.value] });
    queryClient.invalidateQueries({ queryKey: ['beverageCategories', menuContext?.type, menuContext?.value] });
    queryClient.invalidateQueries({ queryKey: ['pizzaCategories', menuContext?.type, menuContext?.value] });
  }, [showComboModal, showModal, menuContext?.type, menuContext?.value]);

  // ✅ CORREÇÃO: Usar hook com contexto automático
  const { data: dishes = [], refetch: refetchDishes } = useMenuDishes({ refetchOnMount: 'always' });
  const { data: categories = [], refetch: refetchCategories } = useMenuCategories({ refetchOnMount: 'always' });

  const { data: beverageCategories = [], refetch: refetchBeverageCategories } = useQuery({
    queryKey: ['beverageCategories', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];

      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.BeverageCategory.list('order', opts);
    },
    enabled: !!menuContext,
  });

  const { data: pizzaCategories = [], refetch: refetchPizzaCategories } = useQuery({
    queryKey: ['pizzaCategories', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];

      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.PizzaCategory.list('order', opts);
    },
    enabled: !!menuContext,
  });

  // ✅ CORREÇÃO: Buscar combos com contexto do slug
  const { data: combos = [] } = useQuery({
    queryKey: ['combos', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Combo.list(null, opts);
    },
    enabled: !!menuContext,
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
    setFormData({
      name: '',
      type: 'add',
      trigger_min_value: '',
      offer_dish_id: '',
      offer_price: '',
      original_price: '',
      description: '',
      is_active: true,
    });
  };

  const openEditPromotion = (promo) => {
    if (!promo) return;
    refetchDishes();
    setEditingPromotion(promo);
    setFormData({
      name: promo.name || '',
      type: promo.type || 'add',
      trigger_min_value: (promo.trigger_min_value ?? '').toString(),
      offer_dish_id: (promo.offer_dish_id ?? '').toString(),
      offer_price: (promo.offer_price ?? '').toString(),
      original_price: (promo.original_price ?? '').toString(),
      description: promo.description || '',
      is_active: promo.is_active !== false,
    });
    setShowModal(true);
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Promotion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      closeModal();
      toast.success('Promoção criada!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Promotion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção atualizada!');
    },
  });

  const createComboMutation = useMutation({
    mutationFn: async (data) => {
      const opts = {};
      if (menuContext?.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Combo.create(data, opts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos', menuContext?.type, menuContext?.value] });
      toast.success('Combo criado!');
      setShowComboModal(false);
      setEditingCombo(null);
    },
  });

  const updateComboMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const opts = {};
      if (menuContext?.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Combo.update(id, data, opts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos', menuContext?.type, menuContext?.value] });
      toast.success('Combo atualizado!');
      setShowComboModal(false);
      setEditingCombo(null);
    },
  });

  const deleteComboMutation = useMutation({
    mutationFn: async (id) => {
      const opts = {};
      if (menuContext?.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Combo.delete(id, opts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos', menuContext?.type, menuContext?.value] });
      toast.success('Combo excluído!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      trigger_min_value: parseFloat(formData.trigger_min_value) || 0,
      offer_price: parseFloat(formData.offer_price) || 0,
      original_price: parseFloat(formData.original_price) || 0,
    };
    if (editingPromotion?.id) {
      updateMutation.mutate({ id: editingPromotion.id, data: payload });
      closeModal();
      return;
    }
    createMutation.mutate(payload);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const safeDishes = Array.isArray(dishes) ? dishes : [];

  const getDishName = useMemo(() => {
    return (id) => safeDishes.find(d => (d?.id ?? '').toString() === (id ?? '').toString())?.name || 'Prato não encontrado';
  }, [safeDishes]);

  // Filtrar promoções
  const filteredPromotions = useMemo(() => {
    if (!Array.isArray(promotions)) return [];
    return promotions.filter(promo => {
      const matchesSearch = !searchTerm ||
        promo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDishName(promo.offer_dish_id).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && promo.is_active) ||
        (filterStatus === 'inactive' && !promo.is_active);

      const matchesType = filterType === 'all' || promo.type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [promotions, searchTerm, filterStatus, filterType, getDishName]);

  // Estatísticas
  const stats = useMemo(() => {
    const safePromotions = Array.isArray(promotions) ? promotions : [];
    const active = safePromotions.filter(p => p.is_active).length;
    const inactive = safePromotions.filter(p => !p.is_active).length;
    const addType = safePromotions.filter(p => p.type === 'add').length;
    const replaceType = safePromotions.filter(p => p.type === 'replace').length;

    return {
      total: safePromotions.length,
      active,
      inactive,
      addType,
      replaceType
    };
  }, [promotions]);

  // Sub-tab: Regras de Pontos de Fidelidade
  if (promoSubTab === 'fidelidade') {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex gap-2 mb-4 border-b pb-4">
          {PROMO_SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setPromoSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                promoSubTab === t.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
        <LoyaltyTab />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex gap-2 mb-4 border-b pb-4">
        {PROMO_SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPromoSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              promoSubTab === t.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>
      {/* Ofertas Inteligentes (Cross-sell) */}
      {/* ... */}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Adicionar</p>
                <p className="text-2xl font-bold text-blue-600">{stats.addType}</p>
              </div>
              <Plus className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Substituir</p>
                <p className="text-2xl font-bold text-purple-600">{stats.replaceType}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar promoção ou prato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="add">Adicionar</SelectItem>
            <SelectItem value="replace">Substituir</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Promoção
        </Button>
        <Button variant="outline" onClick={() => { setEditingCombo(null); setShowComboModal(true); }} className="border-purple-300 text-purple-700 hover:bg-purple-50">
          <Gift className="w-4 h-4 mr-2" />
          Criar Combo
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPromotions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma promoção cadastrada</p>
          </div>
        ) : (
          filteredPromotions.map(promo => (
            <div key={promo.id} className={`bg-white rounded-xl p-4 shadow-sm border-2 ${promo.is_active ? 'border-green-200' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge className={promo.type === 'add' ? 'bg-blue-500' : 'bg-purple-500'}>
                    {promo.type === 'add' ? <Plus className="w-3 h-3 mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                    {promo.type === 'add' ? 'Adicionar' : 'Substituir'}
                  </Badge>
                  <h3 className="font-bold mt-2">{promo.name}</h3>
                </div>
                <Switch
                  checked={promo.is_active}
                  onCheckedChange={(checked) => updateMutation.mutate({
                    id: promo.id,
                    data: { ...promo, is_active: checked }
                  })}
                />
              </div>

              <p className="text-sm text-gray-500 mb-2">{getDishName(promo.offer_dish_id)}</p>

              <div className="flex items-center gap-2 mb-2">
                {promo.original_price > promo.offer_price && (
                  <span className="text-sm text-gray-400 line-through">{formatCurrency(promo.original_price)}</span>
                )}
                <span className="font-bold text-green-600">{formatCurrency(promo.offer_price)}</span>
              </div>

              {promo.trigger_min_value > 0 && (
                <p className="text-xs text-gray-400">Pedido mínimo: {formatCurrency(promo.trigger_min_value)}</p>
              )}

              <div className="mt-3 pt-3 border-t flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEditPromotion(promo)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => {
                    if (confirm('Excluir esta promoção?')) {
                      deleteMutation.mutate(promo.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Combos - unificado em Promoções */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Combos
          </CardTitle>
          <CardDescription>Pratos + Bebidas ou Pizzas + Bebidas. Adicionar ao carrinho ou substituir item.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(combos) && combos.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500 border-2 border-dashed rounded-xl">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum combo cadastrado</p>
                <Button variant="outline" className="mt-3" onClick={() => setShowComboModal(true)}>Criar primeiro combo</Button>
              </div>
            ) : (
              (combos || []).map((c) => (
                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">{c.name}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCombo(c); setShowComboModal(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => confirm('Excluir combo?') && deleteComboMutation.mutate(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {c.combo_mode === 'pizzas_beverages' ? 'Pizzas + Bebidas' : 'Pratos + Bebidas'} · {c.combo_action === 'replace' ? 'Substituir' : 'Adicionar'}
                  </p>
                  <p className="font-bold text-green-600">{formatCurrency(c.combo_price)}</p>
                  {c.original_price > c.combo_price && (
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(c.original_price)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ComboModalUnified
        isOpen={showComboModal}
        onClose={() => { setShowComboModal(false); setEditingCombo(null); }}
        onSubmit={(data) => editingCombo ? updateComboMutation.mutate({ id: editingCombo.id, data }) : createComboMutation.mutate(data)}
        combo={editingCombo}
        categories={Array.isArray(categories) ? categories : []}
        beverageCategories={Array.isArray(beverageCategories) ? beverageCategories : []}
        pizzaCategories={Array.isArray(pizzaCategories) ? pizzaCategories : []}
        dishes={safeDishes}
        pizzas={(dishes || []).filter(d => d.product_type === 'pizza')}
        beverages={(dishes || []).filter(d => d.product_type === 'beverage')}
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editingPromotion ? 'Editar Promoção Upsell' : 'Nova Promoção Upsell'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Promoção</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Adicione uma sobremesa!"
                required
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Adicionar ao pedido</SelectItem>
                  <SelectItem value="replace">Substituir item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prato Oferecido</Label>
              <Select value={formData.offer_dish_id} onValueChange={(value) => {
                const dish = safeDishes.find(d => (d?.id ?? '').toString() === (value ?? '').toString());
                setFormData(prev => ({ 
                  ...prev, 
                  offer_dish_id: value,
                  original_price: dish?.price?.toString() || ''
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um prato" />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(dishes) ? dishes : []).filter(d => d.is_active !== false).map(dish => (
                    <SelectItem key={dish.id} value={(dish?.id ?? '').toString()}>{dish.name} - {formatCurrency(dish.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço Original</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.original_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Preço Promocional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.offer_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, offer_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Pedido Mínimo (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.trigger_min_value}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger_min_value: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}