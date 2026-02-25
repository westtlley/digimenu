import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, UtensilsCrossed, Pizza, Wine } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const toCents = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

const fromCents = (cents) => {
  const n = Number(cents);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
};

/**
 * Combo unificado: Pratos + Bebidas OU Pizzas + Bebidas (nunca Pizzas + Pratos).
 * Suporta ação: adicionar ao carrinho ou substituir item.
 */
export default function ComboModalUnified({
  isOpen,
  onClose,
  onSubmit,
  combo,
  categories = [],
  beverageCategories = [],
  pizzaCategories = [],
  dishes = [],
  pizzas = [],
  beverages = [],
}) {
  const safeDishes = (dishes || []).filter(d => d.product_type !== 'pizza' && d.product_type !== 'beverage');
  const safePizzas = (pizzas || []).filter(d => d.product_type === 'pizza');
  const safeBeverages = (beverages || []).filter(d => d.product_type === 'beverage');
  const hasPizzas = safePizzas.length > 0;
  const hasBeverages = safeBeverages.length > 0;

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBeverageCategories = Array.isArray(beverageCategories) ? beverageCategories : [];
  const safePizzaCategories = Array.isArray(pizzaCategories) ? pizzaCategories : [];

  const normalizeAllowedCategoryId = (cid) => {
    const s = (cid || '').toString();
    if (!s) return '';
    if (s.startsWith('c_') || s.startsWith('bc_') || s.startsWith('pc_')) return s;
    return `c_${s}`;
  };

  const buildCategoryOptions = (allowedTypes) => {
    const types = Array.isArray(allowedTypes) ? allowedTypes : [];
    const opts = [];
    if (types.includes('dish')) {
      safeCategories.forEach((c) => opts.push({ id: `c_${c.id}`, name: c.name }));
    }
    if (types.includes('beverage')) {
      safeBeverageCategories.forEach((c) => opts.push({ id: `bc_${c.id}`, name: c.name }));
    }
    if (types.includes('pizza')) {
      safePizzaCategories.forEach((c) => opts.push({ id: `pc_${c.id}`, name: c.name }));
    }
    return opts;
  };

  const resolveCategoryName = (cid) => {
    const s = normalizeAllowedCategoryId(cid);
    if (s.startsWith('bc_')) {
      const id = s.replace(/^bc_/, '');
      return safeBeverageCategories.find((c) => (c?.id ?? '').toString() === id)?.name || 'Categoria';
    }
    if (s.startsWith('pc_')) {
      const id = s.replace(/^pc_/, '');
      return safePizzaCategories.find((c) => (c?.id ?? '').toString() === id)?.name || 'Categoria';
    }
    const id = s.replace(/^c_/, '');
    return safeCategories.find((c) => (c?.id ?? '').toString() === id)?.name || 'Categoria';
  };

  const [groupSpecificSelectValue, setGroupSpecificSelectValue] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState(combo || {
    name: '',
    description: '',
    image: '',
    type: 'bundle_discount',
    combo_mode: 'dishes_beverages',
    combo_action: 'add',
    dishes: [],
    beverages: [],
    combo_groups: [],
    original_price: 0,
    combo_price: 0,
    discount_type: 'percentage',
    discount_value: 0,
    buy_quantity: 3,
    pay_quantity: 2,
    is_active: true,
    is_highlight: false,
    valid_until: '',
  });

  React.useEffect(() => {
    setGroupSpecificSelectValue({});
    if (combo) {
      setFormData({
        ...combo,
        image: combo.image || '',
        dishes: combo.dishes || [],
        beverages: combo.beverages || [],
        combo_groups: Array.isArray(combo.combo_groups) ? combo.combo_groups : [],
        combo_mode: combo.combo_mode || 'dishes_beverages',
        combo_action: combo.combo_action || 'add',
      });
    } else {
      setFormData({
        name: '', description: '', type: 'bundle_discount',
        image: '',
        combo_mode: hasPizzas ? 'pizzas_beverages' : 'dishes_beverages',
        combo_action: 'add',
        dishes: [], beverages: [],
        combo_groups: [],
        original_price: 0, combo_price: 0,
        discount_type: 'percentage', discount_value: 0,
        buy_quantity: 3, pay_quantity: 2,
        is_active: true, is_highlight: false, valid_until: '',
      });
    }
  }, [combo, isOpen, hasPizzas]);

  const isGroupMode = Array.isArray(formData.combo_groups) && formData.combo_groups.length > 0;

  const setGroupMode = (enabled) => {
    if (enabled) {
      setFormData(prev => {
        const nextGroups = Array.isArray(prev.combo_groups) && prev.combo_groups.length > 0
          ? prev.combo_groups
          : [{
              id: crypto?.randomUUID?.() || `g_${Date.now()}`,
              title: 'Escolha seus itens',
              required_quantity: 1,
              allowed_types: ['dish'],
              allowed_category_ids: [],
              allowed_dish_ids: [],
              allow_repeat: true,
            }];
        return { ...prev, combo_groups: nextGroups, dishes: [], beverages: [] };
      });
      return;
    }
    setFormData(prev => ({ ...prev, combo_groups: [] }));
  };

  const mainItems = formData.combo_mode === 'pizzas_beverages' ? safePizzas : safeDishes;
  const recalcOriginal = (dishesList, beveragesList) => {
    if (Array.isArray(formData.combo_groups) && formData.combo_groups.length > 0) return;
    const mainList = formData.combo_mode === 'pizzas_beverages' ? safePizzas : safeDishes;
    const mainTotalCents = (dishesList || []).reduce((s, cd) => {
      const d = mainList.find(m => m.id === cd.dish_id);
      const price = d?.pizza_config?.sizes?.[0]?.price_tradicional ?? d?.price ?? 0;
      return s + toCents(price) * (cd.quantity || 0);
    }, 0);
    const bevTotalCents = (beveragesList || []).reduce((s, cd) => {
      const d = safeBeverages.find(b => b.id === cd.dish_id);
      return s + toCents(d?.price) * (cd.quantity || 0);
    }, 0);
    setFormData(prev => ({ ...prev, original_price: fromCents(mainTotalCents + bevTotalCents) }));
  };

  const addMainItem = (id) => {
    const sid = (id ?? '').toString();
    const list = formData.dishes || [];
    const exists = list.find(d => (d?.dish_id ?? '').toString() === sid);
    let newDishes;
    if (exists) {
      newDishes = list.map(d => (d?.dish_id ?? '').toString() === sid ? { ...d, quantity: (d.quantity || 0) + 1 } : d);
    } else {
      newDishes = [...list, { dish_id: sid, quantity: 1 }];
    }
    setFormData(prev => ({ ...prev, dishes: newDishes }));
    recalcOriginal(newDishes, formData.beverages);
  };
  const addBeverage = (id) => {
    const sid = (id ?? '').toString();
    const list = formData.beverages || [];
    const exists = list.find(d => (d?.dish_id ?? '').toString() === sid);
    let newBeverages;
    if (exists) {
      newBeverages = list.map(d => (d?.dish_id ?? '').toString() === sid ? { ...d, quantity: (d.quantity || 0) + 1 } : d);
    } else {
      newBeverages = [...list, { dish_id: sid, quantity: 1 }];
    }
    setFormData(prev => ({ ...prev, beverages: newBeverages }));
    recalcOriginal(formData.dishes, newBeverages);
  };
  const removeMainItem = (id) => {
    const sid = (id ?? '').toString();
    const newDishes = (formData.dishes || []).filter(d => (d?.dish_id ?? '').toString() !== sid);
    setFormData(prev => ({ ...prev, dishes: newDishes }));
    recalcOriginal(newDishes, formData.beverages);
  };
  const removeBeverage = (id) => {
    const sid = (id ?? '').toString();
    const newBeverages = (formData.beverages || []).filter(d => (d?.dish_id ?? '').toString() !== sid);
    setFormData(prev => ({ ...prev, beverages: newBeverages }));
    recalcOriginal(formData.dishes, newBeverages);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addGroup = () => {
    setFormData(prev => ({
      ...prev,
      combo_groups: [
        ...(Array.isArray(prev.combo_groups) ? prev.combo_groups : []),
        {
          id: crypto?.randomUUID?.() || `g_${Date.now()}`,
          title: `Grupo ${(Array.isArray(prev.combo_groups) ? prev.combo_groups.length : 0) + 1}`,
          required_quantity: 1,
          allowed_types: ['dish'],
          allowed_category_ids: [],
          allowed_dish_ids: [],
          allow_repeat: true,
        }
      ]
    }));
  };

  const removeGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      combo_groups: (Array.isArray(prev.combo_groups) ? prev.combo_groups : []).filter(g => g.id !== groupId)
    }));
  };

  const updateGroup = (groupId, patch) => {
    setFormData(prev => ({
      ...prev,
      combo_groups: (Array.isArray(prev.combo_groups) ? prev.combo_groups : []).map(g => g.id === groupId ? { ...g, ...patch } : g)
    }));
  };

  const toggleGroupType = (groupId, type) => {
    setFormData(prev => ({
      ...prev,
      combo_groups: (Array.isArray(prev.combo_groups) ? prev.combo_groups : []).map(g => {
        if (g.id !== groupId) return g;
        const list = Array.isArray(g.allowed_types) ? g.allowed_types : [];
        const next = list.includes(type) ? list.filter(t => t !== type) : [...list, type];
        return { ...g, allowed_types: next.length > 0 ? next : [type] };
      })
    }));
  };

  const addGroupCategory = (groupId, categoryId) => {
    if (!categoryId) return;
    const normalized = normalizeAllowedCategoryId(categoryId);
    setFormData(prev => ({
      ...prev,
      combo_groups: (Array.isArray(prev.combo_groups) ? prev.combo_groups : []).map(g => {
        if (g.id !== groupId) return g;
        const list = Array.isArray(g.allowed_category_ids) ? g.allowed_category_ids : [];
        if (list.map(normalizeAllowedCategoryId).includes(normalized)) return g;
        return { ...g, allowed_category_ids: [...list, normalized] };
      })
    }));
  };

  const removeGroupCategory = (groupId, categoryId) => {
    const normalized = normalizeAllowedCategoryId(categoryId);
    setFormData(prev => ({
      ...prev,
      combo_groups: (Array.isArray(prev.combo_groups) ? prev.combo_groups : []).map(g => {
        if (g.id !== groupId) return g;
        const list = Array.isArray(g.allowed_category_ids) ? g.allowed_category_ids : [];
        return { ...g, allowed_category_ids: list.filter(id => normalizeAllowedCategoryId(id) !== normalized) };
      })
    }));
  };

  const addGroupDish = (groupId, dishId) => {
    if (!dishId) return;
    setFormData(prev => ({
      ...prev,
      combo_groups: (Array.isArray(prev.combo_groups) ? prev.combo_groups : []).map(g => {
        if (g.id !== groupId) return g;
        const list = Array.isArray(g.allowed_dish_ids) ? g.allowed_dish_ids : [];
        if (list.includes(dishId)) return g;
        return { ...g, allowed_dish_ids: [...list, dishId] };
      })
    }));
  };

  const removeGroupDish = (groupId, dishId) => {
    const sid = (dishId ?? '').toString();
    setFormData(prev => ({
      ...prev,
      combo_groups: (Array.isArray(prev.combo_groups) ? prev.combo_groups : []).map(g => {
        if (g.id !== groupId) return g;
        const list = Array.isArray(g.allowed_dish_ids) ? g.allowed_dish_ids : [];
        return { ...g, allowed_dish_ids: list.filter(id => (id ?? '').toString() !== sid) };
      })
    }));
    setGroupSpecificSelectValue((prev) => ({ ...prev, [groupId]: '' }));
  };

  const handleComboImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'combos');
      setFormData(prev => ({ ...prev, image: url }));
    } catch (err) {
      alert(err?.message || 'Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{combo ? 'Editar Combo' : 'Criar Combo'}</span>
            <Badge variant="outline">Promoções</Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Combo *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Combo Executivo" required />
            </div>

            <div className="col-span-2">
              <Label>Imagem</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={(e) => handleComboImageUpload(e.target.files?.[0])}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadingImage ? 'Enviando imagem...' : 'Envie uma imagem (upload)'}
                  </p>
                </div>
                <div>
                  <Input
                    value={formData.image || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="URL da imagem (opcional)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ou cole uma URL</p>
                </div>
              </div>
              {!!formData.image && (
                <div className="mt-2">
                  <img src={formData.image} alt="" className="h-20 w-20 rounded object-cover border" />
                </div>
              )}
            </div>

            <div className="col-span-2 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
              <Label>Usar grupos configuráveis</Label>
              <Switch checked={isGroupMode} onCheckedChange={setGroupMode} />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                <Label>Ativo no cardápio</Label>
                <Switch checked={formData.is_active !== false} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                <Label>Destacar no cardápio</Label>
                <Switch checked={!!formData.is_highlight} onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_highlight: v }))} />
              </div>
            </div>

            {!isGroupMode && (
              <div>
                <Label>Tipo de Combinação</Label>
                <Select value={formData.combo_mode} onValueChange={(v) => setFormData(prev => ({ ...prev, combo_mode: v, dishes: [] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dishes_beverages"><UtensilsCrossed className="w-4 h-4 mr-2 inline" /> Pratos + Bebidas</SelectItem>
                    {hasPizzas && <SelectItem value="pizzas_beverages"><Pizza className="w-4 h-4 mr-2 inline" /> Pizzas + Bebidas</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Ação no Carrinho</Label>
              <Select value={formData.combo_action} onValueChange={(v) => setFormData(prev => ({ ...prev, combo_action: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Adicionar combo ao pedido</SelectItem>
                  <SelectItem value="replace">Substituir item pelo combo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isGroupMode && (
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <Label className="mb-2 block">{formData.combo_mode === 'pizzas_beverages' ? 'Pizzas' : 'Pratos'}</Label>
              <Select onValueChange={addMainItem}>
                <SelectTrigger><SelectValue placeholder={`Adicionar ${formData.combo_mode === 'pizzas_beverages' ? 'pizza' : 'prato'}`} /></SelectTrigger>
                <SelectContent>
                  {mainItems.filter(d => d.is_active !== false).map(d => (
                    <SelectItem key={d.id} value={(d.id ?? '').toString()}>{d.name} - {formatCurrency(d.pizza_config?.sizes?.[0]?.price_tradicional ?? d.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-2">
                {(formData.dishes || []).map((cd) => {
                  const d = mainItems.find(m => (m?.id ?? '').toString() === (cd?.dish_id ?? '').toString());
                  if (!d) return null;
                  const price = d.pizza_config?.sizes?.[0]?.price_tradicional ?? d.price;
                  return (
                    <div key={cd.dish_id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {d.image && <img src={d.image} alt="" className="w-10 h-10 rounded object-cover" />}
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(price)} x {cd.quantity}</p>
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeMainItem(cd.dish_id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isGroupMode && (
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Grupos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar grupo
                </Button>
              </div>

              {(Array.isArray(formData.combo_groups) ? formData.combo_groups : []).map((g, idx) => {
                const allowedTypes = Array.isArray(g.allowed_types) ? g.allowed_types : [];
                const allowedCatIds = (Array.isArray(g.allowed_category_ids) ? g.allowed_category_ids : []).map(normalizeAllowedCategoryId);
                const allowedDishIds = Array.isArray(g.allowed_dish_ids) ? g.allowed_dish_ids : [];

                const selectableDishes = [...safeDishes, ...safePizzas, ...safeBeverages]
                  .filter(d => d?.is_active !== false)
                  .filter((d) => {
                    const t = (d?.product_type || 'dish').toString().toLowerCase();
                    const normalizedType = t === 'pizza' ? 'pizza' : (t === 'beverage' ? 'beverage' : 'dish');
                    if (allowedTypes.length > 0 && !allowedTypes.includes(normalizedType)) return false;
                    if (allowedDishIds.length > 0 && !allowedDishIds.map(x => (x ?? '').toString()).includes((d?.id ?? '').toString())) return false;
                    if (allowedCatIds.length === 0) return true;

                    if (normalizedType === 'dish') {
                      const dishCatId = d.category_id || d.categoryId || null;
                      return !!dishCatId && allowedCatIds.includes(`c_${dishCatId}`);
                    }
                    if (normalizedType === 'beverage') {
                      const bevCatId = d.category_id || d.categoryId || null;
                      return !!bevCatId && allowedCatIds.includes(`bc_${bevCatId}`);
                    }
                    const pizzaCatId = d.pizza_category_id || d.pizzaCategoryId || null;
                    return !!pizzaCatId && allowedCatIds.includes(`pc_${pizzaCatId}`);
                  });

                return (
                  <div key={g.id || idx} className="bg-white dark:bg-gray-900 rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={g.title || ''}
                        onChange={(e) => updateGroup(g.id, { title: e.target.value })}
                        placeholder="Título do grupo"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeGroup(g.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Quantidade obrigatória</Label>
                        <Input
                          type="number"
                          min="1"
                          value={g.required_quantity ?? 1}
                          onChange={(e) => updateGroup(g.id, { required_quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
                        <Label>Permitir repetir item</Label>
                        <Switch
                          checked={g.allow_repeat !== false}
                          onCheckedChange={(v) => updateGroup(g.id, { allow_repeat: v })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Tipos permitidos</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[
                          { id: 'dish', label: 'Prato' },
                          ...(hasPizzas ? [{ id: 'pizza', label: 'Pizza' }] : []),
                          { id: 'beverage', label: 'Bebida' },
                        ].map((t) => {
                          const selected = allowedTypes.includes(t.id);
                          return (
                            <Button
                              key={t.id}
                              type="button"
                              variant={selected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleGroupType(g.id, t.id)}
                              className={selected ? 'bg-orange-500 hover:bg-orange-600' : ''}
                            >
                              {t.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Adicionar categoria</Label>
                        <Select onValueChange={(v) => addGroupCategory(g.id, v)}>
                          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                          <SelectContent>
                            {buildCategoryOptions(allowedTypes.filter((t) => t !== 'pizza' || hasPizzas)).map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {allowedCatIds.map((cid) => {
                            const name = resolveCategoryName(cid);
                            return (
                              <Badge key={cid} variant="outline" className="flex items-center gap-1">
                                <span>{name}</span>
                                <button type="button" onClick={() => removeGroupCategory(g.id, cid)}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <Label>Adicionar item específico</Label>
                        <Select
                          value={groupSpecificSelectValue?.[g.id] || ''}
                          onValueChange={(v) => {
                            setGroupSpecificSelectValue((prev) => ({ ...prev, [g.id]: v }));
                            addGroupDish(g.id, v);
                            setGroupSpecificSelectValue((prev) => ({ ...prev, [g.id]: '' }));
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                          <SelectContent>
                            {selectableDishes.map((d) => (
                              <SelectItem key={d.id} value={(d.id ?? '').toString()}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {allowedDishIds.map((did) => {
                            const d = selectableDishes.find(x => (x?.id ?? '').toString() === (did ?? '').toString());
                            if (!d) return null;
                            return (
                              <Badge key={did} variant="outline" className="flex items-center gap-1">
                                <span>{d.name}</span>
                                <button type="button" onClick={() => removeGroupDish(g.id, did)}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bebidas */}
          {!isGroupMode && hasBeverages && (
            <div className="border rounded-lg p-4 bg-cyan-50/50 dark:bg-cyan-900/10">
              <Label className="mb-2 block flex items-center gap-2"><Wine className="w-4 h-4" /> Bebidas</Label>
              <Select onValueChange={addBeverage}>
                <SelectTrigger><SelectValue placeholder="Adicionar bebida" /></SelectTrigger>
                <SelectContent>
                  {safeBeverages.filter(d => d.is_active !== false).map(d => (
                    <SelectItem key={d.id} value={(d.id ?? '').toString()}>{d.name} {d.volume_ml ? `(${d.volume_ml}ml)` : ''} - {formatCurrency(d.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-2">
                {(formData.beverages || []).map((cd) => {
                  const d = safeBeverages.find(b => (b?.id ?? '').toString() === (cd?.dish_id ?? '').toString());
                  if (!d) return null;
                  return (
                    <div key={cd.dish_id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {d.image && <img src={d.image} alt="" className="w-10 h-10 rounded object-cover" />}
                        <div>
                          <p className="text-sm font-medium">{d.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(d.price)} x {cd.quantity}</p>
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeBeverage(cd.dish_id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço Original</Label>
              <Input
                type="number"
                step="0.01"
                value={fromCents(toCents(formData.original_price))}
                readOnly={!isGroupMode}
                onChange={(e) => {
                  if (!isGroupMode) return;
                  setFormData(prev => ({ ...prev, original_price: fromCents(toCents(e.target.value)) }));
                }}
                className={!isGroupMode ? 'bg-gray-100' : ''}
              />
            </div>
            <div>
              <Label>Preço do Combo *</Label>
              <Input
                type="number"
                step="0.01"
                value={fromCents(toCents(formData.combo_price))}
                onChange={(e) => setFormData(prev => ({ ...prev, combo_price: fromCents(toCents(e.target.value)) }))}
                required
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Descreva o combo..." />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 bg-orange-500">{combo ? 'Salvar' : 'Criar Combo'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
