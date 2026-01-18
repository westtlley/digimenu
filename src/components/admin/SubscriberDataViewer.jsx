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
import CategoryForm from './CategoryForm';
import { 
  ArrowLeft, Package, ShoppingCart, DollarSign, Store, 
  Loader2, Download, Plus, Pencil, Trash2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubscriberDataViewer({ subscriber, onBack }) {
  const queryClient = useQueryClient();
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [dishFormOpen, setDishFormOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [dishForm, setDishForm] = useState({ name: '', category_id: '', price: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);

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
        description: formData.description || '',
        is_active: formData.is_active !== false
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
          <TabsTrigger value="orders">Pedidos ({(data.orders||[]).length})</TabsTrigger>
          <TabsTrigger value="store">Loja</TabsTrigger>
          <TabsTrigger value="caixas">Caixas ({(data.caixas||[]).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dishes" className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setEditingDish(null);
                setDishForm({ name: '', category_id: (data.categories && data.categories[0]?.id) || '', price: '', description: '', is_active: true });
                setDishFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar prato
            </Button>
          </div>
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço</th>
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
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={dish.is_active !== false ? 'default' : 'secondary'}>
                        {dish.is_active !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingDish(dish); setDishForm({ name: dish.name, category_id: dish.category_id || '', price: dish.price ?? '', description: dish.description || '', is_active: dish.is_active !== false }); setDishFormOpen(true); }}>
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
                {data.caixas.map((caixa) => (
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

      {/* Modal Prato (suporte) */}
      <Dialog open={dishFormOpen} onOpenChange={(open) => { if (!open) { setDishFormOpen(false); setEditingDish(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDish ? 'Editar prato' : 'Novo prato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={dishForm.name} onChange={(e) => setDishForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Alcatra" required />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={String(dishForm.category_id || '')} onValueChange={(v) => setDishForm(f => ({ ...f, category_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(data.categories || []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço (R$) *</Label>
              <Input type="number" step="0.01" value={dishForm.price} onChange={(e) => setDishForm(f => ({ ...f, price: e.target.value }))} placeholder="0,00" required />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={dishForm.description} onChange={(e) => setDishForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Opcional" />
            </div>
            <div className="flex items-center justify-between">
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
    </div>
  );
}