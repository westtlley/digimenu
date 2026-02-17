import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Wine, Droplets, Search, ThermometerSnowflake, Thermometer, Package, Barcode } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import { usePermission } from '@/components/permissions/usePermission';
import { useMenuDishes } from '@/hooks/useMenuData';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function BeveragesTab() {
  const [user, setUser] = useState(null);
  const [showBeverageModal, setShowBeverageModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingBeverage, setEditingBeverage] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    price: '',
    category_id: '',
    beverage_type: 'industrial',      // industrial | natural
    volume_ml: '',
    serving_temp: 'cold',             // cold | room | hot
    ean: '',
    sugar_free: false,
    alcoholic: false,
    caffeine: false,
    dietary_tags: [],                 // vegano, sem_lactose, sem_gluten, zero_acucar
    is_active: true,
    is_highlight: false,
    order: 0,
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // ✅ CORREÇÃO: Usar hook com contexto automático
  const { menuContext, loading: permissionLoading } = usePermission();
  const { data: dishesRaw = [], isLoading: dishesLoading } = useMenuDishes();
  const beverages = useMemo(() => (dishesRaw || []).filter(d => d.product_type === 'beverage'), [dishesRaw]);

  // ✅ CORREÇÃO: Buscar categorias de bebidas com contexto do slug
  const { data: beverageCategories = [], isLoading: categoriesLoading } = useQuery({
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
  
  // ✅ Considerar todos os estados de loading
  const isLoading = permissionLoading || dishesLoading || categoriesLoading;

  const createBeverageMutation = useMutation({
    mutationFn: (data) => base44.entities.Dish.create({
      ...data,
      product_type: 'beverage',
      subscriber_email: user?.subscriber_email || user?.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Bebida criada!');
      closeBeverageModal();
    },
  });

  const updateBeverageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Dish.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Bebida atualizada!');
      closeBeverageModal();
    },
  });

  const deleteBeverageMutation = useMutation({
    mutationFn: (id) => base44.entities.Dish.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Bebida excluída!');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.BeverageCategory.create({ ...data, subscriber_email: user?.subscriber_email || user?.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beverageCategories'] });
      setShowCategoryModal(false);
      setNewCategoryName('');
      toast.success('Categoria criada!');
    },
  });

  const filteredBeverages = useMemo(() => {
    let list = beverages;
    if (filterCategory !== 'all') list = list.filter(b => b.category_id === filterCategory);
    if (searchTerm) list = list.filter(b => (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    return list;
  }, [beverages, filterCategory, searchTerm]);

  const closeBeverageModal = () => {
    setShowBeverageModal(false);
    setEditingBeverage(null);
    setFormData({ name: '', description: '', image: '', price: '', category_id: '', beverage_type: 'industrial', volume_ml: '', serving_temp: 'cold', ean: '', sugar_free: false, alcoholic: false, caffeine: false, dietary_tags: [], is_active: true, is_highlight: false, order: 0 });
  };

  // ✅ Mostrar skeleton enquanto carrega
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wine className="w-6 h-6 text-cyan-500" />
              Bebidas
            </h2>
            <p className="text-sm text-gray-500 mt-1">Carregando...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/30 animate-pulse">
                  <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openBeverageModal = (beverage = null) => {
    if (beverage) {
      setEditingBeverage(beverage);
      setFormData({
        name: beverage.name || '',
        description: beverage.description || '',
        image: beverage.image || '',
        price: String(beverage.price ?? ''),
        category_id: beverage.category_id || '',
        beverage_type: beverage.beverage_type || 'industrial',
        volume_ml: String(beverage.volume_ml ?? ''),
        serving_temp: beverage.serving_temp || 'cold',
        ean: beverage.ean || '',
        sugar_free: !!beverage.sugar_free,
        alcoholic: !!beverage.alcoholic,
        caffeine: !!beverage.caffeine,
        dietary_tags: Array.isArray(beverage.dietary_tags) ? beverage.dietary_tags : [],
        is_active: beverage.is_active !== false,
        is_highlight: !!beverage.is_highlight,
        order: beverage.order ?? 0,
      });
    } else {
      setEditingBeverage(null);
      setFormData({ ...formData, category_id: beverageCategories[0]?.id || '', order: beverages.length });
    }
    setShowBeverageModal(true);
  };

  const handleBeverageSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      volume_ml: parseInt(formData.volume_ml, 10) || null,
    };
    if (editingBeverage) {
      updateBeverageMutation.mutate({ id: editingBeverage.id, data: payload });
    } else {
      createBeverageMutation.mutate(payload);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview imediato local
    const localUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, image: localUrl }));
    toast.loading('Enviando imagem...');
    
    try {
      const url = await uploadToCloudinary(file, 'dishes');
      toast.dismiss();
      if (url) {
        setFormData(prev => ({ ...prev, image: url }));
        toast.success('Imagem enviada!');
      } else {
        setFormData(prev => ({ ...prev, image: '' }));
        toast.error('Erro no upload');
      }
    } catch (err) {
      toast.dismiss();
      setFormData(prev => ({ ...prev, image: '' }));
      toast.error('Falha ao enviar imagem');
    }
  };

  const toggleDietaryTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag) ? prev.dietary_tags.filter(t => t !== tag) : [...prev.dietary_tags, tag]
    }));
  };

  const DIETARY_OPTIONS = [
    { id: 'vegano', label: 'Vegano' },
    { id: 'sem_lactose', label: 'Sem lactose' },
    { id: 'sem_gluten', label: 'Sem glúten' },
    { id: 'zero_acucar', label: 'Zero açúcar' },
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wine className="w-6 h-6 text-cyan-500" />
            Bebidas
          </h2>
          <p className="text-sm text-gray-500 mt-1">Cadastre refrigerantes, sucos, águas e outras bebidas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCategoryModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Categoria
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openBeverageModal()}>
            <Plus className="w-4 h-4 mr-2" /> Nova Bebida
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar bebidas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {beverageCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            {filteredBeverages.map(b => (
              <div key={b.id} className="flex items-center gap-4 p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/30">
                {b.image && <img src={b.image} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{b.name}</span>
                    {b.volume_ml && <Badge variant="outline" className="text-xs">{b.volume_ml}ml</Badge>}
                    {b.beverage_type === 'natural' && <Badge className="bg-green-100 text-green-800 text-xs">Natural</Badge>}
                    {b.serving_temp === 'cold' && <ThermometerSnowflake className="w-4 h-4 text-blue-500" />}
                    {b.serving_temp === 'hot' && <Thermometer className="w-4 h-4 text-orange-500" />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{beverageCategories.find(c => c.id === b.category_id)?.name} · {formatCurrency(b.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={b.is_active !== false} onCheckedChange={(v) => updateBeverageMutation.mutate({ id: b.id, data: { ...b, is_active: v } })} />
                  <Button variant="ghost" size="icon" onClick={() => openBeverageModal(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => confirm('Excluir?') && deleteBeverageMutation.mutate(b.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>

          {filteredBeverages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Wine className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma bebida cadastrada</p>
              <Button variant="outline" className="mt-3" onClick={() => openBeverageModal()}>Cadastrar primeira bebida</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Bebida */}
      <Dialog open={showBeverageModal} onOpenChange={(v) => !v && closeBeverageModal()}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBeverage ? 'Editar Bebida' : 'Nova Bebida'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBeverageSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Refrigerante Coca-Cola" required />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {beverageCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.beverage_type} onValueChange={(v) => setFormData(prev => ({ ...prev, beverage_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industrial"><Package className="w-4 h-4 mr-2 inline" /> Industrializado</SelectItem>
                    <SelectItem value="natural"><Droplets className="w-4 h-4 mr-2 inline" /> Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Volume (ml)</Label>
                <Input type="number" min="1" value={formData.volume_ml} onChange={(e) => setFormData(prev => ({ ...prev, volume_ml: e.target.value }))} placeholder="350" />
              </div>
              <div>
                <Label>Temperatura</Label>
                <Select value={formData.serving_temp} onValueChange={(v) => setFormData(prev => ({ ...prev, serving_temp: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Gelado</SelectItem>
                    <SelectItem value="room">Ambiente</SelectItem>
                    <SelectItem value="hot">Quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>EAN (código de barras)</Label>
                <Input value={formData.ean} onChange={(e) => setFormData(prev => ({ ...prev, ean: e.target.value }))} placeholder="7891234567890" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Preço *</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} placeholder="5.00" required />
              </div>
              <div>
                <Label>Imagem da bebida</Label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    id="beverage-image-upload"
                    onChange={handleImageUpload} 
                  />
                  <label 
                    htmlFor="beverage-image-upload"
                    className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 cursor-pointer text-sm transition-colors"
                  >
                    {formData.image ? 'Alterar Foto' : 'Adicionar Foto'}
                  </label>
                  {formData.image && (
                    <div className="relative">
                      <img src={formData.image} alt="Preview" className="w-16 h-16 rounded object-cover border-2 border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm font-medium w-full">Características</span>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.sugar_free} onChange={(e) => setFormData(prev => ({ ...prev, sugar_free: e.target.checked }))} /> Sem açúcar</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.alcoholic} onChange={(e) => setFormData(prev => ({ ...prev, alcoholic: e.target.checked }))} /> Alcoólico</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.caffeine} onChange={(e) => setFormData(prev => ({ ...prev, caffeine: e.target.checked }))} /> Cafeína</label>
              {DIETARY_OPTIONS.map(t => (
                <Badge key={t.id} variant={formData.dietary_tags.includes(t.id) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleDietaryTag(t.id)}>{t.label}</Badge>
              ))}
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Descrição opcional" />
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Ativo</Label>
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <Label>Destacar no cardápio</Label>
              <Switch checked={formData.is_highlight} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_highlight: v }))} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeBeverageModal} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">{editingBeverage ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Categoria */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Categoria de Bebidas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex: Refrigerantes, Sucos, Águas" />
            </div>
            <Button onClick={() => newCategoryName.trim() && createCategoryMutation.mutate({ name: newCategoryName.trim(), order: beverageCategories.length })} className="w-full">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
