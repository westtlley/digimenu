import React, { useState, useMemo } from 'react';
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
import { Plus, Trash2, Zap, ArrowUpRight, RefreshCw, Search, Filter, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function PromotionsTab() {
  const [showModal, setShowModal] = useState(false);
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

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list(),
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => base44.entities.Dish.list(),
  });

  const { data: stores = [] } = useQuery({ queryKey: ['store'], queryFn: () => base44.entities.Store.list() });
  const store = stores[0];
  const storeBanners = Array.isArray(store?.banners) ? store.banners : [];

  const updateStoreBannersMutation = useMutation({
    mutationFn: (data) => base44.entities.Store.update(store.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['store'] }); toast.success('Banners salvos'); },
    onError: (e) => toast.error(e?.message || 'Erro'),
  });

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'store');
      updateStoreBannersMutation.mutate({ banner_image: url });
    } catch (err) { toast.error('Erro no upload'); }
  };

  const addBanner = () => {
    const next = [...storeBanners, { image: '', title: '', subtitle: '', link: '', active: true }];
    updateStoreBannersMutation.mutate({ banners: next });
  };
  const updateBanner = (i, field, value) => {
    const next = storeBanners.map((b, idx) => idx === i ? { ...b, [field]: value } : b);
    updateStoreBannersMutation.mutate({ banners: next });
  };
  const removeBanner = (i) => {
    const next = storeBanners.filter((_, idx) => idx !== i);
    updateStoreBannersMutation.mutate({ banners: next });
  };
  const handleBannerImgUpload = async (e, i) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'store');
      updateBanner(i, 'image', url);
    } catch (err) { toast.error('Erro no upload'); }
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Promotion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção excluída!');
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
  const getDishName = (id) => safeDishes.find(d => d.id === id)?.name || 'Prato não encontrado';

  // Filtrar promoções
  const filteredPromotions = useMemo(() => {
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
  }, [promotions, searchTerm, filterStatus, filterType, safeDishes]);

  // Estatísticas
  const stats = useMemo(() => {
    const active = promotions.filter(p => p.is_active).length;
    const inactive = promotions.filter(p => !p.is_active).length;
    const addType = promotions.filter(p => p.type === 'add').length;
    const replaceType = promotions.filter(p => p.type === 'replace').length;

    return {
      total: promotions.length,
      active,
      inactive,
      addType,
      replaceType
    };
  }, [promotions]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Banners do cardápio (Store) */}
      {store && (
        <Card>
          <CardHeader>
            <CardTitle>Banners do cardápio</CardTitle>
            <CardDescription>Foto de capa e banners promocionais exibidos no cardápio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Foto de capa (banner superior)</Label>
              <div className="mt-1 w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed">
                {store.banner_image ? (
                  <img src={store.banner_image} alt="Capa" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm">Nenhuma</span>
                )}
              </div>
              <label className="mt-2 inline-block text-sm text-orange-600 cursor-pointer">Alterar <input type="file" accept="image/*" className="hidden" onChange={handleBannerImageUpload} /></label>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Banners promocionais</Label>
                <Button type="button" size="sm" variant="outline" onClick={addBanner}>+ Adicionar</Button>
              </div>
              {(storeBanners || []).map((b, i) => (
                <div key={i} className="p-3 border rounded-lg mb-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Banner {i + 1}</span>
                    <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeBanner(i)}>Remover</Button>
                  </div>
                  <div className="h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {b.image ? <img src={b.image} alt="" className="max-h-full object-contain" /> : <span className="text-gray-400 text-xs">Sem imagem</span>}
                  </div>
                  <label className="text-xs text-orange-600 cursor-pointer">Upload <input type="file" accept="image/*" className="hidden" onChange={e=>handleBannerImgUpload(e,i)} /></label>
                  <Input placeholder="Título" value={b.title||''} onChange={e=>updateBanner(i,'title',e.target.value)} />
                  <Input placeholder="Subtítulo" value={b.subtitle||''} onChange={e=>updateBanner(i,'subtitle',e.target.value)} />
                  <Input placeholder="Link" value={b.link||''} onChange={e=>updateBanner(i,'link',e.target.value)} />
                  <div className="flex items-center gap-2"><Switch checked={b.active!==false} onCheckedChange={v=>updateBanner(i,'active',v)} /><Label className="text-xs">Ativo</Label></div>
                </div>
              ))}
            </div>
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md mx-4">
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