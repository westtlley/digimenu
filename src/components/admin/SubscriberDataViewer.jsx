import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Package, ShoppingCart, DollarSign, Store, 
  Users, Receipt, TrendingUp, Clock, Loader2, Download
} from 'lucide-react';

export default function SubscriberDataViewer({ subscriber, onBack }) {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['subscriberProfile', subscriber.email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getFullSubscriberProfile', {
        subscriber_email: subscriber.email
      });
      return response.data;
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

  const { data, stats } = profileData;

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
          <TabsTrigger value="dishes">Pratos ({data.dishes.length})</TabsTrigger>
          <TabsTrigger value="orders">Pedidos ({data.orders.length})</TabsTrigger>
          <TabsTrigger value="store">Loja</TabsTrigger>
          <TabsTrigger value="caixas">Caixas ({data.caixas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dishes" className="space-y-4">
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Categoria</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Preço</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(data?.dishes) ? data.dishes : []).map((dish) => (
                  <tr key={dish.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{dish.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {data.categories.find(c => c.id === dish.category_id)?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(dish.price)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant={dish.is_active !== false ? 'default' : 'secondary'}>
                        {dish.is_active !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
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
    </div>
  );
}