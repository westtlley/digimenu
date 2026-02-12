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
import { Plus, Trash2, Zap, ArrowUpRight, RefreshCw, Search, Filter, TrendingUp, Gift, Pencil, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ComboModalUnified from './ComboModalUnified';
import { usePermission } from '../permissions/usePermission';
import { useMenuDishes } from '@/hooks/useMenuData';

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

export default function PromotionsTab() {
  const [showModal, setShowModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
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

  // ✅ CORREÇÃO: Usar hook com contexto automático
  const { data: dishes = [] } = useMenuDishes();

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

  // ✅ CORREÇÃO: Buscar store com contexto do slug
  const { data: stores = [] } = useQuery({ 
    queryKey: ['store', menuContext?.type, menuContext?.value], 
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Store.list(null, opts);
    },
    enabled: !!menuContext,
  });
  const store = stores[0];

  const [crossSellConfig, setCrossSellConfig] = useState(DEFAULT_CROSS_SELL);

  useEffect(() => {
    if (store?.cross_sell_config) {
      setCrossSellConfig(prev => ({ ...DEFAULT_CROSS_SELL, ...store.cross_sell_config }));
    }
  }, [store?.id, store?.cross_sell_config]);

  const updateCrossSellConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (!store?.id) throw new Error('Loja não encontrada');
      const opts = menuContext?.type === 'subscriber' && menuContext?.value ? { as_subscriber: menuContext.value } : {};
      return base44.entities.Store.update(store.id, { cross_sell_config: data }, opts);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store'] }); toast.success('Ofertas Inteligentes salvas'); },
    onError: (e) => toast.error(e?.message || 'Erro ao salvar'),
  });

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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Promotion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção excluída!');
    },
  });

  const createComboMutation = useMutation({
    mutationFn: (data) => base44.entities.Combo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      setShowComboModal(false);
      setEditingCombo(null);
      toast.success('Combo criado!');
    },
  });

  const updateComboMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Combo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      setShowComboModal(false);
      setEditingCombo(null);
      toast.success('Combo atualizado!');
    },
  });

  const deleteComboMutation = useMutation({
    mutationFn: (id) => base44.entities.Combo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success('Combo excluído!');
    },
  });

  const closeModal = () => {
    setShowModal(false);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      trigger_min_value: parseFloat(formData.trigger_min_value) || 0,
      offer_price: parseFloat(formData.offer_price) || 0,
      original_price: parseFloat(formData.original_price) || 0,
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const getDishName = useMemo(() => {
    return (id) => safeDishes.find(d => d.id === id)?.name || 'Prato não encontrado';
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Ofertas Inteligentes (Cross-sell) */}
      {store && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Ofertas Inteligentes (Cross-sell)
            </CardTitle>
            <CardDescription>
              Configure ofertas automáticas que aparecem quando o cliente adiciona itens ao carrinho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <Switch
                checked={crossSellConfig?.enabled !== false}
                onCheckedChange={(checked) => setCrossSellConfig(prev => ({
                  ...prev,
                  enabled: checked
                }))}
              />
              <div className="flex-1">
                <Label className="font-semibold cursor-pointer">Ativar Ofertas Inteligentes</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Sugerir produtos complementares automaticamente para aumentar o ticket médio
                </p>
              </div>
            </div>

            {crossSellConfig?.enabled !== false && (
              <div className="space-y-6">
                {/* Oferta de Bebida */}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥤</span>
                      <Label className="text-base font-semibold">Oferta de Bebida</Label>
                    </div>
                    <Switch
                      checked={crossSellConfig?.beverage_offer?.enabled !== false}
                      onCheckedChange={(checked) => setCrossSellConfig(prev => ({
                        ...prev,
                        beverage_offer: { ...prev.beverage_offer, enabled: checked }
                      }))}
                    />
                  </div>
                  {crossSellConfig?.beverage_offer?.enabled !== false && (
                    <div className="space-y-4 pl-8 border-l-2 border-blue-200 dark:border-blue-800">
                      <div>
                        <Label>Produto a Sugerir</Label>
                        <Select
                          value={crossSellConfig?.beverage_offer?.dish_id || ''}
                          onValueChange={(value) => setCrossSellConfig(prev => ({
                            ...prev,
                            beverage_offer: { ...prev.beverage_offer, dish_id: value || null }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma bebida" />
                          </SelectTrigger>
                          <SelectContent>
                            {dishes.filter(d =>
                              d.product_type === 'beverage' ||
                              d.category?.toLowerCase().includes('bebida') ||
                              d.name?.toLowerCase().match(/(coca|pepsi|refrigerante|suco|água|bebida)/i)
                            ).map(dish => (
                              <SelectItem key={dish.id} value={dish.id}>
                                {dish.name} - {formatCurrency(dish.price || 0)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Quando o cliente adicionar pizza, esta bebida será sugerida</p>
                      </div>
                      <div>
                        <Label>Título da Oferta</Label>
                        <Input
                          value={crossSellConfig?.beverage_offer?.title || ''}
                          onChange={(e) => setCrossSellConfig(prev => ({
                            ...prev,
                            beverage_offer: { ...prev.beverage_offer, title: e.target.value }
                          }))}
                          placeholder="Ex: 🥤 Que tal uma bebida?"
                        />
                      </div>
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea
                          value={crossSellConfig?.beverage_offer?.message || ''}
                          onChange={(e) => setCrossSellConfig(prev => ({
                            ...prev,
                            beverage_offer: { ...prev.beverage_offer, message: e.target.value }
                          }))}
                          placeholder="Use {product_name} e {product_price} para valores dinâmicos"
                          rows={2}
                        />
                        <p className="text-xs text-gray-500 mt-1">Variáveis disponíveis: {'{product_name}'}, {'{product_price}'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Desconto (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={crossSellConfig?.beverage_offer?.discount_percent || 0}
                            onChange={(e) => setCrossSellConfig(prev => ({
                              ...prev,
                              beverage_offer: { ...prev.beverage_offer, discount_percent: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Oferta de Sobremesa */}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🍰</span>
                      <Label className="text-base font-semibold">Oferta de Sobremesa</Label>
                    </div>
                    <Switch
                      checked={crossSellConfig?.dessert_offer?.enabled !== false}
                      onCheckedChange={(checked) => setCrossSellConfig(prev => ({
                        ...prev,
                        dessert_offer: { ...prev.dessert_offer, enabled: checked }
                      }))}
                    />
                  </div>
                  {crossSellConfig?.dessert_offer?.enabled !== false && (
                    <div className="space-y-4 pl-8 border-l-2 border-purple-200 dark:border-purple-800">
                      <div>
                        <Label>Produto a Sugerir</Label>
                        <Select
                          value={crossSellConfig?.dessert_offer?.dish_id || ''}
                          onValueChange={(value) => setCrossSellConfig(prev => ({
                            ...prev,
                            dessert_offer: { ...prev.dessert_offer, dish_id: value || null }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma sobremesa" />
                          </SelectTrigger>
                          <SelectContent>
                            {dishes.filter(d =>
                              d.category?.toLowerCase().includes('sobremesa') ||
                              d.tags?.includes('dessert') ||
                              d.name?.toLowerCase().match(/(pudim|brigadeiro|sorvete|açaí|sobremesa)/i)
                            ).map(dish => (
                              <SelectItem key={dish.id} value={dish.id}>
                                {dish.name} - {formatCurrency(dish.price || 0)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Valor Mínimo do Carrinho (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={crossSellConfig?.dessert_offer?.min_cart_value || 40}
                            onChange={(e) => setCrossSellConfig(prev => ({
                              ...prev,
                              dessert_offer: { ...prev.dessert_offer, min_cart_value: parseFloat(e.target.value) || 0 }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">Oferta aparece quando carrinho ≥ este valor</p>
                        </div>
                        <div>
                          <Label>Desconto (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={crossSellConfig?.dessert_offer?.discount_percent || 0}
                            onChange={(e) => setCrossSellConfig(prev => ({
                              ...prev,
                              dessert_offer: { ...prev.dessert_offer, discount_percent: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Título da Oferta</Label>
                        <Input
                          value={crossSellConfig?.dessert_offer?.title || ''}
                          onChange={(e) => setCrossSellConfig(prev => ({
                            ...prev,
                            dessert_offer: { ...prev.dessert_offer, title: e.target.value }
                          }))}
                          placeholder="Ex: 🍰 Que tal uma sobremesa?"
                        />
                      </div>
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea
                          value={crossSellConfig?.dessert_offer?.message || ''}
                          onChange={(e) => setCrossSellConfig(prev => ({
                            ...prev,
                            dessert_offer: { ...prev.dessert_offer, message: e.target.value }
                          }))}
                          placeholder="Use {product_name} e {product_price} para valores dinâmicos"
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Oferta de Combo */}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔥</span>
                      <Label className="text-base font-semibold">Oferta de Combo Especial</Label>
                    </div>
                    <Switch
                      checked={crossSellConfig?.combo_offer?.enabled !== false}
                      onCheckedChange={(checked) => setCrossSellConfig(prev => ({
                        ...prev,
                        combo_offer: { ...prev.combo_offer, enabled: checked }
                      }))}
                    />
                  </div>
                  {crossSellConfig?.combo_offer?.enabled !== false && (
                    <div className="space-y-4 pl-8 border-l-2 border-orange-200 dark:border-orange-800">
                      <div>
                        <Label>Produto Grátis</Label>
                        <Select
                          value={crossSellConfig?.combo_offer?.dish_id || ''}
                          onValueChange={(value) => setCrossSellConfig(prev => ({
                            ...prev,
                            combo_offer: { ...prev.combo_offer, dish_id: value || null }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o produto grátis" />
                          </SelectTrigger>
                          <SelectContent>
                            {dishes.filter(d => d.is_active !== false).map(dish => (
                              <SelectItem key={dish.id} value={dish.id}>
                                {dish.name} - {formatCurrency(dish.price || 0)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Produto que será oferecido grátis no combo</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Mínimo de Pizzas</Label>
                          <Input
                            type="number"
                            min="1"
                            value={crossSellConfig?.combo_offer?.min_pizzas || 2}
                            onChange={(e) => setCrossSellConfig(prev => ({
                              ...prev,
                              combo_offer: { ...prev.combo_offer, min_pizzas: parseInt(e.target.value) || 2 }
                            }))}
                          />
                          <p className="text-xs text-gray-500 mt-1">Oferta aparece quando cliente tem esta quantidade de pizzas</p>
                        </div>
                      </div>
                      <div>
                        <Label>Título da Oferta</Label>
                        <Input
                          value={crossSellConfig?.combo_offer?.title || ''}
                          onChange={(e) => setCrossSellConfig(prev => ({
                            ...prev,
                            combo_offer: { ...prev.combo_offer, title: e.target.value }
                          }))}
                          placeholder="Ex: 🔥 Oferta Especial!"
                        />
                      </div>
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea
                          value={crossSellConfig?.combo_offer?.message || ''}
                          onChange={(e) => setCrossSellConfig(prev => ({
                            ...prev,
                            combo_offer: { ...prev.combo_offer, message: e.target.value }
                          }))}
                          placeholder="Use {product_name}, {min_pizzas} para valores dinâmicos"
                          rows={2}
                        />
                        <p className="text-xs text-gray-500 mt-1">Variáveis: {'{product_name}'}, {'{min_pizzas}'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={() => updateCrossSellConfigMutation.mutate(crossSellConfig)}
              disabled={updateCrossSellConfigMutation.isPending}
            >
              {updateCrossSellConfigMutation.isPending ? 'Salvando...' : 'Salvar Ofertas Inteligentes'}
            </Button>
          </CardContent>
        </Card>
      )}

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
        dishes={safeDishes}
        pizzas={(dishes || []).filter(d => d.product_type === 'pizza')}
        beverages={(dishes || []).filter(d => d.product_type === 'beverage')}
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Nova Promoção Upsell</DialogTitle>
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
                const dish = safeDishes.find(d => d.id === value);
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
                    <SelectItem key={dish.id} value={dish.id}>{dish.name} - {formatCurrency(dish.price)}</SelectItem>
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