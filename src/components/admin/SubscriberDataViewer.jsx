import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import CategoryForm from './CategoryForm';
import ReorderModal from './ReorderModal';
import ComboModal from './ComboModal';
import { 
  ArrowLeft, Package, ShoppingCart, DollarSign, Store, 
  Loader2, Download, Plus, Pencil, Trash2, Clock, GripVertical, Gift
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscriberDataViewer({ subscriber, onBack }) {
  const queryClient = useQueryClient();
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [dishFormOpen, setDishFormOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [dishForm, setDishForm] = useState({
    name: '', category_id: '', price: '', original_price: '', description: '', is_active: true,
    complement_groups: [], stock: '', portion: '', is_highlight: false, is_new: false, is_popular: false,
    prep_time: '', internal_notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', is_required: false, max_selection: 1 });
  const [complementFormOpen, setComplementFormOpen] = useState(false);
  const [editingComplement, setEditingComplement] = useState(null);
  const [complementForm, setComplementForm] = useState({ group_id: '', name: '', price: '', is_active: true });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['subscriberProfile', subscriber.email],
    queryFn: async () => {
      const res = await base44.functions.invoke('getFullSubscriberProfile', {
        subscriber_email: subscriber.email
      });
      return res;
    },
    enabled: !!subscriber.email
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Erro ao carregar dados do assinante</p>
      </div>
    );
  }

  const { data = {}, stats = {} } = profileData;
  const opts = { as_subscriber: subscriber.email };

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['subscriberProfile', subscriber.email] });

  const handleCategorySubmit = async (formData) => {
    setSaving(true);
    try {
      if (editingCategory) {
        await base44.entities.Category.update(editingCategory.id, formData, opts);
        toast.success('Categoria atualizada');
      } else {
        await base44.entities.Category.create({ ...formData, as_subscriber: subscriber.email });
        toast.success('Categoria criada');
      }
      refetch();
      setCategoryFormOpen(false);
      setEditingCategory(null);
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Excluir a categoria "${cat.name}"?`)) return;
    try {
      await base44.entities.Category.delete(cat.id, opts);
      toast.success('Categoria excluída');
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  const handleDishSubmit = async (formData) => {
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        category_id: formData.category_id || null,
        price: parseFloat(formData.price) || 0,
        original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
        description: formData.description || '',
        is_active: formData.is_active !== false,
        complement_groups: Array.isArray(formData.complement_groups) ? formData.complement_groups : [],
        stock: formData.stock === '' || formData.stock == null ? undefined : formData.stock,
        portion: formData.portion || undefined,
        is_highlight: !!formData.is_highlight,
        is_new: !!formData.is_new,
        is_popular: !!formData.is_popular,
        prep_time: formData.prep_time || undefined,
        internal_notes: formData.internal_notes || undefined
      };
      if (editingDish) {
        await base44.entities.Dish.update(editingDish.id, payload, opts);
        toast.success('Prato atualizado');
      } else {
        await base44.entities.Dish.create({ ...payload, as_subscriber: subscriber.email });
        toast.success('Prato criado');
      }
      refetch();
      setDishFormOpen(false);
      setEditingDish(null);
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar prato');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDish = async (d) => {
    if (!window.confirm(`Excluir o prato "${d.name}"?`)) return;
    try {
      await base44.entities.Dish.delete(d.id, opts);
      toast.success('Prato excluído');
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  const handleGroupSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        name: groupForm.name.trim(),
        is_required: !!groupForm.is_required,
        max_selection: Math.max(1, parseInt(groupForm.max_selection, 10) || 1),
        options: editingGroup ? (editingGroup.options || []) : [],
        order: editingGroup != null ? (editingGroup.order ?? (data.complement_groups || []).length) : (data.complement_groups || []).length
      };
      if (editingGroup) {
        await base44.entities.ComplementGroup.update(editingGroup.id, payload, opts);
        toast.success('Grupo atualizado');
      } else {
        await base44.entities.ComplementGroup.create({
          ...payload,
          as_subscriber: subscriber.email
        });
        toast.success('Grupo criado');
      }
      refetch();
      setGroupFormOpen(false);
      setEditingGroup(null);
      setGroupForm({ name: '', is_required: false, max_selection: 1 });
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (g) => {
    if (!window.confirm(`Excluir o grupo "${g.name}" e suas opções?`)) return;
    try {
      await base44.entities.ComplementGroup.delete(g.id, opts);
      toast.success('Grupo excluído');
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  const handleComplementSubmit = async () => {
    setSaving(true);
    try {
      const groups = data.complement_groups || [];
      if (editingComplement) {
        const g = groups.find(x => String(x.id) === String(editingComplement.groupId));
        if (!g) { toast.error('Grupo não encontrado'); return; }
        const optsArr = (g.options || []).map(o =>
          String(o.id) === String(editingComplement.optionId)
            ? { ...o, name: complementForm.name.trim(), price: parseFloat(complementForm.price) || 0, is_active: complementForm.is_active !== false }
            : o
        );
        await base44.entities.ComplementGroup.update(g.id, { options: optsArr }, opts);
        toast.success('Complemento atualizado');
      } else {
        const g = groups.find(x => String(x.id) === String(complementForm.group_id));
        if (!g) { toast.error('Selecione um grupo'); return; }
        const newOpt = {
          id: Date.now().toString(),
          name: complementForm.name.trim(),
          price: parseFloat(complementForm.price) || 0,
          is_active: true
        };
        const optsArr = [...(g.options || []), newOpt];
        await base44.entities.ComplementGroup.update(g.id, { options: optsArr }, opts);
        toast.success('Complemento criado');
      }
      refetch();
      setComplementFormOpen(false);
      setEditingComplement(null);
      setComplementForm({ group_id: '', name: '', price: '', is_active: true });
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar complemento');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComplement = async (groupId, optionId, optionName) => {
    if (!window.confirm(`Excluir o complemento "${optionName}"?`)) return;
    try {
      const g = (data.complement_groups || []).find(x => String(x.id) === String(groupId));
      if (!g) return;
      const optsArr = (g.options || []).filter(o => String(o.id) !== String(optionId));
      await base44.entities.ComplementGroup.update(g.id, { options: optsArr }, opts);
      toast.success('Complemento excluído');
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  const handleReorderSave = async (updates) => {
    setSaving(true);
    try {
      for (const cat of updates.categories || []) {
        await base44.entities.Category.update(cat.id, { order: cat.order }, opts);
      }
      for (const dish of updates.dishes || []) {
        await base44.entities.Dish.update(dish.id, { order: dish.order }, opts);
      }
      for (const group of updates.groups || []) {
        await base44.entities.ComplementGroup.update(group.id, { order: group.order }, opts);
      }
      for (const [groupId, options] of Object.entries(updates.groupOptions || {})) {
        const g = (data.complement_groups || []).find(x => String(x.id) === String(groupId));
        if (g) await base44.entities.ComplementGroup.update(groupId, { ...g, options }, opts);
      }
      toast.success('Ordem atualizada');
      setShowReorderModal(false);
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erro ao reordenar');
    } finally {
      setSaving(false);
    }
  };

  const handleComboSubmit = async (comboData) => {
    setSaving(true);
    try {
      if (editingCombo) {
        await base44.entities.Combo.update(editingCombo.id, comboData, opts);
        toast.success('Combo atualizado');
      } else {
        await base44.entities.Combo.create({ ...comboData, as_subscriber: subscriber.email });
        toast.success('Combo criado');
      }
      refetch();
      setShowComboModal(false);
      setEditingCombo(null);
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar combo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCombo = async (c) => {
    if (!window.confirm(`Excluir o combo "${c.name}"?`)) return;
    try {
      await base44.entities.Combo.delete(c.id, opts);
      toast.success('Combo excluído');
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erro ao excluir');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value || 0);
  };

  const exportBackup = () => {
    if (!profileData) return;
    
    const backupData = {
      subscriber: {
        ...subscriber,
        plan: subscriber.plan,
        permissions: subscriber.permissions || {},
        status: subscriber.status,
        expires_at: subscriber.expires_at
      },
      data: {
        dishes: data.dishes || [],
        categories: data.categories || [],
        complement_groups: data.complement_groups || [],
        combos: data.combos || [],
        orders: data.orders || [],
        caixas: data.caixas || [],
        store: data.store || null
      },
      stats: stats || {},
      exported_at: new Date().toISOString(),
      exported_by: 'admin'
    };
    
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `backup-${subscriber.email}-${dateStr}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{subscriber.name}</h2>
          <p className="text-gray-500">{subscriber.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportBackup}>
            <Download className="w-4 h-4 mr-2" />
            Fazer Backup
          </Button>
          <Badge className={
            subscriber.status === 'active' ? 'bg-green-500' : 
            subscriber.status === 'expired' ? 'bg-red-500' : 
            'bg-yellow-500'
          }>
            {subscriber.status}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pratos</CardTitle>
            <Package className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_dishes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_orders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_revenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Caixas Abertos</CardTitle>
            <Clock className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_caixas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tabs */}
      <Tabs defaultValue="dishes" className="w-full">
        <TabsList>
          <TabsTrigger value="dishes">Pratos ({(data.dishes||[]).length})</TabsTrigger>
          <TabsTrigger value="categories">Categorias ({(data.categories||[]).length})</TabsTrigger>
          <TabsTrigger value="groups">Grupos de Complementos ({(data.complement_groups||[]).length})</TabsTrigger>
          <TabsTrigger value="complements">Complementos ({((data.complement_groups||[]).reduce((s,g)=>s+((g.options||[]).length),0))})</TabsTrigger>
          <TabsTrigger value="combos">Combos ({(data.combos||[]).length})</TabsTrigger>
          <TabsTrigger value="orders">Pedidos ({(data.orders||[]).length})</TabsTrigger>
          <TabsTrigger value="store">Loja</TabsTrigger>
          <TabsTrigger value="caixas">Caixas ({(data.caixas||[]).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dishes" className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReorderModal(true)}>
              <GripVertical className="w-4 h-4 mr-2" />
              Reordenar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setEditingCombo(null); setShowComboModal(true); }}>
              <Gift className="w-4 h-4 mr-2" />
              Criar combo
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingDish(null);
                setDishForm({
                  name: '', category_id: (data.categories && data.categories[0]?.id) || '', price: '', original_price: '',
                  description: '', is_active: true, complement_groups: [], stock: '', portion: '',
                  is_highlight: false, is_new: false, is_popular: false, prep_time: '', internal_notes: ''
                });
                setDishFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar prato
            </Button>
          </div>
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Complementos</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(data?.dishes) ? data.dishes : []).map((dish) => (
                  <tr key={dish.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{dish.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {(data.categories||[]).find(c => c.id === dish.category_id)?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(dish.price)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{(dish.complement_groups || []).length}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={dish.is_active !== false ? 'default' : 'secondary'}>
                        {dish.is_active !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditingDish(dish);
                        setDishForm({
                          name: dish.name, category_id: dish.category_id || '', price: dish.price ?? '', original_price: dish.original_price ?? '',
                          description: dish.description || '', is_active: dish.is_active !== false,
                          complement_groups: (dish.complement_groups || []).map(cg => ({ group_id: cg.group_id, is_required: !!cg.is_required })),
                          stock: dish.stock ?? '', portion: dish.portion || '',
                          is_highlight: !!dish.is_highlight, is_new: !!dish.is_new, is_popular: !!dish.is_popular,
                          prep_time: dish.prep_time ?? '', internal_notes: dish.internal_notes || ''
                        });
                        setDishFormOpen(true);
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteDish(dish)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingCategory(null); setCategoryFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar categoria
            </Button>
          </div>
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ordem</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(data?.categories) ? data.categories : []).map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{cat.order ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategory(cat); setCategoryFormOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteCategory(cat)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingGroup(null); setGroupForm({ name: '', is_required: false, max_selection: 1 }); setGroupFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar grupo
            </Button>
          </div>
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Obrigatório</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Máx. seleção</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Opções</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(data?.complement_groups) ? data.complement_groups : []).map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{g.name}</td>
                    <td className="px-4 py-3 text-sm">{g.is_required ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-3 text-sm">{g.max_selection ?? 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{(g.options || []).length}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingGroup(g); setGroupForm({ name: g.name || '', is_required: !!g.is_required, max_selection: g.max_selection ?? 1 }); setGroupFormOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteGroup(g)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="complements" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" disabled={(data.complement_groups || []).length === 0} onClick={() => { setEditingComplement(null); setComplementForm({ group_id: (data.complement_groups && data.complement_groups[0]?.id) || '', name: '', price: '', is_active: true }); setComplementFormOpen(true); }} title={(data.complement_groups || []).length === 0 ? 'Crie primeiro um grupo na aba Grupos de Complementos' : ''}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar complemento
            </Button>
          </div>
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Grupo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(data?.complement_groups) ? data.complement_groups : []).flatMap((g) =>
                  (g.options || []).map((o) => (
                    <tr key={`${g.id}-${o.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{g.name}</td>
                      <td className="px-4 py-3 text-sm">{o.name}</td>
                      <td className="px-4 py-3 text-sm font-medium">{formatCurrency(o.price)}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={o.is_active !== false ? 'default' : 'secondary'}>{o.is_active !== false ? 'Ativo' : 'Inativo'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingComplement({ optionId: o.id, groupId: g.id }); setComplementForm({ group_id: g.id, name: o.name || '', price: o.price ?? '', is_active: o.is_active !== false }); setComplementFormOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteComplement(g.id, o.id, o.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {((data.complement_groups||[]).reduce((s,g)=>s+(g.options||[]).length,0)) === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">Nenhum complemento cadastrado. Crie grupos e adicione opções na aba Grupos de Complementos.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="combos" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingCombo(null); setShowComboModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar combo
            </Button>
          </div>
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(data?.combos) ? data.combos : []).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.type || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(c.combo_price)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={c.is_active !== false ? 'default' : 'secondary'}>{c.is_active !== false ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCombo(c); setShowComboModal(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteCombo(c)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data.combos || []).length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">Nenhum combo. Use &quot;Criar combo&quot; na aba Pratos ou aqui.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.orders.slice(0, 50).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{order.order_code}</td>
                    <td className="px-4 py-3 text-sm">{order.customer_name}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge>{order.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.created_date).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="store">
          {data.store ? (
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Loja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nome</label>
                    <p className="text-base">{data.store.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">WhatsApp</label>
                    <p className="text-base">{data.store.whatsapp || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Endereço</label>
                    <p className="text-base">{data.store.address || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Taxa de Entrega</label>
                    <p className="text-base">{formatCurrency(data.store.delivery_fee)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-gray-500 text-center py-12">Nenhuma loja configurada</p>
          )}
        </TabsContent>

        <TabsContent value="caixas" className="space-y-4">
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Abertura</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fechamento</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Aberto por</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.caixas || []).map((caixa) => (
                  <tr key={caixa.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(caixa.opening_date).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {caixa.closing_date ? new Date(caixa.closing_date).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={caixa.status === 'open' ? 'default' : 'secondary'}>
                        {caixa.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{caixa.opened_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Categoria (suporte) */}
      <CategoryForm
        key={editingCategory ? editingCategory.id : 'new'}
        isOpen={categoryFormOpen}
        onClose={() => { setCategoryFormOpen(false); setEditingCategory(null); }}
        onSubmit={handleCategorySubmit}
        category={editingCategory}
        categoriesCount={(data.categories || []).length}
      />

      {/* Modal Prato (suporte) - experiência completa */}
      <Dialog open={dishFormOpen} onOpenChange={(open) => { if (!open) { setDishFormOpen(false); setEditingDish(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDish ? 'Editar prato' : 'Novo prato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input value={dishForm.name} onChange={(e) => setDishForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Alcatra" required />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={String(dishForm.category_id || '')} onValueChange={(v) => setDishForm(f => ({ ...f, category_id: v || null }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(data.categories || []).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço de (R$) — original</Label>
                <Input type="number" step="0.01" value={dishForm.original_price} onChange={(e) => setDishForm(f => ({ ...f, original_price: e.target.value }))} placeholder="Ex: 25,00" />
              </div>
              <div>
                <Label>Por (R$) *</Label>
                <Input type="number" step="0.01" value={dishForm.price} onChange={(e) => setDishForm(f => ({ ...f, price: e.target.value }))} placeholder="0,00" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estoque (vazio = ilimitado)</Label>
                <Input type="number" value={dishForm.stock} onChange={(e) => setDishForm(f => ({ ...f, stock: e.target.value }))} placeholder="Ex: 10" />
              </div>
              <div>
                <Label>Porção</Label>
                <Input value={dishForm.portion} onChange={(e) => setDishForm(f => ({ ...f, portion: e.target.value }))} placeholder="Ex: 180g, 500ml" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={dishForm.description} onChange={(e) => setDishForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Opcional" />
            </div>
            <div>
              <Label>Tempo de preparo (min)</Label>
              <Input type="number" value={dishForm.prep_time} onChange={(e) => setDishForm(f => ({ ...f, prep_time: e.target.value }))} placeholder="Ex: 30" />
            </div>
            <div>
              <Label>Observações internas (não visíveis ao cliente)</Label>
              <Textarea value={dishForm.internal_notes} onChange={(e) => setDishForm(f => ({ ...f, internal_notes: e.target.value }))} rows={1} placeholder="Opcional" />
            </div>

            {/* Grupos de complementos — vincular ao prato */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <Label className="mb-3 block">Grupos de complementos no prato</Label>
              <p className="text-xs text-gray-500 mb-3">Marque os grupos que o cliente poderá escolher ao pedir este prato. Obrigatório = cliente deve escolher.</p>
              {(data.complement_groups || []).length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum grupo. Crie na aba &quot;Grupos de Complementos&quot;.</p>
              ) : (
                <div className="space-y-2">
                  {(data.complement_groups || []).map((g) => {
                    const cg = (dishForm.complement_groups || []).find(c => String(c.group_id) === String(g.id));
                    const checked = !!cg;
                    return (
                      <div key={g.id} className="flex items-center gap-3 flex-wrap">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            if (v) {
                              setDishForm(f => ({ ...f, complement_groups: [...(f.complement_groups || []), { group_id: g.id, is_required: false }] }));
                            } else {
                              setDishForm(f => ({ ...f, complement_groups: (f.complement_groups || []).filter(c => String(c.group_id) !== String(g.id)) }));
                            }
                          }}
                        />
                        <span className="text-sm font-medium">{g.name}</span>
                        {checked && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Obrigatório</span>
                            <Switch
                              checked={!!cg?.is_required}
                              onCheckedChange={(v) => setDishForm(f => ({
                                ...f,
                                complement_groups: (f.complement_groups || []).map(c =>
                                  String(c.group_id) === String(g.id) ? { ...c, is_required: v } : c
                                )
                              }))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <Label className="text-sm">⭐ Destaque</Label>
                <Switch checked={dishForm.is_highlight} onCheckedChange={(v) => setDishForm(f => ({ ...f, is_highlight: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <Label className="text-sm">✨ Novo</Label>
                <Switch checked={dishForm.is_new} onCheckedChange={(v) => setDishForm(f => ({ ...f, is_new: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <Label className="text-sm">🔥 Mais vendido</Label>
                <Switch checked={dishForm.is_popular} onCheckedChange={(v) => setDishForm(f => ({ ...f, is_popular: v }))} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <Label>Ativo</Label>
              <Switch checked={dishForm.is_active} onCheckedChange={(v) => setDishForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDishFormOpen(false); setEditingDish(null); }}>Cancelar</Button>
              <Button className="flex-1" disabled={saving} onClick={() => handleDishSubmit(dishForm)}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingDish ? 'Salvar' : 'Criar')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Grupo de Complementos */}
      <Dialog open={groupFormOpen} onOpenChange={(o) => { if (!o) { setGroupFormOpen(false); setEditingGroup(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Editar grupo' : 'Novo grupo de complementos'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Guarnições, Bebidas" required />
            </div>
            <div className="flex items-center justify-between">
              <Label>Obrigatório</Label>
              <Switch checked={groupForm.is_required} onCheckedChange={(v) => setGroupForm(f => ({ ...f, is_required: v }))} />
            </div>
            <div>
              <Label>Máximo de seleções</Label>
              <Input type="number" min={1} value={groupForm.max_selection} onChange={(e) => setGroupForm(f => ({ ...f, max_selection: parseInt(e.target.value, 10) || 1 }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setGroupFormOpen(false); setEditingGroup(null); }}>Cancelar</Button>
              <Button className="flex-1" disabled={saving} onClick={handleGroupSubmit}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingGroup ? 'Salvar' : 'Criar')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Complemento */}
      <Dialog open={complementFormOpen} onOpenChange={(o) => { if (!o) { setComplementFormOpen(false); setEditingComplement(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingComplement ? 'Editar complemento' : 'Novo complemento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grupo *</Label>
              <Select value={String(complementForm.group_id || '')} onValueChange={(v) => setComplementForm(f => ({ ...f, group_id: v }))} disabled={!!editingComplement}>
                <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                <SelectContent>
                  {(data.complement_groups || []).map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={complementForm.name} onChange={(e) => setComplementForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Arroz, Refrigerante" required />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={complementForm.price} onChange={(e) => setComplementForm(f => ({ ...f, price: e.target.value }))} placeholder="0,00" />
            </div>
            {editingComplement && (
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch checked={complementForm.is_active} onCheckedChange={(v) => setComplementForm(f => ({ ...f, is_active: v }))} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setComplementFormOpen(false); setEditingComplement(null); }}>Cancelar</Button>
              <Button className="flex-1" disabled={saving} onClick={handleComplementSubmit}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingComplement ? 'Salvar' : 'Criar')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reordenar: categorias, pratos, grupos e complementos */}
      <ReorderModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        categories={data.categories || []}
        dishes={data.dishes || []}
        complementGroups={data.complement_groups || []}
        onSave={handleReorderSave}
      />

      {/* Combos */}
      <ComboModal
        key={editingCombo?.id ?? 'new'}
        isOpen={showComboModal}
        onClose={() => { setShowComboModal(false); setEditingCombo(null); }}
        onSubmit={handleComboSubmit}
        combo={editingCombo}
        dishes={data.dishes || []}
      />
    </div>
  );
}